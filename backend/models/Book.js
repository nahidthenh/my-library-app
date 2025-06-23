import mongoose from 'mongoose';

const bookSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  title: {
    type: String,
    required: [true, 'Book title is required'],
    trim: true,
    maxlength: [200, 'Title cannot be more than 200 characters']
  },
  author: {
    type: String,
    required: [true, 'Author is required'],
    trim: true,
    maxlength: [100, 'Author name cannot be more than 100 characters']
  },
  isbn: {
    type: String,
    trim: true,
    sparse: true,
    unique: true,
    validate: {
      validator: function(v) {
        // ISBN-10 or ISBN-13 validation (basic)
        if (!v) return true; // Optional field
        return /^(?:ISBN(?:-1[03])?:? )?(?=[0-9X]{10}$|(?=(?:[0-9]+[- ]){3})[- 0-9X]{13}$|97[89][0-9]{10}$|(?=(?:[0-9]+[- ]){4})[- 0-9]{17}$)(?:97[89][- ]?)?[0-9]{1,5}[- ]?[0-9]+[- ]?[0-9]+[- ]?[0-9X]$/.test(v);
      },
      message: 'Please enter a valid ISBN'
    }
  },
  publicationDate: {
    type: Date,
    validate: {
      validator: function(v) {
        return !v || v <= new Date();
      },
      message: 'Publication date cannot be in the future'
    }
  },
  genre: {
    type: String,
    trim: true,
    maxlength: [50, 'Genre cannot be more than 50 characters']
  },
  coverImage: {
    type: String,
    default: '',
    validate: {
      validator: function(v) {
        if (!v) return true; // Optional field
        return /^https?:\/\/.+\.(jpg|jpeg|png|gif|webp)$/i.test(v);
      },
      message: 'Please enter a valid image URL'
    }
  },
  description: {
    type: String,
    maxlength: [1000, 'Description cannot be more than 1000 characters']
  },
  status: {
    type: String,
    enum: {
      values: ['not_started', 'in_progress', 'completed'],
      message: 'Status must be: not_started, in_progress, or completed'
    },
    default: 'not_started',
    index: true
  },
  rating: {
    type: Number,
    min: [1, 'Rating must be between 1 and 5'],
    max: [5, 'Rating must be between 1 and 5'],
    validate: {
      validator: function(v) {
        return !v || Number.isInteger(v);
      },
      message: 'Rating must be a whole number'
    }
  },
  notes: {
    type: String,
    maxlength: [2000, 'Notes cannot be more than 2000 characters']
  },
  dateStarted: {
    type: Date,
    validate: {
      validator: function(v) {
        return !v || v <= new Date();
      },
      message: 'Start date cannot be in the future'
    }
  },
  dateCompleted: {
    type: Date,
    validate: {
      validator: function(v) {
        if (!v) return true;
        if (v > new Date()) return false;
        if (this.dateStarted && v < this.dateStarted) return false;
        return true;
      },
      message: 'Completion date must be after start date and not in the future'
    }
  },
  tags: [{
    type: String,
    trim: true,
    maxlength: [30, 'Tag cannot be more than 30 characters']
  }],
  pageCount: {
    type: Number,
    min: [1, 'Page count must be at least 1']
  },
  currentPage: {
    type: Number,
    default: 0,
    min: [0, 'Current page cannot be negative'],
    validate: {
      validator: function(v) {
        return !this.pageCount || v <= this.pageCount;
      },
      message: 'Current page cannot exceed total page count'
    }
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Compound indexes for efficient queries
bookSchema.index({ userId: 1, status: 1 });
bookSchema.index({ userId: 1, createdAt: -1 });
bookSchema.index({ userId: 1, title: 'text', author: 'text' });
bookSchema.index({ userId: 1, genre: 1 });
bookSchema.index({ userId: 1, dateCompleted: -1 });

// Virtual for reading progress percentage
bookSchema.virtual('progressPercentage').get(function() {
  if (!this.pageCount || this.pageCount === 0) return 0;
  return Math.round((this.currentPage / this.pageCount) * 100);
});

// Virtual for reading duration (if completed)
bookSchema.virtual('readingDuration').get(function() {
  if (!this.dateStarted || !this.dateCompleted) return null;
  const diffTime = Math.abs(this.dateCompleted - this.dateStarted);
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
});

// Pre-save middleware to handle status changes
bookSchema.pre('save', function(next) {
  // Auto-set dateStarted when status changes to in_progress
  if (this.isModified('status') && this.status === 'in_progress' && !this.dateStarted) {
    this.dateStarted = new Date();
  }
  
  // Auto-set dateCompleted when status changes to completed
  if (this.isModified('status') && this.status === 'completed') {
    if (!this.dateCompleted) {
      this.dateCompleted = new Date();
    }
    if (!this.dateStarted) {
      this.dateStarted = this.dateCompleted;
    }
    // Set current page to page count if completed
    if (this.pageCount && this.currentPage < this.pageCount) {
      this.currentPage = this.pageCount;
    }
  }
  
  // Reset completion date if status changes from completed
  if (this.isModified('status') && this.status !== 'completed' && this.dateCompleted) {
    this.dateCompleted = undefined;
  }
  
  next();
});

// Static method to get user's reading statistics
bookSchema.statics.getUserReadingStats = async function(userId) {
  const stats = await this.aggregate([
    { $match: { userId: new mongoose.Types.ObjectId(userId) } },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
        books: { $push: '$$ROOT' }
      }
    }
  ]);
  
  const result = {
    totalBooks: 0,
    notStarted: 0,
    inProgress: 0,
    completed: 0,
    averageRating: 0,
    totalPages: 0
  };
  
  stats.forEach(stat => {
    result.totalBooks += stat.count;
    result[stat._id.replace('_', '')] = stat.count;
  });
  
  // Calculate average rating for completed books
  const ratedBooks = await this.find({ 
    userId, 
    status: 'completed', 
    rating: { $exists: true, $ne: null } 
  });
  
  if (ratedBooks.length > 0) {
    result.averageRating = ratedBooks.reduce((sum, book) => sum + book.rating, 0) / ratedBooks.length;
  }
  
  // Calculate total pages read
  const completedBooks = await this.find({ userId, status: 'completed', pageCount: { $exists: true } });
  result.totalPages = completedBooks.reduce((sum, book) => sum + (book.pageCount || 0), 0);
  
  return result;
};

// Static method to get books by genre for a user
bookSchema.statics.getBooksByGenre = function(userId) {
  return this.aggregate([
    { $match: { userId: new mongoose.Types.ObjectId(userId), genre: { $exists: true, $ne: '' } } },
    { $group: { _id: '$genre', count: { $sum: 1 } } },
    { $sort: { count: -1 } }
  ]);
};

const Book = mongoose.model('Book', bookSchema);

export default Book;
