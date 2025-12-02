/**
 * Bybit AutoTrader ライセンス管理システム
 * Google Apps Script (GAS)
 * 
 * このスクリプトをGoogle Apps Scriptにコピーして使用してください。
 * 詳細な設定方法はREADME.mdを参照してください。
 */

// ===========================================
// 設定
// ===========================================

/**
 * 設定を取得
 * スクリプトプロパティから設定を読み込む
 */
function getConfig() {
  const props = PropertiesService.getScriptProperties();
  return {
    SPREADSHEET_ID: props.getProperty('SPREADSHEET_ID') || '',
    SHEET_NAME: props.getProperty('SHEET_NAME') || 'ユーザー管理',
    API_SECRET: props.getProperty('API_SECRET') || 'your-secret-key-here'
  };
}

// ===========================================
// Web API エンドポイント
// ===========================================

/**
 * POSTリクエストを処理
 * @param {Object} e - リクエストイベント
 */
function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    const config = getConfig();
    
    // APIシークレットの検証
    if (data.apiSecret !== config.API_SECRET) {
      return createResponse({ success: false, error: 'Invalid API secret' }, 401);
    }
    
    switch (data.action) {
      case 'register':
        return handleRegister(data);
      case 'checkLicense':
        return handleCheckLicense(data);
      case 'updateLicense':
        return handleUpdateLicense(data);
      default:
        return createResponse({ success: false, error: 'Unknown action' }, 400);
    }
  } catch (error) {
    console.error('Error in doPost:', error);
    return createResponse({ success: false, error: error.message }, 500);
  }
}

/**
 * GETリクエストを処理（ライセンス確認用）
 * @param {Object} e - リクエストイベント
 */
function doGet(e) {
  try {
    const params = e.parameter;
    const config = getConfig();
    
    // APIシークレットの検証
    if (params.apiSecret !== config.API_SECRET) {
      return createResponse({ success: false, error: 'Invalid API secret' }, 401);
    }
    
    if (params.action === 'checkLicense' && params.email) {
      const result = checkLicenseByEmail(params.email);
      return createResponse(result);
    }
    
    return createResponse({ success: false, error: 'Invalid request' }, 400);
  } catch (error) {
    console.error('Error in doGet:', error);
    return createResponse({ success: false, error: error.message }, 500);
  }
}

// ===========================================
// ユーザー登録処理
// ===========================================

/**
 * 新規ユーザー登録を処理
 * @param {Object} data - 登録データ
 */
function handleRegister(data) {
  const config = getConfig();
  const sheet = getSheet();
  
  if (!sheet) {
    return createResponse({ success: false, error: 'Sheet not found' }, 500);
  }
  
  const { email, userId, registeredAt } = data;
  
  // 既存ユーザーチェック
  const existingRow = findRowByEmail(sheet, email);
  if (existingRow) {
    return createResponse({ 
      success: false, 
      error: 'User already exists',
      licenseStatus: sheet.getRange(existingRow, 5).getValue() === 'ON'
    });
  }
  
  // 新規行を追加
  const lastRow = sheet.getLastRow();
  const newRow = lastRow + 1;
  
  sheet.getRange(newRow, 1).setValue(newRow - 1); // No.
  sheet.getRange(newRow, 2).setValue(email);       // メールアドレス
  sheet.getRange(newRow, 3).setValue(userId);      // ユーザーID
  sheet.getRange(newRow, 4).setValue(registeredAt || new Date().toISOString()); // 登録日時
  sheet.getRange(newRow, 5).setValue('OFF');       // ライセンス状態（初期値OFF）
  sheet.getRange(newRow, 6).setValue('');          // 承認日時
  sheet.getRange(newRow, 7).setValue('');          // メモ
  
  // 書式設定
  sheet.getRange(newRow, 5).setBackground('#ffcdd2'); // 赤背景
  
  return createResponse({ 
    success: true, 
    message: 'User registered successfully',
    licenseStatus: false
  });
}

// ===========================================
// ライセンス確認処理
// ===========================================

/**
 * ライセンス確認を処理
 * @param {Object} data - 確認データ
 */
function handleCheckLicense(data) {
  const result = checkLicenseByEmail(data.email);
  return createResponse(result);
}

/**
 * メールアドレスでライセンス状態を確認
 * @param {string} email - メールアドレス
 */
