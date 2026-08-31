import { useState, useEffect } from 'react';
import { api } from '../api';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, CartesianGrid, Legend } from 'recharts';

const COLORS = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6', '#8b5cf6', '#ec4899', '#14b8a6'];

export default function AnalyticsPage() {
  const [data, setData] = useState<any>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.getSifDistribution(),
      api.getIogpDistribution(),
      api.getHazardDistribution(),
      api.getControlDistribution(),
      api.getLocationDistribution(),
      api.getActivityDistribution(),
      api.getAiHumanAgreement(),
      api.getSifTrend(),
    ]).then(([sif, iogp, hazards, controls, locations, activities, agreement, trend]) => {
      setData({ sif, iogp, hazards, controls, locations, activities, agreement, trend });
    }).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-amber-500"></div></div>;

  const sifData = data.sif?.distribution ? Object.entries(data.sif.distribution).map(([name, value]) => ({ name, value })) : [];
  const iogpData = data.iogp?.distribution ? Object.entries(data.iogp.distribution).map(([name, value]) => ({ name: (name as string).substring(0, 20), value })).sort((a, b) => (b.value as number) - (a.value as number)) : [];
  const hazardData = data.hazards?.distribution ? Object.entries(data.hazards.distribution).map(([name, value]) => ({ name, value })).sort((a, b) => (b.value as number) - (a.value as number)).slice(0, 10) : [];
  const locationData = data.locations?.distribution ? Object.entries(data.locations.distribution).map(([name, value]) => ({ name, value })) : [];
  const activityData = data.activities?.distribution ? Object.entries(data.activities.distribution).map(([name, value]) => [name, value as number] as [string, number]).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([name, value]) => ({ name, value })) : [];
  const agreement = data.agreement || {};

  const trendData = data.trend?.trend ? Object.entries(data.trend.trend).map(([month, vals]: [string, any]) => ({
    month,
    critical: vals.critical,
    high: vals.high,
    medium: vals.medium,
    low: vals.low,
  })) : [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Analytics</h1>
        <p className="text-sm text-gray-500 mt-1">Safety intelligence analytics and trends</p>
      </div>

      <div className="bg-blue-50 border border-blue-200 text-blue-700 text-xs px-4 py-2 rounded-lg">
        SYNTHETIC DEMONSTRATION DATA — NOT ACTUAL OIL INCIDENT RECORDS
      </div>

      {/* AI vs Human Agreement */}
      <div className="bg-white border border-gray-200 rounded-xl p-5">
        <h3 className="text-sm font-semibold text-gray-900 mb-3">AI vs Human Agreement</h3>
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-green-50 rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-green-600">{agreement.accepted || 0}</div>
            <div className="text-xs text-gray-500">Accepted</div>
          </div>
          <div className="bg-orange-50 rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-orange-600">{agreement.overridden || 0}</div>
            <div className="text-xs text-gray-500">Overridden</div>
          </div>
          <div className="bg-yellow-50 rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-yellow-600">{agreement.needs_review || 0}</div>
            <div className="text-xs text-gray-500">Needs Review</div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* SIF Distribution */}
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">SIF Potential Distribution</h3>
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie data={sifData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label={({ name, percent }) => `${(name as string).substring(0, 15)} ${((percent ?? 0) * 100).toFixed(0)}%`}>
                {sifData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip contentStyle={{ background: '#ffffff', border: '1px solid #e5e7eb', borderRadius: 8 }} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* SIF Trend */}
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">SIF Trend Over Time</h3>
          {trendData.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="month" tick={{ fill: '#6b7280', fontSize: 11 }} />
                <YAxis tick={{ fill: '#6b7280', fontSize: 11 }} />
                <Tooltip contentStyle={{ background: '#ffffff', border: '1px solid #e5e7eb', borderRadius: 8 }} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Line type="monotone" dataKey="critical" stroke="#ef4444" strokeWidth={2} name="Critical" />
                <Line type="monotone" dataKey="high" stroke="#f97316" strokeWidth={2} name="High" />
                <Line type="monotone" dataKey="medium" stroke="#eab308" strokeWidth={2} name="Medium" />
                <Line type="monotone" dataKey="low" stroke="#22c55e" strokeWidth={2} name="Low" />
              </LineChart>
            </ResponsiveContainer>
          ) : <div className="h-[280px] flex items-center justify-center text-gray-400 text-sm">No trend data</div>}
        </div>

        {/* IOGP Rules */}
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">IOGP Rule Distribution</h3>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={iogpData}>
              <XAxis dataKey="name" tick={{ fill: '#6b7280', fontSize: 10 }} angle={-20} textAnchor="end" height={60} />
              <YAxis tick={{ fill: '#6b7280', fontSize: 11 }} />
              <Tooltip contentStyle={{ background: '#ffffff', border: '1px solid #e5e7eb', borderRadius: 8 }} />
              <Bar dataKey="value" fill="#f59e0b" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Top Hazards */}
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">Top Hazards</h3>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={hazardData} layout="vertical">
              <XAxis type="number" tick={{ fill: '#6b7280', fontSize: 11 }} />
              <YAxis dataKey="name" type="category" width={120} tick={{ fill: '#6b7280', fontSize: 11 }} />
              <Tooltip contentStyle={{ background: '#ffffff', border: '1px solid #e5e7eb', borderRadius: 8 }} />
              <Bar dataKey="value" fill="#ef4444" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Reports by Location */}
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">Reports by Location</h3>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={locationData}>
              <XAxis dataKey="name" tick={{ fill: '#6b7280', fontSize: 10 }} angle={-15} textAnchor="end" height={60} />
              <YAxis tick={{ fill: '#6b7280', fontSize: 11 }} />
              <Tooltip contentStyle={{ background: '#ffffff', border: '1px solid #e5e7eb', borderRadius: 8 }} />
              <Bar dataKey="value" fill="#3b82f6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Reports by Activity */}
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">Reports by Activity</h3>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={activityData} layout="vertical">
              <XAxis type="number" tick={{ fill: '#6b7280', fontSize: 11 }} />
              <YAxis dataKey="name" type="category" width={120} tick={{ fill: '#6b7280', fontSize: 11 }} />
              <Tooltip contentStyle={{ background: '#ffffff', border: '1px solid #e5e7eb', borderRadius: 8 }} />
              <Bar dataKey="value" fill="#8b5cf6" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
