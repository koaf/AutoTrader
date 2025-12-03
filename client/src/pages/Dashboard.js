import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import './Dashboard.css';

const Dashboard = () => {
  const { user, updateUser } = useAuth();
  const [wallets, setWallets] = useState([]);
  const [allPositions, setAllPositions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [apiKeys, setApiKeys] = useState([]);
  const [closing, setClosing] = useState(false);
  const [selectedExchange, setSelectedExchange] = useState('all');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      // APIキー状態確認
      const apiKeyRes = await api.get('/apikey');
      const keys = apiKeyRes.data.apiKeys || [];
      setApiKeys(keys);

      if (keys.length > 0) {
        // 全取引所のウォレット・ポジション情報取得
        const [walletRes, positionsRes] = await Promise.all([
          api.get('/trading/wallet'),
          api.get('/trading/positions')
        ]);
        setWallets(walletRes.data.wallets || []);
        setAllPositions(positionsRes.data.positions || []);
      }
    } catch (error) {
      console.error('Fetch data error:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleTrading = async () => {
    try {
      const newStatus = !user.tradingEnabled;
      const response = await api.post('/trading/toggle', { enabled: newStatus });
      updateUser({ tradingEnabled: newStatus });
      toast.success(response.data.message);
    } catch (error) {
      toast.error(error.response?.data?.message || 'エラーが発生しました');
    }
  };

  const closeAllPositions = async (exchange) => {
    if (!window.confirm(`${exchange}の全てのポジションを決済しますか？`)) return;
    
    setClosing(true);
    try {
      await api.post('/trading/close-all', { exchange });
      toast.success(`${exchange}の全ポジションを決済しました`);
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.message || '決済に失敗しました');
    } finally {
      setClosing(false);
    }
  };

  const formatNumber = (num, decimals = 8) => {
    if (num === undefined || num === null || isNaN(num)) return '-';
    return parseFloat(num).toFixed(decimals);
  };

  // フィルタリングされたデータ
  const filteredWallets = selectedExchange === 'all' 
    ? wallets 
    : wallets.filter(w => w.exchange === selectedExchange);
  
  const filteredPositions = selectedExchange === 'all'
    ? allPositions
    : allPositions.filter(p => p.exchange === selectedExchange);

  // ポジションがある取引所のリスト
  const exchangesWithPositions = [...new Set(allPositions.filter(p => p.positions?.length > 0).map(p => p.exchange))];

  if (loading) {
    return <div className="page-loading">読み込み中...</div>;
  }

  return (
    <div className="dashboard">
      <div className="page-header">
        <h1>ダッシュボード</h1>
        <div className="header-actions">
          {apiKeys.length > 0 && (
            <>
              <select 
                className="exchange-filter"
                value={selectedExchange}
                onChange={(e) => setSelectedExchange(e.target.value)}
              >
                <option value="all">全取引所</option>
                {apiKeys.map(key => (
                  <option key={key.exchange} value={key.exchange}>
                    {key.exchange.toUpperCase()}
                  </option>
                ))}
              </select>
              <button
                className={`trading-toggle ${user.tradingEnabled ? 'active' : ''}`}
                onClick={toggleTrading}
              >
                自動取引: {user.tradingEnabled ? 'ON' : 'OFF'}
              </button>
            </>
          )}
        </div>
      </div>

      {apiKeys.length === 0 ? (
        <div className="no-apikey-notice">
          <div className="notice-icon">🔑</div>
          <h2>APIキーを登録してください</h2>
          <p>取引を開始するには、取引所のAPIキーを登録する必要があります。</p>
          <a href="/account" className="notice-btn">アカウント設定へ</a>
        </div>
      ) : (
        <>
          {/* ウォレット残高（取引所ごと） */}
          <section className="dashboard-section">
            <h2 className="section-title">保有資産</h2>
            {filteredWallets.length > 0 ? (
              filteredWallets.map((exchangeWallet) => (
                <div key={exchangeWallet.exchange} className="exchange-wallet-section">
                  <div className="exchange-header">
                    <span className="exchange-name">{exchangeWallet.exchange.toUpperCase()}</span>
                    {exchangeWallet.isTestnet && <span className="testnet-badge">テストネット</span>}
                    {exchangeWallet.error && <span className="error-badge">{exchangeWallet.error}</span>}
                  </div>
                  {!exchangeWallet.error && (
                    <div className="wallet-grid">
                      {(exchangeWallet.wallet || []).map((coin) => (
                        <div className="wallet-card" key={`${exchangeWallet.exchange}-${coin.currency}`}>
                          <div className="wallet-header">
                            <span className="coin-symbol">{coin.currency}</span>
                          </div>
                          <div className="wallet-body">
                            <div className="wallet-row">
                              <span className="label">総残高</span>
                              <span className="value">{formatNumber(coin.walletBalance)}</span>
                            </div>
                            <div className="wallet-row">
                              <span className="label">利用可能</span>
                              <span className="value">{formatNumber(coin.availableBalance)}</span>
                            </div>
                            <div className="wallet-row">
                              <span className="label">使用中証拠金</span>
                              <span className="value">{formatNumber(coin.usedMargin)}</span>
                            </div>
                            <div className="wallet-row">
                              <span className="label">未実現損益</span>
                              <span className={`value ${coin.unrealizedPnl >= 0 ? 'profit' : 'loss'}`}>
                                {formatNumber(coin.unrealizedPnl)}
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))
            ) : (
              <div className="empty-message">資産データがありません</div>
            )}
          </section>

          {/* ポジション（取引所ごと） */}
          <section className="dashboard-section">
            <h2 className="section-title">建玉状況</h2>
            {filteredPositions.some(p => p.positions?.length > 0) ? (
              filteredPositions.filter(p => p.positions?.length > 0).map((exchangePos) => (
                <div key={exchangePos.exchange} className="exchange-positions-section">
                  <div className="exchange-header">
                    <div className="exchange-header-left">
                      <span className="exchange-name">{exchangePos.exchange.toUpperCase()}</span>
                      {exchangePos.isTestnet && <span className="testnet-badge">テストネット</span>}
                    </div>
                    <button
                      className="close-all-btn"
                      onClick={() => closeAllPositions(exchangePos.exchange)}
                      disabled={closing}
                    >
                      {closing ? '決済中...' : '全決済'}
                    </button>
                  </div>
                  <div className="positions-table-wrapper">
                    <table className="positions-table">
                      <thead>
                        <tr>
                          <th>シンボル</th>
                          <th>方向</th>
                          <th>数量</th>
                          <th>参入価格</th>
                          <th>現在価格</th>
                          <th>未実現損益</th>
                          <th>レバレッジ</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(exchangePos.positions || []).map((pos, idx) => (
                          <tr key={idx}>
                            <td className="symbol">{pos.symbol}</td>
                            <td className={pos.side === 'Buy' || pos.side === 'LONG' ? 'buy' : 'sell'}>
                              {pos.side === 'Buy' || pos.side === 'LONG' ? 'ロング' : 'ショート'}
                            </td>
                            <td>{pos.size}</td>
                            <td>{formatNumber(pos.entryPrice, 2)}</td>
                            <td>{formatNumber(pos.markPrice, 2)}</td>
                            <td className={pos.unrealizedPnl >= 0 ? 'profit' : 'loss'}>
                              {formatNumber(pos.unrealizedPnl, 8)}
                            </td>
                            <td>{pos.leverage}x</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))
            ) : (
              <div className="empty-message">現在ポジションはありません</div>
            )}
          </section>

          {/* システム情報 */}
          <section className="dashboard-section">
            <h2 className="section-title">システム情報</h2>
            <div className="info-grid">
              <div className="info-card">
                <span className="info-label">登録取引所</span>
                <span className="info-value">{apiKeys.map(k => k.exchange.toUpperCase()).join(', ')}</span>
              </div>
              <div className="info-card">
                <span className="info-label">自動取引</span>
                <span className={`info-value ${user.tradingEnabled ? 'active' : 'inactive'}`}>
                  {user.tradingEnabled ? '稼働中' : '停止中'}
                </span>
              </div>
              <div className="info-card">
                <span className="info-label">次回取引予定</span>
                <span className="info-value">9:00 / 17:00 / 1:00 (JST)</span>
              </div>
              <div className="info-card">
                <span className="info-label">レバレッジ</span>
                <span className="info-value">1倍（固定）</span>
              </div>
            </div>
          </section>
        </>
      )}
    </div>
  );
};

export default Dashboard;
