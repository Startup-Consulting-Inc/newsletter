import React, { useMemo } from 'react';
import { Newsletter, NewsletterStatus } from '../types';
import { PieChart, Pie, Cell, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { TrendingUp, TrendingDown, Mail, MousePointer, AlertCircle, BarChart3 } from 'lucide-react';

interface AnalyticsProps {
  newsletters: Newsletter[];
}

interface AggregatedStats {
  totalSent: number;
  totalOpened: number;
  totalClicked: number;
  totalBounced: number;
  openRate: number;
  clickRate: number;
  clickToOpenRate: number;
  bounceRate: number;
  statusBreakdown: { status: string; count: number; color: string }[];
  topPerformers: {
    id: string;
    subject: string;
    sent: number;
    openRate: number;
    clickRate: number;
  }[];
  trendsData: {
    date: string;
    openRate: number;
    clickRate: number;
  }[];
}

const COLORS = {
  Draft: '#94a3b8',
  Scheduled: '#3b82f6',
  Sending: '#f59e0b',
  Sent: '#10b981',
  Paused: '#6b7280',
};

export const Analytics: React.FC<AnalyticsProps> = ({ newsletters }) => {
  const stats: AggregatedStats = useMemo(() => {
    // Calculate aggregated statistics
    const sentNewsletters = newsletters.filter(n => n.stats && n.stats.sent > 0);

    const totalSent = sentNewsletters.reduce((sum, n) => sum + (n.stats?.sent || 0), 0);
    const totalOpened = sentNewsletters.reduce((sum, n) => sum + (n.stats?.opened || 0), 0);
    const totalClicked = sentNewsletters.reduce((sum, n) => sum + (n.stats?.clicked || 0), 0);
    const totalBounced = sentNewsletters.reduce((sum, n) => sum + (n.stats?.bounced || 0), 0);

    const openRate = totalSent > 0 ? (totalOpened / totalSent) * 100 : 0;
    const clickRate = totalSent > 0 ? (totalClicked / totalSent) * 100 : 0;
    const clickToOpenRate = totalOpened > 0 ? (totalClicked / totalOpened) * 100 : 0;
    const bounceRate = totalSent > 0 ? (totalBounced / totalSent) * 100 : 0;

    // Status breakdown
    const statusCounts: Record<string, number> = {
      Draft: 0,
      Scheduled: 0,
      Sending: 0,
      Sent: 0,
      Paused: 0,
    };

    newsletters.forEach(n => {
      if (statusCounts[n.status] !== undefined) {
        statusCounts[n.status]++;
      }
    });

    const statusBreakdown = Object.entries(statusCounts)
      .filter(([_, count]) => count > 0)
      .map(([status, count]) => ({
        status,
        count,
        color: COLORS[status as keyof typeof COLORS] || '#6b7280',
      }));

    // Top performers
    const topPerformers = sentNewsletters
      .map(n => ({
        id: n.id,
        subject: n.subject,
        sent: n.stats?.sent || 0,
        openRate: n.stats?.sent ? ((n.stats?.opened || 0) / n.stats.sent) * 100 : 0,
        clickRate: n.stats?.sent ? ((n.stats?.clicked || 0) / n.stats.sent) * 100 : 0,
      }))
      .sort((a, b) => b.openRate - a.openRate)
      .slice(0, 5);

    // Trends data (last 7 sent newsletters)
    const trendsData = sentNewsletters
      .filter(n => n.sentAt)
      .sort((a, b) => new Date(a.sentAt!).getTime() - new Date(b.sentAt!).getTime())
      .slice(-7)
      .map(n => {
        const sent = n.stats?.sent || 0;
        return {
          date: new Date(n.sentAt!).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          openRate: sent > 0 ? ((n.stats?.opened || 0) / sent) * 100 : 0,
          clickRate: sent > 0 ? ((n.stats?.clicked || 0) / sent) * 100 : 0,
        };
      });

    return {
      totalSent,
      totalOpened,
      totalClicked,
      totalBounced,
      openRate,
      clickRate,
      clickToOpenRate,
      bounceRate,
      statusBreakdown,
      topPerformers,
      trendsData,
    };
  }, [newsletters]);

  const MetricCard = ({
    title,
    value,
    icon: Icon,
    trend,
    trendValue,
    format = 'number',
  }: {
    title: string;
    value: number;
    icon: React.ElementType;
    trend?: 'up' | 'down';
    trendValue?: number;
    format?: 'number' | 'percent';
  }) => (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
      <div className="flex items-center justify-between mb-2">
        <p className="text-sm text-gray-500 font-medium uppercase">{title}</p>
        <div className="p-2 bg-blue-50 rounded-lg">
          <Icon className="w-5 h-5 text-blue-600" />
        </div>
      </div>
      <p className="text-3xl font-bold text-gray-900 mt-2">
        {format === 'percent' ? `${value.toFixed(1)}%` : value.toLocaleString()}
      </p>
      {trend && trendValue !== undefined && (
        <div className="flex items-center mt-2">
          {trend === 'up' ? (
            <TrendingUp className="w-4 h-4 text-green-600 mr-1" />
          ) : (
            <TrendingDown className="w-4 h-4 text-red-600 mr-1" />
          )}
          <p className={`text-sm ${trend === 'up' ? 'text-green-600' : 'text-red-600'}`}>
            {trend === 'up' ? '+' : ''}{trendValue.toFixed(1)}% from last period
          </p>
        </div>
      )}
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Analytics Overview</h1>
        <div className="text-sm text-gray-500">
          Based on {newsletters.filter(n => n.stats && n.stats.sent > 0).length} sent newsletters
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard
          title="Total Emails Sent"
          value={stats.totalSent}
          icon={Mail}
          format="number"
        />
        <MetricCard
          title="Avg. Open Rate"
          value={stats.openRate}
          icon={BarChart3}
          format="percent"
        />
        <MetricCard
          title="Avg. Click Rate"
          value={stats.clickRate}
          icon={MousePointer}
          format="percent"
        />
        <MetricCard
          title="Bounce Rate"
          value={stats.bounceRate}
          icon={AlertCircle}
          format="percent"
        />
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Status Distribution */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Newsletter Status Distribution</h2>
          {stats.statusBreakdown.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={stats.statusBreakdown}
                  dataKey="count"
                  nameKey="status"
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  label={(entry) => `${entry.status}: ${entry.count}`}
                >
                  {stats.statusBreakdown.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-64 flex items-center justify-center text-gray-400">
              No newsletter data available
            </div>
          )}
        </div>

        {/* Performance Trends */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Performance Trends (Last 7)</h2>
          {stats.trendsData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={stats.trendsData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip formatter={(value: number) => `${value.toFixed(1)}%`} />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="openRate"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  name="Open Rate"
                  dot={{ fill: '#3b82f6' }}
                />
                <Line
                  type="monotone"
                  dataKey="clickRate"
                  stroke="#10b981"
                  strokeWidth={2}
                  name="Click Rate"
                  dot={{ fill: '#10b981' }}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-64 flex items-center justify-center text-gray-400">
              No trend data available
            </div>
          )}
        </div>
      </div>

      {/* Top Performing Newsletters */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Top Performing Newsletters</h2>
        {stats.topPerformers.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-500 uppercase">Subject</th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-gray-500 uppercase">Sent</th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-gray-500 uppercase">Open Rate</th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-gray-500 uppercase">Click Rate</th>
                </tr>
              </thead>
              <tbody>
                {stats.topPerformers.map((newsletter, index) => (
                  <tr key={newsletter.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-4">
                      <div className="flex items-center">
                        <span className="flex items-center justify-center w-6 h-6 rounded-full bg-blue-100 text-blue-600 text-xs font-bold mr-3">
                          {index + 1}
                        </span>
                        <span className="font-medium text-gray-900 truncate max-w-md">
                          {newsletter.subject}
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-right text-gray-700">
                      {newsletter.sent.toLocaleString()}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        {newsletter.openRate.toFixed(1)}%
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        {newsletter.clickRate.toFixed(1)}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-12 text-center text-gray-400">
            No sent newsletters with stats available yet
          </div>
        )}
      </div>

      {/* Additional Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <p className="text-sm text-gray-500 font-medium uppercase mb-2">Click-to-Open Rate</p>
          <p className="text-2xl font-bold text-gray-900">{stats.clickToOpenRate.toFixed(1)}%</p>
          <p className="text-xs text-gray-500 mt-1">
            Of those who opened, {stats.clickToOpenRate.toFixed(1)}% clicked
          </p>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <p className="text-sm text-gray-500 font-medium uppercase mb-2">Total Opens</p>
          <p className="text-2xl font-bold text-gray-900">{stats.totalOpened.toLocaleString()}</p>
          <p className="text-xs text-gray-500 mt-1">
            Unique and repeat opens combined
          </p>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <p className="text-sm text-gray-500 font-medium uppercase mb-2">Total Clicks</p>
          <p className="text-2xl font-bold text-gray-900">{stats.totalClicked.toLocaleString()}</p>
          <p className="text-xs text-gray-500 mt-1">
            All link clicks across newsletters
          </p>
        </div>
      </div>
    </div>
  );
};
