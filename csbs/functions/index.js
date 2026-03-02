/**
 * ══════════════════════════════════════════════════════════════
 * CSBS Admin Access Control — Production Cloud Functions
 * ══════════════════════════════════════════════════════════════
 *
 * Architecture:
 *   1. Auto-increment codes: CSBS-001, CSBS-002, etc.
 *   2. One admin = one code (no duplicates, no regeneration)
 *   3. bcrypt hash (12 rounds) before Firestore storage
 *   4. Plain code emailed via Google Apps Script web app
 *   5. bcrypt.compare for server-side verification
 *   6. Delete code after successful login (single-use)
 *   7. Firestore transaction for atomic counter increment
 *
 * Collections:
 *   allowedAdmins/{docId}  → { email, name, approvedAt }
 *   adminMeta/adminCounter → { current: 0 }
 *   adminCodes/{email}     → { accessCode: bcryptHash, createdAt }
 *   users/{uid}            → { role: "admin", email, name, ... }
 * ══════════════════════════════════════════════════════════════
 */

const { onCall, HttpsError } = require("firebase-functions/v2/https");
const admin = require("firebase-admin");
const bcrypt = require("bcryptjs");

admin.initializeApp();
const db = admin.firestore();

// ══════════════════════════════════════════════════════════════
// 1. generateAdminAccessCode — Callable
// ══════════════════════════════════════════════════════════════
//
// Input: { email, password?, name?, designation? }
//
// Flow:
//   1. Check email exists in allowedAdmins → if not, permission-denied
//   2. Check if Firebase Auth account exists
//   3. If existing admin + code exists  → "already have code, proceed to login"
//   4. If existing admin + no code      → generate + hash + email + return status
//   5. If no account + no password/name → return { needsRegistration: true }
//   6. If no account + password/name    → create Auth user + profile + code + email
//
// The plain code is NEVER returned to client. Sent via Apps Script email.
// ══════════════════════════════════════════════════════════════

