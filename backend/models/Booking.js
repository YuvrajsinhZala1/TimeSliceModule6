const mongoose = require('mongoose');

const BookingSchema = new mongoose.Schema({
  taskId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Task',
    required: true
  },
  applicationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Application',
    required: true
  },
  helper: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  taskProvider: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  agreedCredits: {
    type: Number,
    required: true
  },
  status: {
    type: String,
    enum: ['confirmed', 'in-progress', 'work-submitted', 'completed', 'cancelled'],
    default: 'confirmed'
  },
  helperReview: {
    review: { type: String, default: '' },
    rating: { type: Number, min: 1, max: 5 }
  },
  taskProviderReview: {
    review: { type: String, default: '' },
    rating: { type: Number, min: 1, max: 5 }
  },
  startedAt: {
    type: Date
  },
  completedAt: {
    type: Date
  },
  chatId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Chat'
  },
  workSubmissionNote: {
    type: String,
    default: ''
  },
  providerAcceptanceNote: {
    type: String,
    default: ''
  },
  // New deliverables field
  deliverables: {
    files: [{
      originalName: String,
      filename: String,
      path: String,
      mimetype: String,
      size: Number,
      uploadedAt: {
        type: Date,
        default: Date.now
      }
    }],
    githubLinks: [{
      url: String,
      description: String,
      addedAt: {
        type: Date,
        default: Date.now
      }
    }],
    additionalLinks: [{
      url: String,
      description: String,
      addedAt: {
        type: Date,
        default: Date.now
      }
    }]
  },
  // Track who has reviewed
  reviewedBy: [{
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    reviewType: {
      type: String,
      enum: ['helper', 'taskProvider']
    },
    reviewedAt: {
      type: Date,
      default: Date.now
    }
  }]
}, {
  timestamps: true
});

module.exports = mongoose.model('Booking', BookingSchema);