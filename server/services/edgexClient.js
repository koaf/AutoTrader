const crypto = require('crypto');
const axios = require('axios');
const web3Utils = require('./web3Utils');

/**
 * EdgeX API Client
 * StarkEx L2 DEX with HMAC + Web3 hybrid authentication
 * 
 * EdgeX is a high-performance perpetual DEX built on StarkEx L2.
 * It uses HMAC-SHA256 for API authentication combined with 
 * STARK signatures for on-chain operations.
 * 
 * API Documentation: https://docs.edgex.exchange/
 * 
 * Required credentials:
 * - apiKey: API Key from EdgeX dashboard
 * - apiSecret: API Secret for HMAC signing
 * - walletAddress: Ethereum wallet address (for account identification)
 */
class EdgexClient {
  constructor(apiKey, apiSecret, isTestnet = false) {
    this.apiKey = apiKey;
    this.apiSecret = apiSecret;
    
    // EdgeX API endpoints
    this.baseUrl = isTestnet
      ? 'https://testnet-api.edgex.exchange'
      : 'https://api.edgex.exchange';
    
    this.isTestnet = isTestnet;
    
    console.log(`EdgeX Client initialized`);
    console.log(`  API Key: ${this.apiKey.substring(0, 8)}...`);
    console.log(`  Network: ${isTestnet ? 'Testnet' : 'Mainnet'}`);
  }

  /**
   * Get current timestamp in milliseconds
   */
  getTimestamp() {
    return Date.now();
  }

  /**
   * Generate HMAC-SHA256 signature for EdgeX API
   * @param {string} timestamp - Request timestamp
   * @param {string} method - HTTP method
   * @param {string} path - API path
   * @param {string} body - Request body (for POST/PUT)
   */
  generateSignature(timestamp, method, path, body = '') {
    const message = `${timestamp}${method.toUpperCase()}${path}${body}`;
    
    return crypto
      .createHmac('sha256', this.apiSecret)
      .update(message)
      .digest('hex');
  }

  /**
   * Make authenticated request to EdgeX API
   */
  async makeRequest(method, endpoint, params = {}, data = null) {
    const timestamp = this.getTimestamp().toString();
    const path = endpoint;
    
    // Build query string for GET requests
    let queryString = '';
    if (method === 'GET' && Object.keys(params).length > 0) {
      queryString = '?' + Object.entries(params)
        .filter(([_, v]) => v !== undefined && v !== null)
        .map(([k, v]) => `${k}=${encodeURIComponent(v)}`)
        .join('&');
    }
    
    const fullPath = path + queryString;
    const bodyString = data ? JSON.stringify(data) : '';
    
    // Generate signature
    const signature = this.generateSignature(timestamp, method, fullPath, bodyString);
    
    const headers = {
      'Content-Type': 'application/json',
      'X-EDGEX-API-KEY': this.apiKey,
      'X-EDGEX-TIMESTAMP': timestamp,
      'X-EDGEX-SIGNATURE': signature
    };
    
    const url = `${this.baseUrl}${fullPath}`;
    
    try {
      const response = await axios({
        method,
        url,
        headers,
        data: data ? data : undefined,
        timeout: 30000
      });
      
      return response.data;
    } catch (error) {
      console.error('EdgeX API Error:', {
        status: error.response?.status,
        data: error.response?.data,
        message: error.message
      });
      throw error;
    }
  }