exports.generateAdminAccessCode = onCall(async (request) => {
  const { email, password, name, designation } = request.data;

  if (!email || typeof email !== "string") {
    throw new HttpsError("invalid-argument", "Email is required.");
  }

  const normalizedEmail = email.toLowerCase().trim();

  // ── 1. Check allowedAdmins ──────────────────────────────
  const allowedSnap = await db
    .collection("allowedAdmins")
    .where("email", "==", normalizedEmail)
    .limit(1)
    .get();

  if (allowedSnap.empty) {
    throw new HttpsError(
      "permission-denied",
      "Access Denied — This email is not authorized for admin access."
    );
  }

  // ── 2. Check if Firebase Auth user exists ───────────────
  let existingUser = null;
  try {
    existingUser = await admin.auth().getUserByEmail(normalizedEmail);
  } catch (err) {
    if (err.code !== "auth/user-not-found") {
      console.error("Error checking existing user:", err);
      throw new HttpsError("internal", "Failed to verify account status.");
    }
  }

  // ── 3. Existing admin account ───────────────────────────
  if (existingUser) {
    // Check if code already exists → prevent duplicate generation
    const existingCode = await db.doc(`adminCodes/${normalizedEmail}`).get();

    if (existingCode.exists) {
      return {
        eligible: true,
        accountExists: true,
        hasCode: true,
        message:
          "You already have an access code. Check your email and proceed to login.",
      };
    }

    // No code exists → generate new one
    const plainCode = await generateAccessCode();
    const hashedCode = await bcrypt.hash(plainCode, 12);

    await db.doc(`adminCodes/${normalizedEmail}`).set({
      accessCode: hashedCode,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    // Ensure profile has admin role
    const profileSnap = await db.doc(`users/${existingUser.uid}`).get();
    if (profileSnap.exists) {
      await db.doc(`users/${existingUser.uid}`).update({ role: "admin" });
    } else {
      await db.doc(`users/${existingUser.uid}`).set({
        uid: existingUser.uid,
        name: existingUser.displayName || name || "Admin",
        email: normalizedEmail,
        rollNumber: "",
        department: "CSBS",
        role: "admin",
        designation: designation || "Admin",
        createdAt: new Date().toISOString(),
      });
    }

    // Send access code via email (Apps Script)
    await sendAccessCodeEmail(
      normalizedEmail,
      plainCode,
      existingUser.displayName || name || "Admin",
      false
    );

    return {
      eligible: true,
      accountExists: true,
      hasCode: false,
      message:
        "Access code has been sent to your email. Check your inbox and proceed to login.",
    };
  }

  // ── 4. No account yet → confirm eligibility first ──────
  if (!password || !name) {
    return {
      eligible: true,
      accountExists: false,
      needsRegistration: true,
      message: "Email verified. Please set up your admin account.",
    };
  }

  // ── 5. Create new admin account ─────────────────────────
  if (typeof password !== "string" || password.length < 6) {
    throw new HttpsError(
      "invalid-argument",
      "Password must be at least 6 characters."
    );
  }

  const plainCode = await generateAccessCode();
  const hashedCode = await bcrypt.hash(plainCode, 12);

  // Create Firebase Auth user
  let adminUser;
  try {
    adminUser = await admin.auth().createUser({
      email: normalizedEmail,
      password,
      displayName: name,
    });
  } catch (err) {
    console.error("Auth user creation failed:", err);
    if (err.code === "auth/email-already-exists") {
      throw new HttpsError(
        "already-exists",
        "An account with this email already exists."
      );
    }
    throw new HttpsError("internal", "Failed to create admin account.");
  }

  // Create Firestore profile
  try {
    await db.doc(`users/${adminUser.uid}`).set({
      uid: adminUser.uid,
      name,
      email: normalizedEmail,
      rollNumber: "",
      department: "CSBS",
      role: "admin",
      designation: designation || "Admin",
      createdAt: new Date().toISOString(),
    });
  } catch (err) {
    // Rollback Auth user if Firestore fails
    await admin.auth().deleteUser(adminUser.uid);
    console.error("Firestore profile creation failed:", err);
    throw new HttpsError("internal", "Failed to create admin profile.");
  }

  // Store hashed access code
  await db.doc(`adminCodes/${normalizedEmail}`).set({
    accessCode: hashedCode,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  // Send access code via email (Apps Script)
  await sendAccessCodeEmail(normalizedEmail, plainCode, name, true);

  return {
    eligible: true,
    accountExists: true,
    hasCode: false,
    message:
      "Admin account created! Access code has been sent to your email.",
  };
});

// ══════════════════════════════════════════════════════════════
// 2. verifyAdminAccessCode — Callable (AUTHENTICATED required)
// ══════════════════════════════════════════════════════════════
//
// Input: { accessCode }
// Requires: Firebase Auth token (user must be signed in)
//
// Flow:
//   1. Validate authentication
//   2. Get user profile → check role === "admin"
//   3. Fetch hashed code from adminCodes/{email}
//   4. bcrypt.compare(input, storedHash)
//   5. If valid → delete code (single-use) + return success
//   6. If invalid → log attempt + throw permission-denied
// ══════════════════════════════════════════════════════════════

exports.verifyAdminAccessCode = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Authentication required.");
  }

  const { accessCode } = request.data;

  if (!accessCode || typeof accessCode !== "string") {
    throw new HttpsError("invalid-argument", "Access code is required.");
  }

  const uid = request.auth.uid;

  // Get user profile
  const userDoc = await db.doc(`users/${uid}`).get();

  if (!userDoc.exists) {
    throw new HttpsError("not-found", "User profile not found.");
  }

  const userData = userDoc.data();

  if (userData.role !== "admin") {
    throw new HttpsError("permission-denied", "Admin role required.");
  }

  // Get hashed code
  const codeDoc = await db.doc(`adminCodes/${userData.email}`).get();

  if (!codeDoc.exists || !codeDoc.data().accessCode) {
    throw new HttpsError(
      "failed-precondition",
      "No access code found. Please request a new one."
    );
  }

  const storedHash = codeDoc.data().accessCode;

  // bcrypt compare — server-side only
  const isValid = await bcrypt.compare(
    accessCode.trim().toUpperCase(),
    storedHash
  );

  if (!isValid) {
    console.warn(
      `[SECURITY] Failed access code attempt for ${userData.email} (UID: ${uid})`
    );
    throw new HttpsError("permission-denied", "Invalid access code.");
  }

  // Success → delete code (single-use)
  await db.doc(`adminCodes/${userData.email}`).delete();

  // Audit timestamp
  await db.doc(`users/${uid}`).update({
    lastAdminAccessAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  return { valid: true, message: "Access code verified successfully." };
});

// ══════════════════════════════════════════════════════════════
// HELPER: Auto-increment code via Firestore transaction
// ══════════════════════════════════════════════════════════════

async function generateAccessCode() {
  const counterRef = db.doc("adminMeta/adminCounter");

  const code = await db.runTransaction(async (transaction) => {
    const counterDoc = await transaction.get(counterRef);

    let current = 0;
    if (counterDoc.exists) {
      current = counterDoc.data().current || 0;
    }

    const next = current + 1;
    const formatted = `CSBS-${String(next).padStart(3, "0")}`;

    transaction.set(counterRef, { current: next }, { merge: true });

    return formatted;
  });

  return code;
}

// ══════════════════════════════════════════════════════════════
// HELPER: Send access code email via Google Apps Script
// ══════════════════════════════════════════════════════════════

const APPS_SCRIPT_URL =
  "https://script.google.com/macros/s/REDACTED_FUNCTIONS_APPS_SCRIPT_DEPLOYMENT_ID/exec";

async function sendAccessCodeEmail(email, accessCode, name, isFirstTime) {
  try {
    const response = await fetch(APPS_SCRIPT_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email,
        accessCode,
        name,
        isFirstTime: !!isFirstTime,
      }),
    });

    if (!response.ok) {
      const text = await response.text();
      console.error(`[EMAIL] Apps Script responded with ${response.status}: ${text}`);
    } else {
      console.log(`[EMAIL] Access code sent to ${email} via Apps Script`);
    }
  } catch (err) {
    // Log error but don't fail the whole function — code is still stored in Firestore
    console.error("[EMAIL ERROR]", err.message);
    console.log(`[FALLBACK] Email delivery failed for ${email}. Code is stored in Firestore.`);
  }
}

// ══════════════════════════════════════════════════════════════
// End of Cloud Functions
// ══════════════════════════════════════════════════════════════
