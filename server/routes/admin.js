const express = require('express');
const { User, ApiKey, TradeHistory, AssetHistory, SystemLog, SystemSettings } = require('../models');
const { adminAuth } = require('../middleware/auth');
const tradingScheduler = require('../services/tradingScheduler');
const BybitClient = require('../services/bybitClient');

const router = express.Router();

// ========== ユーザー管理 ==========

// 全ユーザー一覧
router.get('/users', adminAuth, async (req, res) => {
  try {
    const { page = 1, limit = 20, search } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const query = { role: 'user' };
    if (search) {
      query.$or = [
        { email: { $regex: search, $options: 'i' } },
        { username: { $regex: search, $options: 'i' } }
      ];
    }

    const [users, total] = await Promise.all([
      User.find(query)
        .select('-password')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      User.countDocuments(query)
    ]);

    // 各ユーザーのAPIキー状態を取得
    const usersWithApiStatus = await Promise.all(users.map(async (user) => {
      const apiKey = await ApiKey.findOne({ userId: user._id, isValid: true });
      return {
        ...user.toObject(),
        hasApiKey: !!apiKey
      };
    }));

    res.json({
      users: usersWithApiStatus,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ message: 'サーバーエラーが発生しました' });
  }
});

// ユーザー詳細
router.get('/users/:userId', adminAuth, async (req, res) => {
  try {
    const user = await User.findById(req.params.userId).select('-password');
    if (!user) {
      return res.status(404).json({ message: 'ユーザーが見つかりません' });
    }

    const apiKey = await ApiKey.findOne({ userId: user._id, isValid: true });
    const recentTrades = await TradeHistory.find({ userId: user._id })
      .sort({ executedAt: -1 })
      .limit(10);
    const latestAsset = await AssetHistory.find({ userId: user._id })
      .sort({ recordedAt: -1 })
      .limit(10);

    res.json({
      user: {
        ...user.toObject(),
        hasApiKey: !!apiKey
      },
      recentTrades,
      latestAsset
    });
  } catch (error) {
    console.error('Get user detail error:', error);
    res.status(500).json({ message: 'サーバーエラーが発生しました' });
  }
});

// ユーザーアクティブ状態切替
router.put('/users/:userId/active', adminAuth, async (req, res) => {
  try {
    const { isActive } = req.body;
    const user = await User.findById(req.params.userId);

    if (!user) {
      return res.status(404).json({ message: 'ユーザーが見つかりません' });
    }

    user.isActive = isActive;
    if (!isActive) {
      user.tradingEnabled = false;
    }
    await user.save();

    await SystemLog.create({
      userId: req.user._id,
      type: 'info',
      category: 'admin',
      message: `User ${user.email} ${isActive ? 'activated' : 'deactivated'}`
    });

    res.json({
      message: isActive ? 'ユーザーを有効化しました' : 'ユーザーを無効化しました',
      user: { ...user.toObject(), password: undefined }
    });
  } catch (error) {
    console.error('Update user active error:', error);
    res.status(500).json({ message: 'サーバーエラーが発生しました' });
  }
});

// ユーザー取引ステータス切替
router.put('/users/:userId/trading', adminAuth, async (req, res) => {
  try {
    const { tradingEnabled } = req.body;
    const user = await User.findById(req.params.userId);

    if (!user) {
      return res.status(404).json({ message: 'ユーザーが見つかりません' });
    }

    user.tradingEnabled = tradingEnabled;
    await user.save();

    await SystemLog.create({
      userId: req.user._id,
      type: 'info',
      category: 'admin',
      message: `Trading ${tradingEnabled ? 'enabled' : 'disabled'} for user ${user.email}`
    });

    res.json({
      message: tradingEnabled ? '取引を有効化しました' : '取引を停止しました',
      user: { ...user.toObject(), password: undefined }
    });
  } catch (error) {
    console.error('Update trading status error:', error);
    res.status(500).json({ message: 'サーバーエラーが発生しました' });
  }
});

// ユーザー通貨設定更新
router.put('/users/:userId/currencies', adminAuth, async (req, res) => {
  try {
    const { currencies } = req.body;
    const user = await User.findById(req.params.userId);

    if (!user) {
      return res.status(404).json({ message: 'ユーザーが見つかりません' });
    }

    user.enabledCurrencies = currencies.map(c => ({
      symbol: c.symbol,
      enabled: c.enabled
    }));
    await user.save();

    res.json({
      message: '通貨設定を更新しました',
      enabledCurrencies: user.enabledCurrencies
    });
  } catch (error) {
    console.error('Update currencies error:', error);
    res.status(500).json({ message: 'サーバーエラーが発生しました' });
  }
});

// ========== システム管理 ==========

