import React, { useState, useEffect, useMemo } from 'react';
import { Layout } from './components/Layout';
import { NewsletterEditor } from './components/NewsletterEditor';
import { AdminPanel } from './components/AdminPanel';
import { ProfilePage } from './components/ProfilePage';
import { AuthPage } from './components/AuthPage';
import { Analytics } from './components/Analytics';
import { LandingPage } from './components/LandingPage';
import { User, Newsletter, NewsletterStatus, Company, UserRole } from './types';
import { api, isDatabaseSeeded, seedFirestoreData } from './services';
import { auth } from './services/firebase';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import {
  LayoutDashboard,
  PenTool,
  Users,
  Settings,
  LogOut,
  Plus,
  Search,
  Filter,
  MoreVertical,
  ChevronDown,
  Loader2,
  Mail,
  Calendar,
  BarChart3,
  Copy,
  Trash2,
  Download,
  FileCode,
  AlertCircle,
  FileText
} from 'lucide-react';
import { logUserLogin, logUserLogout } from './services/auditService';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [company, setCompany] = useState<Company | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingNewsletter, setEditingNewsletter] = useState<Newsletter | undefined>(undefined);
  const [sessionStartTime, setSessionStartTime] = useState<number | null>(null);
  const [showLogin, setShowLogin] = useState(false);

  // Dashboard Data
  const [newsletters, setNewsletters] = useState<Newsletter[]>([]);
  const [totalRecipients, setTotalRecipients] = useState(0);

  useEffect(() => {
    const fetchRecipientCount = async () => {
      try {
        const groups = await api.getGroups(user?.companyId);
        const count = groups.reduce((acc, group) => acc + (group.recipientCount || 0), 0);
        setTotalRecipients(count);
      } catch (error) {
        console.error('Failed to fetch recipient count:', error);
      }
    };
    if (user) {
      fetchRecipientCount();
    }
  }, [user]);

  // Filter and sort state
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<NewsletterStatus[]>([]);
  const [newsletterCompanyFilter, setNewsletterCompanyFilter] = useState<string>('all'); // 'all' or companyId
  const [sortBy, setSortBy] = useState<'updatedAt' | 'subject' | 'scheduledAt' | 'sentAt' | 'opens'>('updatedAt');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  // Companies state for Site Admin filtering
  const [companies, setCompanies] = useState<Company[]>([]);

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

          // Fetch company details if associated
          if (appUser.companyId) {
            const companyData = await api.getCompany(appUser.companyId);
            setCompany(companyData);
          }

          setActiveTab('dashboard');

          // Log user login and track session start
          setSessionStartTime(Date.now());
          await logUserLogin({
            userId: appUser.id,
            userName: appUser.name,
            userEmail: appUser.email,
            userRole: appUser.role,
            companyId: appUser.companyId,
            method: firebaseUser.providerData[0]?.providerId || 'unknown',
          });
        } catch (error) {
          console.error('Failed to sync user with Firestore:', error);
          // Sign out on sync failure to prevent redirect loop
          await signOut(auth);
          setUser(null);
          setCompany(undefined);
          alert('Failed to create user profile. Please try again or contact support.');
        }
      } else {
        setUser(null);
        setCompany(undefined);
      }
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (user) {
      const queryCompanyId = user.role === UserRole.SITE_ADMIN ? undefined : user.companyId;

      // Debug: Log user info to verify companyId
      console.log('🔍 Fetching newsletters for user:', {
        userId: user.id,
        userName: user.name,
        userRole: user.role,
        userCompanyId: user.companyId,
        queryingWith: queryCompanyId || 'ALL_COMPANIES (Site Admin)'
      });

      // Pass companyId to filter newsletters (Site Admin gets all if no companyId passed, but we might want to restrict/filter in UI)
      // For now, Site Admin sees all, others see their company's
      api.getNewsletters(queryCompanyId).then((fetchedNewsletters) => {
        console.log('📦 Newsletters received from API:', {
          totalCount: fetchedNewsletters.length,
          queriedWithCompanyId: queryCompanyId || 'undefined (all companies)',
          newsletters: fetchedNewsletters.map(n => ({
            id: n.id,
            subject: n.subject,
            companyId: n.companyId,
            status: n.status,
            matchesUserCompany: n.companyId === user.companyId
          }))
        });

        if (fetchedNewsletters.length === 0) {
          console.warn('⚠️ No newsletters returned from API. Possible issues:');
          console.warn('  1. User companyId mismatch:', user.companyId);
          console.warn('  2. No newsletters exist for this company');
          console.warn('  3. Firestore security rules blocking access');
        }

        setNewsletters(fetchedNewsletters);
      }).catch(error => {
        console.error('❌ Failed to fetch newsletters:', error);
        console.error('Error details:', {
          message: error.message,
          code: error.code,
          userCompanyId: user.companyId
        });
        setNewsletters([]);
      });

      // Load companies for Site Admin to enable company filtering and display
      if (user.role === UserRole.SITE_ADMIN && activeTab === 'newsletters') {
        api.getCompanies().then(setCompanies).catch(error => {
          console.error('❌ Failed to fetch companies:', error);
          setCompanies([]);
        });
      }
    }
  }, [user, activeTab, isEditorOpen]);

  // Validate that non-Site-Admin users have a valid companyId
  useEffect(() => {
    if (user && user.role !== UserRole.SITE_ADMIN) {
      if (!user.companyId) {
        console.error('❌ CRITICAL: User missing companyId:', {
          userId: user.id,
          userName: user.name,
          userRole: user.role,
          userEmail: user.email
        });
        alert(
          '❌ Account Configuration Error\n\n' +
          'Your account is not associated with a company. This is required for Company Admin and Newsletter Admin roles.\n\n' +
          'Please contact your Site Administrator to assign you to a company.\n\n' +
          'You will be signed out for security reasons.'
        );
        handleSignOut();
      } else {
        console.log('✅ User validation passed:', {
          userId: user.id,
          userName: user.name,
          userRole: user.role,
          companyId: user.companyId
        });
      }
    }
  }, [user]);

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
        companyId: user.companyId,
      });

      await signOut(auth);
      setUser(null);
      setCompany(undefined);
      setSessionStartTime(null);
    }
  };

  const handleEditNewsletter = (newsletter?: Newsletter) => {
    setEditingNewsletter(newsletter);
    setIsEditorOpen(true);
  };

  const handleSaveNewsletter = async () => {
    setIsEditorOpen(false);
    setEditingNewsletter(undefined);
    // Properly await the newsletter list refresh
    const updatedList = await api.getNewsletters(user?.role === UserRole.SITE_ADMIN ? undefined : user?.companyId);
    setNewsletters(updatedList);
  };

  const handleDuplicateNewsletter = async (newsletter: Newsletter) => {
    if (window.confirm(`Are you sure you want to duplicate "${newsletter.subject}"?`)) {
      try {
        setIsLoading(true);
        await api.duplicateNewsletter(newsletter.id);
        const updatedList = await api.getNewsletters(user?.role === UserRole.SITE_ADMIN ? undefined : user?.companyId);
        setNewsletters(updatedList);
        setIsLoading(false);
      } catch (error) {
        console.error("Failed to duplicate newsletter:", error);
        setIsLoading(false);
        alert("Failed to duplicate newsletter. Please try again.");
      }
    }
  };

  const handleDeleteNewsletter = async (e: React.MouseEvent, newsletter: Newsletter) => {
    e.stopPropagation();
    if (!window.confirm(`Are you sure you want to delete "${newsletter.subject}"? This action cannot be undone.`)) {
      return;
    }

    try {
      await api.deleteNewsletter(newsletter.id);
      // Refresh list
      const updatedNewsletters = await api.getNewsletters(user?.role === UserRole.SITE_ADMIN ? undefined : user?.companyId);
      setNewsletters(updatedNewsletters);
    } catch (error) {
      console.error('Failed to delete newsletter:', error);
      alert('Failed to delete newsletter. Please try again.');
    }
  };

  const handleDownloadHTML = (newsletter: Newsletter) => {
    const element = document.createElement("a");
    const file = new Blob([newsletter.htmlContent], { type: 'text/html' });
    element.href = URL.createObjectURL(file);
    element.download = `${newsletter.subject.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.html`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  const handleDownloadPDF = (newsletter: Newsletter) => {
    // Create a hidden iframe
    const iframe = document.createElement('iframe');
    iframe.style.display = 'none';
    document.body.appendChild(iframe);

    // Write content to the iframe
    const doc = iframe.contentWindow?.document;
    if (doc) {
      doc.open();
      doc.write(`
        <html>
          <head>
            <title>${newsletter.subject}</title>
            <style>
              body {
                font-family: system-ui, -apple-system, sans-serif;
                line-height: 1.5;
                color: #333;
                max-width: 800px;
                margin: 0 auto;
                padding: 20px;
              }
              img {
                max-width: 100%;
                height: auto;
              }
              @media print {
                * {
                  -webkit-print-color-adjust: exact !important;
                  print-color-adjust: exact !important;
                }
                body {
                  background-color: white; /* Fallback */
                }
              }
            </style>
          </head>
          <body>
            ${newsletter.htmlContent}
          </body>
        </html>
      `);
      doc.close();

      // Wait for images to load then print
      iframe.onload = () => {
        try {
          iframe.contentWindow?.focus();
          iframe.contentWindow?.print();
        } catch (e) {
          console.error('Print failed', e);
        } finally {
          // Remove iframe after a delay to ensure print dialog has opened
          setTimeout(() => {
            document.body.removeChild(iframe);
          }, 1000);
        }
      };
    }
  };

  const handleUpdateUser = (updatedUser: User) => {
    setUser(updatedUser);
  };

  // Filter and sort newsletters
  const filteredAndSortedNewsletters = useMemo(() => {
    console.log('🎯 Filtering newsletters:', {
      totalNewsletters: newsletters.length,
      activeFilters: {
        searchTerm: searchTerm || 'none',
        statusFilter: statusFilter.length > 0 ? statusFilter : 'none',
        newsletterCompanyFilter: newsletterCompanyFilter !== 'all' ? newsletterCompanyFilter : 'all (no filter)'
      }
    });

    let result = [...newsletters];
    const initialCount = result.length;

    // Apply search filter
    if (searchTerm.trim()) {
      result = result.filter(n =>
        n.subject.toLowerCase().includes(searchTerm.toLowerCase())
      );
      console.log(`  ├─ After search filter: ${result.length}/${initialCount} (removed ${initialCount - result.length})`);
    }

    // Apply status filter
    if (statusFilter.length > 0) {
      const beforeStatusFilter = result.length;
      result = result.filter(n => statusFilter.includes(n.status));
      console.log(`  ├─ After status filter: ${result.length}/${beforeStatusFilter} (removed ${beforeStatusFilter - result.length})`);
    }

    // Apply company filter (Site Admin only)
    if (newsletterCompanyFilter !== 'all') {
      const beforeCompanyFilter = result.length;
      result = result.filter(n => n.companyId === newsletterCompanyFilter);
      console.log(`  ├─ After company filter: ${result.length}/${beforeCompanyFilter} (removed ${beforeCompanyFilter - result.length})`);
      console.log(`     Filtering for companyId: ${newsletterCompanyFilter}`);
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

    console.log(`  └─ ✅ Final filtered & sorted: ${result.length} newsletters`);
    if (result.length === 0 && newsletters.length > 0) {
      console.warn('⚠️ All newsletters were filtered out! Check your filter settings.');
    }

    return result;
  }, [newsletters, searchTerm, statusFilter, newsletterCompanyFilter, sortBy, sortDirection]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!user) {
    if (showLogin) {
      return <AuthPage />;
    }
    return <LandingPage onLogin={() => setShowLogin(true)} />;
  }

  const renderContent = () => {
    if (isEditorOpen) {
      return (
        <NewsletterEditor
          newsletter={editingNewsletter}
          currentUser={user}
          onSave={handleSaveNewsletter}
          onCancel={() => setIsEditorOpen(false)}
        />
      );
    }

    switch (activeTab) {
      case 'admin':
        // Only allow Site Admin and Company Admin to access admin panel
        if (user.role === UserRole.SITE_ADMIN || user.role === UserRole.COMPANY_ADMIN) {
          return <AdminPanel currentUser={user} />;
        }
        return (
          <div className="p-8 text-center">
            <h2 className="text-2xl font-bold text-gray-800">Access Denied</h2>
            <p className="text-gray-600 mt-2">You do not have permission to view this page.</p>
          </div>
        );

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
                      Array.from(e.target.selectedOptions, (option: HTMLOptionElement) => option.value as NewsletterStatus)
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

                {/* Company Filter (Site Admin only) */}
                {user.role === UserRole.SITE_ADMIN && (
                  <div className="relative">
                    <select
                      value={newsletterCompanyFilter}
                      onChange={(e) => setNewsletterCompanyFilter(e.target.value)}
                      className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 min-w-[200px] h-10"
                    >
                      <option value="all">All Companies</option>
                      {companies.map(company => (
                        <option key={company.id} value={company.id}>{company.name}</option>
                      ))}
                    </select>
                    {newsletterCompanyFilter !== 'all' && (
                      <span className="absolute -top-2 -right-2 bg-blue-600 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                        1
                      </span>
                    )}
                  </div>
                )}

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
                {(searchTerm || statusFilter.length > 0 || newsletterCompanyFilter !== 'all') && (
                  <button
                    onClick={() => {
                      setSearchTerm('');
                      setStatusFilter([]);
                      setNewsletterCompanyFilter('all');
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
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${n.status === 'Sent' ? 'bg-green-100 text-green-800' :
                        n.status === 'Scheduled' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                        {n.status}
                      </span>
                      {user.role === UserRole.SITE_ADMIN && n.companyId && (
                        <span className="text-gray-700 font-medium">
                          {companies.find(c => c.id === n.companyId)?.name || 'Unknown Company'}
                        </span>
                      )}
                      <span>
                        {n.status === 'Scheduled' && n.scheduledAt
                          ? `Scheduled for: ${new Date(n.scheduledAt).toLocaleString()}`
                          : n.status === 'Sent' && n.sentAt
                            ? `Sent: ${new Date(n.sentAt).toLocaleString()}`
                            : `Updated: ${new Date(n.updatedAt).toLocaleDateString()}`}
                      </span>
                      {n.stats && (
                        <>
                          <span className="flex items-center text-gray-400">
                            <BarChart3 className="w-3 h-3 mr-1" />
                            {n.stats.opened} opens
                          </span>
                          {n.status === 'Sent' && n.stats.bounced > 0 && (
                            <span className="flex items-center text-red-600">
                              <AlertCircle className="w-3 h-3 mr-1" />
                              {n.stats.bounced} bounced
                            </span>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEditNewsletter(n);
                      }}
                      className="text-sm font-medium text-blue-600 hover:text-blue-800 px-3 py-1 rounded-md hover:bg-blue-50 transition-colors"
                    >
                      {n.status === NewsletterStatus.SENT ? 'View' : 'Edit'}
                    </button>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDuplicateNewsletter(n);
                      }}
                      className="p-1 text-gray-400 hover:text-blue-600 rounded-md hover:bg-blue-50 transition-colors"
                      title="Duplicate"
                    >
                      <Copy className="w-4 h-4" />
                    </button>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDownloadHTML(n);
                      }}
                      className="p-1 text-gray-400 hover:text-blue-600 rounded-md hover:bg-blue-50 transition-colors"
                      title="Download HTML"
                    >
                      <FileCode className="w-4 h-4" />
                    </button>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDownloadPDF(n);
                      }}
                      className="p-1 text-gray-400 hover:text-blue-600 rounded-md hover:bg-blue-50 transition-colors"
                      title="Download PDF"
                    >
                      <FileText className="w-4 h-4" />
                    </button>

                    <button
                      onClick={(e) => handleDeleteNewsletter(e, n)}
                      className="p-1 text-gray-400 hover:text-red-600 rounded-md hover:bg-red-50 transition-colors"
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4" />
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
        // Calculate dashboard metrics
        const scheduledNewsletters = newsletters.filter(n => n.status === NewsletterStatus.SCHEDULED);
        const recentDrafts = newsletters
          .filter(n => n.status === NewsletterStatus.DRAFT)
          .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
          .slice(0, 5);

        const lastSentNewsletter = newsletters
          .filter(n => n.status === NewsletterStatus.SENT)
          .sort((a, b) => new Date(b.sentAt || 0).getTime() - new Date(a.sentAt || 0).getTime())[0];

        const sentThisMonth = newsletters.filter(n => {
          if (n.status !== NewsletterStatus.SENT || !n.sentAt) return false;
          const sentDate = new Date(n.sentAt);
          const now = new Date();
          return sentDate.getMonth() === now.getMonth() && sentDate.getFullYear() === now.getFullYear();
        }).length;

        return (
          <div className="space-y-8">
            {/* Welcome Banner */}
            <div className="bg-gradient-to-r from-blue-700 to-indigo-800 rounded-2xl p-8 text-white shadow-lg relative overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-white opacity-5 rounded-full -mr-16 -mt-16 blur-3xl"></div>
              <div className="absolute bottom-0 left-0 w-48 h-48 bg-blue-400 opacity-10 rounded-full -ml-10 -mb-10 blur-2xl"></div>

              <div className="relative z-10">
                <div className="flex items-center mb-2">
                  <h1 className="text-3xl font-bold mr-4">Welcome back, {user.name}!</h1>
                  {company && (
                    <span className="bg-white bg-opacity-20 px-3 py-1 rounded-full text-sm font-medium border border-white border-opacity-20">
                      {company.name}
                    </span>
                  )}
                </div>
                <p className="text-blue-100 mb-8 max-w-2xl text-lg">
                  {scheduledNewsletters.length > 0
                    ? `You have ${scheduledNewsletters.length} scheduled newsletter${scheduledNewsletters.length === 1 ? '' : 's'} coming up.`
                    : "You're all caught up! No newsletters are currently scheduled."}
                </p>

                <div className="flex flex-wrap gap-4">
                  <button
                    onClick={() => handleEditNewsletter()}
                    className="bg-white text-blue-700 px-6 py-3 rounded-xl font-semibold hover:bg-blue-50 transition-colors shadow-md flex items-center"
                  >
                    <PenTool className="w-5 h-5 mr-2" />
                    Draft New Newsletter
                  </button>
                  {(user.role === UserRole.SITE_ADMIN || user.role === UserRole.COMPANY_ADMIN) && (
                    <button
                      onClick={() => setActiveTab('admin')}
                      className="bg-blue-600 bg-opacity-40 text-white px-6 py-3 rounded-xl font-semibold hover:bg-opacity-50 transition-colors backdrop-blur-sm flex items-center border border-blue-400 border-opacity-30"
                    >
                      <Users className="w-5 h-5 mr-2" />
                      Manage {user.role === UserRole.SITE_ADMIN ? 'System' : 'Company'}
                    </button>
                  )}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Left Column: Needs Attention */}
              <div className="lg:col-span-2 space-y-8">
                {/* Scheduled Section */}
                {scheduledNewsletters.length > 0 && (
                  <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                    <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-yellow-50">
                      <h3 className="font-bold text-gray-800 flex items-center">
                        <Calendar className="w-5 h-5 mr-2 text-yellow-600" />
                        Scheduled & Upcoming
                      </h3>
                      <span className="bg-yellow-100 text-yellow-800 text-xs font-bold px-2 py-1 rounded-full">
                        {scheduledNewsletters.length} Pending
                      </span>
                    </div>
                    <div className="divide-y divide-gray-100">
                      {scheduledNewsletters.map(n => (
                        <div key={n.id} className="p-5 hover:bg-gray-50 transition-colors flex justify-between items-center group">
                          <div>
                            <h4 className="font-semibold text-gray-800 mb-1">{n.subject}</h4>
                            <p className="text-sm text-gray-500 flex items-center">
                              Scheduled for {new Date(n.scheduledAt || '').toLocaleString()}
                            </p>
                          </div>
                          <button
                            onClick={() => handleEditNewsletter(n)}
                            className="text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity font-medium text-sm"
                          >
                            Edit
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Recent Drafts */}
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                  <div className="p-6 border-b border-gray-100 flex justify-between items-center">
                    <h3 className="font-bold text-gray-800 flex items-center">
                      <FileText className="w-5 h-5 mr-2 text-gray-500" />
                      Recent Drafts
                    </h3>
                    <button
                      onClick={() => setActiveTab('newsletters')}
                      className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                    >
                      View All
                    </button>
                  </div>

                  {recentDrafts.length > 0 ? (
                    <div className="divide-y divide-gray-100">
                      {recentDrafts.map(n => (
                        <div
                          key={n.id}
                          onClick={() => handleEditNewsletter(n)}
                          className="p-5 hover:bg-gray-50 transition-colors cursor-pointer group"
                        >
                          <div className="flex justify-between items-start">
                            <div>
                              <h4 className="font-semibold text-gray-800 mb-1 group-hover:text-blue-600 transition-colors">
                                {n.subject || '(Untitled Draft)'}
                              </h4>
                              <p className="text-sm text-gray-500">
                                Last updated {new Date(n.updatedAt).toLocaleDateString()}
                              </p>
                            </div>
                            <div className="bg-gray-100 p-2 rounded-lg group-hover:bg-blue-50 transition-colors">
                              <PenTool className="w-4 h-4 text-gray-400 group-hover:text-blue-600" />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-8 text-center text-gray-500">
                      <p>No active drafts. Start something new!</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Right Column: Performance & Stats */}
              <div className="space-y-8">
                {/* Last Sent Performance */}
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                  <div className="p-6 border-b border-gray-100 bg-green-50">
                    <h3 className="font-bold text-gray-800 flex items-center">
                      <BarChart3 className="w-5 h-5 mr-2 text-green-600" />
                      Recent Performance
                    </h3>
                  </div>

                  {lastSentNewsletter ? (
                    <div className="p-6">
                      <div className="mb-6">
                        <span className="text-xs font-semibold tracking-wide text-gray-400 uppercase">Last Sent</span>
                        <h4 className="text-lg font-bold text-gray-900 mt-1 line-clamp-2" title={lastSentNewsletter.subject}>
                          {lastSentNewsletter.subject}
                        </h4>
                        <p className="text-sm text-gray-500 mt-1">
                          {new Date(lastSentNewsletter.sentAt || '').toLocaleDateString()}
                        </p>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="bg-gray-50 p-4 rounded-xl text-center">
                          <div className="text-2xl font-bold text-blue-600">
                            {lastSentNewsletter.stats?.opened || 0}
                          </div>
                          <div className="text-xs text-gray-500 font-medium uppercase mt-1">Opens</div>
                        </div>
                        <div className="bg-gray-50 p-4 rounded-xl text-center">
                          <div className="text-2xl font-bold text-indigo-600">
                            {lastSentNewsletter.stats?.clicked || 0}
                          </div>
                          <div className="text-xs text-gray-500 font-medium uppercase mt-1">Clicks</div>
                        </div>
                      </div>

                      <button
                        onClick={() => setActiveTab('analytics')}
                        className="w-full mt-6 py-2 text-sm text-gray-600 hover:text-gray-900 font-medium border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                      >
                        View Full Analytics
                      </button>
                    </div>
                  ) : (
                    <div className="p-8 text-center text-gray-500">
                      <p>No sent newsletters yet.</p>
                    </div>
                  )}
                </div>

                {/* Quick Stats Grid */}
                <div className="grid grid-cols-1 gap-4">
                  <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-500 font-medium">Total Subscribers</p>
                      <p className="text-2xl font-bold text-gray-900">{totalRecipients.toLocaleString()}</p>
                    </div>
                    <div className="bg-blue-50 p-3 rounded-lg">
                      <Users className="w-6 h-6 text-blue-600" />
                    </div>
                  </div>

                  <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-500 font-medium">Sent This Month</p>
                      <p className="text-2xl font-bold text-gray-900">{sentThisMonth}</p>
                    </div>
                    <div className="bg-green-50 p-3 rounded-lg">
                      <Mail className="w-6 h-6 text-green-600" />
                    </div>
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