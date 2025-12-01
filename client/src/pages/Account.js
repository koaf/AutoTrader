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
  
  // API Key
  const [apiKey, setApiKey] = useState('');
  const [apiSecret, setApiSecret] = useState('');
  const [isTestnet, setIsTestnet] = useState(false);
  const [hasApiKey, setHasApiKey] = useState(false);
  const [apiKeyInfo, setApiKeyInfo] = useState(null);
  
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) {
      setUsername(user.username);
    }
    checkApiKey();
  }, [user]);

  const checkApiKey = async () => {
    try {
      const response = await api.get('/apikey');
      setHasApiKey(response.data.hasApiKey);
      if (response.data.hasApiKey) {
        setApiKeyInfo(response.data.apiKey);
      }
    } catch (error) {
      console.error('API key check error:', error);
    }
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
      await api.post('/apikey', { apiKey, apiSecret, isTestnet });
      toast.success('APIキーを登録しました');
      setApiKey('');
      setApiSecret('');
      checkApiKey();
    } catch (error) {
      toast.error(error.response?.data?.message || '登録に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const handleApiKeyDelete = async () => {
    if (!window.confirm('APIキーを削除しますか？自動取引も停止されます。')) return;
    setLoading(true);
    try {
      await api.delete('/apikey');
      toast.success('APIキーを削除しました');
      setHasApiKey(false);
      setApiKeyInfo(null);
      updateUser({ tradingEnabled: false });
    } catch (error) {
      toast.error(error.response?.data?.message || '削除に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const handleApiKeyValidate = async () => {
    setLoading(true);
    try {
      const response = await api.post('/apikey/validate');
      if (response.data.isValid) {
        toast.success('APIキーは有効です');
      } else {
        toast.warning('APIキーが無効です。再登録してください。');
      }
      checkApiKey();
    } catch (error) {
      toast.error(error.response?.data?.message || '検証に失敗しました');
    } finally {
      setLoading(false);
    }
  };

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
            <h2>Bybit APIキー設定</h2>

            {hasApiKey ? (
              <div className="apikey-status">
                <div className="status-card">
                  <div className="status-header">
                    <span className="status-icon">🔑</span>
                    <span className="status-text">APIキー登録済み</span>
                  </div>
                  <div className="status-body">
                    <div className="status-row">
                      <span className="label">環境</span>
                      <span className="value">{apiKeyInfo?.isTestnet ? 'テストネット' : '本番環境'}</span>
                    </div>
                    <div className="status-row">
                      <span className="label">ステータス</span>
                      <span className={`value ${apiKeyInfo?.isValid ? 'valid' : 'invalid'}`}>
                        {apiKeyInfo?.isValid ? '有効' : '無効'}
                      </span>
                    </div>
                    <div className="status-row">
                      <span className="label">登録日</span>
                      <span className="value">
                        {apiKeyInfo?.createdAt ? new Date(apiKeyInfo.createdAt).toLocaleDateString('ja-JP') : '-'}
                      </span>
                    </div>
                  </div>
                  <div className="status-actions">
                    <button className="validate-btn" onClick={handleApiKeyValidate} disabled={loading}>
                      検証
                    </button>
                    <button className="delete-btn" onClick={handleApiKeyDelete} disabled={loading}>
                      削除
                    </button>
                  </div>
                </div>
                
                <div className="reregister-section">
                  <h3>APIキーを再登録</h3>
                  <p>新しいAPIキーで上書き登録できます。</p>
                </div>
              </div>
            ) : (
              <div className="apikey-notice">
                <p>取引を開始するには、BybitのAPIキーを登録してください。</p>
                <p className="notice-detail">
                  ※ APIキーには「Trade」権限が必要です。<br />
                  ※ APIキーは暗号化して保存されます。
                </p>
              </div>
            )}

            <form onSubmit={handleApiKeyRegister}>
              <div className="form-group">
                <label htmlFor="apiKey">APIキー</label>
                <input
                  type="text"
                  id="apiKey"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="Bybit APIキーを入力"
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
                  placeholder="Bybit APIシークレットを入力"
                  required
                />
              </div>

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

              <button type="submit" className="submit-btn" disabled={loading}>
                {loading ? '登録中...' : 'APIキーを登録'}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};

export default Account;
