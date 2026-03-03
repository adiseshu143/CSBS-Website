/**
 * ═══════════════════════════════════════════════════════════════
 * Google Apps Script — CSBS Admin Authentication Service
 * ═══════════════════════════════════════════════════════════════
 * 
 * Complete admin authentication via OTP access codes.
 * 
 * Flow:
 *   1. Admin enters email on the website
 *   2. POST request hits doPost() with { email }
 *   3. Script checks Firestore "admins" collection for that email
 *   4. If found → generates CSBS-XXXX code, stores with 5-min expiry
 *   5. Sends code to admin's email from csbs.vitb@gmail.com
 *   6. Admin enters code within 5 minutes to verify
 *   7. POST with { email, accessCode } → script validates code + expiry
 * 
 * Primary Sender: csbs.vitb@gmail.com
 * Test Email:     24pa1a5723@vishnu.edu.in
 * Code Format:    CSBS-XXXX (4-digit random)
 * Code Expiry:    5 minutes
 * 
 * Permissions Required (authorized in appsscript.json):
 *   - https://www.googleapis.com/auth/gmail.send
 *   - https://www.googleapis.com/auth/gmail.compose
 *   - https://www.googleapis.com/auth/script.external_request
 *   - https://www.googleapis.com/auth/script.scriptapp
 *   - https://www.googleapis.com/auth/userinfo.email
 *   - https://mail.google.com/
 * 
 * Deployment:
 *   1. Open script.google.com → create new project
 *   2. Paste this entire file
 *   3. Create appsscript.json with the oauthScopes listed above
 *   4. Deploy → Web App → Execute as: Me, Access: Anyone
 *   5. Authorize ALL permissions when prompted
 *   6. Copy the deployment URL → set as VITE_ADMIN_APPS_SCRIPT_URL in .env
 * 
 * ═══════════════════════════════════════════════════════════════
 */

// ═══════════════════════════════════════════════════════════════
// CONFIGURATION
// ═══════════════════════════════════════════════════════════════

var CONFIG = {
  // ── Branding ────────────────────────────────────────────
  projectName: 'CSBS',
  brandColor: '#EB4D28',
  brandColorSecondary: '#2E3190',

  // ── Primary Sender Email ────────────────────────────────
  senderEmail: 'csbs.vitb@gmail.com',
  senderName: 'CSBS Admin Portal — VIT Bhimavaram',

  // ── Firestore Configuration ─────────────────────────────
  // Your Firebase project ID (from Firebase Console → Project Settings)
  firebaseProjectId: 'csbs-main-website',

  // ── Access Code Settings ────────────────────────────────
  codePrefix: 'CSBS',
  codeLength: 4,           // 4-digit numeric → CSBS-XXXX
  codeExpiryMinutes: 5,    // Code expires after 5 minutes
};

// ═══════════════════════════════════════════════════════════════
// FIRESTORE REST API — Check admin email in "admins" collection
// ═══════════════════════════════════════════════════════════════

/**
 * Check if an email exists in the Firestore "admins" collection.
 * Uses the Firestore REST API with structured query (runQuery).
 * Requires OAuth scope: https://www.googleapis.com/auth/datastore
 * 
 * @param {string} email - The email to check
 * @returns {object|null} The admin document data if found, null otherwise
 */
function checkEmailInFirestore(email) {
  var projectId = CONFIG.firebaseProjectId;
  var normalizedEmail = email.toLowerCase().trim();

  // Firestore REST API: runQuery endpoint
  var url = 'https://firestore.googleapis.com/v1/projects/' + projectId +
            '/databases/(default)/documents:runQuery';

  // Structured query to find email in "admins" collection
  var queryPayload = {
    structuredQuery: {
      from: [{ collectionId: 'admins' }],
      where: {
        fieldFilter: {
          field: { fieldPath: 'email' },
          op: 'EQUAL',
          value: { stringValue: normalizedEmail }
        }
      },
      limit: 1
    }
  };

  var options = {
    method: 'post',
    contentType: 'application/json',
    headers: {
      'Authorization': 'Bearer ' + ScriptApp.getOAuthToken()
    },
    payload: JSON.stringify(queryPayload),
    muteHttpExceptions: true
  };

  try {
    var response = UrlFetchApp.fetch(url, options);
    var statusCode = response.getResponseCode();
    var responseText = response.getContentText();

    Logger.log('[FIRESTORE] Query status: ' + statusCode);

    if (statusCode !== 200) {
      Logger.log('[FIRESTORE] Error response: ' + responseText);
      throw new Error('Firestore query failed with status ' + statusCode);
    }

    var results = JSON.parse(responseText);

    // Check if any documents were returned
    // Firestore returns [{ document: {...} }] when found,
    // or [{ readTime: "..." }] when no documents match
    if (results && results.length > 0 && results[0].document) {
      var docData = results[0].document;
      Logger.log('[FIRESTORE] ✅ Admin found: ' + normalizedEmail);
      Logger.log('[FIRESTORE] Document path: ' + docData.name);
      return parseFirestoreDocument(docData);
    }

    Logger.log('[FIRESTORE] ❌ Admin NOT found: ' + normalizedEmail);
    return null;

  } catch (err) {
    Logger.log('[FIRESTORE] Error querying admins: ' + err.toString());
    throw new Error('Failed to verify admin email: ' + err.message);
  }
}

