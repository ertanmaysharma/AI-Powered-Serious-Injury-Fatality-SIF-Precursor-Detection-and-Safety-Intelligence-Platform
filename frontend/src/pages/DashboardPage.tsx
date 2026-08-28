import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

const COLORS = ['#ef4444', '#f97316', '#eab308', '#22c55e'];

export default function DashboardPage() {
  const [stats, setStats] = useState<any>(null);
  const [sifDist, setSifDist] = useState<any>(null);
  const [iogpDist, setIogpDist] = useState<any>(null);
  const [insights, setInsights] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.getDashboard(),
      api.getSifDistribution(),
      api.getIogpDistribution(),
      api.getInsights(),
    ]).then(([s, si, ig, ins]) => {
      setStats(s);
      setSifDist(si);
      setIogpDist(ig);
      setInsights(ins.insights || []);
    }).finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingState />;

  const kpis = [
    { label: 'Total Reports', value: stats?.total_reports || 0, color: 'text-blue-400', bg: 'bg-blue-500/10', icon: '📋' },
    { label: 'SIF-Potential Reports', value: stats?.sif_potential_reports || 0, color: 'text-amber-400', bg: 'bg-amber-500/10', icon: '⚠️' },
    { label: 'Critical Reports', value: stats?.critical_reports || 0, color: 'text-red-400', bg: 'bg-red-500/10', icon: '🚨' },
    { label: 'High Priority', value: stats?.high_priority_reports || 0, color: 'text-orange-400', bg: 'bg-orange-500/10', icon: '🔶' },
    { label: 'Awaiting Review', value: stats?.awaiting_review || 0, color: 'text-yellow-400', bg: 'bg-yellow-500/10', icon: '⏳' },
    { label: 'Reviewed Reports', value: stats?.reviewed_reports || 0, color: 'text-green-400', bg: 'bg-green-500/10', icon: '✅' },
    { label: 'Actions Open', value: stats?.corrective_actions_open || 0, color: 'text-orange-400', bg: 'bg-orange-500/10', icon: '📂' },
    { label: 'Actions Closed', value: stats?.corrective_actions_closed || 0, color: 'text-green-400', bg: 'bg-green-500/10', icon: '📁' },
  ];

  const sifChartData = sifDist?.distribution ? Object.entries(sifDist.distribution).map(([name, value]) => ({ name, value })) : [];
  const iogpChartData = iogpDist?.distribution ? Object.entries(iogpDist.distribution).map(([name, value]) => [name, value as number] as [string, number]).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([name, value]) => ({ name, value })) : [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Dashboard</h1>
          <p className="text-sm text-gray-400 mt-1">SIF-GUARD Safety Intelligence Overview</p>
        </div>
        <Link
          to="/analyze"
          className="bg-amber-500 hover:bg-amber-600 text-gray-900 font-semibold px-4 py-2 rounded-lg text-sm"
        >
          + Analyze Report
        </Link>
      </div>

      {/* Demo data notice */}
      <div className="bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs px-4 py-2 rounded-lg">
        📊 SYNTHETIC DEMONSTRATION DATA — NOT ACTUAL OIL INCIDENT RECORDS
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {kpis.map((kpi, i) => (
          <div key={i} className={`${kpi.bg} border border-gray-800 rounded-xl p-4`}>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-lg">{kpi.icon}</span>
              <span className="text-xs text-gray-400">{kpi.label}</span>
            </div>
            <div className={`text-2xl font-bold ${kpi.color}`}>{kpi.value.toLocaleString()}</div>
          </div>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* SIF Distribution */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <h3 className="text-sm font-semibold text-white mb-4">SIF Potential Distribution</h3>
          {sifChartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie data={sifChartData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}>
                  {sifChartData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          ) : <EmptyChart />}
        </div>

        {/* IOGP Rules */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <h3 className="text-sm font-semibold text-white mb-4">IOGP Rule Distribution</h3>
          {iogpChartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={iogpChartData} layout="vertical">
                <XAxis type="number" tick={{ fill: '#9ca3af', fontSize: 11 }} />
                <YAxis dataKey="name" type="category" width={130} tick={{ fill: '#9ca3af', fontSize: 11 }} />
                <Tooltip contentStyle={{ background: '#1f2937', border: '1px solid #374151', borderRadius: 8 }} />
                <Bar dataKey="value" fill="#f59e0b" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : <EmptyChart />}
        </div>
      </div>

      {/* Insights */}
      {insights.length > 0 && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <h3 className="text-sm font-semibold text-white mb-4">🔑 Key Safety Insights</h3>
          <div className="space-y-2">
            {insights.map((insight: any, i: number) => (
              <div key={i} className={`flex items-start gap-3 px-4 py-3 rounded-lg ${
                insight.severity === 'critical' ? 'bg-red-500/10 border border-red-500/20' :
                insight.severity === 'warning' ? 'bg-amber-500/10 border border-amber-500/20' :
                'bg-blue-500/10 border border-blue-500/20'
              }`}>
                <span className="text-sm mt-0.5">
                  {insight.severity === 'critical' ? '🚨' : insight.severity === 'warning' ? '⚠️' : 'ℹ️'}
                </span>
                <p className="text-sm text-gray-300">{insight.message}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function LoadingState() {
  return (
    <div className="flex items-center justify-center h-64">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-400 mx-auto mb-4"></div>
        <p className="text-sm text-gray-400">Loading dashboard...</p>
      </div>
    </div>
  );
}

function EmptyChart() {
  return (
    <div className="h-[250px] flex items-center justify-center text-gray-500 text-sm">
      No data available
    </div>
  );
}
