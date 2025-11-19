import { collection, doc, setDoc, getDocs, writeBatch, serverTimestamp } from 'firebase/firestore';
import { db } from './firebase';
import { UserRole, NewsletterStatus } from '../types';

/**
 * Seed initial data to Firestore database
 * This populates the database with test data for development
 */
export async function seedFirestoreData() {
  if (!db) {
    throw new Error('Firestore not initialized. Check Firebase configuration.');
  }

  console.log('🌱 Starting Firestore data seeding...');

  try {
    // Check if data already exists
    const usersSnapshot = await getDocs(collection(db, 'users'));
    if (!usersSnapshot.empty) {
      console.log('⚠️  Data already exists. Skipping seed.');
      console.log('   Use resetAndSeedData() to clear and reseed.');
      return;
    }

    // Seed Users
    await seedUsers();

    // Seed Categories
    await seedCategories();

    // Seed Recipient Groups
    await seedRecipientGroups();

    // Seed Newsletters
    await seedNewsletters();

    // Seed Media Items
    await seedMedia();

    // Seed Audit Logs
    await seedAuditLogs();

    console.log('✅ Firestore seeding completed successfully!');
  } catch (error) {
    console.error('❌ Error seeding Firestore:', error);
    throw error;
  }
}

/**
 * Reset database and seed fresh data
 * WARNING: This deletes all existing data!
 */
export async function resetAndSeedData() {
  if (!db) {
    throw new Error('Firestore not initialized');
  }

  console.log('🗑️  Clearing existing data...');

  // Collections to clear
  const collections = [
    'users',
    'categories',
    'recipientGroups',
    'newsletters',
    'media',
    'auditLogs',
  ];

  for (const collectionName of collections) {
    const collectionRef = collection(db, collectionName);
    const snapshot = await getDocs(collectionRef);

    if (!snapshot.empty) {
      const batch = writeBatch(db);
      snapshot.docs.forEach((doc) => {
        batch.delete(doc.ref);
      });
      await batch.commit();
      console.log(`   Cleared ${collectionName}`);
    }
  }

  console.log('✅ Data cleared. Starting fresh seed...\n');
  await seedFirestoreData();
}

// ============================================================================
// SEED FUNCTIONS FOR EACH COLLECTION
// ============================================================================

