/** @vitest-environment jsdom */
import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const { authMock, authServiceMock } = vi.hoisted(() => ({
  authMock: {
    refreshSession: vi.fn(),
  },
  authServiceMock: {
    loginWithEmail: vi.fn(),
  },
}))

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => authMock,
}))

vi.mock('@/services/appwrite/auth', () => ({
  authService: authServiceMock,
}))

import { LoginPage } from '@/features/auth/pages/LoginPage'

describe('Login flow integration', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('logs in successfully and navigates to tenant dashboard', async () => {
    authServiceMock.loginWithEmail.mockResolvedValueOnce({})
    authMock.refreshSession.mockResolvedValueOnce({
      user: { $id: 'user_1', emailVerification: true },
      profile: { role: 'tenant' },
    })

    const user = userEvent.setup()

    render(
      <MemoryRouter initialEntries={['/auth/login']}>
        <Routes>
          <Route path="/auth/login" element={<LoginPage />} />
          <Route path="/dashboard/tenant" element={<div>Tenant dashboard loaded</div>} />
        </Routes>
      </MemoryRouter>,
    )

    await user.type(screen.getByLabelText('Email'), 'tenant@example.com')
    await user.type(screen.getByLabelText('Password'), 'securepass123')
    await user.click(screen.getByRole('button', { name: 'Login' }))

    expect(authServiceMock.loginWithEmail).toHaveBeenCalledWith({
      email: 'tenant@example.com',
      password: 'securepass123',
    })
    expect(authMock.refreshSession).toHaveBeenCalled()
    expect(await screen.findByText('Tenant dashboard loaded')).toBeInTheDocument()
  })
})
