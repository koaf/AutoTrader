import React from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './AdminLayout.css';

const AdminLayout = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="admin-layout">
      <aside className="admin-sidebar">
        <div className="admin-sidebar-header">
          <h1 className="admin-logo">
            <span className="logo-icon">⚙️</span>
            管理画面
          </h1>
        </div>
        
        <nav className="admin-sidebar-nav">
          <NavLink to="/admin" end className={({ isActive }) => isActive ? 'admin-nav-item active' : 'admin-nav-item'}>
            <span className="nav-icon">📊</span>
            ダッシュボード
          </NavLink>
          <NavLink to="/admin/users" className={({ isActive }) => isActive ? 'admin-nav-item active' : 'admin-nav-item'}>
            <span className="nav-icon">👥</span>
            ユーザー管理
          </NavLink>
          <NavLink to="/admin/logs" className={({ isActive }) => isActive ? 'admin-nav-item active' : 'admin-nav-item'}>
            <span className="nav-icon">📋</span>
            システムログ
          </NavLink>
        </nav>
        
        <div className="admin-sidebar-back">
          <NavLink to="/dashboard" className="admin-nav-item back-link">
            <span className="nav-icon">←</span>
            ユーザー画面へ
          </NavLink>
        </div>
        
        <div className="admin-sidebar-footer">
          <div className="admin-user-info">
            <span className="admin-badge">管理者</span>
            <span className="user-name">{user?.username}</span>
          </div>
          <button onClick={handleLogout} className="admin-logout-btn">
            ログアウト
          </button>
        </div>
      </aside>
      
      <main className="admin-main-content">
        <Outlet />
      </main>
    </div>
  );
};

export default AdminLayout;
