import { useCallback, useEffect, useMemo, useState } from 'react'
import toast from 'react-hot-toast'
import { Link, useSearchParams } from 'react-router-dom'

import { Badge, Button, Card, CardBody, CardHeader, CardTitle, Spinner } from '@/components/ui'
import { collections } from '@/constants/collections'
import { databaseId } from '@/constants/database'
import { useAuth } from '@/hooks/useAuth'
import { dbService, Query } from '@/services/appwrite/db'
import { realtimeService } from '@/services/appwrite/realtime'
import { buildConversationId, messagingService } from '@/features/messaging/services/messagingService'

function fullName(profile) {
  const firstName = String(profile?.firstName || '').trim()
  const lastName = String(profile?.lastName || '').trim()
  return `${firstName} ${lastName}`.trim()
}

function formatTimestamp(value) {
  if (!value) {
    return ''
  }

  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) {
    return ''
  }

  return parsed.toLocaleString()
}

function normalizeMessageTimestamp(message) {
  return message.createdAt || message.$createdAt || new Date().toISOString()
}

function upsertMessage(messages, incomingMessage) {
  const existingIndex = messages.findIndex((item) => item.$id === incomingMessage.$id)
  if (existingIndex >= 0) {
    const nextMessages = [...messages]
    nextMessages[existingIndex] = incomingMessage
    return nextMessages.sort((a, b) => new Date(normalizeMessageTimestamp(a)).getTime() - new Date(normalizeMessageTimestamp(b)).getTime())
  }

  return [...messages, incomingMessage].sort(
    (a, b) => new Date(normalizeMessageTimestamp(a)).getTime() - new Date(normalizeMessageTimestamp(b)).getTime(),
  )
}

function upsertConversationPreview(conversations, message, currentUserId, selectedConversationId) {
  const conversationId = message.conversationId
  if (!conversationId) {
    return conversations
  }

  const participantId = message.senderId === currentUserId ? message.receiverId : message.senderId
  const isUnreadIncoming = message.receiverId === currentUserId && !message.read
  const shouldIncreaseUnread = isUnreadIncoming && conversationId !== selectedConversationId
  const lastMessageAt = normalizeMessageTimestamp(message)
  const existingIndex = conversations.findIndex((item) => item.conversationId === conversationId)

  if (existingIndex >= 0) {
    const nextConversations = [...conversations]
    const existing = nextConversations[existingIndex]
    nextConversations[existingIndex] = {
      ...existing,
      listingId: message.listingId,
      participantId,
      lastMessageBody: message.body,
      lastMessageAt,
      unreadCount: shouldIncreaseUnread ? existing.unreadCount + 1 : existing.unreadCount,
      isDraft: false,
    }

    return nextConversations.sort((a, b) => new Date(b.lastMessageAt || 0).getTime() - new Date(a.lastMessageAt || 0).getTime())
  }

  return [
    {
      conversationId,
      listingId: message.listingId,
      participantId,
      lastMessageBody: message.body,
      lastMessageAt,
      unreadCount: shouldIncreaseUnread ? 1 : 0,
      isDraft: false,
    },
    ...conversations,
  ].sort((a, b) => new Date(b.lastMessageAt || 0).getTime() - new Date(a.lastMessageAt || 0).getTime())
}

