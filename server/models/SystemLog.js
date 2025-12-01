const mongoose = require('mongoose');

const systemLogSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  type: {
    type: String,
    enum: ['info', 'warning', 'error', 'trade', 'system'],
    default: 'info'
  },
  category: {
    type: String,
    enum: ['auth', 'trade', 'api', 'scheduler', 'system', 'admin'],
    default: 'system'
  },
  message: {
    type: String,
    required: true
  },
  details: {
    type: mongoose.Schema.Types.Mixed
  },
  ipAddress: {
    type: String
  },
  userAgent: {
    type: String
  },
  createdAt: {
    type: Date,
    default: Date.now,
    expires: 2592000 // 30日後に自動削除
  }
}, { timestamps: true });

// インデックス
systemLogSchema.index({ userId: 1, createdAt: -1 });
systemLogSchema.index({ type: 1, createdAt: -1 });
systemLogSchema.index({ category: 1, createdAt: -1 });

module.exports = mongoose.model('SystemLog', systemLogSchema);
