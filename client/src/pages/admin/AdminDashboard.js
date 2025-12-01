import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import api from '../../services/api';
import './AdminDashboard.css';

const AdminDashboard = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboard();
  }, []);

  const fetchDashboard = async () => {
    try {
      const response = await api.get('/admin/dashboard');
      setStats(response.data);
    } catch (error) {
      console.error('Fetch dashboard error:', error);
      toast.error('データの取得に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const handleSchedulerAction = async (action) => {
    try {
      const response = await api.post('/admin/system/scheduler', { action });
      toast.success(response.data.message);
      fetchDashboard();
    } catch (error) {
      toast.error(error.response?.data?.message || 'エラーが発生しました');
    }
  };

  if (loading) {
    return <div className="page-loading">読み込み中...</div>;
  }

  return (
    <div className="admin-dashboard">
      <div className="page-header">
        <h1>管理者ダッシュボード</h1>
      </div>

      {/* スケジューラー状態 */}
      <section className="scheduler-section">
        <div className="scheduler-card">
          <div className="scheduler-status">
            <span className={`status-indicator ${stats?.scheduler?.isRunning ? 'running' : 'stopped'}`}></span>
            <span className="status-text">
              自動取引スケジューラー: {stats?.scheduler?.isRunning ? '稼働中' : '停止中'}
            </span>
          </div>
          <div className="scheduler-actions">
            {stats?.scheduler?.isRunning ? (
              <button className="stop-btn" onClick={() => handleSchedulerAction('stop')}>
                停止
              </button>
            ) : (
              <button className="start-btn" onClick={() => handleSchedulerAction('start')}>
                開始
              </button>
            )}
          </div>
        </div>
      </section>

      {/* 統計カード */}
      <section className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon">👥</div>
          <div className="stat-content">
            <span className="stat-value">{stats?.users?.total || 0}</span>
            <span className="stat-label">総ユーザー数</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">✅</div>
          <div className="stat-content">
            <span className="stat-value">{stats?.users?.newToday || 0}</span>
            <span className="stat-label">今日の新規登録</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">📈</div>
          <div className="stat-content">
            <span className="stat-value">{stats?.trades?.today?.count || 0}</span>
            <span className="stat-label">今日の取引数</span>
          </div>
        </div>
        <div className="stat-card warning">
          <div className="stat-icon">⚠️</div>
          <div className="stat-content">
            <span className="stat-value">{stats?.errors?.byDay?.reduce((a, b) => a + b.count, 0) || 0}</span>
            <span className="stat-label">週間エラー数</span>
          </div>
        </div>
      </section>

      {/* ユーザー概要 */}
      <section className="overview-section">
        <h2 className="section-title">ユーザー概要</h2>
        <div className="overview-grid">
          <div className="overview-card">
            <span className="overview-label">総ユーザー</span>
            <span className="overview-value">{stats?.users?.total || 0} 人</span>
          </div>
          <div className="overview-card">
            <span className="overview-label">今週の新規</span>
            <span className="overview-value">{stats?.users?.newThisWeek || 0} 人</span>
          </div>
        </div>
      </section>

      {/* システム情報 */}
      <section className="info-section">
        <h2 className="section-title">システム情報</h2>
        <div className="info-grid">
          <div className="info-item">
            <span className="info-label">取引スケジュール</span>
            <span className="info-value">9:00 / 17:00 / 1:00 (JST)</span>
          </div>
          <div className="info-item">
            <span className="info-label">レバレッジ</span>
            <span className="info-value">1倍（固定）</span>
          </div>
          <div className="info-item">
            <span className="info-label">対応通貨</span>
            <span className="info-value">BTC, ETH, EOS, XRP</span>
          </div>
          <div className="info-item">
            <span className="info-label">契約タイプ</span>
            <span className="info-value">インバース無期限</span>
          </div>
        </div>
      </section>
    </div>
  );
};

export default AdminDashboard;
