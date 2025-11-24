import 'dotenv/config';
import { collection, getDocs, writeBatch } from 'firebase/firestore';
import { db } from '../services/firebase.js';

/**
 * Delete all records except companies
 * This preserves the companies collection while clearing all other data
 */
async function clearDataExceptCompanies() {
    if (!db) {
        throw new Error('Firestore not initialized. Check Firebase configuration.');
    }

    console.log('🗑️  Clearing data (preserving companies)...\n');

    // Collections to clear (excluding companies)
    const collectionsToDelete = [
        'users',
        'categories',
        'recipientGroups',
        'newsletters',
        'media',
        'auditLogs',
    ];

    let totalDeleted = 0;

    for (const collectionName of collectionsToDelete) {
        const collectionRef = collection(db, collectionName);
        const snapshot = await getDocs(collectionRef);

        if (!snapshot.empty) {
            // Delete in batches (Firestore allows max 500 operations per batch)
            const batchSize = 500;
            let deletedCount = 0;

            for (let i = 0; i < snapshot.docs.length; i += batchSize) {
                const batch = writeBatch(db);
                const batchDocs = snapshot.docs.slice(i, i + batchSize);

                batchDocs.forEach((doc) => {
                    batch.delete(doc.ref);
                });

                await batch.commit();
                deletedCount += batchDocs.length;
            }

            console.log(`   ✓ Deleted ${deletedCount} documents from ${collectionName}`);
            totalDeleted += deletedCount;
        } else {
            console.log(`   - ${collectionName} is already empty`);
        }
    }

    console.log(`\n✅ Cleanup complete! Deleted ${totalDeleted} total documents.`);
    console.log('   Companies collection preserved.\n');
}

// Run the cleanup
clearDataExceptCompanies()
    .then(() => {
        console.log('Done! You can now run: npm run seed');
        process.exit(0);
    })
    .catch((error) => {
        console.error('❌ Error during cleanup:', error);
        process.exit(1);
    });
