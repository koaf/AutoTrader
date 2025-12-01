import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import api from '../../services/api';
import './AdminUserDetail.css';

const AVAILABLE_CURRENCIES = [
  { symbol: 'BTC', name: 'Bitcoin' },
  { symbol: 'ETH', name: 'Ethereum' },
  { symbol: 'EOS', name: 'EOS' },
  { symbol: 'XRP', name: 'Ripple' }
];

const AdminUserDetail = () => {
  const { userId } = useParams();
  const navigate = useNavigate();
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currencies, setCurrencies] = useState([]);

  useEffect(() => {
    fetchUserDetail();
  }, [userId]);

  const fetchUserDetail = async () => {
    try {
      const response = await api.get(`/admin/users/${userId}`);
      setUserData(response.data);
      
      // 通貨設定を初期化
      const userCurrencies = response.data.user.enabledCurrencies || [];
      const merged = AVAILABLE_CURRENCIES.map(c => {
        const uc = userCurrencies.find(u => u.symbol === c.symbol);
        return { ...c, enabled: uc ? uc.enabled : false };
      });
      setCurrencies(merged);
    } catch (error) {
      console.error('Fetch user detail error:', error);
      toast.error('ユーザー情報の取得に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const toggleActive = async () => {
    try {
      await api.put(`/admin/users/${userId}/active`, { isActive: !userData.user.isActive });
      toast.success(userData.user.isActive ? 'ユーザーを無効化しました' : 'ユーザーを有効化しました');
      fetchUserDetail();
    } catch (error) {
      toast.error(error.response?.data?.message || 'エラーが発生しました');
    }
  };

  const toggleTrading = async () => {
    try {
      await api.put(`/admin/users/${userId}/trading`, { tradingEnabled: !userData.user.tradingEnabled });
      toast.success(userData.user.tradingEnabled ? '取引を停止しました' : '取引を有効化しました');
      fetchUserDetail();
    } catch (error) {
      toast.error(error.response?.data?.message || 'エラーが発生しました');
    }
  };

  const toggleCurrency = (symbol) => {
    setCurrencies(prev =>
      prev.map(c => c.symbol === symbol ? { ...c, enabled: !c.enabled } : c)
    );
  };

  const saveCurrencies = async () => {
    try {
      const currencySettings = currencies.map(c => ({
        symbol: c.symbol,
        enabled: c.enabled
      }));
      await api.put(`/admin/users/${userId}/currencies`, { currencies: currencySettings });
      toast.success('通貨設定を保存しました');
    } catch (error) {
      toast.error(error.response?.data?.message || '保存に失敗しました');
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleString('ja-JP');
  };

  if (loading) {
    return <div className="page-loading">読み込み中...</div>;
  }

  if (!userData) {
    return <div className="error-message">ユーザーが見つかりません</div>;
  }

  const { user, recentTrades, latestAsset } = userData;

  return (
    <div className="admin-user-detail">
      <div className="page-header">
        <button className="back-btn" onClick={() => navigate('/admin/users')}>
          ← ユーザー一覧へ
        </button>
        <h1>{user.username}</h1>
      </div>

      {/* ユーザー情報 */}
      <section className="user-info-section">
        <h2 className="section-title">ユーザー情報</h2>
        <div className="info-grid">
          <div className="info-item">
            <span className="label">メールアドレス</span>
            <span className="value">{user.email}</span>
          </div>
          <div className="info-item">
            <span className="label">ユーザー名</span>
            <span className="value">{user.username}</span>
          </div>
          <div className="info-item">
            <span className="label">ステータス</span>
            <span className={`value badge ${user.isActive ? 'active' : 'inactive'}`}>
              {user.isActive ? '有効' : '無効'}
            </span>
          </div>
          <div className="info-item">
            <span className="label">自動取引</span>
            <span className={`value badge ${user.tradingEnabled ? 'trading' : 'not-trading'}`}>
              {user.tradingEnabled ? 'ON' : 'OFF'}
            </span>
          </div>
          <div className="info-item">
            <span className="label">APIキー</span>
            <span className={`value badge ${user.hasApiKey ? 'has-key' : 'no-key'}`}>
              {user.hasApiKey ? '登録済' : '未登録'}
            </span>
          </div>
          <div className="info-item">
            <span className="label">登録日</span>
            <span className="value">{formatDate(user.createdAt)}</span>
          </div>
          <div className="info-item">
            <span className="label">最終ログイン</span>
            <span className="value">{formatDate(user.lastLogin)}</span>
          </div>
        </div>
        
        <div className="action-buttons">
          <button
            className={`action-btn ${user.isActive ? 'deactivate' : 'activate'}`}
            onClick={toggleActive}
          >
            {user.isActive ? 'ユーザーを無効化' : 'ユーザーを有効化'}
          </button>
          <button
            className={`action-btn ${user.tradingEnabled ? 'stop' : 'start'}`}
            onClick={toggleTrading}
          >
            {user.tradingEnabled ? '取引を停止' : '取引を開始'}
          </button>
        </div>
      </section>

      {/* 通貨設定 */}
      <section className="currency-section">
        <h2 className="section-title">通貨設定</h2>
        <div className="currency-grid">
          {currencies.map((currency) => (
            <div
              key={currency.symbol}
              className={`currency-item ${currency.enabled ? 'enabled' : ''}`}
              onClick={() => toggleCurrency(currency.symbol)}
            >
              <span className="currency-symbol">{currency.symbol}</span>
              <span className="currency-name">{currency.name}</span>
              <div className={`toggle ${currency.enabled ? 'on' : 'off'}`}>
                <div className="toggle-slider"></div>
              </div>
            </div>
          ))}
        </div>
        <button className="save-btn" onClick={saveCurrencies}>
          通貨設定を保存
        </button>
      </section>

      {/* 最新資産 */}
      <section className="asset-section">
        <h2 className="section-title">最新資産状況</h2>
        {latestAsset && latestAsset.length > 0 ? (
          <div className="asset-grid">
            {latestAsset.map((asset, idx) => (
              <div key={idx} className="asset-card">
                <span className="asset-currency">{asset.currency}</span>
                <span className="asset-balance">{parseFloat(asset.totalEquity).toFixed(8)}</span>
              </div>
            ))}
          </div>
        ) : (
          <div className="empty-message">資産データがありません</div>
        )}
      </section>

      {/* 最近の取引 */}
      <section className="trades-section">
        <h2 className="section-title">最近の取引</h2>
        {recentTrades && recentTrades.length > 0 ? (
          <div className="table-wrapper">
            <table className="trades-table">
              <thead>
                <tr>
                  <th>日時</th>
                  <th>シンボル</th>
                  <th>売買</th>
                  <th>数量</th>
                  <th>価格</th>
                  <th>ステータス</th>
                </tr>
              </thead>
              <tbody>
                {recentTrades.map((trade) => (
                  <tr key={trade._id}>
                    <td className="date">{formatDate(trade.executedAt)}</td>
                    <td className="symbol">{trade.symbol}</td>
                    <td className={trade.side === 'Buy' ? 'buy' : 'sell'}>
                      {trade.side === 'Buy' ? '買' : '売'}
                    </td>
                    <td>{trade.quantity}</td>
                    <td>{parseFloat(trade.price).toFixed(2)}</td>
                    <td>
                      <span className={`badge ${trade.status.toLowerCase()}`}>
                        {trade.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="empty-message">取引履歴がありません</div>
        )}
      </section>
    </div>
  );
};

export default AdminUserDetail;
