const express = require('express');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const { User, SystemLog } = require('../models');
const { auth } = require('../middleware/auth');
const licenseService = require('../services/licenseService');

const router = express.Router();

// ユーザー登録
router.post('/register', [
  body('email').isEmail().withMessage('有効なメールアドレスを入力してください'),
  body('password').isLength({ min: 6 }).withMessage('パスワードは6文字以上必要です'),
  body('username').trim().notEmpty().withMessage('ユーザー名は必須です')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password, username } = req.body;

    // 既存ユーザーチェック
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'このメールアドレスは既に登録されています' });
    }

    // ユーザー作成
    const user = new User({ email, password, username });
    await user.save();

    // スプレッドシートにユーザー登録を通知
    const licenseResult = await licenseService.registerUser(user);
    console.log('License registration result:', licenseResult);

    // JWTトークン生成
    const token = jwt.sign(
      { userId: user._id },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRE || '7d' }
    );

    // ログ記録
    await SystemLog.create({
      userId: user._id,
      type: 'info',
      category: 'auth',
      message: 'New user registered',
      ipAddress: req.ip
    });

    res.status(201).json({
      message: '登録が完了しました。管理者の承認をお待ちください。',
      token,
      user: {
        id: user._id,
        email: user.email,
        username: user.username,
        role: user.role,
        licenseStatus: user.licenseStatus
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ message: 'サーバーエラーが発生しました' });
  }
});

// ログイン
router.post('/login', [
  body('email').isEmail().withMessage('有効なメールアドレスを入力してください'),
  body('password').notEmpty().withMessage('パスワードは必須です')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password } = req.body;

    // ユーザー検索
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ message: 'メールアドレスまたはパスワードが正しくありません' });
    }

    // パスワード検証
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ message: 'メールアドレスまたはパスワードが正しくありません' });
    }

    // アクティブチェック
    if (!user.isActive) {
      return res.status(403).json({ message: 'アカウントが無効化されています' });
    }

    // ライセンス状態をスプレッドシートから確認・同期
    const licenseCheck = await licenseService.checkLicense(user.email);
    if (licenseCheck.success && !licenseCheck.skipped) {
      if (licenseCheck.licenseStatus) {
        if (user.licenseStatus !== 'active') {
          user.licenseStatus = 'active';
          user.licenseApprovedAt = licenseCheck.approvedAt ? new Date(licenseCheck.approvedAt) : new Date();
        }
      } else {
        if (user.licenseStatus === 'active') {
          user.licenseStatus = 'revoked';
        }
      }
    }

    // 最終ログイン更新
    user.lastLogin = new Date();
    await user.save();

    // JWTトークン生成
    const token = jwt.sign(
      { userId: user._id },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRE || '7d' }
    );

    // ログ記録
    await SystemLog.create({
      userId: user._id,
      type: 'info',
      category: 'auth',
      message: 'User logged in',
      ipAddress: req.ip
    });

    res.json({
      message: 'ログインしました',
      token,
      user: {
        id: user._id,
        email: user.email,
        username: user.username,
        role: user.role,
        licenseStatus: user.licenseStatus
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'サーバーエラーが発生しました' });
  }
});

// ライセンス状態確認
router.get('/license', auth, async (req, res) => {
  try {
    // スプレッドシートから最新の状態を取得
    const licenseCheck = await licenseService.checkLicense(req.user.email);
    
    let licenseStatus = req.user.licenseStatus;
    
    if (licenseCheck.success && !licenseCheck.skipped) {
      if (licenseCheck.licenseStatus && req.user.licenseStatus !== 'active') {
        req.user.licenseStatus = 'active';
        req.user.licenseApprovedAt = licenseCheck.approvedAt ? new Date(licenseCheck.approvedAt) : new Date();
        await req.user.save();
        licenseStatus = 'active';
      } else if (!licenseCheck.licenseStatus && req.user.licenseStatus === 'active') {
        req.user.licenseStatus = 'revoked';
        await req.user.save();
        licenseStatus = 'revoked';
      }
    }

    res.json({
      licenseStatus,
      licenseApprovedAt: req.user.licenseApprovedAt,
      isLicensed: licenseStatus === 'active'
    });
  } catch (error) {
    console.error('License check error:', error);
    res.status(500).json({ message: 'サーバーエラーが発生しました' });
  }
});

// 現在のユーザー情報取得
router.get('/me', auth, async (req, res) => {
  try {
    res.json({
      user: {
        id: req.user._id,
        email: req.user.email,
        username: req.user.username,
        role: req.user.role,
        tradingEnabled: req.user.tradingEnabled,
        enabledCurrencies: req.user.enabledCurrencies,
        licenseStatus: req.user.licenseStatus,
        licenseApprovedAt: req.user.licenseApprovedAt,
        createdAt: req.user.createdAt,
        lastLogin: req.user.lastLogin
      }
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ message: 'サーバーエラーが発生しました' });
  }
});

// パスワード変更
router.put('/password', auth, [
  body('currentPassword').notEmpty().withMessage('現在のパスワードは必須です'),
  body('newPassword').isLength({ min: 6 }).withMessage('新しいパスワードは6文字以上必要です')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { currentPassword, newPassword } = req.body;

    // 現在のパスワード確認
    const isMatch = await req.user.comparePassword(currentPassword);
    if (!isMatch) {
      return res.status(401).json({ message: '現在のパスワードが正しくありません' });
    }

    // パスワード更新
    req.user.password = newPassword;
    await req.user.save();

    // ログ記録
    await SystemLog.create({
      userId: req.user._id,
      type: 'info',
      category: 'auth',
      message: 'Password changed',
      ipAddress: req.ip
    });

    res.json({ message: 'パスワードを変更しました' });
  } catch (error) {
    console.error('Password change error:', error);
    res.status(500).json({ message: 'サーバーエラーが発生しました' });
  }
});

// プロフィール更新
router.put('/profile', auth, [
  body('username').optional().trim().notEmpty().withMessage('ユーザー名は空にできません')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { username } = req.body;

    if (username) {
      req.user.username = username;
    }
    await req.user.save();

    res.json({
      message: 'プロフィールを更新しました',
      user: {
        id: req.user._id,
        email: req.user.email,
        username: req.user.username,
        role: req.user.role
      }
    });
  } catch (error) {
    console.error('Profile update error:', error);
    res.status(500).json({ message: 'サーバーエラーが発生しました' });
  }
});

module.exports = router;
