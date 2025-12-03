import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import './Account.css';

const Account = () => {
  const { user, updateUser } = useAuth();
  const [activeTab, setActiveTab] = useState('profile');
  
  // Profile
  const [username, setUsername] = useState('');
  
  // Password
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  // API Key (マルチ取引所対応)
  const [exchanges, setExchanges] = useState([]);
  const [selectedExchange, setSelectedExchange] = useState('bybit');
  const [apiKey, setApiKey] = useState('');
  const [apiSecret, setApiSecret] = useState('');
  const [passphrase, setPassphrase] = useState('');
  const [walletAddress, setWalletAddress] = useState('');
  const [isTestnet, setIsTestnet] = useState(false);
  const [registeredApiKeys, setRegisteredApiKeys] = useState([]);
  
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) {
      setUsername(user.username);
    }
    fetchExchanges();
    checkApiKeys();
  }, [user]);

  const fetchExchanges = async () => {
    try {
      const response = await api.get('/apikey/exchanges?implemented=true');
      setExchanges(response.data.exchanges || []);
    } catch (error) {
      console.error('Fetch exchanges error:', error);
    }
  };

  const checkApiKeys = async () => {
    try {
      const response = await api.get('/apikey');
      setRegisteredApiKeys(response.data.apiKeys || []);
    } catch (error) {
      console.error('API key check error:', error);
    }
  };

  const getSelectedExchangeConfig = () => {
    return exchanges.find(e => e.id === selectedExchange) || {};
  };

  const handleProfileUpdate = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const response = await api.put('/auth/profile', { username });
      updateUser({ username: response.data.user.username });
      toast.success('プロフィールを更新しました');
    } catch (error) {
      toast.error(error.response?.data?.message || '更新に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      toast.error('新しいパスワードが一致しません');
      return;
    }
    setLoading(true);
    try {
      await api.put('/auth/password', { currentPassword, newPassword });
      toast.success('パスワードを変更しました');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error) {
      toast.error(error.response?.data?.message || '変更に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const handleApiKeyRegister = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const payload = { 
        exchange: selectedExchange,
        apiKey, 
        apiSecret, 
        isTestnet 
      };
      
      // 取引所固有のフィールドを追加
      const config = getSelectedExchangeConfig();
      if (config.needsPassphrase && passphrase) {
        payload.passphrase = passphrase;
      }
      if (config.needsWalletAddress && walletAddress) {
        payload.walletAddress = walletAddress;
      }
      
      await api.post('/apikey', payload);
      toast.success(`${config.name || selectedExchange}のAPIキーを登録しました`);
      setApiKey('');
      setApiSecret('');
      setPassphrase('');
      setWalletAddress('');
      checkApiKeys();
    } catch (error) {
      toast.error(error.response?.data?.message || '登録に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const handleApiKeyDelete = async (exchange) => {
    const exchangeConfig = exchanges.find(e => e.id === exchange);
    const exchangeName = exchangeConfig?.name || exchange;
    
    if (!window.confirm(`${exchangeName}のAPIキーを削除しますか？`)) return;
    setLoading(true);
    try {
      await api.delete(`/apikey/${exchange}`);
      toast.success(`${exchangeName}のAPIキーを削除しました`);
      checkApiKeys();
    } catch (error) {
      toast.error(error.response?.data?.message || '削除に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const handleApiKeyValidate = async (exchange = null) => {
    setLoading(true);
    try {
      const response = await api.post('/apikey/validate', { exchange });
      const results = response.data.results || [];
      
      results.forEach(result => {
        if (result.isValid) {
          toast.success(`${result.exchange}: APIキーは有効です`);
        } else {
          toast.warning(`${result.exchange}: ${result.message}`);
        }
      });
      
      checkApiKeys();
    } catch (error) {
      toast.error(error.response?.data?.message || '検証に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const config = getSelectedExchangeConfig();

  return (
    <div className="account">
      <div className="page-header">
        <h1>アカウント設定</h1>
      </div>

      <div className="tabs">
        <button
          className={`tab ${activeTab === 'profile' ? 'active' : ''}`}
          onClick={() => setActiveTab('profile')}
        >
          プロフィール
        </button>
        <button
          className={`tab ${activeTab === 'password' ? 'active' : ''}`}
          onClick={() => setActiveTab('password')}
        >
          パスワード変更
        </button>
        <button
          className={`tab ${activeTab === 'apikey' ? 'active' : ''}`}
          onClick={() => setActiveTab('apikey')}
        >
          API設定
        </button>
      </div>

      <div className="tab-content">
        {/* Profile Tab */}
        {activeTab === 'profile' && (
          <form onSubmit={handleProfileUpdate} className="account-form">
            <h2>プロフィール情報</h2>
            
            <div className="form-group">
              <label>メールアドレス</label>
              <input type="email" value={user?.email || ''} disabled />
              <span className="hint">メールアドレスは変更できません</span>
            </div>

            <div className="form-group">
              <label htmlFor="username">ユーザー名</label>
              <input
                type="text"
                id="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label>登録日</label>
              <input
                type="text"
                value={user?.createdAt ? new Date(user.createdAt).toLocaleDateString('ja-JP') : ''}
                disabled
              />
            </div>

            <button type="submit" className="submit-btn" disabled={loading}>
              {loading ? '更新中...' : '更新'}
            </button>
          </form>
        )}

        {/* Password Tab */}
        {activeTab === 'password' && (
          <form onSubmit={handlePasswordChange} className="account-form">
            <h2>パスワード変更</h2>

            <div className="form-group">
              <label htmlFor="currentPassword">現在のパスワード</label>
              <input
                type="password"
                id="currentPassword"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="newPassword">新しいパスワード</label>
              <input
                type="password"
                id="newPassword"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                minLength={6}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="confirmPassword">新しいパスワード（確認）</label>
              <input
                type="password"
                id="confirmPassword"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
            </div>

            <button type="submit" className="submit-btn" disabled={loading}>
              {loading ? '変更中...' : 'パスワードを変更'}
            </button>
          </form>
        )}

        {/* API Key Tab */}
        {activeTab === 'apikey' && (
          <div className="account-form">
            <h2>取引所API設定</h2>

            {/* 登録済みAPIキー一覧 */}
            {registeredApiKeys.length > 0 && (
              <div className="registered-apikeys">
                <h3>登録済み取引所</h3>
                <div className="apikey-list">
                  {registeredApiKeys.map(key => {
                    const exchangeConfig = exchanges.find(e => e.id === key.exchange);
                    return (
                      <div key={key.id} className="apikey-card">
                        <div className="apikey-header">
                          <span className="exchange-name">{exchangeConfig?.name || key.exchange}</span>
                          <span className={`status-badge ${key.isValid ? 'valid' : 'invalid'}`}>
                            {key.isValid ? '有効' : '無効'}
                          </span>
                        </div>
                        <div className="apikey-body">
                          <span className="env-badge">{key.isTestnet ? 'テストネット' : '本番環境'}</span>
                          <span className="date">
                            登録: {new Date(key.createdAt).toLocaleDateString('ja-JP')}
                          </span>
                        </div>
                        <div className="apikey-actions">
                          <button 
                            className="validate-btn" 
                            onClick={() => handleApiKeyValidate(key.exchange)} 
                            disabled={loading}
                          >
                            検証
                          </button>
                          <button 
                            className="delete-btn" 
                            onClick={() => handleApiKeyDelete(key.exchange)} 
                            disabled={loading}
                          >
                            削除
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* 新規APIキー登録フォーム */}
            <div className="new-apikey-section">
              <h3>{registeredApiKeys.length > 0 ? '新しい取引所を追加' : 'APIキーを登録'}</h3>
              
              <form onSubmit={handleApiKeyRegister}>
                <div className="form-group">
                  <label htmlFor="exchange">取引所</label>
                  <select
                    id="exchange"
                    value={selectedExchange}
                    onChange={(e) => setSelectedExchange(e.target.value)}
                    required
                  >
                    {exchanges.map(ex => (
                      <option key={ex.id} value={ex.id}>
                        {ex.name} - {ex.description}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label htmlFor="apiKey">APIキー</label>
                  <input
                    type="text"
                    id="apiKey"
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    placeholder={`${config.name || selectedExchange} APIキーを入力`}
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="apiSecret">APIシークレット</label>
                  <input
                    type="password"
                    id="apiSecret"
                    value={apiSecret}
                    onChange={(e) => setApiSecret(e.target.value)}
                    placeholder={`${config.name || selectedExchange} APIシークレットを入力`}
                    required
                  />
                </div>

                {/* OKX用パスフレーズ */}
                {config.needsPassphrase && (
                  <div className="form-group">
                    <label htmlFor="passphrase">パスフレーズ</label>
                    <input
                      type="password"
                      id="passphrase"
                      value={passphrase}
                      onChange={(e) => setPassphrase(e.target.value)}
                      placeholder="APIパスフレーズを入力"
                      required
                    />
                  </div>
                )}

                {/* DEX用ウォレットアドレス */}
                {config.needsWalletAddress && (
                  <div className="form-group">
                    <label htmlFor="walletAddress">ウォレットアドレス</label>
                    <input
                      type="text"
                      id="walletAddress"
                      value={walletAddress}
                      onChange={(e) => setWalletAddress(e.target.value)}
                      placeholder="0x..."
                      required
                    />
                  </div>
                )}

                {/* テストネット選択（対応取引所のみ） */}
                {config.hasTestnet && (
                  <div className="form-group checkbox-group">
                    <label className="checkbox-label">
                      <input
                        type="checkbox"
                        checked={isTestnet}
                        onChange={(e) => setIsTestnet(e.target.checked)}
                      />
                      <span>テストネット環境を使用</span>
                    </label>
                  </div>
                )}

                <div className="form-notice">
                  <p>※ APIキーには「Trade」権限が必要です。</p>
                  <p>※ APIキーは暗号化して保存されます。</p>
                  {config.category === 'dex' && (
                    <p>※ DEXではWeb3署名が使用されます。</p>
                  )}
                </div>

                <button type="submit" className="submit-btn" disabled={loading}>
                  {loading ? '登録中...' : 'APIキーを登録'}
                </button>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Account;
