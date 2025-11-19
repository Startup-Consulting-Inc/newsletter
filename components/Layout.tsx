import React, { useState } from 'react';
import { User, UserRole } from '../types';
import { 
  LayoutDashboard, 
  PenTool, 
  Users, 
  FileBarChart, 
  ShieldAlert, 
  LogOut, 
  Menu, 
  X,
  Bell,
  Settings
} from 'lucide-react';

interface LayoutProps {
  currentUser: User;
  onLogout: () => void;
  activeTab: string;
  onNavigate: (tab: string) => void;
  onOpenSettings: () => void;
  children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ currentUser, onLogout, activeTab, onNavigate, onOpenSettings, children }) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const getNavItems = () => {
    const items = [
      { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: [UserRole.SITE_ADMIN, UserRole.NEWSLETTER_ADMIN, UserRole.NEWSLETTER_CREATOR] },
      { id: 'newsletters', label: 'Newsletters', icon: PenTool, roles: [UserRole.SITE_ADMIN, UserRole.NEWSLETTER_ADMIN, UserRole.NEWSLETTER_CREATOR] },
      { id: 'analytics', label: 'Analytics', icon: FileBarChart, roles: [UserRole.SITE_ADMIN, UserRole.NEWSLETTER_ADMIN, UserRole.NEWSLETTER_CREATOR] },
      { id: 'admin', label: 'Admin Panel', icon: ShieldAlert, roles: [UserRole.SITE_ADMIN, UserRole.NEWSLETTER_ADMIN] },
    ];

    return items.filter(item => item.roles.includes(currentUser.role));
  };

  const navItems = getNavItems();

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {/* Sidebar - Desktop */}
      <aside className="hidden md:flex flex-col w-64 bg-slate-900 text-white transition-all duration-300">
        <div className="p-6 border-b border-slate-800 flex items-center space-x-3">
          <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center font-bold text-white">IN</div>
          <span className="text-xl font-semibold tracking-tight">InNews</span>
        </div>

        <nav className="flex-1 overflow-y-auto py-6 px-3 space-y-1">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={`flex items-center w-full px-3 py-2.5 text-sm font-medium rounded-lg transition-colors ${
                activeTab === item.id 
                  ? 'bg-blue-600 text-white' 
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <item.icon className="w-5 h-5 mr-3" />
              {item.label}
            </button>
          ))}
        </nav>

        <div className="p-4 border-t border-slate-800">
          <button 
             onClick={onOpenSettings}
             className="flex items-center mb-4 px-2 w-full text-left hover:bg-slate-800 rounded-lg p-2 transition-colors group"
             title="Go to Profile"
          >
             <img src={currentUser.avatarUrl || 'https://via.placeholder.com/40'} alt="User" className="w-8 h-8 rounded-full mr-3 border border-slate-600 group-hover:border-slate-400" />
             <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">{currentUser.name}</p>
                <p className="text-xs text-slate-400 truncate group-hover:text-slate-300">{currentUser.role}</p>
             </div>
          </button>
          <button 
            onClick={onLogout}
            className="flex items-center w-full px-3 py-2 text-sm text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
          >
            <LogOut className="w-5 h-5 mr-3" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Mobile Header & Menu */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="bg-white border-b border-gray-200 lg:hidden">
          <div className="flex items-center justify-between px-4 py-3">
            <div className="flex items-center">
              <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="text-gray-500 hover:text-gray-700">
                <Menu className="w-6 h-6" />
              </button>
              <span className="ml-3 text-lg font-semibold text-gray-900">InNews</span>
            </div>
            <button onClick={onOpenSettings}>
                <img src={currentUser.avatarUrl} alt="Profile" className="w-8 h-8 rounded-full" />
            </button>
          </div>
          
          {/* Mobile Nav Dropdown */}
          {isMobileMenuOpen && (
            <div className="px-2 pt-2 pb-3 space-y-1 border-t border-gray-200">
              {navItems.map((item) => (
                 <button
                  key={item.id}
                  onClick={() => {
                    onNavigate(item.id);
                    setIsMobileMenuOpen(false);
                  }}
                  className={`flex items-center w-full px-3 py-2 text-base font-medium rounded-md ${
                    activeTab === item.id ? 'bg-blue-50 text-blue-700' : 'text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <item.icon className="w-5 h-5 mr-3" />
                  {item.label}
                </button>
              ))}
              <button
                onClick={() => {
                    onOpenSettings();
                    setIsMobileMenuOpen(false);
                }}
                className={`flex items-center w-full px-3 py-2 text-base font-medium rounded-md ${
                  activeTab === 'profile' ? 'bg-blue-50 text-blue-700' : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                <Settings className="w-5 h-5 mr-3" />
                My Profile
              </button>
              <button 
                onClick={onLogout}
                className="flex items-center w-full px-3 py-2 text-base font-medium text-gray-700 hover:bg-gray-50 rounded-md"
              >
                <LogOut className="w-5 h-5 mr-3" />
                Sign Out
              </button>
            </div>
          )}
        </header>

        {/* Top Bar Desktop */}
        <header className="hidden lg:flex bg-white border-b border-gray-200 h-16 items-center justify-between px-8 shadow-sm z-10">
           <h2 className="text-xl font-semibold text-gray-800 capitalize">
             {navItems.find(i => i.id === activeTab)?.label || (activeTab === 'profile' ? 'Profile' : 'Dashboard')}
           </h2>
           <div className="flex items-center space-x-4">
              <button className="p-2 text-gray-400 hover:text-gray-600 relative">
                <Bell className="w-5 h-5" />
                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border border-white"></span>
              </button>
              <button onClick={onOpenSettings} className={`p-2 hover:text-gray-600 ${activeTab === 'profile' ? 'text-blue-600' : 'text-gray-400'}`}>
                <Settings className="w-5 h-5" />
              </button>
           </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto p-4 md:p-8 relative">
          {children}
        </main>
      </div>
    </div>
  );
};
