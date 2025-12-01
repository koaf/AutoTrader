import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import './AdminLogs.css';

const AdminLogs = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
  const [filter, setFilter] = useState({ type: '', category: '' });

  useEffect(() => {
    fetchLogs();
  }, [pagination.page, filter]);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: pagination.page,
        limit: 50,
        ...(filter.type && { type: filter.type }),
        ...(filter.category && { category: filter.category })
      });
      const response = await api.get(`/admin/logs?${params}`);
      setLogs(response.data.logs);
      setPagination(response.data.pagination);
    } catch (error) {
      console.error('Fetch logs error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (key, value) => {
    setFilter(prev => ({ ...prev, [key]: value }));
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString('ja-JP');
  };

  const getTypeClass = (type) => {
    switch (type) {
      case 'error': return 'error';
      case 'warning': return 'warning';
      case 'trade': return 'trade';
      default: return 'info';
    }
  };

  return (
    <div className="admin-logs">
      <div className="page-header">
        <h1>システムログ</h1>
        <div className="header-info">
          全 {pagination.total} 件
        </div>
      </div>

      <div className="filters">
        <select
          value={filter.type}
          onChange={(e) => handleFilterChange('type', e.target.value)}
          className="filter-select"
        >
          <option value="">全タイプ</option>
          <option value="info">Info</option>
          <option value="warning">Warning</option>
          <option value="error">Error</option>
          <option value="trade">Trade</option>
          <option value="system">System</option>
        </select>
        <select
          value={filter.category}
          onChange={(e) => handleFilterChange('category', e.target.value)}
          className="filter-select"
        >
          <option value="">全カテゴリ</option>
          <option value="auth">認証</option>
          <option value="trade">取引</option>
          <option value="api">API</option>
          <option value="scheduler">スケジューラー</option>
          <option value="system">システム</option>
          <option value="admin">管理</option>
        </select>
      </div>

      {loading ? (
        <div className="page-loading">読み込み中...</div>
      ) : logs.length > 0 ? (
        <>
          <div className="logs-list">
            {logs.map((log) => (
              <div key={log._id} className={`log-item ${getTypeClass(log.type)}`}>
                <div className="log-header">
                  <span className={`log-type ${log.type}`}>{log.type.toUpperCase()}</span>
                  <span className="log-category">{log.category}</span>
                  <span className="log-date">{formatDate(log.createdAt)}</span>
                </div>
                <div className="log-message">{log.message}</div>
                {log.userId && (
                  <div className="log-user">
                    ユーザー: {log.userId?.email || log.userId}
                  </div>
                )}
                {log.details && Object.keys(log.details).length > 0 && (
                  <div className="log-details">
                    <pre>{JSON.stringify(log.details, null, 2)}</pre>
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="pagination">
            <button
              onClick={() => setPagination(p => ({ ...p, page: p.page - 1 }))}
              disabled={pagination.page === 1}
            >
              前へ
            </button>
            <span className="page-info">
              {pagination.page} / {pagination.pages} ページ
            </span>
            <button
              onClick={() => setPagination(p => ({ ...p, page: p.page + 1 }))}
              disabled={pagination.page === pagination.pages}
            >
              次へ
            </button>
          </div>
        </>
      ) : (
        <div className="empty-message">ログがありません</div>
      )}
    </div>
  );
};

export default AdminLogs;
