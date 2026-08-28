import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';

const PRIORITY_COLORS: Record<string, string> = {
  Critical: 'bg-red-500/20 text-red-400',
  High: 'bg-orange-500/20 text-orange-400',
  Medium: 'bg-yellow-500/20 text-yellow-400',
  Low: 'bg-green-500/20 text-green-400',
};

export default function ReportsPage() {
  const [reports, setReports] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [showFilters, setShowFilters] = useState(false);

  const loadReports = async (params?: Record<string, string>) => {
    setLoading(true);
    try {
      const data = await api.getReports({ limit: '50', ...params });
      setReports(data.reports);
      setTotal(data.total);
    } catch { }
    setLoading(false);
  };

  useEffect(() => { loadReports(); }, []);

  const handleSearch = () => {
    const params: Record<string, string> = {};
    if (search) params.search = search;
    Object.entries(filters).forEach(([k, v]) => { if (v) params[k] = v; });
    loadReports(params);
  };

  const handleFilterChange = (key: string, value: string) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);
  };

  const applyFilters = () => {
    const params: Record<string, string> = {};
    if (search) params.search = search;
    Object.entries(filters).forEach(([k, v]) => { if (v) params[k] = v; });
    loadReports(params);
  };

  const clearFilters = () => {
    setFilters({});
    setSearch('');
    loadReports();
  };

  const exportCsv = async () => {
    const blob = await api.exportCsv();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'sifguard_export.csv'; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Safety Reports</h1>
          <p className="text-sm text-gray-400 mt-1">{total} reports total</p>
        </div>
        <div className="flex gap-2">
          <button onClick={exportCsv} className="bg-gray-800 border border-gray-700 text-gray-300 px-3 py-2 rounded-lg text-sm hover:text-white">
            📥 Export CSV
          </button>
          <Link to="/analyze" className="bg-amber-500 hover:bg-amber-600 text-gray-900 font-semibold px-4 py-2 rounded-lg text-sm">
            + New Report
          </Link>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 space-y-3">
        <div className="flex gap-3">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            placeholder="Search reports by text (e.g., isolation, confined space, gas testing...)"
            className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white text-sm focus:outline-none focus:border-amber-500"
          />
          <button onClick={handleSearch} className="bg-amber-500 hover:bg-amber-600 text-gray-900 font-semibold px-4 py-2 rounded-lg text-sm">
            Search
          </button>
          <button onClick={() => setShowFilters(!showFilters)} className="bg-gray-800 border border-gray-700 text-gray-300 px-4 py-2 rounded-lg text-sm hover:text-white">
            {showFilters ? 'Hide Filters' : 'Filters'}
          </button>
        </div>

        {showFilters && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-2 border-t border-gray-800">
            <select value={filters.sif_classification || ''} onChange={(e) => handleFilterChange('sif_classification', e.target.value)} className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-xs">
              <option value="">SIF Classification</option>
              <option value="Critical SIF Potential">Critical SIF Potential</option>
              <option value="High SIF Potential">High SIF Potential</option>
              <option value="Review Required">Review Required</option>
              <option value="Lower SIF Potential">Lower SIF Potential</option>
            </select>
            <select value={filters.priority || ''} onChange={(e) => handleFilterChange('priority', e.target.value)} className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-xs">
              <option value="">Priority</option>
              <option value="Critical">Critical</option>
              <option value="High">High</option>
              <option value="Medium">Medium</option>
              <option value="Low">Low</option>
            </select>
            <select value={filters.location || ''} onChange={(e) => handleFilterChange('location', e.target.value)} className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-xs">
              <option value="">Location</option>
              <option value="Asset A">Asset A</option>
              <option value="Asset B">Asset B</option>
              <option value="Asset C">Asset C</option>
            </select>
            <select value={filters.report_type || ''} onChange={(e) => handleFilterChange('report_type', e.target.value)} className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-xs">
              <option value="">Report Type</option>
              <option value="Unsafe Act">Unsafe Act</option>
              <option value="Unsafe Condition">Unsafe Condition</option>
              <option value="Near Miss">Near Miss</option>
            </select>
            <div className="col-span-2 md:col-span-4 flex gap-2">
              <button onClick={applyFilters} className="bg-amber-500 text-gray-900 font-semibold px-4 py-1.5 rounded-lg text-xs">Apply Filters</button>
              <button onClick={clearFilters} className="bg-gray-800 text-gray-400 px-4 py-1.5 rounded-lg text-xs hover:text-white">Clear All</button>
            </div>
          </div>
        )}
      </div>

      {/* Reports Table */}
      {loading ? (
        <div className="flex items-center justify-center h-40">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-amber-400"></div>
        </div>
      ) : reports.length === 0 ? (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-12 text-center">
          <div className="text-4xl mb-4">📋</div>
          <h3 className="text-lg font-semibold text-white mb-2">No reports found</h3>
          <p className="text-sm text-gray-400">Upload a safety report to begin AI-assisted screening.</p>
        </div>
      ) : (
        <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-800 text-left">
                <th className="px-4 py-3 text-xs text-gray-400 font-medium">Report ID</th>
                <th className="px-4 py-3 text-xs text-gray-400 font-medium">Date</th>
                <th className="px-4 py-3 text-xs text-gray-400 font-medium">Location</th>
                <th className="px-4 py-3 text-xs text-gray-400 font-medium">Activity</th>
                <th className="px-4 py-3 text-xs text-gray-400 font-medium">SIF</th>
                <th className="px-4 py-3 text-xs text-gray-400 font-medium">Priority</th>
                <th className="px-4 py-3 text-xs text-gray-400 font-medium">Review</th>
                <th className="px-4 py-3 text-xs text-gray-400 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {reports.map((r) => (
                <tr key={r.report_id} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                  <td className="px-4 py-3 text-amber-400 font-mono text-xs">{r.report_id}</td>
                  <td className="px-4 py-3 text-gray-300 text-xs">{r.date}</td>
                  <td className="px-4 py-3 text-gray-300 text-xs">{r.location}</td>
                  <td className="px-4 py-3 text-gray-300 text-xs">{r.activity}</td>
                  <td className="px-4 py-3 text-xs">
                    {r.prediction ? (
                      <span className={`font-semibold ${r.prediction.sif_probability >= 0.65 ? 'text-red-400' : r.prediction.sif_probability >= 0.40 ? 'text-yellow-400' : 'text-green-400'}`}>
                        {Math.round(r.prediction.sif_probability * 100)}%
                      </span>
                    ) : <span className="text-gray-600">—</span>}
                  </td>
                  <td className="px-4 py-3">
                    {r.prediction?.priority && (
                      <span className={`text-xs px-2 py-0.5 rounded ${PRIORITY_COLORS[r.prediction.priority] || 'bg-gray-800 text-gray-400'}`}>
                        {r.prediction.priority}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded ${
                      r.review_status === 'accepted' ? 'bg-green-500/20 text-green-400' :
                      r.review_status === 'overridden' ? 'bg-orange-500/20 text-orange-400' :
                      'bg-gray-700 text-gray-400'
                    }`}>
                      {r.review_status === 'pending' ? 'Pending' : r.review_status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <Link to={`/reports/${r.report_id}`} className="text-amber-400 hover:underline text-xs">View →</Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
