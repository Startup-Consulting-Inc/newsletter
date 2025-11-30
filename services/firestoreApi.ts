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
import { httpsCallable } from 'firebase/functions';
import { db, storage, auth, functions } from './firebase';
import {
  User,
  UserRole,
  Newsletter,
  NewsletterStatus,
  Category,
  RecipientGroup,
  Recipient,
  UnsubscribedUser,
  AuditLogEntry,
  MediaItem,
  Company,
  Attachment,
  NewsletterTemplateConfig,
  NewsletterTemplate,
  NewsletterTone,
  GenerateOptions,
} from '../types';
import * as auditService from './auditService';

// Collection names
const COLLECTIONS = {
  USERS: 'users',
  NEWSLETTERS: 'newsletters',
  CATEGORIES: 'categories',
  RECIPIENT_GROUPS: 'recipientGroups',
  AUDIT_LOGS: 'auditLogs',
  MEDIA: 'media',
  COMPANIES: 'companies',
  TEMPLATE_CONFIGS: 'templateConfigs',
} as const;

class FirestoreApiService {
  // ============================================================================
  // AUDIT LOGGING HELPERS
  // ============================================================================

  /**
   * Get current user context for audit logging
   */
  private getCurrentUserContext(): { userId: string; userName: string; userEmail?: string } {
    const currentUser = auth?.currentUser;
    if (currentUser) {
      return {
        userId: currentUser.uid,
        userName: currentUser.displayName || currentUser.email || 'Unknown',
        userEmail: currentUser.email || undefined,
      };
    }
    return {
      userId: 'SYSTEM',
      userName: 'SYSTEM',
    };
  }

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
      // For now, we'll default to SITE_ADMIN for the first user, or handle via manual assignment
      // Ideally, new users should be invited or created by an admin
      const newUser: Omit<User, 'id'> = {
        email: email.toLowerCase(),
        name: name || email.split('@')[0],
        role: UserRole.NEWSLETTER_ADMIN, // Default role, needs to be assigned to a company later
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
   * Get all users (optionally filtered by company)
   */
  async getUsers(companyId?: string): Promise<User[]> {
    if (!db) throw new Error('Firestore not initialized');

    const usersRef = collection(db, COLLECTIONS.USERS);
    let q;

    if (companyId) {
      q = query(usersRef, where('companyId', '==', companyId));
    } else {
      q = query(usersRef);
    }

    const snapshot = await getDocs(q);

    return snapshot.docs.map((doc) => {
      const data = doc.data() as Partial<User>;
      return {
        id: doc.id,
        ...data,
      } as User;
    });
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
  // COMPANY MANAGEMENT
  // ============================================================================

  /**
   * Get all companies (Site Admin only)
   */
  async getCompanies(): Promise<Company[]> {
    if (!db) throw new Error('Firestore not initialized');

    const companiesRef = collection(db, COLLECTIONS.COMPANIES);
    const snapshot = await getDocs(companiesRef);

    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
      createdAt: this.timestampToISO(doc.data().createdAt),
      updatedAt: this.timestampToISO(doc.data().updatedAt),
    })) as Company[];
  }

  /**
   * Get single company
   */
  async getCompany(id: string): Promise<Company | undefined> {
    if (!db) throw new Error('Firestore not initialized');

    const companyRef = doc(db, COLLECTIONS.COMPANIES, id);
    const snapshot = await getDoc(companyRef);

    if (!snapshot.exists()) {
      return undefined;
    }

    const data = snapshot.data();
    return {
      id: snapshot.id,
      ...data,
      createdAt: this.timestampToISO(data.createdAt),
      updatedAt: this.timestampToISO(data.updatedAt),
    } as Company;
  }

  /**
   * Create new company
   */
  async createCompany(name: string, logoUrl?: string): Promise<Company> {
    if (!db) throw new Error('Firestore not initialized');

    const companiesRef = collection(db, COLLECTIONS.COMPANIES);
    const docRef = await addDoc(companiesRef, {
      name,
      logoUrl,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    return {
      id: docRef.id,
      name,
      logoUrl,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }

  /**
   * Update company
   */
  async updateCompany(id: string, data: Partial<Company>): Promise<void> {
    if (!db) throw new Error('Firestore not initialized');

    const companyRef = doc(db, COLLECTIONS.COMPANIES, id);
    await updateDoc(companyRef, {
      ...data,
      updatedAt: serverTimestamp(),
    });
  }

  // ============================================================================
  // NEWSLETTER MANAGEMENT
  // ============================================================================

  /**
   * Get all newsletters
   */
  async getNewsletters(companyId?: string): Promise<Newsletter[]> {
    if (!db) throw new Error('Firestore not initialized');

    const newslettersRef = collection(db, COLLECTIONS.NEWSLETTERS);
    let q;

    if (companyId) {
      q = query(newslettersRef, where('companyId', '==', companyId), orderBy('updatedAt', 'desc'));
    } else {
      // Site Admin sees all, or if no companyId provided (should be handled by caller)
      q = query(newslettersRef, orderBy('updatedAt', 'desc'));
    }

    const snapshot = await getDocs(q);

    return snapshot.docs.map((doc) => {
      const data = doc.data() as Newsletter;
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
   * Validate status workflow transition
   */
  private validateStatusTransition(
    currentStatus: NewsletterStatus | undefined,
    newStatus: NewsletterStatus
  ): void {
    // New newsletter - any status is OK
    if (!currentStatus) return;

    // SENT newsletters are immutable - cannot change status or edit
    if (currentStatus === NewsletterStatus.SENT) {
      throw new Error(
        'Cannot modify a sent newsletter. Sent newsletters are immutable.'
      );
    }

    // SENDING newsletters should only transition to SENT
    if (currentStatus === NewsletterStatus.SENDING && newStatus !== NewsletterStatus.SENT) {
      throw new Error(
        'Cannot modify newsletter while sending is in progress. Please wait for sending to complete.'
      );
    }

    // Validate allowed transitions
    const allowedTransitions: Record<NewsletterStatus, NewsletterStatus[]> = {
      [NewsletterStatus.DRAFT]: [
        NewsletterStatus.DRAFT,
        NewsletterStatus.SCHEDULED,
        NewsletterStatus.SENT,
        NewsletterStatus.PAUSED,
      ],
      [NewsletterStatus.SCHEDULED]: [
        NewsletterStatus.DRAFT,
        NewsletterStatus.SCHEDULED,
        NewsletterStatus.SENDING,
        NewsletterStatus.SENT,
        NewsletterStatus.PAUSED,
      ],
      [NewsletterStatus.SENDING]: [NewsletterStatus.SENT],
      [NewsletterStatus.SENT]: [], // Immutable
      [NewsletterStatus.PAUSED]: [
        NewsletterStatus.DRAFT,
        NewsletterStatus.SCHEDULED,
        NewsletterStatus.PAUSED,
      ],
    };

    const allowed = allowedTransitions[currentStatus] || [];
    if (!allowed.includes(newStatus)) {
      throw new Error(
        `Invalid status transition: Cannot change from ${currentStatus} to ${newStatus}`
      );
    }
  }

  /**
   * Save newsletter (create or update)
   */
  async saveNewsletter(newsletter: Newsletter): Promise<Newsletter> {
    if (!db) throw new Error('Firestore not initialized');

    const newsletterRef = doc(db, COLLECTIONS.NEWSLETTERS, newsletter.id);
    const newsletterSnap = await getDoc(newsletterRef);
    const isUpdate = newsletterSnap.exists();
    const existingData = isUpdate ? newsletterSnap.data() : null;

    // Validate status transition if updating existing newsletter
    if (isUpdate && existingData) {
      const currentStatus = existingData.status as NewsletterStatus;

      // Validate the status transition
      this.validateStatusTransition(currentStatus, newsletter.status);

      // Additional validation: Cannot edit content of SENT newsletters
      if (currentStatus === NewsletterStatus.SENT) {
        throw new Error('Cannot edit sent newsletters');
      }
    }

    const dataToSave = {
      subject: newsletter.subject,
      htmlContent: newsletter.htmlContent,
      categoryId: newsletter.categoryId,
      recipientGroupIds: newsletter.recipientGroupIds,
      status: newsletter.status,
      companyId: newsletter.companyId,
      stats: newsletter.stats || { sent: 0, opened: 0, uniqueOpened: 0, clicked: 0, uniqueClicked: 0, bounced: 0 },
      scheduledAt: newsletter.scheduledAt ? Timestamp.fromDate(new Date(newsletter.scheduledAt)) : null,
      sentAt: newsletter.sentAt ? Timestamp.fromDate(new Date(newsletter.sentAt)) : null,
      updatedAt: serverTimestamp(),
    };

    if (isUpdate) {
      // Update existing
      await updateDoc(newsletterRef, dataToSave);

      // Track category change if category was changed
      if (existingData && existingData.categoryId !== newsletter.categoryId) {
        // Decrement old category count
        await this.updateCategoryCount(existingData.categoryId, false);
        // Increment new category count
        await this.updateCategoryCount(newsletter.categoryId, true);
      }
    } else {
      // Create new
      await setDoc(newsletterRef, {
        ...dataToSave,
        createdAt: serverTimestamp(),
      });

      // Increment category count for new newsletter
      await this.updateCategoryCount(newsletter.categoryId, true);
    }

    // Audit logging
    const userContext = this.getCurrentUserContext();

    if (isUpdate && existingData) {
      // Log update
      await auditService.logNewsletterUpdated({
        ...userContext,
        newsletterId: newsletter.id,
        subject: newsletter.subject,
        previousStatus: existingData.status,
        newStatus: newsletter.status,
      });

      // Log scheduling if status changed to SCHEDULED
      if (newsletter.status === NewsletterStatus.SCHEDULED && newsletter.scheduledAt) {
        await auditService.logNewsletterScheduled({
          ...userContext,
          newsletterId: newsletter.id,
          subject: newsletter.subject,
          scheduledAt: newsletter.scheduledAt,
        });
      }
    } else {
      // Log create
      await auditService.logNewsletterCreated({
        ...userContext,
        newsletterId: newsletter.id,
        subject: newsletter.subject,
        categoryId: newsletter.categoryId,
      });

      // Log scheduling if created as SCHEDULED
      if (newsletter.status === NewsletterStatus.SCHEDULED && newsletter.scheduledAt) {
        await auditService.logNewsletterScheduled({
          ...userContext,
          newsletterId: newsletter.id,
          subject: newsletter.subject,
          scheduledAt: newsletter.scheduledAt,
        });
      }
    }

    return newsletter;
  }

  /**
   * Duplicate newsletter
   */
  async duplicateNewsletter(id: string): Promise<Newsletter> {
    if (!db) throw new Error('Firestore not initialized');

    // Get original newsletter
    const original = await this.getNewsletter(id);
    if (!original) {
      throw new Error('Newsletter not found');
    }

    // Create new newsletter object
    const newslettersRef = collection(db, COLLECTIONS.NEWSLETTERS);

    const newNewsletterData = {
      subject: `Copy of ${original.subject}`,
      htmlContent: original.htmlContent,
      categoryId: original.categoryId,
      recipientGroupIds: [], // Reset recipients for safety
      status: NewsletterStatus.DRAFT,
      companyId: original.companyId,
      stats: { sent: 0, opened: 0, uniqueOpened: 0, clicked: 0, uniqueClicked: 0, bounced: 0 },
      scheduledAt: null,
      sentAt: null,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    const docRef = await addDoc(newslettersRef, newNewsletterData);

    // Increment category count for duplicated newsletter
    await this.updateCategoryCount(newNewsletterData.categoryId, true);

    // Audit logging
    const userContext = this.getCurrentUserContext();
    await auditService.logNewsletterCreated({
      ...userContext,
      newsletterId: docRef.id,
      subject: newNewsletterData.subject,
      categoryId: newNewsletterData.categoryId,
    });

    return {
      id: docRef.id,
      ...newNewsletterData,
      // Convert timestamps for return value
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      scheduledAt: undefined,
      sentAt: undefined,
    } as Newsletter;
  }

  /**
   * Get tracking logs for a newsletter with resolved emails
   */
  async getNewsletterTrackingLogs(newsletterId: string): Promise<any[]> {
    if (!db) throw new Error('Firestore not initialized');

    console.log('🔍 Fetching tracking logs for newsletter:', newsletterId);

    // 1. Fetch tracking logs
    const trackingRef = collection(db, 'tracking');
    let trackingSnapshot;

    try {
      // Try query with orderBy (requires composite index)
      const q = query(trackingRef, where('newsletterId', '==', newsletterId), orderBy('timestamp', 'desc'));
      trackingSnapshot = await getDocs(q);
      console.log('✅ Query with orderBy succeeded, docs found:', trackingSnapshot.size);
    } catch (error: any) {
      // If index doesn't exist, fall back to query without orderBy
      console.warn('⚠️ Index missing for tracking query, using fallback (no ordering):', error.message);
      const fallbackQuery = query(trackingRef, where('newsletterId', '==', newsletterId));
      trackingSnapshot = await getDocs(fallbackQuery);
      console.log('✅ Fallback query succeeded, docs found:', trackingSnapshot.size);

      // Sort in memory
      const docs = trackingSnapshot.docs.sort((a, b) => {
        const aTime = a.data().timestamp?.toMillis?.() || 0;
        const bTime = b.data().timestamp?.toMillis?.() || 0;
        return bTime - aTime; // Descending order
      });

      // Create a new QuerySnapshot-like object
      trackingSnapshot = {
        empty: docs.length === 0,
        size: docs.length,
        docs: docs,
      } as any;
    }

    if (trackingSnapshot.empty) {
      console.warn('⚠️ No tracking logs found for newsletter:', newsletterId);
      return [];
    }

    console.log('📊 Found', trackingSnapshot.size, 'tracking events');

    // 2. Fetch newsletter to get recipient groups
    const newsletter = await this.getNewsletter(newsletterId);
    if (!newsletter) {
      console.warn(`⚠️ Newsletter ${newsletterId} not found`);
      return [];
    }

    // 3. Fetch all recipients from groups to build an ID -> Email map
    const recipientMap = new Map<string, string>();

    for (const groupId of newsletter.recipientGroupIds) {
      try {
        const recipientsRef = collection(db, COLLECTIONS.RECIPIENT_GROUPS, groupId, 'recipients');
        const recipientsSnapshot = await getDocs(recipientsRef);

        recipientsSnapshot.docs.forEach(doc => {
          const data = doc.data();
          recipientMap.set(doc.id, data.email);
        });
      } catch (error) {
        console.warn(`⚠️ Failed to fetch recipients from group ${groupId}:`, error);
      }
    }

    // 4. Join data
    return trackingSnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        recipientEmail: recipientMap.get(data.recipientId) || data.recipientEmail || 'Unknown Recipient',
        timestamp: this.timestampToISO(data.timestamp),
      };
    });
  }

  /**
   * Delete newsletter
   */
  async deleteNewsletter(id: string): Promise<void> {
    if (!db) throw new Error('Firestore not initialized');

    // Get newsletter data before deleting for audit log
    const newsletterRef = doc(db, COLLECTIONS.NEWSLETTERS, id);
    const newsletterSnap = await getDoc(newsletterRef);
    const newsletterData = newsletterSnap.exists() ? newsletterSnap.data() : null;

    await deleteDoc(newsletterRef);

    // Decrement category count
    if (newsletterData && newsletterData.categoryId) {
      await this.updateCategoryCount(newsletterData.categoryId, false);
    }

    // Audit logging
    if (newsletterData) {
      const userContext = this.getCurrentUserContext();
      await auditService.logNewsletterDeleted({
        ...userContext,
        newsletterId: id,
        subject: newsletterData.subject || 'Unknown',
        status: newsletterData.status || 'Unknown',
      });
    }
  }

  // ============================================================================
  // CATEGORY MANAGEMENT
  // ============================================================================

  /**
   * Get all categories
   */
  async getCategories(companyId?: string): Promise<Category[]> {
    if (!db) throw new Error('Firestore not initialized');

    // Defensive validation: companyId should always be provided
    // Only Site Admins should query without companyId filter
    if (!companyId) {
      console.warn('⚠️ getCategories() called without companyId - this should only happen for Site Admins');
    }

    const categoriesRef = collection(db, COLLECTIONS.CATEGORIES);
    let q;

    if (companyId) {
      q = query(categoriesRef, where('companyId', '==', companyId));
    } else {
      q = query(categoriesRef);
    }

    const snapshot = await getDocs(q);

    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...(doc.data() as Category),
    })) as Category[];
  }

  /**
   * Add new category
   */
  async addCategory(name: string, companyId: string): Promise<Category> {
    if (!db) throw new Error('Firestore not initialized');

    const categoriesRef = collection(db, COLLECTIONS.CATEGORIES);
    const docRef = await addDoc(categoriesRef, {
      name,
      companyId,
      count: 0,
      createdAt: serverTimestamp(),
    });

    const newCategory = { id: docRef.id, name, companyId, count: 0 };

    // Audit logging
    const userContext = this.getCurrentUserContext();
    await auditService.logCategoryCreated({
      ...userContext,
      categoryId: newCategory.id,
      categoryName: name,
    });

    return newCategory;
  }

  /**
   * Delete category
   */
  async deleteCategory(id: string): Promise<void> {
    if (!db) throw new Error('Firestore not initialized');

    // Get category data before deleting for audit log
    const categoryRef = doc(db, COLLECTIONS.CATEGORIES, id);
    const categorySnap = await getDoc(categoryRef);
    const categoryData = categorySnap.exists() ? categorySnap.data() : null;

    await deleteDoc(categoryRef);

    // Audit logging
    if (categoryData) {
      const userContext = this.getCurrentUserContext();
      await auditService.logCategoryDeleted({
        ...userContext,
        categoryId: id,
        categoryName: categoryData.name || 'Unknown',
      });
    }
  }

  /**
   * Update category count (increment or decrement)
   * @private
   */
  private async updateCategoryCount(categoryId: string, increment: boolean): Promise<void> {
    if (!db) throw new Error('Firestore not initialized');

    const categoryRef = doc(db, COLLECTIONS.CATEGORIES, categoryId);
    const categorySnap = await getDoc(categoryRef);

    if (!categorySnap.exists()) {
      console.warn(`Category ${categoryId} not found, skipping count update`);
      return;
    }

    const currentCount = categorySnap.data().count || 0;
    const newCount = increment
      ? currentCount + 1
      : Math.max(0, currentCount - 1); // Prevent negative counts

    await updateDoc(categoryRef, {
      count: newCount,
    });
  }

  /**
   * Recalculate all category counts based on actual newsletter data
   */
  async recalculateCategoryCounts(): Promise<{ updated: number; categories: Record<string, number> }> {
    if (!db) throw new Error('Firestore not initialized');

    // Get all newsletters
    const newslettersRef = collection(db, COLLECTIONS.NEWSLETTERS);
    const newslettersSnapshot = await getDocs(newslettersRef);

    // Count newsletters per category
    const counts: Record<string, number> = {};
    newslettersSnapshot.docs.forEach((doc) => {
      const newsletter = doc.data();
      const categoryId = newsletter.categoryId;
      if (categoryId) {
        counts[categoryId] = (counts[categoryId] || 0) + 1;
      }
    });

    // Get all categories
    const categoriesRef = collection(db, COLLECTIONS.CATEGORIES);
    const categoriesSnapshot = await getDocs(categoriesRef);

    // Update each category's count
    const batch = writeBatch(db);
    let updated = 0;

    categoriesSnapshot.docs.forEach((categoryDoc) => {
      const categoryId = categoryDoc.id;
      const actualCount = counts[categoryId] || 0;
      const currentCount = categoryDoc.data().count || 0;

      if (actualCount !== currentCount) {
        batch.update(categoryDoc.ref, { count: actualCount });
        updated++;
      }

      // Ensure all categories are in the result
      if (!(categoryId in counts)) {
        counts[categoryId] = 0;
      }
    });

    await batch.commit();

    return { updated, categories: counts };
  }

  // ============================================================================
  // TEMPLATE CONFIG MANAGEMENT
  // ============================================================================

  /**
   * Get all template configs for a company
   */
  async getTemplateConfigs(companyId?: string): Promise<NewsletterTemplateConfig[]> {
    try {
      const q = companyId
        ? query(collection(db, COLLECTIONS.TEMPLATE_CONFIGS), where('companyId', '==', companyId), orderBy('name'))
        : query(collection(db, COLLECTIONS.TEMPLATE_CONFIGS), orderBy('name'));

      const snapshot = await getDocs(q);
      return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as NewsletterTemplateConfig));
    } catch (error) {
      console.error('Error fetching template configs:', error);
      throw error;
    }
  }

  /**
   * Get a single template config by ID
   */
  async getTemplateConfig(id: string): Promise<NewsletterTemplateConfig | null> {
    try {
      const docRef = doc(db, COLLECTIONS.TEMPLATE_CONFIGS, id);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        return { id: docSnap.id, ...docSnap.data() } as NewsletterTemplateConfig;
      }
      return null;
    } catch (error) {
      console.error('Error fetching template config:', error);
      throw error;
    }
  }

  /**
   * Get template config by category ID
   */
  async getTemplateByCategory(categoryId: string, companyId: string): Promise<NewsletterTemplateConfig | null> {
    try {
      const q = query(
        collection(db, COLLECTIONS.TEMPLATE_CONFIGS),
        where('companyId', '==', companyId),
        where('categoryIds', 'array-contains', categoryId)
      );

      const snapshot = await getDocs(q);

      if (!snapshot.empty) {
        const doc = snapshot.docs[0];
        return { id: doc.id, ...doc.data() } as NewsletterTemplateConfig;
      }

      // If no template found for category, return default template
      const defaultQuery = query(
        collection(db, COLLECTIONS.TEMPLATE_CONFIGS),
        where('companyId', '==', companyId),
        where('isDefault', '==', true)
      );

      const defaultSnapshot = await getDocs(defaultQuery);
      if (!defaultSnapshot.empty) {
        const doc = defaultSnapshot.docs[0];
        return { id: doc.id, ...doc.data() } as NewsletterTemplateConfig;
      }

      return null;
    } catch (error) {
      console.error('Error fetching template by category:', error);
      throw error;
    }
  }

  /**
   * Create a new template config
   */
  async createTemplateConfig(data: Omit<NewsletterTemplateConfig, 'id' | 'createdAt' | 'updatedAt'>): Promise<NewsletterTemplateConfig> {
    try {
      // Filter out undefined values (Firestore doesn't accept undefined)
      const cleanedData = Object.fromEntries(
        Object.entries(data).filter(([_, value]) => value !== undefined)
      ) as Omit<NewsletterTemplateConfig, 'id' | 'createdAt' | 'updatedAt'>;

      const newTemplate: Omit<NewsletterTemplateConfig, 'id'> = {
        ...cleanedData,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const docRef = await addDoc(collection(db, COLLECTIONS.TEMPLATE_CONFIGS), newTemplate);

      // TODO: Add specific audit logging for template operations

      return { id: docRef.id, ...newTemplate };
    } catch (error) {
      console.error('Error creating template config:', error);
      throw error;
    }
  }

  /**
   * Update an existing template config
   */
  async updateTemplateConfig(id: string, data: Partial<Omit<NewsletterTemplateConfig, 'id' | 'companyId' | 'createdAt'>>): Promise<void> {
    try {
      const docRef = doc(db, COLLECTIONS.TEMPLATE_CONFIGS, id);

      // Filter out undefined values (Firestore doesn't accept undefined)
      const cleanedData = Object.fromEntries(
        Object.entries(data).filter(([_, value]) => value !== undefined)
      );

      const updateData = {
        ...cleanedData,
        updatedAt: new Date().toISOString(),
      };

      await updateDoc(docRef, updateData);

      // TODO: Add specific audit logging for template operations
    } catch (error) {
      console.error('Error updating template config:', error);
      throw error;
    }
  }

  /**
   * Delete a template config
   */
  async deleteTemplateConfig(id: string): Promise<void> {
    try {
      await deleteDoc(doc(db, COLLECTIONS.TEMPLATE_CONFIGS, id));

      // TODO: Add specific audit logging for template operations
    } catch (error) {
      console.error('Error deleting template config:', error);
      throw error;
    }
  }

  // ============================================================================
  // RECIPIENT GROUP MANAGEMENT
  // ============================================================================

  /**
   * Get all recipient groups
   */
  async getGroups(companyId?: string): Promise<RecipientGroup[]> {
    if (!db) throw new Error('Firestore not initialized');

    // Defensive validation: companyId should always be provided
    // Only Site Admins should query without companyId filter
    if (!companyId) {
      console.warn('⚠️ getGroups() called without companyId - this should only happen for Site Admins');
    }

    const groupsRef = collection(db, COLLECTIONS.RECIPIENT_GROUPS);
    let q;

    if (companyId) {
      q = query(groupsRef, where('companyId', '==', companyId));
    } else {
      q = query(groupsRef);
    }

    const snapshot = await getDocs(q);

    const groups: RecipientGroup[] = [];

    for (const docSnap of snapshot.docs) {
      const groupData = docSnap.data() as RecipientGroup;

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
        ...(recDoc.data() as Recipient),
      })) as Recipient[];

      groups.push({
        id: docSnap.id,
        companyId: groupData.companyId,
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
  async addGroup(name: string, companyId: string): Promise<RecipientGroup> {
    if (!db) throw new Error('Firestore not initialized');

    const groupsRef = collection(db, COLLECTIONS.RECIPIENT_GROUPS);
    const docRef = await addDoc(groupsRef, {
      name,
      companyId,
      recipientCount: 0,
      createdAt: serverTimestamp(),
    });

    const newGroup = { id: docRef.id, name, companyId, recipientCount: 0, recipients: [] };

    // Audit logging
    const userContext = this.getCurrentUserContext();
    await auditService.logGroupCreated({
      ...userContext,
      groupId: newGroup.id,
      groupName: name,
    });

    return newGroup;
  }

  /**
   * Delete recipient group
   */
  async deleteGroup(id: string): Promise<void> {
    if (!db) throw new Error('Firestore not initialized');

    const groupRef = doc(db, COLLECTIONS.RECIPIENT_GROUPS, id);

    // Get group data before deleting for audit log
    const groupSnap = await getDoc(groupRef);
    const groupData = groupSnap.exists() ? groupSnap.data() : null;

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

    // Audit logging
    if (groupData) {
      const userContext = this.getCurrentUserContext();
      await auditService.logGroupDeleted({
        ...userContext,
        groupId: id,
        groupName: groupData.name || 'Unknown',
        recipientCount: recipientsSnapshot.size,
      });
    }
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

    // Audit logging
    const userContext = this.getCurrentUserContext();
    await auditService.logRecipientAdded({
      ...userContext,
      groupId: groupId,
      groupName: groupSnap.data().name,
      recipientEmail: recipient.email,
    });

    return {
      id: groupId,
      companyId: groupSnap.data().companyId,
      name: groupSnap.data().name,
      recipientCount: recipients.length,
      recipients,
    };
  }

  /**
   * Duplicate recipient group
   */
  async duplicateGroup(id: string): Promise<RecipientGroup> {
    if (!db) throw new Error('Firestore not initialized');

    // Get original group
    const originalGroupRef = doc(db, COLLECTIONS.RECIPIENT_GROUPS, id);
    const originalGroupSnap = await getDoc(originalGroupRef);

    if (!originalGroupSnap.exists()) {
      throw new Error('Group not found');
    }

    const originalGroupData = originalGroupSnap.data();

    // Get all recipients from original group
    const recipientsRef = collection(db, COLLECTIONS.RECIPIENT_GROUPS, id, 'recipients');
    const recipientsSnapshot = await getDocs(recipientsRef);
    const originalRecipients = recipientsSnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as Recipient[];

    // Create new group with "Copy of" prefix
    const newGroupName = `Copy of ${originalGroupData.name}`;
    const groupsRef = collection(db, COLLECTIONS.RECIPIENT_GROUPS);
    const newGroupRef = await addDoc(groupsRef, {
      name: newGroupName,
      companyId: originalGroupData.companyId,
      recipientCount: originalRecipients.length,
      createdAt: serverTimestamp(),
    });

    // Copy all recipients to new group's subcollection
    const newRecipientsRef = collection(
      db,
      COLLECTIONS.RECIPIENT_GROUPS,
      newGroupRef.id,
      'recipients'
    );

    // Use batch for efficient copying
    const batch = writeBatch(db);
    originalRecipients.forEach((recipient) => {
      const newRecipientRef = doc(newRecipientsRef);
      batch.set(newRecipientRef, {
        email: recipient.email,
        firstName: recipient.firstName,
        lastName: recipient.lastName,
        addedAt: serverTimestamp(),
      });
    });
    await batch.commit();

    // Audit logging
    const userContext = this.getCurrentUserContext();
    await auditService.logGroupDuplicated({
      ...userContext,
      originalGroupId: id,
      originalGroupName: originalGroupData.name,
      newGroupId: newGroupRef.id,
      newGroupName: newGroupName,
      recipientCount: originalRecipients.length,
    });

    return {
      id: newGroupRef.id,
      companyId: originalGroupData.companyId,
      name: newGroupName,
      recipientCount: originalRecipients.length,
      recipients: originalRecipients,
    };
  }

  /**
   * Delete recipient from group
   */
  async deleteRecipient(groupId: string, recipientId: string): Promise<void> {
    if (!db) throw new Error('Firestore not initialized');

    const groupRef = doc(db, COLLECTIONS.RECIPIENT_GROUPS, groupId);
    const groupSnap = await getDoc(groupRef);

    if (!groupSnap.exists()) {
      throw new Error('Group not found');
    }

    // Get recipient data before deleting for audit log
    const recipientRef = doc(
      db,
      COLLECTIONS.RECIPIENT_GROUPS,
      groupId,
      'recipients',
      recipientId
    );
    const recipientSnap = await getDoc(recipientRef);
    const recipientData = recipientSnap.exists() ? recipientSnap.data() : null;

    // Delete recipient from subcollection
    await deleteDoc(recipientRef);

    // Update recipient count
    const groupData = groupSnap.data();
    const newCount = Math.max(0, (groupData.recipientCount || 0) - 1);
    await updateDoc(groupRef, {
      recipientCount: newCount,
    });

    // Audit logging
    if (recipientData) {
      const userContext = this.getCurrentUserContext();
      await auditService.logRecipientRemoved({
        ...userContext,
        groupId: groupId,
        groupName: groupData.name,
        recipientEmail: recipientData.email,
      });
    }
  }

  /**
   * Update recipient in group
   */
  async updateRecipient(
    groupId: string,
    recipientId: string,
    data: Partial<Omit<Recipient, 'id'>>
  ): Promise<Recipient> {
    if (!db) throw new Error('Firestore not initialized');

    const groupRef = doc(db, COLLECTIONS.RECIPIENT_GROUPS, groupId);
    const groupSnap = await getDoc(groupRef);

    if (!groupSnap.exists()) {
      throw new Error('Group not found');
    }

    const recipientRef = doc(
      db,
      COLLECTIONS.RECIPIENT_GROUPS,
      groupId,
      'recipients',
      recipientId
    );

    // Get previous data for audit log
    const recipientSnap = await getDoc(recipientRef);
    if (!recipientSnap.exists()) {
      throw new Error('Recipient not found');
    }
    const previousData = recipientSnap.data();

    // Update recipient
    await updateDoc(recipientRef, {
      ...data,
      updatedAt: serverTimestamp(),
    });

    // Get updated data
    const updatedSnap = await getDoc(recipientRef);
    const updatedData = updatedSnap.data();

    // Audit logging
    const userContext = this.getCurrentUserContext();
    await auditService.logRecipientUpdated({
      ...userContext,
      groupId: groupId,
      groupName: groupSnap.data().name,
      recipientId: recipientId,
      recipientEmail: updatedData?.email || previousData.email,
      previousValue: previousData,
      newValue: updatedData,
    });

    return {
      id: recipientId,
      ...updatedData,
    } as Recipient;
  }

  /**
   * Get all unsubscribed users
   */
  async getUnsubscribedUsers(): Promise<UnsubscribedUser[]> {
    if (!db) throw new Error('Firestore not initialized');

    const unsubscribesRef = collection(db, 'unsubscribes');
    const snapshot = await getDocs(unsubscribesRef);

    return snapshot.docs.map((doc) => ({
      email: doc.id,
      ...doc.data(),
    })) as UnsubscribedUser[];
  }

  /**
   * Check if an email is unsubscribed
   */
  async isUnsubscribed(email: string): Promise<boolean> {
    if (!db) throw new Error('Firestore not initialized');

    const unsubscribeDoc = await getDoc(doc(db, 'unsubscribes', email));
    return unsubscribeDoc.exists();
  }

  // ============================================================================
  // MEDIA MANAGEMENT
  // ============================================================================

  /**
   * Get all media items
   */
  async getMedia(companyId?: string): Promise<MediaItem[]> {
    if (!db) throw new Error('Firestore not initialized');

    // Defensive validation: companyId should always be provided
    // Only Site Admins should query without companyId filter
    if (!companyId) {
      console.warn('⚠️ getMedia() called without companyId - this should only happen for Site Admins');
    }

    const mediaRef = collection(db, COLLECTIONS.MEDIA);
    let q;

    if (companyId) {
      q = query(mediaRef, where('companyId', '==', companyId), orderBy('uploadedAt', 'desc'));
    } else {
      q = query(mediaRef, orderBy('uploadedAt', 'desc'));
    }

    const snapshot = await getDocs(q);

    return snapshot.docs.map((doc) => {
      const data = doc.data() as Partial<MediaItem>;
      return {
        id: doc.id,
        ...data,
      } as MediaItem;
    });
  }

  /**
   * Upload media file
   */
  async uploadMedia(file: File, companyId: string): Promise<MediaItem> {
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
      companyId,
      size: `${(file.size / 1024 / 1024).toFixed(2)} MB`,
      dimensions: '800x600', // Would need image processing to get actual dimensions
      uploadedAt: serverTimestamp(),
    };

    const docRef = await addDoc(mediaRef, mediaItem);

    // Audit logging
    const userContext = this.getCurrentUserContext();
    await auditService.logMediaUploaded({
      ...userContext,
      mediaId: docRef.id,
      fileName: file.name,
      fileSize: mediaItem.size,
    });

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
  async getAuditLogs(companyId?: string): Promise<AuditLogEntry[]> {
    if (!db) throw new Error('Firestore not initialized');

    const logsRef = collection(db, COLLECTIONS.AUDIT_LOGS);
    let q;

    if (companyId) {
      q = query(logsRef, where('companyId', '==', companyId), orderBy('timestamp', 'desc'));
    } else {
      q = query(logsRef, orderBy('timestamp', 'desc'));
    }

    const snapshot = await getDocs(q);

    return snapshot.docs.map((doc) => {
      const data = doc.data() as any;
      return {
        id: doc.id,
        ...data,
        timestamp: this.timestampToISO(data.timestamp),
      } as AuditLogEntry;
    });
  }

  /**
   * Get bounced emails (filtered audit logs for EMAIL_BOUNCED action)
   */
  async getBounces(newsletterId?: string): Promise<Array<{
    id: string;
    recipientEmail: string;
    errorMessage: string;
    newsletterId: string;
    timestamp: string;
    bounceType: 'hard' | 'soft' | 'unknown';
    category: string;
  }>> {
    if (!db) throw new Error('Firestore not initialized');

    const logsRef = collection(db, COLLECTIONS.AUDIT_LOGS);
    let q;

    if (newsletterId) {
      // Query for specific newsletter's bounces
      q = query(
        logsRef,
        where('action', '==', 'EMAIL_BOUNCED'),
        orderBy('timestamp', 'desc')
      );
    } else {
      // Query all bounces
      q = query(
        logsRef,
        where('action', '==', 'EMAIL_BOUNCED'),
        orderBy('timestamp', 'desc')
      );
    }

    const snapshot = await getDocs(q);

    return snapshot.docs
      .map((doc) => {
        const data = doc.data() as any;
        const details = data.details || {};

        // Filter by newsletterId client-side if specified (since Firestore can't query nested fields easily)
        if (newsletterId && details.newsletterId !== newsletterId) {
          return null;
        }

        const errorMessage = details.errorMessage || 'Unknown error';
        const bounceType = this.categorizeBounceType(errorMessage);
        const category = this.categorizeBounceReason(errorMessage);

        return {
          id: doc.id,
          recipientEmail: details.recipientEmail || data.targetName || 'Unknown',
          errorMessage,
          newsletterId: details.newsletterId || 'Unknown',
          timestamp: this.timestampToISO(data.timestamp),
          bounceType,
          category,
        };
      })
      .filter((bounce): bounce is NonNullable<typeof bounce> => bounce !== null);
  }

  /**
   * Helper: Categorize bounce type (hard vs soft)
   */
  private categorizeBounceType(errorMessage: string): 'hard' | 'soft' | 'unknown' {
    const lowerError = errorMessage.toLowerCase();

    // Hard bounce indicators
    const hardBounceIndicators = [
      'user unknown',
      'does not exist',
      'invalid',
      'no such user',
      'unknown user',
      'address rejected',
      'domain not found',
      'invalid recipient',
    ];

    // Soft bounce indicators
    const softBounceIndicators = [
      'mailbox full',
      'quota exceeded',
      'temporarily',
      'try again later',
      'service unavailable',
      'connection timed out',
    ];

    if (hardBounceIndicators.some(indicator => lowerError.includes(indicator))) {
      return 'hard';
    }

    if (softBounceIndicators.some(indicator => lowerError.includes(indicator))) {
      return 'soft';
    }

    return 'unknown';
  }

  /**
   * Helper: Categorize bounce reason into user-friendly categories
   */
  private categorizeBounceReason(errorMessage: string): string {
    const lowerError = errorMessage.toLowerCase();

    if (lowerError.includes('user unknown') || lowerError.includes('does not exist') || lowerError.includes('no such user')) {
      return 'Invalid email address';
    }

    if (lowerError.includes('mailbox full') || lowerError.includes('quota exceeded')) {
      return 'Mailbox full';
    }

    if (lowerError.includes('domain') && (lowerError.includes('not found') || lowerError.includes('unknown'))) {
      return 'Domain doesn\'t exist';
    }

    if (lowerError.includes('rejected') || lowerError.includes('blocked')) {
      return 'Recipient rejected';
    }

    if (lowerError.includes('spam') || lowerError.includes('blacklist')) {
      return 'Spam/Blacklist issue';
    }

    if (lowerError.includes('temporarily') || lowerError.includes('try again')) {
      return 'Temporary failure';
    }

    if (lowerError.includes('connection') || lowerError.includes('timeout')) {
      return 'Connection issue';
    }

    return 'Other error';
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
  // CONTACT FORM METHODS
  // ============================================================================

  /**
   * Submit contact form (calls Cloud Function)
   */
  async submitContactForm(data: {
    inquiryType: string;
    name: string;
    email: string;
    company?: string;
    role?: string;
    teamSize?: string;
    subject?: string;
    message?: string;
    attachments?: Attachment[];
  }): Promise<{ success: boolean; id: string }> {
    if (!functions) {
      throw new Error('Firebase Functions not initialized');
    }

    const submitContactFormFunction = httpsCallable<typeof data, { success: boolean; id: string }>(
      functions,
      'submitContactForm'
    );

    const result = await submitContactFormFunction(data);
    return result.data;
  }



  // ============================================================================
  // AI NEWSLETTER GENERATION
  // ============================================================================

  /**
   * Generate newsletter HTML content using AI
   * Calls Cloud Function that integrates with OpenRouter API
   */
  async generateNewsletterContent(options: GenerateOptions): Promise<string> {
    if (!functions) {
      throw new Error('Firebase Functions not initialized');
    }

    const generateNewsletterFunction = httpsCallable<
      GenerateOptions,
      { success: boolean; htmlContent?: string; error?: string }
    >(functions, 'generateNewsletter');

    const result = await generateNewsletterFunction(options);

    if (!result.data.success || !result.data.htmlContent) {
      throw new Error(result.data.error || 'Failed to generate newsletter content');
    }

    return result.data.htmlContent;
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
