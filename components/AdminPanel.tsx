import React, { useState, useEffect, useMemo } from 'react';
import { User, UserRole, AuditLogEntry, Category, RecipientGroup, Recipient, AuditCategory, AuditSeverity, Company, NewsletterTemplateConfig, NewsletterTemplate, NewsletterTone } from '../types';
import { api } from '../services';
import { Plus, Trash2, Edit, Download, X, Upload, Users as UsersIcon, List, Copy, Check, FileText, Link as LinkIcon } from 'lucide-react';
import { BounceReport } from './BounceReport';

interface AdminPanelProps {
  currentUser: User;
}

export const AdminPanel: React.FC<AdminPanelProps> = ({ currentUser }) => {
  const isSiteAdmin = currentUser.role === UserRole.SITE_ADMIN;

  const [activeTab, setActiveTab] = useState<'users' | 'audit' | 'bounces' | 'categories' | 'templates' | 'groups' | 'companies' | 'companyProfile'>(
    isSiteAdmin ? 'companies' : currentUser.role === UserRole.COMPANY_ADMIN ? 'companyProfile' : 'categories'
  );
  const [users, setUsers] = useState<User[]>([]);
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [templates, setTemplates] = useState<NewsletterTemplateConfig[]>([]);
  const [groups, setGroups] = useState<RecipientGroup[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [currentCompany, setCurrentCompany] = useState<Company | undefined>(undefined);
  const [companyNewsletters, setCompanyNewsletters] = useState<any[]>([]);

  // Users tab filter/sort state
  const [usersSearch, setUsersSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<UserRole[]>([]);
  const [companyFilter, setCompanyFilter] = useState<string>('all'); // 'all', 'unassigned', or companyId
  const [usersSortBy, setUsersSortBy] = useState<'name' | 'email' | 'role'>('name');
  const [usersSortDir, setUsersSortDir] = useState<'asc' | 'desc'>('asc');

  // Audit Log tab filter/sort state
  const [auditSearch, setAuditSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<AuditCategory[]>([]);
  const [severityFilter, setSeverityFilter] = useState<AuditSeverity[]>([]);
  const [dateFilter, setDateFilter] = useState<'all' | 'today' | '7d' | '30d'>('all');
  const [auditSortBy, setAuditSortBy] = useState<'timestamp' | 'action' | 'userName' | 'severity' | 'category'>('timestamp');
  const [auditSortDir, setAuditSortDir] = useState<'asc' | 'desc'>('desc');

  // Categories tab filter/sort state
  const [categoriesSearch, setCategoriesSearch] = useState('');
  const [categoriesSortBy, setCategoriesSortBy] = useState<'name' | 'count'>('name');
  const [categoriesSortDir, setCategoriesSortDir] = useState<'asc' | 'desc'>('asc');

  // Groups tab filter/sort state
  const [groupsSearch, setGroupsSearch] = useState('');
  const [groupsSortBy, setGroupsSortBy] = useState<'name' | 'recipientCount'>('name');
  const [groupsSortDir, setGroupsSortDir] = useState<'asc' | 'desc'>('asc');

  // Templates tab filter/sort state
  const [templatesSearch, setTemplatesSearch] = useState('');
  const [templatesSortBy, setTemplatesSortBy] = useState<'name' | 'baseTemplate'>('name');
  const [templatesSortDir, setTemplatesSortDir] = useState<'asc' | 'desc'>('asc');

  // Modals State
  const [showUserModal, setShowUserModal] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [showGroupModal, setShowGroupModal] = useState(false);
  const [showRecipientModal, setShowRecipientModal] = useState(false);
  const [showCompanyModal, setShowCompanyModal] = useState(false);

  // Form Data
  const [userData, setUserData] = useState<Partial<User>>({ role: UserRole.NEWSLETTER_ADMIN, name: '', email: '' });
  const [companyData, setCompanyData] = useState<Partial<Company>>({ name: '', logoUrl: '' });
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [categoryName, setCategoryName] = useState('');
  const [templateData, setTemplateData] = useState<Partial<NewsletterTemplateConfig>>({
    name: '',
    htmlTemplate: '',
    includeImages: true,
    categoryIds: [],
  });
  const [groupName, setGroupName] = useState('');
  const [selectedGroup, setSelectedGroup] = useState<RecipientGroup | null>(null);
  const [recipientData, setRecipientData] = useState({ email: '', firstName: '', lastName: '' });
  const [editingRecipient, setEditingRecipient] = useState<Recipient | null>(null);
  const [editData, setEditData] = useState<Partial<Recipient>>({});

  const loadData = async () => {
    if (activeTab === 'users' && (isSiteAdmin || currentUser.role === UserRole.COMPANY_ADMIN)) {
      setUsers(await api.getUsers(isSiteAdmin ? undefined : currentUser.companyId));
      // Load companies for Site Admin to show company names and enable filtering
      if (isSiteAdmin) setCompanies(await api.getCompanies());
    }
    if (activeTab === 'audit' && (isSiteAdmin || currentUser.role === UserRole.COMPANY_ADMIN)) setLogs(await api.getAuditLogs(isSiteAdmin ? undefined : currentUser.companyId));
    if (activeTab === 'categories') setCategories(await api.getCategories(isSiteAdmin ? undefined : currentUser.companyId));
    if (activeTab === 'templates') setTemplates(await api.getTemplateConfigs(isSiteAdmin ? undefined : currentUser.companyId));
    if (activeTab === 'groups') setGroups(await api.getGroups(isSiteAdmin ? undefined : currentUser.companyId));
    if (activeTab === 'companies' && isSiteAdmin) setCompanies(await api.getCompanies());
    if (activeTab === 'companyProfile' && currentUser.companyId) {
      const company = await api.getCompany(currentUser.companyId);
      setCurrentCompany(company);
      const newsletters = await api.getNewsletters(currentUser.companyId);
      setCompanyNewsletters(newsletters);
      setCategories(await api.getCategories(currentUser.companyId));
      setGroups(await api.getGroups(currentUser.companyId));
    }
  };

  useEffect(() => {
    loadData();
  }, [activeTab, isSiteAdmin]);

  // Filtered and sorted data for each tab
  const filteredAndSortedUsers = useMemo(() => {
    let result = [...users];

    // Apply search filter
    if (usersSearch.trim()) {
      const searchLower = usersSearch.toLowerCase();
      result = result.filter(u =>
        u.name.toLowerCase().includes(searchLower) ||
        u.email.toLowerCase().includes(searchLower)
      );
    }

    // Apply role filter
    if (roleFilter.length > 0) {
      result = result.filter(u => roleFilter.includes(u.role));
    }

    // Apply company filter
    if (companyFilter !== 'all') {
      if (companyFilter === 'unassigned') {
        result = result.filter(u => !u.companyId);
      } else {
        result = result.filter(u => u.companyId === companyFilter);
      }
    }

    // Apply sorting
    result.sort((a, b) => {
      let compareValue = 0;
      switch (usersSortBy) {
        case 'name':
          compareValue = a.name.localeCompare(b.name);
          break;
        case 'email':
          compareValue = a.email.localeCompare(b.email);
          break;
        case 'role':
          compareValue = a.role.localeCompare(b.role);
          break;
      }
      return usersSortDir === 'asc' ? compareValue : -compareValue;
    });

    return result;
  }, [users, usersSearch, roleFilter, companyFilter, usersSortBy, usersSortDir]);

  const filteredAndSortedLogs = useMemo(() => {
    let result = [...logs];

    // Apply search filter
    if (auditSearch.trim()) {
      const searchLower = auditSearch.toLowerCase();
      result = result.filter(l =>
        l.action.toLowerCase().includes(searchLower) ||
        l.userName.toLowerCase().includes(searchLower) ||
        (l.target && l.target.toLowerCase().includes(searchLower)) ||
        (l.targetName && l.targetName.toLowerCase().includes(searchLower))
      );
    }

    // Apply category filter
    if (categoryFilter.length > 0) {
      result = result.filter(l => categoryFilter.includes(l.category));
    }

    // Apply severity filter
    if (severityFilter.length > 0) {
      result = result.filter(l => severityFilter.includes(l.severity));
    }

    // Apply date filter
    if (dateFilter !== 'all') {
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

      result = result.filter(l => {
        const logDate = new Date(l.timestamp);

        switch (dateFilter) {
          case 'today':
            return logDate >= today;
          case '7d':
            const sevenDaysAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
            return logDate >= sevenDaysAgo;
          case '30d':
            const thirtyDaysAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
            return logDate >= thirtyDaysAgo;
          default:
            return true;
        }
      });
    }

    // Apply sorting
    result.sort((a, b) => {
      let compareValue = 0;
      switch (auditSortBy) {
        case 'timestamp':
          compareValue = new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime();
          break;
        case 'action':
          compareValue = a.action.localeCompare(b.action);
          break;
        case 'userName':
          compareValue = a.userName.localeCompare(b.userName);
          break;
        case 'severity':
          const severityOrder = { 'CRITICAL': 0, 'ERROR': 1, 'WARNING': 2, 'INFO': 3 };
          compareValue = (severityOrder[a.severity] || 999) - (severityOrder[b.severity] || 999);
          break;
        case 'category':
          compareValue = a.category.localeCompare(b.category);
          break;
      }
      return auditSortDir === 'asc' ? compareValue : -compareValue;
    });

    return result;
  }, [logs, auditSearch, categoryFilter, severityFilter, dateFilter, auditSortBy, auditSortDir]);

  const filteredAndSortedCategories = useMemo(() => {
    let result = [...categories];

    // Apply search filter
    if (categoriesSearch.trim()) {
      const searchLower = categoriesSearch.toLowerCase();
      result = result.filter(c => c.name.toLowerCase().includes(searchLower));
    }

    // Apply sorting
    result.sort((a, b) => {
      let compareValue = 0;
      switch (categoriesSortBy) {
        case 'name':
          compareValue = a.name.localeCompare(b.name);
          break;
        case 'count':
          compareValue = a.count - b.count;
          break;
      }
      return categoriesSortDir === 'asc' ? compareValue : -compareValue;
    });

    return result;
  }, [categories, categoriesSearch, categoriesSortBy, categoriesSortDir]);

  const filteredAndSortedGroups = useMemo(() => {
    let result = [...groups];

    // Apply search filter
    if (groupsSearch.trim()) {
      const searchLower = groupsSearch.toLowerCase();
      result = result.filter(g => g.name.toLowerCase().includes(searchLower));
    }

    // Apply sorting
    result.sort((a, b) => {
      let compareValue = 0;
      switch (groupsSortBy) {
        case 'name':
          compareValue = a.name.localeCompare(b.name);
          break;
        case 'recipientCount':
          compareValue = a.recipientCount - b.recipientCount;
          break;
      }
      return groupsSortDir === 'asc' ? compareValue : -compareValue;
    });

    return result;
  }, [groups, groupsSearch, groupsSortBy, groupsSortDir]);

  // User Actions
  const handleSaveUser = async () => {
    if (userData.id) {
      await api.updateUser(userData.id, userData);
    } else {
      // If Company Admin, force companyId
      if (currentUser.role === UserRole.COMPANY_ADMIN) {
        userData.companyId = currentUser.companyId;
      }
      await api.addUser(userData as User);
    }
    setShowUserModal(false);
    loadData();
  };

  const handleDeleteUser = async (id: string) => {
    if (confirm('Are you sure?')) {
      await api.deleteUser(id);
      loadData();
    }
  };

  // Company Actions
  const handleSaveCompany = async () => {
    if (companyData.id) {
      await api.updateCompany(companyData.id, companyData);
    } else {
      if (!companyData.name) return;
      await api.createCompany(companyData.name, companyData.logoUrl);
    }
    setShowCompanyModal(false);
    loadData();
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !e.target.files[0]) return;

    const file = e.target.files[0];
    // Basic validation
    if (!file.type.startsWith('image/')) {
      alert('Please upload an image file');
      return;
    }

    if (file.size > 5 * 1024 * 1024) { // 5MB limit
      alert('File size must be less than 5MB');
      return;
    }

    try {
      setUploadingLogo(true);
      // We need a company ID to associate the media with, but for new companies we might not have one yet.
      // For now, we'll use 'temp' or the current user's company ID if available, 
      // or just a placeholder since the media collection rules might require it.
      // However, our simplified rules allow any authenticated user to upload.
      const companyId = companyData.id || currentUser.companyId || 'temp_logo_upload';

      const mediaItem = await api.uploadMedia(file, companyId);
      setCompanyData(prev => ({ ...prev, logoUrl: mediaItem.url }));
    } catch (error) {
      console.error('Error uploading logo:', error);
      alert('Failed to upload logo');
    } finally {
      setUploadingLogo(false);
    }
  };

  // Category Actions
  const handleAddCategory = async () => {
    if (!categoryName) return;
    if (!currentUser.companyId) {
      alert("You must belong to a company to create categories.");
      return;
    }
    await api.addCategory(categoryName, currentUser.companyId);
    setCategoryName('');
    setShowCategoryModal(false);
    loadData();
  };

  const handleDeleteCategory = async (id: string) => {
    if (confirm('Delete this category?')) {
      await api.deleteCategory(id);
      loadData();
    }
  };

  const handleRecalculateCounts = async () => {
    if (confirm('Recalculate all category counts based on actual newsletter data?')) {
      const result = await api.recalculateCategoryCounts();
      alert(`Successfully updated ${result.updated} categories.\n\nCounts:\n${Object.entries(result.categories).map(([id, count]) => `${id}: ${count}`).join('\n')}`);
      loadData();
    }
  };

  // Group Actions
  const handleAddGroup = async () => {
    if (!groupName) return;
    if (!currentUser.companyId) {
      alert("You must belong to a company to create groups.");
      return;
    }
    await api.addGroup(groupName, currentUser.companyId);
    setGroupName('');
    setShowGroupModal(false);
    loadData();
  };

  const handleDeleteGroup = async (id: string) => {
    if (confirm('Delete this group?')) {
      await api.deleteGroup(id);
      loadData();
    }
  };

  const handleDuplicateGroup = async (id: string) => {
    if (confirm('Duplicate this group with all recipients?')) {
      await api.duplicateGroup(id);
      loadData();
    }
  };

  const handleAddRecipient = async () => {
    if (!selectedGroup || !recipientData.email) return;

    // Check if email is unsubscribed
    const isUnsubscribed = await api.isUnsubscribed(recipientData.email);
    if (isUnsubscribed) {
      alert(`Cannot add ${recipientData.email} - this email is unsubscribed.`);
      return;
    }

    await api.addRecipient(selectedGroup.id, recipientData);
    setRecipientData({ email: '', firstName: '', lastName: '' });
    // Refresh groups to get updated count, ideally we'd fetch just the group
    const groups = await api.getGroups(isSiteAdmin ? undefined : currentUser.companyId);
    setGroups(groups);
    setSelectedGroup(groups.find(g => g.id === selectedGroup.id) || null);
  };

  const handleCSVImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !e.target.files[0] || !selectedGroup) return;

    const file = e.target.files[0];
    const reader = new FileReader();

    reader.onload = async (event) => {
      const text = event.target?.result as string;
      if (!text) return;

      const lines = text.split(/\r\n|\n/).filter(line => line.trim() !== '');
      if (lines.length < 2) {
        alert("CSV file is empty or missing headers");
        return;
      }

      // Validate Headers
      // Remove potential BOM and surrounding quotes
      const headers = lines[0].replace(/^\uFEFF/, '').split(',').map(h => h.trim().replace(/^"|"$/g, ''));

      // Determine indices (case-insensitive)
      const emailIdx = headers.findIndex(h => h.toLowerCase() === 'email');
      const firstNameIdx = headers.findIndex(h => h.toLowerCase() === 'firstname');
      const lastNameIdx = headers.findIndex(h => h.toLowerCase() === 'lastname');

      if (emailIdx === -1 || firstNameIdx === -1 || lastNameIdx === -1) {
        alert(`Invalid CSV headers. Expected: "Email", "FirstName", "LastName". Found: ${headers.join(', ')}`);
        return;
      }

      let successCount = 0;
      let failCount = 0;
      const errors: string[] = [];

      // Process rows
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i];
        const values = line.split(',').map(v => v.trim());

        if (values.length < headers.length) {
          // Skip incomplete lines
          continue;
        }

        const email = values[emailIdx];
        const firstName = values[firstNameIdx] || '';
        const lastName = values[lastNameIdx] || '';

        // Validate Email Format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (email && emailRegex.test(email)) {
          try {
            // Check if email is unsubscribed
            const isUnsubscribed = await api.isUnsubscribed(email);
            if (isUnsubscribed) {
              failCount++;
              errors.push(`Row ${i + 1}: ${email} is unsubscribed`);
              continue;
            }

            await api.addRecipient(selectedGroup.id, { email, firstName, lastName });
            successCount++;
          } catch (err) {
            console.error(err);
            failCount++;
            errors.push(`Row ${i + 1}: Error adding ${email}`);
          }
        } else {
          failCount++;
          errors.push(`Row ${i + 1}: Invalid email format`);
        }
      }

      let msg = `Import completed.\nSuccessfully added: ${successCount}\nFailed: ${failCount}`;
      if (errors.length > 0) {
        msg += `\n\nFirst 5 errors:\n${errors.slice(0, 5).join('\n')}`;
      }
      alert(msg);

      // Refresh data
      const groups = await api.getGroups(isSiteAdmin ? undefined : currentUser.companyId);
      setGroups(groups);

      // Update selected group view
      const updatedGroup = groups.find(g => g.id === selectedGroup.id);
      if (updatedGroup) setSelectedGroup(updatedGroup);

      // Reset file input
      e.target.value = '';
    };

    reader.onerror = () => {
      alert("Failed to read file");
    };

    reader.readAsText(file);
  };

  const handleDeleteRecipient = async (recipientId: string) => {
    if (!selectedGroup || !confirm('Delete this recipient?')) return;
    await api.deleteRecipient(selectedGroup.id, recipientId);
    // Refresh groups
    const groups = await api.getGroups(isSiteAdmin ? undefined : currentUser.companyId);
    setGroups(groups);
    setSelectedGroup(groups.find(g => g.id === selectedGroup.id) || null);
  };

  const handleEditRecipient = (recipient: Recipient) => {
    setEditingRecipient(recipient);
    setEditData({
      email: recipient.email,
      firstName: recipient.firstName,
      lastName: recipient.lastName,
    });
  };

  const handleSaveRecipient = async () => {
    if (!selectedGroup || !editingRecipient) return;
    await api.updateRecipient(selectedGroup.id, editingRecipient.id, editData);
    // Refresh groups
    const groups = await api.getGroups(isSiteAdmin ? undefined : currentUser.companyId);
    setGroups(groups);
    setSelectedGroup(groups.find(g => g.id === selectedGroup.id) || null);
    setEditingRecipient(null);
    setEditData({});
  };

  const handleCancelEdit = () => {
    setEditingRecipient(null);
    setEditData({});
  };

  const renderTabs = () => {
    return (
      <div className="flex space-x-1 bg-white p-1 rounded-lg border border-gray-200 shadow-sm overflow-x-auto">
        {isSiteAdmin && (
          <button onClick={() => setActiveTab('companies')} className={`px-4 py-2 text-sm font-medium rounded-md whitespace-nowrap ${activeTab === 'companies' ? 'bg-blue-50 text-blue-700' : 'text-gray-600 hover:bg-gray-50'}`}>Companies</button>
        )}
        {currentUser.role === UserRole.COMPANY_ADMIN && (
          <button onClick={() => setActiveTab('companyProfile')} className={`px-4 py-2 text-sm font-medium rounded-md whitespace-nowrap ${activeTab === 'companyProfile' ? 'bg-blue-50 text-blue-700' : 'text-gray-600 hover:bg-gray-50'}`}>Company Profile</button>
        )}
        {(isSiteAdmin || currentUser.role === UserRole.COMPANY_ADMIN) && (
          <>
            <button onClick={() => setActiveTab('users')} className={`px-4 py-2 text-sm font-medium rounded-md whitespace-nowrap ${activeTab === 'users' ? 'bg-blue-50 text-blue-700' : 'text-gray-600 hover:bg-gray-50'}`}>Users</button>
            <button onClick={() => setActiveTab('audit')} className={`px-4 py-2 text-sm font-medium rounded-md whitespace-nowrap ${activeTab === 'audit' ? 'bg-blue-50 text-blue-700' : 'text-gray-600 hover:bg-gray-50'}`}>Audit Log</button>
            <button onClick={() => setActiveTab('bounces')} className={`px-4 py-2 text-sm font-medium rounded-md whitespace-nowrap ${activeTab === 'bounces' ? 'bg-blue-50 text-blue-700' : 'text-gray-600 hover:bg-gray-50'}`}>Bounced Emails</button>
          </>
        )}
        <button onClick={() => setActiveTab('categories')} className={`px-4 py-2 text-sm font-medium rounded-md whitespace-nowrap ${activeTab === 'categories' ? 'bg-blue-50 text-blue-700' : 'text-gray-600 hover:bg-gray-50'}`}>Categories</button>
        <button onClick={() => setActiveTab('templates')} className={`px-4 py-2 text-sm font-medium rounded-md whitespace-nowrap ${activeTab === 'templates' ? 'bg-blue-50 text-blue-700' : 'text-gray-600 hover:bg-gray-50'}`}>Templates</button>
        <button onClick={() => setActiveTab('groups')} className={`px-4 py-2 text-sm font-medium rounded-md whitespace-nowrap ${activeTab === 'groups' ? 'bg-blue-50 text-blue-700' : 'text-gray-600 hover:bg-gray-50'}`}>Recipient Groups</button>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Administration</h1>
          <p className="text-gray-500">System management and configuration.</p>
        </div>
        {renderTabs()}
      </div>

      {/* Filter Toolbars */}
      {activeTab === 'users' && (
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
          <div className="flex flex-col sm:flex-row gap-4">
            {/* Search Input */}
            <div className="flex-1">
              <input
                type="text"
                placeholder="🔍 Search by name or email..."
                value={usersSearch}
                onChange={(e) => setUsersSearch(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            {/* Role Filter */}
            <div className="relative">
              <select
                multiple
                value={roleFilter}
                onChange={(e) => setRoleFilter(
                  Array.from(e.target.selectedOptions, (option: HTMLOptionElement) => option.value as UserRole)
                )}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 min-w-[180px] h-10"
                size={1}
              >
                <option value="">All Roles</option>
                {Object.values(UserRole).map(role => (
                  <option key={role} value={role}>{role}</option>
                ))}
              </select>
              {roleFilter.length > 0 && (
                <span className="absolute -top-2 -right-2 bg-blue-600 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                  {roleFilter.length}
                </span>
              )}
            </div>

            {/* Company Filter (Site Admin only) */}
            {isSiteAdmin && (
              <div className="relative">
                <select
                  value={companyFilter}
                  onChange={(e) => setCompanyFilter(e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 min-w-[200px] h-10"
                >
                  <option value="all">All Companies</option>
                  <option value="unassigned">Unassigned</option>
                  {companies.map(company => (
                    <option key={company.id} value={company.id}>{company.name}</option>
                  ))}
                </select>
                {companyFilter !== 'all' && (
                  <span className="absolute -top-2 -right-2 bg-blue-600 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                    1
                  </span>
                )}
              </div>
            )}

            {/* Sort Dropdown */}
            <div className="flex gap-2">
              <select
                value={usersSortBy}
                onChange={(e) => setUsersSortBy(e.target.value as any)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="name">Sort by Name</option>
                <option value="email">Sort by Email</option>
                <option value="role">Sort by Role</option>
              </select>

              <button
                onClick={() => setUsersSortDir(d => d === 'asc' ? 'desc' : 'asc')}
                className="px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                title={usersSortDir === 'asc' ? 'Ascending' : 'Descending'}
              >
                {usersSortDir === 'asc' ? '↑' : '↓'}
              </button>
            </div>

            {/* Clear + Add Button */}
            {(usersSearch || roleFilter.length > 0 || companyFilter !== 'all') && (
              <button
                onClick={() => {
                  setUsersSearch('');
                  setRoleFilter([]);
                  setCompanyFilter('all');
                }}
                className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg whitespace-nowrap"
              >
                Clear Filters
              </button>
            )}

            <button
              onClick={() => { setUserData({ role: UserRole.NEWSLETTER_ADMIN }); setShowUserModal(true); }}
              className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium whitespace-nowrap"
            >
              <Plus className="w-4 h-4 mr-2" /> Add User
            </button>
          </div>

          <p className="text-sm text-gray-600 mt-3">
            Showing {filteredAndSortedUsers.length} of {users.length} users
          </p>
        </div>
      )}

      {activeTab === 'audit' && (
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
          <div className="flex flex-col gap-4">
            {/* Row 1: Search + Category + Severity */}
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <input
                  type="text"
                  placeholder="🔍 Search action, user, or target..."
                  value={auditSearch}
                  onChange={(e) => setAuditSearch(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div className="relative">
                <select
                  multiple
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(
                    Array.from(e.target.selectedOptions, (option: HTMLOptionElement) => option.value as AuditCategory)
                  )}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 min-w-[150px] h-10"
                  size={1}
                >
                  <option value="">All Categories</option>
                  {Object.values(AuditCategory).map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
                {categoryFilter.length > 0 && (
                  <span className="absolute -top-2 -right-2 bg-blue-600 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                    {categoryFilter.length}
                  </span>
                )}
              </div>

              <div className="relative">
                <select
                  multiple
                  value={severityFilter}
                  onChange={(e) => setSeverityFilter(
                    Array.from(e.target.selectedOptions, (option: HTMLOptionElement) => option.value as AuditSeverity)
                  )}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 min-w-[140px] h-10"
                  size={1}
                >
                  <option value="">All Severities</option>
                  <option value="CRITICAL">Critical</option>
                  <option value="ERROR">Error</option>
                  <option value="WARNING">Warning</option>
                  <option value="INFO">Info</option>
                </select>
                {severityFilter.length > 0 && (
                  <span className="absolute -top-2 -right-2 bg-blue-600 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                    {severityFilter.length}
                  </span>
                )}
              </div>
            </div>

            {/* Row 2: Date Filter + Sort + Actions */}
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
              <div className="flex gap-2">
                <button
                  onClick={() => setDateFilter('all')}
                  className={`px-3 py-1.5 text-sm rounded-lg ${dateFilter === 'all' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                >
                  All Time
                </button>
                <button
                  onClick={() => setDateFilter('today')}
                  className={`px-3 py-1.5 text-sm rounded-lg ${dateFilter === 'today' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                >
                  Today
                </button>
                <button
                  onClick={() => setDateFilter('7d')}
                  className={`px-3 py-1.5 text-sm rounded-lg ${dateFilter === '7d' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                >
                  Last 7d
                </button>
                <button
                  onClick={() => setDateFilter('30d')}
                  className={`px-3 py-1.5 text-sm rounded-lg ${dateFilter === '30d' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                >
                  Last 30d
                </button>
              </div>

              <div className="flex gap-2">
                <select
                  value={auditSortBy}
                  onChange={(e) => setAuditSortBy(e.target.value as any)}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="timestamp">Sort by Timestamp</option>
                  <option value="action">Sort by Action</option>
                  <option value="userName">Sort by User</option>
                  <option value="severity">Sort by Severity</option>
                  <option value="category">Sort by Category</option>
                </select>

                <button
                  onClick={() => setAuditSortDir(d => d === 'asc' ? 'desc' : 'asc')}
                  className="px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                  title={auditSortDir === 'asc' ? 'Ascending' : 'Descending'}
                >
                  {auditSortDir === 'asc' ? '↑' : '↓'}
                </button>
              </div>

              {(auditSearch || categoryFilter.length > 0 || severityFilter.length > 0 || dateFilter !== 'all') && (
                <button
                  onClick={() => {
                    setAuditSearch('');
                    setCategoryFilter([]);
                    setSeverityFilter([]);
                    setDateFilter('all');
                  }}
                  className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg whitespace-nowrap"
                >
                  Clear All Filters
                </button>
              )}

              <button className="flex items-center px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 text-sm font-medium ml-auto">
                <Download className="w-4 h-4 mr-2" /> Export
              </button>
            </div>
          </div>

          <p className="text-sm text-gray-600 mt-3">
            Showing {filteredAndSortedLogs.length} of {logs.length} audit logs
          </p>
        </div>
      )}

      {activeTab === 'categories' && (
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <input
                type="text"
                placeholder="🔍 Search categories..."
                value={categoriesSearch}
                onChange={(e) => setCategoriesSearch(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div className="flex gap-2">
              <select
                value={categoriesSortBy}
                onChange={(e) => setCategoriesSortBy(e.target.value as any)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="name">Sort by Name</option>
                <option value="count">Sort by Newsletter Count</option>
              </select>

              <button
                onClick={() => setCategoriesSortDir(d => d === 'asc' ? 'desc' : 'asc')}
                className="px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                title={categoriesSortDir === 'asc' ? 'Ascending' : 'Descending'}
              >
                {categoriesSortDir === 'asc' ? '↑' : '↓'}
              </button>
            </div>

            {categoriesSearch && (
              <button
                onClick={() => setCategoriesSearch('')}
                className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg whitespace-nowrap"
              >
                Clear Search
              </button>
            )}

            <button
              onClick={handleRecalculateCounts}
              className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm font-medium whitespace-nowrap"
              title="Recalculate category counts based on actual newsletter data"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Recalculate Counts
            </button>

            <button
              onClick={() => setShowCategoryModal(true)}
              className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium whitespace-nowrap"
            >
              <Plus className="w-4 h-4 mr-2" /> Add Category
            </button>
          </div>

          <p className="text-sm text-gray-600 mt-3">
            Showing {filteredAndSortedCategories.length} of {categories.length} categories
          </p>
        </div>
      )}

      {activeTab === 'templates' && (
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
          <div className="flex flex-col sm:flex-row gap-4 mb-4">
            <div className="flex-1">
              <input
                type="text"
                placeholder="🔍 Search templates..."
                value={templatesSearch}
                onChange={(e) => setTemplatesSearch(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-md"
              />
            </div>
            <button onClick={() => setShowTemplateModal(true)} className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center gap-2 whitespace-nowrap">
              <Plus className="w-4 h-4" />
              Add Template
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {templates
              .filter(t => t.name.toLowerCase().includes(templatesSearch.toLowerCase()))
              .map((template) => (
                <div key={template.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <FileText className="w-5 h-5 text-blue-600" />
                      <h3 className="font-semibold text-gray-900">{template.name}</h3>
                    </div>
                    <div className="flex gap-1">
                      <button
                        onClick={() => {
                          setTemplateData(template);
                          setShowTemplateModal(true);
                        }}
                        className="text-gray-400 hover:text-blue-600 p-1"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={async () => {
                          if (confirm(`Delete template "${template.name}"?`)) {
                            await api.deleteTemplateConfig(template.id);
                            loadData();
                          }
                        }}
                        className="text-gray-400 hover:text-red-600 p-1"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {template.description && (
                    <p className="text-sm text-gray-600 mb-3">{template.description}</p>
                  )}

                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-500">HTML Template:</span>
                      <span className="font-medium text-gray-900">
                        {template.htmlTemplate ? `${(template.htmlTemplate.length / 1024).toFixed(1)}KB` : 'Not set'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Images:</span>
                      <span className="font-medium text-gray-900">{template.includeImages ? 'Yes' : 'No'}</span>
                    </div>
                    {template.targetAudience && (
                      <div className="flex justify-between">
                        <span className="text-gray-500">Audience:</span>
                        <span className="font-medium text-gray-900 truncate ml-2">{template.targetAudience}</span>
                      </div>
                    )}
                    {template.categoryIds && template.categoryIds.length > 0 && (
                      <div className="pt-2 border-t border-gray-200">
                        <div className="flex items-center gap-1 text-gray-500 mb-1">
                          <LinkIcon className="w-3 h-3" />
                          <span>Linked Categories:</span>
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {template.categoryIds.map(catId => {
                            const category = categories.find(c => c.id === catId);
                            return category ? (
                              <span key={catId} className="text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded">
                                {category.name}
                              </span>
                            ) : null;
                          })}
                        </div>
                      </div>
                    )}
                    {template.isDefault && (
                      <div className="pt-2">
                        <span className="text-xs bg-green-50 text-green-700 px-2 py-1 rounded font-medium">
                          ✓ Default Template
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
          </div>

          {templates.length === 0 && (
            <div className="text-center py-12 text-gray-500">
              <FileText className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p>No templates yet. Create your first template!</p>
            </div>
          )}
        </div>
      )}

      {activeTab === 'groups' && (
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <input
                type="text"
                placeholder="🔍 Search groups..."
                value={groupsSearch}
                onChange={(e) => setGroupsSearch(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div className="flex gap-2">
              <select
                value={groupsSortBy}
                onChange={(e) => setGroupsSortBy(e.target.value as any)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="name">Sort by Name</option>
                <option value="recipientCount">Sort by Recipient Count</option>
              </select>

              <button
                onClick={() => setGroupsSortDir(d => d === 'asc' ? 'desc' : 'asc')}
                className="px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                title={groupsSortDir === 'asc' ? 'Ascending' : 'Descending'}
              >
                {groupsSortDir === 'asc' ? '↑' : '↓'}
              </button>
            </div>

            {groupsSearch && (
              <button
                onClick={() => setGroupsSearch('')}
                className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg whitespace-nowrap"
              >
                Clear Search
              </button>
            )}

            <button
              onClick={() => setShowGroupModal(true)}
              className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium whitespace-nowrap"
            >
              <Plus className="w-4 h-4 mr-2" /> Add Group
            </button>
          </div>

          <p className="text-sm text-gray-600 mt-3">
            Showing {filteredAndSortedGroups.length} of {groups.length} groups
          </p>
        </div>
      )}

      {activeTab === 'companies' && isSiteAdmin && (
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
          <div className="flex justify-between items-center">
            <h3 className="font-bold text-gray-700">Companies</h3>
            <button
              onClick={() => { setCompanyData({}); setShowCompanyModal(true); }}
              className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium whitespace-nowrap"
            >
              <Plus className="w-4 h-4 mr-2" /> Add Company
            </button>
          </div>
          <p className="text-sm text-gray-600 mt-3">
            Showing {companies.length} companies
          </p>
        </div>
      )}

      {/* Tables */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {/* Company Profile Tab */}
        {activeTab === 'companyProfile' && currentCompany && (
          <div className="p-6 space-y-6">
            {/* Company Header */}
            <div className="flex items-start justify-between pb-6 border-b border-gray-200">
              <div className="flex items-center space-x-4">
                {currentCompany.logoUrl ? (
                  <img src={currentCompany.logoUrl} alt={currentCompany.name} className="w-16 h-16 rounded-lg object-cover border border-gray-200" />
                ) : (
                  <div className="w-16 h-16 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-2xl font-bold">
                    {currentCompany.name.charAt(0)}
                  </div>
                )}
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">{currentCompany.name}</h2>
                  <p className="text-sm text-gray-500 mt-1">Created {new Date(currentCompany.createdAt).toLocaleDateString()}</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setCompanyData(currentCompany);
                  setShowCompanyModal(true);
                }}
                className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium"
              >
                <Edit className="w-4 h-4 mr-2" />
                Edit Company
              </button>
            </div>

            {/* Company Details */}
            {(currentCompany.description || currentCompany.website || currentCompany.linkedinUrl || currentCompany.industry || currentCompany.size || currentCompany.location || currentCompany.phone) && (
              <div className="bg-gray-50 rounded-lg p-6 border border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Company Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {currentCompany.description && (
                    <div className="md:col-span-2">
                      <p className="text-sm font-medium text-gray-500 mb-1">Description</p>
                      <p className="text-gray-900">{currentCompany.description}</p>
                    </div>
                  )}

                  {currentCompany.industry && (
                    <div>
                      <p className="text-sm font-medium text-gray-500 mb-1">Industry</p>
                      <p className="text-gray-900">{currentCompany.industry}</p>
                    </div>
                  )}

                  {currentCompany.size && (
                    <div>
                      <p className="text-sm font-medium text-gray-500 mb-1">Company Size</p>
                      <p className="text-gray-900">{currentCompany.size} employees</p>
                    </div>
                  )}

                  {currentCompany.location && (
                    <div>
                      <p className="text-sm font-medium text-gray-500 mb-1">Location</p>
                      <p className="text-gray-900">{currentCompany.location}</p>
                    </div>
                  )}

                  {currentCompany.phone && (
                    <div>
                      <p className="text-sm font-medium text-gray-500 mb-1">Phone</p>
                      <p className="text-gray-900">{currentCompany.phone}</p>
                    </div>
                  )}

                  {currentCompany.website && (
                    <div>
                      <p className="text-sm font-medium text-gray-500 mb-1">Website</p>
                      <a
                        href={currentCompany.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-800 flex items-center"
                      >
                        {currentCompany.website}
                        <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                        </svg>
                      </a>
                    </div>
                  )}

                  {currentCompany.linkedinUrl && (
                    <div>
                      <p className="text-sm font-medium text-gray-500 mb-1">LinkedIn</p>
                      <a
                        href={currentCompany.linkedinUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-800 flex items-center"
                      >
                        View LinkedIn Profile
                        <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                        </svg>
                      </a>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Statistics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-6 rounded-xl border border-blue-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-blue-600">Total Newsletters</p>
                    <p className="text-3xl font-bold text-blue-900 mt-2">{companyNewsletters.length}</p>
                  </div>
                  <div className="w-12 h-12 bg-blue-500 rounded-lg flex items-center justify-center">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-br from-green-50 to-green-100 p-6 rounded-xl border border-green-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-green-600">Recipient Groups</p>
                    <p className="text-3xl font-bold text-green-900 mt-2">{groups.length}</p>
                  </div>
                  <div className="w-12 h-12 bg-green-500 rounded-lg flex items-center justify-center">
                    <UsersIcon className="w-6 h-6 text-white" />
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-6 rounded-xl border border-purple-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-purple-600">Total Recipients</p>
                    <p className="text-3xl font-bold text-purple-900 mt-2">
                      {groups.reduce((acc, g) => acc + g.recipientCount, 0)}
                    </p>
                  </div>
                  <div className="w-12 h-12 bg-purple-500 rounded-lg flex items-center justify-center">
                    <List className="w-6 h-6 text-white" />
                  </div>
                </div>
              </div>
            </div>

            {/* Recent Newsletters */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Recent Newsletters</h3>
                <button
                  onClick={() => setActiveTab('categories')}
                  className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                >
                  View All →
                </button>
              </div>
              <div className="bg-gray-50 rounded-lg border border-gray-200">
                {companyNewsletters.length > 0 ? (
                  <div className="divide-y divide-gray-200">
                    {companyNewsletters.slice(0, 5).map((newsletter) => (
                      <div key={newsletter.id} className="p-4 flex items-center justify-between hover:bg-gray-100 transition-colors">
                        <div>
                          <h4 className="font-medium text-gray-900">{newsletter.subject}</h4>
                          <p className="text-sm text-gray-500 mt-1">
                            {newsletter.status} • Updated {new Date(newsletter.updatedAt).toLocaleDateString()}
                          </p>
                        </div>
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${newsletter.status === 'Sent' ? 'bg-green-100 text-green-800' :
                          newsletter.status === 'Scheduled' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                          {newsletter.status}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-8 text-center text-gray-500">
                    <p>No newsletters yet. Create your first newsletter to get started!</p>
                  </div>
                )}
              </div>
            </div>

            {/* Recipient Groups */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Recipient Groups</h3>
                <button
                  onClick={() => setActiveTab('groups')}
                  className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                >
                  Manage Groups →
                </button>
              </div>
              <div className="bg-gray-50 rounded-lg border border-gray-200">
                {groups.length > 0 ? (
                  <div className="divide-y divide-gray-200">
                    {groups.slice(0, 5).map((group) => (
                      <div key={group.id} className="p-4 flex items-center justify-between hover:bg-gray-100 transition-colors">
                        <div>
                          <h4 className="font-medium text-gray-900">{group.name}</h4>
                          <p className="text-sm text-gray-500 mt-1">{group.recipientCount} recipients</p>
                        </div>
                        <button
                          onClick={() => {
                            setSelectedGroup(group);
                            setShowRecipientModal(true);
                          }}
                          className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                        >
                          Manage
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-8 text-center text-gray-500">
                    <p>No recipient groups yet. Create a group to start managing recipients!</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'companies' && isSiteAdmin && (
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 font-medium text-gray-500">Company Name</th>
                <th className="px-6 py-3 font-medium text-gray-500">Logo</th>
                <th className="px-6 py-3 font-medium text-gray-500 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {companies.map(company => (
                <tr key={company.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 font-medium text-gray-900">{company.name}</td>
                  <td className="px-6 py-4">
                    {company.logoUrl ? (
                      <img src={company.logoUrl} alt={company.name} className="h-8 w-auto object-contain" />
                    ) : (
                      <span className="text-gray-400 text-xs">No Logo</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-right space-x-2">
                    <button onClick={() => { setCompanyData(company); setShowCompanyModal(true); }} className="text-gray-400 hover:text-blue-600"><Edit className="w-4 h-4" /></button>
                    {/* <button onClick={() => handleDeleteCompany(company.id)} className="text-gray-400 hover:text-red-600"><Trash2 className="w-4 h-4" /></button> */}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {activeTab === 'users' && (
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 font-medium text-gray-500">User</th>
                {isSiteAdmin && <th className="px-6 py-3 font-medium text-gray-500">Company</th>}
                <th className="px-6 py-3 font-medium text-gray-500">Role</th>
                <th className="px-6 py-3 font-medium text-gray-500 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredAndSortedUsers.map(user => (
                <tr key={user.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div className="flex items-center">
                      <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold mr-3">
                        {user.name.charAt(0)}
                      </div>
                      <div>
                        <div className="font-medium text-gray-900">{user.name}</div>
                        <div className="text-gray-500 text-xs">{user.email}</div>
                      </div>
                    </div>
                  </td>
                  {isSiteAdmin && (
                    <td className="px-6 py-4">
                      {user.role === UserRole.SITE_ADMIN ? (
                        <span className="text-gray-400 text-sm">-</span>
                      ) : user.companyId ? (
                        <span className="text-gray-700 text-sm">
                          {companies.find(c => c.id === user.companyId)?.name || 'Unknown Company'}
                        </span>
                      ) : (
                        <span className="text-gray-400 text-sm italic">No Company</span>
                      )}
                    </td>
                  )}
                  <td className="px-6 py-4">
                    <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${user.role === UserRole.SITE_ADMIN ? 'bg-purple-100 text-purple-800' : user.role === UserRole.NEWSLETTER_ADMIN ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'}`}>
                      {user.role}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right space-x-2">
                    <button onClick={() => { setUserData(user); setShowUserModal(true); }} className="text-gray-400 hover:text-blue-600"><Edit className="w-4 h-4" /></button>
                    <button onClick={() => handleDeleteUser(user.id)} className="text-gray-400 hover:text-red-600"><Trash2 className="w-4 h-4" /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {activeTab === 'categories' && (
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 font-medium text-gray-500">Name</th>
                <th className="px-6 py-3 font-medium text-gray-500">Newsletters</th>
                <th className="px-6 py-3 font-medium text-gray-500 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredAndSortedCategories.map(cat => (
                <tr key={cat.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 font-medium text-gray-900">{cat.name}</td>
                  <td className="px-6 py-4 text-gray-500">{cat.count} linked</td>
                  <td className="px-6 py-4 text-right">
                    <button onClick={() => handleDeleteCategory(cat.id)} className="text-gray-400 hover:text-red-600"><Trash2 className="w-4 h-4" /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {activeTab === 'groups' && (
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 font-medium text-gray-500">Group Name</th>
                <th className="px-6 py-3 font-medium text-gray-500">Recipients</th>
                <th className="px-6 py-3 font-medium text-gray-500 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredAndSortedGroups.map(g => (
                <tr key={g.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 font-medium text-gray-900">{g.name}</td>
                  <td className="px-6 py-4 text-gray-500">{g.recipientCount} members</td>
                  <td className="px-6 py-4 text-right space-x-2">
                    <button onClick={() => { setSelectedGroup(g); setShowRecipientModal(true); }} className="text-blue-600 hover:text-blue-800 text-xs font-medium mr-2">Manage Recipients</button>
                    <button onClick={() => handleDuplicateGroup(g.id)} className="text-gray-400 hover:text-blue-600" title="Duplicate group"><Copy className="w-4 h-4" /></button>
                    <button onClick={() => handleDeleteGroup(g.id)} className="text-gray-400 hover:text-red-600" title="Delete group"><Trash2 className="w-4 h-4" /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {activeTab === 'audit' && (
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 font-medium text-gray-500">Timestamp</th>
                <th className="px-6 py-3 font-medium text-gray-500">Action</th>
                <th className="px-6 py-3 font-medium text-gray-500">User</th>
                <th className="px-6 py-3 font-medium text-gray-500">Target</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredAndSortedLogs.map(log => (
                <tr key={log.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-gray-500 font-mono text-xs">{new Date(log.timestamp).toLocaleString()}</td>
                  <td className="px-6 py-4"><span className="bg-gray-100 text-gray-800 text-xs px-2 py-1 rounded-md border border-gray-200">{log.action}</span></td>
                  <td className="px-6 py-4 font-medium">{log.userName}</td>
                  <td className="px-6 py-4 text-gray-600">{log.target}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Bounced Emails Tab */}
      {activeTab === 'bounces' && <BounceReport companyId={isSiteAdmin ? undefined : currentUser.companyId} />}

      {/* Modals */}

      {/* User Modal */}
      {showUserModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
            <h3 className="text-lg font-bold mb-4">{userData.id ? 'Edit User' : 'Create User'}</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Full Name</label>
                <input type="text" value={userData.name} onChange={e => setUserData({ ...userData, name: e.target.value })} className="w-full mt-1 border border-gray-300 rounded-md p-2" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Email Address</label>
                <input type="email" value={userData.email} onChange={e => setUserData({ ...userData, email: e.target.value })} className="w-full mt-1 border border-gray-300 rounded-md p-2" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Role</label>
                <select value={userData.role} onChange={e => setUserData({ ...userData, role: e.target.value as UserRole })} className="w-full mt-1 border border-gray-300 rounded-md p-2 bg-white">
                  {Object.values(UserRole).map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
              {isSiteAdmin && (
                <div>
                  <label className="block text-sm font-medium text-gray-700">Company</label>
                  <select
                    value={userData.companyId || ''}
                    onChange={e => setUserData({ ...userData, companyId: e.target.value || undefined })}
                    className="w-full mt-1 border border-gray-300 rounded-md p-2 bg-white"
                  >
                    <option value="">No Company (Global/Site Admin)</option>
                    {companies.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>
            <div className="mt-6 flex justify-end space-x-3">
              <button onClick={() => setShowUserModal(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-md">Cancel</button>
              <button onClick={handleSaveUser} className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">Save User</button>
            </div>
          </div>
        </div>
      )}

      {/* Company Modal */}
      {showCompanyModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl p-6 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-bold mb-6">{companyData.id ? 'Edit Company' : 'Create Company'}</h3>

            {/* Basic Information */}
            <div className="space-y-4 mb-6">
              <h4 className="text-sm font-semibold text-gray-700 uppercase border-b pb-2">Basic Information</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Company Name *</label>
                  <input
                    type="text"
                    value={companyData.name || ''}
                    onChange={e => setCompanyData({ ...companyData, name: e.target.value })}
                    className="w-full mt-1 border border-gray-300 rounded-md p-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Industry</label>
                  <input
                    type="text"
                    value={companyData.industry || ''}
                    onChange={e => setCompanyData({ ...companyData, industry: e.target.value })}
                    className="w-full mt-1 border border-gray-300 rounded-md p-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="e.g., Technology, Healthcare, Finance"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Company Size</label>
                  <select
                    value={companyData.size || ''}
                    onChange={e => setCompanyData({ ...companyData, size: e.target.value })}
                    className="w-full mt-1 border border-gray-300 rounded-md p-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Select size</option>
                    <option value="1-10">1-10 employees</option>
                    <option value="11-50">11-50 employees</option>
                    <option value="51-200">51-200 employees</option>
                    <option value="201-500">201-500 employees</option>
                    <option value="501-1000">501-1000 employees</option>
                    <option value="1000+">1000+ employees</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Location</label>
                  <input
                    type="text"
                    value={companyData.location || ''}
                    onChange={e => setCompanyData({ ...companyData, location: e.target.value })}
                    className="w-full mt-1 border border-gray-300 rounded-md p-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="e.g., San Francisco, CA"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Description</label>
                <textarea
                  value={companyData.description || ''}
                  onChange={e => setCompanyData({ ...companyData, description: e.target.value })}
                  className="w-full mt-1 border border-gray-300 rounded-md p-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  rows={3}
                  placeholder="Brief description of your company..."
                />
              </div>
            </div>

            {/* Contact & Links */}
            <div className="space-y-4 mb-6">
              <h4 className="text-sm font-semibold text-gray-700 uppercase border-b pb-2">Contact & Links</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Website</label>
                  <input
                    type="url"
                    value={companyData.website || ''}
                    onChange={e => setCompanyData({ ...companyData, website: e.target.value })}
                    className="w-full mt-1 border border-gray-300 rounded-md p-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="https://example.com"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">LinkedIn Profile</label>
                  <input
                    type="url"
                    value={companyData.linkedinUrl || ''}
                    onChange={e => setCompanyData({ ...companyData, linkedinUrl: e.target.value })}
                    className="w-full mt-1 border border-gray-300 rounded-md p-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="https://linkedin.com/company/..."
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Phone</label>
                  <input
                    type="tel"
                    value={companyData.phone || ''}
                    onChange={e => setCompanyData({ ...companyData, phone: e.target.value })}
                    className="w-full mt-1 border border-gray-300 rounded-md p-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="+1 (555) 123-4567"
                  />
                </div>
                <div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Company Logo</label>
                  <div className="mt-1 flex items-center space-x-4">
                    {companyData.logoUrl && (
                      <div className="relative w-12 h-12 rounded-lg border border-gray-200 overflow-hidden">
                        <img src={companyData.logoUrl} alt="Logo preview" className="w-full h-full object-cover" />
                        <button
                          onClick={() => setCompanyData({ ...companyData, logoUrl: '' })}
                          className="absolute top-0 right-0 bg-red-500 text-white p-0.5 rounded-bl-md hover:bg-red-600"
                          title="Remove logo"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    )}
                    <label className={`flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 cursor-pointer ${uploadingLogo ? 'opacity-50 cursor-not-allowed' : ''}`}>
                      {uploadingLogo ? (
                        <>
                          <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-gray-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Uploading...
                        </>
                      ) : (
                        <>
                          <Upload className="w-4 h-4 mr-2 text-gray-500" />
                          Upload Logo
                        </>
                      )}
                      <input
                        type="file"
                        className="hidden"
                        accept="image/*"
                        onChange={handleLogoUpload}
                        disabled={uploadingLogo}
                      />
                    </label>
                  </div>
                  <p className="mt-1 text-xs text-gray-500">Recommended: Square image, max 5MB</p>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end space-x-3 pt-4 border-t">
              <button
                onClick={() => setShowCompanyModal(false)}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-md transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveCompany}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50"
                disabled={!companyData.name}
              >
                Save Company
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Category Modal */}
      {showCategoryModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-sm p-6">
            <h3 className="text-lg font-bold mb-4">New Category</h3>
            <input type="text" value={categoryName} onChange={e => setCategoryName(e.target.value)} placeholder="Category Name" className="w-full border border-gray-300 rounded-md p-2" />
            <div className="mt-6 flex justify-end space-x-3">
              <button onClick={() => setShowCategoryModal(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-md">Cancel</button>
              <button onClick={handleAddCategory} className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">Create</button>
            </div>
          </div>
        </div>
      )}

      {/* Template Modal */}
      {showTemplateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center">
              <h3 className="text-lg font-bold">{templateData.id ? 'Edit Template' : 'New Template'}</h3>
              <button onClick={() => {
                setShowTemplateModal(false);
                setTemplateData({
                  name: '',
                  baseTemplate: NewsletterTemplate.PROFESSIONAL,
                  tone: NewsletterTone.PROFESSIONAL,
                  includeImages: true,
                  categoryIds: [],
                });
              }}>
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {/* Template Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Template Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={templateData.name || ''}
                  onChange={e => setTemplateData({ ...templateData, name: e.target.value })}
                  placeholder="e.g., Company Announcements Template"
                  className="w-full border border-gray-300 rounded-md p-2"
                  required
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description (Optional)
                </label>
                <textarea
                  value={templateData.description || ''}
                  onChange={e => setTemplateData({ ...templateData, description: e.target.value })}
                  placeholder="Brief description of when to use this template..."
                  className="w-full border border-gray-300 rounded-md p-2 min-h-[60px]"
                  rows={2}
                />
              </div>

              {/* HTML Template Upload */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  HTML Template File <span className="text-red-500">*</span>
                </label>
                <input
                  type="file"
                  accept=".html,.htm"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      try {
                        const text = await file.text();
                        setTemplateData({ ...templateData, htmlTemplate: text });
                      } catch (error) {
                        alert('Failed to read template file');
                      }
                    }
                  }}
                  className="w-full border border-gray-300 rounded-md p-2 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Upload an HTML file to use as the template base.
                  {templateData.htmlTemplate && (
                    <span className="text-green-600 font-medium"> ✓ Template loaded ({(templateData.htmlTemplate.length / 1024).toFixed(1)}KB)</span>
                  )}
                </p>
              </div>

              {/* Include Images Checkbox */}
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="includeImages"
                  checked={templateData.includeImages ?? true}
                  onChange={e => setTemplateData({ ...templateData, includeImages: e.target.checked })}
                  className="h-4 w-4 text-blue-600 border-gray-300 rounded"
                />
                <label htmlFor="includeImages" className="ml-2 text-sm text-gray-700">
                  Include image placeholders by default
                </label>
              </div>

              {/* Target Audience */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Target Audience (Optional)
                </label>
                <input
                  type="text"
                  value={templateData.targetAudience || ''}
                  onChange={e => setTemplateData({ ...templateData, targetAudience: e.target.value })}
                  placeholder="e.g., Tech professionals, Marketing managers"
                  className="w-full border border-gray-300 rounded-md p-2"
                />
              </div>

              {/* Custom Prompt Additions */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Custom AI Instructions (Optional)
                </label>
                <textarea
                  value={templateData.customPromptAdditions || ''}
                  onChange={e => setTemplateData({ ...templateData, customPromptAdditions: e.target.value })}
                  placeholder="Additional instructions for AI generation..."
                  className="w-full border border-gray-300 rounded-md p-2 min-h-[60px]"
                  rows={2}
                />
              </div>

              {/* Linked Categories */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Linked Categories (Optional)
                </label>
                <div className="border border-gray-300 rounded-md p-3 max-h-48 overflow-y-auto space-y-2">
                  {categories.length === 0 ? (
                    <p className="text-sm text-gray-500">No categories available</p>
                  ) : (
                    categories.map(category => (
                      <label key={category.id} className="flex items-center hover:bg-gray-50 p-1 rounded cursor-pointer">
                        <input
                          type="checkbox"
                          checked={templateData.categoryIds?.includes(category.id) || false}
                          onChange={e => {
                            const currentIds = templateData.categoryIds || [];
                            if (e.target.checked) {
                              setTemplateData({ ...templateData, categoryIds: [...currentIds, category.id] });
                            } else {
                              setTemplateData({ ...templateData, categoryIds: currentIds.filter(id => id !== category.id) });
                            }
                          }}
                          className="h-4 w-4 text-blue-600 border-gray-300 rounded"
                        />
                        <span className="ml-2 text-sm text-gray-700">{category.name}</span>
                      </label>
                    ))
                  )}
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  When a newsletter uses these categories, this template will be auto-selected
                </p>
              </div>

              {/* Is Default Checkbox */}
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="isDefault"
                  checked={templateData.isDefault || false}
                  onChange={e => setTemplateData({ ...templateData, isDefault: e.target.checked })}
                  className="h-4 w-4 text-blue-600 border-gray-300 rounded"
                />
                <label htmlFor="isDefault" className="ml-2 text-sm text-gray-700">
                  Set as default template for this company
                </label>
              </div>
            </div>

            <div className="sticky bottom-0 bg-gray-50 px-6 py-4 flex justify-end space-x-3 border-t border-gray-200">
              <button
                onClick={() => {
                  setShowTemplateModal(false);
                  setTemplateData({
                    name: '',
                    baseTemplate: NewsletterTemplate.PROFESSIONAL,
                    tone: NewsletterTone.PROFESSIONAL,
                    includeImages: true,
                    categoryIds: [],
                  });
                }}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-md"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  if (!templateData.name?.trim()) {
                    alert('Template name is required');
                    return;
                  }
                  if (!templateData.htmlTemplate?.trim()) {
                    alert('Please upload an HTML template file');
                    return;
                  }
                  if (!currentUser.companyId) {
                    alert('Company ID is missing');
                    return;
                  }

                  try {
                    if (templateData.id) {
                      // Update existing template
                      await api.updateTemplateConfig(templateData.id, {
                        name: templateData.name,
                        description: templateData.description,
                        htmlTemplate: templateData.htmlTemplate!,
                        includeImages: templateData.includeImages!,
                        targetAudience: templateData.targetAudience,
                        customPromptAdditions: templateData.customPromptAdditions,
                        categoryIds: templateData.categoryIds,
                        isDefault: templateData.isDefault,
                      });
                    } else {
                      // Create new template
                      await api.createTemplateConfig({
                        companyId: currentUser.companyId,
                        name: templateData.name,
                        description: templateData.description,
                        htmlTemplate: templateData.htmlTemplate!,
                        includeImages: templateData.includeImages!,
                        targetAudience: templateData.targetAudience,
                        customPromptAdditions: templateData.customPromptAdditions,
                        categoryIds: templateData.categoryIds,
                        isDefault: templateData.isDefault,
                      });
                    }

                    setShowTemplateModal(false);
                    setTemplateData({
                      name: '',
                      htmlTemplate: '',
                      includeImages: true,
                      categoryIds: [],
                    });
                    loadData();
                  } catch (error: any) {
                    alert(`Failed to save template: ${error.message}`);
                  }
                }}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                disabled={!templateData.name?.trim() || !templateData.htmlTemplate?.trim()}
              >
                {templateData.id ? 'Update' : 'Create'} Template
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Group Modal */}
      {showGroupModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-sm p-6">
            <h3 className="text-lg font-bold mb-4">New Recipient Group</h3>
            <input type="text" value={groupName} onChange={e => setGroupName(e.target.value)} placeholder="Group Name" className="w-full border border-gray-300 rounded-md p-2" />
            <div className="mt-6 flex justify-end space-x-3">
              <button onClick={() => setShowGroupModal(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-md">Cancel</button>
              <button onClick={handleAddGroup} className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">Create</button>
            </div>
          </div>
        </div>
      )}

      {/* Recipient Management Modal */}
      {showRecipientModal && selectedGroup && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl p-6 flex flex-col max-h-[80vh]">
            <div className="flex justify-between items-center mb-6 border-b pb-4">
              <div>
                <h3 className="text-lg font-bold text-gray-900">Manage Group: {selectedGroup.name}</h3>
                <p className="text-sm text-gray-500">{selectedGroup.recipientCount} current recipients</p>
              </div>
              <button onClick={() => setShowRecipientModal(false)}><X className="w-5 h-5 text-gray-500" /></button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-6">
              {/* Add Single */}
              <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                <h4 className="text-sm font-semibold text-gray-700 mb-3">Add Single Recipient</h4>
                <div className="grid grid-cols-4 gap-3">
                  <input type="email" placeholder="Email (Required)" value={recipientData.email} onChange={e => setRecipientData({ ...recipientData, email: e.target.value })} className="p-2 border rounded text-sm" />
                  <input type="text" placeholder="First Name" value={recipientData.firstName} onChange={e => setRecipientData({ ...recipientData, firstName: e.target.value })} className="p-2 border rounded text-sm" />
                  <input type="text" placeholder="Last Name" value={recipientData.lastName} onChange={e => setRecipientData({ ...recipientData, lastName: e.target.value })} className="p-2 border rounded text-sm" />
                  <button onClick={handleAddRecipient} className="bg-blue-600 text-white rounded text-sm font-medium hover:bg-blue-700">Add</button>
                </div>
              </div>

              {/* CSV Import */}
              <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                <h4 className="text-sm font-semibold text-gray-700 mb-3">Bulk Import (CSV)</h4>
                <div className="flex items-center space-x-4">
                  <label className="flex items-center px-4 py-2 bg-white border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                    <Upload className="w-4 h-4 mr-2 text-gray-500" />
                    <span className="text-sm text-gray-700">Select CSV File</span>
                    <input type="file" accept=".csv" className="hidden" onChange={handleCSVImport} />
                  </label>
                  <div className="text-xs text-gray-500">
                    <p>Headers required:</p>
                    <code className="bg-gray-200 px-1 rounded">Email, FirstName, LastName</code>
                  </div>
                </div>
              </div>

              {/* List (Mocked for now as API doesn't return full list in this view for perf) */}
              <div>
                <h4 className="text-sm font-semibold text-gray-700 mb-2">Recipients</h4>
                <div className="bg-white border border-gray-200 rounded-lg">
                  {selectedGroup.recipients && selectedGroup.recipients.length > 0 ? (
                    selectedGroup.recipients.map(r => (
                      <div key={r.id} className="px-4 py-2 border-b last:border-0 flex justify-between items-center text-sm">
                        {editingRecipient?.id === r.id ? (
                          // Edit mode
                          <>
                            <div className="flex gap-2 flex-1">
                              <input
                                type="email"
                                value={editData.email || ''}
                                onChange={(e) => setEditData({ ...editData, email: e.target.value })}
                                className="px-2 py-1 border rounded text-xs flex-1"
                                placeholder="Email"
                              />
                              <input
                                type="text"
                                value={editData.firstName || ''}
                                onChange={(e) => setEditData({ ...editData, firstName: e.target.value })}
                                className="px-2 py-1 border rounded text-xs w-32"
                                placeholder="First Name"
                              />
                              <input
                                type="text"
                                value={editData.lastName || ''}
                                onChange={(e) => setEditData({ ...editData, lastName: e.target.value })}
                                className="px-2 py-1 border rounded text-xs w-32"
                                placeholder="Last Name"
                              />
                            </div>
                            <div className="flex gap-1 ml-2">
                              <button
                                onClick={handleSaveRecipient}
                                className="text-green-600 hover:text-green-800 p-1"
                                title="Save"
                              >
                                <Check className="w-4 h-4" />
                              </button>
                              <button
                                onClick={handleCancelEdit}
                                className="text-gray-400 hover:text-gray-600 p-1"
                                title="Cancel"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                          </>
                        ) : (
                          // View mode
                          <>
                            <span className="text-gray-900">{r.email}</span>
                            <div className="flex items-center gap-2">
                              <span className="text-gray-500">{r.firstName} {r.lastName}</span>
                              <button
                                onClick={() => handleEditRecipient(r)}
                                className="text-gray-400 hover:text-blue-600 p-1"
                                title="Edit recipient"
                              >
                                <Edit className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDeleteRecipient(r.id)}
                                className="text-gray-400 hover:text-red-600 p-1"
                                title="Delete recipient"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    ))
                  ) : (
                    <div className="p-4 text-center text-gray-400 text-sm">No recipients in this group.</div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};