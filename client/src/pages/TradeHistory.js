import React, { useState, useEffect } from 'react';
import api from '../services/api';
import './TradeHistory.css';

const TradeHistory = () => {
  const [trades, setTrades] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
  const [filter, setFilter] = useState({ symbol: '' });

  useEffect(() => {
    fetchTrades();
  }, [pagination.page, filter.symbol]);

  const fetchTrades = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: pagination.page,
        limit: 20,
        ...(filter.symbol && { symbol: filter.symbol })
      });
      const response = await api.get(`/trading/history?${params}`);
      setTrades(response.data.trades);
      setPagination(response.data.pagination);
    } catch (error) {
      console.error('Fetch trades error:', error);
    } finally {
      setLoading(false);
    }
  };

  const exportCSV = async () => {
    try {
      const response = await api.get('/trading/export-csv', {
        responseType: 'blob'
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'trade_history.csv');
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      console.error('Export error:', error);
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleString('ja-JP');
  };

  const formatNumber = (num, decimals = 8) => {
    if (num === undefined || num === null) return '-';
    return parseFloat(num).toFixed(decimals);
  };

  return (
    <div className="trade-history">
      <div className="page-header">
        <h1>損益履歴</h1>
        <div className="header-actions">
          <select
            value={filter.symbol}
            onChange={(e) => setFilter({ ...filter, symbol: e.target.value })}
            className="filter-select"
          >
            <option value="">全シンボル</option>
            <option value="BTCUSD">BTCUSD</option>
            <option value="ETHUSD">ETHUSD</option>
            <option value="EOSUSD">EOSUSD</option>
            <option value="XRPUSD">XRPUSD</option>
          </select>
          <button onClick={exportCSV} className="export-btn">
            CSV出力
          </button>
        </div>
      </div>

      {loading ? (
        <div className="page-loading">読み込み中...</div>
      ) : trades.length > 0 ? (
        <>
          <div className="table-wrapper">
            <table className="trades-table">
              <thead>
                <tr>
                  <th>日時</th>
                  <th>シンボル</th>
                  <th>売買</th>
                  <th>種別</th>
                  <th>数量</th>
                  <th>価格</th>
                  <th>手数料</th>
                  <th>実現損益</th>
                  <th>ステータス</th>
                </tr>
              </thead>
              <tbody>
                {trades.map((trade) => (
                  <tr key={trade._id}>
                    <td className="date">{formatDate(trade.executedAt)}</td>
                    <td className="symbol">{trade.symbol}</td>
                    <td className={trade.side === 'Buy' ? 'buy' : 'sell'}>
                      {trade.side === 'Buy' ? '買' : '売'}
                    </td>
                    <td>{trade.tradeType === 'Open' ? '新規' : trade.tradeType === 'Close' ? '決済' : 'FR'}</td>
                    <td>{trade.quantity}</td>
                    <td>{formatNumber(trade.price, 2)}</td>
                    <td>{formatNumber(trade.fee, 8)}</td>
                    <td className={trade.realizedPnl >= 0 ? 'profit' : 'loss'}>
                      {formatNumber(trade.realizedPnl, 8)}
                    </td>
                    <td>
                      <span className={`status ${trade.status.toLowerCase()}`}>
                        {trade.status}
                      </span>
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
              （全 {pagination.total} 件）
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
        <div className="empty-message">取引履歴がありません</div>
      )}
    </div>
  );
};

export default TradeHistory;
