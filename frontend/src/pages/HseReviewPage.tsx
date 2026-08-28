import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';

export default function HseReviewPage() {
  const [pending, setPending] = useState<any[]>([]);
  const [reviews, setReviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedReport, setSelectedReport] = useState<any>(null);
  const [reviewForm, setReviewForm] = useState({ final_sif_label: '', final_iogp_rules: [] as string[], comments: '' });
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState('');

  const loadData = async () => {
    setLoading(true);
    try {
      const [p, r] = await Promise.all([api.getPendingReviews(), api.getReviews()]);
      setPending(p);
      setReviews(r);
    } catch { }
    setLoading(false);
  };

  useEffect(() => { loadData(); }, []);

  const handleReview = async () => {
    if (!selectedReport) return;
    setSubmitting(true);
    setMessage('');
    try {
      await api.createReview({
        report_id: selectedReport.report_id,
        reviewer: 'HSE Analyst',
        ...reviewForm,
      });
      setMessage('Review submitted successfully');
      setSelectedReport(null);
      setReviewForm({ final_sif_label: '', final_iogp_rules: [], comments: '' });
      loadData();
    } catch (err: any) {
      setMessage(err.message || 'Failed to submit review');
    }
    setSubmitting(false);
  };

  const sifLabels = ['Critical SIF Potential', 'High SIF Potential', 'Review Required', 'Lower SIF Potential'];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">HSE Review</h1>
        <p className="text-sm text-gray-400 mt-1">Review and validate AI-assisted classifications</p>
      </div>

      {message && (
        <div className={`text-sm px-4 py-2 rounded-lg ${message.includes('success') ? 'bg-green-500/10 border border-green-500/20 text-green-400' : 'bg-red-500/10 border border-red-500/20 text-red-400'}`}>
          {message}
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-amber-400"></div></div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Pending Reviews */}
          <div className="space-y-3">
            <h2 className="text-sm font-semibold text-white">Pending Review ({pending.length})</h2>
            {pending.length === 0 ? (
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-8 text-center">
                <div className="text-3xl mb-3">✅</div>
                <p className="text-sm text-gray-400">All reports have been reviewed</p>
              </div>
            ) : (
              pending.map((r) => (
                <div
                  key={r.report_id}
                  onClick={() => { setSelectedReport(r); setReviewForm({ final_sif_label: r.prediction?.classification || '', final_iogp_rules: [], comments: '' }); }}
                  className={`bg-gray-900 border rounded-xl p-4 cursor-pointer transition-colors ${
                    selectedReport?.report_id === r.report_id ? 'border-amber-500 bg-amber-500/5' : 'border-gray-800 hover:border-gray-700'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-amber-400 font-mono text-xs">{r.report_id}</span>
                    <span className={`text-xs px-2 py-0.5 rounded ${
                      r.prediction?.priority === 'Critical' ? 'bg-red-500/20 text-red-400' :
                      r.prediction?.priority === 'High' ? 'bg-orange-500/20 text-orange-400' :
                      'bg-yellow-500/20 text-yellow-400'
                    }`}>{r.prediction?.priority}</span>
                  </div>
                  <p className="text-xs text-gray-400 line-clamp-2">{r.raw_text}</p>
                  <div className="mt-2 flex items-center gap-3 text-xs text-gray-500">
                    <span>{r.location}</span>
                    <span>SIF: {r.prediction ? Math.round(r.prediction.sif_probability * 100) : 0}%</span>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Review Form */}
          <div className="space-y-3">
            <h2 className="text-sm font-semibold text-white">Review Decision</h2>
            {selectedReport ? (
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-4">
                <div className="bg-gray-800 p-3 rounded-lg">
                  <div className="text-xs text-gray-500 mb-1">Report Text</div>
                  <p className="text-sm text-gray-300">{selectedReport.raw_text}</p>
                </div>

                <div className="bg-gray-800 p-3 rounded-lg">
                  <div className="text-xs text-gray-500 mb-1">AI Prediction</div>
                  <div className="flex items-center gap-4">
                    <span className="text-sm text-gray-300">Classification: <span className="text-amber-400">{selectedReport.prediction?.classification}</span></span>
                    <span className="text-sm text-gray-300">SIF: <span className="text-amber-400">{Math.round((selectedReport.prediction?.sif_probability || 0) * 100)}%</span></span>
                  </div>
                </div>

                <div>
                  <label className="block text-xs text-gray-400 mb-1.5">Expert Decision — SIF Classification</label>
                  <select
                    value={reviewForm.final_sif_label}
                    onChange={(e) => setReviewForm({ ...reviewForm, final_sif_label: e.target.value })}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm"
                  >
                    {sifLabels.map(l => <option key={l} value={l}>{l}</option>)}
                  </select>
                </div>

                <div>
                  <label className="block text-xs text-gray-400 mb-1.5">Comments</label>
                  <textarea
                    value={reviewForm.comments}
                    onChange={(e) => setReviewForm({ ...reviewForm, comments: e.target.value })}
                    rows={3}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm resize-none focus:outline-none focus:border-amber-500"
                    placeholder="Enter review comments..."
                  />
                </div>

                {reviewForm.final_sif_label !== selectedReport.prediction?.classification && (
                  <div className="bg-orange-500/10 border border-orange-500/20 text-orange-400 text-xs px-3 py-2 rounded-lg">
                    ⚠️ This will be recorded as a Human Override of the AI prediction
                  </div>
                )}

                <div className="flex gap-2">
                  <button
                    onClick={handleReview}
                    disabled={submitting}
                    className="bg-amber-500 hover:bg-amber-600 text-gray-900 font-semibold px-4 py-2 rounded-lg text-sm disabled:opacity-50"
                  >
                    {submitting ? 'Submitting...' : 'Submit Review'}
                  </button>
                  <button onClick={() => setSelectedReport(null)} className="bg-gray-800 text-gray-400 px-4 py-2 rounded-lg text-sm hover:text-white">
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-8 text-center">
                <div className="text-3xl mb-3">👈</div>
                <p className="text-sm text-gray-400">Select a report to review</p>
              </div>
            )}

            {/* Completed Reviews */}
            {reviews.length > 0 && (
              <div className="mt-4">
                <h3 className="text-xs text-gray-400 mb-2">Recent Reviews ({reviews.length})</h3>
                <div className="space-y-2 max-h-60 overflow-auto">
                  {reviews.slice(0, 10).map((rv) => (
                    <div key={rv.id} className="bg-gray-900 border border-gray-800 rounded-lg p-3">
                      <div className="flex items-center justify-between">
                        <Link to={`/reports/${rv.report_id}`} className="text-amber-400 text-xs hover:underline">{rv.report_id}</Link>
                        <span className={`text-xs px-2 py-0.5 rounded ${rv.status === 'accepted' ? 'bg-green-500/20 text-green-400' : 'bg-orange-500/20 text-orange-400'}`}>{rv.status}</span>
                      </div>
                      <div className="text-xs text-gray-400 mt-1">Decision: {rv.final_sif_label}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
