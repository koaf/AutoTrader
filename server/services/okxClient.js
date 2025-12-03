/**
 * OKX API クライアント
 * Perpetual Swap (無期限契約) 対応
 * 
 * API Documentation: https://www.okx.com/docs-v5/
 */

const crypto = require('crypto');
const axios = require('axios');

class OkxClient {
  constructor(apiKey, apiSecret, passphrase, isTestnet = false) {
    this.apiKey = apiKey;
    this.apiSecret = apiSecret;
    this.passphrase = passphrase;
    this.baseUrl = isTestnet 
      ? 'https://www.okx.com'  // OKXはテストネットも同じURLでシミュレート
      : 'https://www.okx.com';
    this.isTestnet = isTestnet;
  }

  /**
   * 署名生成
   */
  generateSignature(timestamp, method, requestPath, body = '') {
    const prehash = timestamp + method.toUpperCase() + requestPath + body;
    return crypto
      .createHmac('sha256', this.apiSecret)
      .update(prehash)
      .digest('base64');
  }

  /**
   * プライベートAPIリクエスト
   */
  async privateRequest(method, endpoint, params = {}) {
    const timestamp = new Date().toISOString();
    let requestPath = `/api/v5${endpoint}`;
    let body = '';

    if (method === 'GET' && Object.keys(params).length > 0) {
      const queryString = new URLSearchParams(params).toString();
      requestPath += `?${queryString}`;
    } else if (method === 'POST') {
      body = JSON.stringify(params);
    }

    const signature = this.generateSignature(timestamp, method, requestPath, body);

    const headers = {
      'OK-ACCESS-KEY': this.apiKey,
      'OK-ACCESS-SIGN': signature,
      'OK-ACCESS-TIMESTAMP': timestamp,
      'OK-ACCESS-PASSPHRASE': this.passphrase,
      'Content-Type': 'application/json'
    };

    // シミュレートモード（テストネット）の場合
    if (this.isTestnet) {
      headers['x-simulated-trading'] = '1';
    }

    try {
      const response = await axios({
        method,
        url: `${this.baseUrl}${requestPath}`,
        headers,
        data: method === 'POST' ? body : undefined,
        timeout: 10000
      });

      return this.normalizeResponse(response.data);
    } catch (error) {
      console.error('OKX API Error:', error.response?.data || error.message);
      return this.normalizeError(error);
    }
  }

  /**
   * パブリックAPIリクエスト
   */
  async publicRequest(endpoint, params = {}) {
    let url = `${this.baseUrl}/api/v5${endpoint}`;
    
    if (Object.keys(params).length > 0) {
      const queryString = new URLSearchParams(params).toString();
      url += `?${queryString}`;
    }

    try {
      const response = await axios.get(url, { timeout: 10000 });
      return this.normalizeResponse(response.data);
    } catch (error) {
      console.error('OKX Public API Error:', error.response?.data || error.message);
      return this.normalizeError(error);
    }
  }

  /**
   * レスポンスをBybit形式に正規化
   */
  normalizeResponse(data) {
    // OKXのレスポンス: { code: "0", msg: "", data: [...] }
    if (data.code === '0') {
      return {
        retCode: 0,
        retMsg: 'OK',
        result: {
          list: data.data || []
        },
        _raw: data
      };
    }
    return {
      retCode: parseInt(data.code) || -1,
      retMsg: data.msg || 'Unknown error',
      result: null,
      _raw: data
    };
  }

  /**
   * エラーレスポンスを正規化
   */
  normalizeError(error) {
    const errData = error.response?.data;
    return {
      retCode: parseInt(errData?.code) || -1,
      retMsg: errData?.msg || error.message || 'Request failed',
      result: null
    };
  }

  /**
   * アカウント残高取得
   */
  async getWalletBalance() {
    const response = await this.privateRequest('GET', '/account/balance');
    
    if (response.retCode === 0 && response.result?.list?.length > 0) {
      const account = response.result.list[0];
      const details = account.details || [];
      
      // Bybit形式に変換
      const coins = details.map(d => ({
        coin: d.ccy,
        walletBalance: d.cashBal || d.eq || '0',
        availableToWithdraw: d.availBal || '0',
        availableBalance: d.availBal || '0',
        totalPositionIM: d.frozenBal || '0',
        usedMargin: d.frozenBal || '0',
        unrealisedPnl: d.upl || '0',
        equity: d.eq || d.cashBal || '0'
      }));

      return {
        retCode: 0,
        retMsg: 'OK',
        result: {
          list: [{
            accountType: 'UNIFIED',
            coin: coins
          }]
        }
      };
    }
    
    return response;
  }

