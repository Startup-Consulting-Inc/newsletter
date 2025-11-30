/**
 * Recalculate Newsletter Stats Script
 * 
 * This script recalculates the open/click stats for all newsletters
 * based on actual tracking data in the 'tracking' collection.
 * 
 * Run from functions directory with: npx tsx scripts/recalculate-stats.ts
 * Or from root: cd functions && npx tsx scripts/recalculate-stats.ts
 */

import { initializeApp, cert, ServiceAccount } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import * as path from 'path';
import * as fs from 'fs';

// Try to load service account from common locations
function loadServiceAccount(): ServiceAccount | null {
  const possiblePaths = [
    path.join(process.cwd(), 'service-account.json'),
    path.join(process.cwd(), '..', 'service-account.json'),
    path.join(process.cwd(), 'firebase-service-account.json'),
    path.join(process.cwd(), '..', 'firebase-service-account.json'),
  ];

  for (const p of possiblePaths) {
    if (fs.existsSync(p)) {
      console.log(`📁 Using service account from: ${p}`);
      return JSON.parse(fs.readFileSync(p, 'utf8')) as ServiceAccount;
    }
  }

  return null;
}

async function main() {
  console.log('🔄 Starting newsletter stats recalculation...\n');

  // Initialize Firebase Admin
  const serviceAccount = loadServiceAccount();
  
  if (serviceAccount) {
    initializeApp({
      credential: cert(serviceAccount),
    });
  } else {
    // Try application default credentials
    console.log('⚠️  No service account file found, using default credentials');
    initializeApp();
  }

  const db = getFirestore();

  // Get all newsletters
  console.log('📋 Fetching newsletters...');
  const newslettersSnapshot = await db.collection('newsletters').get();
  
  if (newslettersSnapshot.empty) {
    console.log('❌ No newsletters found');
    return;
  }

  console.log(`Found ${newslettersSnapshot.size} newsletters\n`);

  let updated = 0;
  let errors = 0;

  for (const newsletterDoc of newslettersSnapshot.docs) {
    const newsletter = newsletterDoc.data();
    const newsletterId = newsletterDoc.id;

    console.log(`📧 Processing: ${newsletter.subject || newsletterId}`);

    try {
      // Count opens from tracking collection
      const opensSnapshot = await db.collection('tracking')
        .where('newsletterId', '==', newsletterId)
        .where('eventType', '==', 'open')
        .get();

      // Count unique opens (distinct recipientIds)
      const uniqueOpeners = new Set<string>();
      opensSnapshot.docs.forEach(doc => {
        const data = doc.data();
        if (data.recipientId) {
          uniqueOpeners.add(data.recipientId);
        }
      });

      // Count clicks from tracking collection
      const clicksSnapshot = await db.collection('tracking')
        .where('newsletterId', '==', newsletterId)
        .where('eventType', '==', 'click')
        .get();

      // Count unique clicks (distinct recipientIds)
      const uniqueClickers = new Set<string>();
      clicksSnapshot.docs.forEach(doc => {
        const data = doc.data();
        if (data.recipientId) {
          uniqueClickers.add(data.recipientId);
        }
      });

      const currentStats = newsletter.stats || {};
      const newStats = {
        sent: currentStats.sent || 0, // Keep sent count as-is
        opened: opensSnapshot.size,
        uniqueOpened: uniqueOpeners.size,
        clicked: clicksSnapshot.size,
        uniqueClicked: uniqueClickers.size,
        bounced: currentStats.bounced || 0, // Keep bounced count as-is
      };

      // Check if stats changed
      const statsChanged = 
        currentStats.opened !== newStats.opened ||
        currentStats.uniqueOpened !== newStats.uniqueOpened ||
        currentStats.clicked !== newStats.clicked ||
        currentStats.uniqueClicked !== newStats.uniqueClicked;

      if (statsChanged) {
        console.log(`   Old: opened=${currentStats.opened || 0}, uniqueOpened=${currentStats.uniqueOpened || 0}, clicked=${currentStats.clicked || 0}, uniqueClicked=${currentStats.uniqueClicked || 0}`);
        console.log(`   New: opened=${newStats.opened}, uniqueOpened=${newStats.uniqueOpened}, clicked=${newStats.clicked}, uniqueClicked=${newStats.uniqueClicked}`);

        // Update newsletter with corrected stats
        await newsletterDoc.ref.update({
          stats: newStats,
          updatedAt: FieldValue.serverTimestamp(),
        });

        console.log('   ✅ Updated');
        updated++;
      } else {
        console.log('   ⏭️  No changes needed');
      }
    } catch (error) {
      console.error(`   ❌ Error: ${error}`);
      errors++;
    }

    console.log('');
  }

  console.log('═'.repeat(50));
  console.log(`\n✅ Recalculation complete!`);
  console.log(`   Updated: ${updated}`);
  console.log(`   Errors: ${errors}`);
  console.log(`   Unchanged: ${newslettersSnapshot.size - updated - errors}`);
}

main()
  .then(() => {
    console.log('\n👋 Done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Fatal error:', error);
    process.exit(1);
  });

