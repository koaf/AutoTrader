const mongoose = require('mongoose');
const CryptoJS = require('crypto-js');

const apiKeySchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
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

module.exports = mongoose.model('ApiKey', apiKeySchema);
