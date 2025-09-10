const mongoose = require('mongoose');

const quizAttemptSchema = new mongoose.Schema({
  quiz: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Quiz'
  },
  quizPool: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'QuizPool'
  },
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  course: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course',
    required: true
  },
  unit: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Unit'
  },
  video: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Video'
  },
  questions: [{
    questionId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true
    },
    questionText: {
      type: String,
      required: true
    },
    options: [{
      type: String,
      required: true
    }],
    correctOption: {
      type: Number,
      required: true
    },
    points: {
      type: Number,
      default: 1
    },
    originalQuizId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Quiz'
    }
  }],
  answers: [{
    questionId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true
    },
    selectedOption: {
      type: Number,
      required: true
    },
    isCorrect: {
      type: Boolean,
      required: true
    },
    points: {
      type: Number,
      default: 0
    }
  }],
  score: {
    type: Number,
    required: true
  },
  maxScore: {
    type: Number,
    required: true
  },
  percentage: {
    type: Number,
    required: true
  },
  passed: {
    type: Boolean,
    required: true
  },
  timeSpent: {
    type: Number, // in seconds
    default: 0
  },
  startedAt: {
    type: Date,
    default: Date.now
  },
  completedAt: {
    type: Date
  }
});

// Index for faster lookup by student and course/quiz
quizAttemptSchema.index({ student: 1, course: 1 });
// Separate indexes for quiz and quizPool to avoid null value issues
quizAttemptSchema.index({ student: 1, quiz: 1 }, { unique: true, sparse: true, partialFilterExpression: { quiz: { $exists: true, $ne: null } } });
quizAttemptSchema.index({ student: 1, quizPool: 1, unit: 1 }, { unique: true, sparse: true, partialFilterExpression: { quizPool: { $exists: true, $ne: null } } });

const QuizAttempt = mongoose.model('QuizAttempt', quizAttemptSchema);

module.exports = QuizAttempt;
