import { useState, useEffect } from 'react';
import { api } from '../api';

export default function SafetyRulesPage() {
  const [rules, setRules] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<number | null>(null);

  useEffect(() => {
    api.getIogpRules().then(setRules).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-amber-400"></div></div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">IOGP Life-Saving Rules</h1>
        <p className="text-sm text-gray-400 mt-1">Reference guide for the nine IOGP Life-Saving Rules used in SIF classification</p>
      </div>

      <div className="bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs px-4 py-2 rounded-lg">
        IOGP Life-Saving Rule mapping in this prototype is an AI-assisted classification mechanism and should be validated against the organization's approved safety standards and procedures before operational use.
      </div>

      <div className="space-y-3">
        {rules.map((rule) => (
          <div key={rule.id} className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
            <button
              onClick={() => setExpanded(expanded === rule.id ? null : rule.id)}
              className="w-full flex items-center justify-between p-5 text-left hover:bg-gray-800/30"
            >
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-amber-500/10 rounded-lg flex items-center justify-center text-amber-400 font-bold">
                  {rule.id}
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-white">{rule.name}</h3>
                  <p className="text-xs text-gray-400 mt-0.5">{rule.description}</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <div className="text-sm font-bold text-amber-400">{rule.report_count}</div>
                  <div className="text-[10px] text-gray-500">reports</div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-bold text-red-400">{rule.sif_potential_count}</div>
                  <div className="text-[10px] text-gray-500">SIF potential</div>
                </div>
                <span className="text-gray-400">{expanded === rule.id ? '▲' : '▼'}</span>
              </div>
            </button>

            {expanded === rule.id && (
              <div className="px-5 pb-5 border-t border-gray-800 pt-4 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <h4 className="text-xs text-gray-500 mb-2">Detection Keywords</h4>
                    <div className="flex flex-wrap gap-1">
                      {rule.keywords.map((kw: string, i: number) => (
                        <span key={i} className="bg-gray-800 text-gray-300 text-xs px-2 py-0.5 rounded">{kw}</span>
                      ))}
                    </div>
                  </div>
                  <div>
                    <h4 className="text-xs text-gray-500 mb-2">Related Hazards</h4>
                    <div className="flex flex-wrap gap-1">
                      {rule.related_hazards.map((h: string, i: number) => (
                        <span key={i} className="bg-red-500/10 text-red-400 text-xs px-2 py-0.5 rounded">{h}</span>
                      ))}
                    </div>
                  </div>
                  <div>
                    <h4 className="text-xs text-gray-500 mb-2">Related Energy Sources</h4>
                    <div className="flex flex-wrap gap-1">
                      {rule.related_energy_sources.map((e: string, i: number) => (
                        <span key={i} className="bg-orange-500/10 text-orange-400 text-xs px-2 py-0.5 rounded">{e}</span>
                      ))}
                    </div>
                  </div>
                  <div>
                    <h4 className="text-xs text-gray-500 mb-2">Example Report Language</h4>
                    <div className="space-y-1">
                      {rule.example_phrases.map((p: string, i: number) => (
                        <div key={i} className="text-xs text-gray-400 italic">"{p}"</div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
