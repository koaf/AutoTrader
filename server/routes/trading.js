const express = require('express');
const { ApiKey, TradeHistory, Position, AssetHistory, SystemLog } = require('../models');
const { auth } = require('../middleware/auth');
const BybitClient = require('../services/bybitClient');

const router = express.Router();

// 取引可能通貨一覧（インバース無期限）
const AVAILABLE_CURRENCIES = [
  { symbol: 'BTC', name: 'Bitcoin', inverseSymbol: 'BTCUSD' },
  { symbol: 'ETH', name: 'Ethereum', inverseSymbol: 'ETHUSD' },
  { symbol: 'EOS', name: 'EOS', inverseSymbol: 'EOSUSD' },
  { symbol: 'XRP', name: 'Ripple', inverseSymbol: 'XRPUSD' }
];

// Bybitクライアント取得ヘルパー
async function getBybitClient(userId) {
  const apiKeyDoc = await ApiKey.findOne({ userId, isValid: true });
  if (!apiKeyDoc) {
    throw new Error('APIキーが登録されていません');
  }
  return new BybitClient(
    apiKeyDoc.decryptApiKey(),
    apiKeyDoc.decryptApiSecret(),
    apiKeyDoc.isTestnet
  );
}

// 利用可能通貨一覧取得
router.get('/currencies', auth, (req, res) => {
  res.json({ currencies: AVAILABLE_CURRENCIES });
});

// ユーザーの有効通貨設定
router.post('/currencies', auth, async (req, res) => {
  try {
    const { currencies } = req.body;

    if (!Array.isArray(currencies)) {
      return res.status(400).json({ message: '通貨リストが不正です' });
    }

    req.user.enabledCurrencies = currencies.map(c => ({
      symbol: c.symbol,
      enabled: c.enabled
    }));
    await req.user.save();

    res.json({
      message: '通貨設定を更新しました',
      enabledCurrencies: req.user.enabledCurrencies
    });
  } catch (error) {
    console.error('Update currencies error:', error);
    res.status(500).json({ message: 'サーバーエラーが発生しました' });
  }
});

// 取引ステータス切替
router.post('/toggle', auth, async (req, res) => {
  try {
    const { enabled } = req.body;

    // APIキー確認
    const apiKeyDoc = await ApiKey.findOne({ userId: req.user._id, isValid: true });
    if (!apiKeyDoc && enabled) {
      return res.status(400).json({ message: '取引を有効にするにはAPIキーを登録してください' });
    }

    req.user.tradingEnabled = enabled;
    await req.user.save();

    await SystemLog.create({
      userId: req.user._id,
      type: 'info',
      category: 'trade',
      message: `Trading ${enabled ? 'enabled' : 'disabled'}`
    });

    res.json({
      message: enabled ? '自動取引を有効にしました' : '自動取引を停止しました',
      tradingEnabled: req.user.tradingEnabled
    });
  } catch (error) {
    console.error('Toggle trading error:', error);
    res.status(500).json({ message: 'サーバーエラーが発生しました' });
  }
});

// ウォレット残高取得
router.get('/wallet', auth, async (req, res) => {
  try {
    const client = await getBybitClient(req.user._id);
    const response = await client.getWalletBalance();

    if (response.retCode !== 0) {
      return res.status(400).json({ message: response.retMsg });
    }

    const coins = response.result?.list?.[0]?.coin || [];
    const walletData = coins.map(coin => ({
      currency: coin.coin,
      walletBalance: parseFloat(coin.walletBalance || 0),
      availableBalance: parseFloat(coin.availableToWithdraw || 0),
      usedMargin: parseFloat(coin.totalPositionIM || 0),
      unrealizedPnl: parseFloat(coin.unrealisedPnl || 0),
      totalEquity: parseFloat(coin.equity || coin.walletBalance || 0)
    }));

    res.json({ wallet: walletData });
  } catch (error) {
    console.error('Get wallet error:', error);
    res.status(500).json({ message: error.message || 'サーバーエラーが発生しました' });
  }
});

// 現在のポジション取得
router.get('/positions', auth, async (req, res) => {
  try {
    const client = await getBybitClient(req.user._id);
    const response = await client.getPositions();

    if (response.retCode !== 0) {
      return res.status(400).json({ message: response.retMsg });
    }

    const positions = (response.result?.list || [])
      .filter(p => parseFloat(p.size) > 0)
      .map(p => ({
        symbol: p.symbol,
        side: p.side,
        size: parseFloat(p.size),
        entryPrice: parseFloat(p.avgPrice),
        markPrice: parseFloat(p.markPrice),
        leverage: parseFloat(p.leverage),
        unrealizedPnl: parseFloat(p.unrealisedPnl),
        liquidationPrice: parseFloat(p.liqPrice),
        positionValue: parseFloat(p.positionValue)
      }));

    res.json({ positions });
  } catch (error) {
    console.error('Get positions error:', error);
    res.status(500).json({ message: error.message || 'サーバーエラーが発生しました' });
  }
});

