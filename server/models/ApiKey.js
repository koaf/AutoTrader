const mongoose = require('mongoose');
const CryptoJS = require('crypto-js');

// サポートする取引所の定義
const SUPPORTED_EXCHANGES = ['bybit', 'binance', 'okx', 'gateio', 'aster', 'hyperliquid', 'edgex'];

const apiKeySchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  exchange: {
    type: String,
    enum: SUPPORTED_EXCHANGES,
    default: 'bybit',
    required: true
  },
  apiKey: {
    type: String,
    required: true
  },
  apiSecret: {
    type: String,
    required: true
  },
  // DEX用（Hyperliquid, EdgeX, Aster v3用）
  walletAddress: {
    type: String
  },
  passphrase: {
    type: String  // OKX用
  },
  isTestnet: {
    type: Boolean,
    default: false
  },
  isValid: {
    type: Boolean,
    default: true
  },
  lastValidated: {
    type: Date
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
}, { timestamps: true });

// APIキーを暗号化
apiKeySchema.pre('save', function(next) {
  if (this.isModified('apiKey')) {
    this.apiKey = CryptoJS.AES.encrypt(this.apiKey, process.env.ENCRYPTION_KEY).toString();
  }
  if (this.isModified('apiSecret')) {
    this.apiSecret = CryptoJS.AES.encrypt(this.apiSecret, process.env.ENCRYPTION_KEY).toString();
  }
  if (this.isModified('passphrase') && this.passphrase) {
    this.passphrase = CryptoJS.AES.encrypt(this.passphrase, process.env.ENCRYPTION_KEY).toString();
  }
  if (this.isModified('walletAddress') && this.walletAddress) {
    this.walletAddress = CryptoJS.AES.encrypt(this.walletAddress, process.env.ENCRYPTION_KEY).toString();
  }
  next();
});

// APIキーを復号化するメソッド
apiKeySchema.methods.decryptApiKey = function() {
  const bytes = CryptoJS.AES.decrypt(this.apiKey, process.env.ENCRYPTION_KEY);
  return bytes.toString(CryptoJS.enc.Utf8);
};

apiKeySchema.methods.decryptApiSecret = function() {
  const bytes = CryptoJS.AES.decrypt(this.apiSecret, process.env.ENCRYPTION_KEY);
  return bytes.toString(CryptoJS.enc.Utf8);
};

apiKeySchema.methods.decryptPassphrase = function() {
  if (!this.passphrase) return null;
  const bytes = CryptoJS.AES.decrypt(this.passphrase, process.env.ENCRYPTION_KEY);
  return bytes.toString(CryptoJS.enc.Utf8);
};

apiKeySchema.methods.decryptWalletAddress = function() {
  if (!this.walletAddress) return null;
  const bytes = CryptoJS.AES.decrypt(this.walletAddress, process.env.ENCRYPTION_KEY);
  return bytes.toString(CryptoJS.enc.Utf8);
};

// サポートする取引所リストをエクスポート
apiKeySchema.statics.SUPPORTED_EXCHANGES = SUPPORTED_EXCHANGES;

module.exports = mongoose.model('ApiKey', apiKeySchema);
