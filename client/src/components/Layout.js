import React from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './Layout.css';

const Layout = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="layout">
      <aside className="sidebar">
        <div className="sidebar-header">
          <h1 className="logo">
            <span className="logo-icon">₿</span>
            AutoTrader
          </h1>
        </div>
        
        <nav className="sidebar-nav">
          <NavLink to="/dashboard" className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'}>
            <span className="nav-icon">📊</span>
            ダッシュボード
          </NavLink>
          <NavLink to="/trade-history" className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'}>
            <span className="nav-icon">📜</span>
            損益履歴
          </NavLink>
          <NavLink to="/asset-history" className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'}>
            <span className="nav-icon">💰</span>
            資産履歴
          </NavLink>
          <NavLink to="/currencies" className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'}>
            <span className="nav-icon">🪙</span>
            通貨設定
          </NavLink>
          <NavLink to="/account" className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'}>
            <span className="nav-icon">👤</span>
            アカウント
          </NavLink>
        </nav>
        
        {user?.role === 'admin' && (
          <div className="sidebar-admin">
            <NavLink to="/admin" className="nav-item admin-link">
              <span className="nav-icon">⚙️</span>
              管理画面
            </NavLink>
          </div>
        )}
        
        <div className="sidebar-footer">
          <div className="user-info">
            <span className="user-name">{user?.username}</span>
            <span className="user-email">{user?.email}</span>
          </div>
          <button onClick={handleLogout} className="logout-btn">
            ログアウト
          </button>
        </div>
      </aside>
      
      <main className="main-content">
        <Outlet />
      </main>
    </div>
  );
};

export default Layout;
