import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';

import { api } from '../api';

export default function AnalyzeReportPage() {
  const [mode, setMode] = useState<'single' | 'batch'>('single');
  const [text, setText] = useState('');
  const [form, setForm] = useState({ report_id: '', date: '', location: '', asset: '', department: '', activity: '', report_type: '', reporter_type: '' });
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [batchResult, setBatchResult] = useState<any>(null);
  const [batchFile, setBatchFile] = useState<File | null>(null);
  const [error, setError] = useState('');
  const [analyzingSteps, setAnalyzingSteps] = useState<string[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);

  const steps = [
    'Detecting hazards',
    'Evaluating SIF potential',
    'Mapping Life-Saving Rules',
    'Identifying energy sources',
    'Detecting control failures',
    'Generating evidence',
    'Building explanation',
  ];

  const handleAnalyze = async () => {
    if (!text.trim() || text.trim().length < 10) {
      setError('Report text must be at least 10 characters');
      return;
    }
    setError('');
    setAnalyzing(true);
    setResult(null);

    // Simulate processing steps
    for (let i = 0; i < steps.length; i++) {
      await new Promise(r => setTimeout(r, 200 + Math.random() * 300));
      setAnalyzingSteps(prev => [...prev, steps[i]]);
    }

    try {
      const res = await api.analyzeText({ ...form, raw_text: text });
      setResult(res);
    } catch (err: any) {
      setError(err.message || 'Analysis failed');
    } finally {
      setAnalyzing(false);
      setAnalyzingSteps([]);
    }
  };

  const handleBatchUpload = async () => {
    if (!batchFile) { setError('Please select a CSV file'); return; }
    setError('');
    setAnalyzing(true);
    setBatchResult(null);
    try {
      const res = await api.batchUpload(batchFile);
      setBatchResult(res);
    } catch (err: any) {
      setError(err.message || 'Upload failed');
    } finally {
      setAnalyzing(false);
    }
  };

  const downloadSample = async () => {
    const blob = await api.downloadSampleCsv();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'sifguard_sample_template.csv'; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Analyze Report</h1>
        <p className="text-sm text-gray-500 mt-1">Submit a safety report for AI-assisted SIF screening</p>
      </div>

      {/* Mode Toggle */}
      <div className="flex gap-2">
        <button onClick={() => setMode('single')} className={`px-4 py-2 rounded-lg text-sm font-medium ${mode === 'single' ? 'bg-amber-500 text-white' : 'bg-gray-100 text-gray-600 hover:text-gray-900'}`}>
          Single Report
        </button>
        <button onClick={() => setMode('batch')} className={`px-4 py-2 rounded-lg text-sm font-medium ${mode === 'batch' ? 'bg-amber-500 text-white' : 'bg-gray-100 text-gray-600 hover:text-gray-900'}`}>
          Batch Upload (CSV)
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-600 text-sm px-4 py-3 rounded-lg">{error}</div>
      )}

      {mode === 'single' ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Input Form */}
          <div className="lg:col-span-2 space-y-4">
            <div className="bg-white border border-gray-200 rounded-xl p-5">
              <label className="block text-sm font-medium text-gray-700 mb-2">Safety Report Text *</label>
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                rows={8}
                className="w-full bg-gray-50 border border-gray-300 rounded-lg px-4 py-3 text-gray-900 text-sm focus:outline-none focus:border-amber-500 resize-none"
                placeholder={"Paste your safety report text here...\n\nExample: During maintenance of a high-pressure hydrocarbon pump, the contractor opened the flange before verifying zero-energy isolation..."}
              />
            </div>

            <div className="bg-white border border-gray-200 rounded-xl p-5">
              <h3 className="text-sm font-medium text-gray-700 mb-3">Additional Information (Optional)</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {Object.entries(form).map(([key, val]) => (
                  <input
                    key={key}
                    value={val}
                    onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                    placeholder={key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                    className="bg-gray-50 border border-gray-300 rounded-lg px-3 py-2 text-gray-900 text-xs focus:outline-none focus:border-amber-500"
                  />
                ))}
              </div>
            </div>

            <button
              onClick={handleAnalyze}
              disabled={analyzing || !text.trim()}
              className="bg-amber-500 hover:bg-amber-600 text-white font-semibold px-6 py-3 rounded-lg text-sm disabled:opacity-50 transition-colors"
            >
              {analyzing ? 'Analyzing...' : 'Analyze Report'}
            </button>
          </div>

          {/* Analysis Steps */}
          <div className="bg-white border border-gray-200 rounded-xl p-5">
            <h3 className="text-sm font-medium text-gray-700 mb-3">Analysis Progress</h3>
            {analyzingSteps.length === 0 && !result ? (
              <div className="text-gray-400 text-sm">Submit a report to begin analysis</div>
            ) : (
              <div className="space-y-2">
                {steps.map((step, i) => (
                  <div key={i} className={`flex items-center gap-2 text-xs ${analyzingSteps.includes(step) || (result && i < steps.length) ? 'text-green-600' : 'text-gray-300'}`}>
                    <span>{analyzingSteps.includes(step) || (result && i < steps.length) ? '\u2713' : '...'}</span>
                    {step}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Batch Upload */
        <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-4">
          <div>
            <h3 className="text-sm font-medium text-gray-700 mb-2">Upload CSV File</h3>
            <p className="text-xs text-gray-400 mb-3">CSV should contain columns: report_id, date, location, text</p>
            <div className="flex items-center gap-4">
              <input ref={fileRef} type="file" accept=".csv" onChange={(e) => setBatchFile(e.target.files?.[0] || null)} className="hidden" />
              <button onClick={() => fileRef.current?.click()} className="bg-gray-100 border border-gray-300 text-gray-700 px-4 py-2 rounded-lg text-sm hover:border-amber-500">
                {batchFile ? batchFile.name : 'Choose CSV file'}
              </button>
              <button onClick={handleBatchUpload} disabled={analyzing || !batchFile} className="bg-amber-500 hover:bg-amber-600 text-white font-semibold px-6 py-2 rounded-lg text-sm disabled:opacity-50">
                {analyzing ? 'Processing...' : 'Upload & Analyze'}
              </button>
            </div>
          </div>
          <button onClick={downloadSample} className="text-amber-600 text-xs hover:underline">Download Sample CSV Template</button>

          {batchResult && (
            <div className="bg-gray-50 rounded-lg p-4 space-y-3">
              <h4 className="text-sm font-semibold text-gray-900">Batch Analysis Complete</h4>
              <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
                {[
                  { label: 'Total', value: batchResult.total_processed, color: 'text-blue-600' },
                  { label: 'Critical', value: batchResult.critical, color: 'text-red-600' },
                  { label: 'High', value: batchResult.high, color: 'text-orange-600' },
                  { label: 'Medium', value: batchResult.medium, color: 'text-yellow-600' },
                  { label: 'Low', value: batchResult.low, color: 'text-green-600' },
                ].map((item, i) => (
                  <div key={i} className="text-center">
                    <div className={`text-xl font-bold ${item.color}`}>{item.value}</div>
                    <div className="text-xs text-gray-500">{item.label}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Analysis Results */}
      {result && (
        <div className="space-y-6">
          <div className="bg-green-50 border border-green-200 text-green-700 text-sm px-4 py-2 rounded-lg">
            Analysis complete for Report ID: {result.report_id}
          </div>

          <AnalysisResultDisplay analysis={result.analysis} reportId={result.report_id} />
        </div>
      )}
    </div>
  );
}


function AnalysisResultDisplay({ analysis, reportId }: { analysis: any; reportId: string }) {
  const navigate = useNavigate();


  const priorityColors: Record<string, string> = {
    Critical: 'bg-red-50 text-red-600 border-red-200',
    High: 'bg-orange-50 text-orange-600 border-orange-200',
    Medium: 'bg-yellow-50 text-yellow-600 border-yellow-200',
    Low: 'bg-green-50 text-green-600 border-green-200',
  };

  return (
    <div className="space-y-4">
      {/* SIF Score + Priority */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white border border-gray-200 rounded-xl p-6 text-center">
          <div className="text-xs text-gray-500 mb-2">SIF POTENTIAL</div>
          <div className={`text-5xl font-bold ${analysis.sif_probability >= 0.65 ? 'text-red-600' : analysis.sif_probability >= 0.40 ? 'text-yellow-600' : 'text-green-600'}`}>
            {Math.round(analysis.sif_probability * 100)}%
          </div>
          <div className="mt-2 text-sm font-semibold text-gray-700">{analysis.sif_classification}</div>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-6 text-center">
          <div className="text-xs text-gray-500 mb-2">PRIORITY</div>
          <div className={`inline-block px-4 py-2 rounded-lg border text-lg font-bold ${priorityColors[analysis.priority] || 'bg-gray-100 text-gray-500'}`}>
            {analysis.priority}
          </div>
          <div className="mt-2 text-xs text-gray-500">Confidence: {Math.round(analysis.confidence * 100)}%</div>
          {analysis.confidence < 0.6 && (
            <div className="mt-2 text-xs text-yellow-600 font-semibold">LOW CONFIDENCE — MANUAL HSE REVIEW REQUIRED</div>
          )}
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <div className="text-xs text-gray-500 mb-3">IOGP RULES</div>
          <div className="space-y-2">
            {analysis.iogp_rules.slice(0, 4).map((rule: any, i: number) => (
              <div key={i}>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-gray-700">{rule.rule}</span>
                  <span className="text-amber-600">{Math.round(rule.probability * 100)}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-1.5">
                  <div className="bg-amber-500 h-1.5 rounded-full" style={{ width: `${rule.probability * 100}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Hazards, Exposure, Controls */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <h4 className="text-xs text-gray-500 mb-3">HAZARDS & ENERGY</h4>
          <div className="space-y-2">
            <div><span className="text-xs text-gray-400">Hazards:</span> <div className="flex flex-wrap gap-1 mt-1">{analysis.hazards.map((h: string, i: number) => <span key={i} className="bg-red-50 text-red-600 text-xs px-2 py-0.5 rounded">{h}</span>)}</div></div>
            <div><span className="text-xs text-gray-400">Energy:</span> <div className="flex flex-wrap gap-1 mt-1">{analysis.energy_sources.map((e: string, i: number) => <span key={i} className="bg-orange-50 text-orange-600 text-xs px-2 py-0.5 rounded">{e}</span>)}</div></div>
            <div><span className="text-xs text-gray-400">Exposure:</span> <div className="flex flex-wrap gap-1 mt-1">{analysis.exposures.map((e: string, i: number) => <span key={i} className="bg-yellow-50 text-yellow-600 text-xs px-2 py-0.5 rounded">{e}</span>)}</div></div>
            <div><span className="text-xs text-gray-400">Consequences:</span> <div className="flex flex-wrap gap-1 mt-1">{analysis.potential_consequences.map((c: string, i: number) => <span key={i} className="bg-red-50 text-red-500 text-xs px-2 py-0.5 rounded">{c}</span>)}</div></div>
          </div>
        </div>

        {/* Failed Controls */}
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <h4 className="text-xs text-gray-500 mb-3">FAILED / MISSING CONTROLS</h4>
          <div className="space-y-1.5">
            {analysis.failed_controls.map((ctrl: any, i: number) => (
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

        {/* Evidence */}
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <h4 className="text-xs text-gray-500 mb-3">EVIDENCE</h4>
          <div className="space-y-1.5">
            {analysis.evidence.map((ev: string, i: number) => (
              <div key={i} className="flex items-start gap-2 text-sm text-gray-700">
                <span className="text-green-500 mt-0.5">&#10003;</span>
                <span>{ev}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Explanation */}
      <div className="bg-white border border-gray-200 rounded-xl p-5">
        <h4 className="text-xs text-gray-500 mb-3">WHY WAS THIS REPORT FLAGGED?</h4>
        <p className="text-sm text-gray-700 leading-relaxed">{analysis.explanation}</p>
      </div>

      {/* Priority Drivers */}
      <div className="bg-white border border-gray-200 rounded-xl p-5">
        <h4 className="text-xs text-gray-500 mb-3">PRIORITY DRIVERS</h4>
        <div className="flex flex-wrap gap-2">
          {analysis.hazards.map((h: string, i: number) => <span key={`h-${i}`} className="bg-red-50 text-red-600 text-xs px-3 py-1 rounded-full border border-red-200">{h}</span>)}
          {analysis.exposures.filter((e: string) => !e.includes('not specified')).map((e: string, i: number) => <span key={`e-${i}`} className="bg-yellow-50 text-yellow-600 text-xs px-3 py-1 rounded-full border border-yellow-200">{e}</span>)}
          {analysis.failed_controls.filter((c: any) => c.status !== 'Not determined').map((c: any, i: number) => <span key={`c-${i}`} className="bg-orange-50 text-orange-600 text-xs px-3 py-1 rounded-full border border-orange-200">{c.control} ({c.status})</span>)}
          {analysis.iogp_rules.filter((r: any) => r.probability > 0.3).map((r: any, i: number) => <span key={`r-${i}`} className="bg-blue-50 text-blue-600 text-xs px-3 py-1 rounded-full border border-blue-200">{r.rule}</span>)}
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        <button onClick={() => navigate(`/reports/${reportId}`)} className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg text-sm border border-gray-300">
          View Full Report
        </button>
        <button onClick={() => navigate('/hse-review')} className="bg-amber-500 hover:bg-amber-600 text-white font-semibold px-4 py-2 rounded-lg text-sm">
          Send to HSE Review
        </button>
      </div>
    </div>
  );
}
