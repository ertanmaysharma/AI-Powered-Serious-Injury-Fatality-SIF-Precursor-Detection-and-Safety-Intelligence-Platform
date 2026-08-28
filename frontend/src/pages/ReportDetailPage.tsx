import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../api';

export default function ReportDetailPage() {
  const { reportId } = useParams();
  const navigate = useNavigate();
  const [report, setReport] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (reportId) {
      api.getReport(reportId).then(setReport).finally(() => setLoading(false));
    }
  }, [reportId]);

  if (loading) return <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-amber-400"></div></div>;
  if (!report) return <div className="text-center py-12 text-gray-400">Report not found</div>;

  const pred = report.prediction;

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex items-center justify-between">
        <div>
          <button onClick={() => navigate(-1)} className="text-gray-400 hover:text-white text-sm mb-2">← Back</button>
          <h1 className="text-2xl font-bold text-white">Report: {report.report_id}</h1>
          {report.is_synthetic === 1 && (
            <span className="text-xs bg-blue-500/10 text-blue-400 px-2 py-0.5 rounded mt-1 inline-block">SYNTHETIC DEMONSTRATION DATA</span>
          )}
        </div>
        <div className="flex gap-2">
          <button onClick={() => navigate('/hse-review')} className="bg-amber-500 hover:bg-amber-600 text-gray-900 font-semibold px-4 py-2 rounded-lg text-sm">
            Send to HSE Review
          </button>
        </div>
      </div>

      {/* Report Summary */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
        <h3 className="text-xs text-gray-400 mb-3">REPORT SUMMARY</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div><span className="text-gray-500">Date:</span> <span className="text-gray-300">{report.date}</span></div>
          <div><span className="text-gray-500">Location:</span> <span className="text-gray-300">{report.location}</span></div>
          <div><span className="text-gray-500">Asset:</span> <span className="text-gray-300">{report.asset}</span></div>
          <div><span className="text-gray-500">Department:</span> <span className="text-gray-300">{report.department}</span></div>
          <div><span className="text-gray-500">Activity:</span> <span className="text-gray-300">{report.activity}</span></div>
          <div><span className="text-gray-500">Type:</span> <span className="text-gray-300">{report.report_type}</span></div>
          <div><span className="text-gray-500">Reporter:</span> <span className="text-gray-300">{report.reporter_type}</span></div>
        </div>
      </div>

      {/* Original Report */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
        <h3 className="text-xs text-gray-400 mb-3">ORIGINAL REPORT</h3>
        <p className="text-sm text-gray-300 leading-relaxed bg-gray-800 p-4 rounded-lg">{report.raw_text}</p>
      </div>

      {pred && (
        <>
          {/* SIF Assessment */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 text-center">
              <div className="text-xs text-gray-400 mb-2">SIF POTENTIAL</div>
              <div className={`text-4xl font-bold ${pred.sif_probability >= 0.65 ? 'text-red-400' : pred.sif_probability >= 0.40 ? 'text-yellow-400' : 'text-green-400'}`}>
                {Math.round(pred.sif_probability * 100)}%
              </div>
              <div className="mt-2 text-sm text-gray-300">{pred.classification}</div>
            </div>
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 text-center">
              <div className="text-xs text-gray-400 mb-2">PRIORITY</div>
              <div className={`inline-block px-4 py-2 rounded-lg border text-lg font-bold ${
                pred.priority === 'Critical' ? 'bg-red-500/20 text-red-400 border-red-500/30' :
                pred.priority === 'High' ? 'bg-orange-500/20 text-orange-400 border-orange-500/30' :
                pred.priority === 'Medium' ? 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' :
                'bg-green-500/20 text-green-400 border-green-500/30'
              }`}>{pred.priority}</div>
              <div className="mt-2 text-xs text-gray-400">Confidence: {Math.round(pred.confidence * 100)}%</div>
            </div>
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
              <div className="text-xs text-gray-400 mb-3">MODEL INFO</div>
              <div className="text-xs text-gray-400 space-y-1">
                <div>Version: <span className="text-gray-300">{pred.model_version}</span></div>
                <div>Analyzed: <span className="text-gray-300">{new Date(pred.created_at).toLocaleString()}</span></div>
              </div>
            </div>
          </div>

          {/* IOGP Rules */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
            <h3 className="text-xs text-gray-400 mb-3">IOGP LIFE-SAVING RULES</h3>
            <div className="space-y-2">
              {report.iogp_rules.map((rule: any, i: number) => (
                <div key={i}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-300">{rule.rule}</span>
                    <span className="text-amber-400 font-semibold">{Math.round(rule.probability * 100)}%</span>
                  </div>
                  <div className="w-full bg-gray-800 rounded-full h-2">
                    <div className="bg-amber-500 h-2 rounded-full transition-all" style={{ width: `${rule.probability * 100}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Hazards */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
            <h3 className="text-xs text-gray-400 mb-3">EXTRACTED INFORMATION</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <div className="text-xs text-gray-500 mb-2">Hazards</div>
                <div className="space-y-1">{[...new Set(report.hazards.map((h: any) => h.hazard))].map((h, i) => <span key={i} className="block bg-red-500/10 text-red-400 text-xs px-2 py-1 rounded">{h as string}</span>)}</div>
              </div>
              <div>
                <div className="text-xs text-gray-500 mb-2">Energy Sources</div>
                <div className="space-y-1">{[...new Set(report.hazards.map((h: any) => h.energy_source))].map((e, i) => <span key={i} className="block bg-orange-500/10 text-orange-400 text-xs px-2 py-1 rounded">{e as string}</span>)}</div>
              </div>
              <div>
                <div className="text-xs text-gray-500 mb-2">Exposure</div>
                <div className="space-y-1">{[...new Set(report.hazards.map((h: any) => h.exposure))].map((e, i) => <span key={i} className="block bg-yellow-500/10 text-yellow-400 text-xs px-2 py-1 rounded">{e as string}</span>)}</div>
              </div>
              <div>
                <div className="text-xs text-gray-500 mb-2">Consequences</div>
                <div className="space-y-1">{[...new Set(report.hazards.map((h: any) => h.potential_consequence))].map((c, i) => <span key={i} className="block bg-red-500/10 text-red-300 text-xs px-2 py-1 rounded">{c as string}</span>)}</div>
              </div>
            </div>
          </div>

          {/* Failed Controls */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
            <h3 className="text-xs text-gray-400 mb-3">FAILED / MISSING CONTROLS</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {report.controls.map((ctrl: any, i: number) => (
                <div key={i} className="flex items-center justify-between bg-gray-800 rounded-lg px-3 py-2">
                  <span className="text-sm text-gray-300">{ctrl.control}</span>
                  <span className={`text-xs px-2 py-0.5 rounded ${
                    ctrl.status === 'Failed' ? 'bg-red-500/20 text-red-400' :
                    ctrl.status === 'Missing' ? 'bg-orange-500/20 text-orange-400' :
                    'bg-yellow-500/20 text-yellow-400'
                  }`}>{ctrl.status}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Evidence & Explanation */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
            <h3 className="text-xs text-gray-400 mb-3">WHY WAS THIS REPORT FLAGGED?</h3>
            <div className="mb-4 space-y-1">
              {pred.evidence?.map((ev: string, i: number) => (
                <div key={i} className="flex items-start gap-2 text-sm text-gray-300">
                  <span className="text-green-400 mt-0.5">✓</span> <span>{ev}</span>
                </div>
              ))}
            </div>
            <div className="bg-gray-800 p-4 rounded-lg">
              <p className="text-sm text-gray-300 leading-relaxed">{pred.explanation}</p>
            </div>
          </div>

          {/* HSE Review History */}
          {report.reviews.length > 0 && (
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
              <h3 className="text-xs text-gray-400 mb-3">HSE REVIEW HISTORY</h3>
              <div className="space-y-3">
                {report.reviews.map((rv: any) => (
                  <div key={rv.id} className="bg-gray-800 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-white font-medium">{rv.reviewer}</span>
                      <span className={`text-xs px-2 py-0.5 rounded ${rv.status === 'accepted' ? 'bg-green-500/20 text-green-400' : 'bg-orange-500/20 text-orange-400'}`}>
                        {rv.status}
                      </span>
                    </div>
                    <div className="text-xs text-gray-400">Decision: <span className="text-gray-300">{rv.final_sif_label}</span></div>
                    {rv.comments && <div className="text-xs text-gray-400 mt-1">Comments: <span className="text-gray-300">{rv.comments}</span></div>}
                    <div className="text-xs text-gray-500 mt-1">{new Date(rv.reviewed_at).toLocaleString()}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