/**
 * Parse a Firestore document into a plain JS object.
 * Converts Firestore value types (stringValue, integerValue, etc.) to plain values.
 * 
 * @param {object} doc - Firestore document object
 * @returns {object} Plain JS object with field values
 */
function parseFirestoreDocument(doc) {
  var fields = doc.fields || {};
  var result = {};

  for (var key in fields) {
    var field = fields[key];
    if (field.stringValue !== undefined) result[key] = field.stringValue;
    else if (field.integerValue !== undefined) result[key] = parseInt(field.integerValue, 10);
    else if (field.booleanValue !== undefined) result[key] = field.booleanValue;
    else if (field.doubleValue !== undefined) result[key] = field.doubleValue;
    else if (field.timestampValue !== undefined) result[key] = field.timestampValue;
    else if (field.nullValue !== undefined) result[key] = null;
    else result[key] = field;
  }

  return result;
}

// ═══════════════════════════════════════════════════════════════
// ACCESS CODE GENERATION & STORAGE (PropertiesService)
// ═══════════════════════════════════════════════════════════════

/**
 * Generate a random access code in format CSBS-XXXX
 * where XXXX is a 4-digit random number (0000–9999)
 * 
 * @returns {string} Access code like "CSBS-4827"
 */
function generateAccessCode() {
  var digits = '';
  for (var i = 0; i < CONFIG.codeLength; i++) {
    digits += Math.floor(Math.random() * 10).toString();
  }
  return CONFIG.codePrefix + '-' + digits;
}

/**
 * Store an access code with a timestamp for expiry tracking.
 * Uses PropertiesService (persistent key-value store).
 * 
 * Key format: "code_{email}" → JSON { code, createdAt }
 * 
 * @param {string} email - Admin email
 * @param {string} code - The access code (e.g., CSBS-4827)
 */
function storeAccessCode(email, code) {
  var props = PropertiesService.getScriptProperties();
  var key = 'code_' + email.toLowerCase().trim();
  var data = {
    code: code,
    createdAt: new Date().getTime()   // epoch ms
  };
  props.setProperty(key, JSON.stringify(data));
  Logger.log('[STORE] Code stored for ' + email + ': ' + code + ' (expires in ' + CONFIG.codeExpiryMinutes + ' min)');
}

/**
 * Retrieve the stored access code for an admin email.
 * Returns null if no code exists or if the code has expired (>5 min).
 * 
 * @param {string} email - Admin email
 * @returns {object|null} { code, createdAt, expired } or null if not found
 */
function getStoredCode(email) {
  var props = PropertiesService.getScriptProperties();
  var key = 'code_' + email.toLowerCase().trim();
  var raw = props.getProperty(key);

  if (!raw) return null;

  try {
    var data = JSON.parse(raw);
    var now = new Date().getTime();
    var ageMs = now - data.createdAt;
    var expiryMs = CONFIG.codeExpiryMinutes * 60 * 1000;

    return {
      code: data.code,
      createdAt: data.createdAt,
      ageSeconds: Math.floor(ageMs / 1000),
      expired: ageMs > expiryMs
    };
  } catch (e) {
    Logger.log('[STORE] Failed to parse stored code for ' + email + ': ' + e);
    return null;
  }
}

/**
 * Delete a stored access code (after successful verification or cleanup).
 * 
 * @param {string} email - Admin email
 */
function deleteStoredCode(email) {
  var props = PropertiesService.getScriptProperties();
  var key = 'code_' + email.toLowerCase().trim();
  props.deleteProperty(key);
  Logger.log('[STORE] Code deleted for ' + email);
}

// ═══════════════════════════════════════════════════════════════
// VALIDATION HELPERS
// ═══════════════════════════════════════════════════════════════

/**
 * Validate email format (basic RFC check)
 */
function isValidEmail(email) {
  if (!email || typeof email !== 'string') return false;
  var emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email.trim());
}

/**
 * Escape HTML to prevent injection in email templates
 */
