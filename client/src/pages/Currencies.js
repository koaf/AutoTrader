import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import './Currencies.css';

const AVAILABLE_CURRENCIES = [
  { symbol: 'BTC', name: 'Bitcoin', inverseSymbol: 'BTCUSD' },
  { symbol: 'ETH', name: 'Ethereum', inverseSymbol: 'ETHUSD' },
  { symbol: 'EOS', name: 'EOS', inverseSymbol: 'EOSUSD' },
  { symbol: 'XRP', name: 'Ripple', inverseSymbol: 'XRPUSD' }
];

const Currencies = () => {
  const { user, updateUser } = useAuth();
  const [currencies, setCurrencies] = useState([]);
  const [fundingRates, setFundingRates] = useState({});
  const [loading, setLoading] = useState(false);
  const [hasApiKey, setHasApiKey] = useState(false);

  useEffect(() => {
    initializeCurrencies();
    checkApiKey();
  }, [user]);

  const initializeCurrencies = () => {
    const userCurrencies = user?.enabledCurrencies || [];
    const merged = AVAILABLE_CURRENCIES.map(c => {
      const userCurrency = userCurrencies.find(uc => uc.symbol === c.symbol);
      return {
        ...c,
        enabled: userCurrency ? userCurrency.enabled : false
      };
    });
    setCurrencies(merged);
  };

  const checkApiKey = async () => {
    try {
      const response = await api.get('/apikey');
      setHasApiKey(response.data.hasApiKey);
      if (response.data.hasApiKey) {
        fetchFundingRates();
      }
    } catch (error) {
      console.error('API key check error:', error);
    }
  };

  const fetchFundingRates = async () => {
    const rates = {};
    for (const currency of AVAILABLE_CURRENCIES) {
      try {
        const response = await api.get(`/trading/funding-rate/${currency.inverseSymbol}`);
        rates[currency.symbol] = response.data.fundingRate;
      } catch (error) {
        rates[currency.symbol] = null;
      }
    }
    setFundingRates(rates);
  };

  const toggleCurrency = (symbol) => {
    setCurrencies(prev =>
      prev.map(c =>
        c.symbol === symbol ? { ...c, enabled: !c.enabled } : c
      )
    );
  };

  const saveCurrencies = async () => {
    setLoading(true);
    try {
      const currencySettings = currencies.map(c => ({
        symbol: c.symbol,
        enabled: c.enabled
      }));
      await api.post('/trading/currencies', { currencies: currencySettings });
      updateUser({ enabledCurrencies: currencySettings });
      toast.success('通貨設定を保存しました');
    } catch (error) {
      toast.error(error.response?.data?.message || '保存に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const formatFundingRate = (rate) => {
    if (rate === null || rate === undefined) return '-';
    const percentage = (rate * 100).toFixed(4);
    return `${rate >= 0 ? '+' : ''}${percentage}%`;
  };

  return (
    <div className="currencies">
      <div className="page-header">
        <h1>通貨設定</h1>
      </div>

      <div className="currency-info">
        <p>
          自動取引で使用する通貨を選択してください。
          選択した通貨のインバース無期限契約で、ファンディングレート発生後に自動建玉を行います。
        </p>
      </div>

      <div className="currency-grid">
        {currencies.map((currency) => (
          <div
            key={currency.symbol}
            className={`currency-card ${currency.enabled ? 'enabled' : ''}`}
            onClick={() => toggleCurrency(currency.symbol)}
          >
            <div className="currency-header">
              <span className="currency-symbol">{currency.symbol}</span>
              <div className={`toggle ${currency.enabled ? 'on' : 'off'}`}>
                <div className="toggle-slider"></div>
              </div>
            </div>
            <div className="currency-body">
              <span className="currency-name">{currency.name}</span>
              <span className="currency-pair">{currency.inverseSymbol}</span>
            </div>
            {hasApiKey && (
              <div className="currency-footer">
                <span className="funding-label">ファンディングレート</span>
                <span className={`funding-rate ${fundingRates[currency.symbol] >= 0 ? 'positive' : 'negative'}`}>
                  {formatFundingRate(fundingRates[currency.symbol])}
                </span>
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="save-section">
        <button
          className="save-btn"
          onClick={saveCurrencies}
          disabled={loading}
        >
          {loading ? '保存中...' : '設定を保存'}
        </button>
      </div>

      <div className="info-section">
        <h2>取引ルール</h2>
        <ul>
          <li>レバレッジは1倍（フル担保）で固定</li>
          <li>ファンディングレート発生時（9:00, 17:00, 1:00 JST）に自動建玉</li>
          <li>ファンディングレートがプラスの場合はショート、マイナスの場合はロング</li>
          <li>複利運用：毎回の取引後、口座残高全額を次回取引に使用</li>
          <li>利確・損切りなし：ポジションは手動決済まで保持</li>
        </ul>
      </div>
    </div>
  );
};

export default Currencies;
