/**
 * Google Apps Script - Admin OTP Email Service (Single Script, Multi-Sender)
 * 
 * This script sends admin access codes (OTP) via email using multiple
 * Gmail "Send mail as" aliases from a SINGLE Apps Script deployment.
 * When one sender alias hits its configured limit, it automatically
 * rotates to the next available alias.
 * 
 * Setup Instructions (ONE-TIME):
 * ─────────────────────────────────────────────────────────────────
 * 1. Log in to the PRIMARY Gmail account (csbs.vitb@gmail.com)
 * 2. Go to Gmail → Settings (⚙️) → See all settings → Accounts tab
 * 3. Under "Send mail as:", click "Add another email address"
 * 4. Add each alias email (csbs.vitb1@gmail.com, csbs.vitb2@gmail.com, etc.)
 *    - Uncheck "Treat as an alias" if it's a separate Gmail account
 *    - Gmail will send a verification email to the alias — confirm it
 * 5. Repeat for all sender accounts
 * 6. Deploy THIS script as a Web App: "Execute as: Me" and "Access: Anyone"
 * 7. Only ONE deployment URL is needed — paste it in your .env file
 * 
 * How It Works:
 *   - Tracks how many emails each alias has sent today (PropertiesService)
 *   - When an alias reaches LIMIT_PER_ALIAS, switches to the next alias
 *   - Uses GmailApp.sendEmail() with the "from" option for alias rotation
 *   - All aliases share the same Gmail quota (100/day free, 1500/day Workspace)
 *   - LIMIT_PER_ALIAS distributes sends evenly across all aliases
 *   - Resets all counts daily (tracked by date key)
 */

// ═══════════════════════════════════════════════════════════════
// CONFIGURATION
// ═══════════════════════════════════════════════════════════════

const APPS_SCRIPT_CONFIG = {
  projectName: 'CSBS',
  brandColor: '#EB4D28',
  brandColorSecondary: '#2E3190',

  // ── Per-Alias Daily Send Limit ──────────────────────────
  // Distributes sends across aliases. Total capacity = LIMIT_PER_ALIAS × number of aliases
  // Example: 20 × 5 aliases = 100 emails/day (matches free Gmail quota)
  // For Google Workspace: set to 300 (300 × 5 = 1500)
  LIMIT_PER_ALIAS: 20,

  // ── Sender Aliases ──────────────────────────────────────
  // All must be configured as "Send mail as" in the primary Gmail account
  // The first entry should be the primary (script owner) account
  SENDER_ALIASES: [
    { email: "csbs.vitb@gmail.com",  name: "CSBS Tech Fest 2026" },
    { email: "csbs.vitb1@gmail.com", name: "CSBS Tech Fest 2026" },
    { email: "csbs.vitb2@gmail.com", name: "CSBS Tech Fest 2026" },
    { email: "csbs.vitb3@gmail.com", name: "CSBS Tech Fest 2026" },
    { email: "csbs.vitb4@gmail.com", name: "CSBS Tech Fest 2026" }
  ],

  // ── Authorized Admin Emails (WHITELIST) ─────────────────
  // ONLY these emails can receive access codes from this script.
  // Add every admin's email here. The script REFUSES to send to any
  // email NOT in this list — prevents abuse of the public endpoint.
  // Keep this in sync with the Firestore "admins" collection.
  AUTHORIZED_ADMIN_EMAILS: [
    '24pa1a5723@vishnu.edu.in'
    // Add more authorized admin emails below:
    // 'admin2@vishnu.edu.in',
    // 'admin3@vishnu.edu.in',
  ]
};

// ═══════════════════════════════════════════════════════════════
// ALIAS ROTATION & DAILY TRACKING (PropertiesService)
// ═══════════════════════════════════════════════════════════════

/**
 * Get today's date key for tracking (YYYY-MM-DD)
 */
function getTodayKey() {
  return Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd');
}

/**
 * Get the send count for an alias today
 */
function getAliasCount(aliasEmail) {
  var props = PropertiesService.getScriptProperties();
  var key = 'sends_' + aliasEmail + '_' + getTodayKey();
  var val = props.getProperty(key);
  return val ? parseInt(val, 10) : 0;
}

