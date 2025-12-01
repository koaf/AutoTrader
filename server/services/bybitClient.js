const crypto = require('crypto');
const axios = require('axios');

class BybitClient {
  constructor(apiKey, apiSecret, isTestnet = false) {
    this.apiKey = apiKey;
    this.apiSecret = apiSecret;
    this.baseUrl = isTestnet 
      ? 'https://api-testnet.bybit.com'
      : 'https://api.bybit.com';
    this.recvWindow = 5000;
  }

  // 署名生成
  generateSignature(params, timestamp) {
    const sortedParams = Object.keys(params)
      .sort()
      .map(key => `${key}=${params[key]}`)
      .join('&');
    
    const signString = `${timestamp}${this.apiKey}${this.recvWindow}${sortedParams}`;
    return crypto.createHmac('sha256', this.apiSecret).update(signString).digest('hex');
  }

  // APIリクエスト
  async request(method, endpoint, params = {}) {
    const timestamp = Date.now().toString();
    const signature = this.generateSignature(params, timestamp);

    const headers = {
      'X-BAPI-API-KEY': this.apiKey,
      'X-BAPI-SIGN': signature,
      'X-BAPI-SIGN-TYPE': '2',
      'X-BAPI-TIMESTAMP': timestamp,
      'X-BAPI-RECV-WINDOW': this.recvWindow.toString(),
      'Content-Type': 'application/json'
    };

    try {
      let response;
      if (method === 'GET') {
        const queryString = new URLSearchParams(params).toString();
        const url = queryString ? `${this.baseUrl}${endpoint}?${queryString}` : `${this.baseUrl}${endpoint}`;
        response = await axios.get(url, { headers });
      } else {
        response = await axios.post(`${this.baseUrl}${endpoint}`, params, { headers });
      }
      return response.data;
    } catch (error) {
      console.error('Bybit API Error:', error.response?.data || error.message);
      throw error;
    }
  }

  // ========== 口座情報 ==========
  
  // ウォレット残高取得（インバース）
  async getWalletBalance(coin = '') {
    const params = { accountType: 'CONTRACT' };
    if (coin) params.coin = coin;
    return await this.request('GET', '/v5/account/wallet-balance', params);
  }

  // ========== ポジション ==========
  
  // ポジション取得（インバース無期限）
  async getPositions(symbol = '') {
    const params = { category: 'inverse', settleCoin: '' };
    if (symbol) params.symbol = symbol;
    return await this.request('GET', '/v5/position/list', params);
  }

  // ========== 注文 ==========
  
  // 成行注文
  async placeMarketOrder(symbol, side, qty) {
    const params = {
      category: 'inverse',
      symbol: symbol,
      side: side, // 'Buy' or 'Sell'
      orderType: 'Market',
      qty: qty.toString(),
      timeInForce: 'GTC'
    };
    return await this.request('POST', '/v5/order/create', params);
  }

  // 注文キャンセル
  async cancelOrder(symbol, orderId) {
    const params = {
      category: 'inverse',
      symbol: symbol,
      orderId: orderId
    };
    return await this.request('POST', '/v5/order/cancel', params);
  }

  // アクティブ注文取得
  async getActiveOrders(symbol = '') {
    const params = { category: 'inverse' };
    if (symbol) params.symbol = symbol;
    return await this.request('GET', '/v5/order/realtime', params);
  }

  // 注文履歴取得
  async getOrderHistory(symbol = '', limit = 50) {
    const params = { category: 'inverse', limit: limit };
    if (symbol) params.symbol = symbol;
    return await this.request('GET', '/v5/order/history', params);
  }

  // ========== ポジション決済 ==========
  
  // 全ポジション決済
  async closeAllPositions(symbol) {
    const positions = await this.getPositions(symbol);
    const results = [];
    
    if (positions.result && positions.result.list) {
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
    const params = { category: 'inverse', symbol: symbol };
    return await this.request('GET', '/v5/market/funding/history', params);
  }

  // 現在のファンディングレート情報
  async getCurrentFundingRate(symbol) {
    const params = { category: 'inverse', symbol: symbol };
    return await this.request('GET', '/v5/market/tickers', params);
  }

  // ティッカー情報取得
  async getTicker(symbol) {
    const params = { category: 'inverse', symbol: symbol };
    return await this.request('GET', '/v5/market/tickers', params);
  }

  // シンボル情報取得
  async getInstrumentsInfo(symbol = '') {
    const params = { category: 'inverse' };
    if (symbol) params.symbol = symbol;
    return await this.request('GET', '/v5/market/instruments-info', params);
  }

  // ========== 取引履歴 ==========
  
  // 約定履歴取得
  async getExecutionList(symbol = '', limit = 50) {
    const params = { category: 'inverse', limit: limit };
    if (symbol) params.symbol = symbol;
    return await this.request('GET', '/v5/execution/list', params);
  }

  // 損益履歴取得
  async getClosedPnL(symbol = '', limit = 50) {
    const params = { category: 'inverse', limit: limit };
    if (symbol) params.symbol = symbol;
    return await this.request('GET', '/v5/position/closed-pnl', params);
  }

  // ========== レバレッジ設定 ==========
  
  // レバレッジ設定（1倍固定）
  async setLeverage(symbol, leverage = 1) {
    const params = {
      category: 'inverse',
      symbol: symbol,
      buyLeverage: leverage.toString(),
      sellLeverage: leverage.toString()
    };
    return await this.request('POST', '/v5/position/set-leverage', params);
  }

  // ========== API検証 ==========
  
  // API接続テスト
  async testConnection() {
    try {
      const result = await this.getWalletBalance();
      return result.retCode === 0;
    } catch (error) {
      return false;
    }
  }
}

module.exports = BybitClient;