// 全ポジション決済
router.post('/close-all', auth, async (req, res) => {
  try {
    const { symbol } = req.body;
    const client = await getBybitClient(req.user._id);

    const results = await client.closeAllPositions(symbol);

    // 決済履歴記録
    for (const result of results) {
      if (result.retCode === 0) {
        await TradeHistory.create({
          userId: req.user._id,
          symbol: symbol || 'ALL',
          side: 'Close',
          orderType: 'Market',
          quantity: 0,
          price: 0,
          orderId: result.result?.orderId || 'manual_close',
          status: 'Filled',
          isAutoTrade: false,
          tradeType: 'Close'
        });
      }
    }

    await SystemLog.create({
      userId: req.user._id,
      type: 'info',
      category: 'trade',
      message: `All positions closed${symbol ? ` for ${symbol}` : ''}`
    });

    res.json({
      message: 'ポジションを決済しました',
      results
    });
  } catch (error) {
    console.error('Close all positions error:', error);
    res.status(500).json({ message: error.message || 'サーバーエラーが発生しました' });
  }
});

// 取引履歴取得
router.get('/history', auth, async (req, res) => {
  try {
    const { page = 1, limit = 20, symbol } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const query = { userId: req.user._id };
    if (symbol) query.symbol = symbol;

    const [trades, total] = await Promise.all([
      TradeHistory.find(query)
        .sort({ executedAt: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      TradeHistory.countDocuments(query)
    ]);

    res.json({
      trades,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Get trade history error:', error);
    res.status(500).json({ message: 'サーバーエラーが発生しました' });
  }
});

// 資産履歴取得
router.get('/asset-history', auth, async (req, res) => {
  try {
    const { currency, days = 30 } = req.query;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(days));

    const query = {
      userId: req.user._id,
      recordedAt: { $gte: startDate }
    };
    if (currency) query.currency = currency;

    const history = await AssetHistory.find(query)
      .sort({ recordedAt: 1 });

    res.json({ history });
  } catch (error) {
    console.error('Get asset history error:', error);
    res.status(500).json({ message: 'サーバーエラーが発生しました' });
  }
});

// 損益計算（税務用）
router.get('/pnl-report', auth, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    const query = { userId: req.user._id };
    if (startDate || endDate) {
      query.executedAt = {};
      if (startDate) query.executedAt.$gte = new Date(startDate);
      if (endDate) query.executedAt.$lte = new Date(endDate);
    }

    const trades = await TradeHistory.find(query).sort({ executedAt: 1 });

    // 損益集計
    const summary = trades.reduce((acc, trade) => {
      acc.totalTrades++;
      acc.totalFees += trade.fee || 0;
      acc.totalPnl += trade.realizedPnl || 0;
      return acc;
    }, { totalTrades: 0, totalFees: 0, totalPnl: 0 });

    res.json({
      trades,
      summary,
      period: {
        startDate: startDate || 'All time',
        endDate: endDate || 'Now'
      }
    });
  } catch (error) {
    console.error('Get PnL report error:', error);
    res.status(500).json({ message: 'サーバーエラーが発生しました' });
  }
});

// CSV出力
router.get('/export-csv', auth, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    const query = { userId: req.user._id };
    if (startDate || endDate) {
      query.executedAt = {};
      if (startDate) query.executedAt.$gte = new Date(startDate);
      if (endDate) query.executedAt.$lte = new Date(endDate);
    }

    const trades = await TradeHistory.find(query).sort({ executedAt: 1 });

    // CSV生成
    const headers = ['日時', 'シンボル', '売買', '数量', '価格', '手数料', '実現損益', 'ファンディングレート'];
    const rows = trades.map(t => [
      t.executedAt.toISOString(),
      t.symbol,
      t.side,
      t.quantity,
      t.price,
      t.fee || 0,
      t.realizedPnl || 0,
      t.fundingRate || ''
    ]);

    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename=trade_history.csv');
    res.send('\uFEFF' + csv); // BOM付きUTF-8
  } catch (error) {
    console.error('Export CSV error:', error);
    res.status(500).json({ message: 'サーバーエラーが発生しました' });
  }
});

// ファンディングレート取得
router.get('/funding-rate/:symbol', auth, async (req, res) => {
  try {
    const { symbol } = req.params;
    const client = await getBybitClient(req.user._id);

    const response = await client.getCurrentFundingRate(symbol);

    if (response.retCode !== 0) {
      return res.status(400).json({ message: response.retMsg });
    }

    const ticker = response.result?.list?.[0];
    res.json({
      symbol: ticker?.symbol,
      fundingRate: parseFloat(ticker?.fundingRate || 0),
      nextFundingTime: ticker?.nextFundingTime
    });
  } catch (error) {
    console.error('Get funding rate error:', error);
    res.status(500).json({ message: error.message || 'サーバーエラーが発生しました' });
  }
});

module.exports = router;
