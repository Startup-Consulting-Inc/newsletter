import React, { useState, useEffect, useMemo } from 'react';
import { api } from '../services';
import { Newsletter } from '../types';
import {
  AlertCircle,
  Download,
  Filter,
  Mail,
  AlertTriangle,
  XCircle,
  Clock,
  RefreshCw,
} from 'lucide-react';

interface BounceData {
  id: string;
  recipientEmail: string;
  errorMessage: string;
  newsletterId: string;
  timestamp: string;
  bounceType: 'hard' | 'soft' | 'unknown';
  category: string;
}

interface BounceReportProps {
  companyId?: string;
}

export const BounceReport: React.FC<BounceReportProps> = ({ companyId }) => {
  const [bounces, setBounces] = useState<BounceData[]>([]);
  const [newsletters, setNewsletters] = useState<Newsletter[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedNewsletter, setSelectedNewsletter] = useState<string>('all');
  const [selectedBounceType, setSelectedBounceType] = useState<string>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadData();
  }, [companyId]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [bouncesData, newslettersData] = await Promise.all([
        api.getBounces(),
        api.getNewsletters(companyId),
      ]);

      setBounces(bouncesData);
      setNewsletters(newslettersData.filter(n => n.status === 'Sent'));
    } catch (error) {
      console.error('Failed to load bounce data:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredBounces = useMemo(() => {
    let result = [...bounces];

    // Filter by search term
    if (searchTerm.trim()) {
      const lowerSearch = searchTerm.toLowerCase();
      result = result.filter(b =>
        b.recipientEmail.toLowerCase().includes(lowerSearch) ||
        b.errorMessage.toLowerCase().includes(lowerSearch)
      );
    }

    // Filter by newsletter
    if (selectedNewsletter !== 'all') {
      result = result.filter(b => b.newsletterId === selectedNewsletter);
    }

    // Filter by bounce type
    if (selectedBounceType !== 'all') {
      result = result.filter(b => b.bounceType === selectedBounceType);
    }

    // Filter by category
    if (selectedCategory !== 'all') {
      result = result.filter(b => b.category === selectedCategory);
    }

    return result;
  }, [bounces, searchTerm, selectedNewsletter, selectedBounceType, selectedCategory]);

  const uniqueCategories = useMemo(() => {
    return Array.from(new Set(bounces.map(b => b.category)));
  }, [bounces]);

  const exportToCSV = () => {
    const csvHeader = 'Email Address,Newsletter,Bounce Type,Category,Error Message,Timestamp\n';
    const csvRows = filteredBounces.map(bounce => {
      const newsletter = newsletters.find(n => n.id === bounce.newsletterId);
      return [
        bounce.recipientEmail,
        newsletter?.subject || 'Unknown Newsletter',
        bounce.bounceType,
        bounce.category,
        `"${bounce.errorMessage.replace(/"/g, '""')}"`, // Escape quotes in error message
        new Date(bounce.timestamp).toLocaleString(),
      ].join(',');
    }).join('\n');

    const csvContent = csvHeader + csvRows;
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);

    link.setAttribute('href', url);
    link.setAttribute('download', `bounced-emails-${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getBounceTypeIcon = (type: string) => {
    switch (type) {
      case 'hard':
        return <XCircle className="w-4 h-4 text-red-500" />;
      case 'soft':
        return <AlertTriangle className="w-4 h-4 text-yellow-500" />;
      default:
        return <AlertCircle className="w-4 h-4 text-gray-500" />;
    }
  };

  const getBounceTypeBadge = (type: string) => {
    const colors = {
      hard: 'bg-red-100 text-red-800',
      soft: 'bg-yellow-100 text-yellow-800',
      unknown: 'bg-gray-100 text-gray-800',
    };
    return colors[type as keyof typeof colors] || colors.unknown;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <RefreshCw className="w-6 h-6 animate-spin text-blue-600" />
        <span className="ml-2 text-gray-600">Loading bounce data...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Bounced Emails</h2>
          <p className="text-gray-500 mt-1">
            View and manage failed email deliveries
          </p>
        </div>
        <button
          onClick={exportToCSV}
          disabled={filteredBounces.length === 0}
          className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Download className="w-4 h-4 mr-2" />
          Export to CSV
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Bounces</p>
              <p className="text-2xl font-bold text-gray-900">{bounces.length}</p>
            </div>
            <Mail className="w-8 h-8 text-gray-400" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Hard Bounces</p>
              <p className="text-2xl font-bold text-red-600">
                {bounces.filter(b => b.bounceType === 'hard').length}
              </p>
            </div>
            <XCircle className="w-8 h-8 text-red-400" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Soft Bounces</p>
              <p className="text-2xl font-bold text-yellow-600">
                {bounces.filter(b => b.bounceType === 'soft').length}
              </p>
            </div>
            <AlertTriangle className="w-8 h-8 text-yellow-400" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">After Filters</p>
              <p className="text-2xl font-bold text-blue-600">{filteredBounces.length}</p>
            </div>
            <Filter className="w-8 h-8 text-blue-400" />
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg border border-gray-200">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Search */}
          <input
            type="text"
            placeholder="Search email or error..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          />

          {/* Newsletter Filter */}
          <select
            value={selectedNewsletter}
            onChange={(e) => setSelectedNewsletter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Newsletters</option>
            {newsletters.map(n => (
              <option key={n.id} value={n.id}>{n.subject}</option>
            ))}
          </select>

          {/* Bounce Type Filter */}
          <select
            value={selectedBounceType}
            onChange={(e) => setSelectedBounceType(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Types</option>
            <option value="hard">Hard Bounce</option>
            <option value="soft">Soft Bounce</option>
            <option value="unknown">Unknown</option>
          </select>

          {/* Category Filter */}
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Categories</option>
            {uniqueCategories.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        </div>

        {/* Clear Filters */}
        {(searchTerm || selectedNewsletter !== 'all' || selectedBounceType !== 'all' || selectedCategory !== 'all') && (
          <button
            onClick={() => {
              setSearchTerm('');
              setSelectedNewsletter('all');
              setSelectedBounceType('all');
              setSelectedCategory('all');
            }}
            className="mt-3 text-sm text-gray-600 hover:text-gray-800"
          >
            Clear all filters
          </button>
        )}
      </div>

      {/* Bounce Table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        {filteredBounces.length === 0 ? (
          <div className="p-8 text-center">
            <Mail className="w-12 h-12 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-600">
              {bounces.length === 0
                ? 'No bounced emails found. Great job!'
                : 'No bounces match your filters.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Email Address
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Newsletter
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Category
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Error Message
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Time
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredBounces.map(bounce => {
                  const newsletter = newsletters.find(n => n.id === bounce.newsletterId);
                  return (
                    <tr key={bounce.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          {getBounceTypeIcon(bounce.bounceType)}
                          <span className={`ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getBounceTypeBadge(bounce.bounceType)}`}>
                            {bounce.bounceType}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <Mail className="w-4 h-4 text-gray-400 mr-2" />
                          <span className="text-sm font-medium text-gray-900">
                            {bounce.recipientEmail}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm text-gray-600">
                          {newsletter?.subject || 'Unknown Newsletter'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                          {bounce.category}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm text-gray-500 line-clamp-2" title={bounce.errorMessage}>
                          {bounce.errorMessage}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center text-sm text-gray-500">
                          <Clock className="w-4 h-4 mr-1" />
                          {new Date(bounce.timestamp).toLocaleDateString()}
                          <br />
                          <span className="text-xs">
                            {new Date(bounce.timestamp).toLocaleTimeString()}
                          </span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