/**
 * Increment the send count for an alias today
 */
function incrementAliasCount(aliasEmail) {
  var props = PropertiesService.getScriptProperties();
  var key = 'sends_' + aliasEmail + '_' + getTodayKey();
  var current = getAliasCount(aliasEmail);
  props.setProperty(key, String(current + 1));
  Logger.log('[TRACK] ' + aliasEmail + ' → ' + (current + 1) + ' sends today');
}

/**
 * Check if an alias has reached its daily limit
 */
function isAliasLimitReached(aliasEmail) {
  return getAliasCount(aliasEmail) >= APPS_SCRIPT_CONFIG.LIMIT_PER_ALIAS;
}

/**
 * Get the next available alias (first one under its limit)
 * Returns null if all aliases are exhausted
 */
function getActiveAlias() {
  var aliases = APPS_SCRIPT_CONFIG.SENDER_ALIASES;
  for (var i = 0; i < aliases.length; i++) {
    if (!isAliasLimitReached(aliases[i].email)) {
      return aliases[i];
    }
  }
  return null; // All aliases exhausted for today
}

// ═══════════════════════════════════════════════════════════════
// CORE EMAIL SENDING WITH ALIAS ROTATION
// ═══════════════════════════════════════════════════════════════

/**
 * Send email with automatic alias rotation
 * Tries each alias in order; skips any that have hit their daily limit.
 * Uses GmailApp.sendEmail() with the "from" option.
 * 
 * @param {string} recipientEmail - Recipient email address
 * @param {string} subject - Email subject
 * @param {string} htmlBody - HTML email body
 * @returns {object} { success, message, sentFrom }
 */
function sendEmailWithRotation(recipientEmail, subject, htmlBody) {
  var aliases = APPS_SCRIPT_CONFIG.SENDER_ALIASES;
  var lastError = '';

  // ── SECURITY: Double-check recipient is authorized ──────
  var normalizedRecipient = recipientEmail.toLowerCase().trim();
  if (!isAuthorizedRecipient(normalizedRecipient)) {
    Logger.log('[BLOCKED] sendEmailWithRotation refused unauthorized recipient: ' + normalizedRecipient);
    return { success: false, error: 'Recipient not authorized' };
  }
  if (isSenderAlias(normalizedRecipient)) {
    Logger.log('[BLOCKED] sendEmailWithRotation refused sender alias as recipient: ' + normalizedRecipient);
    return { success: false, error: 'Cannot send to sender alias' };
  }

  // Check overall Gmail quota first
  var remaining = MailApp.getRemainingDailyQuota();
  Logger.log('[QUOTA] Gmail remaining daily quota: ' + remaining);

  if (remaining <= 0) {
    Logger.log('[CRITICAL] Gmail daily quota fully exhausted');
    return { success: false, error: 'Gmail daily quota exhausted (0 remaining)' };
  }

  // Try each alias in order
  for (var i = 0; i < aliases.length; i++) {
    var alias = aliases[i];

    // Skip if this alias has reached its configured limit
    if (isAliasLimitReached(alias.email)) {
      Logger.log('[ROTATE] Skipping ' + alias.email + ' — reached limit of ' + APPS_SCRIPT_CONFIG.LIMIT_PER_ALIAS + ' sends today');
      continue;
    }

    try {
      Logger.log('[SEND] Trying alias: ' + alias.email + ' (sent today: ' + getAliasCount(alias.email) + ')');

      GmailApp.sendEmail(recipientEmail, subject, '', {
        htmlBody: htmlBody,
        from: alias.email,
        name: alias.name
      });

      // Success — track the send
      incrementAliasCount(alias.email);
      Logger.log('[SUCCESS] Email sent from ' + alias.email + ' to ' + recipientEmail);
      return { success: true, message: 'Email sent successfully', sentFrom: alias.email };

    } catch (err) {
      lastError = err.toString();
      Logger.log('[ERROR] Alias ' + alias.email + ' failed: ' + lastError);

      // If it's a quota error, the whole account is exhausted
      if (isQuotaError(lastError)) {
        Logger.log('[CRITICAL] Gmail quota error — all aliases affected');
        return { success: false, error: 'Gmail quota exceeded: ' + lastError };
      }

      // For other errors (e.g., alias not configured), try the next alias
      continue;
    }
  }

  // All aliases exhausted their configured limits
  Logger.log('[EXHAUSTED] All ' + aliases.length + ' aliases have reached their daily limit');
  return { 
    success: false, 
    error: 'All sender aliases exhausted (' + APPS_SCRIPT_CONFIG.LIMIT_PER_ALIAS + ' emails each). Last error: ' + lastError 
  };
}