  /**
   * ポジション取得
   */
  async getPositions(symbol = null) {
    const params = {
      instType: 'SWAP'  // 無期限契約
    };
    
    if (symbol) {
      params.instId = this.convertSymbol(symbol);
    }

    const response = await this.privateRequest('GET', '/account/positions', params);
    
    if (response.retCode === 0 && response.result?.list) {
      // Bybit形式に変換
      const positions = response.result.list.map(p => ({
        symbol: p.instId,
        side: p.posSide === 'long' ? 'Buy' : (p.posSide === 'short' ? 'Sell' : (parseFloat(p.pos) > 0 ? 'Buy' : 'Sell')),
        size: Math.abs(parseFloat(p.pos || 0)).toString(),
        avgPrice: p.avgPx || '0',
        entryPrice: p.avgPx || '0',
        markPrice: p.markPx || '0',
        leverage: p.lever || '1',
        unrealisedPnl: p.upl || '0',
        unrealizedPnl: p.upl || '0',
        liqPrice: p.liqPx || '0',
        liquidationPrice: p.liqPx || '0',
        positionValue: p.notionalUsd || '0',
        notional: p.notionalUsd || '0',
        margin: p.margin || '0'
      }));

      return {
        retCode: 0,
        retMsg: 'OK',
        result: {
          list: positions
        }
      };
    }
    
    return response;
  }

  /**
   * シンボル変換 (BTCUSDT → BTC-USDT-SWAP)
   */
  convertSymbol(symbol) {
    // 既にOKX形式の場合
    if (symbol.includes('-')) {
      return symbol;
    }
    
    // BTCUSDT → BTC-USDT-SWAP
    const base = symbol.replace(/USD[T]?$/, '');
    const quote = symbol.includes('USDT') ? 'USDT' : 'USD';
    return `${base}-${quote}-SWAP`;
  }

  /**
   * Bybit形式のシンボルに変換
   */
  toBybitSymbol(okxSymbol) {
    // BTC-USDT-SWAP → BTCUSDT
    return okxSymbol.replace(/-SWAP$/, '').replace('-', '');
  }

  /**
   * 成行注文
   */
  async placeMarketOrder(symbol, side, qty, reduceOnly = false) {
    const instId = this.convertSymbol(symbol);
    
    const params = {
      instId,
      tdMode: 'cross',  // クロスマージン
      side: side.toLowerCase(),  // buy or sell
      ordType: 'market',
      sz: qty.toString()
    };

    // ポジション方向（net_modeの場合は不要、hedge_modeの場合は必要）
    // デフォルトはnet_mode想定
    if (reduceOnly) {
      params.reduceOnly = true;
    }

    const response = await this.privateRequest('POST', '/trade/order', params);
    
    if (response.retCode === 0 && response.result?.list?.length > 0) {
      const order = response.result.list[0];
      return {
        retCode: order.sCode === '0' ? 0 : parseInt(order.sCode),
        retMsg: order.sMsg || 'OK',
        result: {
          orderId: order.ordId,
          orderLinkId: order.clOrdId || ''
        }
      };
    }
    
    return response;
  }

  /**
   * 指値注文
   */
  async placeLimitOrder(symbol, side, qty, price, reduceOnly = false) {
    const instId = this.convertSymbol(symbol);
    
    const params = {
      instId,
      tdMode: 'cross',
      side: side.toLowerCase(),
      ordType: 'limit',
      sz: qty.toString(),
      px: price.toString()
    };

    if (reduceOnly) {
      params.reduceOnly = true;
    }

    const response = await this.privateRequest('POST', '/trade/order', params);
    
    if (response.retCode === 0 && response.result?.list?.length > 0) {
      const order = response.result.list[0];
      return {
        retCode: order.sCode === '0' ? 0 : parseInt(order.sCode),
        retMsg: order.sMsg || 'OK',
        result: {
          orderId: order.ordId,
          orderLinkId: order.clOrdId || ''
        }
      };
    }
    
    return response;
  }

  /**
   * 注文キャンセル
   */
  async cancelOrder(symbol, orderId) {
    const instId = this.convertSymbol(symbol);
    
    const params = {
      instId,
      ordId: orderId
    };

    return await this.privateRequest('POST', '/trade/cancel-order', params);
  }

