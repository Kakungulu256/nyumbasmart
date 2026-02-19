import { describe, expect, it } from 'vitest'

import {
  LISTING_IMAGE_MAX_INPUT_BYTES,
  validateImageFile,
} from '@/features/listings/utils/listingMedia'
import { ensureFiniteNumber, ensureSafeId, sanitizeTextInput } from '@/utils/security'

describe('Input hardening', () => {
  it('rejects invalid IDs', () => {
    expect(() => ensureSafeId('')).toThrow()
    expect(() => ensureSafeId('bad id with spaces')).toThrow()
    expect(ensureSafeId('safe_id-1')).toBe('safe_id-1')
  })

  it('sanitizes control characters from text', () => {
    const cleaned = sanitizeTextInput('hello\u0000 world\u001f')
    expect(cleaned).toBe('hello world')
  })

  it('enforces numeric ranges', () => {
    expect(() =>
      ensureFiniteNumber('99', {
        label: 'Bedrooms',
        integer: true,
        max: 20,
      }),
    ).toThrow()

    expect(
      ensureFiniteNumber('10', {
        label: 'Bedrooms',
        integer: true,
        min: 0,
        max: 20,
      }),
    ).toBe(10)
  })
})

describe('Upload restrictions', () => {
  it('rejects unsupported file types', () => {
    const error = validateImageFile({
      name: 'payload.exe',
      type: 'application/octet-stream',
      size: 1024,
    })

    expect(error).toContain('Only JPG, PNG, and WEBP')
  })

  it('rejects oversized source image files', () => {
    const error = validateImageFile({
      name: 'photo.jpg',
      type: 'image/jpeg',
      size: LISTING_IMAGE_MAX_INPUT_BYTES + 1,
    })

    expect(error).toContain('Maximum raw file size is 15MB')
  })

  it('accepts supported image inputs within limits', () => {
    const error = validateImageFile({
      name: 'photo.webp',
      type: 'image/webp',
      size: 1024 * 512,
    })

    expect(error).toBe('')
  })
})
