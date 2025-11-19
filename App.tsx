import React, { useState, useEffect } from 'react';
import { Layout } from './components/Layout';
import { NewsletterEditor } from './components/NewsletterEditor';
import { AdminPanel } from './components/AdminPanel';
import { ProfilePage } from './components/ProfilePage';
import { AuthPage } from './components/AuthPage';
import { User, Newsletter } from './types';
import { api, isDatabaseSeeded, seedFirestoreData, resetAndSeedData } from './services';
import { auth } from './services/firebase';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { Plus, BarChart3 } from 'lucide-react';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingNewsletter, setEditingNewsletter] = useState<Newsletter | undefined>(undefined);

  // Dashboard Data
  const [newsletters, setNewsletters] = useState<Newsletter[]>([]);

  // Auto-seed database on first load
  useEffect(() => {
    const checkAndSeedDatabase = async () => {
      try {
        // 🔧 DEV: Uncomment to force database reset
        await resetAndSeedData();

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
    if (auth) {
        await signOut(auth);
        setUser(null);
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

            <div className="grid gap-4">
               {newsletters.map(n => (
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
                          <span>Updated: {new Date(n.updatedAt).toLocaleDateString()}</span>
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
               {newsletters.length === 0 && (
                   <div className="text-center py-12 text-gray-500 bg-white rounded-xl border border-gray-200">
                       No newsletters found. Create one to get started!
                   </div>
               )}
            </div>
          </div>
        );

      case 'analytics':
        return (
             <div className="space-y-6">
                <h1 className="text-2xl font-bold text-gray-900">Analytics Overview</h1>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                        <p className="text-sm text-gray-500 font-medium uppercase">Total Emails Sent</p>
                        <p className="text-3xl font-bold text-gray-900 mt-2">12,450</p>
                        <p className="text-sm text-green-600 mt-1">+12% from last month</p>
                    </div>
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                        <p className="text-sm text-gray-500 font-medium uppercase">Avg. Open Rate</p>
                        <p className="text-3xl font-bold text-gray-900 mt-2">68.5%</p>
                        <p className="text-sm text-green-600 mt-1">+4.2% from last month</p>
                    </div>
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                        <p className="text-sm text-gray-500 font-medium uppercase">Avg. Click Rate</p>
                        <p className="text-3xl font-bold text-gray-900 mt-2">24.1%</p>
                        <p className="text-sm text-red-600 mt-1">-1.5% from last month</p>
                    </div>
                </div>
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 h-64 flex items-center justify-center text-gray-400">
                    Chart Visualization Placeholder
                </div>
             </div>
        );

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