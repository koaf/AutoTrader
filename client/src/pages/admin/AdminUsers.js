import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import api from '../../services/api';
import './AdminUsers.css';

const AdminUsers = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetchUsers();
  }, [pagination.page, search]);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: pagination.page,
        limit: 20,
        ...(search && { search })
      });
      const response = await api.get(`/admin/users?${params}`);
      setUsers(response.data.users);
      setPagination(response.data.pagination);
    } catch (error) {
      console.error('Fetch users error:', error);
      toast.error('ユーザー一覧の取得に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const toggleActive = async (userId, isActive) => {
    try {
      await api.put(`/admin/users/${userId}/active`, { isActive: !isActive });
      toast.success(isActive ? 'ユーザーを無効化しました' : 'ユーザーを有効化しました');
      fetchUsers();
    } catch (error) {
      toast.error(error.response?.data?.message || 'エラーが発生しました');
    }
  };

  const toggleTrading = async (userId, tradingEnabled) => {
    try {
      await api.put(`/admin/users/${userId}/trading`, { tradingEnabled: !tradingEnabled });
      toast.success(tradingEnabled ? '取引を停止しました' : '取引を有効化しました');
      fetchUsers();
    } catch (error) {
      toast.error(error.response?.data?.message || 'エラーが発生しました');
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    setPagination(p => ({ ...p, page: 1 }));
  };

  return (
    <div className="admin-users">
      <div className="page-header">
        <h1>ユーザー管理</h1>
        <div className="header-info">
          全 {pagination.total} 件
        </div>
      </div>

      <form onSubmit={handleSearch} className="search-form">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="メールまたはユーザー名で検索..."
          className="search-input"
        />
        <button type="submit" className="search-btn">検索</button>
      </form>

      {loading ? (
        <div className="page-loading">読み込み中...</div>
      ) : users.length > 0 ? (
        <>
          <div className="table-wrapper">
            <table className="users-table">
              <thead>
                <tr>
                  <th>ユーザー</th>
                  <th>メール</th>
                  <th>ステータス</th>
                  <th>自動取引</th>
                  <th>APIキー</th>
                  <th>登録日</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user._id}>
                    <td className="user-cell">
                      <Link to={`/admin/users/${user._id}`} className="user-link">
                        {user.username}
                      </Link>
                    </td>
                    <td>{user.email}</td>
                    <td>
                      <span className={`badge ${user.isActive ? 'active' : 'inactive'}`}>
                        {user.isActive ? '有効' : '無効'}
                      </span>
                    </td>
                    <td>
                      <span className={`badge ${user.tradingEnabled ? 'trading' : 'not-trading'}`}>
                        {user.tradingEnabled ? 'ON' : 'OFF'}
                      </span>
                    </td>
                    <td>
                      <span className={`badge ${user.hasApiKey ? 'has-key' : 'no-key'}`}>
                        {user.hasApiKey ? '登録済' : '未登録'}
                      </span>
                    </td>
                    <td className="date">
                      {new Date(user.createdAt).toLocaleDateString('ja-JP')}
                    </td>
                    <td className="actions">
                      <button
                        className={`action-btn ${user.isActive ? 'deactivate' : 'activate'}`}
                        onClick={() => toggleActive(user._id, user.isActive)}
                      >
                        {user.isActive ? '無効化' : '有効化'}
                      </button>
                      <button
                        className={`action-btn ${user.tradingEnabled ? 'stop' : 'start'}`}
                        onClick={() => toggleTrading(user._id, user.tradingEnabled)}
                      >
                        {user.tradingEnabled ? '取引停止' : '取引開始'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
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
        <div className="empty-message">ユーザーが見つかりません</div>
      )}
    </div>
  );
};

export default AdminUsers;
