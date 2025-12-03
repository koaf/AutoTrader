const express = require('express');
const { ApiKey, TradeHistory, Position, AssetHistory, SystemLog } = require('../models');
const { auth } = require('../middleware/auth');
const ExchangeFactory = require('../services/exchangeFactory');

const router = express.Router();

// 取引可能通貨一覧（取引所ごと）
const AVAILABLE_CURRENCIES = {
  bybit: [
    { symbol: 'BTC', name: 'Bitcoin', tradingSymbol: 'BTCUSD' },
    { symbol: 'ETH', name: 'Ethereum', tradingSymbol: 'ETHUSD' },
    { symbol: 'EOS', name: 'EOS', tradingSymbol: 'EOSUSD' },
    { symbol: 'XRP', name: 'Ripple', tradingSymbol: 'XRPUSD' }
  ],
  binance: [
    { symbol: 'BTC', name: 'Bitcoin', tradingSymbol: 'BTCUSDT' },
    { symbol: 'ETH', name: 'Ethereum', tradingSymbol: 'ETHUSDT' },
    { symbol: 'BNB', name: 'BNB', tradingSymbol: 'BNBUSDT' },
    { symbol: 'XRP', name: 'Ripple', tradingSymbol: 'XRPUSDT' },
    { symbol: 'SOL', name: 'Solana', tradingSymbol: 'SOLUSDT' }
  ]
};

// 取引所クライアント取得ヘルパー（単一または複数）
async function getExchangeClient(userId, exchange = null) {
  const query = { userId, isValid: true };
  if (exchange) {
    query.exchange = exchange;
  }
  
  const apiKeyDoc = await ApiKey.findOne(query);
  if (!apiKeyDoc) {
    throw new Error(exchange ? `${exchange}のAPIキーが登録されていません` : 'APIキーが登録されていません');
  }
  
  return {
    client: ExchangeFactory.createClientFromApiKey(apiKeyDoc),
    exchange: apiKeyDoc.exchange,
    isTestnet: apiKeyDoc.isTestnet
  };
}

// 全登録済み取引所のクライアント取得
async function getAllExchangeClients(userId) {
  const apiKeyDocs = await ApiKey.find({ userId, isValid: true });
  if (apiKeyDocs.length === 0) {
    throw new Error('APIキーが登録されていません');
  }
  
  return apiKeyDocs.map(doc => ({
    client: ExchangeFactory.createClientFromApiKey(doc),
    exchange: doc.exchange,
    isTestnet: doc.isTestnet
  }));
}

