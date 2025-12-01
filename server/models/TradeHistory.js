const mongoose = require('mongoose');

const tradeHistorySchema = new mongoose.Schema({
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
  orderType: {
    type: String,
    enum: ['Market', 'Limit'],
    default: 'Market'
  },
  quantity: {
    type: Number,
    required: true
  },
  price: {
    type: Number,
    required: true
  },
  fee: {
    type: Number,
    default: 0
  },
  feeCurrency: {
    type: String
  },
  orderId: {
    type: String,
    required: true
  },
  status: {
    type: String,
    enum: ['Pending', 'Filled', 'PartiallyFilled', 'Cancelled', 'Rejected'],
    default: 'Pending'
  },
  realizedPnl: {
    type: Number,
    default: 0
  },
  fundingRate: {
    type: Number
  },
  isAutoTrade: {
    type: Boolean,
    default: true
  },
  tradeType: {
    type: String,
    enum: ['Open', 'Close', 'FundingFee'],
    default: 'Open'
  },
  executedAt: {
    type: Date,
    default: Date.now
  }
}, { timestamps: true });

// インデックス
tradeHistorySchema.index({ userId: 1, executedAt: -1 });
tradeHistorySchema.index({ userId: 1, symbol: 1 });

module.exports = mongoose.model('TradeHistory', tradeHistorySchema);
