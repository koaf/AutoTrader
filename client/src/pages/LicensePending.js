import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import './LicensePending.css';

const LicensePending = () => {
  const { user, checkLicense, logout } = useAuth();
  const [checking, setChecking] = useState(false);

  const handleCheckLicense = async () => {
    setChecking(true);
    try {
      const result = await checkLicense();
      if (result.isLicensed) {
        window.location.reload();
      }
    } finally {
      setChecking(false);
    }
  };

  useEffect(() => {
    // 初回読み込み時にライセンスを確認
    handleCheckLicense();
    
    // 30秒ごとに自動確認
    const interval = setInterval(handleCheckLicense, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="license-pending-container">
      <div className="license-pending-card">
        <div className="pending-icon">⏳</div>
        <h1>ライセンス承認待ち</h1>
        <p className="user-email">{user?.email}</p>
        
        <div className="pending-message">
          <p>ご登録ありがとうございます。</p>
          <p>現在、管理者による承認をお待ちいただいております。</p>
          <p>承認が完了次第、システムをご利用いただけます。</p>
        </div>

        <div className="status-box">
          <div className="status-row">
            <span className="status-label">登録状態:</span>
            <span className="status-value registered">登録済み</span>
          </div>
          <div className="status-row">
            <span className="status-label">ライセンス:</span>
            <span className={`status-value ${user?.licenseStatus === 'active' ? 'active' : 'pending'}`}>
              {user?.licenseStatus === 'active' ? '承認済み' : 
               user?.licenseStatus === 'revoked' ? '無効' : '承認待ち'}
            </span>
          </div>
        </div>

        <div className="action-buttons">
          <button 
            className="check-button" 
            onClick={handleCheckLicense}
            disabled={checking}
          >
            {checking ? '確認中...' : 'ライセンス状態を確認'}
          </button>
          <button className="logout-button" onClick={logout}>
            ログアウト
          </button>
        </div>

        <p className="note">
          ※ 30秒ごとに自動で確認しています
        </p>
      </div>
    </div>
  );
};

export default LicensePending;
