# Technical Specifications
## Library Tracker Web Application

### Document Information
- **Version**: 1.0
- **Date**: June 22, 2025
- **Purpose**: Implementation-ready technical specifications

---

## 1. Project Structure

### 1.1 Frontend Structure (React + Vite)
```
src/
├── components/           # Reusable UI components
│   ├── common/          # Generic components (Button, Modal, etc.)
│   ├── auth/            # Authentication components
│   ├── books/           # Book-related components
│   └── dashboard/       # Dashboard components
├── pages/               # Page components
├── hooks/               # Custom React hooks
├── context/             # React context providers
├── services/            # API service functions
├── utils/               # Utility functions
├── styles/              # Global styles and Tailwind config
└── assets/              # Static assets
```

### 1.2 Backend Structure (Node.js + Express)
```
server/
├── controllers/         # Route controllers
├── middleware/          # Custom middleware
├── models/              # Mongoose models
├── routes/              # API routes
├── services/            # Business logic services
├── utils/               # Utility functions
├── config/              # Configuration files
└── tests/               # Test files
```

---

## 2. Database Schema Implementation

### 2.1 User Model (Mongoose)
```javascript
const userSchema = new mongoose.Schema({
  googleId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  avatar: {
    type: String,
    default: ''
  },
  preferences: {
    theme: {
      type: String,
      enum: ['light', 'dark', 'system'],
      default: 'system'
    },
    defaultView: {
      type: String,
      enum: ['grid', 'list'],
      default: 'grid'
    },
    booksPerPage: {
      type: Number,
      default: 20,
      min: 10,
      max: 100
    }
  },
  readingGoal: {
    yearly: {
      type: Number,
      default: 12
    },
    current: {
      type: Number,
      default: 0
    }
  }
}, {
  timestamps: true
});

// Indexes
userSchema.index({ email: 1 });
userSchema.index({ googleId: 1 });
```

### 2.2 Book Model (Mongoose)
```javascript
const bookSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200
  },
  author: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  isbn: {
    type: String,
    trim: true,
    sparse: true,
    unique: true
  },
  publicationDate: {
    type: Date
  },
  genre: {
    type: String,
    trim: true,
    maxlength: 50
  },
  coverImage: {
    type: String,
    default: ''
  },
  description: {
    type: String,
    maxlength: 1000
  },
  status: {
    type: String,
    enum: ['not_started', 'in_progress', 'completed'],
    default: 'not_started',
    index: true
  },
  rating: {
    type: Number,
    min: 1,
    max: 5
  },
  notes: {
    type: String,
    maxlength: 2000
  },
  dateStarted: {
    type: Date
  },
  dateCompleted: {
    type: Date
  },
  tags: [{
    type: String,
    trim: true,
    maxlength: 30
  }],
  pageCount: {
    type: Number,
    min: 1
  },
  currentPage: {
    type: Number,
    default: 0,
    min: 0
  }
}, {
  timestamps: true
});

// Compound indexes for efficient queries
bookSchema.index({ userId: 1, status: 1 });
bookSchema.index({ userId: 1, createdAt: -1 });
bookSchema.index({ userId: 1, title: 'text', author: 'text' });

// Virtual for reading progress percentage
bookSchema.virtual('progressPercentage').get(function() {
  if (!this.pageCount || this.pageCount === 0) return 0;
  return Math.round((this.currentPage / this.pageCount) * 100);
});
```

---

## 3. API Endpoints Implementation

### 3.1 Authentication Routes
```javascript
// routes/auth.js
const express = require('express');
const router = express.Router();

// POST /api/auth/google
router.post('/google', async (req, res) => {
  try {
    const { idToken } = req.body;
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    
    // Find or create user
    let user = await User.findOne({ googleId: decodedToken.uid });
    if (!user) {
      user = new User({
        googleId: decodedToken.uid,
        email: decodedToken.email,
        name: decodedToken.name,
        avatar: decodedToken.picture
      });
      await user.save();
    }
    
    // Generate JWT
    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET);
    
    res.json({ token, user });
  } catch (error) {
    res.status(401).json({ error: 'Authentication failed' });
  }
});

// GET /api/auth/me
router.get('/me', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.userId).select('-__v');
    res.json(user);
  } catch (error) {
    res.status(404).json({ error: 'User not found' });
  }
});
```

