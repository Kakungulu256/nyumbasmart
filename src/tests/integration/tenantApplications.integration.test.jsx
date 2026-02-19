/** @vitest-environment jsdom */
import { render, screen, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const { authState, applicationsServiceMock, dbServiceMock, queryMock } = vi.hoisted(() => ({
  authState: {
    user: { $id: 'tenant_1' },
  },
  applicationsServiceMock: {
    listTenantApplications: vi.fn(),
    withdrawApplication: vi.fn(),
  },
  dbServiceMock: {
    listDocuments: vi.fn(),
  },
  queryMock: {
    equal: vi.fn((...args) => ({ op: 'equal', args })),
    limit: vi.fn((...args) => ({ op: 'limit', args })),
  },
}))

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => authState,
}))

vi.mock('@/features/applications/services/applicationsService', () => ({
  applicationsService: applicationsServiceMock,
}))

vi.mock('@/services/appwrite/db', () => ({
  dbService: dbServiceMock,
  Query: queryMock,
}))

import { TenantApplicationsPage } from '@/features/applications/pages/TenantApplicationsPage'

describe('Tenant applications integration', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('loads tenant applications and supports withdraw action', async () => {
    applicationsServiceMock.listTenantApplications
      .mockResolvedValueOnce([
        {
          $id: 'app_1',
          listingId: 'listing_1',
          status: 'pending',
          createdAt: '2026-02-01T10:00:00.000Z',
        },
      ])
      .mockResolvedValueOnce([])

    dbServiceMock.listDocuments.mockResolvedValueOnce({
      documents: [
        {
          $id: 'listing_1',
          title: 'Test Listing',
          city: 'Kampala',
          country: 'UG',
        },
      ],
    })

    applicationsServiceMock.withdrawApplication.mockResolvedValueOnce({})

    const user = userEvent.setup()

    render(
      <MemoryRouter>
        <TenantApplicationsPage />
      </MemoryRouter>,
    )

    expect(await screen.findByText('Test Listing')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Withdraw' }))

    await waitFor(() => {
      expect(applicationsServiceMock.withdrawApplication).toHaveBeenCalledWith({
        application: expect.objectContaining({ $id: 'app_1' }),
      })
    })

    await waitFor(() => {
      expect(applicationsServiceMock.listTenantApplications).toHaveBeenCalledTimes(2)
    })
  })
})
