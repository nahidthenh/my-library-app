# API Testing Guide for Library Tracker Backend

## Quick Start

The Library Tracker API is now running on **http://localhost:5001**

### Health Check
```bash
curl http://localhost:5001/health
```

Expected Response:
```json
{
  "status": "OK",
  "timestamp": "2025-06-22T...",
  "uptime": 123.456,
  "environment": "development",
  "version": "v1"
}
```

## API Base URL
All API endpoints are prefixed with: `http://localhost:5001/api/v1`

## Authentication

### Google OAuth (Primary Method)
```bash
POST /api/v1/auth/google
Content-Type: application/json

{
  "idToken": "firebase_id_token_here"
}
```

### Get Current User
```bash
GET /api/v1/auth/me
Authorization: Bearer <firebase_id_token_or_jwt>
```

## User Management

### Get User Profile
```bash
GET /api/v1/users/profile
Authorization: Bearer <token>
```

### Update User Profile
```bash
PUT /api/v1/users/profile
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "Updated Name",
  "preferences": {
    "theme": "dark",
    "defaultView": "list",
    "booksPerPage": 25
  }
}
```

### Get Reading Statistics
```bash
GET /api/v1/users/stats
Authorization: Bearer <token>
```

### Update Reading Goal
```bash
PUT /api/v1/users/reading-goal
Authorization: Bearer <token>
Content-Type: application/json

{
  "yearly": 24
}
```

## Book Management

### Get All Books
```bash
GET /api/v1/books?page=1&limit=20&status=all&sortBy=createdAt&sortOrder=desc
Authorization: Bearer <token>
```

Query Parameters:
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 20)
- `status`: Filter by status (not_started, in_progress, completed, all)
- `genre`: Filter by genre
- `sortBy`: Sort field (createdAt, title, author, status)
- `sortOrder`: Sort direction (asc, desc)

### Create New Book
```bash
POST /api/v1/books
Authorization: Bearer <token>
Content-Type: application/json

{
  "title": "The Great Gatsby",
  "author": "F. Scott Fitzgerald",
  "isbn": "9780743273565",
  "publicationDate": "1925-04-10",
  "genre": "Fiction",
  "description": "A classic American novel",
  "pageCount": 180,
  "coverImage": "https://example.com/cover.jpg",
  "tags": ["classic", "american literature"]
}
```

### Get Single Book
```bash
GET /api/v1/books/:bookId
Authorization: Bearer <token>
```

### Update Book
```bash
PUT /api/v1/books/:bookId
Authorization: Bearer <token>
Content-Type: application/json

{
  "title": "Updated Title",
  "rating": 5,
  "notes": "Excellent book!"
}
```

### Update Book Status
```bash
PATCH /api/v1/books/:bookId/status
Authorization: Bearer <token>
Content-Type: application/json

{
  "status": "completed"
}
```

### Search Books
```bash
GET /api/v1/books/search?q=gatsby&page=1&limit=10
Authorization: Bearer <token>
```

### Get Books by Genre
```bash
GET /api/v1/books/genres
Authorization: Bearer <token>
```

### Delete Book
```bash
DELETE /api/v1/books/:bookId
Authorization: Bearer <token>
```

## Testing with Postman

### 1. Import Environment
Create a new Postman environment with:
- `baseUrl`: `http://localhost:5001/api/v1`
- `token`: `your_auth_token_here`

### 2. Set Authorization
For protected endpoints, add to Headers:
```
Authorization: Bearer {{token}}
```

### 3. Test Sequence
1. Health check: `GET {{baseUrl}}/../../health`
2. Authentication: `POST {{baseUrl}}/auth/google`
3. Get profile: `GET {{baseUrl}}/auth/me`
4. Create book: `POST {{baseUrl}}/books`
5. Get books: `GET {{baseUrl}}/books`
6. Update status: `PATCH {{baseUrl}}/books/:id/status`

## Testing with cURL

### Complete Example Flow
```bash
# 1. Health check
curl http://localhost:5001/health

# 2. Create a book (requires authentication)
curl -X POST http://localhost:5001/api/v1/books \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "title": "Test Book",
    "author": "Test Author",
    "genre": "Fiction"
  }'

# 3. Get all books
curl -X GET "http://localhost:5001/api/v1/books?page=1&limit=10" \
  -H "Authorization: Bearer YOUR_TOKEN"

# 4. Update book status
curl -X PATCH http://localhost:5001/api/v1/books/BOOK_ID/status \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"status": "completed"}'
```

## Error Responses

### 400 Bad Request
```json
{
  "success": false,
  "error": {
    "message": "Validation error message"
  },
  "timestamp": "2025-06-22T...",
  "path": "/api/v1/books",
  "method": "POST"
}
```

### 401 Unauthorized
```json
{
  "success": false,
  "error": {
    "message": "Not authorized, no token"
  },
  "timestamp": "2025-06-22T...",
  "path": "/api/v1/books",
  "method": "GET"
}
```

### 404 Not Found
```json
{
  "success": false,
  "error": {
    "message": "Book not found"
  },
  "timestamp": "2025-06-22T...",
  "path": "/api/v1/books/invalid_id",
  "method": "GET"
}
```

## Rate Limiting

The API implements rate limiting:
- **Window**: 15 minutes
- **Max Requests**: 100 per IP
- **Headers**: `RateLimit-Limit`, `RateLimit-Remaining`, `RateLimit-Reset`

When rate limit is exceeded:
```json
{
  "error": "Too many requests from this IP, please try again later.",
  "retryAfter": 900
}
```

## Development Notes

### MongoDB Connection
- The API will show connection errors if MongoDB is not running
- For local development, install and start MongoDB
- For production, use MongoDB Atlas (see MongoDB-Setup-Guide.md)

### Firebase Authentication
- Currently configured for development mode
- Replace demo Firebase credentials with actual project credentials
- See frontend Firebase configuration for client-side setup

### CORS Configuration
- Configured for frontend development servers
- Ports: 3000, 5173, 5174
- Update CORS_ORIGIN environment variable for production

## Next Steps

1. **Set up MongoDB** (local or Atlas)
2. **Configure Firebase** with real project credentials
3. **Test authentication flow** with frontend
4. **Implement frontend API integration**

For detailed setup instructions, see:
- `MongoDB-Setup-Guide.md`
- `../frontend/README.md`
