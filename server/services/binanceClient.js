const crypto = require('crypto');
const axios = require('axios');

class BinanceClient {
  constructor(apiKey, apiSecret, isTestnet = false) {
    this.apiKey = apiKey;
    this.apiSecret = apiSecret;
    this.baseUrl = isTestnet 
      ? 'https://testnet.binancefuture.com'
      : 'https://fapi.binance.com';
    this.recvWindow = 5000;
  }

  // 署名生成 (HMAC SHA256)
  generateSignature(queryString) {
    return crypto.createHmac('sha256', this.apiSecret).update(queryString).digest('hex');
  }

  // APIリクエスト
  async request(method, endpoint, params = {}, signed = true) {
    const timestamp = Date.now();
    
    if (signed) {
      params.timestamp = timestamp;
      params.recvWindow = this.recvWindow;
    }

    const queryString = Object.keys(params)
      .map(key => `${key}=${encodeURIComponent(params[key])}`)
      .join('&');

    let url = `${this.baseUrl}${endpoint}`;
    let signature = '';

    if (signed) {
      signature = this.generateSignature(queryString);
    }

    const headers = {
      'X-MBX-APIKEY': this.apiKey,
      'Content-Type': 'application/x-www-form-urlencoded'
    };

    try {
      let response;
      if (method === 'GET') {
        const fullQueryString = signed ? `${queryString}&signature=${signature}` : queryString;
        url = fullQueryString ? `${url}?${fullQueryString}` : url;
        response = await axios.get(url, { headers });
      } else if (method === 'POST') {
        const body = signed ? `${queryString}&signature=${signature}` : queryString;
        response = await axios.post(url, body, { headers });
      } else if (method === 'DELETE') {
        const fullQueryString = signed ? `${queryString}&signature=${signature}` : queryString;
        url = fullQueryString ? `${url}?${fullQueryString}` : url;
        response = await axios.delete(url, { headers });
      }
      return { retCode: 0, result: response.data };
    } catch (error) {
      console.error('Binance API Error:', error.response?.data || error.message);
      return { 
        retCode: error.response?.data?.code || -1, 
        retMsg: error.response?.data?.msg || error.message,
        result: null 
      };
    }
  }

  // ========== 口座情報 ==========
  
  // 口座残高取得
  async getWalletBalance(coin = '') {
    const result = await this.request('GET', '/fapi/v3/balance');
    if (result.retCode === 0 && result.result) {
      // Bybit形式に変換
      const balances = result.result;
      const list = balances.map(b => ({
        coin: b.asset,
        walletBalance: b.balance,
        availableToWithdraw: b.availableBalance,
        crossWalletBalance: b.crossWalletBalance,
        unrealisedPnl: b.crossUnPnl
      }));
      
      if (coin) {
        return { retCode: 0, result: { list: list.filter(b => b.coin === coin) } };
      }
      return { retCode: 0, result: { list } };
    }
    return result;
  }

  // 口座情報取得
  async getAccountInfo() {
    return await this.request('GET', '/fapi/v3/account');
  }

  // ========== ポジション ==========
  
  // ポジション取得
  async getPositions(symbol = '') {
    const params = symbol ? { symbol } : {};
    const result = await this.request('GET', '/fapi/v3/positionRisk', params);
    
    if (result.retCode === 0 && result.result) {
      // Bybit形式に変換
      const positions = result.result;
      const list = positions.map(p => ({
        symbol: p.symbol,
        side: parseFloat(p.positionAmt) >= 0 ? 'Buy' : 'Sell',
        size: Math.abs(parseFloat(p.positionAmt)).toString(),
        positionValue: p.notional,
        entryPrice: p.entryPrice,
        markPrice: p.markPrice,
        liqPrice: p.liquidationPrice,
        leverage: p.leverage,
        unrealisedPnl: p.unRealizedProfit,
        marginType: p.marginType
      }));
      return { retCode: 0, result: { list: list.filter(p => parseFloat(p.size) > 0) } };
    }
    return result;
  }

  // ========== 注文 ==========
  
  // 成行注文
  async placeMarketOrder(symbol, side, qty) {
    const params = {
      symbol: symbol,
      side: side.toUpperCase(), // 'BUY' or 'SELL'
      type: 'MARKET',
      quantity: qty.toString()
    };
    const result = await this.request('POST', '/fapi/v1/order', params);
    
    if (result.retCode === 0 && result.result) {
      // Bybit形式に変換
      return {
        retCode: 0,
        result: {
          orderId: result.result.orderId,
          symbol: result.result.symbol,
          side: result.result.side,
          orderType: result.result.type,
          qty: result.result.origQty,
          price: result.result.price,
          orderStatus: this.convertOrderStatus(result.result.status),
          createdTime: result.result.updateTime
        }
      };
    }
    return result;
  }