/**
 * Check if an error message indicates a quota/limit issue
 */
function isQuotaError(errorMsg) {
  var lowerErr = errorMsg.toLowerCase();
  return lowerErr.indexOf('limit') > -1 ||
         lowerErr.indexOf('quota') > -1 ||
         lowerErr.indexOf('exceeded') > -1 ||
         lowerErr.indexOf('too many') > -1 ||
         lowerErr.indexOf('rate') > -1;
}

// ═══════════════════════════════════════════════════════════════
// HTTP ENDPOINT (doPost / doGet)
// ═══════════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════════
// RECIPIENT VALIDATION — STRICT EMAIL SECURITY
// ═══════════════════════════════════════════════════════════════

/**
 * Validate email format (basic RFC check)
 */
function isValidEmail(email) {
  if (!email || typeof email !== 'string') return false;
  // Basic email format: something@something.something
  var emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email.trim());
}

/**
 * Check if a recipient email is in the authorized admin whitelist.
 * Comparison is case-insensitive.
 * Returns true ONLY if the email is explicitly listed.
 */
function isAuthorizedRecipient(email) {
  if (!email) return false;
  var normalizedEmail = email.toLowerCase().trim();
  var whitelist = APPS_SCRIPT_CONFIG.AUTHORIZED_ADMIN_EMAILS;
  for (var i = 0; i < whitelist.length; i++) {
    if (whitelist[i].toLowerCase().trim() === normalizedEmail) {
      return true;
    }
  }
  return false;
}

/**
 * Ensure a recipient email is NOT one of the sender aliases.
 * Prevents accidentally mailing the sender accounts.
 */
function isSenderAlias(email) {
  if (!email) return false;
  var normalizedEmail = email.toLowerCase().trim();
  var aliases = APPS_SCRIPT_CONFIG.SENDER_ALIASES;
  for (var i = 0; i < aliases.length; i++) {
    if (aliases[i].email.toLowerCase().trim() === normalizedEmail) {
      return true;
    }
  }
  return false;
}

// ═══════════════════════════════════════════════════════════════
// HTTP ENDPOINT (doPost / doGet) — with strict recipient checks
// ═══════════════════════════════════════════════════════════════

/**
 * Handle POST requests — main entry point from the web app
 * 
 * SECURITY:
 *   1. Validates email format
 *   2. Checks email is in AUTHORIZED_ADMIN_EMAILS whitelist
 *   3. Ensures email is NOT a sender alias
 *   4. Only then sends the OTP to that EXACT email
 */
