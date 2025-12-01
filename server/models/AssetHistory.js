const mongoose = require('mongoose');

const assetHistorySchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  currency: {
    type: String,
    required: true
  },
  walletBalance: {
    type: Number,
    required: true
  },
  availableBalance: {
    type: Number,
    required: true
  },
  usedMargin: {
    type: Number,
    default: 0
  },
  unrealizedPnl: {
    type: Number,
    default: 0
  },
  totalEquity: {
    type: Number,
    required: true
  },
  usdValue: {
    type: Number
  },
  exchangeRate: {
    type: Number
  },
  recordedAt: {
    type: Date,
    default: Date.now
  }
}, { timestamps: true });

// インデックス
assetHistorySchema.index({ userId: 1, recordedAt: -1 });
assetHistorySchema.index({ userId: 1, currency: 1, recordedAt: -1 });

module.exports = mongoose.model('AssetHistory', assetHistorySchema);
