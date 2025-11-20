import React, { useState, useEffect, useMemo } from 'react';
import { Layout } from './components/Layout';
import { NewsletterEditor } from './components/NewsletterEditor';
import { AdminPanel } from './components/AdminPanel';
import { ProfilePage } from './components/ProfilePage';
import { AuthPage } from './components/AuthPage';
import { Analytics } from './components/Analytics';
import { User, Newsletter, NewsletterStatus } from './types';
import { api, isDatabaseSeeded, seedFirestoreData } from './services';
import { auth } from './services/firebase';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { Plus, BarChart3 } from 'lucide-react';
import { logUserLogin, logUserLogout } from './services/auditService';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingNewsletter, setEditingNewsletter] = useState<Newsletter | undefined>(undefined);
  const [sessionStartTime, setSessionStartTime] = useState<number | null>(null);

  // Dashboard Data
  const [newsletters, setNewsletters] = useState<Newsletter[]>([]);

  // Filter and sort state
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<NewsletterStatus[]>([]);
  const [sortBy, setSortBy] = useState<'updatedAt' | 'subject' | 'scheduledAt' | 'sentAt' | 'opens'>('updatedAt');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  // Auto-seed database on first load (only if empty)
  useEffect(() => {
    const checkAndSeedDatabase = async () => {
      try {
        const isSeeded = await isDatabaseSeeded();
        if (!isSeeded) {
          console.log('🌱 Database empty, seeding initial data...');
          await seedFirestoreData();
          console.log('✅ Database seeded successfully!');
        }
      } catch (error) {
        console.error('Failed to check/seed database:', error);
      }
    };

    checkAndSeedDatabase();
  }, []);

  // 💡 To manually reset database with seed data, run:
  //    npm run seed         (seed if empty)
  //    npm run seed:reset   (force reset and reseed)

  useEffect(() => {
    if (!auth) {
       console.error("Auth not initialized. Check firebase configuration.");
       setIsLoading(false);
       return;
    }

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          // Sync with Firestore - pass Firebase UID as document ID
          const appUser = await api.syncFirebaseUser(
              firebaseUser.uid,
              firebaseUser.email || '',
              firebaseUser.displayName || 'User',
              firebaseUser.photoURL
          );
          setUser(appUser);
          setActiveTab('dashboard');

          // Log user login and track session start
          setSessionStartTime(Date.now());
          await logUserLogin({
            userId: appUser.id,
            userName: appUser.name,
            userEmail: appUser.email,
            userRole: appUser.role,
            method: firebaseUser.providerData[0]?.providerId || 'unknown',
          });
        } catch (error) {
          console.error('Failed to sync user with Firestore:', error);
          // Sign out on sync failure to prevent redirect loop
          await signOut(auth);
          setUser(null);
          alert('Failed to create user profile. Please try again or contact support.');
        }
      } else {
        setUser(null);
      }
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);
  
  useEffect(() => {
    if (user) {
        api.getNewsletters().then(setNewsletters);
    }
  }, [user, activeTab, isEditorOpen]);

  const handleSignOut = async () => {
    if (auth && user) {
        // Log user logout with session duration
        const sessionDuration = sessionStartTime
          ? Math.round((Date.now() - sessionStartTime) / 1000) // seconds
          : undefined;

        await logUserLogout({
          userId: user.id,
          userName: user.name,
          userEmail: user.email,
          sessionDuration,
        });

        await signOut(auth);
        setUser(null);
        setSessionStartTime(null);
    }
  };

  const handleEditNewsletter = (newsletter?: Newsletter) => {
    setEditingNewsletter(newsletter);
    setIsEditorOpen(true);
  };

  const handleSaveNewsletter = () => {
      setIsEditorOpen(false);
      setEditingNewsletter(undefined);
      api.getNewsletters().then(setNewsletters);
  };

  const handleUpdateUser = (updatedUser: User) => {
      setUser(updatedUser);
  };

  // Filter and sort newsletters
  const filteredAndSortedNewsletters = useMemo(() => {
    let result = [...newsletters];

    // Apply search filter
    if (searchTerm.trim()) {
      result = result.filter(n =>
        n.subject.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Apply status filter
    if (statusFilter.length > 0) {
      result = result.filter(n => statusFilter.includes(n.status));
    }

    // Apply sorting
    result.sort((a, b) => {
      let compareValue = 0;

      switch (sortBy) {
        case 'subject':
          compareValue = a.subject.localeCompare(b.subject);
          break;
        case 'scheduledAt':
          compareValue = (a.scheduledAt || '').localeCompare(b.scheduledAt || '');
          break;
        case 'sentAt':
          compareValue = (a.sentAt || '').localeCompare(b.sentAt || '');
          break;
        case 'opens':
          compareValue = (a.stats?.opened || 0) - (b.stats?.opened || 0);
          break;
        case 'updatedAt':
        default:
          compareValue = a.updatedAt.localeCompare(b.updatedAt);
      }

      return sortDirection === 'asc' ? compareValue : -compareValue;
    });

    return result;
  }, [newsletters, searchTerm, statusFilter, sortBy, sortDirection]);

  if (isLoading) {
      return (
          <div className="min-h-screen bg-gray-100 flex items-center justify-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
      );
  }

  if (!user) {
    return <AuthPage />;
  }

  const renderContent = () => {
    if (isEditorOpen) {
      return (
        <NewsletterEditor 
          newsletter={editingNewsletter} 
          onSave={handleSaveNewsletter}
          onCancel={() => setIsEditorOpen(false)}
        />
      );
    }

    switch (activeTab) {
      case 'admin':
        return <AdminPanel currentUser={user} />;
      
      case 'profile':
        return <ProfilePage user={user} onUpdateUser={handleUpdateUser} />;
      
      case 'newsletters':
        return (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
               <div>
                 <h1 className="text-2xl font-bold text-gray-900">Newsletters</h1>
                 <p className="text-gray-500">Create, manage and send your internal communications.</p>
               </div>
               <button 
                 onClick={() => handleEditNewsletter()}
                 className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 font-medium flex items-center"
               >
                 <Plus className="w-4 h-4 mr-2" />
                 Create New
               </button>
            </div>

            {/* Filter and Sort Controls */}
            <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
              <div className="flex flex-col sm:flex-row gap-4">
                {/* Search Input */}
                <div className="flex-1">
                  <input
                    type="text"
                    placeholder="🔍 Search newsletters..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                {/* Status Filter */}
                <div className="relative">
                  <select
                    multiple
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(
                      Array.from(e.target.selectedOptions, option => option.value as NewsletterStatus)
                    )}
                    className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 min-w-[150px] h-10"
                    size={1}
                  >
                    <option value="">All Status</option>
                    <option value={NewsletterStatus.DRAFT}>Draft</option>
                    <option value={NewsletterStatus.SCHEDULED}>Scheduled</option>
                    <option value={NewsletterStatus.SENDING}>Sending</option>
                    <option value={NewsletterStatus.SENT}>Sent</option>
                    <option value={NewsletterStatus.PAUSED}>Paused</option>
                  </select>
                  {statusFilter.length > 0 && (
                    <span className="absolute -top-2 -right-2 bg-blue-600 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                      {statusFilter.length}
                    </span>
                  )}
                </div>

                {/* Sort Dropdown */}
                <div className="flex gap-2">
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as any)}
                    className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="updatedAt">Last Updated</option>
                    <option value="subject">Subject (A-Z)</option>
                    <option value="scheduledAt">Scheduled Date</option>
                    <option value="sentAt">Sent Date</option>
                    <option value="opens">Open Count</option>
                  </select>

                  <button
                    onClick={() => setSortDirection(d => d === 'asc' ? 'desc' : 'asc')}
                    className="px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                    title={sortDirection === 'asc' ? 'Ascending' : 'Descending'}
                  >
                    {sortDirection === 'asc' ? '↑' : '↓'}
                  </button>
                </div>

                {/* Clear Filters */}
                {(searchTerm || statusFilter.length > 0) && (
                  <button
                    onClick={() => {
                      setSearchTerm('');
                      setStatusFilter([]);
                    }}
                    className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg whitespace-nowrap"
                  >
                    Clear Filters
                  </button>
                )}
              </div>

              {/* Result Count */}
              <p className="text-sm text-gray-600 mt-3">
                Showing {filteredAndSortedNewsletters.length} of {newsletters.length} newsletters
              </p>
            </div>

            <div className="grid gap-4">
               {filteredAndSortedNewsletters.map(n => (
                 <div key={n.id} className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex justify-between items-center hover:border-blue-300 transition-all">
                    <div>
                       <h3 className="text-lg font-semibold text-gray-800 mb-1">{n.subject}</h3>
                       <div className="flex items-center space-x-4 text-sm text-gray-500">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            n.status === 'Sent' ? 'bg-green-100 text-green-800' :
                            n.status === 'Scheduled' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {n.status}
                          </span>
                          <span>
                            {n.status === 'Scheduled' && n.scheduledAt
                              ? `Scheduled for: ${new Date(n.scheduledAt).toLocaleString()}`
                              : n.status === 'Sent' && n.sentAt
                              ? `Sent: ${new Date(n.sentAt).toLocaleString()}`
                              : `Updated: ${new Date(n.updatedAt).toLocaleDateString()}`}
                          </span>
                          {n.stats && (
                            <span className="flex items-center text-gray-400">
                               <BarChart3 className="w-3 h-3 mr-1" />
                               {n.stats.opened} opens
                            </span>
                          )}
                       </div>
                    </div>
                    <div className="flex items-center space-x-2">
                        <button onClick={() => handleEditNewsletter(n)} className="px-4 py-2 text-sm text-blue-600 hover:bg-blue-50 rounded-lg font-medium">
                            Edit
                        </button>
                    </div>
                 </div>
               ))}
               {filteredAndSortedNewsletters.length === 0 && (
                   <div className="text-center py-12 text-gray-500 bg-white rounded-xl border border-gray-200">
                       {newsletters.length === 0
                         ? 'No newsletters found. Create one to get started!'
                         : 'No newsletters match your filters. Try adjusting your search or filters.'}
                   </div>
               )}
            </div>
          </div>
        );

      case 'analytics':
        return <Analytics newsletters={newsletters} />;

      default:
        return (
          <div className="space-y-6">
             <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div className="col-span-full bg-gradient-to-r from-blue-600 to-indigo-700 rounded-2xl p-8 text-white shadow-lg">
                    <h2 className="text-2xl font-bold mb-2">Welcome back, {user.name}!</h2>
                    <p className="text-blue-100 mb-6 max-w-2xl">You have 2 scheduled newsletters for this week. The engagement on "Q3 Recap" is trending up.</p>
                    <button onClick={() => handleEditNewsletter()} className="bg-white text-blue-700 px-5 py-2.5 rounded-lg font-semibold hover:bg-blue-50 transition-colors">
                        Draft New Newsletter
                    </button>
                </div>

                <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                    <h3 className="font-semibold text-gray-800 mb-4">Quick Stats</h3>
                    <div className="space-y-4">
                        <div className="flex justify-between items-center">
                            <span className="text-gray-600">Drafts</span>
                            <span className="font-medium bg-gray-100 px-2 py-1 rounded">{newsletters.filter(n => n.status === 'Draft').length}</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-gray-600">Scheduled</span>
                            <span className="font-medium bg-yellow-100 text-yellow-800 px-2 py-1 rounded">{newsletters.filter(n => n.status === 'Scheduled').length}</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-gray-600">Sent (This Month)</span>
                            <span className="font-medium bg-green-100 text-green-800 px-2 py-1 rounded">{newsletters.filter(n => n.status === 'Sent').length}</span>
                        </div>
                    </div>
                </div>
             </div>
          </div>
        );
    }
  };

  return (
    <Layout 
      currentUser={user} 
      onLogout={handleSignOut} 
      activeTab={activeTab}
      onNavigate={setActiveTab}
      onOpenSettings={() => setActiveTab('profile')}
    >
      {renderContent()}
    </Layout>
  );
}