import { User, UserRole, Newsletter, NewsletterStatus, Category, RecipientGroup, AuditLogEntry, MediaItem, Recipient } from '../types';

// --- Initial Mock Data ---

const MOCK_USERS: User[] = [
  {
    id: 'u1',
    name: 'Alice Admin',
    email: 'alice@company.com',
    role: UserRole.SITE_ADMIN,
    avatarUrl: 'https://picsum.photos/id/1011/200/200',
    description: 'Head of Internal IT',
    linkedinUrl: 'https://linkedin.com/in/aliceadmin'
  },
  {
    id: 'u2',
    name: 'Bob Editor',
    email: 'bob@company.com',
    role: UserRole.NEWSLETTER_ADMIN,
    avatarUrl: 'https://picsum.photos/id/1005/200/200',
    description: 'Communications Director'
  },
  {
    id: 'u3',
    name: 'Charlie Creator',
    email: 'charlie@company.com',
    role: UserRole.NEWSLETTER_CREATOR,
    avatarUrl: 'https://picsum.photos/id/1025/200/200',
    description: 'Content Specialist'
  }
];

const MOCK_CATEGORIES: Category[] = [
  { id: 'c1', name: 'Weekly Updates', count: 12 },
  { id: 'c2', name: 'HR Announcements', count: 5 },
  { id: 'c3', name: 'Engineering Tech Talk', count: 8 },
  { id: 'c4', name: 'Social Events', count: 3 },
];

const MOCK_GROUPS: RecipientGroup[] = [
  { id: 'g1', name: 'All Employees', recipientCount: 450, recipients: [] },
  { id: 'g2', name: 'Engineering Dept', recipientCount: 120, recipients: [] },
  { id: 'g3', name: 'Marketing Team', recipientCount: 45, recipients: [] },
  { id: 'g4', name: 'Leadership', recipientCount: 25, recipients: [] },
];

const MOCK_NEWSLETTERS: Newsletter[] = [
  {
    id: 'n1',
    subject: 'Q3 Company All-Hands Recap',
    status: NewsletterStatus.SENT,
    categoryId: 'c1',
    recipientGroupIds: ['g1'],
    htmlContent: '<h1>Great Quarter!</h1><p>Thanks everyone.</p>',
    sentAt: '2023-10-15T10:00:00Z',
    updatedAt: '2023-10-15T09:30:00Z',
    stats: { sent: 450, opened: 380, clicked: 150, bounced: 2 }
  },
  {
    id: 'n2',
    subject: 'New Health Benefits Overview',
    status: NewsletterStatus.DRAFT,
    categoryId: 'c2',
    recipientGroupIds: ['g1'],
    htmlContent: '<h1>Health Benefits 2024</h1><p>Review the attached docs...</p><img src="https://via.placeholder.com/150" alt="placeholder" />',
    updatedAt: '2023-10-26T14:20:00Z',
  },
  {
    id: 'n3',
    subject: 'Engineering Demo Day',
    status: NewsletterStatus.SCHEDULED,
    categoryId: 'c3',
    recipientGroupIds: ['g2'],
    htmlContent: '<h1>Demo Day</h1><p>Join us this Friday!</p>',
    scheduledAt: '2023-11-01T16:00:00Z',
    updatedAt: '2023-10-27T11:00:00Z',
  }
];

const MOCK_AUDIT_LOGS: AuditLogEntry[] = [
  { id: 'l1', userId: 'u1', userName: 'Alice Admin', action: 'USER_CREATED', target: 'User: David', timestamp: '2023-10-25T09:00:00Z' },
  { id: 'l2', userId: 'u2', userName: 'Bob Editor', action: 'CATEGORY_ADDED', target: 'Category: Social Events', timestamp: '2023-10-24T14:30:00Z' },
  { id: 'l3', userId: 'u3', userName: 'Charlie Creator', action: 'NEWSLETTER_CREATED', target: 'Newsletter: Q3 Recap', timestamp: '2023-10-14T10:00:00Z' },
];

const MOCK_MEDIA: MediaItem[] = [
  { id: 'm1', url: 'https://picsum.photos/id/10/600/400', name: 'office_view.jpg', size: '1.2 MB', dimensions: '1200x800' },
  { id: 'm2', url: 'https://picsum.photos/id/20/600/400', name: 'team_meeting.jpg', size: '2.4 MB', dimensions: '1920x1080' },
  { id: 'm3', url: 'https://picsum.photos/id/30/600/400', name: 'coffee_break.jpg', size: '0.8 MB', dimensions: '800x600' },
];

// --- Service Implementation ---

class MockApiService {
  private users = MOCK_USERS;
  private newsletters = MOCK_NEWSLETTERS;
  private categories = MOCK_CATEGORIES;
  private groups = MOCK_GROUPS;
  private auditLogs = MOCK_AUDIT_LOGS;
  private media = MOCK_MEDIA;

  // User Auth
  async login(role: UserRole): Promise<User> {
    const user = this.users.find(u => u.role === role);
    return new Promise((resolve) => setTimeout(() => resolve(user || this.users[0]), 500));
  }

