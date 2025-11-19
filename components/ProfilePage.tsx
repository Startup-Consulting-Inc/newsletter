import React, { useState } from 'react';
import { User } from '../types';
import { api } from '../services';
import { Save, Linkedin, Mail, Camera, User as UserIcon, Briefcase } from 'lucide-react';

interface ProfilePageProps {
  user: User;
  onUpdateUser: (updatedUser: User) => void;
}

export const ProfilePage: React.FC<ProfilePageProps> = ({ user, onUpdateUser }) => {
  const [formData, setFormData] = useState({
    name: user.name,
    description: user.description || '',
    linkedinUrl: user.linkedinUrl || ''
  });
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  const handleSave = async () => {
    setIsSaving(true);
    setMessage({ type: '', text: '' });
    try {
      const updated = await api.updateUser(user.id, formData);
      onUpdateUser(updated);
      setMessage({ type: 'success', text: 'Profile updated successfully.' });
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to update profile.' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleAvatarClick = () => {
      alert("Avatar upload simulation: In a real app, this would open a file picker.");
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">My Profile</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Profile Card */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="h-32 bg-gradient-to-r from-blue-600 to-blue-400"></div>
            <div className="px-6 pb-6 relative">
              <div className="relative -mt-16 mb-4 inline-block">
                <img 
                  src={user.avatarUrl} 
                  alt={user.name} 
                  className="w-32 h-32 rounded-full border-4 border-white shadow-md object-cover bg-white" 
                />
                <button 
                  onClick={handleAvatarClick}
                  className="absolute bottom-0 right-0 p-2 bg-white rounded-full shadow-md border border-gray-200 text-gray-600 hover:text-blue-600 transition-colors"
                  title="Change Avatar"
                >
                  <Camera className="w-4 h-4" />
                </button>
              </div>
              
              <div>
                <h2 className="text-xl font-bold text-gray-900">{user.name}</h2>
                <div className="flex items-center text-blue-600 mt-1 font-medium text-sm">
                   <Briefcase className="w-4 h-4 mr-1.5" />
                   {user.role}
                </div>
              </div>

              <div className="mt-6 pt-6 border-t border-gray-100 space-y-3">
                <div className="flex items-center text-gray-600 text-sm">
                  <Mail className="w-4 h-4 mr-3 text-gray-400" />
                  {user.email}
                </div>
                {user.linkedinUrl && (
                  <div className="flex items-center text-gray-600 text-sm">
                    <Linkedin className="w-4 h-4 mr-3 text-gray-400" />
                    <a href={user.linkedinUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline truncate">
                      LinkedIn Profile
                    </a>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Edit Form */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200">
            <div className="px-6 py-4 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
              <h3 className="font-semibold text-gray-800 flex items-center">
                <UserIcon className="w-4 h-4 mr-2 text-gray-500" />
                Edit Profile Details
              </h3>
            </div>
            
            <div className="p-6 space-y-6">
              {message.text && (
                <div className={`p-4 rounded-lg text-sm ${message.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
                  {message.text}
                </div>
              )}

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                  <input 
                    type="text" 
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">About Me</label>
                  <textarea 
                    value={formData.description}
                    onChange={(e) => setFormData({...formData, description: e.target.value})}
                    rows={4}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all resize-none"
                    placeholder="Describe your role and responsibilities..."
                  />
                  <p className="text-xs text-gray-500 mt-1">This description may appear in newsletters you author.</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">LinkedIn URL</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Linkedin className="h-4 w-4 text-gray-400" />
                    </div>
                    <input 
                      type="url" 
                      value={formData.linkedinUrl}
                      onChange={(e) => setFormData({...formData, linkedinUrl: e.target.value})}
                      className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                      placeholder="https://linkedin.com/in/..."
                    />
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-gray-100 flex justify-end">
                <button 
                  onClick={handleSave}
                  disabled={isSaving}
                  className={`flex items-center px-6 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors ${isSaving ? 'opacity-70 cursor-not-allowed' : ''}`}
                >
                  <Save className="w-4 h-4 mr-2" />
                  {isSaving ? 'Saving Changes...' : 'Save Changes'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
