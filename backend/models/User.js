import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  googleId: {
    type: String,
    required: true,
    unique: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
  },
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: [100, 'Name cannot be more than 100 characters']
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
      min: [10, 'Books per page must be at least 10'],
      max: [100, 'Books per page cannot exceed 100']
    }
  },
  readingGoal: {
    yearly: {
      type: Number,
      default: 12,
      min: [1, 'Reading goal must be at least 1 book']
    },
    current: {
      type: Number,
      default: 0,
      min: [0, 'Current reading count cannot be negative']
    },
    monthly: {
      type: Map,
      of: Number,
      default: new Map()
    },
    streakTarget: {
      type: Number,
      default: 7,
      min: [1, 'Streak target must be at least 1 day']
    }
  },
  isActive: {
    type: Boolean,
    default: true
  },
  lastLogin: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for performance
userSchema.index({ email: 1 });
userSchema.index({ googleId: 1 });
userSchema.index({ createdAt: -1 });

// Virtual for reading goal progress
userSchema.virtual('readingGoalProgress').get(function () {
  if (!this.readingGoal.yearly || this.readingGoal.yearly === 0) return 0;
  return Math.round((this.readingGoal.current / this.readingGoal.yearly) * 100);
});

// Pre-save middleware to update lastLogin
userSchema.pre('save', function (next) {
  if (this.isNew || this.isModified('lastLogin')) {
    this.lastLogin = new Date();
  }
  next();
});

// Instance method to update reading goal progress
userSchema.methods.updateReadingProgress = function (increment = 1) {
  this.readingGoal.current += increment;
  return this.save();
};

// Static method to find active users
userSchema.statics.findActiveUsers = function () {
  return this.find({ isActive: true });
};

// Static method to get user statistics
userSchema.statics.getUserStats = async function () {
  const stats = await this.aggregate([
    {
      $group: {
        _id: null,
        totalUsers: { $sum: 1 },
        activeUsers: { $sum: { $cond: ['$isActive', 1, 0] } },
        averageReadingGoal: { $avg: '$readingGoal.yearly' },
        totalBooksRead: { $sum: '$readingGoal.current' }
      }
    }
  ]);

  return stats[0] || {
    totalUsers: 0,
    activeUsers: 0,
    averageReadingGoal: 0,
    totalBooksRead: 0
  };
};

const User = mongoose.model('User', userSchema);

export default User;
