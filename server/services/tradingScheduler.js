const cron = require('node-cron');
const { User, ApiKey, TradeHistory, AssetHistory, Position, SystemLog } = require('../models');
const BybitClient = require('./bybitClient');

class TradingScheduler {
  constructor() {
    this.isRunning = false;
    this.jobs = [];
  }

  // スケジューラー開始
  start() {
    if (this.isRunning) {
      console.log('Trading scheduler is already running');
      return;
    }

    // ファンディングレート時間: 9:00, 17:00, 25:00(1:00) JST
    // UTC: 0:00, 8:00, 16:00
    const fundingTimes = ['0 0 * * *', '0 8 * * *', '0 16 * * *'];

    fundingTimes.forEach((cronTime, index) => {
      const job = cron.schedule(cronTime, async () => {
        console.log(`Funding rate trade execution triggered at schedule ${index + 1}`);
        await this.executeAutoTrades();
      }, {
        timezone: 'UTC'
      });
      this.jobs.push(job);
    });

    // 資産スナップショット（1時間ごと）
    const assetJob = cron.schedule('0 * * * *', async () => {
      await this.recordAssetSnapshots();
    }, {
      timezone: 'UTC'
    });
    this.jobs.push(assetJob);

    this.isRunning = true;
    console.log('Trading scheduler started');
    this.logSystem('info', 'scheduler', 'Trading scheduler started');
  }

  // スケジューラー停止
  stop() {
    this.jobs.forEach(job => job.stop());
    this.jobs = [];
    this.isRunning = false;
    console.log('Trading scheduler stopped');
    this.logSystem('info', 'scheduler', 'Trading scheduler stopped');
  }

  // 自動取引実行
  async executeAutoTrades() {
    try {
      // アクティブで取引有効なユーザーを取得
      const users = await User.find({ isActive: true, tradingEnabled: true });

      for (const user of users) {
        try {
          await this.executeUserTrade(user);
        } catch (error) {
          console.error(`Trade execution failed for user ${user._id}:`, error);
          await this.logSystem('error', 'trade', `Trade execution failed for user ${user._id}: ${error.message}`, { userId: user._id });
        }
      }
    } catch (error) {
      console.error('Auto trade execution error:', error);
      await this.logSystem('error', 'scheduler', `Auto trade execution error: ${error.message}`);
    }
  }

  // ユーザー別取引実行
  async executeUserTrade(user) {
    const apiKeyDoc = await ApiKey.findOne({ userId: user._id, isValid: true });
    if (!apiKeyDoc) {
      console.log(`No valid API key for user ${user._id}`);
      return;
    }

    const client = new BybitClient(
      apiKeyDoc.decryptApiKey(),
      apiKeyDoc.decryptApiSecret(),
      apiKeyDoc.isTestnet
    );

    // 有効な通貨ごとに取引実行
    for (const currency of user.enabledCurrencies) {
      if (!currency.enabled) continue;

      try {
        await this.executeCurrencyTrade(client, user, currency.symbol);
      } catch (error) {
        console.error(`Trade failed for ${currency.symbol}:`, error);
        await this.logSystem('error', 'trade', `Trade failed for ${currency.symbol}: ${error.message}`, { userId: user._id, symbol: currency.symbol });
      }
    }
  }