function checkLicenseByEmail(email) {
  const sheet = getSheet();
  
  if (!sheet) {
    return { success: false, error: 'Sheet not found' };
  }
  
  const row = findRowByEmail(sheet, email);
  
  if (!row) {
    return { 
      success: false, 
      error: 'User not found',
      licenseStatus: false,
      registered: false
    };
  }
  
  const licenseValue = sheet.getRange(row, 5).getValue();
  const isLicensed = licenseValue === 'ON';
  
  return {
    success: true,
    licenseStatus: isLicensed,
    registered: true,
    approvedAt: isLicensed ? sheet.getRange(row, 6).getValue() : null
  };
}

// ===========================================
// ライセンス更新処理（管理者用）
// ===========================================

/**
 * ライセンス状態を更新
 * @param {Object} data - 更新データ
 */
function handleUpdateLicense(data) {
  const sheet = getSheet();
  
  if (!sheet) {
    return createResponse({ success: false, error: 'Sheet not found' }, 500);
  }
  
  const row = findRowByEmail(sheet, data.email);
  
  if (!row) {
    return createResponse({ success: false, error: 'User not found' }, 404);
  }
  
  const newStatus = data.status ? 'ON' : 'OFF';
  sheet.getRange(row, 5).setValue(newStatus);
  
  if (data.status) {
    sheet.getRange(row, 5).setBackground('#c8e6c9'); // 緑背景
    sheet.getRange(row, 6).setValue(new Date().toISOString()); // 承認日時
  } else {
    sheet.getRange(row, 5).setBackground('#ffcdd2'); // 赤背景
    sheet.getRange(row, 6).setValue(''); // 承認日時クリア
  }
  
  return createResponse({ 
    success: true, 
    message: `License ${newStatus} for ${data.email}`
  });
}

// ===========================================
// ユーティリティ関数
// ===========================================

/**
 * スプレッドシートのシートを取得
 */
function getSheet() {
  const config = getConfig();
  
  if (!config.SPREADSHEET_ID) {
    console.error('SPREADSHEET_ID is not set');
    return null;
  }
  
  try {
    const spreadsheet = SpreadsheetApp.openById(config.SPREADSHEET_ID);
    let sheet = spreadsheet.getSheetByName(config.SHEET_NAME);
    
    // シートが存在しない場合は作成
    if (!sheet) {
      sheet = createNewSheet(spreadsheet, config.SHEET_NAME);
    }
    
    return sheet;
  } catch (error) {
    console.error('Error getting sheet:', error);
    return null;
  }
}

/**
 * 新しいシートを作成してヘッダーを設定
 * @param {Spreadsheet} spreadsheet - スプレッドシート
 * @param {string} sheetName - シート名
 */
function createNewSheet(spreadsheet, sheetName) {
  const sheet = spreadsheet.insertSheet(sheetName);
  
  // ヘッダー行を設定
  const headers = ['No.', 'メールアドレス', 'ユーザーID', '登録日時', 'ライセンス', '承認日時', 'メモ'];
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  
  // ヘッダー行のスタイル設定
  sheet.getRange(1, 1, 1, headers.length)
    .setBackground('#4285f4')
    .setFontColor('#ffffff')
    .setFontWeight('bold');
  
  // 列幅の調整
  sheet.setColumnWidth(1, 50);   // No.
  sheet.setColumnWidth(2, 250);  // メールアドレス
  sheet.setColumnWidth(3, 250);  // ユーザーID
  sheet.setColumnWidth(4, 180);  // 登録日時
  sheet.setColumnWidth(5, 100);  // ライセンス
  sheet.setColumnWidth(6, 180);  // 承認日時
  sheet.setColumnWidth(7, 200);  // メモ
  
  // ヘッダー行を固定
  sheet.setFrozenRows(1);
  
  return sheet;
}

/**
 * メールアドレスで行を検索
 * @param {Sheet} sheet - シート
 * @param {string} email - メールアドレス
 */
function findRowByEmail(sheet, email) {
  const data = sheet.getDataRange().getValues();
  
  for (let i = 1; i < data.length; i++) {
    if (data[i][1] === email) {
      return i + 1; // 1-indexed
    }
  }
  
  return null;
}

/**
 * JSONレスポンスを作成
 * @param {Object} data - レスポンスデータ
 * @param {number} statusCode - HTTPステータスコード（参考用）
 */
