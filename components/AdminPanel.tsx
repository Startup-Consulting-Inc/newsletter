import React, { useState, useEffect } from 'react';
import { User, UserRole, AuditLogEntry, Category, RecipientGroup, Recipient } from '../types';
import { api } from '../services';
import { Plus, Search, Trash2, Edit, Download, X, Upload, Users as UsersIcon, List } from 'lucide-react';

interface AdminPanelProps {
  currentUser: User;
}

export const AdminPanel: React.FC<AdminPanelProps> = ({ currentUser }) => {
  const isSiteAdmin = currentUser.role === UserRole.SITE_ADMIN;
  
  const [activeTab, setActiveTab] = useState<'users' | 'audit' | 'categories' | 'groups'>(isSiteAdmin ? 'users' : 'categories');
  const [users, setUsers] = useState<User[]>([]);
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [groups, setGroups] = useState<RecipientGroup[]>([]);
  
  const [searchTerm, setSearchTerm] = useState('');
  
  // Modals State
  const [showUserModal, setShowUserModal] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showGroupModal, setShowGroupModal] = useState(false);
  const [showRecipientModal, setShowRecipientModal] = useState(false);
  
  // Form Data
  const [userData, setUserData] = useState<Partial<User>>({ role: UserRole.NEWSLETTER_CREATOR, name: '', email: '' });
  const [categoryName, setCategoryName] = useState('');
  const [groupName, setGroupName] = useState('');
  const [selectedGroup, setSelectedGroup] = useState<RecipientGroup | null>(null);
  const [recipientData, setRecipientData] = useState({ email: '', firstName: '', lastName: '' });

  const loadData = async () => {
    if (activeTab === 'users' && isSiteAdmin) setUsers(await api.getUsers());
    if (activeTab === 'audit' && isSiteAdmin) setLogs(await api.getAuditLogs());
    if (activeTab === 'categories') setCategories(await api.getCategories());
    if (activeTab === 'groups') setGroups(await api.getGroups());
  };

  useEffect(() => {
    loadData();
  }, [activeTab, isSiteAdmin]);

  // User Actions
  const handleSaveUser = async () => {
    if (userData.id) {
        await api.updateUser(userData.id, userData);
    } else {
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

  // Category Actions
  const handleAddCategory = async () => {
    if (!categoryName) return;
    await api.addCategory(categoryName);
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

  // Group Actions
  const handleAddGroup = async () => {
    if (!groupName) return;
    await api.addGroup(groupName);
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

  const handleAddRecipient = async () => {
      if (!selectedGroup || !recipientData.email) return;
      await api.addRecipient(selectedGroup.id, recipientData);
      setRecipientData({ email: '', firstName: '', lastName: '' });
      // Refresh groups to get updated count, ideally we'd fetch just the group
      const groups = await api.getGroups();
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
                    await api.addRecipient(selectedGroup.id, { email, firstName, lastName });
                    successCount++;
                } catch (err) {
                    console.error(err);
                    failCount++;
                    errors.push(`Row ${i+1}: Error adding ${email}`);
                }
            } else {
                failCount++;
                errors.push(`Row ${i+1}: Invalid email format`);
            }
        }

        let msg = `Import completed.\nSuccessfully added: ${successCount}\nFailed: ${failCount}`;
        if (errors.length > 0) {
            msg += `\n\nFirst 5 errors:\n${errors.slice(0, 5).join('\n')}`;
        }
        alert(msg);
        
        // Refresh data
        const groups = await api.getGroups();
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

  const renderTabs = () => {
     return (
        <div className="flex space-x-1 bg-white p-1 rounded-lg border border-gray-200 shadow-sm overflow-x-auto">
           {isSiteAdmin && (
               <>
                <button onClick={() => setActiveTab('users')} className={`px-4 py-2 text-sm font-medium rounded-md whitespace-nowrap ${activeTab === 'users' ? 'bg-blue-50 text-blue-700' : 'text-gray-600 hover:bg-gray-50'}`}>Users</button>
                <button onClick={() => setActiveTab('audit')} className={`px-4 py-2 text-sm font-medium rounded-md whitespace-nowrap ${activeTab === 'audit' ? 'bg-blue-50 text-blue-700' : 'text-gray-600 hover:bg-gray-50'}`}>Audit Log</button>
               </>
           )}
           <button onClick={() => setActiveTab('categories')} className={`px-4 py-2 text-sm font-medium rounded-md whitespace-nowrap ${activeTab === 'categories' ? 'bg-blue-50 text-blue-700' : 'text-gray-600 hover:bg-gray-50'}`}>Categories</button>
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

      {/* Toolbar */}
      <div className="flex flex-col md:flex-row justify-between items-center bg-white p-4 rounded-xl border border-gray-200 shadow-sm gap-4">
        <div className="relative w-full md:w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input 
            type="text" 
            placeholder={`Search ${activeTab}...`} 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
          />
        </div>
        
        <div className="flex gap-2 w-full md:w-auto">
            {activeTab === 'users' && (
                <button onClick={() => { setUserData({ role: UserRole.NEWSLETTER_CREATOR }); setShowUserModal(true); }} className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium w-full md:w-auto justify-center">
                    <Plus className="w-4 h-4 mr-2" /> Add User
                </button>
            )}
            {activeTab === 'categories' && (
                <button onClick={() => setShowCategoryModal(true)} className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium w-full md:w-auto justify-center">
                    <Plus className="w-4 h-4 mr-2" /> Add Category
                </button>
            )}
            {activeTab === 'groups' && (
                <button onClick={() => setShowGroupModal(true)} className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium w-full md:w-auto justify-center">
                    <Plus className="w-4 h-4 mr-2" /> Add Group
                </button>
            )}
            {activeTab === 'audit' && (
                <button className="flex items-center px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 text-sm font-medium">
                    <Download className="w-4 h-4 mr-2" /> Export
                </button>
            )}
        </div>
      </div>

      {/* Tables */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        
        {activeTab === 'users' && (
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 font-medium text-gray-500">User</th>
                <th className="px-6 py-3 font-medium text-gray-500">Role</th>
                <th className="px-6 py-3 font-medium text-gray-500 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {users.filter(u => u.name.toLowerCase().includes(searchTerm.toLowerCase())).map(user => (
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
                  {categories.map(cat => (
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
                  {groups.map(g => (
                    <tr key={g.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 font-medium text-gray-900">{g.name}</td>
                      <td className="px-6 py-4 text-gray-500">{g.recipientCount} members</td>
                      <td className="px-6 py-4 text-right space-x-2">
                         <button onClick={() => { setSelectedGroup(g); setShowRecipientModal(true); }} className="text-blue-600 hover:text-blue-800 text-xs font-medium mr-2">Manage Recipients</button>
                         <button onClick={() => handleDeleteGroup(g.id)} className="text-gray-400 hover:text-red-600"><Trash2 className="w-4 h-4" /></button>
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
                    {logs.filter(l => l.action.includes(searchTerm.toUpperCase())).map(log => (
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

      {/* Modals */}
      
      {/* User Modal */}
      {showUserModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
              <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
                  <h3 className="text-lg font-bold mb-4">{userData.id ? 'Edit User' : 'Create User'}</h3>
                  <div className="space-y-4">
                      <div>
                          <label className="block text-sm font-medium text-gray-700">Full Name</label>
                          <input type="text" value={userData.name} onChange={e => setUserData({...userData, name: e.target.value})} className="w-full mt-1 border border-gray-300 rounded-md p-2" />
                      </div>
                      <div>
                          <label className="block text-sm font-medium text-gray-700">Email Address</label>
                          <input type="email" value={userData.email} onChange={e => setUserData({...userData, email: e.target.value})} className="w-full mt-1 border border-gray-300 rounded-md p-2" />
                      </div>
                      <div>
                          <label className="block text-sm font-medium text-gray-700">Role</label>
                          <select value={userData.role} onChange={e => setUserData({...userData, role: e.target.value as UserRole})} className="w-full mt-1 border border-gray-300 rounded-md p-2 bg-white">
                              {Object.values(UserRole).map(r => <option key={r} value={r}>{r}</option>)}
                          </select>
                      </div>
                  </div>
                  <div className="mt-6 flex justify-end space-x-3">
                      <button onClick={() => setShowUserModal(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-md">Cancel</button>
                      <button onClick={handleSaveUser} className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">Save User</button>
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
                              <input type="email" placeholder="Email (Required)" value={recipientData.email} onChange={e => setRecipientData({...recipientData, email: e.target.value})} className="p-2 border rounded text-sm" />
                              <input type="text" placeholder="First Name" value={recipientData.firstName} onChange={e => setRecipientData({...recipientData, firstName: e.target.value})} className="p-2 border rounded text-sm" />
                              <input type="text" placeholder="Last Name" value={recipientData.lastName} onChange={e => setRecipientData({...recipientData, lastName: e.target.value})} className="p-2 border rounded text-sm" />
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
                          <h4 className="text-sm font-semibold text-gray-700 mb-2">Recently Added</h4>
                          <div className="bg-white border border-gray-200 rounded-lg">
                              {selectedGroup.recipients && selectedGroup.recipients.length > 0 ? (
                                  selectedGroup.recipients.map(r => (
                                      <div key={r.id} className="px-4 py-2 border-b last:border-0 flex justify-between items-center text-sm">
                                          <span className="text-gray-900">{r.email}</span>
                                          <span className="text-gray-500">{r.firstName} {r.lastName}</span>
                                      </div>
                                  ))
                              ) : (
                                  <div className="p-4 text-center text-gray-400 text-sm">No new recipients added in this session.</div>
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