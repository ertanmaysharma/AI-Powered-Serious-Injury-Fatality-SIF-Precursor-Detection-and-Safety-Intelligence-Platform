import { useState, useEffect } from 'react';
import { api } from '../api';

export default function ModelPerformancePage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getModelPerformance().then(setData).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-amber-400"></div></div>;
  if (!data) return null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Model Performance</h1>
        <p className="text-sm text-gray-400 mt-1">AI model information and evaluation metrics</p>
      </div>

      <div className="bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 text-xs px-4 py-2 rounded-lg">
        ⚠️ DEMONSTRATION / PLACEHOLDER METRICS — No model has been trained on real OIL incident data.
      </div>

      {/* Model Info */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
        <h3 className="text-sm font-semibold text-white mb-4">Model Information</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div><span className="text-xs text-gray-500">Version</span><div className="text-sm text-white font-medium">{data.model_version}</div></div>
          <div><span className="text-xs text-gray-500">Type</span><div className="text-sm text-white font-medium">{data.model_type}</div></div>
          <div><span className="text-xs text-gray-500">Training Records</span><div className="text-sm text-gray-400">{data.training_records}</div></div>
          <div><span className="text-xs text-gray-500">Test Records</span><div className="text-sm text-gray-400">{data.test_records}</div></div>
        </div>
      </div>

      {/* Metrics */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
        <h3 className="text-sm font-semibold text-white mb-4">Performance Metrics</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Object.entries(data.metrics).map(([key, val]: [string, any]) => (
            <div key={key} className="bg-gray-800 rounded-lg p-4">
              <div className="text-xs text-gray-500 mb-1">{key.replace(/_/g, ' ').toUpperCase()}</div>
              <div className="text-lg font-bold text-gray-400">{val.value ?? 'Not trained'}</div>
              <div className="text-[10px] text-gray-600 mt-1">{val.note}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Model Comparison */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
        <h3 className="text-sm font-semibold text-white mb-4">Model Comparison</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-800">
                <th className="px-3 py-2 text-left text-xs text-gray-400 font-medium">Model</th>
                <th className="px-3 py-2 text-center text-xs text-gray-400 font-medium">Precision</th>
                <th className="px-3 py-2 text-center text-xs text-gray-400 font-medium">Recall</th>
                <th className="px-3 py-2 text-center text-xs text-gray-400 font-medium">F1</th>
                <th className="px-3 py-2 text-center text-xs text-gray-400 font-medium">PR-AUC</th>
                <th className="px-3 py-2 text-center text-xs text-gray-400 font-medium">SIF Recall</th>
              </tr>
            </thead>
            <tbody>
              {data.model_comparison.map((m: any, i: number) => (
                <tr key={i} className="border-b border-gray-800/50">
                  <td className="px-3 py-3 text-gray-300 text-xs">{m.model}</td>
                  <td className="px-3 py-3 text-center text-gray-500 text-xs">{m.precision}</td>
                  <td className="px-3 py-3 text-center text-gray-500 text-xs">{m.recall}</td>
                  <td className="px-3 py-3 text-center text-gray-500 text-xs">{m.f1}</td>
                  <td className="px-3 py-3 text-center text-gray-500 text-xs">{m.pr_auc}</td>
                  <td className="px-3 py-3 text-center text-gray-500 text-xs">{m.sif_recall}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ML Architecture */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
        <h3 className="text-sm font-semibold text-white mb-4">Planned ML Architecture</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 className="text-xs text-gray-400 mb-3">Current Mode: {data.ml_architecture.demo_mode}</h4>
            <div className="bg-gray-800 rounded-lg p-4 space-y-2">
              {data.ml_architecture.components.map((c: string, i: number) => (
                <div key={i} className="flex items-center gap-2 text-sm text-gray-300">
                  <span className="text-amber-400">→</span> {c}
                </div>
              ))}
            </div>
          </div>
          <div>
            <h4 className="text-xs text-gray-400 mb-3">Planned: {data.ml_architecture.planned_mode}</h4>
            <div className="bg-gray-800 rounded-lg p-4 font-mono text-xs text-gray-300 space-y-1">
              <div>┌─────────────────────┐</div>
              <div>│ Transformer Encoder  │</div>
              <div>│   (BERT/RoBERTa)    │</div>
              <div>└──────────┬──────────┘</div>
              <div>           │</div>
              <div>     ┌─────┴─────┐</div>
              <div>     │           │</div>
              <div>┌────▼────┐ ┌───▼────┐</div>
              <div>│  SIF    │ │  IOGP  │</div>
              <div>│  Head   │ │  Head  │</div>
              <div>└─────────┘ └────────┘</div>
            </div>
          </div>
        </div>
      </div>

      {/* Disclaimer */}
      <div className="bg-gray-900/50 border border-gray-800 rounded-lg p-4 text-xs text-gray-500 space-y-1">
        <p>{data.disclaimer}</p>
      </div>
    </div>
  );
}
