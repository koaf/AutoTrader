const mongoose = require('mongoose');

const positionSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  symbol: {
    type: String,
    required: true
  },
  side: {
    type: String,
    enum: ['Buy', 'Sell'],
    required: true
  },
  size: {
    type: Number,
    required: true
  },
  entryPrice: {
    type: Number,
    required: true
  },
  markPrice: {
    type: Number
  },
  leverage: {
    type: Number,
    default: 1
  },
  unrealizedPnl: {
    type: Number,
    default: 0
  },
  marginType: {
    type: String,
    enum: ['Cross', 'Isolated'],
    default: 'Cross'
  },
  positionValue: {
    type: Number
  },
  liquidationPrice: {
    type: Number
  },
  isActive: {
    type: Boolean,
    default: true
  },
  openedAt: {
    type: Date,
    default: Date.now
  },
  closedAt: {
    type: Date
  }
}, { timestamps: true });

// インデックス
positionSchema.index({ userId: 1, isActive: 1 });
positionSchema.index({ userId: 1, symbol: 1 });

module.exports = mongoose.model('Position', positionSchema);
