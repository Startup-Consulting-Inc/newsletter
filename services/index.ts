/**
 * API Service Exports
 *
 * This file controls which API implementation is used throughout the application.
 *
 * Available implementations:
 * - firestoreApi: Production Firestore backend (default)
 * - mockApi: In-memory mock API for testing/development
 *
 * To switch implementations, change the import below.
 */

// PRODUCTION: Use Firestore API
export { api } from './firestoreApi';

// DEVELOPMENT: Use Mock API (uncomment to switch)
// export { api } from './mockApi';

// Also export seed data utilities for initial database setup
export {
  seedFirestoreData,
  resetAndSeedData,
  isDatabaseSeeded,
  getDatabaseStats,
} from './seedData';
