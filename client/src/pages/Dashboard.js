import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import './Dashboard.css';

const Dashboard = () => {
  const { user, updateUser } = useAuth();
  const [wallet, setWallet] = useState([]);
  const [positions, setPositions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [hasApiKey, setHasApiKey] = useState(false);
  const [closing, setClosing] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      // APIキー状態確認
      const apiKeyRes = await api.get('/apikey');
      setHasApiKey(apiKeyRes.data.hasApiKey);

      if (apiKeyRes.data.hasApiKey) {
        // ウォレット情報取得
        const [walletRes, positionsRes] = await Promise.all([
          api.get('/trading/wallet'),
          api.get('/trading/positions')
        ]);
        setWallet(walletRes.data.wallet || []);
        setPositions(positionsRes.data.positions || []);
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

  const closeAllPositions = async () => {
    if (!window.confirm('全てのポジションを決済しますか？')) return;
    
    setClosing(true);
    try {
      await api.post('/trading/close-all');
      toast.success('全ポジションを決済しました');
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.message || '決済に失敗しました');
    } finally {
      setClosing(false);
    }
  };

  const formatNumber = (num, decimals = 8) => {
    if (num === undefined || num === null) return '-';
    return parseFloat(num).toFixed(decimals);
  };

  if (loading) {
    return <div className="page-loading">読み込み中...</div>;
  }

  return (
    <div className="dashboard">
      <div className="page-header">
        <h1>ダッシュボード</h1>
        <div className="header-actions">
          {hasApiKey && (
            <>
              <button
                className={`trading-toggle ${user.tradingEnabled ? 'active' : ''}`}
                onClick={toggleTrading}
              >
                自動取引: {user.tradingEnabled ? 'ON' : 'OFF'}
              </button>
              {positions.length > 0 && (
                <button
                  className="close-all-btn"
                  onClick={closeAllPositions}
                  disabled={closing}
                >
                  {closing ? '決済中...' : '全決済'}
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {!hasApiKey ? (
        <div className="no-apikey-notice">
          <div className="notice-icon">🔑</div>
          <h2>APIキーを登録してください</h2>
          <p>取引を開始するには、BybitのAPIキーを登録する必要があります。</p>
          <a href="/account" className="notice-btn">アカウント設定へ</a>
        </div>
      ) : (
        <>
          {/* ウォレット残高 */}
          <section className="dashboard-section">
            <h2 className="section-title">保有資産</h2>
            <div className="wallet-grid">
              {wallet.length > 0 ? wallet.map((coin) => (
                <div className="wallet-card" key={coin.currency}>
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
              )) : (
                <div className="empty-message">資産データがありません</div>
              )}
            </div>
          </section>

          {/* ポジション */}
          <section className="dashboard-section">
            <h2 className="section-title">建玉状況</h2>
            {positions.length > 0 ? (
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
                    {positions.map((pos, idx) => (
                      <tr key={idx}>
                        <td className="symbol">{pos.symbol}</td>
                        <td className={pos.side === 'Buy' ? 'buy' : 'sell'}>
                          {pos.side === 'Buy' ? 'ロング' : 'ショート'}
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
            ) : (
              <div className="empty-message">現在ポジションはありません</div>
            )}
          </section>

          {/* システム情報 */}
          <section className="dashboard-section">
            <h2 className="section-title">システム情報</h2>
            <div className="info-grid">
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
              <div className="info-card">
                <span className="info-label">運用方式</span>
                <span className="info-value">複利運用</span>
              </div>
            </div>
          </section>
        </>
      )}
    </div>
  );
};

export default Dashboard;
