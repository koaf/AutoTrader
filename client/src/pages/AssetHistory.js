import React, { useState, useEffect } from 'react';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import api from '../services/api';
import './AssetHistory.css';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

const AssetHistory = () => {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCurrency, setSelectedCurrency] = useState('BTC');
  const [days, setDays] = useState(30);

  useEffect(() => {
    fetchHistory();
  }, [selectedCurrency, days]);

  const fetchHistory = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        currency: selectedCurrency,
        days: days
      });
      const response = await api.get(`/trading/asset-history?${params}`);
      setHistory(response.data.history);
    } catch (error) {
      console.error('Fetch history error:', error);
    } finally {
      setLoading(false);
    }
  };

  const chartData = {
    labels: history.map(h => {
      const date = new Date(h.recordedAt);
      return date.toLocaleDateString('ja-JP', { month: 'short', day: 'numeric' });
    }),
    datasets: [
      {
        label: '総資産',
        data: history.map(h => h.totalEquity),
        borderColor: '#f7931a',
        backgroundColor: 'rgba(247, 147, 26, 0.1)',
        fill: true,
        tension: 0.4
      },
      {
        label: 'ウォレット残高',
        data: history.map(h => h.walletBalance),
        borderColor: '#16c784',
        backgroundColor: 'transparent',
        borderDash: [5, 5],
        tension: 0.4
      }
    ]
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
        labels: {
          color: '#a0a0a0'
        }
      },
      tooltip: {
        mode: 'index',
        intersect: false,
        backgroundColor: '#16213e',
        titleColor: '#e0e0e0',
        bodyColor: '#e0e0e0',
        borderColor: '#2a2a4a',
        borderWidth: 1
      }
    },
    scales: {
      x: {
        grid: {
          color: 'rgba(42, 42, 74, 0.5)'
        },
        ticks: {
          color: '#a0a0a0'
        }
      },
      y: {
        grid: {
          color: 'rgba(42, 42, 74, 0.5)'
        },
        ticks: {
          color: '#a0a0a0'
        }
      }
    },
    interaction: {
      mode: 'nearest',
      axis: 'x',
      intersect: false
    }
  };

  const formatNumber = (num, decimals = 8) => {
    if (num === undefined || num === null) return '-';
    return parseFloat(num).toFixed(decimals);
  };

  const calculateChange = () => {
    if (history.length < 2) return { value: 0, percent: 0 };
    const first = history[0].totalEquity;
    const last = history[history.length - 1].totalEquity;
    const change = last - first;
    const percent = first > 0 ? (change / first) * 100 : 0;
    return { value: change, percent };
  };

  const change = calculateChange();

  return (
    <div className="asset-history">
      <div className="page-header">
        <h1>資産履歴</h1>
        <div className="header-actions">
          <select
            value={selectedCurrency}
            onChange={(e) => setSelectedCurrency(e.target.value)}
            className="filter-select"
          >
            <option value="BTC">BTC</option>
            <option value="ETH">ETH</option>
            <option value="EOS">EOS</option>
            <option value="XRP">XRP</option>
          </select>
          <select
            value={days}
            onChange={(e) => setDays(parseInt(e.target.value))}
            className="filter-select"
          >
            <option value={7}>7日間</option>
            <option value={30}>30日間</option>
            <option value={90}>90日間</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="page-loading">読み込み中...</div>
      ) : history.length > 0 ? (
        <>
          {/* サマリー */}
          <div className="summary-grid">
            <div className="summary-card">
              <span className="summary-label">現在の総資産</span>
              <span className="summary-value">
                {formatNumber(history[history.length - 1]?.totalEquity)} {selectedCurrency}
              </span>
            </div>
            <div className="summary-card">
              <span className="summary-label">期間内変動</span>
              <span className={`summary-value ${change.value >= 0 ? 'profit' : 'loss'}`}>
                {change.value >= 0 ? '+' : ''}{formatNumber(change.value)} ({change.percent.toFixed(2)}%)
              </span>
            </div>
            <div className="summary-card">
              <span className="summary-label">最高値</span>
              <span className="summary-value">
                {formatNumber(Math.max(...history.map(h => h.totalEquity)))}
              </span>
            </div>
            <div className="summary-card">
              <span className="summary-label">最安値</span>
              <span className="summary-value">
                {formatNumber(Math.min(...history.map(h => h.totalEquity)))}
              </span>
            </div>
          </div>

          {/* チャート */}
          <div className="chart-container">
            <h2 className="section-title">資産推移</h2>
            <div className="chart-wrapper">
              <Line data={chartData} options={chartOptions} />
            </div>
          </div>

          {/* 履歴テーブル */}
          <div className="history-section">
            <h2 className="section-title">履歴データ</h2>
            <div className="table-wrapper">
              <table className="history-table">
                <thead>
                  <tr>
                    <th>日時</th>
                    <th>総資産</th>
                    <th>ウォレット残高</th>
                    <th>利用可能</th>
                    <th>使用中証拠金</th>
                    <th>未実現損益</th>
                  </tr>
                </thead>
                <tbody>
                  {[...history].reverse().slice(0, 50).map((h, idx) => (
                    <tr key={idx}>
                      <td className="date">{new Date(h.recordedAt).toLocaleString('ja-JP')}</td>
                      <td className="primary">{formatNumber(h.totalEquity)}</td>
                      <td>{formatNumber(h.walletBalance)}</td>
                      <td>{formatNumber(h.availableBalance)}</td>
                      <td>{formatNumber(h.usedMargin)}</td>
                      <td className={h.unrealizedPnl >= 0 ? 'profit' : 'loss'}>
                        {formatNumber(h.unrealizedPnl)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : (
        <div className="empty-message">資産履歴がありません</div>
      )}
    </div>
  );
};

export default AssetHistory;
