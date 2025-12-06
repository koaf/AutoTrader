/**
 * 取引所クライアントファクトリー
 * 指定された取引所に応じた適切なクライアントインスタンスを生成
 */

const BybitClient = require('./bybitClient');
const BinanceClient = require('./binanceClient');
const OkxClient = require('./okxClient');
const GateioClient = require('./gateioClient');
const AsterClient = require('./asterClient');
const HyperliquidClient = require('./hyperliquidClient');
const EdgexClient = require('./edgexClient');

// サポートする取引所の設定
const EXCHANGE_CONFIG = {
  bybit: {
    name: 'Bybit',
    client: BybitClient,
    hasTestnet: true,
    needsPassphrase: false,
    needsWalletAddress: false,
    category: 'cex',
    description: 'Bybit インバース無期限'
  },
  binance: {
    name: 'Binance',
    client: BinanceClient,
    hasTestnet: true,
    needsPassphrase: false,
    needsWalletAddress: false,
    category: 'cex',
    description: 'Binance USDS-M Futures'
  },
  okx: {
    name: 'OKX',
    client: OkxClient,
    hasTestnet: true,
    needsPassphrase: true,
    needsWalletAddress: false,
    category: 'cex',
    description: 'OKX Perpetual Swap'
  },
  gateio: {
    name: 'Gate.io',
    client: GateioClient,
    hasTestnet: true,
    needsPassphrase: false,
    needsWalletAddress: false,
    category: 'cex',
    description: 'Gate.io USDT Perpetual'
  },
  aster: {
    name: 'Aster DEX',
    client: AsterClient,
    hasTestnet: false,
    needsPassphrase: false,
    needsWalletAddress: false,
    category: 'dex',
    description: 'Aster DEX USDT-M Perpetual'
  },
  hyperliquid: {
    name: 'Hyperliquid',
    client: HyperliquidClient,
    hasTestnet: true,
    needsPassphrase: false,
    needsWalletAddress: true,
    category: 'dex',
    description: 'Hyperliquid L1 DEX (USDC Perpetual)'
  },
  edgex: {
    name: 'EdgeX',
    client: EdgexClient,
    hasTestnet: true,
    needsPassphrase: false,
    needsWalletAddress: false,
    category: 'dex',
    description: 'EdgeX StarkEx L2 (USDC Perpetual)'
  }
};

class ExchangeFactory {
  /**
   * 取引所クライアントを作成
   * @param {string} exchange - 取引所名 (bybit, binance, etc.)
   * @param {Object} credentials - API認証情報
   * @param {string} credentials.apiKey - APIキー
   * @param {string} credentials.apiSecret - APIシークレット
   * @param {boolean} credentials.isTestnet - テストネット使用フラグ
   * @param {string} credentials.passphrase - パスフレーズ (OKX用)
   * @param {string} credentials.walletAddress - ウォレットアドレス (DEX用)
   * @returns {Object} 取引所クライアントインスタンス
   */
  static createClient(exchange, credentials) {
    const config = EXCHANGE_CONFIG[exchange];
    
    if (!config) {
      throw new Error(`Unsupported exchange: ${exchange}`);
    }
    
    if (!config.client) {
      throw new Error(`Exchange client not implemented: ${exchange}`);
    }

    const { apiKey, apiSecret, isTestnet, passphrase, walletAddress } = credentials;

    // 取引所ごとにクライアントを初期化
    switch (exchange) {
      case 'bybit':
        return new BybitClient(apiKey, apiSecret, isTestnet);
      
      case 'binance':
        return new BinanceClient(apiKey, apiSecret, isTestnet);
      
      case 'okx':
        return new OkxClient(apiKey, apiSecret, passphrase, isTestnet);
      
      case 'gateio':
        return new GateioClient(apiKey, apiSecret, isTestnet);
      
      case 'aster':
        return new AsterClient(apiKey, apiSecret, isTestnet);
      
      case 'hyperliquid':
        // Hyperliquid: apiKey = wallet address, apiSecret = private key
        return new HyperliquidClient(apiKey, apiSecret, isTestnet);
      
      case 'edgex':
        return new EdgexClient(apiKey, apiSecret, isTestnet);
      
      default:
        throw new Error(`Unknown exchange: ${exchange}`);
    }
  }

  /**
   * ApiKeyドキュメントからクライアントを作成
   * @param {Object} apiKeyDoc - MongooseのApiKeyドキュメント
   * @returns {Object} 取引所クライアントインスタンス
   */
  static createClientFromApiKey(apiKeyDoc) {
    const exchange = apiKeyDoc.exchange || 'bybit';
    const credentials = {
      apiKey: apiKeyDoc.decryptApiKey(),
      apiSecret: apiKeyDoc.decryptApiSecret(),
      isTestnet: apiKeyDoc.isTestnet,
      passphrase: apiKeyDoc.decryptPassphrase ? apiKeyDoc.decryptPassphrase() : null,
      walletAddress: apiKeyDoc.decryptWalletAddress ? apiKeyDoc.decryptWalletAddress() : null
    };
    
    return this.createClient(exchange, credentials);
  }

  /**
   * サポートされている取引所のリストを取得
   * @param {boolean} onlyImplemented - 実装済みのみ取得
   * @returns {Array} 取引所情報の配列
   */
  static getSupportedExchanges(onlyImplemented = false) {
    const exchanges = Object.entries(EXCHANGE_CONFIG).map(([key, config]) => ({
      id: key,
      name: config.name,
      description: config.description,
      category: config.category,
      hasTestnet: config.hasTestnet,
      needsPassphrase: config.needsPassphrase,
      needsWalletAddress: config.needsWalletAddress,
      isImplemented: config.client !== null
    }));

    if (onlyImplemented) {
      return exchanges.filter(e => e.isImplemented);
    }
    return exchanges;
  }

  /**
   * 取引所がサポートされているか確認
   * @param {string} exchange - 取引所名
   * @returns {boolean}
   */
  static isSupported(exchange) {
    return exchange in EXCHANGE_CONFIG;
  }

  /**
   * 取引所が実装済みか確認
   * @param {string} exchange - 取引所名
   * @returns {boolean}
   */
  static isImplemented(exchange) {
    return EXCHANGE_CONFIG[exchange]?.client !== null;
  }

  /**
   * 取引所の設定情報を取得
   * @param {string} exchange - 取引所名
   * @returns {Object|null}
   */
  static getExchangeConfig(exchange) {
    return EXCHANGE_CONFIG[exchange] || null;
  }
}

module.exports = ExchangeFactory;
