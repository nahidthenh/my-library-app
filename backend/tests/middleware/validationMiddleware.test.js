import request from 'supertest';
import express from 'express';
import {
  validateBook,
  validateUser,
  validateAuth,
  validateSearch,
  validateId,
  sanitizeRequest,
  sanitizeInput
} from '../../middleware/validationMiddleware.js';

describe('Validation Middleware', () => {
  let app;

  beforeEach(() => {
    app = express();
    app.use(express.json());
  });

  describe('Input Sanitization', () => {
    describe('HTML Sanitization', () => {
      it('should remove HTML tags', () => {
        const input = '<script>alert("xss")</script>Hello World';
        const result = sanitizeInput.html(input);
        expect(result).toBe('alert("xss")Hello World');
      });

      it('should escape HTML entities', () => {
        const input = 'Hello & "World" <test>';
        const result = sanitizeInput.html(input);
        expect(result).toBe('Hello &amp; &quot;World&quot; &lt;test&gt;');
      });

      it('should handle non-string inputs', () => {
        expect(sanitizeInput.html(123)).toBe(123);
        expect(sanitizeInput.html(null)).toBe(null);
        expect(sanitizeInput.html(undefined)).toBe(undefined);
      });
    });

    describe('NoSQL Injection Prevention', () => {
      it('should remove NoSQL injection characters', () => {
        const input = 'test$where{}';
        const result = sanitizeInput.nosql(input);
        expect(result).toBe('testwhere');
      });

      it('should stringify objects', () => {
        const input = { $where: 'malicious code' };
        const result = sanitizeInput.nosql(input);
        expect(result).toBe('{"$where":"malicious code"}');
      });
    });

    describe('Request Sanitization Middleware', () => {
      beforeEach(() => {
        app.use(sanitizeRequest);
        app.post('/test', (req, res) => {
          res.json(req.body);
        });
      });

      it('should sanitize request body', async () => {
        const maliciousData = {
          title: '<script>alert("xss")</script>Book Title',
          description: 'Test & "description"'
        };

        const response = await request(app)
          .post('/test')
          .send(maliciousData)
          .expect(200);

        expect(response.body.title).toBe('alert("xss")Book Title');
        expect(response.body.description).toBe('Test &amp; &quot;description&quot;');
      });

      it('should sanitize nested objects', async () => {
        const maliciousData = {
          book: {
            title: '<script>alert("xss")</script>',
            metadata: {
              description: 'Test & "description"'
            }
          }
        };

        const response = await request(app)
          .post('/test')
          .send(maliciousData)
          .expect(200);

        expect(response.body.book.title).toBe('alert("xss")');
        expect(response.body.book.metadata.description).toBe('Test &amp; &quot;description&quot;');
      });
    });
  });

  describe('Book Validation', () => {
    beforeEach(() => {
      app.use(validateBook);
      app.post('/books', (req, res) => {
        res.json({ success: true });
      });
    });

    it('should accept valid book data', async () => {
      const validBook = {
        title: 'Valid Book Title',
        author: 'John Doe',
        isbn: '978-0-123456-78-9',
        genre: 'Fiction',
        pageCount: 300,
        status: 'not_started'
      };

      await request(app)
        .post('/books')
        .send(validBook)
        .expect(200);
    });

    it('should reject book with invalid title', async () => {
      const invalidBook = {
        title: '', // Empty title
        author: 'John Doe'
      };

      const response = await request(app)
        .post('/books')
        .send(invalidBook)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.type).toBe('VALIDATION_ERROR');
      expect(response.body.error.details).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            field: 'title',
            message: expect.stringContaining('Title must be between 1 and 200 characters')
          })
        ])
      );
    });

    it('should reject book with invalid ISBN', async () => {
      const invalidBook = {
        title: 'Valid Title',
        author: 'John Doe',
        isbn: 'invalid-isbn'
      };

      const response = await request(app)
        .post('/books')
        .send(invalidBook)
        .expect(400);

      expect(response.body.error.details).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            field: 'isbn',
            message: 'Invalid ISBN format'
          })
        ])
      );
    });

    it('should reject book with invalid rating', async () => {
      const invalidBook = {
        title: 'Valid Title',
        author: 'John Doe',
        rating: 6 // Rating should be 1-5
      };

      const response = await request(app)
        .post('/books')
        .send(invalidBook)
        .expect(400);

      expect(response.body.error.details).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            field: 'rating',
            message: 'Rating must be between 1 and 5'
          })
        ])
      );
    });

    it('should reject book with invalid status', async () => {
      const invalidBook = {
        title: 'Valid Title',
        author: 'John Doe',
        status: 'invalid_status'
      };

      const response = await request(app)
        .post('/books')
        .send(invalidBook)
        .expect(400);

      expect(response.body.error.details).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            field: 'status',
            message: 'Invalid status value'
          })
        ])
      );
    });

    it('should reject book with too many tags', async () => {
      const invalidBook = {
        title: 'Valid Title',
        author: 'John Doe',
        tags: new Array(11).fill('tag') // More than 10 tags
      };

      const response = await request(app)
        .post('/books')
        .send(invalidBook)
        .expect(400);

      expect(response.body.error.details).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            field: 'tags',
            message: 'Maximum 10 tags allowed'
          })
        ])
      );
    });
  });

  describe('Authentication Validation', () => {
    beforeEach(() => {
      app.use(validateAuth);
      app.post('/auth', (req, res) => {
        res.json({ success: true });
      });
    });

    it('should accept valid ID token', async () => {
      const validAuth = {
        idToken: 'valid.jwt.token.with.sufficient.length'
      };

      await request(app)
        .post('/auth')
        .send(validAuth)
        .expect(200);
    });

    it('should reject missing ID token', async () => {
      const response = await request(app)
        .post('/auth')
        .send({})
        .expect(400);

      expect(response.body.error.details).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            field: 'idToken',
            message: 'ID token is required'
          })
        ])
      );
    });

    it('should reject short ID token', async () => {
      const invalidAuth = {
        idToken: 'short'
      };

      const response = await request(app)
        .post('/auth')
        .send(invalidAuth)
        .expect(400);

      expect(response.body.error.details).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            field: 'idToken',
            message: 'Invalid token format'
          })
        ])
      );
    });
  });

  describe('Search Validation', () => {
    beforeEach(() => {
      app.use(validateSearch);
      app.get('/search', (req, res) => {
        res.json({ success: true });
      });
    });

    it('should accept valid search parameters', async () => {
      await request(app)
        .get('/search?q=test&page=1&limit=10&sortBy=title&sortOrder=asc')
        .expect(200);
    });

    it('should reject invalid page number', async () => {
      const response = await request(app)
        .get('/search?page=0')
        .expect(400);

      expect(response.body.error.details).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            field: 'page',
            message: 'Page must be a positive integer'
          })
        ])
      );
    });

    it('should reject invalid sort field', async () => {
      const response = await request(app)
        .get('/search?sortBy=invalid_field')
        .expect(400);

      expect(response.body.error.details).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            field: 'sortBy',
            message: 'Invalid sort field'
          })
        ])
      );
    });
  });

  describe('ID Validation', () => {
    beforeEach(() => {
      app.use('/books/:id', validateId);
      app.get('/books/:id', (req, res) => {
        res.json({ success: true });
      });
    });

    it('should accept valid MongoDB ObjectId', async () => {
      const validId = '507f1f77bcf86cd799439011';
      await request(app)
        .get(`/books/${validId}`)
        .expect(200);
    });

    it('should reject invalid ID format', async () => {
      const response = await request(app)
        .get('/books/invalid-id')
        .expect(400);

      expect(response.body.error.details).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            field: 'id',
            message: 'Invalid ID format'
          })
        ])
      );
    });
  });

  describe('User Validation', () => {
    beforeEach(() => {
      app.use(validateUser);
      app.put('/user', (req, res) => {
        res.json({ success: true });
      });
    });

    it('should accept valid user data', async () => {
      const validUser = {
        name: 'John Doe',
        email: 'john@example.com',
        preferences: {
          theme: 'dark',
          language: 'en'
        },
        readingGoal: {
          annual: 50,
          monthly: 4
        }
      };

      await request(app)
        .put('/user')
        .send(validUser)
        .expect(200);
    });

    it('should reject invalid email', async () => {
      const invalidUser = {
        email: 'invalid-email'
      };

      const response = await request(app)
        .put('/user')
        .send(invalidUser)
        .expect(400);

      expect(response.body.error.details).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            field: 'email',
            message: 'Invalid email format'
          })
        ])
      );
    });

    it('should reject invalid reading goal', async () => {
      const invalidUser = {
        readingGoal: {
          annual: 1001 // Too high
        }
      };

      const response = await request(app)
        .put('/user')
        .send(invalidUser)
        .expect(400);

      expect(response.body.error.details).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            field: 'readingGoal.annual',
            message: 'Annual reading goal must be between 1 and 1000'
          })
        ])
      );
    });
  });
});
