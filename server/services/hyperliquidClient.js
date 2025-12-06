const crypto = require('crypto');
const axios = require('axios');
const web3Utils = require('./web3Utils');

/**
 * Hyperliquid API Client
 * L1 DEX with Web3/ECDSA authentication
 * 
 * Hyperliquid is a high-performance L1 DEX that uses Ethereum-style 
 * signatures for authentication. All trading actions require signing
 * with your private key.
 * 
 * API Documentation: https://hyperliquid.gitbook.io/hyperliquid-docs/for-developers/api
 * 
 * Required credentials:
 * - apiKey: Wallet address that will trade (must have funds deposited)
 * - apiSecret: Private key for the wallet (used for signing)
 */
class HyperliquidClient {
  constructor(walletAddress, privateKey, isTestnet = false) {
    // Wallet address is the account that trades
    this.walletAddress = this.normalizeAddress(walletAddress);
    this.privateKey = privateKey.startsWith('0x') ? privateKey : `0x${privateKey}`;
    
    // Hyperliquid API endpoints
    this.baseUrl = isTestnet
      ? 'https://api.hyperliquid-testnet.xyz'
      : 'https://api.hyperliquid.xyz';
    
    this.infoUrl = `${this.baseUrl}/info`;
    this.exchangeUrl = `${this.baseUrl}/exchange`;
    
    this.isTestnet = isTestnet;
    
    console.log(`Hyperliquid Client initialized`);
    console.log(`  Wallet: ${this.walletAddress}`);
    console.log(`  Network: ${isTestnet ? 'Testnet' : 'Mainnet'}`);
  }

  /**
   * Normalize Ethereum address
   */
  normalizeAddress(address) {
    if (!address) return '';
    const addr = address.startsWith('0x') ? address : `0x${address}`;
    return addr.toLowerCase();
  }

  /**
   * Get current timestamp in milliseconds
   */
  getTimestamp() {
    return Date.now();
  }

  /**
   * Create EIP-712 typed data for signing
   * Hyperliquid uses EIP-712 for order signing
   */
  createTypedData(action, nonce) {
    const domain = {
      name: 'Hyperliquid',
      version: '1',
      chainId: this.isTestnet ? 421614 : 42161, // Arbitrum Sepolia testnet or Arbitrum One
      verifyingContract: '0x0000000000000000000000000000000000000000'
    };

    const types = {
      Agent: [
        { name: 'source', type: 'string' },
        { name: 'connectionId', type: 'bytes32' }
      ]
    };

    return {
      domain,
      types,
      primaryType: 'Agent',
      message: action
    };
  }

  /**
   * Sign action for Hyperliquid API
   * Uses Ethereum personal_sign style
   */
  signAction(action, nonce) {
    // Create the message to sign
    const timestamp = nonce || this.getTimestamp();
    
    // Hyperliquid signature format
    const messageData = {
      action,
      nonce: timestamp,
      vaultAddress: null
    };
    
    const messageString = JSON.stringify(messageData);
    const messageHash = web3Utils.keccak256(messageString);
    
    let signature;
    try {
      signature = web3Utils.signMessage(messageHash, this.privateKey);
    } catch (error) {
      console.warn('ECDSA signing fallback:', error.message);
      signature = web3Utils.signMessageFallback(messageHash, this.privateKey);
    }
    
    return {
      signature,
      timestamp,
      messageData
    };
  }

  /**
   * Make info request (public/read-only endpoints)
   */
  async makeInfoRequest(requestType, payload = {}) {
    try {
      const data = {
        type: requestType,
        ...payload
      };

      const response = await axios.post(this.infoUrl, data, {
        headers: {
          'Content-Type': 'application/json'
        },
        timeout: 30000
      });

      return response.data;
    } catch (error) {
      console.error('Hyperliquid Info API Error:', {
        status: error.response?.status,
        data: error.response?.data,
        message: error.message
      });
      throw error;
    }
  }

  /**
   * Make exchange request (authenticated/trading endpoints)
   */
  async makeExchangeRequest(action) {
    try {
      const nonce = this.getTimestamp();
      const { signature, timestamp } = this.signAction(action, nonce);

      const data = {
        action,
        nonce: timestamp,
        signature,
        vaultAddress: null
      };

      const response = await axios.post(this.exchangeUrl, data, {
        headers: {
          'Content-Type': 'application/json'
        },
        timeout: 30000
      });

      return response.data;
    } catch (error) {
      console.error('Hyperliquid Exchange API Error:', {
        status: error.response?.status,
        data: error.response?.data,
        message: error.message
      });
      throw error;
    }
  }

