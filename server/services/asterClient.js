const crypto = require('crypto');
const axios = require('axios');
const web3Utils = require('./web3Utils');

/**
 * Aster DEX API Client (v3 - Web3/ECDSA Signature)
 * USDT-M Perpetual Futures trading with Web3 authentication
 * 
 * This implementation uses the v3 API with ECDSA signatures
 * which provides non-custodial authentication:
 * - Your private key never leaves your system
 * - Aster only sees your public address
 * - More secure than traditional API key methods
 * 
 * Required credentials:
 * - apiKey: Your main wallet address (user address)
 * - apiSecret: Your API wallet's private key (get from https://www.asterdex.com/en/api-wallet)
 */
class AsterClient {
  constructor(apiKey, apiSecret, isTestnet = false) {
    // apiKey = user wallet address (main account that holds funds)
    // apiSecret = signer private key (API wallet private key for signing)
    this.userAddress = this.normalizeAddress(apiKey);
    this.privateKey = apiSecret.startsWith('0x') ? apiSecret : `0x${apiSecret}`;
    
    // Derive signer address from private key
    this.signerAddress = this.deriveSignerAddress();
    
    this.baseUrl = isTestnet
      ? 'https://fapi-testnet.asterdex.com'
      : 'https://fapi.asterdex.com';
    
    console.log(`Aster DEX Client initialized`);
    console.log(`  User (main wallet): ${this.userAddress}`);
    console.log(`  Signer (API wallet): ${this.signerAddress}`);
  }

  /**
   * Normalize Ethereum address to checksummed format
   */
  normalizeAddress(address) {
    if (!address) return '';
    return address.startsWith('0x') ? address : `0x${address}`;
  }

  /**
   * Derive signer address from private key
   */
  deriveSignerAddress() {
    try {
      return web3Utils.privateKeyToAddress(this.privateKey);
    } catch (error) {
      console.error('Failed to derive signer address:', error.message);
      // Fallback: user must provide signer address separately
      return this.userAddress;
    }
  }

  /**
   * Generate nonce (microsecond timestamp as required by Aster)
   */
  generateNonce() {
    return Math.trunc(Date.now() * 1000);
  }

