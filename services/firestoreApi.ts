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
import { db, storage, auth } from './firebase';
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

    // 1. Fetch tracking logs
    const trackingRef = collection(db, 'tracking');
    const q = query(trackingRef, where('newsletterId', '==', newsletterId), orderBy('timestamp', 'desc'));
    const trackingSnapshot = await getDocs(q);

    if (trackingSnapshot.empty) {
      return [];
    }

    // 2. Fetch newsletter to get recipient groups
    const newsletter = await this.getNewsletter(newsletterId);
    if (!newsletter) return [];

    // 3. Fetch all recipients from groups to build an ID -> Email map
    const recipientMap = new Map<string, string>();

    for (const groupId of newsletter.recipientGroupIds) {
      const recipientsRef = collection(db, COLLECTIONS.RECIPIENT_GROUPS, groupId, 'recipients');
      const recipientsSnapshot = await getDocs(recipientsRef);

      recipientsSnapshot.docs.forEach(doc => {
        const data = doc.data();
        recipientMap.set(doc.id, data.email);
      });
    }

    // 4. Join data
    return trackingSnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        recipientEmail: recipientMap.get(data.recipientId) || 'Unknown Recipient',
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

    const newCategory = { id: docRef.id, name, count: 0 };

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

    const newGroup = { id: docRef.id, name, recipientCount: 0, recipients: [] };

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