  // 指値注文
  async placeLimitOrder(symbol, side, qty, price) {
    const params = {
      symbol: symbol,
      side: side.toUpperCase(),
      type: 'LIMIT',
      quantity: qty.toString(),
      price: price.toString(),
      timeInForce: 'GTC'
    };
    const result = await this.request('POST', '/fapi/v1/order', params);
    
    if (result.retCode === 0 && result.result) {
      return {
        retCode: 0,
        result: {
          orderId: result.result.orderId,
          symbol: result.result.symbol,
          side: result.result.side,
          orderType: result.result.type,
          qty: result.result.origQty,
          price: result.result.price,
          orderStatus: this.convertOrderStatus(result.result.status),
          createdTime: result.result.updateTime
        }
      };
    }
    return result;
  }

  // 注文キャンセル
  async cancelOrder(symbol, orderId) {
    const params = {
      symbol: symbol,
      orderId: orderId
    };
    return await this.request('DELETE', '/fapi/v1/order', params);
  }

  // 全注文キャンセル
  async cancelAllOrders(symbol) {
    const params = { symbol };
    return await this.request('DELETE', '/fapi/v1/allOpenOrders', params);
  }

  // アクティブ注文取得
  async getActiveOrders(symbol = '') {
    const params = symbol ? { symbol } : {};
    const result = await this.request('GET', '/fapi/v1/openOrders', params);
    
    if (result.retCode === 0 && result.result) {
      const orders = result.result;
      const list = orders.map(o => ({
        orderId: o.orderId,
        symbol: o.symbol,
        side: o.side,
        orderType: o.type,
        qty: o.origQty,
        price: o.price,
        orderStatus: this.convertOrderStatus(o.status),
        createdTime: o.time
      }));
      return { retCode: 0, result: { list } };
    }
    return result;
  }

  // 注文履歴取得
  async getOrderHistory(symbol = '', limit = 50) {
    const params = { limit };
    if (symbol) params.symbol = symbol;
    const result = await this.request('GET', '/fapi/v1/allOrders', params);
    
    if (result.retCode === 0 && result.result) {
      const orders = result.result;
      const list = orders.map(o => ({
        orderId: o.orderId,
        symbol: o.symbol,
        side: o.side,
        orderType: o.type,
        qty: o.origQty,
        price: o.price,
        avgPrice: o.avgPrice,
        orderStatus: this.convertOrderStatus(o.status),
        createdTime: o.time,
        updatedTime: o.updateTime
      }));
      return { retCode: 0, result: { list } };
    }
    return result;
  }

  // ========== ポジション決済 ==========
  
  // 全ポジション決済
  async closeAllPositions(symbol) {
    const positions = await this.getPositions(symbol);
    const results = [];
    
    if (positions.retCode === 0 && positions.result && positions.result.list) {
      for (const position of positions.result.list) {
        if (parseFloat(position.size) > 0) {
          const closeSide = position.side === 'Buy' ? 'Sell' : 'Buy';
          const result = await this.placeMarketOrder(
            position.symbol,
            closeSide,
            Math.abs(parseFloat(position.size))
          );
          results.push(result);
        }
      }
    }
    return results;
  }

  // 特定ポジション決済
  async closePosition(symbol, side, qty) {
    const closeSide = side === 'Buy' ? 'Sell' : 'Buy';
    return await this.placeMarketOrder(symbol, closeSide, qty);
  }

  // ========== マーケット情報 ==========
  
  // ファンディングレート取得
  async getFundingRate(symbol) {
    const params = { symbol, limit: 100 };
    const result = await this.request('GET', '/fapi/v1/fundingRate', params, false);
    
    if (result.retCode === 0 && result.result) {
      const rates = result.result;
      const list = rates.map(r => ({
        symbol: r.symbol,
        fundingRate: r.fundingRate,
        fundingRateTimestamp: r.fundingTime
      }));
      return { retCode: 0, result: { list } };
    }
    return result;
  }