  /**
   * Sort parameters by ASCII key order and create query string
   * Required by Aster's signature algorithm
   */
  sortAndStringifyParams(params) {
    return Object.entries(params)
      .filter(([_, value]) => value !== undefined && value !== null)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, value]) => `${key}=${value}`)
      .join('&');
  }

  /**
   * Generate Web3 signature for Aster v3 API
   * 
   * Process:
   * 1. Sort params by ASCII key order → query string
   * 2. ABI encode: (queryString, user, signer, nonce) → bytes
   * 3. Keccak256 hash the encoded bytes → hash
   * 4. ECDSA sign with private key (eth_sign style) → signature
   */
  generateSignature(params, nonce) {
    // Step 1: Sort and create query string
    const queryString = this.sortAndStringifyParams(params);
    
    // Step 2: ABI encode (queryString, user, signer, nonce)
    const encoded = web3Utils.abiEncode(
      queryString,
      this.userAddress,
      this.signerAddress,
      nonce
    );
    
    // Step 3: Keccak256 hash
    const messageHash = web3Utils.keccak256(encoded);
    
    // Step 4: ECDSA sign (eth_sign style with "\x19Ethereum Signed Message:\n" prefix)
    let signature;
    try {
      signature = web3Utils.signMessage(messageHash, this.privateKey);
    } catch (error) {
      console.warn('ECDSA signing failed, using fallback:', error.message);
      signature = web3Utils.signMessageFallback(messageHash, this.privateKey);
    }
    
    return signature;
  }

  /**
   * Make authenticated request to Aster v3 API
   */
  async makeRequest(method, endpoint, params = {}) {
    const timestamp = Date.now();
    const recvWindow = 50000;
    const nonce = this.generateNonce();
    
    // Business parameters + timestamp + recvWindow
    const requestParams = {
      ...params,
      timestamp,
      recvWindow
    };
    
    // Generate Web3 signature
    const signature = this.generateSignature(requestParams, nonce);
    
    // Full params including auth
    const fullParams = {
      ...requestParams,
      nonce,
      user: this.userAddress,
      signer: this.signerAddress,
      signature
    };
    
    const headers = {
      'Content-Type': 'application/x-www-form-urlencoded'
    };
    
    // Build request body/query
    const queryString = Object.entries(fullParams)
      .map(([k, v]) => `${k}=${encodeURIComponent(v)}`)
      .join('&');
    
    let url, data;
    if (method === 'GET' || method === 'DELETE') {
      url = `${this.baseUrl}${endpoint}?${queryString}`;
      data = undefined;
    } else {
      url = `${this.baseUrl}${endpoint}`;
      data = queryString;
    }
    
    try {
      const response = await axios({
        method,
        url,
        headers,
        data,
        timeout: 30000
      });
      
      return response.data;
    } catch (error) {
      console.error('Aster API Error:', {
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
    const entries = Object.entries(params).filter(([_, v]) => v !== undefined);
    const queryString = entries.length > 0
      ? '?' + entries.map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join('&')
      : '';
    
    const url = `${this.baseUrl}${endpoint}${queryString}`;
    
    try {
      const response = await axios.get(url, {
        headers: { 'Content-Type': 'application/json' },
        timeout: 30000
      });
      return response.data;
    } catch (error) {
      console.error('Aster Public API Error:', error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Get wallet balance (futures account)
   * Returns in Bybit-like format for compatibility
   */
  async getWalletBalance() {
    try {
      const balances = await this.makeRequest('GET', '/fapi/v3/balance');
      
      const balanceList = Array.isArray(balances) ? balances : [];
      const usdtBalance = balanceList.find(b => b.asset === 'USDT') || {};
      
      return {
        retCode: 0,
        retMsg: 'OK',
        result: {
          list: [{
            accountType: 'CONTRACT',
            coin: [{
              coin: 'USDT',
              walletBalance: usdtBalance.balance || '0',
              availableBalance: usdtBalance.availableBalance || '0',
              unrealisedPnl: usdtBalance.crossUnPnl || '0',
              equity: usdtBalance.balance || '0'
            }]
          }]
        }
      };
    } catch (error) {
      return {
        retCode: error.response?.data?.code || -1,
        retMsg: error.response?.data?.msg || error.message,
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
      const account = await this.makeRequest('GET', '/fapi/v3/account');
      
      let positions = account.positions || [];
      
      if (symbol) {
        positions = positions.filter(p => p.symbol === symbol);
      }
      
      const activePositions = positions
        .filter(p => parseFloat(p.positionAmt) !== 0)
        .map(p => ({
          symbol: p.symbol,
          side: parseFloat(p.positionAmt) > 0 ? 'Buy' : 'Sell',
          size: Math.abs(parseFloat(p.positionAmt)).toString(),
          positionValue: p.notional || '0',
          entryPrice: p.entryPrice || '0',
          markPrice: p.markPrice || '0',
          unrealisedPnl: p.unrealizedProfit || '0',
          leverage: p.leverage || '1',
          liqPrice: p.liquidationPrice || '0',
          positionIdx: p.positionSide === 'LONG' ? 1 : (p.positionSide === 'SHORT' ? 2 : 0)
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
        retCode: error.response?.data?.code || -1,
        retMsg: error.response?.data?.msg || error.message,
        result: { list: [] }
      };
    }
  }

  /**
   * Place a market order
   * @param {string} symbol - Trading pair (e.g., 'BTCUSDT')
   * @param {string} side - 'Buy' or 'Sell'
   * @param {number} qty - Order quantity
   */
  async placeMarketOrder(symbol, side, qty) {
    try {
      const orderParams = {
        symbol: symbol,
        side: side.toUpperCase(),
        type: 'MARKET',
        quantity: qty.toString(),
        positionSide: 'BOTH'
      };
      
      const result = await this.makeRequest('POST', '/fapi/v3/order', orderParams);
      
      return {
        retCode: 0,
        retMsg: 'OK',
        result: {
          orderId: result.orderId?.toString() || '',
          orderLinkId: result.clientOrderId || '',
          symbol: result.symbol,
          side: result.side === 'BUY' ? 'Buy' : 'Sell',
          orderType: 'Market',
          price: result.price || '0',
          qty: result.origQty || qty.toString(),
          status: this.mapOrderStatus(result.status)
        }
      };
    } catch (error) {
      return {
        retCode: error.response?.data?.code || -1,
        retMsg: error.response?.data?.msg || error.message,
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
      const orderParams = {
        symbol: symbol,
        side: side.toUpperCase(),
        type: 'LIMIT',
        quantity: qty.toString(),
        price: price.toString(),
        timeInForce: 'GTC',
        positionSide: 'BOTH'
      };
      
      const result = await this.makeRequest('POST', '/fapi/v3/order', orderParams);
      
      return {
        retCode: 0,
        retMsg: 'OK',
        result: {
          orderId: result.orderId?.toString() || '',
          orderLinkId: result.clientOrderId || '',
          symbol: result.symbol,
          side: result.side === 'BUY' ? 'Buy' : 'Sell',
          orderType: 'Limit',
          price: result.price,
          qty: result.origQty || qty.toString(),
          status: this.mapOrderStatus(result.status)
        }
      };
    } catch (error) {
      return {
        retCode: error.response?.data?.code || -1,
        retMsg: error.response?.data?.msg || error.message,
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
      const result = await this.makeRequest('DELETE', '/fapi/v3/order', {
        symbol,
        orderId: parseInt(orderId)
      });
      
      return {
        retCode: 0,
        retMsg: 'OK',
        result: {
          orderId: result.orderId?.toString() || orderId,
          symbol: result.symbol || symbol,
          status: 'Cancelled'
        }
      };
    } catch (error) {
      return {
        retCode: error.response?.data?.code || -1,
        retMsg: error.response?.data?.msg || error.message,
        result: {}
      };
    }
  }

  /**
   * Get open orders
   */
  async getOpenOrders(symbol = null) {
    try {
      const params = symbol ? { symbol } : {};
      const orders = await this.makeRequest('GET', '/fapi/v3/openOrders', params);
      
      const orderList = Array.isArray(orders) ? orders : [];
      
      return {
        retCode: 0,
        retMsg: 'OK',
        result: {
          list: orderList.map(order => ({
            orderId: order.orderId?.toString(),
            symbol: order.symbol,
            side: order.side === 'BUY' ? 'Buy' : 'Sell',
            orderType: order.type,
            price: order.price,
            qty: order.origQty,
            filledQty: order.executedQty,
            status: this.mapOrderStatus(order.status),
            createdTime: order.time?.toString()
          }))
        }
      };
    } catch (error) {
      return {
        retCode: error.response?.data?.code || -1,
        retMsg: error.response?.data?.msg || error.message,
        result: { list: [] }
      };
    }
  }

  /**
   * Close all positions for a symbol
   * @param {string} symbol - Trading pair (optional, closes all if not provided)
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
        
        const closeSide = position.side === 'Buy' ? 'SELL' : 'BUY';
        const closeQty = position.size;
        
        const orderParams = {
          symbol: position.symbol,
          side: closeSide,
          type: 'MARKET',
          quantity: closeQty,
          positionSide: 'BOTH',
          reduceOnly: 'true'
        };
        
        const result = await this.makeRequest('POST', '/fapi/v3/order', orderParams);
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
        retCode: error.response?.data?.code || -1,
        retMsg: error.response?.data?.msg || error.message,
        result: {}
      };
    }
  }

  /**
   * Get funding rate for a symbol
   */
  async getFundingRate(symbol) {
    try {
      const result = await this.makePublicRequest('/fapi/v3/premiumIndex', { symbol });
      
      const data = Array.isArray(result) ? result[0] : result;
      
      return {
        retCode: 0,
        retMsg: 'OK',
        result: {
          list: [{
            symbol: data.symbol,
            fundingRate: data.lastFundingRate || '0',
            fundingRateTimestamp: data.nextFundingTime?.toString() || Date.now().toString()
          }]
        }
      };
    } catch (error) {
      return {
        retCode: error.response?.data?.code || -1,
        retMsg: error.response?.data?.msg || error.message,
        result: { list: [] }
      };
    }
  }

  /**
   * Get ticker information
   */
  async getTicker(symbol) {
    try {
      const ticker = await this.makePublicRequest('/fapi/v3/ticker/24hr', { symbol });
      
      const data = Array.isArray(ticker) ? ticker[0] : ticker;
      
      return {
        retCode: 0,
        retMsg: 'OK',
        result: {
          list: [{
            symbol: data.symbol,
            lastPrice: data.lastPrice || '0',
            indexPrice: data.indexPrice || '0',
            markPrice: data.markPrice || '0',
            highPrice24h: data.highPrice || '0',
            lowPrice24h: data.lowPrice || '0',
            volume24h: data.volume || '0',
            turnover24h: data.quoteVolume || '0',
            price24hPcnt: (parseFloat(data.priceChangePercent || 0) / 100).toString()
          }]
        }
      };
    } catch (error) {
      return {
        retCode: error.response?.data?.code || -1,
        retMsg: error.response?.data?.msg || error.message,
        result: { list: [] }
      };
    }
  }

  /**
   * Set leverage for a symbol
   * @param {string} symbol - Trading pair
   * @param {number} leverage - Leverage value (1-125)
   */
  async setLeverage(symbol, leverage) {
    try {
      const result = await this.makeRequest('POST', '/fapi/v3/leverage', {
        symbol,
        leverage: parseInt(leverage)
      });
      
      return {
        retCode: 0,
        retMsg: 'OK',
        result: {
          symbol: result.symbol || symbol,
          leverage: result.leverage?.toString() || leverage.toString()
        }
      };
    } catch (error) {
      return {
        retCode: error.response?.data?.code || -1,
        retMsg: error.response?.data?.msg || error.message,
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
      if (symbol) params.symbol = symbol;
      
      const orders = await this.makeRequest('GET', '/fapi/v3/allOrders', params);
      
      const orderList = Array.isArray(orders) ? orders : [];
      
      return {
        retCode: 0,
        retMsg: 'OK',
        result: {
          list: orderList.map(order => ({
            orderId: order.orderId?.toString(),
            symbol: order.symbol,
            side: order.side === 'BUY' ? 'Buy' : 'Sell',
            orderType: order.type,
            price: order.price,
            qty: order.origQty,
            filledQty: order.executedQty,
            status: this.mapOrderStatus(order.status),
            createdTime: order.time?.toString(),
            updatedTime: order.updateTime?.toString()
          }))
        }
      };
    } catch (error) {
      return {
        retCode: error.response?.data?.code || -1,
        retMsg: error.response?.data?.msg || error.message,
        result: { list: [] }
      };
    }
  }

  /**
   * Map Aster order status to Bybit-like status
   */
  mapOrderStatus(status) {
    const statusMap = {
      'NEW': 'New',
      'PARTIALLY_FILLED': 'PartiallyFilled',
      'FILLED': 'Filled',
      'CANCELED': 'Cancelled',
      'CANCELLED': 'Cancelled',
      'REJECTED': 'Rejected',
      'EXPIRED': 'Expired'
    };
    return statusMap[status] || status;
  }

  /**
   * Test API connection
   */
  async testConnection() {
    try {
      // Test with public endpoint first
      await this.makePublicRequest('/fapi/v3/time');
      
      // Then test authenticated endpoint
      const balance = await this.getWalletBalance();
      
      return {
        success: balance.retCode === 0,
        message: balance.retCode === 0 ? 'Connection successful' : balance.retMsg,
        timestamp: Date.now(),
        userAddress: this.userAddress,
        signerAddress: this.signerAddress
      };
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.msg || error.message,
        timestamp: Date.now()
      };
    }
  }
}

module.exports = AsterClient;