  /**
   * 全ポジション決済
   */
  async closeAllPositions(symbol = null) {
    const positionsRes = await this.getPositions(symbol);
    
    if (positionsRes.retCode !== 0) {
      return [positionsRes];
    }

    const positions = positionsRes.result?.list || [];
    const results = [];

    for (const pos of positions) {
      if (parseFloat(pos.size) > 0) {
        // ポジションと反対方向で決済
        const closeSide = pos.side === 'Buy' ? 'sell' : 'buy';
        
        const params = {
          instId: pos.symbol,
          mgnMode: 'cross',
          posSide: 'net',  // net_modeの場合
          autoCxl: true
        };

        const result = await this.privateRequest('POST', '/trade/close-position', params);
        results.push(result);
      }
    }

    return results.length > 0 ? results : [{ retCode: 0, retMsg: 'No positions to close' }];
  }

  /**
   * ファンディングレート取得
   */
  async getFundingRate(symbol) {
    const instId = this.convertSymbol(symbol);
    
    const response = await this.publicRequest('/public/funding-rate', { instId });
    
    if (response.retCode === 0 && response.result?.list?.length > 0) {
      const rate = response.result.list[0];
      return {
        retCode: 0,
        retMsg: 'OK',
        result: {
          list: [{
            symbol: this.toBybitSymbol(rate.instId),
            fundingRate: rate.fundingRate || '0',
            nextFundingTime: rate.nextFundingTime || '',
            fundingRateTimestamp: rate.fundingTime || ''
          }]
        }
      };
    }
    
    return response;
  }

  /**
   * ティッカー取得
   */
  async getTicker(symbol) {
    const instId = this.convertSymbol(symbol);
    
    const response = await this.publicRequest('/market/ticker', { instId });
    
    if (response.retCode === 0 && response.result?.list?.length > 0) {
      const ticker = response.result.list[0];
      return {
        retCode: 0,
        retMsg: 'OK',
        result: {
          list: [{
            symbol: this.toBybitSymbol(ticker.instId),
            lastPrice: ticker.last || '0',
            indexPrice: ticker.idxPx || ticker.last || '0',
            markPrice: ticker.markPx || ticker.last || '0',
            high24h: ticker.high24h || '0',
            low24h: ticker.low24h || '0',
            volume24h: ticker.vol24h || '0',
            turnover24h: ticker.volCcy24h || '0'
          }]
        }
      };
    }
    
    return response;
  }

  /**
   * レバレッジ設定
   */
  async setLeverage(symbol, leverage) {
    const instId = this.convertSymbol(symbol);
    
    const params = {
      instId,
      lever: leverage.toString(),
      mgnMode: 'cross'
    };

    const response = await this.privateRequest('POST', '/account/set-leverage', params);
    
    return {
      retCode: response.retCode,
      retMsg: response.retMsg,
      result: {
        leverage: leverage.toString()
      }
    };
  }

  /**
   * 注文履歴取得
   */
  async getOrderHistory(symbol = null, limit = 50) {
    const params = {
      instType: 'SWAP',
      limit: limit.toString()
    };
    
    if (symbol) {
      params.instId = this.convertSymbol(symbol);
    }

    const response = await this.privateRequest('GET', '/trade/orders-history-archive', params);
    
    if (response.retCode === 0 && response.result?.list) {
      const orders = response.result.list.map(o => ({
        symbol: this.toBybitSymbol(o.instId),
        orderId: o.ordId,
        side: o.side === 'buy' ? 'Buy' : 'Sell',
        orderType: o.ordType === 'market' ? 'Market' : 'Limit',
        qty: o.sz || '0',
        price: o.avgPx || o.px || '0',
        status: this.convertOrderStatus(o.state),
        createdTime: o.cTime,
        updatedTime: o.uTime,
        fee: o.fee || '0',
        feeCurrency: o.feeCcy || ''
      }));

      return {
        retCode: 0,
        retMsg: 'OK',
        result: {
          list: orders
        }
      };
    }
    
    return response;
  }

  /**
   * 注文ステータス変換
   */
  convertOrderStatus(okxStatus) {
    const statusMap = {
      'live': 'New',
      'partially_filled': 'PartiallyFilled',
      'filled': 'Filled',
      'canceled': 'Cancelled',
      'mmp_canceled': 'Cancelled'
    };
    return statusMap[okxStatus] || okxStatus;
  }

  /**
   * API接続テスト
   */
  async testConnection() {
    try {
      const response = await this.getWalletBalance();
      return response.retCode === 0;
    } catch (error) {
      console.error('OKX connection test failed:', error);
      return false;
    }
  }
}

module.exports = OkxClient;