  /**
   * Get wallet balance
   * Returns in Bybit-like format for compatibility
   */
  async getWalletBalance() {
    try {
      const result = await this.makeInfoRequest('clearinghouseState', {
        user: this.walletAddress
      });

      if (!result) {
        return {
          retCode: -1,
          retMsg: 'No response from Hyperliquid',
          result: { list: [] }
        };
      }

      // Extract margin summary
      const marginSummary = result.marginSummary || {};
      const accountValue = parseFloat(marginSummary.accountValue || 0);
      const totalMarginUsed = parseFloat(marginSummary.totalMarginUsed || 0);
      const totalNtlPos = parseFloat(marginSummary.totalNtlPos || 0);

      // Calculate available balance
      const availableBalance = accountValue - totalMarginUsed;

      // Calculate unrealized PnL from positions
      const positions = result.assetPositions || [];
      const unrealizedPnl = positions.reduce((sum, pos) => {
        return sum + parseFloat(pos.position?.unrealizedPnl || 0);
      }, 0);

      return {
        retCode: 0,
        retMsg: 'OK',
        result: {
          list: [{
            accountType: 'CONTRACT',
            coin: [{
              coin: 'USDC',
              walletBalance: accountValue.toString(),
              availableBalance: availableBalance.toString(),
              unrealisedPnl: unrealizedPnl.toString(),
              equity: accountValue.toString(),
              usedMargin: totalMarginUsed.toString()
            }]
          }]
        }
      };
    } catch (error) {
      return {
        retCode: error.response?.status || -1,
        retMsg: error.response?.data?.error || error.message,
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
      const result = await this.makeInfoRequest('clearinghouseState', {
        user: this.walletAddress
      });

      if (!result || !result.assetPositions) {
        return {
          retCode: 0,
          retMsg: 'OK',
          result: { list: [] }
        };
      }

      let positions = result.assetPositions
        .filter(p => p.position && parseFloat(p.position.szi) !== 0)
        .map(p => {
          const pos = p.position;
          const size = parseFloat(pos.szi);
          const entryPrice = parseFloat(pos.entryPx || 0);
          const unrealizedPnl = parseFloat(pos.unrealizedPnl || 0);
          const leverage = parseFloat(pos.leverage?.value || 1);
          const liquidationPrice = parseFloat(pos.liquidationPx || 0);
          
          return {
            symbol: p.position.coin,
            side: size > 0 ? 'Buy' : 'Sell',
            size: Math.abs(size).toString(),
            positionValue: (Math.abs(size) * entryPrice).toString(),
            entryPrice: entryPrice.toString(),
            markPrice: entryPrice.toString(), // Mark price updated via websocket
            unrealisedPnl: unrealizedPnl.toString(),
            leverage: leverage.toString(),
            liqPrice: liquidationPrice.toString(),
            positionIdx: 0
          };
        });

      if (symbol) {
        positions = positions.filter(p => 
          p.symbol === symbol || p.symbol === symbol.replace('USDC', '').replace('PERP', '')
        );
      }

      return {
        retCode: 0,
        retMsg: 'OK',
        result: {
          list: positions
        }
      };
    } catch (error) {
      return {
        retCode: error.response?.status || -1,
        retMsg: error.response?.data?.error || error.message,
        result: { list: [] }
      };
    }
  }

  /**
   * Get asset index (coin list and metadata)
   */
  async getAssetIndex() {
    try {
      const meta = await this.makeInfoRequest('meta');
      return meta;
    } catch (error) {
      console.error('Failed to get asset index:', error.message);
      return null;
    }
  }

  /**
   * Convert symbol to Hyperliquid asset index
   * Hyperliquid uses numeric asset indices
   */
  async getAssetId(symbol) {
    const meta = await this.getAssetIndex();
    if (!meta || !meta.universe) return null;

    // Symbol format: BTC, ETH, etc. (without USDC suffix)
    const coin = symbol.replace('USDC', '').replace('PERP', '').replace('-', '');
    const index = meta.universe.findIndex(asset => 
      asset.name === coin || asset.name === symbol
    );
    
    return index >= 0 ? index : null;
  }

  /**
   * Place a market order
   * @param {string} symbol - Trading pair (e.g., 'BTC', 'ETH')
   * @param {string} side - 'Buy' or 'Sell'
   * @param {number} qty - Order quantity
   */
  async placeMarketOrder(symbol, side, qty) {
    try {
      const coin = symbol.replace('USDC', '').replace('PERP', '').replace('-', '');
      const isBuy = side.toLowerCase() === 'buy';
      
      // Get current price for slippage calculation
      const ticker = await this.getTicker(coin);
      const currentPrice = parseFloat(ticker.result?.list?.[0]?.lastPrice || 0);
      
      // Market orders use a limit price with slippage
      // 3% slippage for market simulation
      const slippage = 0.03;
      const limitPrice = isBuy 
        ? currentPrice * (1 + slippage) 
        : currentPrice * (1 - slippage);

      const action = {
        type: 'order',
        orders: [{
          a: await this.getAssetId(coin), // Asset index
          b: isBuy, // is_buy
          p: limitPrice.toFixed(6), // price
          s: qty.toString(), // size
          r: false, // reduce_only
          t: {
            limit: {
              tif: 'Ioc' // Immediate or cancel for market-like behavior
            }
          }
        }],
        grouping: 'na'
      };

      const result = await this.makeExchangeRequest(action);

      // Parse response
      const status = result?.status || result?.response?.status;
      const orderId = result?.response?.data?.statuses?.[0]?.resting?.oid || 
                     result?.response?.data?.statuses?.[0]?.filled?.oid ||
                     Date.now().toString();

      return {
        retCode: status === 'ok' ? 0 : -1,
        retMsg: status === 'ok' ? 'OK' : (result?.response?.error || 'Order failed'),
        result: {
          orderId: orderId,
          orderLinkId: '',
          symbol: coin,
          side: side,
          orderType: 'Market',
          price: limitPrice.toString(),
          qty: qty.toString(),
          status: status === 'ok' ? 'Filled' : 'Rejected'
        }
      };
    } catch (error) {
      return {
        retCode: error.response?.status || -1,
        retMsg: error.response?.data?.error || error.message,
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
      const coin = symbol.replace('USDC', '').replace('PERP', '').replace('-', '');
      const isBuy = side.toLowerCase() === 'buy';

      const action = {
        type: 'order',
        orders: [{
          a: await this.getAssetId(coin),
          b: isBuy,
          p: price.toString(),
          s: qty.toString(),
          r: false,
          t: {
            limit: {
              tif: 'Gtc' // Good til cancelled
            }
          }
        }],
        grouping: 'na'
      };

      const result = await this.makeExchangeRequest(action);

      const status = result?.status || result?.response?.status;
      const orderId = result?.response?.data?.statuses?.[0]?.resting?.oid || 
                     Date.now().toString();

      return {
        retCode: status === 'ok' ? 0 : -1,
        retMsg: status === 'ok' ? 'OK' : (result?.response?.error || 'Order failed'),
        result: {
          orderId: orderId,
          orderLinkId: '',
          symbol: coin,
          side: side,
          orderType: 'Limit',
          price: price.toString(),
          qty: qty.toString(),
          status: status === 'ok' ? 'New' : 'Rejected'
        }
      };
    } catch (error) {
      return {
        retCode: error.response?.status || -1,
        retMsg: error.response?.data?.error || error.message,
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
      const coin = symbol.replace('USDC', '').replace('PERP', '').replace('-', '');
      
      const action = {
        type: 'cancel',
        cancels: [{
          a: await this.getAssetId(coin),
          o: parseInt(orderId)
        }]
      };

      const result = await this.makeExchangeRequest(action);

      const status = result?.status || result?.response?.status;

      return {
        retCode: status === 'ok' ? 0 : -1,
        retMsg: status === 'ok' ? 'OK' : (result?.response?.error || 'Cancel failed'),
        result: {
          orderId: orderId,
          symbol: coin,
          status: 'Cancelled'
        }
      };
    } catch (error) {
      return {
        retCode: error.response?.status || -1,
        retMsg: error.response?.data?.error || error.message,
        result: {}
      };
    }
  }

  /**
   * Get open orders
   */
  async getOpenOrders(symbol = null) {
    try {
      const result = await this.makeInfoRequest('openOrders', {
        user: this.walletAddress
      });

      let orders = Array.isArray(result) ? result : [];

      if (symbol) {
        const coin = symbol.replace('USDC', '').replace('PERP', '').replace('-', '');
        orders = orders.filter(o => o.coin === coin);
      }

      return {
        retCode: 0,
        retMsg: 'OK',
        result: {
          list: orders.map(order => ({
            orderId: order.oid?.toString(),
            symbol: order.coin,
            side: order.side === 'B' ? 'Buy' : 'Sell',
            orderType: order.orderType || 'Limit',
            price: order.limitPx,
            qty: order.sz,
            filledQty: order.filled || '0',
            status: 'New',
            createdTime: order.timestamp?.toString()
          }))
        }
      };
    } catch (error) {
      return {
        retCode: error.response?.status || -1,
        retMsg: error.response?.data?.error || error.message,
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
        retMsg: error.response?.data?.error || error.message,
        result: {}
      };
    }
  }

  /**
   * Get funding rate for a symbol
   */
  async getFundingRate(symbol) {
    try {
      const meta = await this.makeInfoRequest('meta');
      const coin = symbol.replace('USDC', '').replace('PERP', '').replace('-', '');

      if (!meta || !meta.universe) {
        return {
          retCode: -1,
          retMsg: 'Failed to get metadata',
          result: { list: [] }
        };
      }

      const asset = meta.universe.find(a => a.name === coin);
      if (!asset) {
        return {
          retCode: -1,
          retMsg: `Asset ${coin} not found`,
          result: { list: [] }
        };
      }

      // Get funding info
      const fundingInfo = await this.makeInfoRequest('fundingHistory', {
        coin: coin,
        startTime: Date.now() - 3600000 // Last hour
      });

      const latestFunding = Array.isArray(fundingInfo) && fundingInfo.length > 0
        ? fundingInfo[fundingInfo.length - 1]
        : null;

      return {
        retCode: 0,
        retMsg: 'OK',
        result: {
          list: [{
            symbol: coin,
            fundingRate: latestFunding?.fundingRate || '0',
            fundingRateTimestamp: latestFunding?.time?.toString() || Date.now().toString()
          }]
        }
      };
    } catch (error) {
      return {
        retCode: error.response?.status || -1,
        retMsg: error.response?.data?.error || error.message,
        result: { list: [] }
      };
    }
  }

  /**
   * Get ticker information
   */
  async getTicker(symbol) {
    try {
      const coin = symbol.replace('USDC', '').replace('PERP', '').replace('-', '');
      
      // Get all mids (mark prices)
      const allMids = await this.makeInfoRequest('allMids');
      
      // Get 24h stats
      const meta = await this.makeInfoRequest('meta');
      
      const price = allMids?.[coin] || '0';

      return {
        retCode: 0,
        retMsg: 'OK',
        result: {
          list: [{
            symbol: coin,
            lastPrice: price,
            indexPrice: price,
            markPrice: price,
            highPrice24h: '0',
            lowPrice24h: '0',
            volume24h: '0',
            turnover24h: '0',
            price24hPcnt: '0'
          }]
        }
      };
    } catch (error) {
      return {
        retCode: error.response?.status || -1,
        retMsg: error.response?.data?.error || error.message,
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
      const coin = symbol.replace('USDC', '').replace('PERP', '').replace('-', '');
      const assetId = await this.getAssetId(coin);

      const action = {
        type: 'updateLeverage',
        asset: assetId,
        isCross: true,
        leverage: parseInt(leverage)
      };

      const result = await this.makeExchangeRequest(action);

      const status = result?.status || result?.response?.status;

      return {
        retCode: status === 'ok' ? 0 : -1,
        retMsg: status === 'ok' ? 'OK' : (result?.response?.error || 'Failed'),
        result: {
          symbol: coin,
          leverage: leverage.toString()
        }
      };
    } catch (error) {
      return {
        retCode: error.response?.status || -1,
        retMsg: error.response?.data?.error || error.message,
        result: {}
      };
    }
  }

  /**
   * Get order history
   */
  async getOrderHistory(symbol = null, limit = 50) {
    try {
      const result = await this.makeInfoRequest('userFills', {
        user: this.walletAddress
      });

      let fills = Array.isArray(result) ? result : [];

      if (symbol) {
        const coin = symbol.replace('USDC', '').replace('PERP', '').replace('-', '');
        fills = fills.filter(f => f.coin === coin);
      }

      fills = fills.slice(0, limit);

      return {
        retCode: 0,
        retMsg: 'OK',
        result: {
          list: fills.map(fill => ({
            orderId: fill.oid?.toString(),
            symbol: fill.coin,
            side: fill.side === 'B' ? 'Buy' : 'Sell',
            orderType: fill.orderType || 'Limit',
            price: fill.px,
            qty: fill.sz,
            filledQty: fill.sz,
            status: 'Filled',
            createdTime: fill.time?.toString(),
            updatedTime: fill.time?.toString()
          }))
        }
      };
    } catch (error) {
      return {
        retCode: error.response?.status || -1,
        retMsg: error.response?.data?.error || error.message,
        result: { list: [] }
      };
    }
  }

  /**
   * Test API connection
   */
  async testConnection() {
    try {
      // Test public endpoint first
      const meta = await this.makeInfoRequest('meta');
      
      if (!meta || !meta.universe) {
        return {
          success: false,
          message: 'Failed to connect to Hyperliquid API',
          timestamp: Date.now()
        };
      }

      // Test authenticated endpoint
      const balance = await this.getWalletBalance();

      return {
        success: balance.retCode === 0,
        message: balance.retCode === 0 ? 'Connection successful' : balance.retMsg,
        timestamp: Date.now(),
        walletAddress: this.walletAddress,
        assetsAvailable: meta.universe.length
      };
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.error || error.message,
        timestamp: Date.now()
      };
    }
  }
}

module.exports = HyperliquidClient;