  // 現在のファンディングレート情報
  async getCurrentFundingRate(symbol) {
    const params = { symbol };
    const result = await this.request('GET', '/fapi/v1/premiumIndex', params, false);
    
    if (result.retCode === 0 && result.result) {
      return {
        retCode: 0,
        result: {
          list: [{
            symbol: result.result.symbol,
            lastFundingRate: result.result.lastFundingRate,
            nextFundingTime: result.result.nextFundingTime,
            markPrice: result.result.markPrice,
            indexPrice: result.result.indexPrice
          }]
        }
      };
    }
    return result;
  }

  // ティッカー情報取得
  async getTicker(symbol) {
    const params = { symbol };
    const result = await this.request('GET', '/fapi/v1/ticker/24hr', params, false);
    
    if (result.retCode === 0 && result.result) {
      const t = result.result;
      return {
        retCode: 0,
        result: {
          list: [{
            symbol: t.symbol,
            lastPrice: t.lastPrice,
            highPrice24h: t.highPrice,
            lowPrice24h: t.lowPrice,
            volume24h: t.volume,
            turnover24h: t.quoteVolume,
            price24hPcnt: (parseFloat(t.priceChangePercent) / 100).toString()
          }]
        }
      };
    }
    return result;
  }

  // シンボル情報取得
  async getInstrumentsInfo(symbol = '') {
    const result = await this.request('GET', '/fapi/v1/exchangeInfo', {}, false);
    
    if (result.retCode === 0 && result.result) {
      let symbols = result.result.symbols;
      if (symbol) {
        symbols = symbols.filter(s => s.symbol === symbol);
      }
      const list = symbols.map(s => ({
        symbol: s.symbol,
        baseCoin: s.baseAsset,
        quoteCoin: s.quoteAsset,
        status: s.status,
        contractType: s.contractType,
        pricePrecision: s.pricePrecision,
        quantityPrecision: s.quantityPrecision
      }));
      return { retCode: 0, result: { list } };
    }
    return result;
  }

  // ========== 取引履歴 ==========
  
  // 約定履歴取得
  async getExecutionList(symbol = '', limit = 50) {
    const params = { limit };
    if (symbol) params.symbol = symbol;
    const result = await this.request('GET', '/fapi/v1/userTrades', params);
    
    if (result.retCode === 0 && result.result) {
      const trades = result.result;
      const list = trades.map(t => ({
        execId: t.id,
        symbol: t.symbol,
        side: t.side,
        execPrice: t.price,
        execQty: t.qty,
        execFee: t.commission,
        feeTokenId: t.commissionAsset,
        execTime: t.time
      }));
      return { retCode: 0, result: { list } };
    }
    return result;
  }

  // 損益履歴取得
  async getClosedPnL(symbol = '', limit = 50) {
    const params = { limit };
    if (symbol) params.symbol = symbol;
    const result = await this.request('GET', '/fapi/v1/income', params);
    
    if (result.retCode === 0 && result.result) {
      const income = result.result.filter(i => i.incomeType === 'REALIZED_PNL');
      const list = income.map(i => ({
        symbol: i.symbol,
        closedPnl: i.income,
        createdTime: i.time
      }));
      return { retCode: 0, result: { list } };
    }
    return result;
  }

  // ========== レバレッジ設定 ==========
  
  // レバレッジ設定
  async setLeverage(symbol, leverage = 1) {
    const params = {
      symbol: symbol,
      leverage: leverage
    };
    return await this.request('POST', '/fapi/v1/leverage', params);
  }

  // マージンタイプ設定
  async setMarginType(symbol, marginType = 'CROSSED') {
    const params = {
      symbol: symbol,
      marginType: marginType // 'ISOLATED' or 'CROSSED'
    };
    return await this.request('POST', '/fapi/v1/marginType', params);
  }

  // ========== ヘルパー ==========

  // 注文ステータス変換
  convertOrderStatus(binanceStatus) {
    const statusMap = {
      'NEW': 'New',
      'PARTIALLY_FILLED': 'PartiallyFilled',
      'FILLED': 'Filled',
      'CANCELED': 'Cancelled',
      'REJECTED': 'Rejected',
      'EXPIRED': 'Cancelled'
    };
    return statusMap[binanceStatus] || binanceStatus;
  }

  // ========== API検証 ==========
  
  // API接続テスト
  async testConnection() {
    try {
      const result = await this.getAccountInfo();
      return result.retCode === 0;
    } catch (error) {
      return false;
    }
  }

  // 取引所名を返す
  getExchangeName() {
    return 'binance';
  }
}

module.exports = BinanceClient;
