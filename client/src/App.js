import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

import { AuthProvider, useAuth } from './context/AuthContext';

// ページ
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import TradeHistory from './pages/TradeHistory';
import AssetHistory from './pages/AssetHistory';
import Currencies from './pages/Currencies';
import Account from './pages/Account';
import LicensePending from './pages/LicensePending';
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminUsers from './pages/admin/AdminUsers';
import AdminUserDetail from './pages/admin/AdminUserDetail';
import AdminLogs from './pages/admin/AdminLogs';

// コンポーネント
import Layout from './components/Layout';
import AdminLayout from './components/AdminLayout';

// 認証が必要なルート（ライセンスチェック付き）
const PrivateRoute = ({ children }) => {
  const { user, loading, isLicensed } = useAuth();
  
  if (loading) {
    return <div className="loading-screen">読み込み中...</div>;
  }
  
  if (!user) {
    return <Navigate to="/login" />;
  }
  
  // ライセンスが無効な場合は待機画面を表示
  if (!isLicensed()) {
    return <LicensePending />;
  }
  
  return children;
};

// 管理者専用ルート
const AdminRoute = ({ children }) => {
  const { user, loading } = useAuth();
  
  if (loading) {
    return <div className="loading-screen">読み込み中...</div>;
  }
  
  if (!user) {
    return <Navigate to="/login" />;
  }
  
  return user.role === 'admin' ? children : <Navigate to="/dashboard" />;
};

// 未認証専用ルート
const PublicRoute = ({ children }) => {
  const { user, loading } = useAuth();
  
  if (loading) {
    return <div className="loading-screen">読み込み中...</div>;
  }
  
  return !user ? children : <Navigate to="/dashboard" />;
};

function AppRoutes() {
  return (
    <Routes>
      {/* 公開ルート */}
      <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
      <Route path="/register" element={<PublicRoute><Register /></PublicRoute>} />
      
      {/* ユーザールート */}
      <Route path="/" element={<PrivateRoute><Layout /></PrivateRoute>}>
        <Route index element={<Navigate to="/dashboard" />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="trade-history" element={<TradeHistory />} />
        <Route path="asset-history" element={<AssetHistory />} />
        <Route path="currencies" element={<Currencies />} />
        <Route path="account" element={<Account />} />
      </Route>
      
      {/* 管理者ルート */}
      <Route path="/admin" element={<AdminRoute><AdminLayout /></AdminRoute>}>
        <Route index element={<AdminDashboard />} />
        <Route path="users" element={<AdminUsers />} />
        <Route path="users/:userId" element={<AdminUserDetail />} />
        <Route path="logs" element={<AdminLogs />} />
      </Route>
      
      {/* 404 */}
      <Route path="*" element={<Navigate to="/dashboard" />} />
    </Routes>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
        <ToastContainer
          position="top-right"
          autoClose={3000}
          hideProgressBar={false}
          newestOnTop
          closeOnClick
          rtl={false}
          pauseOnFocusLoss
          draggable
          pauseOnHover
          theme="dark"
        />
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
