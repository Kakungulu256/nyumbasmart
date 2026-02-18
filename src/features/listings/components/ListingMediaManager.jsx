import { useEffect, useMemo, useState } from 'react'
import toast from 'react-hot-toast'

import { Button, Spinner } from '@/components/ui'
import { buckets } from '@/constants/buckets'
import { storageService } from '@/services/appwrite/storage'
import { compressImageFile, isSupportedImage } from '@/features/listings/utils/listingMedia'

const MAX_IMAGES = 12

function toPreviewUrl(fileId) {
  const url = storageService.getFileView({
    bucketId: buckets.listingImages,
    fileId,
  })

  return typeof url === 'string' ? url : url.toString()
}

function extractFileIds(items) {
  return items.map((item) => item.fileId).filter(Boolean)
}

function makeLocalId(prefix = 'local') {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

export function ListingMediaManager({ imageFileIds = [], onChange, disabled = false }) {
  const [items, setItems] = useState([])
  const [uploadingCount, setUploadingCount] = useState(0)

  const imageIdsKey = useMemo(() => (Array.isArray(imageFileIds) ? imageFileIds.join('|') : ''), [imageFileIds])

  useEffect(() => {
    const nextItems = (imageFileIds || []).map((fileId) => ({
      id: fileId,
      fileId,
      previewUrl: toPreviewUrl(fileId),
      isUploading: false,
      source: 'remote',
    }))

    setItems(nextItems)
  }, [imageIdsKey, imageFileIds])

  const updateAndEmit = (updater) => {
    setItems((previousItems) => {
      const nextItems = typeof updater === 'function' ? updater(previousItems) : updater
      onChange(extractFileIds(nextItems))
      return nextItems
    })
  }

  const handleFileSelection = async (event) => {
    const selectedFiles = Array.from(event.target.files || [])
    event.target.value = ''

    if (selectedFiles.length === 0) {
      return
    }

    const validFiles = selectedFiles.filter((file) => {
      if (isSupportedImage(file)) {
        return true
      }

      toast.error(`"${file.name}" is not a supported image.`)
      return false
    })

    const remainingSlots = Math.max(0, MAX_IMAGES - items.length)
    const filesToProcess = validFiles.slice(0, remainingSlots)

    if (validFiles.length > filesToProcess.length) {
      toast.error(`You can upload up to ${MAX_IMAGES} images.`)
    }

    for (const file of filesToProcess) {
      const localId = makeLocalId('upload')
      const localPreviewUrl = URL.createObjectURL(file)

      setItems((previousItems) => [
        ...previousItems,
        {
          id: localId,
          fileId: '',
          previewUrl: localPreviewUrl,
          isUploading: true,
          source: 'local',
        },
      ])

      setUploadingCount((count) => count + 1)

      try {
        const compressedFile = await compressImageFile(file)
        const uploadedFile = await storageService.uploadFile({
          bucketId: buckets.listingImages,
          file: compressedFile,
        })

        const uploadedFileId = uploadedFile.$id
        const uploadedPreviewUrl = toPreviewUrl(uploadedFileId)

        updateAndEmit((previousItems) =>
          previousItems.map((item) =>
            item.id === localId
              ? {
                  id: uploadedFileId,
                  fileId: uploadedFileId,
                  previewUrl: uploadedPreviewUrl,
                  isUploading: false,
                  source: 'remote',
                }
              : item,
          ),
        )
      } catch (error) {
        setItems((previousItems) => previousItems.filter((item) => item.id !== localId))
        toast.error(error?.message || `Failed to upload "${file.name}".`)
      } finally {
        URL.revokeObjectURL(localPreviewUrl)
        setUploadingCount((count) => Math.max(0, count - 1))
      }
    }
  }

  const moveItem = (index, direction) => {
    const targetIndex = index + direction

    if (targetIndex < 0 || targetIndex >= items.length) {
      return
    }

    updateAndEmit((previousItems) => {
      const nextItems = [...previousItems]
      const [movedItem] = nextItems.splice(index, 1)
      nextItems.splice(targetIndex, 0, movedItem)
      return nextItems
    })
  }

  const removeItem = async (itemId) => {
    const item = items.find((entry) => entry.id === itemId)

    if (!item || item.isUploading || !item.fileId) {
      return
    }

    try {
      await storageService.deleteFile({
        bucketId: buckets.listingImages,
        fileId: item.fileId,
      })

      updateAndEmit((previousItems) => previousItems.filter((entry) => entry.id !== itemId))
      toast.success('Image removed.')
    } catch (error) {
      toast.error(error?.message || 'Unable to remove image.')
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-slate-700">Listing images</p>
          <p className="text-xs text-slate-500">Upload, reorder, and remove listing images. First image is primary.</p>
        </div>

        <label className="inline-flex cursor-pointer items-center justify-center rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">
          Upload images
          <input
            accept="image/*"
            className="sr-only"
            disabled={disabled || items.length >= MAX_IMAGES}
            multiple
            onChange={handleFileSelection}
            type="file"
          />
        </label>
      </div>

      {uploadingCount > 0 && (
        <div className="flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-800">
          <Spinner size="sm" />
          Uploading {uploadingCount} image{uploadingCount > 1 ? 's' : ''}...
        </div>
      )}

      {items.length === 0 ? (
        <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-center text-sm text-slate-600">
          No images uploaded yet.
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item, index) => (
            <article className="overflow-hidden rounded-xl border border-slate-200 bg-white" key={item.id}>
              <div className="relative aspect-[4/3] bg-slate-100">
                <img alt={`Listing image ${index + 1}`} className="h-full w-full object-cover" src={item.previewUrl} />
                {item.isUploading && (
                  <div className="absolute inset-0 flex items-center justify-center bg-slate-900/45">
                    <Spinner size="md" tone="white" />
                  </div>
                )}
              </div>
              <div className="flex items-center justify-between gap-2 p-2">
                <p className="text-xs font-medium text-slate-600">#{index + 1}</p>
                <div className="flex gap-1">
                  <Button disabled={disabled || item.isUploading || index === 0} onClick={() => moveItem(index, -1)} size="sm" type="button" variant="ghost">
                    Up
                  </Button>
                  <Button disabled={disabled || item.isUploading || index === items.length - 1} onClick={() => moveItem(index, 1)} size="sm" type="button" variant="ghost">
                    Down
                  </Button>
                  <Button disabled={disabled || item.isUploading} onClick={() => removeItem(item.id)} size="sm" type="button" variant="danger">
                    Delete
                  </Button>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  )
}
