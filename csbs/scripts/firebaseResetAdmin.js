/**
 * Firebase Admin SDK Script - Complete Data Reset
 * 
 * ⚠️ DANGER: This script PERMANENTLY deletes all user data
 * 
 * Prerequisites:
 * 1. Install Firebase Admin SDK: npm install firebase-admin
 * 2. Download service account key from Firebase Console
 *    - Go to Project Settings > Service Accounts
 *    - Click "Generate New Private Key"
 *    - Save as "serviceAccountKey.json" in this directory
 * 3. Run: node firebaseResetAdmin.js
 * 
 * This script will:
 * ✓ Delete all Firebase Auth users (admin + regular)
 * ✓ Clear all Firestore collections
 * ✓ Keep security rules intact
 * ✓ Keep collection structure
 */

const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

// Color console output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  bold: '\x1b[1m',
};

const log = {
  error: (msg) => console.log(`${colors.red}❌ ${msg}${colors.reset}`),
  success: (msg) => console.log(`${colors.green}✅ ${msg}${colors.reset}`),
  info: (msg) => console.log(`${colors.cyan}ℹ️  ${msg}${colors.reset}`),
  warning: (msg) => console.log(`${colors.yellow}⚠️  ${msg}${colors.reset}`),
  header: (msg) => console.log(`\n${colors.bold}${colors.cyan}═══ ${msg} ═══${colors.reset}\n`),
};

// Path to service account key
const SERVICE_ACCOUNT_PATH = path.join(__dirname, 'serviceAccountKey.json');

// Initialize Firebase Admin
async function initializeFirebase() {
  try {
    if (!fs.existsSync(SERVICE_ACCOUNT_PATH)) {
      log.error('serviceAccountKey.json not found!');
      log.info('Steps to get service account key:');
      log.info('1. Go to Firebase Console > Project Settings > Service Accounts');
      log.info('2. Click "Generate New Private Key"');
      log.info('3. Save file as serviceAccountKey.json in this directory');
      process.exit(1);
    }

    const serviceAccount = require(SERVICE_ACCOUNT_PATH);
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      projectId: serviceAccount.project_id,
    });

    log.success('Firebase Admin SDK initialized');
    return admin;
  } catch (error) {
    log.error(`Failed to initialize Firebase: ${error.message}`);
    process.exit(1);
  }
}

// Delete all Firebase Auth users
async function deleteAllAuthUsers() {
  log.header('DELETING FIREBASE AUTHENTICATION USERS');

  try {
    const auth = admin.auth();
    let deletedCount = 0;
    let hasMore = true;

    while (hasMore) {
      const listUsersResult = await auth.listUsers(1000);

      if (listUsersResult.users.length === 0) {
        hasMore = false;
        break;
      }

      const userIds = listUsersResult.users.map((user) => user.uid);
      log.info(`Found ${userIds.length} users, deleting...`);

      // Delete users in batches of 100 (Firebase limit)
      for (let i = 0; i < userIds.length; i += 100) {
        const batch = userIds.slice(i, i + 100);
        try {
          await auth.deleteUsers(batch);
          deletedCount += batch.length;
          log.info(`Deleted batch: ${batch.length} users (total: ${deletedCount})`);
        } catch (error) {
          log.error(`Failed to delete batch: ${error.message}`);
        }
      }

      hasMore = listUsersResult.users.length === 1000;
    }

    log.success(`✓ Deleted ${deletedCount} total Firebase Auth users`);
    return deletedCount;
  } catch (error) {
    log.error(`Error during user deletion: ${error.message}`);
    throw error;
  }
}

// Clear Firestore collections
async function clearFirestoreCollections() {
  log.header('CLEARING FIRESTORE COLLECTIONS');

  const collections = ['users', 'events', 'registrations', 'submissions', 'tickets', 'adminLogs'];
  const db = admin.firestore();

  try {
    for (const collectionName of collections) {
      log.info(`Clearing collection: ${collectionName}`);

      const collectionRef = db.collection(collectionName);
      const docs = await collectionRef.get();

      if (docs.empty) {
        log.info(`  → Collection is already empty`);
        continue;
      }

      log.info(`  → Found ${docs.size} documents, deleting...`);

      // Delete in batches
      let deletedCount = 0;
      const batch = db.batch();
      let batchSize = 0;

      for (const doc of docs.docs) {
        batch.delete(doc.ref);
        batchSize++;
        deletedCount++;

        // Firestore batch limit is 500
        if (batchSize === 500) {
          await batch.commit();
          log.info(`  → Deleted batch: 500 documents (total: ${deletedCount})`);
          batchSize = 0;
        }
      }

      // Commit remaining documents
      if (batchSize > 0) {
        await batch.commit();
        log.info(`  → Deleted final batch: ${batchSize} documents (total: ${deletedCount})`);
      }

      log.success(`✓ Cleared ${collectionName}: ${deletedCount} documents deleted`);
    }
  } catch (error) {
    log.error(`Error during Firestore cleanup: ${error.message}`);
    throw error;
  }
}

// Main reset function
async function performCompleteReset() {
  console.clear();
  console.log('\n');
  console.log(
    `${colors.bold}${colors.red}╔════════════════════════════════════════════╗${colors.reset}`
  );
  console.log(
    `${colors.bold}${colors.red}║  FIREBASE & FIRESTORE COMPLETE DATA RESET  ║${colors.reset}`
  );
  console.log(
    `${colors.bold}${colors.red}║                   ⚠️  DANGER  ⚠️             ║${colors.reset}`
  );
  console.log(
    `${colors.bold}${colors.red}║  This will PERMANENTLY delete all data     ║${colors.reset}`
  );
  console.log(
    `${colors.bold}${colors.red}╚════════════════════════════════════════════╝${colors.reset}\n`
  );

  // Double confirmation
  const readline = require('readline');
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(
      `${colors.bold}${colors.yellow}Type "YES I UNDERSTAND" to proceed with complete data deletion: ${colors.reset}`,
      async (answer) => {
        if (answer !== 'YES I UNDERSTAND') {
          log.warning('Reset cancelled by user');
          rl.close();
          process.exit(0);
        }

        rl.question(
          `${colors.bold}${colors.red}Second confirmation - Type "DELETE ALL DATA NOW": ${colors.reset}`,
          async (answer2) => {
            if (answer2 !== 'DELETE ALL DATA NOW') {
              log.warning('Reset cancelled by user');
              rl.close();
              process.exit(0);
            }

            rl.close();

            try {
              // Initialize Firebase
              await initializeFirebase();

              // Perform reset
              const deletedUsers = await deleteAllAuthUsers();
              await clearFirestoreCollections();

              log.header('RESET COMPLETE');
              log.success('✓ All Firebase Auth users deleted');
              log.success('✓ All Firestore collections cleared');
              log.success('✓ Collection structures preserved');
              log.success('✓ Security rules intact');
              log.success(`✓ Total users deleted: ${deletedUsers}`);

              console.log('\n');
              log.info('Next steps:');
              log.info('1. Google Apps Script sheet cleanup (run separate script)');
              log.info('2. Frontend localStorage cleanup (automatic on next login)');
              log.info('3. Website is now fresh and ready for new registrations');

              resolve();
            } catch (error) {
              log.error(`Reset failed: ${error.message}`);
              process.exit(1);
            }
          }
        );
      }
    );
  });
}

// Run if executed directly
if (require.main === module) {
  performCompleteReset();
}

module.exports = {
  deleteAllAuthUsers,
  clearFirestoreCollections,
  performCompleteReset,
};
