const express = require('express');
const { body, validationResult } = require('express-validator');
const { ApiKey, SystemLog } = require('../models');
const { auth } = require('../middleware/auth');
const BybitClient = require('../services/bybitClient');

const router = express.Router();

// APIキー登録
router.post('/', auth, [
  body('apiKey').notEmpty().withMessage('APIキーは必須です'),
  body('apiSecret').notEmpty().withMessage('APIシークレットは必須です')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { apiKey, apiSecret, isTestnet } = req.body;

    // 既存のAPIキーを無効化
    await ApiKey.updateMany(
      { userId: req.user._id },
      { isValid: false }
    );

    // API接続テスト
    const client = new BybitClient(apiKey, apiSecret, isTestnet || false);
    const isValid = await client.testConnection();

    if (!isValid) {
      return res.status(400).json({ message: 'APIキーの検証に失敗しました。キーを確認してください。' });
    }

    // 新しいAPIキー保存
    const apiKeyDoc = new ApiKey({
      userId: req.user._id,
      apiKey,
      apiSecret,
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
      message: 'API key registered',
      ipAddress: req.ip
    });

    res.status(201).json({
      message: 'APIキーを登録しました',
      apiKey: {
        id: apiKeyDoc._id,
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

// APIキー情報取得
router.get('/', auth, async (req, res) => {
  try {
    const apiKey = await ApiKey.findOne({ userId: req.user._id, isValid: true });

    if (!apiKey) {
      return res.json({ hasApiKey: false });
    }

    res.json({
      hasApiKey: true,
      apiKey: {
        id: apiKey._id,
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

// APIキー削除
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
      message: 'API key deleted',
      ipAddress: req.ip
    });

    res.json({ message: 'APIキーを削除しました' });
  } catch (error) {
    console.error('Delete API key error:', error);
    res.status(500).json({ message: 'サーバーエラーが発生しました' });
  }
});

// APIキー検証
router.post('/validate', auth, async (req, res) => {
  try {
    const apiKeyDoc = await ApiKey.findOne({ userId: req.user._id, isValid: true });

    if (!apiKeyDoc) {
      return res.status(404).json({ message: 'APIキーが登録されていません' });
    }

    const client = new BybitClient(
      apiKeyDoc.decryptApiKey(),
      apiKeyDoc.decryptApiSecret(),
      apiKeyDoc.isTestnet
    );

    const isValid = await client.testConnection();

    apiKeyDoc.isValid = isValid;
    apiKeyDoc.lastValidated = new Date();
    await apiKeyDoc.save();

    res.json({
      isValid,
      message: isValid ? 'APIキーは有効です' : 'APIキーが無効です。再登録してください。'
    });
  } catch (error) {
    console.error('API key validation error:', error);
    res.status(500).json({ message: 'サーバーエラーが発生しました' });
  }
});

module.exports = router;