export function MessagingPage() {
  const [searchParams] = useSearchParams()
  const { user } = useAuth()

  const [loadingConversations, setLoadingConversations] = useState(true)
  const [loadingMessages, setLoadingMessages] = useState(false)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  const [conversations, setConversations] = useState([])
  const [selectedConversationId, setSelectedConversationId] = useState('')
  const [messages, setMessages] = useState([])
  const [draftBody, setDraftBody] = useState('')
  const [profilesByUserId, setProfilesByUserId] = useState({})
  const [listingsById, setListingsById] = useState({})

  const listingIdParam = searchParams.get('listingId') || ''
  const participantParam = searchParams.get('participant') || ''

  const conversationFromParams = useMemo(() => {
    if (!listingIdParam || !participantParam || !user?.$id || participantParam === user.$id) {
      return null
    }

    try {
      const conversationId = buildConversationId(listingIdParam, user.$id, participantParam)
      return {
        conversationId,
        listingId: listingIdParam,
        participantId: participantParam,
      }
    } catch {
      return null
    }
  }, [listingIdParam, participantParam, user?.$id])

  const loadConversations = useCallback(async () => {
    if (!user?.$id) {
      setConversations([])
      setSelectedConversationId('')
      setLoadingConversations(false)
      return
    }

    setLoadingConversations(true)
    setError('')

    try {
      const summaries = await messagingService.listUserConversations({ userId: user.$id })
      const nextConversations = [...summaries]

      if (conversationFromParams && !nextConversations.some((item) => item.conversationId === conversationFromParams.conversationId)) {
        nextConversations.unshift({
          ...conversationFromParams,
          lastMessageBody: '',
          lastMessageAt: null,
          unreadCount: 0,
          isDraft: true,
        })
      }

      setConversations(nextConversations)

      setSelectedConversationId((currentSelectedId) => {
        if (currentSelectedId && nextConversations.some((item) => item.conversationId === currentSelectedId)) {
          return currentSelectedId
        }

        if (conversationFromParams) {
          return conversationFromParams.conversationId
        }

        return nextConversations[0]?.conversationId || ''
      })
    } catch (loadError) {
      setError(loadError?.message || 'Unable to load conversations.')
    } finally {
      setLoadingConversations(false)
    }
  }, [conversationFromParams, user?.$id])

  useEffect(() => {
    loadConversations()
  }, [loadConversations])

  const selectedConversation = conversations.find((item) => item.conversationId === selectedConversationId) || null

  useEffect(() => {
    if (!selectedConversationId || !user?.$id) {
      setMessages([])
      return
    }

    let active = true

    const run = async () => {
      setLoadingMessages(true)

      try {
        const threadMessages = await messagingService.listConversationMessages({
          conversationId: selectedConversationId,
        })

        if (!active) {
          return
        }

        setMessages(threadMessages)
        setConversations((previous) =>
          previous.map((item) =>
            item.conversationId === selectedConversationId
              ? {
                  ...item,
                  unreadCount: 0,
                }
              : item,
          ),
        )

        await messagingService.markConversationAsRead({
          conversationId: selectedConversationId,
          userId: user.$id,
        })
      } catch (threadError) {
        if (!active) {
          return
        }

        toast.error(threadError?.message || 'Unable to load thread messages.')
      } finally {
        if (active) {
          setLoadingMessages(false)
        }
      }
    }

    run()

    return () => {
      active = false
    }
  }, [selectedConversationId, user?.$id])

  useEffect(() => {
    if (!user?.$id) {
      return undefined
    }

    const channel = `databases.${databaseId}.collections.${collections.messages}.documents`

    const unsubscribe = realtimeService.subscribe([channel], async (event) => {
      const incomingMessage = event?.payload
      if (!incomingMessage?.$id) {
        return
      }

      if (incomingMessage.senderId !== user.$id && incomingMessage.receiverId !== user.$id) {
        return
      }

      setConversations((previous) =>
        upsertConversationPreview(previous, incomingMessage, user.$id, selectedConversationId),
      )

      if (incomingMessage.conversationId === selectedConversationId) {
        setMessages((previous) => upsertMessage(previous, incomingMessage))

        if (incomingMessage.receiverId === user.$id && !incomingMessage.read) {
          try {
            await messagingService.markConversationAsRead({
              conversationId: selectedConversationId,
              userId: user.$id,
            })

            setMessages((previous) =>
              previous.map((message) =>
                message.$id === incomingMessage.$id
                  ? {
                      ...message,
                      read: true,
                    }
                  : message,
              ),
            )

            setConversations((previous) =>
              previous.map((item) =>
                item.conversationId === selectedConversationId
                  ? {
                      ...item,
                      unreadCount: 0,
                    }
                  : item,
              ),
            )
          } catch {
            // Ignore realtime mark-read failures.
          }
        }
      }
    })

    return () => {
      unsubscribe()
    }
  }, [selectedConversationId, user?.$id])

  useEffect(() => {
    const participantIds = [...new Set(conversations.map((item) => item.participantId).filter(Boolean))]
    const missingParticipantIds = participantIds.filter((id) => !profilesByUserId[id])

    const listingIds = [...new Set(conversations.map((item) => item.listingId).filter(Boolean))]
    const missingListingIds = listingIds.filter((id) => !listingsById[id])

    if (missingParticipantIds.length === 0 && missingListingIds.length === 0) {
      return
    }

    let active = true

    const hydrate = async () => {
      try {
        if (missingParticipantIds.length > 0) {
          const profileResponse = await dbService.listDocuments({
            collectionId: collections.users,
            queries: [Query.equal('userId', missingParticipantIds), Query.limit(Math.min(100, missingParticipantIds.length))],
          })

          if (active) {
            setProfilesByUserId((previous) => {
              const next = { ...previous }
              profileResponse.documents.forEach((profile) => {
                next[profile.userId] = profile
              })
              return next
            })
          }
        }

        if (missingListingIds.length > 0) {
          const listingResponse = await dbService.listDocuments({
            collectionId: collections.listings,
            queries: [Query.equal('$id', missingListingIds), Query.limit(Math.min(100, missingListingIds.length))],
          })

          if (active) {
            setListingsById((previous) => {
              const next = { ...previous }
              listingResponse.documents.forEach((listing) => {
                next[listing.$id] = listing
              })
              return next
            })
          }
        }
      } catch {
        // Ignore metadata hydration failures.
      }
    }

    hydrate()

    return () => {
      active = false
    }
  }, [conversations, listingsById, profilesByUserId])

  const onSendMessage = async (event) => {
    event.preventDefault()

    if (!selectedConversation || !user?.$id) {
      return
    }

    const body = draftBody.trim()
    if (!body) {
      return
    }

    setSending(true)

    try {
      const createdMessage = await messagingService.sendMessage({
        listingId: selectedConversation.listingId,
        senderId: user.$id,
        receiverId: selectedConversation.participantId,
        body,
      })

      setDraftBody('')
      setMessages((previous) => upsertMessage(previous, createdMessage))
      setConversations((previous) =>
        upsertConversationPreview(
          previous.map((item) =>
            item.conversationId === selectedConversation.conversationId
              ? {
                  ...item,
                  isDraft: false,
                }
              : item,
          ),
          createdMessage,
          user.$id,
          selectedConversation.conversationId,
        ),
      )
    } catch (sendError) {
      toast.error(sendError?.message || 'Unable to send message.')
    } finally {
      setSending(false)
    }
  }

  const selectedParticipantProfile = selectedConversation ? profilesByUserId[selectedConversation.participantId] : null
  const selectedListing = selectedConversation ? listingsById[selectedConversation.listingId] : null
  const selectedParticipantName = fullName(selectedParticipantProfile) || selectedConversation?.participantId || 'User'

  return (
    <div className="space-y-4">
      <header className="rounded-2xl border border-slate-200/80 bg-white/80 p-5 shadow-sm shadow-slate-900/5">
        <h1 className="text-2xl font-bold text-slate-900">Messaging</h1>
        <p className="text-sm text-slate-600">Track conversations in realtime and respond to listing inquiries.</p>
      </header>

      {error && <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>}

      <div className="grid gap-4 lg:grid-cols-[340px_1fr]">
        <Card className="h-[72vh]">
          <CardHeader>
            <CardTitle>Conversations</CardTitle>
          </CardHeader>
          <CardBody className="h-[calc(72vh-72px)] overflow-y-auto p-0">
            {loadingConversations ? (
              <div className="flex h-full items-center justify-center">
                <Spinner size="md" />
              </div>
            ) : conversations.length === 0 ? (
              <div className="px-5 py-8 text-sm text-slate-600">No conversations yet. Contact a landlord from a listing detail page.</div>
            ) : (
              <div className="space-y-2 p-3">
                {conversations.map((conversation) => {
                  const participantProfile = profilesByUserId[conversation.participantId]
                  const listing = listingsById[conversation.listingId]
                  const participantName = fullName(participantProfile) || conversation.participantId
                  const isSelected = conversation.conversationId === selectedConversationId

                  return (
                    <button
                      className={`w-full rounded-xl border px-4 py-3 text-left transition ${
                        isSelected
                          ? 'border-brand-200 bg-brand-50/80 shadow-sm'
                          : 'border-slate-200/80 bg-white hover:border-slate-300 hover:bg-slate-50'
                      }`}
                      key={conversation.conversationId}
                      onClick={() => setSelectedConversationId(conversation.conversationId)}
                      type="button"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <p className="line-clamp-1 text-sm font-semibold text-slate-900">{participantName}</p>
                        {conversation.unreadCount > 0 && <Badge variant="danger">{conversation.unreadCount}</Badge>}
                      </div>
                      <p className="mt-1 line-clamp-1 text-xs text-slate-600">{listing?.title || conversation.listingId}</p>
                      <p className="mt-1 line-clamp-1 text-xs text-slate-500">{conversation.lastMessageBody || 'Start a conversation'}</p>
                      <p className="mt-1 text-[11px] text-slate-400">{formatTimestamp(conversation.lastMessageAt)}</p>
                    </button>
                  )
                })}
              </div>
            )}
          </CardBody>
        </Card>

        <Card className="h-[72vh]">
          {selectedConversation ? (
            <>
              <CardHeader className="space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <CardTitle>{selectedParticipantName}</CardTitle>
                  {selectedConversation.unreadCount > 0 && <Badge variant="warning">{selectedConversation.unreadCount} unread</Badge>}
                </div>
                <p className="text-xs text-slate-600">{selectedListing?.title || selectedConversation.listingId}</p>
                {selectedListing && (
                  <Link className="text-xs font-semibold text-brand-700 hover:underline" to={`/listings/${selectedListing.$id}`}>
                    View listing
                  </Link>
                )}
              </CardHeader>
              <CardBody className="flex h-[calc(72vh-72px)] flex-col gap-3">
                <div className="flex-1 space-y-3 overflow-y-auto rounded-xl border border-slate-200/80 bg-slate-50/70 p-3">
                  {loadingMessages ? (
                    <div className="flex h-full items-center justify-center">
                      <Spinner size="md" />
                    </div>
                  ) : messages.length === 0 ? (
                    <div className="text-sm text-slate-500">No messages yet. Send the first one.</div>
                  ) : (
                    messages.map((message) => {
                      const isMine = message.senderId === user?.$id
                      return (
                        <div className={`flex ${isMine ? 'justify-end' : 'justify-start'}`} key={message.$id}>
                          <article
                            className={`max-w-[80%] rounded-2xl px-3 py-2.5 text-sm shadow-sm ${
                              isMine ? 'bg-brand-700 text-white shadow-brand-900/10' : 'border border-slate-200 bg-white text-slate-800'
                            }`}
                          >
                            <p className="whitespace-pre-wrap break-words">{message.body}</p>
                            <p className={`mt-1 text-[11px] ${isMine ? 'text-white/80' : 'text-slate-400'}`}>
                              {formatTimestamp(normalizeMessageTimestamp(message))}
                              {isMine && ` - ${message.read ? 'Read' : 'Sent'}`}
                            </p>
                          </article>
                        </div>
                      )
                    })
                  )}
                </div>

                <form className="space-y-2" onSubmit={onSendMessage}>
                  <textarea
                    className="min-h-24 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-brand-700 focus:ring-2 focus:ring-brand-100/80 focus:ring-offset-1"
                    disabled={sending}
                    onChange={(event) => setDraftBody(event.target.value)}
                    placeholder="Type your message..."
                    value={draftBody}
                  />
                  <div className="flex justify-end">
                    <Button disabled={!draftBody.trim()} loading={sending} loadingText="Sending..." type="submit">
                      Send
                    </Button>
                  </div>
                </form>
              </CardBody>
            </>
          ) : (
            <CardBody className="flex h-full items-center justify-center text-sm text-slate-600">
              Select a conversation to start messaging.
            </CardBody>
          )}
        </Card>
      </div>
    </div>
  )
}