  // 通貨別取引実行
  async executeCurrencyTrade(client, user, symbol) {
    // インバース無期限のシンボル（例: BTCUSD, ETHUSD）
    const inverseSymbol = `${symbol}USD`;

    // 現在のウォレット残高取得
    const walletResponse = await client.getWalletBalance(symbol);
    if (walletResponse.retCode !== 0) {
      throw new Error(`Failed to get wallet balance: ${walletResponse.retMsg}`);
    }

    const coinData = walletResponse.result?.list?.[0]?.coin?.find(c => c.coin === symbol);
    if (!coinData) {
      console.log(`No ${symbol} balance found for user ${user._id}`);
      return;
    }

    const availableBalance = parseFloat(coinData.availableToWithdraw || coinData.walletBalance);
    if (availableBalance <= 0) {
      console.log(`Insufficient ${symbol} balance for user ${user._id}`);
      return;
    }

    // レバレッジを1倍に設定
    await client.setLeverage(inverseSymbol, 1);

    // ティッカー情報取得（価格取得用）
    const tickerResponse = await client.getTicker(inverseSymbol);
    if (tickerResponse.retCode !== 0) {
      throw new Error(`Failed to get ticker: ${tickerResponse.retMsg}`);
    }

    const ticker = tickerResponse.result?.list?.[0];
    if (!ticker) {
      throw new Error(`Ticker not found for ${inverseSymbol}`);
    }

    const currentPrice = parseFloat(ticker.lastPrice);

    // インバース契約の数量計算（USD単位）
    // 1倍レバレッジなので、担保額 × 価格 = ポジションサイズ（USD）
    const positionSizeUSD = Math.floor(availableBalance * currentPrice);

    if (positionSizeUSD < 1) {
      console.log(`Position size too small for ${inverseSymbol}`);
      return;
    }

    // ファンディングレートに基づく方向決定
    const fundingRate = parseFloat(ticker.fundingRate || 0);
    // ファンディングレートがプラスならショート、マイナスならロング
    const side = fundingRate > 0 ? 'Sell' : 'Buy';

    // 現在のポジション確認
    const positionResponse = await client.getPositions(inverseSymbol);
    const currentPosition = positionResponse.result?.list?.find(p => p.symbol === inverseSymbol && parseFloat(p.size) > 0);

    // 既存ポジションがあり、同じ方向なら追加しない
    if (currentPosition && currentPosition.side === side) {
      console.log(`Already have ${side} position for ${inverseSymbol}`);
      return;
    }

    // 逆ポジションがある場合は決済してから新規
    if (currentPosition && currentPosition.side !== side) {
      await client.closePosition(inverseSymbol, currentPosition.side, parseFloat(currentPosition.size));
      await this.logSystem('info', 'trade', `Closed opposite position for ${inverseSymbol}`, { userId: user._id, symbol: inverseSymbol });
    }

    // 新規注文実行
    const orderResponse = await client.placeMarketOrder(inverseSymbol, side, positionSizeUSD);

    if (orderResponse.retCode === 0) {
      // 取引履歴保存
      await TradeHistory.create({
        userId: user._id,
        symbol: inverseSymbol,
        side: side,
        orderType: 'Market',
        quantity: positionSizeUSD,
        price: currentPrice,
        orderId: orderResponse.result.orderId,
        status: 'Filled',
        fundingRate: fundingRate,
        isAutoTrade: true,
        tradeType: 'Open'
      });

      await this.logSystem('info', 'trade', `Auto trade executed: ${side} ${positionSizeUSD} ${inverseSymbol}`, {
        userId: user._id,
        symbol: inverseSymbol,
        side,
        quantity: positionSizeUSD,
        price: currentPrice
      });
    } else {
      throw new Error(`Order failed: ${orderResponse.retMsg}`);
    }
  }

  // 資産スナップショット記録
  async recordAssetSnapshots() {
    try {
      const users = await User.find({ isActive: true });

      for (const user of users) {
        try {
          const apiKeyDoc = await ApiKey.findOne({ userId: user._id, isValid: true });
          if (!apiKeyDoc) continue;

          const client = new BybitClient(
            apiKeyDoc.decryptApiKey(),
            apiKeyDoc.decryptApiSecret(),
            apiKeyDoc.isTestnet
          );

          const walletResponse = await client.getWalletBalance();
          if (walletResponse.retCode === 0 && walletResponse.result?.list?.[0]?.coin) {
            for (const coinData of walletResponse.result.list[0].coin) {
              await AssetHistory.create({
                userId: user._id,
                currency: coinData.coin,
                walletBalance: parseFloat(coinData.walletBalance || 0),
                availableBalance: parseFloat(coinData.availableToWithdraw || 0),
                usedMargin: parseFloat(coinData.totalPositionIM || 0),
                unrealizedPnl: parseFloat(coinData.unrealisedPnl || 0),
                totalEquity: parseFloat(coinData.equity || coinData.walletBalance || 0)
              });
            }
          }
        } catch (error) {
          console.error(`Asset snapshot failed for user ${user._id}:`, error);
        }
      }
    } catch (error) {
      console.error('Asset snapshot error:', error);
    }
  }

  // システムログ記録
  async logSystem(type, category, message, details = {}) {
    try {
      await SystemLog.create({
        type,
        category,
        message,
        details,
        userId: details.userId || null
      });
    } catch (error) {
      console.error('Failed to save system log:', error);
    }
  }
}

// シングルトンインスタンス
const tradingScheduler = new TradingScheduler();

module.exports = tradingScheduler;