function doPost(e) {
  try {
    var payload;
    
    // Handle both JSON content-type and text/plain (no-cors mode)
    try {
      payload = JSON.parse(e.postData.contents);
    } catch (parseErr) {
      return ContentService.createTextOutput(
        JSON.stringify({ success: false, error: 'Invalid JSON payload' })
      ).setMimeType(ContentService.MimeType.JSON);
    }

    // ── Extract fields ─────────────────────────────────────
    // Support both field names: "code" and "accessCode"
    var rawEmail = payload.email;
    var code = payload.code || payload.accessCode;
    var name = payload.name || '';
    var action = payload.action || (payload.isFirstTime ? 'registration' : 'login');

    // ── Step 1: Validate required fields ───────────────────
    if (!rawEmail || !code) {
      Logger.log('[REJECT] Missing required fields — email: ' + rawEmail + ', code: ' + (code ? 'present' : 'missing'));
      return ContentService.createTextOutput(
        JSON.stringify({ success: false, error: 'Missing required fields (email, code)' })
      ).setMimeType(ContentService.MimeType.JSON);
    }

    // Normalize the email
    var email = rawEmail.toLowerCase().trim();

    // ── Step 2: Validate email format ──────────────────────
    if (!isValidEmail(email)) {
      Logger.log('[REJECT] Invalid email format: ' + email);
      return ContentService.createTextOutput(
        JSON.stringify({ success: false, error: 'Invalid email format' })
      ).setMimeType(ContentService.MimeType.JSON);
    }

    // ── Step 3: Block sender aliases as recipients ─────────
    if (isSenderAlias(email)) {
      Logger.log('[REJECT] Blocked attempt to send OTP to sender alias: ' + email);
      return ContentService.createTextOutput(
        JSON.stringify({ success: false, error: 'Cannot send OTP to a sender account' })
      ).setMimeType(ContentService.MimeType.JSON);
    }

    // ── Step 4: Whitelist check — ONLY authorized admins ───
    if (!isAuthorizedRecipient(email)) {
      Logger.log('[REJECT] Unauthorized recipient: ' + email + ' (not in AUTHORIZED_ADMIN_EMAILS whitelist)');
      return ContentService.createTextOutput(
        JSON.stringify({ success: false, error: 'Email not authorized to receive admin access codes' })
      ).setMimeType(ContentService.MimeType.JSON);
    }

    Logger.log('[AUTHORIZED] Recipient verified: ' + email + ' — sending ' + action + ' OTP');

    // ── Step 5: Send email to the EXACT authorized email ───
    var result;
    if (action === 'registration') {
      result = sendRegistrationOTP(email, code, name);
    } else if (action === 'login') {
      result = sendLoginOTP(email, code, name);
    } else {
      // Default to login
      result = sendLoginOTP(email, code, name);
    }

    // Log the outcome
    Logger.log('[RESULT] ' + email + ' — ' + JSON.stringify(result));

    return ContentService.createTextOutput(JSON.stringify(result))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    Logger.log('Error in doPost: ' + err);
    return ContentService.createTextOutput(
      JSON.stringify({ success: false, error: err.toString() })
    ).setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * Handle GET requests — health check / alias status
 */
function doGet(e) {
  var remaining = MailApp.getRemainingDailyQuota();
  var aliases = APPS_SCRIPT_CONFIG.SENDER_ALIASES;
  var aliasList = [];
  var totalSent = 0;

  for (var i = 0; i < aliases.length; i++) {
    var count = getAliasCount(aliases[i].email);
    totalSent += count;
    aliasList.push({
      email: aliases[i].email,
      sentToday: count,
      limit: APPS_SCRIPT_CONFIG.LIMIT_PER_ALIAS,
      available: APPS_SCRIPT_CONFIG.LIMIT_PER_ALIAS - count,
      exhausted: isAliasLimitReached(aliases[i].email)
    });
  }

  var activeAlias = getActiveAlias();

  var status = {
    service: 'CSBS Admin OTP Email Service',
    version: '3.1 (Secured, Whitelist-Enforced)',
    scriptOwner: Session.getEffectiveUser().getEmail(),
    gmailQuotaRemaining: remaining,
    totalAliases: aliases.length,
    limitPerAlias: APPS_SCRIPT_CONFIG.LIMIT_PER_ALIAS,
    totalCapacity: APPS_SCRIPT_CONFIG.LIMIT_PER_ALIAS * aliases.length,
    totalSentToday: totalSent,
    currentActiveAlias: activeAlias ? activeAlias.email : 'ALL EXHAUSTED',
    authorizedRecipients: APPS_SCRIPT_CONFIG.AUTHORIZED_ADMIN_EMAILS.length,
    aliases: aliasList,
    date: getTodayKey(),
    timestamp: new Date().toISOString()
  };

  return ContentService.createTextOutput(JSON.stringify(status, null, 2))
    .setMimeType(ContentService.MimeType.JSON);
}

// ═══════════════════════════════════════════════════════════════
// OTP EMAIL FUNCTIONS (with alias rotation)
// ═══════════════════════════════════════════════════════════════

/**
 * Send Registration OTP Email — with auto alias rotation
 */
function sendRegistrationOTP(email, code, name) {
  var recipientName = name || email.split('@')[0];
  var subject = APPS_SCRIPT_CONFIG.projectName + ' Admin Portal - Registration Code';
  var htmlBody = buildRegistrationEmail(recipientName, code);

  Logger.log('[REGISTRATION] Sending OTP to ' + email);
  return sendEmailWithRotation(email, subject, htmlBody);
}

/**
 * Send Login OTP Email — with auto alias rotation
 */
function sendLoginOTP(email, code, name) {
  var recipientName = name || email.split('@')[0];
  var subject = APPS_SCRIPT_CONFIG.projectName + ' Admin Portal - Verification Code';
  var htmlBody = buildLoginEmail(recipientName, code);

  Logger.log('[LOGIN] Sending verification code to ' + email);
  return sendEmailWithRotation(email, subject, htmlBody);
}

/**
 * Build Registration Email HTML
 */
function buildRegistrationEmail(name, code) {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', sans-serif; background: #f5f7fa; line-height: 1.6; }
        .email-container { max-width: 600px; margin: 0 auto; background: #ffffff; }
        .header { background: linear-gradient(135deg, ${APPS_SCRIPT_CONFIG.brandColor} 0%, #E31B23 100%); padding: 32px 24px; text-align: center; }
        .header h1 { color: #ffffff; font-size: 28px; font-weight: 800; margin-bottom: 8px; letter-spacing: -0.02em; }
        .header p { color: rgba(255, 255, 255, 0.9); font-size: 13px; }
        .content { padding: 40px 32px; }
        .greeting { font-size: 16px; font-weight: 600; color: #1A1F2E; margin-bottom: 16px; }
        .message { font-size: 14px; color: rgba(26, 31, 46, 0.7); margin-bottom: 24px; line-height: 1.7; }
        .code-section { background: linear-gradient(135deg, rgba(46, 49, 144, 0.05) 0%, rgba(235, 77, 40, 0.02) 100%); border: 2px solid rgba(46, 49, 144, 0.1); border-radius: 12px; padding: 24px; text-align: center; margin: 32px 0; }
        .code-label { font-size: 12px; font-weight: 700; letter-spacing: 0.8px; color: rgba(26, 31, 46, 0.5); text-transform: uppercase; margin-bottom: 12px; }
        .code { font-family: 'Courier New', monospace; font-size: 32px; font-weight: 700; letter-spacing: 4px; color: ${APPS_SCRIPT_CONFIG.brandColor}; font-variant-numeric: tabular-nums; }
        .code-note { font-size: 12px; color: rgba(26, 31, 46, 0.5); margin-top: 12px; font-style: italic; }
        .important { background: rgba(239, 68, 68, 0.08); border-left: 4px solid #ef4444; padding: 16px; margin: 24px 0; border-radius: 4px; }
        .important strong { color: #dc2626; }
        .important p { font-size: 13px; color: rgba(26, 31, 46, 0.7); margin: 0; }
        .footer { background: #f8f9fa; border-top: 1px solid #e2e8f0; padding: 24px 32px; text-align: center; }
        .footer p { font-size: 12px; color: rgba(26, 31, 46, 0.5); }
        .footer a { color: ${APPS_SCRIPT_CONFIG.brandColor}; text-decoration: none; }
      </style>
    </head>
    <body>
      <div class="email-container">
        <!-- Header -->
        <div class="header">
          <h1>${APPS_SCRIPT_CONFIG.projectName} ADMIN PORTAL</h1>
          <p>Registration Verification</p>
        </div>

        <!-- Content -->
        <div class="content">
          <div class="greeting">Welcome, ${escapeHtml(name)}! 👋</div>
          <div class="message">
            Your email has been verified and you're ready to set up your admin account. 
            Use the access code below to complete your registration.
          </div>

          <!-- Code Section -->
          <div class="code-section">
            <div class="code-label">Your Access Code</div>
            <div class="code">${code}</div>
            <div class="code-note">Valid for 24 hours</div>
          </div>

          <!-- Steps -->
          <div class="message" style="margin: 28px 0 16px 0; font-weight: 600; color: #1A1F2E;">
            Next Steps:
          </div>
          <ol style="font-size: 14px; color: rgba(26, 31, 46, 0.7); margin-left: 20px; line-height: 1.8;">
            <li>Return to the registration form</li>
            <li>Enter the access code above</li>
            <li>Complete your account setup</li>
            <li>Start managing events!</li>
          </ol>

          <!-- Important Notice -->
          <div class="important">
            <strong>🔒 Security Notice:</strong>
            <p>Never share this code with anyone. ${APPS_SCRIPT_CONFIG.projectName} staff will never ask for your access code.</p>
          </div>

          <!-- Support -->
          <div class="message" style="margin-top: 32px; padding-top: 24px; border-top: 1px solid #e2e8f0;">
            Questions? Contact your administrator or reply to this email.
          </div>
        </div>

        <!-- Footer -->
        <div class="footer">
          <p>
            © ${new Date().getFullYear()} ${APPS_SCRIPT_CONFIG.projectName}. All rights reserved. | 
            <a href="#">Admin Portal</a> | 
            <a href="#">Help Center</a>
          </p>
        </div>
      </div>
    </body>
    </html>
  `
}

/**
 * Build Login Email HTML
 */
function buildLoginEmail(name, code) {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', sans-serif; background: #f5f7fa; line-height: 1.6; }
        .email-container { max-width: 600px; margin: 0 auto; background: #ffffff; }
        .header { background: linear-gradient(135deg, ${APPS_SCRIPT_CONFIG.brandColorSecondary} 0%, ${APPS_SCRIPT_CONFIG.brandColor} 100%); padding: 32px 24px; text-align: center; }
        .header h1 { color: #ffffff; font-size: 28px; font-weight: 800; margin-bottom: 8px; letter-spacing: -0.02em; }
        .header p { color: rgba(255, 255, 255, 0.9); font-size: 13px; }
        .content { padding: 40px 32px; }
        .greeting { font-size: 16px; font-weight: 600; color: #1A1F2E; margin-bottom: 16px; }
        .message { font-size: 14px; color: rgba(26, 31, 46, 0.7); margin-bottom: 24px; line-height: 1.7; }
        .code-section { background: linear-gradient(135deg, rgba(46, 49, 144, 0.05) 0%, rgba(235, 77, 40, 0.02) 100%); border: 2px solid rgba(46, 49, 144, 0.1); border-radius: 12px; padding: 24px; text-align: center; margin: 32px 0; }
        .code-label { font-size: 12px; font-weight: 700; letter-spacing: 0.8px; color: rgba(26, 31, 46, 0.5); text-transform: uppercase; margin-bottom: 12px; }
        .code { font-family: 'Courier New', monospace; font-size: 32px; font-weight: 700; letter-spacing: 4px; color: ${APPS_SCRIPT_CONFIG.brandColor}; font-variant-numeric: tabular-nums; }
        .code-note { font-size: 12px; color: rgba(26, 31, 46, 0.5); margin-top: 12px; font-style: italic; }
        .important { background: rgba(239, 68, 68, 0.08); border-left: 4px solid #ef4444; padding: 16px; margin: 24px 0; border-radius: 4px; }
        .important strong { color: #dc2626; }
        .important p { font-size: 13px; color: rgba(26, 31, 46, 0.7); margin: 0; }
        .footer { background: #f8f9fa; border-top: 1px solid #e2e8f0; padding: 24px 32px; text-align: center; }
        .footer p { font-size: 12px; color: rgba(26, 31, 46, 0.5); }
        .footer a { color: ${APPS_SCRIPT_CONFIG.brandColor}; text-decoration: none; }
      </style>
    </head>
    <body>
      <div class="email-container">
        <!-- Header -->
        <div class="header">
          <h1>${APPS_SCRIPT_CONFIG.projectName} ADMIN PORTAL</h1>
          <p>Login Verification Code</p>
        </div>

        <!-- Content -->
        <div class="content">
          <div class="greeting">Welcome back, ${escapeHtml(name)}! 🔐</div>
          <div class="message">
            A login attempt was detected. Use the verification code below to access your admin account.
          </div>

          <!-- Code Section -->
          <div class="code-section">
            <div class="code-label">Your Verification Code</div>
            <div class="code">${code}</div>
            <div class="code-note">Valid for 10 minutes</div>
          </div>

          <!-- Instructions -->
          <div class="message" style="margin: 28px 0 16px 0; font-weight: 600; color: #1A1F2E;">
            How to proceed:
          </div>
          <ol style="font-size: 14px; color: rgba(26, 31, 46, 0.7); margin-left: 20px; line-height: 1.8;">
            <li>Enter the verification code above</li>
            <li>Click "Verify & Login"</li>
            <li>Access your admin dashboard</li>
          </ol>

          <!-- Important Notice -->
          <div class="important">
            <strong>⚠️ Security Alert:</strong>
            <p>If you didn't request this code or don't recognize this attempt, please contact your administrator immediately. Never share this code with anyone.</p>
          </div>

          <!-- Support -->
          <div class="message" style="margin-top: 32px; padding-top: 24px; border-top: 1px solid #e2e8f0;">
            Having trouble? Contact support or your administrator.
          </div>
        </div>

        <!-- Footer -->
        <div class="footer">
          <p>
            © ${new Date().getFullYear()} ${APPS_SCRIPT_CONFIG.projectName}. All rights reserved. | 
            <a href="#">Admin Portal</a> | 
            <a href="#">Help Center</a>
          </p>
        </div>
      </div>
    </body>
    </html>
  `
}

/**
 * Escape HTML to prevent injection
 */
function escapeHtml(text) {
  if (!text) return '';
  var map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  return String(text).replace(/[&<>"']/g, function(m) { return map[m]; });
}

// ═══════════════════════════════════════════════════════════════
// TESTING & UTILITY FUNCTIONS
// ═══════════════════════════════════════════════════════════════

/**
 * Test email sending — run from Apps Script editor
 * Sends a test OTP to 24pa1a5723@vishnu.edu.in
 */
function testSendEmail() {
  var testCode = 'CSBS-TEST123';
  var testEmail = '24pa1a5723@vishnu.edu.in';
  
  Logger.log('═══════════════════════════════════════');
  Logger.log('  TEST: Sending OTP Email');
  Logger.log('═══════════════════════════════════════');
  Logger.log('Recipient: ' + testEmail);
  Logger.log('Test Code: ' + testCode);
  Logger.log('');

  // Test Registration OTP
  Logger.log('── Testing Registration Email ──');
  var regResult = sendRegistrationOTP(testEmail, testCode, 'Admin Test');
  Logger.log('Registration result: ' + JSON.stringify(regResult));
  Logger.log('');

  // Test Login OTP
  Logger.log('── Testing Login Email ──');
  var loginResult = sendLoginOTP(testEmail, 'CSBS-LOGIN456', 'Admin Test');
  Logger.log('Login result: ' + JSON.stringify(loginResult));
  Logger.log('');

  Logger.log('═══════════════════════════════════════');
  Logger.log('  Check 24pa1a5723@vishnu.edu.in inbox!');
  Logger.log('═══════════════════════════════════════');
}

/**
 * Quick test — sends only a login OTP (single email)
 * Run this for a quick check without sending 2 emails
 */
function testSendSingleEmail() {
  var testCode = 'CSBS-QUICK789';
  var testEmail = '24pa1a5723@vishnu.edu.in';

  Logger.log('Sending single test email to ' + testEmail + '...');
  var result = sendLoginOTP(testEmail, testCode, 'Admin Test');
  Logger.log('Result: ' + JSON.stringify(result));
  
  if (result.success) {
    Logger.log('✅ SUCCESS — Check inbox at ' + testEmail);
    Logger.log('Sent from: ' + result.sentFrom);
  } else {
    Logger.log('❌ FAILED — ' + result.error);
  }
}

/**
 * Test whitelist enforcement — verifies that unauthorized emails are blocked
 * Run this from the Apps Script editor. No emails will be sent.
 */
function testWhitelistEnforcement() {
  Logger.log('═══════════════════════════════════════');
  Logger.log('  TEST: Whitelist Enforcement');
  Logger.log('═══════════════════════════════════════');
  Logger.log('');

  var testCases = [
    { email: '24pa1a5723@vishnu.edu.in', expected: true,  label: 'Authorized admin' },
    { email: 'random@gmail.com',         expected: false, label: 'Random outsider' },
    { email: 'csbs.vitb@gmail.com',      expected: false, label: 'Sender alias (blocked)' },
    { email: '',                          expected: false, label: 'Empty email' },
    { email: 'notanemail',               expected: false, label: 'Invalid format' },
  ];

  var passed = 0;
  for (var i = 0; i < testCases.length; i++) {
    var tc = testCases[i];
    var isAuth = isAuthorizedRecipient(tc.email);
    var isSender = isSenderAlias(tc.email);
    var isValid = isValidEmail(tc.email);
    var wouldSend = isValid && isAuth && !isSender;
    var ok = wouldSend === tc.expected;
    Logger.log((ok ? '✅' : '❌') + ' ' + tc.label + ': "' + tc.email + '" → wouldSend=' + wouldSend + ' (expected ' + tc.expected + ')');
    if (ok) passed++;
  }

  Logger.log('');
  Logger.log('Result: ' + passed + '/' + testCases.length + ' tests passed');
  Logger.log('═══════════════════════════════════════');
}

/**
 * Check alias status — run from Apps Script editor
 * Shows send counts and remaining capacity per alias
 */
function checkAliasStatus() {
  var remaining = MailApp.getRemainingDailyQuota();
  var aliases = APPS_SCRIPT_CONFIG.SENDER_ALIASES;

  Logger.log('═══════════════════════════════════════');
  Logger.log('  ALIAS STATUS — ' + getTodayKey());
  Logger.log('═══════════════════════════════════════');
  Logger.log('Gmail quota remaining: ' + remaining);
  Logger.log('Limit per alias: ' + APPS_SCRIPT_CONFIG.LIMIT_PER_ALIAS);
  Logger.log('');

  var totalSent = 0;
  for (var i = 0; i < aliases.length; i++) {
    var count = getAliasCount(aliases[i].email);
    totalSent += count;
    var left = APPS_SCRIPT_CONFIG.LIMIT_PER_ALIAS - count;
    var status = left > 0 ? '✅ ' + left + ' left' : '❌ LIMIT REACHED';
    Logger.log('  ' + aliases[i].email + ' — Sent: ' + count + ' / ' + APPS_SCRIPT_CONFIG.LIMIT_PER_ALIAS + ' — ' + status);
  }

  Logger.log('');
  Logger.log('Total sent today: ' + totalSent + ' / ' + (APPS_SCRIPT_CONFIG.LIMIT_PER_ALIAS * aliases.length));
  var active = getActiveAlias();
  Logger.log('Next active alias: ' + (active ? active.email : 'ALL EXHAUSTED'));
}

/**
 * Reset all daily send counts (manual override)
 * Run this if you need to force-reset tracking for today
 */
function resetDailyCounts() {
  var props = PropertiesService.getScriptProperties();
  var aliases = APPS_SCRIPT_CONFIG.SENDER_ALIASES;
  var today = getTodayKey();

  for (var i = 0; i < aliases.length; i++) {
    props.deleteProperty('sends_' + aliases[i].email + '_' + today);
  }

  Logger.log('All alias send counts have been reset for ' + today);
}

/**
 * Clean up old tracking properties (run occasionally)
 * Removes send count entries older than today
 */
function cleanupOldProperties() {
  var props = PropertiesService.getScriptProperties();
  var all = props.getProperties();
  var today = getTodayKey();
  var deleted = 0;

  for (var key in all) {
    if (key.indexOf('sends_') === 0 && key.indexOf(today) === -1) {
      props.deleteProperty(key);
      deleted++;
    }
  }

  Logger.log('Cleaned up ' + deleted + ' old tracking properties.');
}
