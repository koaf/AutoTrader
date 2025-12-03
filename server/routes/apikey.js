const express = require('express');
const { body, validationResult } = require('express-validator');
const { ApiKey, SystemLog } = require('../models');
const { auth } = require('../middleware/auth');
const ExchangeFactory = require('../services/exchangeFactory');

const router = express.Router();

// サポートされている取引所一覧取得
router.get('/exchanges', auth, async (req, res) => {
  try {
    const onlyImplemented = req.query.implemented === 'true';
    const exchanges = ExchangeFactory.getSupportedExchanges(onlyImplemented);
    res.json({ exchanges });
  } catch (error) {
    console.error('Get exchanges error:', error);
    res.status(500).json({ message: 'サーバーエラーが発生しました' });
  }
});

// APIキー登録
router.post('/', auth, [
  body('exchange').isIn(ApiKey.SUPPORTED_EXCHANGES).withMessage('サポートされていない取引所です'),
  body('apiKey').notEmpty().withMessage('APIキーは必須です'),
  body('apiSecret').notEmpty().withMessage('APIシークレットは必須です')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { exchange, apiKey, apiSecret, isTestnet, passphrase, walletAddress } = req.body;

    // 取引所が実装済みか確認
    if (!ExchangeFactory.isImplemented(exchange)) {
      return res.status(400).json({ message: `${exchange}は現在準備中です` });
    }

    // 同じ取引所の既存のAPIキーを無効化
    await ApiKey.updateMany(
      { userId: req.user._id, exchange: exchange },
      { isValid: false }
    );

    // API接続テスト
    const credentials = { apiKey, apiSecret, isTestnet: isTestnet || false, passphrase, walletAddress };
    
    try {
      const client = ExchangeFactory.createClient(exchange, credentials);
      const isValid = await client.testConnection();

      if (!isValid) {
        return res.status(400).json({ message: 'APIキーの検証に失敗しました。キーを確認してください。' });
      }
    } catch (clientError) {
      return res.status(400).json({ message: `APIキーの検証に失敗しました: ${clientError.message}` });
    }

    // 新しいAPIキー保存
    const apiKeyDoc = new ApiKey({
      userId: req.user._id,
      exchange: exchange,
      apiKey,
      apiSecret,
      passphrase: passphrase || undefined,
      walletAddress: walletAddress || undefined,
      isTestnet: isTestnet || false,
      isValid: true,
      lastValidated: new Date()
    });
    await apiKeyDoc.save();

    // ログ記録
    await SystemLog.create({
      userId: req.user._id,
      type: 'info',
      category: 'api',
      message: `API key registered for ${exchange}`,
      ipAddress: req.ip
    });

    res.status(201).json({
      message: 'APIキーを登録しました',
      apiKey: {
        id: apiKeyDoc._id,
        exchange: apiKeyDoc.exchange,
        isTestnet: apiKeyDoc.isTestnet,
        isValid: apiKeyDoc.isValid,
        createdAt: apiKeyDoc.createdAt
      }
    });
  } catch (error) {
    console.error('API key registration error:', error);
    res.status(500).json({ message: 'サーバーエラーが発生しました' });
  }
});

// 全取引所のAPIキー情報取得
router.get('/', auth, async (req, res) => {
  try {
    const apiKeys = await ApiKey.find({ userId: req.user._id, isValid: true });

    const result = apiKeys.map(key => ({
      id: key._id,
      exchange: key.exchange,
      isTestnet: key.isTestnet,
      isValid: key.isValid,
      lastValidated: key.lastValidated,
      createdAt: key.createdAt
    }));

    res.json({
      hasApiKey: result.length > 0,
      apiKeys: result
    });
  } catch (error) {
    console.error('Get API key error:', error);
    res.status(500).json({ message: 'サーバーエラーが発生しました' });
  }
});

// 特定取引所のAPIキー情報取得
router.get('/:exchange', auth, async (req, res) => {
  try {
    const { exchange } = req.params;
    
    if (!ExchangeFactory.isSupported(exchange)) {
      return res.status(400).json({ message: 'サポートされていない取引所です' });
    }

    const apiKey = await ApiKey.findOne({ 
      userId: req.user._id, 
      exchange: exchange,
      isValid: true 
    });

    if (!apiKey) {
      return res.json({ hasApiKey: false, exchange });
    }

    res.json({
      hasApiKey: true,
      apiKey: {
        id: apiKey._id,
        exchange: apiKey.exchange,
        isTestnet: apiKey.isTestnet,
        isValid: apiKey.isValid,
        lastValidated: apiKey.lastValidated,
        createdAt: apiKey.createdAt
      }
    });
  } catch (error) {
    console.error('Get API key error:', error);
    res.status(500).json({ message: 'サーバーエラーが発生しました' });
  }
});

// 特定取引所のAPIキー削除
router.delete('/:exchange', auth, async (req, res) => {
  try {
    const { exchange } = req.params;

    await ApiKey.updateMany(
      { userId: req.user._id, exchange: exchange },
      { isValid: false }
    );

    // ログ記録
    await SystemLog.create({
      userId: req.user._id,
      type: 'info',
      category: 'api',
      message: `API key deleted for ${exchange}`,
      ipAddress: req.ip
    });

    res.json({ message: `${exchange}のAPIキーを削除しました` });
  } catch (error) {
    console.error('Delete API key error:', error);
    res.status(500).json({ message: 'サーバーエラーが発生しました' });
  }
});

// 全APIキー削除（後方互換性のため残す）
router.delete('/', auth, async (req, res) => {
  try {
    await ApiKey.updateMany(
      { userId: req.user._id },
      { isValid: false }
    );

    // 取引も停止
    req.user.tradingEnabled = false;
    await req.user.save();

    // ログ記録
    await SystemLog.create({
      userId: req.user._id,
      type: 'info',
      category: 'api',
      message: 'All API keys deleted',
      ipAddress: req.ip
    });

    res.json({ message: '全てのAPIキーを削除しました' });
  } catch (error) {
    console.error('Delete API key error:', error);
    res.status(500).json({ message: 'サーバーエラーが発生しました' });
  }
});

// APIキー検証
router.post('/validate', auth, async (req, res) => {
  try {
    const { exchange } = req.body;
    
    const query = { userId: req.user._id, isValid: true };
    if (exchange) {
      query.exchange = exchange;
    }
    
    const apiKeyDocs = await ApiKey.find(query);

    if (apiKeyDocs.length === 0) {
      return res.status(404).json({ message: 'APIキーが登録されていません' });
    }

    const results = [];
    
    for (const apiKeyDoc of apiKeyDocs) {
      try {
        const client = ExchangeFactory.createClientFromApiKey(apiKeyDoc);
        const isValid = await client.testConnection();

        apiKeyDoc.isValid = isValid;
        apiKeyDoc.lastValidated = new Date();
        await apiKeyDoc.save();

        results.push({
          exchange: apiKeyDoc.exchange,
          isValid,
          message: isValid ? 'APIキーは有効です' : 'APIキーが無効です'
        });
      } catch (error) {
        results.push({
          exchange: apiKeyDoc.exchange,
          isValid: false,
          message: `検証エラー: ${error.message}`
        });
      }
    }

    res.json({ results });
  } catch (error) {
    console.error('API key validation error:', error);
    res.status(500).json({ message: 'サーバーエラーが発生しました' });
  }
});

module.exports = router;