// システムステータス取得
router.get('/system/status', adminAuth, async (req, res) => {
  try {
    const [totalUsers, activeUsers, tradingUsers] = await Promise.all([
      User.countDocuments({ role: 'user' }),
      User.countDocuments({ role: 'user', isActive: true }),
      User.countDocuments({ role: 'user', tradingEnabled: true })
    ]);

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const todayTrades = await TradeHistory.countDocuments({
      executedAt: { $gte: todayStart }
    });

    const recentErrors = await SystemLog.find({
      type: 'error',
      createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
    }).countDocuments();

    res.json({
      scheduler: {
        isRunning: tradingScheduler.isRunning
      },
      users: {
        total: totalUsers,
        active: activeUsers,
        trading: tradingUsers
      },
      trading: {
        todayTrades
      },
      errors: {
        last24Hours: recentErrors
      }
    });
  } catch (error) {
    console.error('Get system status error:', error);
    res.status(500).json({ message: 'サーバーエラーが発生しました' });
  }
});

// スケジューラー制御
router.post('/system/scheduler', adminAuth, async (req, res) => {
  try {
    const { action } = req.body;

    if (action === 'start') {
      tradingScheduler.start();
      res.json({ message: 'スケジューラーを開始しました', isRunning: true });
    } else if (action === 'stop') {
      tradingScheduler.stop();
      res.json({ message: 'スケジューラーを停止しました', isRunning: false });
    } else {
      res.status(400).json({ message: '無効なアクションです' });
    }

    await SystemLog.create({
      userId: req.user._id,
      type: 'info',
      category: 'admin',
      message: `Scheduler ${action}ed`
    });
  } catch (error) {
    console.error('Scheduler control error:', error);
    res.status(500).json({ message: 'サーバーエラーが発生しました' });
  }
});

// システムログ取得
router.get('/logs', adminAuth, async (req, res) => {
  try {
    const { page = 1, limit = 50, type, category, userId } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const query = {};
    if (type) query.type = type;
    if (category) query.category = category;
    if (userId) query.userId = userId;

    const [logs, total] = await Promise.all([
      SystemLog.find(query)
        .populate('userId', 'email username')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      SystemLog.countDocuments(query)
    ]);

    res.json({
      logs,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Get logs error:', error);
    res.status(500).json({ message: 'サーバーエラーが発生しました' });
  }
});

// システム設定取得
router.get('/settings', adminAuth, async (req, res) => {
  try {
    const settings = await SystemSettings.find();
    res.json({ settings });
  } catch (error) {
    console.error('Get settings error:', error);
    res.status(500).json({ message: 'サーバーエラーが発生しました' });
  }
});

// システム設定更新
router.put('/settings/:key', adminAuth, async (req, res) => {
  try {
    const { key } = req.params;
    const { value, description, category } = req.body;

    const setting = await SystemSettings.findOneAndUpdate(
      { key },
      { value, description, category, updatedBy: req.user._id },
      { new: true, upsert: true }
    );

    await SystemLog.create({
      userId: req.user._id,
      type: 'info',
      category: 'admin',
      message: `Setting ${key} updated`
    });

    res.json({ setting });
  } catch (error) {
    console.error('Update setting error:', error);
    res.status(500).json({ message: 'サーバーエラーが発生しました' });
  }
});

// ダッシュボード統計
router.get('/dashboard', adminAuth, async (req, res) => {
  try {
    const now = new Date();
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);
    
    const weekStart = new Date(now);
    weekStart.setDate(weekStart.getDate() - 7);

    // 基本統計
    const [totalUsers, newUsersToday, newUsersWeek] = await Promise.all([
      User.countDocuments({ role: 'user' }),
      User.countDocuments({ role: 'user', createdAt: { $gte: todayStart } }),
      User.countDocuments({ role: 'user', createdAt: { $gte: weekStart } })
    ]);

    // 取引統計
    const tradesToday = await TradeHistory.aggregate([
      { $match: { executedAt: { $gte: todayStart } } },
      { $group: { _id: null, count: { $sum: 1 }, volume: { $sum: '$quantity' } } }
    ]);

    // エラー統計
    const errorStats = await SystemLog.aggregate([
      { $match: { type: 'error', createdAt: { $gte: weekStart } } },
      { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, count: { $sum: 1 } } },
      { $sort: { _id: 1 } }
    ]);

    res.json({
      users: {
        total: totalUsers,
        newToday: newUsersToday,
        newThisWeek: newUsersWeek
      },
      trades: {
        today: tradesToday[0] || { count: 0, volume: 0 }
      },
      errors: {
        byDay: errorStats
      },
      scheduler: {
        isRunning: tradingScheduler.isRunning
      }
    });
  } catch (error) {
    console.error('Get dashboard error:', error);
    res.status(500).json({ message: 'サーバーエラーが発生しました' });
  }
});

module.exports = router;