function escapeHtml(text) {
  if (!text) return '';
  var map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' };
  return String(text).replace(/[&<>"']/g, function(m) { return map[m]; });
}

// ═══════════════════════════════════════════════════════════════
// EMAIL SENDING — Primary sender: csbs.vitb@gmail.com
// ═══════════════════════════════════════════════════════════════

/**
 * Send access code email to the admin.
 * Sender: csbs.vitb@gmail.com
 * 
 * @param {string} recipientEmail - Admin's email
 * @param {string} accessCode - The CSBS-XXXX code
 * @param {string} adminName - Admin's display name
 * @returns {object} { success, message, sentFrom } or { success: false, error }
 */
function sendAccessCodeEmail(recipientEmail, accessCode, adminName) {
  if (!recipientEmail) {
    Logger.log('[ERROR] sendAccessCodeEmail called without recipientEmail. Use testQuickSend() or testFullFlow() instead.');
    return { success: false, error: 'recipientEmail is required. Run testQuickSend() or testFullFlow() from the editor.' };
  }
  var recipientName = adminName || recipientEmail.split('@')[0];
  var subject = CONFIG.projectName + ' Admin Portal — Your Access Code';
  var htmlBody = buildAccessCodeEmail(recipientName, accessCode);

  // Check Gmail quota
  var remaining = MailApp.getRemainingDailyQuota();
  Logger.log('[QUOTA] Gmail remaining daily quota: ' + remaining);

  if (remaining <= 0) {
    Logger.log('[CRITICAL] Gmail daily quota exhausted');
    return { success: false, error: 'Gmail daily quota exhausted. Try again tomorrow.' };
  }

  try {
    GmailApp.sendEmail(recipientEmail, subject, '', {
      htmlBody: htmlBody,
      from: CONFIG.senderEmail,
      name: CONFIG.senderName
    });

    Logger.log('[SUCCESS] Access code email sent from ' + CONFIG.senderEmail + ' to ' + recipientEmail);
    return { success: true, message: 'Access code sent successfully', sentFrom: CONFIG.senderEmail };

  } catch (err) {
    Logger.log('[ERROR] Failed to send email: ' + err.toString());
    return { success: false, error: 'Failed to send email: ' + err.message };
  }
}

/**
 * Build the access code email HTML template.
 * 
 * Fully inline-styled, table-based layout for maximum email client compatibility
 * (Gmail, Outlook, Yahoo, Apple Mail — including mobile apps).
 * Gmail strips <style> blocks, so every element has inline styles.
 */
function buildAccessCodeEmail(name, code) {
  var year = new Date().getFullYear();
  var expiryMin = CONFIG.codeExpiryMinutes;

  // Split code into prefix and digits for styled display
  // e.g., "CSBS-3948" → prefix="CSBS", digits="3948"
  // Also handles "CSBS-001" format from frontend (3 digits)
  var codeParts = code.split('-');
  var prefix = codeParts[0] || 'CSBS';
  var digits = codeParts[1] || code; // fallback to full code if no dash

  // Build individual digit cells as table cells — guaranteed single-line on all devices
  var digitCells = '';
  for (var i = 0; i < digits.length; i++) {
    digitCells +=
      '<td style="padding:0 3px;">' +
      '<div style="width:44px;height:54px;line-height:54px;background:linear-gradient(180deg,#1e1e3a 0%,#151528 100%);' +
      'border:2px solid ' + CONFIG.brandColor + ';border-radius:10px;text-align:center;' +
      'font-family:\'Courier New\',Courier,monospace;font-size:26px;font-weight:800;color:#ffffff;' +
      'box-shadow:0 4px 12px rgba(235,77,40,0.25),inset 0 1px 0 rgba(255,255,255,0.08);">' +
      escapeHtml(digits[i]) +
      '</div></td>';
  }

  return '<!DOCTYPE html>' +
    '<html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">' +
    '<title>CSBS Admin Access Code</title></head>' +
    '<body style="margin:0;padding:0;background-color:#f0f2f5;font-family:-apple-system,BlinkMacSystemFont,\'Segoe UI\',Roboto,Helvetica,Arial,sans-serif;">' +

    // Outer wrapper table for centering
    '<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:#f0f2f5;padding:24px 0;">' +
    '<tr><td align="center">' +

    // Main card
    '<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="max-width:560px;background-color:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 8px 40px rgba(0,0,0,0.1);">' +

    // ═══ HEADER ═══
    '<tr><td style="background:linear-gradient(135deg,' + CONFIG.brandColor + ' 0%,' + CONFIG.brandColorSecondary + ' 100%);padding:32px 24px;text-align:center;">' +
    '<div style="font-size:13px;font-weight:600;letter-spacing:3px;color:rgba(255,255,255,0.7);text-transform:uppercase;margin-bottom:6px;">Secure Access</div>' +
    '<div style="font-size:24px;font-weight:800;color:#ffffff;letter-spacing:-0.02em;">' + CONFIG.projectName + ' Admin Portal</div>' +
    '<div style="width:40px;height:3px;background:rgba(255,255,255,0.4);border-radius:2px;margin:12px auto 0;"></div>' +
    '</td></tr>' +

    // ═══ BODY ═══
    '<tr><td style="padding:36px 28px 20px;">' +

    // Greeting
    '<div style="font-size:16px;font-weight:600;color:#1a1f2e;margin-bottom:8px;">Hello, ' + escapeHtml(name) + '!</div>' +
    '<div style="font-size:14px;color:#64748b;line-height:1.7;margin-bottom:24px;">You requested access to the CSBS Admin Portal. Use the access code below to verify your identity and sign in.</div>' +

    '</td></tr>' +

    // ═══ CODE DISPLAY CARD ═══
    '<tr><td style="padding:0 20px;">' +
    '<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:linear-gradient(160deg,#0d0d1f 0%,#161633 40%,#1a1a3a 100%);border-radius:14px;overflow:hidden;">' +

    // Subtle top accent line
    '<tr><td style="height:3px;background:linear-gradient(90deg,' + CONFIG.brandColor + ',' + CONFIG.brandColorSecondary + ','+CONFIG.brandColor+');"></td></tr>' +

    '<tr><td style="padding:28px 16px 24px;text-align:center;">' +

    // Label
    '<div style="font-size:10px;font-weight:700;letter-spacing:2.5px;color:rgba(255,255,255,0.4);text-transform:uppercase;margin-bottom:20px;">Your Access Code</div>' +

    // Code Row: prefix badge + dash + digit cells — ALL in one table row
    '<table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center" style="margin:0 auto;">' +
    '<tr>' +

    // Prefix badge
    '<td style="padding-right:8px;vertical-align:middle;">' +
    '<div style="display:inline-block;background:linear-gradient(135deg,' + CONFIG.brandColor + ',' + CONFIG.brandColorSecondary + ');' +
    'color:#ffffff;font-family:\'Courier New\',Courier,monospace;font-size:15px;font-weight:800;letter-spacing:2px;' +
    'padding:8px 14px;border-radius:8px;line-height:1;box-shadow:0 4px 12px rgba(235,77,40,0.3);">' +
    escapeHtml(prefix) + '</div></td>' +

    // Dash
    '<td style="padding:0 6px;vertical-align:middle;">' +
    '<div style="color:rgba(255,255,255,0.3);font-size:22px;font-weight:300;line-height:1;">&#8722;</div></td>' +

    // Digit cells
    digitCells +

    '</tr></table>' +

    // Expiry badge
    '<div style="margin-top:20px;">' +
    '<span style="display:inline-block;background:rgba(239,68,68,0.15);color:#ff6b6b;font-size:12px;font-weight:600;padding:6px 14px;border-radius:20px;border:1px solid rgba(239,68,68,0.2);">' +
    '&#9200; Expires in ' + expiryMin + ' minutes</span>' +
    '</div>' +

    '</td></tr></table>' +
    '</td></tr>' +
    // ═══ END CODE DISPLAY ═══

    // ═══ STEPS ═══
    '<tr><td style="padding:28px 28px 0;">' +
    '<div style="font-size:14px;font-weight:700;color:#1a1f2e;margin-bottom:12px;">How to proceed:</div>' +
    '<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">' +

    // Step 1
    '<tr><td style="padding:6px 0;vertical-align:top;width:28px;">' +
    '<div style="width:22px;height:22px;line-height:22px;border-radius:50%;background:' + CONFIG.brandColor + ';color:#fff;font-size:11px;font-weight:700;text-align:center;">1</div>' +
    '</td><td style="padding:6px 0 6px 8px;font-size:13px;color:#555;line-height:22px;">Go back to the Admin Login page</td></tr>' +

    // Step 2
    '<tr><td style="padding:6px 0;vertical-align:top;">' +
    '<div style="width:22px;height:22px;line-height:22px;border-radius:50%;background:' + CONFIG.brandColor + ';color:#fff;font-size:11px;font-weight:700;text-align:center;">2</div>' +
    '</td><td style="padding:6px 0 6px 8px;font-size:13px;color:#555;line-height:22px;">Enter the access code shown above</td></tr>' +

    // Step 3
    '<tr><td style="padding:6px 0;vertical-align:top;">' +
    '<div style="width:22px;height:22px;line-height:22px;border-radius:50%;background:' + CONFIG.brandColor + ';color:#fff;font-size:11px;font-weight:700;text-align:center;">3</div>' +
    '</td><td style="padding:6px 0 6px 8px;font-size:13px;color:#555;line-height:22px;">Click <strong>&ldquo;Verify &amp; Login&rdquo;</strong></td></tr>' +

    // Step 4
    '<tr><td style="padding:6px 0;vertical-align:top;">' +
    '<div style="width:22px;height:22px;line-height:22px;border-radius:50%;background:' + CONFIG.brandColor + ';color:#fff;font-size:11px;font-weight:700;text-align:center;">4</div>' +
    '</td><td style="padding:6px 0 6px 8px;font-size:13px;color:#555;line-height:22px;">You will be redirected to the Admin Dashboard</td></tr>' +

    '</table></td></tr>' +

    // ═══ SECURITY NOTICE ═══
    '<tr><td style="padding:24px 28px 0;">' +
    '<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:rgba(239,68,68,0.06);border-left:4px solid #ef4444;border-radius:0 6px 6px 0;">' +
    '<tr><td style="padding:14px 16px;">' +
    '<div style="font-size:12px;font-weight:700;color:#dc2626;margin-bottom:4px;">&#x1F6A8; Security Notice</div>' +
    '<div style="font-size:12px;color:#777;line-height:1.6;">This code is valid for <strong style="color:#555;">' + expiryMin + ' minutes only</strong>. Do not share this code with anyone. CSBS staff will never ask for your access code.</div>' +
    '</td></tr></table>' +
    '</td></tr>' +

    // ═══ DISCLAIMER ═══
    '<tr><td style="padding:24px 28px 32px;">' +
    '<div style="font-size:12px;color:#94a3b8;line-height:1.6;border-top:1px solid #e2e8f0;padding-top:16px;">If you did not request this code, please ignore this email or contact your administrator.</div>' +
    '</td></tr>' +

    // ═══ FOOTER ═══
    '<tr><td style="background:#f8fafc;border-top:1px solid #e2e8f0;padding:18px 28px;text-align:center;">' +
    '<div style="font-size:11px;color:#94a3b8;">&copy; ' + year + ' ' + CONFIG.projectName + ' &mdash; VIT Bhimavaram. All rights reserved.</div>' +
    '</td></tr>' +

    '</table>' +  // end main card
    '</td></tr></table>' +  // end outer wrapper
    '</body></html>';
}

// ═══════════════════════════════════════════════════════════════
// HTTP ENDPOINTS — doPost / doGet
// ═══════════════════════════════════════════════════════════════

/**
 * Handle POST requests from the website.
 * 
 * Two actions supported:
 * 
 * ACTION 1: "sendCode" — Request an access code
 *   Payload: { action: "sendCode", email: "admin@example.com" }
 *   Steps:
 *     1. Validate email format
 *     2. Check Firestore "admins" collection for the email
 *     3. Generate CSBS-XXXX code
 *     4. Store code with timestamp (5-min expiry)
 *     5. Send code via email from csbs.vitb@gmail.com
 *     6. Return success
 * 
 * ACTION 2: "verifyCode" — Verify an access code
 *   Payload: { action: "verifyCode", email: "admin@example.com", accessCode: "CSBS-1234" }
 *   Steps:
 *     1. Look up stored code for that email
 *     2. Check if code has expired (>5 min)
 *     3. Compare codes (case-insensitive)
 *     4. If valid → delete code (single-use), return success
 *     5. If invalid/expired → return error
 * 
 * LEGACY (backward-compatible):
 *   Payload: { email, code/accessCode, name, action/isFirstTime }
 *   Treated as direct email send (skips Firestore check).
 */
function doPost(e) {
  try {
    var payload;

    // Parse the JSON body (supports text/plain from no-cors mode)
    try {
      payload = JSON.parse(e.postData.contents);
    } catch (parseErr) {
      return jsonResponse({ success: false, error: 'Invalid JSON payload' });
    }

    var action = payload.action || '';
    var rawEmail = payload.email || '';

    // ── Route by action ─────────────────────────────────
    if (action === 'sendCode') {
      return handleSendCode(rawEmail);
    }

    if (action === 'verifyCode') {
      return handleVerifyCode(rawEmail, payload.accessCode || payload.code || '');
    }

    // ── Legacy: direct email send (backward-compatible) ──
    // If payload has "code" or "accessCode" + "email", treat as legacy send
    var legacyCode = payload.code || payload.accessCode;
    if (rawEmail && legacyCode) {
      return handleLegacySend(payload);
    }

    // ── Unknown action ───────────────────────────────────
    return jsonResponse({
      success: false,
      error: 'Unknown action. Use "sendCode" or "verifyCode".'
    });

  } catch (err) {
    Logger.log('[doPost] Unhandled error: ' + err);
    return jsonResponse({ success: false, error: 'Internal server error: ' + err.message });
  }
}

/**
 * Handle GET requests — health check / service status
 */
function doGet(e) {
  var remaining = MailApp.getRemainingDailyQuota();

  var status = {
    service: 'CSBS Admin Authentication Service',
    version: '4.0 (Firestore-Verified, 5-Min Expiry)',
    sender: CONFIG.senderEmail,
    codeFormat: CONFIG.codePrefix + '-XXXX',
    codeExpiryMinutes: CONFIG.codeExpiryMinutes,
    gmailQuotaRemaining: remaining,
    firestoreProject: CONFIG.firebaseProjectId,
    timestamp: new Date().toISOString()
  };

  return ContentService.createTextOutput(JSON.stringify(status, null, 2))
    .setMimeType(ContentService.MimeType.JSON);
}

// ═══════════════════════════════════════════════════════════════
// ACTION HANDLERS
// ═══════════════════════════════════════════════════════════════

/**
 * ACTION: sendCode
 * 1. Validate email
 * 2. Check Firestore admins collection
 * 3. Generate code, store, send email
 */
function handleSendCode(rawEmail) {
  // Validate email
  if (!rawEmail || !isValidEmail(rawEmail)) {
    Logger.log('[SEND_CODE] Invalid or missing email: ' + rawEmail);
    return jsonResponse({ success: false, error: 'Valid email address is required.' });
  }

  var email = rawEmail.toLowerCase().trim();

  // Prevent sending to the sender itself
  if (email === CONFIG.senderEmail.toLowerCase()) {
    Logger.log('[SEND_CODE] Blocked: cannot send to sender email');
    return jsonResponse({ success: false, error: 'Cannot send access code to the sender account.' });
  }

  // ── Step 1: Check Firestore "admins" collection ────────
  Logger.log('[SEND_CODE] Checking Firestore for admin: ' + email);
  var adminDoc = null;

  try {
    adminDoc = checkEmailInFirestore(email);
  } catch (firestoreErr) {
    Logger.log('[SEND_CODE] Firestore check failed: ' + firestoreErr);
    return jsonResponse({
      success: false,
      error: 'Unable to verify admin status. Please try again later.'
    });
  }

  if (!adminDoc) {
    Logger.log('[SEND_CODE] Email NOT in admins collection: ' + email);
    return jsonResponse({
      success: false,
      error: 'Your email is not authorized for admin access.'
    });
  }

  Logger.log('[SEND_CODE] ✅ Admin verified in Firestore: ' + email);
  var adminName = adminDoc.name || adminDoc.displayName || email.split('@')[0];

  // ── Step 2: Check if a valid code already exists ───────
  var existing = getStoredCode(email);
  if (existing && !existing.expired) {
    var remainingSec = (CONFIG.codeExpiryMinutes * 60) - existing.ageSeconds;
    Logger.log('[SEND_CODE] Active code exists for ' + email + ' (' + remainingSec + 's remaining)');
    return jsonResponse({
      success: true,
      message: 'An active access code was already sent. Check your email. It expires in ' + Math.ceil(remainingSec / 60) + ' minute(s).',
      alreadySent: true
    });
  }

  // ── Step 3: Generate new code ──────────────────────────
  var accessCode = generateAccessCode();
  Logger.log('[SEND_CODE] Generated code: ' + accessCode + ' for ' + email);

  // ── Step 4: Store code with timestamp ──────────────────
  storeAccessCode(email, accessCode);

  // ── Step 5: Send email ─────────────────────────────────
  var emailResult = sendAccessCodeEmail(email, accessCode, adminName);

  if (!emailResult.success) {
    // Clean up stored code if email failed
    deleteStoredCode(email);
    return jsonResponse({
      success: false,
      error: 'Failed to send access code email: ' + emailResult.error
    });
  }

  Logger.log('[SEND_CODE] ✅ Code sent to ' + email + ' from ' + emailResult.sentFrom);

  return jsonResponse({
    success: true,
    message: 'Access code sent to your email. It will expire in ' + CONFIG.codeExpiryMinutes + ' minutes.',
    codeExpiryMinutes: CONFIG.codeExpiryMinutes
  });
}

/**
 * ACTION: verifyCode
 * 1. Check stored code
 * 2. Validate expiry (5 min)
 * 3. Compare codes
 * 4. Delete on success (single-use)
 */
function handleVerifyCode(rawEmail, rawCode) {
  if (!rawEmail || !isValidEmail(rawEmail)) {
    return jsonResponse({ success: false, error: 'Valid email address is required.' });
  }
  if (!rawCode || !rawCode.trim()) {
    return jsonResponse({ success: false, error: 'Access code is required.' });
  }

  var email = rawEmail.toLowerCase().trim();
  var submittedCode = rawCode.trim().toUpperCase();

  // ── Step 1: Retrieve stored code ───────────────────────
  var stored = getStoredCode(email);

  if (!stored) {
    Logger.log('[VERIFY] No code found for ' + email);
    return jsonResponse({
      success: false,
      error: 'No access code found. Please request a new one.'
    });
  }

  // ── Step 2: Check expiry ───────────────────────────────
  if (stored.expired) {
    Logger.log('[VERIFY] Code EXPIRED for ' + email + ' (age: ' + stored.ageSeconds + 's)');
    deleteStoredCode(email); // Clean up expired code
    return jsonResponse({
      success: false,
      error: 'Access code has expired. Please request a new one.',
      expired: true
    });
  }

  // ── Step 3: Compare codes ──────────────────────────────
  if (submittedCode !== stored.code.toUpperCase()) {
    Logger.log('[VERIFY] Invalid code for ' + email + '. Got: ' + submittedCode + ', Expected: ' + stored.code);
    return jsonResponse({
      success: false,
      error: 'Invalid access code. Please check and try again.'
    });
  }

  // ── Step 4: Code valid → delete (single-use) ──────────
  deleteStoredCode(email);
  Logger.log('[VERIFY] ✅ Code verified for ' + email + '! Code deleted (single-use).');

  return jsonResponse({
    success: true,
    message: 'Access code verified successfully!',
    verified: true
  });
}

/**
 * LEGACY: Backward-compatible direct email send
 * For existing frontend code that sends { email, code, name, action }
 */
function handleLegacySend(payload) {
  var email = (payload.email || '').toLowerCase().trim();
  var code = payload.code || payload.accessCode || '';
  var name = payload.name || email.split('@')[0];

  if (!isValidEmail(email)) {
    return jsonResponse({ success: false, error: 'Invalid email format' });
  }

  // Try Firestore check but don't block email if it fails
  // (the frontend already verified admin status before calling us)
  try {
    var adminDoc = checkEmailInFirestore(email);
    if (adminDoc) {
      Logger.log('[LEGACY] ✅ Admin verified in Firestore: ' + email);
      name = adminDoc.name || adminDoc.displayName || name;
    } else {
      Logger.log('[LEGACY] ⚠️ Admin not found in Firestore, but proceeding (frontend verified)');
    }
  } catch (err) {
    Logger.log('[LEGACY] ⚠️ Firestore check failed, proceeding anyway: ' + err);
  }

  Logger.log('[LEGACY] Sending code to: ' + email);
  var result = sendAccessCodeEmail(email, code, name);

  return jsonResponse(result);
}

// ═══════════════════════════════════════════════════════════════
// UTILITY
// ═══════════════════════════════════════════════════════════════

/**
 * Create a JSON ContentService response
 */
function jsonResponse(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

// ═══════════════════════════════════════════════════════════════
// TESTING FUNCTIONS — Run from Apps Script Editor
// ═══════════════════════════════════════════════════════════════

/**
 * TEST 1: Full End-to-End — Send + Verify Access Code
 * 
 * Simulates the complete admin auth flow:
 *   1. Checks Firestore for test email
 *   2. Generates CSBS-XXXX code
 *   3. Sends email to 24pa1a5723@vishnu.edu.in
 *   4. Verifies the code
 *   5. Confirms code deletion (single-use)
 * 
 * Run this from the Apps Script editor (▶ button).
 * Check 24pa1a5723@vishnu.edu.in inbox for the email.
 */
function testFullFlow() {
  var testEmail = '24pa1a5723@vishnu.edu.in';

  Logger.log('═══════════════════════════════════════════════════════');
  Logger.log('  TEST: Full Admin Authentication Flow');
  Logger.log('  Email: ' + testEmail);
  Logger.log('═══════════════════════════════════════════════════════');
  Logger.log('');

  // ── Step 1: Check Firestore ─────────────────────────────
  Logger.log('── Step 1: Checking Firestore for admin email ──');
  try {
    var adminDoc = checkEmailInFirestore(testEmail);
    if (adminDoc) {
      Logger.log('✅ Admin found in Firestore: ' + JSON.stringify(adminDoc));
    } else {
      Logger.log('❌ Admin NOT found in Firestore.');
      Logger.log('⚠️ Add this document to Firestore admins collection:');
      Logger.log('   Collection: admins');
      Logger.log('   Document: (auto-ID)');
      Logger.log('   Field: email = "' + testEmail + '"');
      Logger.log('');
      Logger.log('Continuing test with email send anyway...');
    }
  } catch (err) {
    Logger.log('⚠️ Firestore check failed: ' + err);
    Logger.log('   Make sure CONFIG.firebaseProjectId is set correctly.');
  }
  Logger.log('');

  // ── Step 2: Generate code ──────────────────────────────
  Logger.log('── Step 2: Generating access code ──');
  var code = generateAccessCode();
  Logger.log('Generated code: ' + code);
  Logger.log('');

  // ── Step 3: Store code ─────────────────────────────────
  Logger.log('── Step 3: Storing code (5-min expiry) ──');
  storeAccessCode(testEmail, code);
  var stored = getStoredCode(testEmail);
  Logger.log('Stored: ' + JSON.stringify(stored));
  Logger.log('');

  // ── Step 4: Send email ─────────────────────────────────
  Logger.log('── Step 4: Sending email ──');
  var emailResult = sendAccessCodeEmail(testEmail, code, 'Test Admin');
  Logger.log('Email result: ' + JSON.stringify(emailResult));
  Logger.log('');

  // ── Step 5: Verify code ────────────────────────────────
  Logger.log('── Step 5: Verifying code ──');
  var verifyStored = getStoredCode(testEmail);
  if (verifyStored && !verifyStored.expired) {
    Logger.log('Code is still valid (age: ' + verifyStored.ageSeconds + 's)');

    if (code.toUpperCase() === verifyStored.code.toUpperCase()) {
      Logger.log('✅ Code matches! Verification would succeed.');
      deleteStoredCode(testEmail);
      Logger.log('Code deleted (single-use).');
    } else {
      Logger.log('❌ Code mismatch (this should not happen in test)');
    }
  } else {
    Logger.log('❌ Code expired or not found');
  }
  Logger.log('');

  // ── Step 6: Confirm deletion ───────────────────────────
  Logger.log('── Step 6: Confirming code is deleted ──');
  var afterDelete = getStoredCode(testEmail);
  Logger.log('Code after deletion: ' + (afterDelete ? JSON.stringify(afterDelete) : 'null (deleted ✅)'));
  Logger.log('');

  Logger.log('═══════════════════════════════════════════════════════');
  Logger.log('  ✅ TEST COMPLETE');
  Logger.log('  Check inbox at: ' + testEmail);
  Logger.log('  Code sent: ' + code);
  Logger.log('═══════════════════════════════════════════════════════');
}

/**
 * TEST 2: Quick Send — Just send an access code email
 * 
 * Generates and sends a code to 24pa1a5723@vishnu.edu.in
 * without the full verification flow. Good for testing email delivery.
 */
function testQuickSend() {
  var testEmail = '24pa1a5723@vishnu.edu.in';
  var code = generateAccessCode();

  Logger.log('═══════════════════════════════════════════');
  Logger.log('  QUICK SEND TEST');
  Logger.log('  To: ' + testEmail);
  Logger.log('  Code: ' + code);
  Logger.log('═══════════════════════════════════════════');

  storeAccessCode(testEmail, code);
  var result = sendAccessCodeEmail(testEmail, code, 'Test Admin');
  Logger.log('Result: ' + JSON.stringify(result));

  if (result.success) {
    Logger.log('✅ SUCCESS — Check inbox at ' + testEmail);
  } else {
    Logger.log('❌ FAILED — ' + result.error);
  }
}

/**
 * TEST 3: Firestore Connection — Verify Firestore access works
 * 
 * Checks if the script can reach Firestore and query the admins collection.
 * Tests with 24pa1a5723@vishnu.edu.in
 */
function testFirestoreConnection() {
  var testEmail = '24pa1a5723@vishnu.edu.in';

  Logger.log('═══════════════════════════════════════════');
  Logger.log('  TEST: Firestore Connection');
  Logger.log('  Project: ' + CONFIG.firebaseProjectId);
  Logger.log('  Query: admins where email == "' + testEmail + '"');
  Logger.log('═══════════════════════════════════════════');

  try {
    var result = checkEmailInFirestore(testEmail);
    if (result) {
      Logger.log('✅ Admin found: ' + JSON.stringify(result));
    } else {
      Logger.log('❌ Admin not found in collection.');
      Logger.log('');
      Logger.log('To fix: Add to Firestore Console →');
      Logger.log('  Collection: admins');
      Logger.log('  Add Document (auto-ID) with field:');
      Logger.log('    email (string): ' + testEmail);
    }
  } catch (err) {
    Logger.log('❌ Firestore connection FAILED: ' + err);
    Logger.log('');
    Logger.log('Troubleshooting:');
    Logger.log('  1. Check CONFIG.firebaseProjectId is correct');
    Logger.log('  2. Ensure Firestore is enabled in your Firebase project');
    Logger.log('  3. Check the script has Cloud Firestore API enabled');
    Logger.log('     → Resources → Advanced Google Services → enable Firestore');
  }
}

/**
 * TEST 4: Code Expiry — Verify 5-minute expiry works
 * 
 * Stores a code, checks validity, simulates expired code by backdating.
 */
function testCodeExpiry() {
  var testEmail = 'expiry-test@example.com';

  Logger.log('═══════════════════════════════════════════');
  Logger.log('  TEST: 5-Minute Code Expiry');
  Logger.log('═══════════════════════════════════════════');

  // Store a fresh code
  var code = generateAccessCode();
  storeAccessCode(testEmail, code);
  Logger.log('Stored code: ' + code);

  // Check — should be valid
  var check1 = getStoredCode(testEmail);
  Logger.log('Fresh code: expired=' + check1.expired + ', age=' + check1.ageSeconds + 's');
  Logger.log(check1.expired ? '❌ FAIL: Fresh code should not be expired' : '✅ PASS: Fresh code is valid');

  // Simulate expired code by backdating the createdAt
  var props = PropertiesService.getScriptProperties();
  var key = 'code_' + testEmail;
  var expiredData = {
    code: code,
    createdAt: new Date().getTime() - (6 * 60 * 1000) // 6 minutes ago
  };
  props.setProperty(key, JSON.stringify(expiredData));
  Logger.log('Backdated code to 6 minutes ago...');

  // Check — should be expired
  var check2 = getStoredCode(testEmail);
  Logger.log('Backdated code: expired=' + check2.expired + ', age=' + check2.ageSeconds + 's');
  Logger.log(check2.expired ? '✅ PASS: Expired code detected correctly' : '❌ FAIL: Should be expired');

  // Cleanup
  deleteStoredCode(testEmail);
  Logger.log('');
  Logger.log('Test cleanup done.');
}

/**
 * TEST 5: Unauthorized Email — Verify non-admin emails are rejected
 * 
 * Tests various emails that should NOT be allowed.
 */
function testUnauthorizedEmails() {
  Logger.log('═══════════════════════════════════════════');
  Logger.log('  TEST: Unauthorized Email Rejection');
  Logger.log('═══════════════════════════════════════════');

  var testCases = [
    { email: 'random.person@gmail.com',    label: 'Random Gmail' },
    { email: 'hacker@evil.com',            label: 'Malicious email' },
    { email: 'csbs.vitb@gmail.com',        label: 'Sender email (self)' },
    { email: '',                           label: 'Empty email' },
    { email: 'notanemail',                 label: 'Invalid format' },
    { email: '24pa1a5723@vishnu.edu.in',   label: 'Authorized admin (should pass Firestore check)' },
  ];

  for (var i = 0; i < testCases.length; i++) {
    var tc = testCases[i];
    var isValid = isValidEmail(tc.email);
    var isSelf = tc.email.toLowerCase().trim() === CONFIG.senderEmail.toLowerCase();

    Logger.log('');
    Logger.log('─── Case: ' + tc.label + ' ───');
    Logger.log('Email: "' + tc.email + '"');
    Logger.log('Valid format: ' + isValid);
    Logger.log('Is sender: ' + isSelf);

    if (isValid && !isSelf) {
      try {
        var firestore = checkEmailInFirestore(tc.email);
        Logger.log('In Firestore admins: ' + (firestore ? '✅ YES' : '❌ NO'));
      } catch (err) {
        Logger.log('Firestore check error: ' + err.message);
      }
    } else {
      Logger.log('→ Would be REJECTED before Firestore check');
    }
  }
}

/**
 * UTILITY: View all stored codes (for debugging)
 */
function viewStoredCodes() {
  var props = PropertiesService.getScriptProperties();
  var all = props.getProperties();

  Logger.log('═══════════════════════════════════════════');
  Logger.log('  STORED ACCESS CODES');
  Logger.log('═══════════════════════════════════════════');

  var count = 0;
  for (var key in all) {
    if (key.indexOf('code_') === 0) {
      var email = key.replace('code_', '');
      try {
        var data = JSON.parse(all[key]);
        var ageMs = new Date().getTime() - data.createdAt;
        var expired = ageMs > (CONFIG.codeExpiryMinutes * 60 * 1000);
        Logger.log('  ' + email + ' → ' + data.code +
          ' (age: ' + Math.floor(ageMs / 1000) + 's, ' +
          (expired ? 'EXPIRED ❌' : 'VALID ✅') + ')');
        count++;
      } catch (e) {
        Logger.log('  ' + key + ' → [parse error]');
      }
    }
  }

  if (count === 0) {
    Logger.log('  (no stored codes)');
  }
}

/**
 * UTILITY: Clear all stored codes (manual cleanup)
 */
function clearAllCodes() {
  var props = PropertiesService.getScriptProperties();
  var all = props.getProperties();
  var deleted = 0;

  for (var key in all) {
    if (key.indexOf('code_') === 0) {
      props.deleteProperty(key);
      deleted++;
    }
  }

  Logger.log('Cleared ' + deleted + ' stored access codes.');
}
