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

  if (loading) return <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-amber-500"></div></div>;
  if (!report) return <div className="text-center py-12 text-gray-500">Report not found</div>;

  const pred = report.prediction;

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex items-center justify-between">
        <div>
          <button onClick={() => navigate(-1)} className="text-gray-500 hover:text-gray-900 text-sm mb-2">&larr; Back</button>
          <h1 className="text-2xl font-bold text-gray-900">Report: {report.report_id}</h1>
          {report.is_synthetic === 1 && (
            <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded mt-1 inline-block">SYNTHETIC DEMONSTRATION DATA</span>
          )}
        </div>
        <div className="flex gap-2">
          <button onClick={() => navigate('/hse-review')} className="bg-amber-500 hover:bg-amber-600 text-white font-semibold px-4 py-2 rounded-lg text-sm">
            Send to HSE Review
          </button>
        </div>
      </div>

      {/* Report Summary */}
      <div className="bg-white border border-gray-200 rounded-xl p-5">
        <h3 className="text-xs text-gray-500 mb-3">REPORT SUMMARY</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div><span className="text-gray-400">Date:</span> <span className="text-gray-700">{report.date}</span></div>
          <div><span className="text-gray-400">Location:</span> <span className="text-gray-700">{report.location}</span></div>
          <div><span className="text-gray-400">Asset:</span> <span className="text-gray-700">{report.asset}</span></div>
          <div><span className="text-gray-400">Department:</span> <span className="text-gray-700">{report.department}</span></div>
          <div><span className="text-gray-400">Activity:</span> <span className="text-gray-700">{report.activity}</span></div>
          <div><span className="text-gray-400">Type:</span> <span className="text-gray-700">{report.report_type}</span></div>
          <div><span className="text-gray-400">Reporter:</span> <span className="text-gray-700">{report.reporter_type}</span></div>
        </div>
      </div>

      {/* Original Report */}
      <div className="bg-white border border-gray-200 rounded-xl p-5">
        <h3 className="text-xs text-gray-500 mb-3">ORIGINAL REPORT</h3>
        <p className="text-sm text-gray-700 leading-relaxed bg-gray-50 p-4 rounded-lg">{report.raw_text}</p>
      </div>

      {pred && (
        <>
          {/* SIF Assessment */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white border border-gray-200 rounded-xl p-6 text-center">
              <div className="text-xs text-gray-500 mb-2">SIF POTENTIAL</div>
              <div className={`text-4xl font-bold ${pred.sif_probability >= 0.65 ? 'text-red-600' : pred.sif_probability >= 0.40 ? 'text-yellow-600' : 'text-green-600'}`}>
                {Math.round(pred.sif_probability * 100)}%
              </div>
              <div className="mt-2 text-sm text-gray-700">{pred.classification}</div>
            </div>
            <div className="bg-white border border-gray-200 rounded-xl p-6 text-center">
              <div className="text-xs text-gray-500 mb-2">PRIORITY</div>
              <div className={`inline-block px-4 py-2 rounded-lg border text-lg font-bold ${
                pred.priority === 'Critical' ? 'bg-red-50 text-red-600 border-red-200' :
                pred.priority === 'High' ? 'bg-orange-50 text-orange-600 border-orange-200' :
                pred.priority === 'Medium' ? 'bg-yellow-50 text-yellow-600 border-yellow-200' :
                'bg-green-50 text-green-600 border-green-200'
              }`}>{pred.priority}</div>
              <div className="mt-2 text-xs text-gray-500">Confidence: {Math.round(pred.confidence * 100)}%</div>
            </div>
            <div className="bg-white border border-gray-200 rounded-xl p-6">
              <div className="text-xs text-gray-500 mb-3">MODEL INFO</div>
              <div className="text-xs text-gray-500 space-y-1">
                <div>Version: <span className="text-gray-700">{pred.model_version}</span></div>
                <div>Analyzed: <span className="text-gray-700">{new Date(pred.created_at).toLocaleString()}</span></div>
              </div>
            </div>
          </div>

          {/* IOGP Rules */}
          <div className="bg-white border border-gray-200 rounded-xl p-5">
            <h3 className="text-xs text-gray-500 mb-3">IOGP LIFE-SAVING RULES</h3>
            <div className="space-y-2">
              {report.iogp_rules.map((rule: any, i: number) => (
                <div key={i}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-700">{rule.rule}</span>
                    <span className="text-amber-600 font-semibold">{Math.round(rule.probability * 100)}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div className="bg-amber-500 h-2 rounded-full transition-all" style={{ width: `${rule.probability * 100}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Hazards */}
          <div className="bg-white border border-gray-200 rounded-xl p-5">
            <h3 className="text-xs text-gray-500 mb-3">EXTRACTED INFORMATION</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <div className="text-xs text-gray-400 mb-2">Hazards</div>
                <div className="space-y-1">{[...new Set(report.hazards.map((h: any) => h.hazard))].map((h, i) => <span key={i} className="block bg-red-50 text-red-600 text-xs px-2 py-1 rounded">{h as string}</span>)}</div>
              </div>
              <div>
                <div className="text-xs text-gray-400 mb-2">Energy Sources</div>
                <div className="space-y-1">{[...new Set(report.hazards.map((h: any) => h.energy_source))].map((e, i) => <span key={i} className="block bg-orange-50 text-orange-600 text-xs px-2 py-1 rounded">{e as string}</span>)}</div>
              </div>
              <div>
                <div className="text-xs text-gray-400 mb-2">Exposure</div>
                <div className="space-y-1">{[...new Set(report.hazards.map((h: any) => h.exposure))].map((e, i) => <span key={i} className="block bg-yellow-50 text-yellow-600 text-xs px-2 py-1 rounded">{e as string}</span>)}</div>
              </div>
              <div>
                <div className="text-xs text-gray-400 mb-2">Consequences</div>
                <div className="space-y-1">{[...new Set(report.hazards.map((h: any) => h.potential_consequence))].map((c, i) => <span key={i} className="block bg-red-50 text-red-500 text-xs px-2 py-1 rounded">{c as string}</span>)}</div>
              </div>
            </div>
          </div>

          {/* Failed Controls */}
          <div className="bg-white border border-gray-200 rounded-xl p-5">
            <h3 className="text-xs text-gray-500 mb-3">FAILED / MISSING CONTROLS</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {report.controls.map((ctrl: any, i: number) => (
                <div key={i} className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2">
                  <span className="text-sm text-gray-700">{ctrl.control}</span>
                  <span className={`text-xs px-2 py-0.5 rounded ${
                    ctrl.status === 'Failed' ? 'bg-red-100 text-red-600' :
                    ctrl.status === 'Missing' ? 'bg-orange-100 text-orange-600' :
                    'bg-yellow-100 text-yellow-600'
                  }`}>{ctrl.status}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Evidence & Explanation */}
          <div className="bg-white border border-gray-200 rounded-xl p-5">
            <h3 className="text-xs text-gray-500 mb-3">WHY WAS THIS REPORT FLAGGED?</h3>
            <div className="mb-4 space-y-1">
              {pred.evidence?.map((ev: string, i: number) => (
                <div key={i} className="flex items-start gap-2 text-sm text-gray-700">
                  <span className="text-green-500 mt-0.5">&#10003;</span> <span>{ev}</span>
                </div>
              ))}
            </div>
            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="text-sm text-gray-700 leading-relaxed">{pred.explanation}</p>
            </div>
          </div>

          {/* HSE Review History */}
          {report.reviews.length > 0 && (
            <div className="bg-white border border-gray-200 rounded-xl p-5">
              <h3 className="text-xs text-gray-500 mb-3">HSE REVIEW HISTORY</h3>
              <div className="space-y-3">
                {report.reviews.map((rv: any) => (
                  <div key={rv.id} className="bg-gray-50 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-gray-900 font-medium">{rv.reviewer}</span>
                      <span className={`text-xs px-2 py-0.5 rounded ${rv.status === 'accepted' ? 'bg-green-100 text-green-600' : 'bg-orange-100 text-orange-600'}`}>
                        {rv.status}
                      </span>
                    </div>
                    <div className="text-xs text-gray-500">Decision: <span className="text-gray-700">{rv.final_sif_label}</span></div>
                    {rv.comments && <div className="text-xs text-gray-500 mt-1">Comments: <span className="text-gray-700">{rv.comments}</span></div>}
                    <div className="text-xs text-gray-400 mt-1">{new Date(rv.reviewed_at).toLocaleString()}</div>
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