async function seedUsers() {
  if (!db) return;

  console.log('👥 Seeding users...');

  const users = [
    {
      id: 'user_alice',
      name: 'Alice Admin',
      email: 'alice@company.com',
      role: UserRole.SITE_ADMIN,
      avatarUrl: 'https://picsum.photos/id/1011/200/200',
      description: 'Head of Internal IT',
      linkedinUrl: 'https://linkedin.com/in/aliceadmin',
    },
    {
      id: 'user_bob',
      name: 'Bob Editor',
      email: 'bob@company.com',
      role: UserRole.NEWSLETTER_ADMIN,
      avatarUrl: 'https://picsum.photos/id/1005/200/200',
      description: 'Communications Director',
    },
    {
      id: 'user_charlie',
      name: 'Charlie Creator',
      email: 'charlie@company.com',
      role: UserRole.NEWSLETTER_CREATOR,
      avatarUrl: 'https://picsum.photos/id/1025/200/200',
      description: 'Content Specialist',
    },
  ];

  for (const user of users) {
    const { id, ...userData } = user;
    await setDoc(doc(db, 'users', id), {
      ...userData,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  }

  console.log(`   ✓ Added ${users.length} users`);
}

async function seedCategories() {
  if (!db) return;

  console.log('📁 Seeding categories...');

  const categories = [
    { id: 'cat_weekly', name: 'Weekly Updates', count: 1 },
    { id: 'cat_hr', name: 'HR Announcements', count: 1 },
    { id: 'cat_tech', name: 'Engineering Tech Talk', count: 1 },
    { id: 'cat_social', name: 'Social Events', count: 0 },
  ];

  for (const category of categories) {
    const { id, ...categoryData } = category;
    await setDoc(doc(db, 'categories', id), {
      ...categoryData,
      createdAt: serverTimestamp(),
    });
  }

  console.log(`   ✓ Added ${categories.length} categories`);
}

async function seedRecipientGroups() {
  if (!db) return;

  console.log('👨‍👩‍👧‍👦 Seeding recipient groups...');

  const groups = [
    {
      id: 'group_all',
      name: 'All Employees',
      recipients: [
        { email: 'employee1@company.com', firstName: 'John', lastName: 'Doe' },
        { email: 'employee2@company.com', firstName: 'Jane', lastName: 'Smith' },
        { email: 'employee3@company.com', firstName: 'Bob', lastName: 'Johnson' },
      ],
    },
    {
      id: 'group_eng',
      name: 'Engineering Dept',
      recipients: [
        { email: 'dev1@company.com', firstName: 'Alice', lastName: 'Developer' },
        { email: 'dev2@company.com', firstName: 'Charlie', lastName: 'Coder' },
      ],
    },
    {
      id: 'group_marketing',
      name: 'Marketing Team',
      recipients: [
        { email: 'marketing1@company.com', firstName: 'Mary', lastName: 'Marketing' },
      ],
    },
    {
      id: 'group_leadership',
      name: 'Leadership',
      recipients: [
        { email: 'ceo@company.com', firstName: 'Alex', lastName: 'CEO' },
        { email: 'cto@company.com', firstName: 'Taylor', lastName: 'CTO' },
      ],
    },
  ];

  for (const group of groups) {
    const { id, name, recipients } = group;

    // Create group document
    await setDoc(doc(db, 'recipientGroups', id), {
      name,
      recipientCount: recipients.length,
      createdAt: serverTimestamp(),
    });

    // Add recipients to subcollection
    for (let i = 0; i < recipients.length; i++) {
      const recipientId = `recipient_${i}`;
      await setDoc(doc(db, 'recipientGroups', id, 'recipients', recipientId), {
        ...recipients[i],
        addedAt: serverTimestamp(),
      });
    }
  }

  console.log(`   ✓ Added ${groups.length} recipient groups`);
}

async function seedNewsletters() {
  if (!db) return;

  console.log('📧 Seeding newsletters...');

  const newsletters = [
    {
      id: 'newsletter_q3',
      subject: 'Q3 Company All-Hands Recap',
      status: NewsletterStatus.SENT,
      categoryId: 'cat_weekly',
      recipientGroupIds: ['group_all'],
      htmlContent: '<h1>Great Quarter!</h1><p>Thanks everyone for an amazing Q3. Here are the highlights...</p>',
      sentAt: new Date('2023-10-15T10:00:00Z'),
      updatedAt: new Date('2023-10-15T09:30:00Z'),
      stats: { sent: 450, opened: 380, clicked: 150, bounced: 2 },
    },
    {
      id: 'newsletter_benefits',
      subject: 'New Health Benefits Overview',
      status: NewsletterStatus.DRAFT,
      categoryId: 'cat_hr',
      recipientGroupIds: ['group_all'],
      htmlContent: '<h1>Health Benefits 2024</h1><p>Review the attached docs for our enhanced health benefits package...</p><img src="https://via.placeholder.com/150" alt="placeholder" />',
      updatedAt: new Date('2023-10-26T14:20:00Z'),
      stats: { sent: 0, opened: 0, clicked: 0, bounced: 0 },
    },
    {
      id: 'newsletter_demo',
      subject: 'Engineering Demo Day',
      status: NewsletterStatus.SCHEDULED,
      categoryId: 'cat_tech',
      recipientGroupIds: ['group_eng'],
      htmlContent: '<h1>Demo Day</h1><p>Join us this Friday for our monthly engineering demo day! See the latest projects from our teams.</p>',
      scheduledAt: new Date('2023-11-01T16:00:00Z'),
      updatedAt: new Date('2023-10-27T11:00:00Z'),
      stats: { sent: 0, opened: 0, clicked: 0, bounced: 0 },
    },
  ];

  for (const newsletter of newsletters) {
    const { id, ...newsletterData } = newsletter;
    await setDoc(doc(db, 'newsletters', id), {
      ...newsletterData,
      createdAt: serverTimestamp(),
    });
  }

  console.log(`   ✓ Added ${newsletters.length} newsletters`);
}

async function seedMedia() {
  if (!db) return;

  console.log('🖼️  Seeding media items...');

  const mediaItems = [
    {
      id: 'media_1',
      url: 'https://picsum.photos/id/10/600/400',
      name: 'office_view.jpg',
      size: '1.2 MB',
      dimensions: '1200x800',
    },
    {
      id: 'media_2',
      url: 'https://picsum.photos/id/20/600/400',
      name: 'team_meeting.jpg',
      size: '2.4 MB',
      dimensions: '1920x1080',
    },
    {
      id: 'media_3',
      url: 'https://picsum.photos/id/30/600/400',
      name: 'coffee_break.jpg',
      size: '0.8 MB',
      dimensions: '800x600',
    },
  ];

  for (const media of mediaItems) {
    const { id, ...mediaData } = media;
    await setDoc(doc(db, 'media', id), {
      ...mediaData,
      uploadedAt: serverTimestamp(),
    });
  }

  console.log(`   ✓ Added ${mediaItems.length} media items`);
}

async function seedAuditLogs() {
  if (!db) return;

  console.log('📋 Seeding audit logs...');

  const logs = [
    {
      id: 'log_1',
      userId: 'user_alice',
      userName: 'Alice Admin',
      action: 'USER_CREATED',
      target: 'User: David Developer',
      timestamp: new Date('2023-10-25T09:00:00Z'),
    },
    {
      id: 'log_2',
      userId: 'user_bob',
      userName: 'Bob Editor',
      action: 'CATEGORY_ADDED',
      target: 'Category: Social Events',
      timestamp: new Date('2023-10-24T14:30:00Z'),
    },
    {
      id: 'log_3',
      userId: 'user_charlie',
      userName: 'Charlie Creator',
      action: 'NEWSLETTER_CREATED',
      target: 'Newsletter: Q3 Recap',
      timestamp: new Date('2023-10-14T10:00:00Z'),
    },
  ];

  for (const log of logs) {
    const { id, ...logData } = log;
    await setDoc(doc(db, 'auditLogs', id), logData);
  }

  console.log(`   ✓ Added ${logs.length} audit logs`);
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Check if database has been seeded
 */
export async function isDatabaseSeeded(): Promise<boolean> {
  if (!db) return false;

  try {
    const usersSnapshot = await getDocs(collection(db, 'users'));
    return !usersSnapshot.empty;
  } catch (error) {
    return false;
  }
}

/**
 * Get database statistics
 */
export async function getDatabaseStats() {
  if (!db) {
    throw new Error('Firestore not initialized');
  }

  const stats = {
    users: 0,
    categories: 0,
    recipientGroups: 0,
    newsletters: 0,
    media: 0,
    auditLogs: 0,
  };

  const collections = Object.keys(stats) as Array<keyof typeof stats>;

  for (const collectionName of collections) {
    const snapshot = await getDocs(collection(db, collectionName));
    stats[collectionName] = snapshot.size;
  }

  return stats;
}