### 3.2 Book Management Routes
```javascript
// routes/books.js
const express = require('express');
const router = express.Router();

// GET /api/books
router.get('/', authenticateToken, async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      status,
      search,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    const query = { userId: req.userId };
    
    // Add status filter
    if (status && status !== 'all') {
      query.status = status;
    }
    
    // Add search functionality
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { author: { $regex: search, $options: 'i' } }
      ];
    }

    const books = await Book.find(query)
      .sort({ [sortBy]: sortOrder === 'desc' ? -1 : 1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .exec();

    const total = await Book.countDocuments(query);

    res.json({
      books,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch books' });
  }
});

// POST /api/books
router.post('/', authenticateToken, async (req, res) => {
  try {
    const bookData = {
      ...req.body,
      userId: req.userId
    };
    
    const book = new Book(bookData);
    await book.save();
    
    res.status(201).json(book);
  } catch (error) {
    if (error.name === 'ValidationError') {
      res.status(400).json({ error: error.message });
    } else {
      res.status(500).json({ error: 'Failed to create book' });
    }
  }
});

// PATCH /api/books/:id/status
router.patch('/:id/status', authenticateToken, async (req, res) => {
  try {
    const { status } = req.body;
    const updateData = { status };
    
    // Set date fields based on status
    if (status === 'in_progress' && !book.dateStarted) {
      updateData.dateStarted = new Date();
    } else if (status === 'completed') {
      updateData.dateCompleted = new Date();
      if (!book.dateStarted) {
        updateData.dateStarted = new Date();
      }
    }
    
    const book = await Book.findOneAndUpdate(
      { _id: req.params.id, userId: req.userId },
      updateData,
      { new: true }
    );
    
    if (!book) {
      return res.status(404).json({ error: 'Book not found' });
    }
    
    res.json(book);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update book status' });
  }
});
```

---

## 4. Frontend Component Specifications

### 4.1 Authentication Components
```jsx
// components/auth/GoogleSignIn.jsx
import { GoogleAuth } from '@google-cloud/auth-library';
import { useAuth } from '../../context/AuthContext';

const GoogleSignIn = () => {
  const { signIn } = useAuth();
  
  const handleGoogleSignIn = async () => {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const idToken = await result.user.getIdToken();
      await signIn(idToken);
    } catch (error) {
      console.error('Sign in failed:', error);
    }
  };

  return (
    <button
      onClick={handleGoogleSignIn}
      className="flex items-center justify-center w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm bg-white text-sm font-medium text-gray-500 hover:bg-gray-50"
    >
      <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
        {/* Google icon SVG */}
      </svg>
      Sign in with Google
    </button>
  );
};
```

### 4.2 Book Management Components
```jsx
// components/books/BookCard.jsx
const BookCard = ({ book, onStatusChange, onEdit, onDelete }) => {
  const getStatusColor = (status) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800';
      case 'in_progress': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow">
      <div className="aspect-w-3 aspect-h-4">
        <img
          src={book.coverImage || '/default-book-cover.jpg'}
          alt={book.title}
          className="w-full h-48 object-cover"
          onError={(e) => {
            e.target.src = '/default-book-cover.jpg';
          }}
        />
      </div>
      
      <div className="p-4">
        <h3 className="font-semibold text-lg mb-1 line-clamp-2">
          {book.title}
        </h3>
        <p className="text-gray-600 mb-2">{book.author}</p>
        
        <div className="flex items-center justify-between mb-3">
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(book.status)}`}>
            {book.status.replace('_', ' ').toUpperCase()}
          </span>
          {book.rating && (
            <div className="flex items-center">
              {[...Array(5)].map((_, i) => (
                <Star
                  key={i}
                  className={`w-4 h-4 ${i < book.rating ? 'text-yellow-400 fill-current' : 'text-gray-300'}`}
                />
              ))}
            </div>
          )}
        </div>
        
        <div className="flex space-x-2">
          <StatusDropdown
            currentStatus={book.status}
            onStatusChange={(status) => onStatusChange(book._id, status)}
          />
          <button
            onClick={() => onEdit(book)}
            className="text-blue-600 hover:text-blue-800"
          >
            Edit
          </button>
        </div>
      </div>
    </div>
  );
};
```

### 4.3 Dashboard Components
```jsx
// components/dashboard/ReadingStats.jsx
const ReadingStats = ({ stats }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
      <StatCard
        title="Total Books"
        value={stats.totalBooks}
        icon={BookOpenIcon}
        color="blue"
      />
      <StatCard
        title="Currently Reading"
        value={stats.currentlyReading}
        icon={ClockIcon}
        color="yellow"
      />
      <StatCard
        title="Completed"
        value={stats.completed}
        icon={CheckCircleIcon}
        color="green"
      />
      <StatCard
        title="Reading Goal"
        value={`${stats.completed}/${stats.yearlyGoal}`}
        icon={TrophyIcon}
        color="purple"
        progress={stats.completed / stats.yearlyGoal * 100}
      />
    </div>
  );
};

