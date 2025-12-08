const path = require('path');
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const authRoutes = require('./routes/auth');
const apikeyRoutes = require('./routes/apikey');
const tradingRoutes = require('./routes/trading');
const adminRoutes = require('./routes/admin');
const tradingScheduler = require('./services/tradingScheduler');
const { User } = require('./models');

const app = express();

// ミドルウェア
app.use(cors());
app.use(express.json());

// ルーティング
app.use('/api/auth', authRoutes);
app.use('/api/apikey', apikeyRoutes);
app.use('/api/trading', tradingRoutes);
app.use('/api/admin', adminRoutes);

// ヘルスチェック
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// クライアント静的ファイルを提供（環境変数で制御）
if (process.env.SERVE_STATIC === 'true') {
  let buildPath;
  if (process.env.CLIENT_BUILD_PATH) {
    const providedPath = process.env.CLIENT_BUILD_PATH;
    buildPath = path.isAbsolute(providedPath)
      ? providedPath
      : path.resolve(__dirname, providedPath);
  } else {
    buildPath = path.resolve(__dirname, '..', 'client', 'build');
  }

  app.use(express.static(buildPath));
  app.get(/^\/(?!api).*/, (req, res) => {
    res.sendFile(path.join(buildPath, 'index.html'));
  });
}

// エラーハンドリング
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'サーバーエラーが発生しました' });
});

// デフォルト管理者作成
async function createDefaultAdmin() {
  try {
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@example.com';
    const adminExists = await User.findOne({ email: adminEmail });
    
    if (!adminExists) {
      await User.create({
        email: adminEmail,
        password: process.env.ADMIN_PASSWORD || 'admin123456',
        username: 'Administrator',
        role: 'admin',
        isActive: true
      });
      console.log('Default admin created:', adminEmail);
    }
  } catch (error) {
    console.error('Failed to create default admin:', error);
  }
}

// MongoDB接続とサーバー起動
const PORT = process.env.PORT || 5000;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/bybit_autotrader';

mongoose.connect(MONGODB_URI)
  .then(async () => {
    console.log('MongoDB connected');
    
    // デフォルト管理者作成
    await createDefaultAdmin();
    
    // サーバー起動
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
      
      // 取引スケジューラー開始
      tradingScheduler.start();
    });
  })
  .catch(err => {
    console.error('MongoDB connection error:', err);
    process.exit(1);
  });

// グレースフルシャットダウン
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down...');
  tradingScheduler.stop();
  mongoose.connection.close();
  process.exit(0);
});

module.exports = app;