function createResponse(data, statusCode = 200) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

// ===========================================
// 初期設定・テスト用関数
// ===========================================

/**
 * 初期設定を行う
 * スクリプトエディタから手動で実行してください
 */
function initialSetup() {
  const ui = SpreadsheetApp.getUi();
  
  // スプレッドシートIDを自動取得
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  if (spreadsheet) {
    const props = PropertiesService.getScriptProperties();
    props.setProperty('SPREADSHEET_ID', spreadsheet.getId());
    props.setProperty('SHEET_NAME', 'ユーザー管理');
    props.setProperty('API_SECRET', generateApiSecret());
    
    // シートを作成
    getSheet();
    
    const config = getConfig();
    ui.alert('初期設定完了', 
      `スプレッドシートID: ${config.SPREADSHEET_ID}\n` +
      `シート名: ${config.SHEET_NAME}\n` +
      `APIシークレット: ${config.API_SECRET}\n\n` +
      '※ APIシークレットはサーバーの.envファイルに設定してください。',
      ui.ButtonSet.OK);
  } else {
    ui.alert('エラー', 'スプレッドシートから実行してください。', ui.ButtonSet.OK);
  }
}

/**
 * APIシークレットを生成
 */
function generateApiSecret() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < 32; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

/**
 * 設定を確認
 */
function checkConfig() {
  const config = getConfig();
  console.log('Current Configuration:');
  console.log('SPREADSHEET_ID:', config.SPREADSHEET_ID);
  console.log('SHEET_NAME:', config.SHEET_NAME);
  console.log('API_SECRET:', config.API_SECRET);
}

/**
 * テスト: ユーザー登録
 */
function testRegister() {
  const testData = {
    apiSecret: getConfig().API_SECRET,
    action: 'register',
    email: 'test@example.com',
    userId: 'test-user-id-123',
    registeredAt: new Date().toISOString()
  };
  
  const result = handleRegister(testData);
  console.log('Register result:', result.getContent());
}

/**
 * テスト: ライセンス確認
 */
function testCheckLicense() {
  const result = checkLicenseByEmail('test@example.com');
  console.log('License check result:', JSON.stringify(result));
}

/**
 * メニューを追加
 */
function onOpen() {
  const ui = SpreadsheetApp.getUi();
  ui.createMenu('ライセンス管理')
    .addItem('初期設定', 'initialSetup')
    .addItem('設定確認', 'showConfig')
    .addSeparator()
    .addItem('選択行のライセンスをONにする', 'setLicenseOn')
    .addItem('選択行のライセンスをOFFにする', 'setLicenseOff')
    .addToUi();
}

/**
 * 設定を表示
 */
function showConfig() {
  const config = getConfig();
  const ui = SpreadsheetApp.getUi();
  ui.alert('現在の設定',
    `スプレッドシートID: ${config.SPREADSHEET_ID}\n` +
    `シート名: ${config.SHEET_NAME}\n` +
    `APIシークレット: ${config.API_SECRET}`,
    ui.ButtonSet.OK);
}

/**
 * 選択行のライセンスをONにする
 */
function setLicenseOn() {
  setLicenseStatus(true);
}

/**
 * 選択行のライセンスをOFFにする
 */
function setLicenseOff() {
  setLicenseStatus(false);
}

/**
 * 選択行のライセンス状態を設定
 * @param {boolean} status - ライセンス状態
 */
function setLicenseStatus(status) {
  const sheet = SpreadsheetApp.getActiveSheet();
  const selection = sheet.getActiveRange();
  const startRow = selection.getRow();
  const numRows = selection.getNumRows();
  
  if (startRow <= 1) {
    SpreadsheetApp.getUi().alert('ヘッダー行は選択できません。');
    return;
  }
  
  for (let i = 0; i < numRows; i++) {
    const row = startRow + i;
    if (row > 1) {
      sheet.getRange(row, 5).setValue(status ? 'ON' : 'OFF');
      sheet.getRange(row, 5).setBackground(status ? '#c8e6c9' : '#ffcdd2');
      sheet.getRange(row, 6).setValue(status ? new Date().toISOString() : '');
    }
  }
  
  SpreadsheetApp.getUi().alert(`${numRows}行のライセンスを${status ? 'ON' : 'OFF'}にしました。`);
}
