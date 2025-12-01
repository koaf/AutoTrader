const jwt = require('jsonwebtoken');
const { User } = require('../models');

// JWT認証ミドルウェア
const auth = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ message: '認証が必要です' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId);

    if (!user) {
      return res.status(401).json({ message: 'ユーザーが見つかりません' });
    }

    if (!user.isActive) {
      return res.status(403).json({ message: 'アカウントが無効化されています' });
    }

    req.user = user;
    req.token = token;
    next();
  } catch (error) {
    res.status(401).json({ message: '認証に失敗しました' });
  }
};

// 管理者権限チェック
const adminAuth = async (req, res, next) => {
  try {
    await auth(req, res, () => {
      if (req.user.role !== 'admin') {
        return res.status(403).json({ message: '管理者権限が必要です' });
      }
      next();
    });
  } catch (error) {
    res.status(403).json({ message: 'アクセスが拒否されました' });
  }
};

module.exports = { auth, adminAuth };