  // Bridge Firebase User to App User
  async syncFirebaseUser(email: string, name: string, photoUrl: string | null): Promise<User> {
      // Check if user exists by email
      let user = this.users.find(u => u.email.toLowerCase() === email.toLowerCase());

      if (!user) {
          // Create new user if they don't exist
          user = {
              id: `u${Date.now()}`,
              email: email,
              name: name || email.split('@')[0],
              role: UserRole.NEWSLETTER_CREATOR, // Default role
              avatarUrl: photoUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(name || 'User')}`,
              description: 'New team member'
          };
          this.users.push(user);
          this.logAction('SYSTEM', 'SYSTEM', 'USER_REGISTERED', `User: ${user.name}`);
      }

      return Promise.resolve(user);
  }

  // User Management
  async getUsers(): Promise<User[]> {
    return Promise.resolve([...this.users]);
  }

  async addUser(user: Omit<User, 'id'>): Promise<User> {
    const newUser = { ...user, id: `u${Date.now()}`, avatarUrl: `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}` };
    this.users.push(newUser);
    this.logAction('SYSTEM', 'SYSTEM', 'USER_CREATED', `User: ${newUser.name}`);
    return Promise.resolve(newUser);
  }

  async updateUser(id: string, data: Partial<User>): Promise<User> {
    const index = this.users.findIndex(u => u.id === id);
    if (index !== -1) {
      this.users[index] = { ...this.users[index], ...data };
      this.logAction(id, this.users[index].name, 'USER_UPDATED', `User: ${this.users[index].name}`);
      return Promise.resolve(this.users[index]);
    }
    throw new Error("User not found");
  }

  async deleteUser(id: string): Promise<void> {
    this.users = this.users.filter(u => u.id !== id);
    this.logAction('SYSTEM', 'SYSTEM', 'USER_DELETED', `User ID: ${id}`);
    return Promise.resolve();
  }

  // Newsletters
  async getNewsletters(): Promise<Newsletter[]> {
    return Promise.resolve([...this.newsletters]);
  }

  async getNewsletter(id: string): Promise<Newsletter | undefined> {
    return Promise.resolve(this.newsletters.find(n => n.id === id));
  }

  async saveNewsletter(newsletter: Newsletter): Promise<Newsletter> {
    const index = this.newsletters.findIndex(n => n.id === newsletter.id);
    if (index >= 0) {
      this.newsletters[index] = { ...newsletter, updatedAt: new Date().toISOString() };
    } else {
      this.newsletters.push({ ...newsletter, updatedAt: new Date().toISOString() });
    }
    return Promise.resolve(newsletter);
  }

  async deleteNewsletter(id: string): Promise<void> {
    this.newsletters = this.newsletters.filter(n => n.id !== id);
    return Promise.resolve();
  }

  // Categories
  async getCategories(): Promise<Category[]> {
    return Promise.resolve([...this.categories]);
  }

  async addCategory(name: string): Promise<Category> {
    const newCat = { id: `c${Date.now()}`, name, count: 0 };
    this.categories.push(newCat);
    return Promise.resolve(newCat);
  }

  async deleteCategory(id: string): Promise<void> {
    this.categories = this.categories.filter(c => c.id !== id);
    return Promise.resolve();
  }

  // Groups & Recipients
  async getGroups(): Promise<RecipientGroup[]> {
    return Promise.resolve([...this.groups]);
  }

  async addGroup(name: string): Promise<RecipientGroup> {
    const newGroup = { id: `g${Date.now()}`, name, recipientCount: 0, recipients: [] };
    this.groups.push(newGroup);
    return Promise.resolve(newGroup);
  }

  async deleteGroup(id: string): Promise<void> {
    this.groups = this.groups.filter(g => g.id !== id);
    return Promise.resolve();
  }

  async addRecipient(groupId: string, recipient: Omit<Recipient, 'id'>): Promise<RecipientGroup> {
    const groupIndex = this.groups.findIndex(g => g.id === groupId);
    if (groupIndex === -1) throw new Error("Group not found");

    const newRecipient = { 
        ...recipient, 
        // Enhanced ID generation to avoid collisions during bulk import
        id: `r${Date.now()}-${Math.random().toString(36).substr(2, 9)}` 
    };
    const group = this.groups[groupIndex];
    
    if (!group.recipients) group.recipients = [];
    group.recipients.push(newRecipient);
    group.recipientCount = group.recipients.length;
    
    this.groups[groupIndex] = group;
    return Promise.resolve(group);
  }

  // Media
  async getMedia(): Promise<MediaItem[]> {
    return Promise.resolve([...this.media]);
  }
  
  async uploadMedia(file: File): Promise<MediaItem> {
     const newItem: MediaItem = {
         id: `m${Date.now()}`,
         url: URL.createObjectURL(file), // Local preview URL
         name: file.name,
         size: `${(file.size / 1024 / 1024).toFixed(2)} MB`,
         dimensions: '800x600' // Mocked resize
     };
     this.media.unshift(newItem);
     return new Promise(resolve => setTimeout(() => resolve(newItem), 800));
  }

  // Audit Log
  async getAuditLogs(): Promise<AuditLogEntry[]> {
    return Promise.resolve([...this.auditLogs]);
  }

  private logAction(userId: string, userName: string, action: string, target: string) {
    this.auditLogs.unshift({
      id: `l${Date.now()}`,
      userId,
      userName,
      action,
      target,
      timestamp: new Date().toISOString()
    });
  }
}

export const api = new MockApiService();