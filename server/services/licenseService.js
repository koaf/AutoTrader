const axios = require('axios');

/**
 * Google Apps Script ライセンスサービス
 * スプレッドシートと連携してライセンス管理を行う
 */
class LicenseService {
  constructor() {
    this.gasUrl = process.env.GAS_WEBHOOK_URL;
    this.apiSecret = process.env.GAS_API_SECRET;
  }

  /**
   * GASが設定されているか確認
   */
  isConfigured() {
    return !!(this.gasUrl && this.apiSecret);
  }

  /**
   * 新規ユーザー登録をスプレッドシートに通知
   * @param {Object} user - ユーザー情報
   */
  async registerUser(user) {
    if (!this.isConfigured()) {
      console.log('License service not configured, skipping registration');
      return { success: true, skipped: true };
    }

    try {
      const response = await axios.post(this.gasUrl, {
        apiSecret: this.apiSecret,
        action: 'register',
        email: user.email,
        userId: user._id.toString(),
        registeredAt: user.createdAt.toISOString()
      }, {
        headers: { 'Content-Type': 'application/json' },
        timeout: 10000
      });

      console.log('License registration response:', response.data);
      return response.data;
    } catch (error) {
      console.error('License registration error:', error.message);
      // 登録失敗してもユーザー登録は続行
      return { success: false, error: error.message };
    }
  }

  /**
   * ライセンス状態を確認
   * @param {string} email - メールアドレス
   */
  async checkLicense(email) {
    if (!this.isConfigured()) {
      console.log('License service not configured, allowing access');
      return { success: true, licenseStatus: true, skipped: true };
    }

    try {
      const params = new URLSearchParams({
        apiSecret: this.apiSecret,
        action: 'checkLicense',
        email: email
      });

      const response = await axios.get(`${this.gasUrl}?${params.toString()}`, {
        timeout: 10000
      });

      console.log('License check response:', response.data);
      return response.data;
    } catch (error) {
      console.error('License check error:', error.message);
      // 確認失敗時はアクセスを許可（サービス停止を防ぐ）
      return { success: false, licenseStatus: false, error: error.message };
    }
  }

  /**
   * ライセンス状態を更新（管理者用）
   * @param {string} email - メールアドレス
   * @param {boolean} status - ライセンス状態
   */
  async updateLicense(email, status) {
    if (!this.isConfigured()) {
      return { success: false, error: 'License service not configured' };
    }

    try {
      const response = await axios.post(this.gasUrl, {
        apiSecret: this.apiSecret,
        action: 'updateLicense',
        email: email,
        status: status
      }, {
        headers: { 'Content-Type': 'application/json' },
        timeout: 10000
      });

      return response.data;
    } catch (error) {
      console.error('License update error:', error.message);
      return { success: false, error: error.message };
    }
  }
}

module.exports = new LicenseService();
