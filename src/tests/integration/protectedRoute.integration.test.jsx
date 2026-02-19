/** @vitest-environment jsdom */
import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const { authState } = vi.hoisted(() => ({
  authState: {
    authStatus: 'ready',
    isAuthenticated: false,
    isEmailVerified: false,
    role: null,
  },
}))

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => authState,
}))

import { ProtectedRoute } from '@/features/auth/components/ProtectedRoute'

describe('ProtectedRoute integration', () => {
  beforeEach(() => {
    authState.authStatus = 'ready'
    authState.isAuthenticated = false
    authState.isEmailVerified = false
    authState.role = null
  })

  it('shows loading state while auth is bootstrapping', () => {
    authState.authStatus = 'loading'

    render(
      <MemoryRouter initialEntries={['/protected']}>
        <Routes>
          <Route
            path="/protected"
            element={
              <ProtectedRoute>
                <div>Secure area</div>
              </ProtectedRoute>
            }
          />
        </Routes>
      </MemoryRouter>,
    )

    expect(screen.getByText('Loading session...')).toBeInTheDocument()
  })

  it('redirects unauthenticated users to login', async () => {
    render(
      <MemoryRouter initialEntries={['/protected']}>
        <Routes>
          <Route
            path="/protected"
            element={
              <ProtectedRoute>
                <div>Secure area</div>
              </ProtectedRoute>
            }
          />
          <Route path="/auth/login" element={<div>Login screen</div>} />
        </Routes>
      </MemoryRouter>,
    )

    expect(await screen.findByText('Login screen')).toBeInTheDocument()
  })

  it('renders protected content for allowed roles', () => {
    authState.isAuthenticated = true
    authState.role = 'tenant'

    render(
      <MemoryRouter initialEntries={['/protected']}>
        <Routes>
          <Route
            path="/protected"
            element={
              <ProtectedRoute allowedRoles={['tenant']}>
                <div>Secure area</div>
              </ProtectedRoute>
            }
          />
        </Routes>
      </MemoryRouter>,
    )

    expect(screen.getByText('Secure area')).toBeInTheDocument()
  })

  it('redirects unauthorized roles to their fallback route', async () => {
    authState.isAuthenticated = true
    authState.role = 'landlord'

    render(
      <MemoryRouter initialEntries={['/tenant-only']}>
        <Routes>
          <Route
            path="/tenant-only"
            element={
              <ProtectedRoute allowedRoles={['tenant']}>
                <div>Tenant area</div>
              </ProtectedRoute>
            }
          />
          <Route path="/dashboard/landlord" element={<div>Landlord home</div>} />
        </Routes>
      </MemoryRouter>,
    )

    expect(await screen.findByText('Landlord home')).toBeInTheDocument()
  })
})
