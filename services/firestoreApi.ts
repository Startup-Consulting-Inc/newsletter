import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
  Timestamp,
  writeBatch,
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from './firebase';
import {
  User,
  UserRole,
  Newsletter,
  NewsletterStatus,
  Category,
  RecipientGroup,
  Recipient,
  AuditLogEntry,
  MediaItem,
} from '../types';

// Collection names
const COLLECTIONS = {
  USERS: 'users',
  NEWSLETTERS: 'newsletters',
  CATEGORIES: 'categories',
  RECIPIENT_GROUPS: 'recipientGroups',
  AUDIT_LOGS: 'auditLogs',
  MEDIA: 'media',
} as const;

class FirestoreApiService {
  // ============================================================================
  // USER AUTHENTICATION & MANAGEMENT
  // ============================================================================

  /**
   * Mock login by role (for development/testing)
   * In production, authentication is handled by Firebase Auth
   */
  async login(role: UserRole): Promise<User> {
    if (!db) throw new Error('Firestore not initialized');

    const usersRef = collection(db, COLLECTIONS.USERS);
    const q = query(usersRef, where('role', '==', role));
    const snapshot = await getDocs(q);

    if (!snapshot.empty) {
      const userData = snapshot.docs[0].data();
      return { id: snapshot.docs[0].id, ...userData } as User;
    }

    throw new Error(`No user found with role: ${role}`);
  }