// 利用可能通貨一覧取得
router.get('/currencies', auth, async (req, res) => {
  try {
    const { exchange } = req.query;
    
    if (exchange) {
      const currencies = AVAILABLE_CURRENCIES[exchange] || [];
      return res.json({ exchange, currencies });
    }
    
    // 全取引所の通貨を返す
    res.json({ currencies: AVAILABLE_CURRENCIES });
  } catch (error) {
    console.error('Get currencies error:', error);
    res.status(500).json({ message: 'サーバーエラーが発生しました' });
  }
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
    const { enabled, exchange } = req.body;

    // APIキー確認
    const query = { userId: req.user._id, isValid: true };
    if (exchange) query.exchange = exchange;
    
    const apiKeyDoc = await ApiKey.findOne(query);
    if (!apiKeyDoc && enabled) {
      return res.status(400).json({ message: '取引を有効にするにはAPIキーを登録してください' });
    }

    req.user.tradingEnabled = enabled;
    await req.user.save();

    await SystemLog.create({
      userId: req.user._id,
      type: 'info',
      category: 'trade',
      message: `Trading ${enabled ? 'enabled' : 'disabled'}${exchange ? ` for ${exchange}` : ''}`
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
    const { exchange } = req.query;
    
    // 特定取引所または全取引所
    if (exchange) {
      const { client, exchange: ex, isTestnet } = await getExchangeClient(req.user._id, exchange);
      const response = await client.getWalletBalance();

      if (response.retCode !== 0) {
        return res.status(400).json({ message: response.retMsg });
      }

      const coins = response.result?.list?.[0]?.coin || [];
      const walletData = coins.map(coin => ({
        currency: coin.coin,
        walletBalance: parseFloat(coin.walletBalance || 0),
        availableBalance: parseFloat(coin.availableToWithdraw || coin.availableBalance || 0),
        usedMargin: parseFloat(coin.totalPositionIM || coin.usedMargin || 0),
        unrealizedPnl: parseFloat(coin.unrealisedPnl || coin.unrealizedPnl || 0),
        totalEquity: parseFloat(coin.equity || coin.walletBalance || 0)
      }));

      return res.json({ 
        exchange: ex, 
        isTestnet,
        wallet: walletData 
      });
    }

    // 全取引所の残高を取得
    const clients = await getAllExchangeClients(req.user._id);
    const results = [];

    for (const { client, exchange: ex, isTestnet } of clients) {
      try {
        const response = await client.getWalletBalance();
        if (response.retCode === 0) {
          const coins = response.result?.list?.[0]?.coin || [];
          results.push({
            exchange: ex,
            isTestnet,
            wallet: coins.map(coin => ({
              currency: coin.coin,
              walletBalance: parseFloat(coin.walletBalance || 0),
              availableBalance: parseFloat(coin.availableToWithdraw || coin.availableBalance || 0),
              usedMargin: parseFloat(coin.totalPositionIM || coin.usedMargin || 0),
              unrealizedPnl: parseFloat(coin.unrealisedPnl || coin.unrealizedPnl || 0),
              totalEquity: parseFloat(coin.equity || coin.walletBalance || 0)
            }))
          });
        }
      } catch (err) {
        results.push({
          exchange: ex,
          isTestnet,
          error: err.message
        });
      }
    }

    res.json({ wallets: results });
  } catch (error) {
    console.error('Get wallet error:', error);
    res.status(500).json({ message: error.message || 'サーバーエラーが発生しました' });
  }
});

// 現在のポジション取得
router.get('/positions', auth, async (req, res) => {
  try {
    const { exchange } = req.query;
    
    // 特定取引所のポジション
    if (exchange) {
      const { client, exchange: ex, isTestnet } = await getExchangeClient(req.user._id, exchange);
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
          entryPrice: parseFloat(p.avgPrice || p.entryPrice),
          markPrice: parseFloat(p.markPrice),
          leverage: parseFloat(p.leverage),
          unrealizedPnl: parseFloat(p.unrealisedPnl || p.unrealizedPnl),
          liquidationPrice: parseFloat(p.liqPrice || p.liquidationPrice),
          positionValue: parseFloat(p.positionValue || p.notional)
        }));

      return res.json({ 
        exchange: ex,
        isTestnet,
        positions 
      });
    }

    // 全取引所のポジション
    const clients = await getAllExchangeClients(req.user._id);
    const results = [];

    for (const { client, exchange: ex, isTestnet } of clients) {
      try {
        const response = await client.getPositions();
        if (response.retCode === 0) {
          const positions = (response.result?.list || [])
            .filter(p => parseFloat(p.size) > 0)
            .map(p => ({
              symbol: p.symbol,
              side: p.side,
              size: parseFloat(p.size),
              entryPrice: parseFloat(p.avgPrice || p.entryPrice),
              markPrice: parseFloat(p.markPrice),
              leverage: parseFloat(p.leverage),
              unrealizedPnl: parseFloat(p.unrealisedPnl || p.unrealizedPnl),
              liquidationPrice: parseFloat(p.liqPrice || p.liquidationPrice),
              positionValue: parseFloat(p.positionValue || p.notional)
            }));
          results.push({ exchange: ex, isTestnet, positions });
        }
      } catch (err) {
        results.push({ exchange: ex, isTestnet, error: err.message });
      }
    }

    res.json({ positions: results });
  } catch (error) {
    console.error('Get positions error:', error);
    res.status(500).json({ message: error.message || 'サーバーエラーが発生しました' });
  }
});

// 全ポジション決済
router.post('/close-all', auth, async (req, res) => {
  try {
    const { symbol, exchange } = req.body;
    
    if (!exchange) {
      return res.status(400).json({ message: '取引所を指定してください' });
    }
    
    const { client, exchange: ex } = await getExchangeClient(req.user._id, exchange);
    const results = await client.closeAllPositions(symbol);

    // 決済履歴記録
    for (const result of results) {
      if (result.retCode === 0) {
        await TradeHistory.create({
          userId: req.user._id,
          exchange: ex,
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
      message: `All positions closed on ${ex}${symbol ? ` for ${symbol}` : ''}`
    });

    res.json({
      message: 'ポジションを決済しました',
      exchange: ex,
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
    const { exchange } = req.query;
    
    if (!exchange) {
      return res.status(400).json({ message: '取引所を指定してください' });
    }
    
    const { client, exchange: ex } = await getExchangeClient(req.user._id, exchange);
    const response = await client.getFundingRate(symbol);

    if (response.retCode !== 0) {
      return res.status(400).json({ message: response.retMsg });
    }

    const ticker = response.result?.list?.[0];
    res.json({
      exchange: ex,
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