const StatCard = ({ title, value, icon: Icon, color, progress }) => {
  const colorClasses = {
    blue: 'bg-blue-500',
    yellow: 'bg-yellow-500',
    green: 'bg-green-500',
    purple: 'bg-purple-500'
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center">
        <div className={`${colorClasses[color]} rounded-md p-3`}>
          <Icon className="w-6 h-6 text-white" />
        </div>
        <div className="ml-4">
          <p className="text-sm font-medium text-gray-500">{title}</p>
          <p className="text-2xl font-semibold text-gray-900">{value}</p>
        </div>
      </div>
      {progress !== undefined && (
        <div className="mt-4">
          <div className="bg-gray-200 rounded-full h-2">
            <div
              className={`${colorClasses[color]} h-2 rounded-full transition-all duration-300`}
              style={{ width: `${Math.min(progress, 100)}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
};
```

---

## 5. State Management

### 5.1 Authentication Context
```jsx
// context/AuthContext.jsx
const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState(localStorage.getItem('token'));

  useEffect(() => {
    if (token) {
      // Verify token and get user data
      verifyToken(token);
    } else {
      setLoading(false);
    }
  }, [token]);

  const signIn = async (idToken) => {
    try {
      const response = await api.post('/auth/google', { idToken });
      const { token, user } = response.data;
      
      localStorage.setItem('token', token);
      setToken(token);
      setUser(user);
      
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  };

  const signOut = () => {
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
  };

  const value = {
    user,
    loading,
    signIn,
    signOut,
    isAuthenticated: !!user
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};
```

### 5.2 Books State Management
```jsx
// hooks/useBooks.js
export const useBooks = () => {
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    total: 0
  });

  const fetchBooks = useCallback(async (filters = {}) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await api.get('/books', { params: filters });
      setBooks(response.data.books);
      setPagination({
        currentPage: response.data.currentPage,
        totalPages: response.data.totalPages,
        total: response.data.total
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const addBook = async (bookData) => {
    try {
      const response = await api.post('/books', bookData);
      setBooks(prev => [response.data, ...prev]);
      return { success: true, book: response.data };
    } catch (err) {
      return { success: false, error: err.message };
    }
  };

  const updateBookStatus = async (bookId, status) => {
    try {
      const response = await api.patch(`/books/${bookId}/status`, { status });
      setBooks(prev => 
        prev.map(book => 
          book._id === bookId ? response.data : book
        )
      );
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  };

  return {
    books,
    loading,
    error,
    pagination,
    fetchBooks,
    addBook,
    updateBookStatus
  };
};
```

---

## 6. Environment Configuration

### 6.1 Frontend Environment Variables
```bash
# .env
VITE_FIREBASE_API_KEY=your_firebase_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_API_BASE_URL=http://localhost:5000/api
VITE_GOOGLE_CLIENT_ID=your_google_client_id
```

### 6.2 Backend Environment Variables
```bash
# .env
NODE_ENV=development
PORT=5000
MONGODB_URI=mongodb://localhost:27017/library-tracker
JWT_SECRET=your_jwt_secret_key
FIREBASE_PROJECT_ID=your_project_id
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxx@your-project.iam.gserviceaccount.com
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
CORS_ORIGIN=http://localhost:3000
```

---

## 7. Deployment Configuration

### 7.1 Netlify Configuration
```toml
# netlify.toml
[build]
  publish = "dist"
  command = "npm run build"

[build.environment]
  NODE_VERSION = "18"

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200

[[headers]]
  for = "/static/*"
  [headers.values]
    Cache-Control = "public, max-age=31536000, immutable"
```

### 7.2 Package.json Scripts
```json
{
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview",
    "test": "jest",
    "test:watch": "jest --watch",
    "lint": "eslint src --ext .js,.jsx,.ts,.tsx",
    "lint:fix": "eslint src --ext .js,.jsx,.ts,.tsx --fix",
    "format": "prettier --write src/**/*.{js,jsx,ts,tsx,json,css,md}"
  }
}
```

---

This technical specification provides implementation-ready details for building the Library Tracker application. Each section includes specific code examples and configurations needed for development.
