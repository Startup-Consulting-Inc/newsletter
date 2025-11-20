#!/usr/bin/env tsx

/**
 * Standalone Database Seeding Script
 *
 * Usage:
 *   npm run seed           # Seed database if empty
 *   npm run seed:reset     # Force reset and reseed database
 *
 * Or directly with tsx:
 *   tsx scripts/seedDatabase.ts
 *   tsx scripts/seedDatabase.ts --reset
 */

import 'dotenv/config';
import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { seedFirestoreData, resetAndSeedData, isDatabaseSeeded, getDatabaseStats } from '../services/seedData';

// Firebase configuration from environment variables
const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.VITE_FIREBASE_APP_ID,
};

// Validate Firebase config
if (!firebaseConfig.apiKey || !firebaseConfig.projectId) {
  console.error('❌ Firebase configuration missing! Please check your .env file.');
  console.error('Required variables: VITE_FIREBASE_API_KEY, VITE_FIREBASE_PROJECT_ID, etc.');
  process.exit(1);
}

// Initialize Firebase for this script
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const storage = getStorage(app);

async function main() {
  const args = process.argv.slice(2);
  const shouldReset = args.includes('--reset') || args.includes('-r');
  const showHelp = args.includes('--help') || args.includes('-h');

  if (showHelp) {
    console.log(`
📚 Database Seeding Script

Usage:
  npm run seed           # Seed database if empty
  npm run seed:reset     # Force reset and reseed database

Options:
  --reset, -r           Force reset database before seeding
  --help, -h            Show this help message

Examples:
  npm run seed          # Safe seed (checks if data exists first)
  npm run seed:reset    # Destructive reset (deletes all data)
    `);
    process.exit(0);
  }

  try {
    console.log('🔥 Firebase Database Seeding Tool\n');

    if (shouldReset) {
      console.log('⚠️  RESET MODE: This will DELETE all existing data!\n');

      // In production, you might want to add a confirmation prompt here
      // For now, we'll proceed directly

      console.log('🗑️  Clearing existing data...');
      await resetAndSeedData();
      console.log('✅ Database reset and seeded successfully!\n');
    } else {
      console.log('🔍 Checking database status...\n');

      const isSeeded = await isDatabaseSeeded();

      if (isSeeded) {
        console.log('⚠️  Database already contains data.');
        console.log('💡 Use "npm run seed:reset" to force reset.\n');

        // Show current stats
        const stats = await getDatabaseStats();
        console.log('📊 Current Database Stats:');
        console.log(`   Users: ${stats.users}`);
        console.log(`   Categories: ${stats.categories}`);
        console.log(`   Newsletters: ${stats.newsletters}`);
        console.log(`   Recipient Groups: ${stats.groups}`);
        console.log(`   Media Items: ${stats.media}`);
        console.log(`   Audit Logs: ${stats.auditLogs}\n`);

        process.exit(0);
      }

      console.log('🌱 Database is empty. Seeding initial data...');
      await seedFirestoreData();
      console.log('✅ Database seeded successfully!\n');
    }

    // Show final stats
    const finalStats = await getDatabaseStats();
    console.log('📊 Final Database Stats:');
    console.log(`   Users: ${finalStats.users}`);
    console.log(`   Categories: ${finalStats.categories}`);
    console.log(`   Newsletters: ${finalStats.newsletters}`);
    console.log(`   Recipient Groups: ${finalStats.groups}`);
    console.log(`   Media Items: ${finalStats.media}`);
    console.log(`   Audit Logs: ${finalStats.auditLogs}\n`);

    console.log('🎉 Done! You can now use the application with test data.\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding database:', error);
    process.exit(1);
  }
}

// Run the script
main();
