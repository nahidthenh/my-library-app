import { render } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import { vi } from 'vitest'

// Custom render function that includes providers
export function renderWithRouter(ui, options = {}) {
  const { initialEntries = ['/'], ...renderOptions } = options

  const Wrapper = ({ children }) => (
    <BrowserRouter>
      {children}
    </BrowserRouter>
  )

  return render(ui, { wrapper: Wrapper, ...renderOptions })
}

// Mock user data generator
export const createMockUser = (overrides = {}) => ({
  uid: 'test-uid-123',
  email: 'test@example.com',
  displayName: 'Test User',
  photoURL: 'https://example.com/avatar.jpg',
  emailVerified: true,
  ...overrides
})

// Mock book data generator
export const createMockBook = (overrides = {}) => ({
  _id: 'book-id-123',
  title: 'Test Book',
  author: 'Test Author',
  genre: 'Fiction',
  status: 'not_started',
  rating: 0,
  pageCount: 300,
  currentPage: 0,
  publicationDate: '2023-01-01',
  dateAdded: '2023-06-01',
  description: 'A test book description',
  coverImage: 'https://example.com/cover.jpg',
  isbn: '9780123456789',
  progressPercentage: 0,
  ...overrides
})

// Mock reading session data
export const createMockReadingSession = (overrides = {}) => ({
  _id: 'session-id-123',
  bookId: 'book-id-123',
  startTime: new Date('2023-06-01T10:00:00Z'),
  endTime: new Date('2023-06-01T11:00:00Z'),
  duration: 3600, // 1 hour in seconds
  pagesRead: 20,
  notes: 'Great reading session',
  ...overrides
})

// Mock API responses
export const mockApiResponse = (data, success = true) => ({
  success,
  data,
  message: success ? 'Operation successful' : 'Operation failed'
})

// Mock fetch function
export const mockFetch = (response, ok = true) => {
  global.fetch = vi.fn(() =>
    Promise.resolve({
      ok,
      status: ok ? 200 : 400,
      json: () => Promise.resolve(response),
    })
  )
}

// Mock axios responses
export const mockAxiosResponse = (data, status = 200) => ({
  data,
  status,
  statusText: 'OK',
  headers: {},
  config: {}
})

// Mock axios error
export const mockAxiosError = (message = 'Network Error', status = 500) => {
  const error = new Error(message)
  error.response = {
    data: { message, success: false },
    status,
    statusText: 'Internal Server Error'
  }
  return error
}

// Test data arrays
export const createMockBooks = (count = 3) => {
  return Array.from({ length: count }, (_, index) => 
    createMockBook({
      _id: `book-id-${index + 1}`,
      title: `Test Book ${index + 1}`,
      author: `Test Author ${index + 1}`,
      status: ['not_started', 'in_progress', 'completed'][index % 3],
      rating: index + 1,
      currentPage: index * 50,
      progressPercentage: (index * 50 / 300) * 100
    })
  )
}

// Mock analytics data
export const createMockAnalytics = () => ({
  totalBooks: 15,
  booksRead: 8,
  booksInProgress: 3,
  booksNotStarted: 4,
  totalPages: 4500,
  pagesRead: 2400,
  averageRating: 4.2,
  readingGoal: {
    yearly: 12,
    current: 8,
    progress: 67
  },
  monthlyStats: [
    { month: 'Jan', books: 2, pages: 600 },
    { month: 'Feb', books: 1, pages: 300 },
    { month: 'Mar', books: 3, pages: 900 },
    { month: 'Apr', books: 2, pages: 600 }
  ],
  genreDistribution: [
    { genre: 'Fiction', count: 8 },
    { genre: 'Non-Fiction', count: 4 },
    { genre: 'Science Fiction', count: 2 },
    { genre: 'Biography', count: 1 }
  ]
})

// Wait for async operations
export const waitFor = (ms = 0) => new Promise(resolve => setTimeout(resolve, ms))

// Mock component props
export const createMockProps = (overrides = {}) => ({
  onClick: vi.fn(),
  onChange: vi.fn(),
  onSubmit: vi.fn(),
  onClose: vi.fn(),
  onSave: vi.fn(),
  onDelete: vi.fn(),
  ...overrides
})

// Assertion helpers
export const expectElementToBeVisible = (element) => {
  expect(element).toBeInTheDocument()
  expect(element).toBeVisible()
}

export const expectElementToHaveText = (element, text) => {
  expect(element).toBeInTheDocument()
  expect(element).toHaveTextContent(text)
}

export const expectButtonToBeDisabled = (button) => {
  expect(button).toBeInTheDocument()
  expect(button).toBeDisabled()
}

export const expectButtonToBeEnabled = (button) => {
  expect(button).toBeInTheDocument()
  expect(button).toBeEnabled()
}