  /**
   * Make public request (no authentication)
   */
  async makePublicRequest(endpoint, params = {}) {
    let queryString = '';
    if (Object.keys(params).length > 0) {
      queryString = '?' + Object.entries(params)
        .filter(([_, v]) => v !== undefined && v !== null)
        .map(([k, v]) => `${k}=${encodeURIComponent(v)}`)
        .join('&');
    }
    
    const url = `${this.baseUrl}${endpoint}${queryString}`;
    
    try {
      const response = await axios.get(url, {
        headers: { 'Content-Type': 'application/json' },
        timeout: 30000
      });
      return response.data;
    } catch (error) {
      console.error('EdgeX Public API Error:', error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Get wallet balance
   * Returns in Bybit-like format for compatibility
   */
  async getWalletBalance() {
    try {
      const result = await this.makeRequest('GET', '/api/v1/private/account');
      
      if (!result || !result.data) {
        return {
          retCode: -1,
          retMsg: 'No response from EdgeX',
          result: { list: [] }
        };
      }

      const account = result.data;
      const equity = parseFloat(account.equity || account.totalEquity || 0);
      const availableBalance = parseFloat(account.availableBalance || account.freeCollateral || 0);
      const usedMargin = parseFloat(account.usedMargin || account.initialMargin || 0);
      const unrealizedPnl = parseFloat(account.unrealizedPnl || account.unrealisedPnl || 0);

      return {
        retCode: 0,
        retMsg: 'OK',
        result: {
          list: [{
            accountType: 'CONTRACT',
            coin: [{
              coin: 'USDC',
              walletBalance: equity.toString(),
              availableBalance: availableBalance.toString(),
              unrealisedPnl: unrealizedPnl.toString(),
              equity: equity.toString(),
              usedMargin: usedMargin.toString()
            }]
          }]
        }
      };
    } catch (error) {
      return {
        retCode: error.response?.status || -1,
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
      const params = symbol ? { symbol: this.formatSymbol(symbol) } : {};
      const result = await this.makeRequest('GET', '/api/v1/private/positions', params);

      if (!result || !result.data) {
        return {
          retCode: 0,
          retMsg: 'OK',
          result: { list: [] }
        };
      }

      const positions = Array.isArray(result.data) ? result.data : [result.data];

      const formattedPositions = positions
        .filter(p => parseFloat(p.size || p.positionSize || 0) !== 0)
        .map(p => {
          const size = parseFloat(p.size || p.positionSize || 0);
          const entryPrice = parseFloat(p.entryPrice || p.avgEntryPrice || 0);
          const markPrice = parseFloat(p.markPrice || p.indexPrice || 0);
          const unrealizedPnl = parseFloat(p.unrealizedPnl || p.unrealisedPnl || 0);
          const leverage = parseFloat(p.leverage || 1);
          const liquidationPrice = parseFloat(p.liquidationPrice || p.liqPrice || 0);
          
          return {
            symbol: p.symbol || p.market,
            side: size > 0 ? 'Buy' : 'Sell',
            size: Math.abs(size).toString(),
            positionValue: (Math.abs(size) * entryPrice).toString(),
            entryPrice: entryPrice.toString(),
            markPrice: markPrice.toString(),
            unrealisedPnl: unrealizedPnl.toString(),
            leverage: leverage.toString(),
            liqPrice: liquidationPrice.toString(),
            positionIdx: 0
          };
        });

      return {
        retCode: 0,
        retMsg: 'OK',
        result: {
          list: formattedPositions
        }
      };
    } catch (error) {
      return {
        retCode: error.response?.status || -1,
        retMsg: error.response?.data?.message || error.message,
        result: { list: [] }
      };
    }
  }

  /**
   * Format symbol for EdgeX API
   * EdgeX uses formats like 'BTC-USDC-PERP'
   */
  formatSymbol(symbol) {
    // If already in correct format, return as is
    if (symbol.includes('-USDC-PERP')) {
      return symbol;
    }
    
    // Convert from common formats
    const coin = symbol
      .replace('USDC', '')
      .replace('USDT', '')
      .replace('PERP', '')
      .replace('-', '')
      .toUpperCase();
    
    return `${coin}-USDC-PERP`;
  }

  /**
   * Parse symbol from EdgeX format to common format
   */
  parseSymbol(symbol) {
    return symbol.replace('-USDC-PERP', '').replace('-', '');
  }

  /**
   * Place a market order
   * @param {string} symbol - Trading pair (e.g., 'BTC', 'ETH')
   * @param {string} side - 'Buy' or 'Sell'
   * @param {number} qty - Order quantity
   */
  async placeMarketOrder(symbol, side, qty) {
    try {
      const formattedSymbol = this.formatSymbol(symbol);
      
      const orderData = {
        symbol: formattedSymbol,
        side: side.toUpperCase(),
        type: 'MARKET',
        size: qty.toString(),
        reduceOnly: false
      };

      const result = await this.makeRequest('POST', '/api/v1/private/orders', {}, orderData);

      if (!result || result.code !== 0) {
        return {
          retCode: result?.code || -1,
          retMsg: result?.message || 'Order failed',
          result: {}
        };
      }

      const order = result.data || {};

      return {
        retCode: 0,
        retMsg: 'OK',
        result: {
          orderId: order.orderId?.toString() || order.id?.toString() || '',
          orderLinkId: order.clientOrderId || '',
          symbol: this.parseSymbol(formattedSymbol),
          side: side,
          orderType: 'Market',
          price: order.avgPrice || order.price || '0',
          qty: qty.toString(),
          status: this.mapOrderStatus(order.status)
        }
      };
    } catch (error) {
      return {
        retCode: error.response?.status || -1,
        retMsg: error.response?.data?.message || error.message,
        result: {}
      };
    }
  }

  /**
   * Place a limit order
   * @param {string} symbol - Trading pair
   * @param {string} side - 'Buy' or 'Sell'
   * @param {number} qty - Order quantity
   * @param {number} price - Limit price
   */
  async placeLimitOrder(symbol, side, qty, price) {
    try {
      const formattedSymbol = this.formatSymbol(symbol);
      
      const orderData = {
        symbol: formattedSymbol,
        side: side.toUpperCase(),
        type: 'LIMIT',
        size: qty.toString(),
        price: price.toString(),
        timeInForce: 'GTC',
        reduceOnly: false
      };

      const result = await this.makeRequest('POST', '/api/v1/private/orders', {}, orderData);

      if (!result || result.code !== 0) {
        return {
          retCode: result?.code || -1,
          retMsg: result?.message || 'Order failed',
          result: {}
        };
      }

      const order = result.data || {};

      return {
        retCode: 0,
        retMsg: 'OK',
        result: {
          orderId: order.orderId?.toString() || order.id?.toString() || '',
          orderLinkId: order.clientOrderId || '',
          symbol: this.parseSymbol(formattedSymbol),
          side: side,
          orderType: 'Limit',
          price: price.toString(),
          qty: qty.toString(),
          status: this.mapOrderStatus(order.status)
        }
      };
    } catch (error) {
      return {
        retCode: error.response?.status || -1,
        retMsg: error.response?.data?.message || error.message,
        result: {}
      };
    }
  }

  /**
   * Cancel an order
   * @param {string} symbol - Trading pair
   * @param {string} orderId - Order ID to cancel
   */
  async cancelOrder(symbol, orderId) {
    try {
      const result = await this.makeRequest('DELETE', `/api/v1/private/orders/${orderId}`);

      if (!result || result.code !== 0) {
        return {
          retCode: result?.code || -1,
          retMsg: result?.message || 'Cancel failed',
          result: {}
        };
      }

      return {
        retCode: 0,
        retMsg: 'OK',
        result: {
          orderId: orderId,
          symbol: symbol,
          status: 'Cancelled'
        }
      };
    } catch (error) {
      return {
        retCode: error.response?.status || -1,
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
      const params = symbol ? { symbol: this.formatSymbol(symbol) } : {};
      const result = await this.makeRequest('GET', '/api/v1/private/orders', params);

      if (!result || !result.data) {
        return {
          retCode: 0,
          retMsg: 'OK',
          result: { list: [] }
        };
      }

      const orders = Array.isArray(result.data) ? result.data : [];

      return {
        retCode: 0,
        retMsg: 'OK',
        result: {
          list: orders.map(order => ({
            orderId: order.orderId?.toString() || order.id?.toString(),
            symbol: this.parseSymbol(order.symbol || order.market),
            side: order.side === 'BUY' ? 'Buy' : 'Sell',
            orderType: order.type,
            price: order.price,
            qty: order.size || order.origSize,
            filledQty: order.filledSize || order.executedQty || '0',
            status: this.mapOrderStatus(order.status),
            createdTime: order.createdAt?.toString() || order.timestamp?.toString()
          }))
        }
      };
    } catch (error) {
      return {
        retCode: error.response?.status || -1,
        retMsg: error.response?.data?.message || error.message,
        result: { list: [] }
      };
    }
  }

  /**
   * Close all positions for a symbol
   * @param {string} symbol - Trading pair (optional)
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

        const closeSide = position.side === 'Buy' ? 'Sell' : 'Buy';
        const closeQty = position.size;

        const result = await this.placeMarketOrder(
          position.symbol,
          closeSide,
          parseFloat(closeQty)
        );
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
        retCode: error.response?.status || -1,
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
      const formattedSymbol = this.formatSymbol(symbol);
      const result = await this.makePublicRequest('/api/v1/public/funding-rate', {
        symbol: formattedSymbol
      });

      if (!result || !result.data) {
        return {
          retCode: -1,
          retMsg: 'Failed to get funding rate',
          result: { list: [] }
        };
      }

      const data = result.data;

      return {
        retCode: 0,
        retMsg: 'OK',
        result: {
          list: [{
            symbol: this.parseSymbol(formattedSymbol),
            fundingRate: data.fundingRate || data.rate || '0',
            fundingRateTimestamp: data.nextFundingTime?.toString() || Date.now().toString()
          }]
        }
      };
    } catch (error) {
      return {
        retCode: error.response?.status || -1,
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
      const formattedSymbol = this.formatSymbol(symbol);
      const result = await this.makePublicRequest('/api/v1/public/ticker', {
        symbol: formattedSymbol
      });

      if (!result || !result.data) {
        return {
          retCode: -1,
          retMsg: 'Failed to get ticker',
          result: { list: [] }
        };
      }

      const data = result.data;

      return {
        retCode: 0,
        retMsg: 'OK',
        result: {
          list: [{
            symbol: this.parseSymbol(formattedSymbol),
            lastPrice: data.lastPrice || data.price || '0',
            indexPrice: data.indexPrice || '0',
            markPrice: data.markPrice || '0',
            highPrice24h: data.high24h || data.highPrice || '0',
            lowPrice24h: data.low24h || data.lowPrice || '0',
            volume24h: data.volume24h || data.volume || '0',
            turnover24h: data.turnover24h || data.quoteVolume || '0',
            price24hPcnt: data.priceChange24h || data.priceChangePercent || '0'
          }]
        }
      };
    } catch (error) {
      return {
        retCode: error.response?.status || -1,
        retMsg: error.response?.data?.message || error.message,
        result: { list: [] }
      };
    }
  }

  /**
   * Set leverage for a symbol
   * @param {string} symbol - Trading pair
   * @param {number} leverage - Leverage value
   */
  async setLeverage(symbol, leverage) {
    try {
      const formattedSymbol = this.formatSymbol(symbol);
      
      const result = await this.makeRequest('POST', '/api/v1/private/leverage', {}, {
        symbol: formattedSymbol,
        leverage: parseInt(leverage)
      });

      if (!result || result.code !== 0) {
        return {
          retCode: result?.code || -1,
          retMsg: result?.message || 'Failed to set leverage',
          result: {}
        };
      }

      return {
        retCode: 0,
        retMsg: 'OK',
        result: {
          symbol: this.parseSymbol(formattedSymbol),
          leverage: leverage.toString()
        }
      };
    } catch (error) {
      return {
        retCode: error.response?.status || -1,
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
      const params = { limit };
      if (symbol) {
        params.symbol = this.formatSymbol(symbol);
      }
      
      const result = await this.makeRequest('GET', '/api/v1/private/orders/history', params);

      if (!result || !result.data) {
        return {
          retCode: 0,
          retMsg: 'OK',
          result: { list: [] }
        };
      }

      const orders = Array.isArray(result.data) ? result.data : [];

      return {
        retCode: 0,
        retMsg: 'OK',
        result: {
          list: orders.map(order => ({
            orderId: order.orderId?.toString() || order.id?.toString(),
            symbol: this.parseSymbol(order.symbol || order.market),
            side: order.side === 'BUY' ? 'Buy' : 'Sell',
            orderType: order.type,
            price: order.price || order.avgPrice,
            qty: order.size || order.origSize,
            filledQty: order.filledSize || order.executedQty,
            status: this.mapOrderStatus(order.status),
            createdTime: order.createdAt?.toString(),
            updatedTime: order.updatedAt?.toString()
          }))
        }
      };
    } catch (error) {
      return {
        retCode: error.response?.status || -1,
        retMsg: error.response?.data?.message || error.message,
        result: { list: [] }
      };
    }
  }

  /**
   * Map EdgeX order status to Bybit-like status
   */
  mapOrderStatus(status) {
    const statusMap = {
      'NEW': 'New',
      'OPEN': 'New',
      'PENDING': 'New',
      'PARTIALLY_FILLED': 'PartiallyFilled',
      'FILLED': 'Filled',
      'CANCELED': 'Cancelled',
      'CANCELLED': 'Cancelled',
      'REJECTED': 'Rejected',
      'EXPIRED': 'Expired'
    };
    return statusMap[status?.toUpperCase()] || status;
  }

  /**
   * Get available markets/instruments
   */
  async getMarkets() {
    try {
      const result = await this.makePublicRequest('/api/v1/public/markets');
      return result?.data || [];
    } catch (error) {
      console.error('Failed to get markets:', error.message);
      return [];
    }
  }

  /**
   * Test API connection
   */
  async testConnection() {
    try {
      // Test public endpoint first
      const markets = await this.getMarkets();
      
      if (!Array.isArray(markets)) {
        return {
          success: false,
          message: 'Failed to connect to EdgeX API',
          timestamp: Date.now()
        };
      }

      // Test authenticated endpoint
      const balance = await this.getWalletBalance();

      return {
        success: balance.retCode === 0,
        message: balance.retCode === 0 ? 'Connection successful' : balance.retMsg,
        timestamp: Date.now(),
        marketsAvailable: markets.length
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

module.exports = EdgexClient;
