import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useResponsive } from './useResponsive'

// Mock window dimensions
const mockWindowDimensions = (width = 1024, height = 768) => {
  Object.defineProperty(window, 'innerWidth', {
    writable: true,
    configurable: true,
    value: width,
  })
  Object.defineProperty(window, 'innerHeight', {
    writable: true,
    configurable: true,
    value: height,
  })
}

describe('useResponsive Hook', () => {
  beforeEach(() => {
    // Mock window dimensions to desktop size
    mockWindowDimensions(1024, 768)

    // Mock addEventListener and removeEventListener
    vi.spyOn(window, 'addEventListener')
    vi.spyOn(window, 'removeEventListener')
  })

  afterEach(() => {
    vi.clearAllMocks()
    vi.restoreAllMocks()
  })

  it('returns initial responsive state for desktop', () => {
    const { result } = renderHook(() => useResponsive())

    expect(result.current.breakpoint).toBe('lg')
    expect(result.current.screenSize.width).toBe(1024)
    expect(result.current.screenSize.height).toBe(768)
    expect(result.current.isDesktop).toBe(true)
    expect(result.current.isMobile).toBe(false)
  })

  it('detects mobile breakpoint', () => {
    mockWindowDimensions(500, 800) // Mobile size
    const { result } = renderHook(() => useResponsive())

    expect(result.current.breakpoint).toBe('xs')
    expect(result.current.isMobile).toBe(true)
  })

  it('adds and removes event listeners', () => {
    const { unmount } = renderHook(() => useResponsive())

    expect(window.addEventListener).toHaveBeenCalledWith('resize', expect.any(Function))

    unmount()

    expect(window.removeEventListener).toHaveBeenCalledWith('resize', expect.any(Function))
  })
})