  /**
   * Sync Firebase Auth user with app user database
   * Creates user if doesn't exist, returns existing user if found
   */
  async syncFirebaseUser(
    firebaseUserId: string,
    email: string,
    name: string,
    photoUrl: string | null
  ): Promise<User> {
    if (!db) throw new Error('Firestore not initialized');

    try {
      // Use Firebase Auth UID as document ID
      const userDocRef = doc(db, COLLECTIONS.USERS, firebaseUserId);
      const userSnap = await getDoc(userDocRef);

      // User exists - return it
      if (userSnap.exists()) {
        const userData = userSnap.data();
        return { id: userSnap.id, ...userData } as User;
      }

      // User doesn't exist - create new user with specific ID
      const newUser: Omit<User, 'id'> = {
        email: email.toLowerCase(),
        name: name || email.split('@')[0],
        role: UserRole.NEWSLETTER_CREATOR, // Default role
        avatarUrl:
          photoUrl ||
          `https://ui-avatars.com/api/?name=${encodeURIComponent(name || 'User')}`,
        description: 'New team member',
      };

      // Use setDoc with specific document ID (Firebase Auth UID)
      await setDoc(userDocRef, {
        ...newUser,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      // Log the registration
      await this.logAction(firebaseUserId, newUser.name, 'USER_REGISTERED', `User: ${newUser.name}`);

      return { id: firebaseUserId, ...newUser };
    } catch (error) {
      console.error('Error syncing Firebase user:', error);
      throw error;
    }
  }

  /**
   * Get all users
   */
  async getUsers(): Promise<User[]> {
    if (!db) throw new Error('Firestore not initialized');

    const usersRef = collection(db, COLLECTIONS.USERS);
    const snapshot = await getDocs(usersRef);

    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as User[];
  }

  /**
   * Add new user
   */
  async addUser(user: Omit<User, 'id'>): Promise<User> {
    if (!db) throw new Error('Firestore not initialized');

    const usersRef = collection(db, COLLECTIONS.USERS);
    const docRef = await addDoc(usersRef, {
      ...user,
      avatarUrl:
        user.avatarUrl ||
        `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}`,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    await this.logAction('SYSTEM', 'SYSTEM', 'USER_CREATED', `User: ${user.name}`);

    return { id: docRef.id, ...user };
  }

  /**
   * Update existing user
   */
  async updateUser(id: string, data: Partial<User>): Promise<User> {
    if (!db) throw new Error('Firestore not initialized');

    const userRef = doc(db, COLLECTIONS.USERS, id);
    const userSnap = await getDoc(userRef);

    if (!userSnap.exists()) {
      throw new Error('User not found');
    }

    await updateDoc(userRef, {
      ...data,
      updatedAt: serverTimestamp(),
    });

    const updatedSnap = await getDoc(userRef);
    const updatedUser = { id: updatedSnap.id, ...updatedSnap.data() } as User;

    await this.logAction(id, updatedUser.name, 'USER_UPDATED', `User: ${updatedUser.name}`);

    return updatedUser;
  }

  /**
   * Delete user
   */
  async deleteUser(id: string): Promise<void> {
    if (!db) throw new Error('Firestore not initialized');

    const userRef = doc(db, COLLECTIONS.USERS, id);
    await deleteDoc(userRef);

    await this.logAction('SYSTEM', 'SYSTEM', 'USER_DELETED', `User ID: ${id}`);
  }

  // ============================================================================
  // NEWSLETTER MANAGEMENT
  // ============================================================================

  /**
   * Get all newsletters
   */
  async getNewsletters(): Promise<Newsletter[]> {
    if (!db) throw new Error('Firestore not initialized');

    const newslettersRef = collection(db, COLLECTIONS.NEWSLETTERS);
    const q = query(newslettersRef, orderBy('updatedAt', 'desc'));
    const snapshot = await getDocs(q);

    return snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        // Convert Firestore Timestamps to ISO strings
        updatedAt: this.timestampToISO(data.updatedAt),
        scheduledAt: data.scheduledAt ? this.timestampToISO(data.scheduledAt) : undefined,
        sentAt: data.sentAt ? this.timestampToISO(data.sentAt) : undefined,
      } as Newsletter;
    });
  }

  /**
   * Get single newsletter by ID
   */
  async getNewsletter(id: string): Promise<Newsletter | undefined> {
    if (!db) throw new Error('Firestore not initialized');

    const newsletterRef = doc(db, COLLECTIONS.NEWSLETTERS, id);
    const snapshot = await getDoc(newsletterRef);

    if (!snapshot.exists()) {
      return undefined;
    }

    const data = snapshot.data();
    return {
      id: snapshot.id,
      ...data,
      updatedAt: this.timestampToISO(data.updatedAt),
      scheduledAt: data.scheduledAt ? this.timestampToISO(data.scheduledAt) : undefined,
      sentAt: data.sentAt ? this.timestampToISO(data.sentAt) : undefined,
    } as Newsletter;
  }

  /**
   * Save newsletter (create or update)
   */
  async saveNewsletter(newsletter: Newsletter): Promise<Newsletter> {
    if (!db) throw new Error('Firestore not initialized');

    const newsletterRef = doc(db, COLLECTIONS.NEWSLETTERS, newsletter.id);
    const newsletterSnap = await getDoc(newsletterRef);

    const dataToSave = {
      subject: newsletter.subject,
      htmlContent: newsletter.htmlContent,
      categoryId: newsletter.categoryId,
      recipientGroupIds: newsletter.recipientGroupIds,
      status: newsletter.status,
      stats: newsletter.stats || { sent: 0, opened: 0, clicked: 0, bounced: 0 },
      scheduledAt: newsletter.scheduledAt ? new Date(newsletter.scheduledAt) : null,
      sentAt: newsletter.sentAt ? new Date(newsletter.sentAt) : null,
      updatedAt: serverTimestamp(),
    };

    if (newsletterSnap.exists()) {
      // Update existing
      await updateDoc(newsletterRef, dataToSave);
    } else {
      // Create new
      await setDoc(newsletterRef, {
        ...dataToSave,
        createdAt: serverTimestamp(),
      });
    }

    return newsletter;
  }

  /**
   * Delete newsletter
   */
  async deleteNewsletter(id: string): Promise<void> {
    if (!db) throw new Error('Firestore not initialized');

    const newsletterRef = doc(db, COLLECTIONS.NEWSLETTERS, id);
    await deleteDoc(newsletterRef);
  }

  // ============================================================================
  // CATEGORY MANAGEMENT
  // ============================================================================

  /**
   * Get all categories
   */
  async getCategories(): Promise<Category[]> {
    if (!db) throw new Error('Firestore not initialized');

    const categoriesRef = collection(db, COLLECTIONS.CATEGORIES);
    const snapshot = await getDocs(categoriesRef);

    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as Category[];
  }

  /**
   * Add new category
   */
  async addCategory(name: string): Promise<Category> {
    if (!db) throw new Error('Firestore not initialized');

    const categoriesRef = collection(db, COLLECTIONS.CATEGORIES);
    const docRef = await addDoc(categoriesRef, {
      name,
      count: 0,
      createdAt: serverTimestamp(),
    });

    return { id: docRef.id, name, count: 0 };
  }

  /**
   * Delete category
   */
  async deleteCategory(id: string): Promise<void> {
    if (!db) throw new Error('Firestore not initialized');

    const categoryRef = doc(db, COLLECTIONS.CATEGORIES, id);
    await deleteDoc(categoryRef);
  }

  // ============================================================================
  // RECIPIENT GROUP MANAGEMENT
  // ============================================================================

  /**
   * Get all recipient groups
   */
  async getGroups(): Promise<RecipientGroup[]> {
    if (!db) throw new Error('Firestore not initialized');

    const groupsRef = collection(db, COLLECTIONS.RECIPIENT_GROUPS);
    const snapshot = await getDocs(groupsRef);

    const groups: RecipientGroup[] = [];

    for (const docSnap of snapshot.docs) {
      const groupData = docSnap.data();

      // Get recipients from subcollection
      const recipientsRef = collection(
        db,
        COLLECTIONS.RECIPIENT_GROUPS,
        docSnap.id,
        'recipients'
      );
      const recipientsSnapshot = await getDocs(recipientsRef);

      const recipients = recipientsSnapshot.docs.map((recDoc) => ({
        id: recDoc.id,
        ...recDoc.data(),
      })) as Recipient[];

      groups.push({
        id: docSnap.id,
        name: groupData.name,
        recipientCount: recipients.length,
        recipients,
      });
    }

    return groups;
  }

  /**
   * Add new recipient group
   */
  async addGroup(name: string): Promise<RecipientGroup> {
    if (!db) throw new Error('Firestore not initialized');

    const groupsRef = collection(db, COLLECTIONS.RECIPIENT_GROUPS);
    const docRef = await addDoc(groupsRef, {
      name,
      recipientCount: 0,
      createdAt: serverTimestamp(),
    });

    return { id: docRef.id, name, recipientCount: 0, recipients: [] };
  }

  /**
   * Delete recipient group
   */
  async deleteGroup(id: string): Promise<void> {
    if (!db) throw new Error('Firestore not initialized');

    const groupRef = doc(db, COLLECTIONS.RECIPIENT_GROUPS, id);

    // Delete all recipients in subcollection first
    const recipientsRef = collection(db, COLLECTIONS.RECIPIENT_GROUPS, id, 'recipients');
    const recipientsSnapshot = await getDocs(recipientsRef);

    const batch = writeBatch(db);
    recipientsSnapshot.docs.forEach((doc) => {
      batch.delete(doc.ref);
    });
    await batch.commit();

    // Delete the group
    await deleteDoc(groupRef);
  }

  /**
   * Add recipient to group
   */
  async addRecipient(
    groupId: string,
    recipient: Omit<Recipient, 'id'>
  ): Promise<RecipientGroup> {
    if (!db) throw new Error('Firestore not initialized');

    const groupRef = doc(db, COLLECTIONS.RECIPIENT_GROUPS, groupId);
    const groupSnap = await getDoc(groupRef);

    if (!groupSnap.exists()) {
      throw new Error('Group not found');
    }

    // Add recipient to subcollection
    const recipientsRef = collection(db, COLLECTIONS.RECIPIENT_GROUPS, groupId, 'recipients');
    await addDoc(recipientsRef, {
      ...recipient,
      addedAt: serverTimestamp(),
    });

    // Get updated group data
    const recipientsSnapshot = await getDocs(recipientsRef);
    const recipients = recipientsSnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as Recipient[];

    // Update recipient count
    await updateDoc(groupRef, {
      recipientCount: recipients.length,
    });

    return {
      id: groupId,
      name: groupSnap.data().name,
      recipientCount: recipients.length,
      recipients,
    };
  }

  // ============================================================================
  // MEDIA MANAGEMENT
  // ============================================================================

  /**
   * Get all media items
   */
  async getMedia(): Promise<MediaItem[]> {
    if (!db) throw new Error('Firestore not initialized');

    const mediaRef = collection(db, COLLECTIONS.MEDIA);
    const q = query(mediaRef, orderBy('uploadedAt', 'desc'));
    const snapshot = await getDocs(q);

    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as MediaItem[];
  }

  /**
   * Upload media file
   */
  async uploadMedia(file: File): Promise<MediaItem> {
    if (!db || !storage) throw new Error('Firebase not initialized');

    // Upload to Firebase Storage
    const timestamp = Date.now();
    const fileName = `${timestamp}_${file.name}`;
    const storageRef = ref(storage, `media/${fileName}`);

    await uploadBytes(storageRef, file);
    const url = await getDownloadURL(storageRef);

    // Create media document in Firestore
    const mediaRef = collection(db, COLLECTIONS.MEDIA);
    const mediaItem = {
      url,
      name: file.name,
      size: `${(file.size / 1024 / 1024).toFixed(2)} MB`,
      dimensions: '800x600', // Would need image processing to get actual dimensions
      uploadedAt: serverTimestamp(),
    };

    const docRef = await addDoc(mediaRef, mediaItem);

    return {
      id: docRef.id,
      ...mediaItem,
      uploadedAt: new Date().toISOString(),
    } as MediaItem;
  }

  // ============================================================================
  // AUDIT LOG MANAGEMENT
  // ============================================================================

  /**
   * Get audit logs
   */
  async getAuditLogs(): Promise<AuditLogEntry[]> {
    if (!db) throw new Error('Firestore not initialized');

    const logsRef = collection(db, COLLECTIONS.AUDIT_LOGS);
    const q = query(logsRef, orderBy('timestamp', 'desc'));
    const snapshot = await getDocs(q);

    return snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        timestamp: this.timestampToISO(data.timestamp),
      } as AuditLogEntry;
    });
  }

  /**
   * Log an action (internal method)
   */
  async logAction(
    userId: string,
    userName: string,
    action: string,
    target: string
  ): Promise<void> {
    if (!db) return; // Silently fail if Firestore not initialized

    try {
      const logsRef = collection(db, COLLECTIONS.AUDIT_LOGS);
      await addDoc(logsRef, {
        userId,
        userName,
        action,
        target,
        timestamp: serverTimestamp(),
      });
    } catch (error) {
      console.error('Failed to log action:', error);
    }
  }

  // ============================================================================
  // UTILITY METHODS
  // ============================================================================

  /**
   * Convert Firestore Timestamp to ISO string
   */
  private timestampToISO(timestamp: any): string {
    if (!timestamp) return new Date().toISOString();
    if (timestamp instanceof Timestamp) {
      return timestamp.toDate().toISOString();
    }
    if (timestamp.toDate && typeof timestamp.toDate === 'function') {
      return timestamp.toDate().toISOString();
    }
    return new Date().toISOString();
  }
}

// Export singleton instance
export const api = new FirestoreApiService();
