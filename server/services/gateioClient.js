const crypto = require('crypto');
const axios = require('axios');

class GateioClient {
  constructor(apiKey, apiSecret, isTestnet = false) {
    this.apiKey = apiKey;
    this.apiSecret = apiSecret;
    // Gate.io has testnet at futures.testnet.gate.io
    this.baseUrl = isTestnet 
      ? 'https://fx-api-testnet.gateio.ws/api/v4'
      : 'https://api.gateio.ws/api/v4';
    this.settle = 'usdt'; // USDT-settled perpetual contracts
  }

  /**
   * Generate signature for Gate.io API
   * Gate.io uses HMAC-SHA512
   */
  generateSignature(method, url, queryString = '', body = '') {
    const timestamp = Math.floor(Date.now() / 1000).toString();
    
    // Hash the body content
    const bodyHash = crypto.createHash('sha512').update(body || '').digest('hex');
    
    // Create the signing string
    const signString = `${method}\n${url}\n${queryString}\n${bodyHash}\n${timestamp}`;
    
    // Generate HMAC-SHA512 signature
    const signature = crypto
      .createHmac('sha512', this.apiSecret)
      .update(signString)
      .digest('hex');
    
    return { signature, timestamp };
  }

  /**
   * Make authenticated request to Gate.io API
   */
  async makeRequest(method, endpoint, params = {}, body = null) {
    const url = `${this.baseUrl}${endpoint}`;
    const urlPath = `/api/v4${endpoint}`;
    
    // Build query string
    const queryString = Object.keys(params).length > 0
      ? Object.entries(params)
          .map(([key, value]) => `${key}=${encodeURIComponent(value)}`)
          .join('&')
      : '';
    
    const bodyString = body ? JSON.stringify(body) : '';
    const { signature, timestamp } = this.generateSignature(method, urlPath, queryString, bodyString);
    
    const headers = {
      'KEY': this.apiKey,
      'SIGN': signature,
      'Timestamp': timestamp,
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    };
    
    const fullUrl = queryString ? `${url}?${queryString}` : url;
    
    try {
      const response = await axios({
        method,
        url: fullUrl,
        headers,
        data: body || undefined,
        timeout: 30000
      });
      
      return response.data;
    } catch (error) {
      console.error('Gate.io API Error:', error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Make public request (no authentication)
   */
  async makePublicRequest(endpoint, params = {}) {
    const url = `${this.baseUrl}${endpoint}`;
    const queryString = Object.keys(params).length > 0
      ? '?' + Object.entries(params)
          .map(([key, value]) => `${key}=${encodeURIComponent(value)}`)
          .join('&')
      : '';
    
    try {
      const response = await axios.get(`${url}${queryString}`, {
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        timeout: 30000
      });
      return response.data;
    } catch (error) {
      console.error('Gate.io Public API Error:', error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Get wallet balance (futures account)
   * Returns in Bybit-like format for compatibility
   */
  async getWalletBalance() {
    try {
      const accounts = await this.makeRequest('GET', `/futures/${this.settle}/accounts`);
      
      // Gate.io returns account info directly
      // Convert to Bybit-like format
      return {
        retCode: 0,
        retMsg: 'OK',
        result: {
          list: [{
            accountType: 'CONTRACT',
            coin: [{
              coin: 'USDT',
              walletBalance: accounts.total || '0',
              availableBalance: accounts.available || '0',
              unrealisedPnl: accounts.unrealised_pnl || '0',
              equity: accounts.total || '0'
            }]
          }]
        }
      };
    } catch (error) {
      return {
        retCode: error.response?.data?.label ? 1 : -1,
        retMsg: error.response?.data?.message || error.message,
        result: { list: [] }
      };
    }
  }

  /**
   * Get open positions
   * Returns in Bybit-like format
   */
  async getPositions(symbol = null) {
    try {
      const endpoint = `/futures/${this.settle}/positions`;
      const params = symbol ? { contract: symbol } : {};
      
      const positions = await this.makeRequest('GET', endpoint, params);
      
      // Gate.io returns an array of positions
      const positionList = Array.isArray(positions) ? positions : [positions];
      
      // Filter out zero positions and convert format
      const activePositions = positionList
        .filter(pos => pos && parseFloat(pos.size) !== 0)
        .map(pos => ({
          symbol: pos.contract,
          side: parseFloat(pos.size) > 0 ? 'Buy' : 'Sell',
          size: Math.abs(parseFloat(pos.size)).toString(),
          positionValue: pos.value || '0',
          entryPrice: pos.entry_price || '0',
          markPrice: pos.mark_price || '0',
          unrealisedPnl: pos.unrealised_pnl || '0',
          leverage: pos.leverage || '1',
          liqPrice: pos.liq_price || '0',
          positionIdx: 0
        }));
      
      return {
        retCode: 0,
        retMsg: 'OK',
        result: {
          list: activePositions
        }
      };
    } catch (error) {
      return {
        retCode: error.response?.data?.label ? 1 : -1,
        retMsg: error.response?.data?.message || error.message,
        result: { list: [] }
      };
    }
  }

  /**
   * Place a market order
   * @param {string} symbol - Contract symbol (e.g., 'BTC_USDT')
   * @param {string} side - 'Buy' or 'Sell'
   * @param {number} qty - Order quantity (contracts)
   */
  async placeMarketOrder(symbol, side, qty) {
    try {
      // Gate.io uses positive size for long, negative for short
      const size = side.toLowerCase() === 'buy' ? Math.abs(qty) : -Math.abs(qty);
      
      const orderData = {
        contract: symbol,
        size: size,
        price: '0', // 0 for market order
        tif: 'ioc', // Immediate or Cancel for market orders
        reduce_only: false
      };
      
      const result = await this.makeRequest('POST', `/futures/${this.settle}/orders`, {}, orderData);
      
      return {
        retCode: 0,
        retMsg: 'OK',
        result: {
          orderId: result.id?.toString() || '',
          orderLinkId: result.text || '',
          symbol: result.contract,
          side: parseFloat(result.size) > 0 ? 'Buy' : 'Sell',
          orderType: 'Market',
          price: result.price || '0',
          qty: Math.abs(parseFloat(result.size)).toString(),
          status: this.mapOrderStatus(result.status)
        }
      };
    } catch (error) {
      return {
        retCode: error.response?.data?.label ? 1 : -1,
        retMsg: error.response?.data?.message || error.message,
        result: {}
      };
    }
  }

  /**
   * Place a limit order
   * @param {string} symbol - Contract symbol
   * @param {string} side - 'Buy' or 'Sell'
   * @param {number} qty - Order quantity
   * @param {number} price - Limit price
   */
  async placeLimitOrder(symbol, side, qty, price) {
    try {
      const size = side.toLowerCase() === 'buy' ? Math.abs(qty) : -Math.abs(qty);
      
      const orderData = {
        contract: symbol,
        size: size,
        price: price.toString(),
        tif: 'gtc', // Good Till Cancel
        reduce_only: false
      };
      
      const result = await this.makeRequest('POST', `/futures/${this.settle}/orders`, {}, orderData);
      
      return {
        retCode: 0,
        retMsg: 'OK',
        result: {
          orderId: result.id?.toString() || '',
          orderLinkId: result.text || '',
          symbol: result.contract,
          side: parseFloat(result.size) > 0 ? 'Buy' : 'Sell',
          orderType: 'Limit',
          price: result.price,
          qty: Math.abs(parseFloat(result.size)).toString(),
          status: this.mapOrderStatus(result.status)
        }
      };
    } catch (error) {
      return {
        retCode: error.response?.data?.label ? 1 : -1,
        retMsg: error.response?.data?.message || error.message,
        result: {}
      };
    }
  }

  /**
   * Cancel an order
   * @param {string} symbol - Contract symbol
   * @param {string} orderId - Order ID to cancel
   */
  async cancelOrder(symbol, orderId) {
    try {
      const result = await this.makeRequest('DELETE', `/futures/${this.settle}/orders/${orderId}`);
      
      return {
        retCode: 0,
        retMsg: 'OK',
        result: {
          orderId: result.id?.toString() || orderId,
          symbol: result.contract || symbol,
          status: 'Cancelled'
        }
      };
    } catch (error) {
      return {
        retCode: error.response?.data?.label ? 1 : -1,
        retMsg: error.response?.data?.message || error.message,
        result: {}
      };
    }
  }

  /**
   * Get open orders
   */
  async getOpenOrders(symbol = null) {
    try {
      const params = { status: 'open' };
      if (symbol) {
        params.contract = symbol;
      }
      
      const orders = await this.makeRequest('GET', `/futures/${this.settle}/orders`, params);
      
      const orderList = Array.isArray(orders) ? orders : [];
      
      return {
        retCode: 0,
        retMsg: 'OK',
        result: {
          list: orderList.map(order => ({
            orderId: order.id?.toString(),
            symbol: order.contract,
            side: parseFloat(order.size) > 0 ? 'Buy' : 'Sell',
            orderType: order.price === '0' ? 'Market' : 'Limit',
            price: order.price,
            qty: Math.abs(parseFloat(order.size)).toString(),
            filledQty: Math.abs(parseFloat(order.size) - parseFloat(order.left || 0)).toString(),
            status: this.mapOrderStatus(order.status),
            createdTime: (order.create_time * 1000).toString()
          }))
        }
      };
    } catch (error) {
      return {
        retCode: error.response?.data?.label ? 1 : -1,
        retMsg: error.response?.data?.message || error.message,
        result: { list: [] }
      };
    }
  }

  /**
   * Close all positions for a symbol
   * @param {string} symbol - Contract symbol
   */
  async closeAllPositions(symbol = null) {
    try {
      const positionsResult = await this.getPositions(symbol);
      
      if (positionsResult.retCode !== 0) {
        return positionsResult;
      }
      
      const positions = positionsResult.result.list;
      const closeResults = [];
      
      for (const position of positions) {
        if (parseFloat(position.size) === 0) continue;
        
        // Close by placing opposite order
        const closeSide = position.side === 'Buy' ? 'Sell' : 'Buy';
        const closeQty = Math.abs(parseFloat(position.size));
        
        // Use reduce_only order to close
        const orderData = {
          contract: position.symbol,
          size: closeSide === 'buy' ? closeQty : -closeQty,
          price: '0',
          tif: 'ioc',
          reduce_only: true
        };
        
        const result = await this.makeRequest('POST', `/futures/${this.settle}/orders`, {}, orderData);
        closeResults.push(result);
      }
      
      return {
        retCode: 0,
        retMsg: 'OK',
        result: {
          closedPositions: closeResults.length,
          details: closeResults
        }
      };
    } catch (error) {
      return {
        retCode: error.response?.data?.label ? 1 : -1,
        retMsg: error.response?.data?.message || error.message,
        result: {}
      };
    }
  }

  /**
   * Get funding rate for a symbol
   */
  async getFundingRate(symbol) {
    try {
      const contract = await this.makePublicRequest(`/futures/${this.settle}/contracts/${symbol}`);
      
      return {
        retCode: 0,
        retMsg: 'OK',
        result: {
          list: [{
            symbol: contract.name,
            fundingRate: contract.funding_rate || '0',
            fundingRateTimestamp: (contract.funding_next_apply * 1000).toString()
          }]
        }
      };
    } catch (error) {
      return {
        retCode: error.response?.data?.label ? 1 : -1,
        retMsg: error.response?.data?.message || error.message,
        result: { list: [] }
      };
    }
  }

  /**
   * Get ticker information
   */
  async getTicker(symbol) {
    try {
      const tickers = await this.makePublicRequest(`/futures/${this.settle}/tickers`, { contract: symbol });
      
      const ticker = Array.isArray(tickers) && tickers.length > 0 ? tickers[0] : tickers;
      
      return {
        retCode: 0,
        retMsg: 'OK',
        result: {
          list: [{
            symbol: ticker.contract,
            lastPrice: ticker.last || '0',
            indexPrice: ticker.index_price || '0',
            markPrice: ticker.mark_price || '0',
            highPrice24h: ticker.high_24h || '0',
            lowPrice24h: ticker.low_24h || '0',
            volume24h: ticker.volume_24h || '0',
            turnover24h: ticker.volume_24h_quote || '0',
            price24hPcnt: ((parseFloat(ticker.change_percentage) || 0) / 100).toString()
          }]
        }
      };
    } catch (error) {
      return {
        retCode: error.response?.data?.label ? 1 : -1,
        retMsg: error.response?.data?.message || error.message,
        result: { list: [] }
      };
    }
  }

  /**
   * Set leverage for a symbol
   * @param {string} symbol - Contract symbol
   * @param {number} leverage - Leverage value
   */
  async setLeverage(symbol, leverage) {
    try {
      const result = await this.makeRequest(
        'POST',
        `/futures/${this.settle}/positions/${symbol}/leverage`,
        {},
        { leverage: leverage.toString() }
      );
      
      return {
        retCode: 0,
        retMsg: 'OK',
        result: {
          symbol: symbol,
          leverage: result.leverage || leverage.toString()
        }
      };
    } catch (error) {
      return {
        retCode: error.response?.data?.label ? 1 : -1,
        retMsg: error.response?.data?.message || error.message,
        result: {}
      };
    }
  }

  /**
   * Get order history
   */
  async getOrderHistory(symbol = null, limit = 50) {
    try {
      const params = { 
        status: 'finished',
        limit: limit
      };
      if (symbol) {
        params.contract = symbol;
      }
      
      const orders = await this.makeRequest('GET', `/futures/${this.settle}/orders`, params);
      
      const orderList = Array.isArray(orders) ? orders : [];
      
      return {
        retCode: 0,
        retMsg: 'OK',
        result: {
          list: orderList.map(order => ({
            orderId: order.id?.toString(),
            symbol: order.contract,
            side: parseFloat(order.size) > 0 ? 'Buy' : 'Sell',
            orderType: order.price === '0' ? 'Market' : 'Limit',
            price: order.price,
            qty: Math.abs(parseFloat(order.size)).toString(),
            filledQty: Math.abs(parseFloat(order.size) - parseFloat(order.left || 0)).toString(),
            status: this.mapOrderStatus(order.status),
            createdTime: (order.create_time * 1000).toString(),
            updatedTime: (order.finish_time * 1000).toString()
          }))
        }
      };
    } catch (error) {
      return {
        retCode: error.response?.data?.label ? 1 : -1,
        retMsg: error.response?.data?.message || error.message,
        result: { list: [] }
      };
    }
  }

  /**
   * Map Gate.io order status to Bybit-like status
   */
  mapOrderStatus(status) {
    const statusMap = {
      'open': 'New',
      'finished': 'Filled',
      'cancelled': 'Cancelled',
      'liquidated': 'Rejected'
    };
    return statusMap[status] || status;
  }

  /**
   * Test API connection
   */
  async testConnection() {
    try {
      // Test with public endpoint first
      await this.makePublicRequest(`/futures/${this.settle}/contracts/BTC_USDT`);
      
      // Then test authenticated endpoint
      const balance = await this.getWalletBalance();
      
      return {
        success: balance.retCode === 0,
        message: balance.retCode === 0 ? 'Connection successful' : balance.retMsg,
        timestamp: Date.now()
      };
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.message || error.message,
        timestamp: Date.now()
      };
    }
  }
}

module.exports = GateioClient;
