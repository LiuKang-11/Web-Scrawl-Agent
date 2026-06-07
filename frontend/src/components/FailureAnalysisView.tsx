import React from 'react';
import { 
  AlertOctagon, 
  ExternalLink, 
  CheckCircle, 
  Copy, 
  Bug, 
  Sparkles, 
  ChevronDown, 
  ChevronRight, 
  Image as ImageIcon,
  Loader2,
  Workflow
} from 'lucide-react';
import { FailureItem } from '../types';

interface FailureAnalysisViewProps {
  searchText: string;
  onSetStatusText?: (msg: string) => void;
}

export default function FailureAnalysisView({
  searchText,
  onSetStatusText
}: FailureAnalysisViewProps) {
  
  const [failures, setFailures] = React.useState<FailureItem[]>([
    {
      id: 'FAIL-9422',
      title: 'Checkout payment timeout under simulated concurrency',
      step: 'Step 4: Execute payment processing webhook response',
      severity: 'Critical Failure',
      riskScore: 94,
      diffPercent: 'Network Latency > 2.5s',
      screenshotUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuD5eNeFDI5VQhmvQJb86I-y6z8vmcxuHPKGFg2kpFu-abOzychElrqcg3qk8M1AosZD6jpwc4A2OG_wCN1H78ZyuwAUtj_r7KeTHduEYgRL5tA4qQlFO8Yb0pHYUidz4SmNou7AX9xm2uXpQTRPeQm3SkbB6j8NouSMwOJMJBQV3eW9aUFwcYeS1KXOkW-tuI34Odl2LSbCbT0a36CZL7G_LJL-z6Lugk59sD5GLBxet7av3eU0yh4iKcZLKMdUU67zcOsUE7FJejk',
      targetArea: { top: '35%', left: '12%', width: '75%', height: '40%' },
      targetLabel: 'Stripe Credit Card Secure Iframe container',
      iconName: 'warning',
      rootCause: "A race condition on checkout callback dispatchers triggers before Stripe Webhook intent propagates fully.",
      suggestedFix: "Implement latching wait locks on transaction state tokens before redirecting consumers to index confirmation page.",
      logs: [
        "TypeError: Cannot read properties of undefined (reading 'payment_intent')",
        "  at PaymentGatewayController._resolveStripePay (controllers/services/pay.js:42:15)",
        "  at processTicksAndRejections (node:internal/process/task_queues:95:5)",
        "  at async executePaymentPipeline (routes/api/checkout/pay.js:142:18)"
      ]
    },
    {
      id: 'FAIL-6811',
      title: 'Responsive navigation alignment overlapping on viewport width scale < 380px',
      step: 'Step 2: Compare layouts on mobile viewport triggers',
      severity: 'Visual Regression',
      riskScore: 68,
      diffPercent: 'Visual discrepancy rate: 14.5%',
      screenshotUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBdy2Xe2IijyKv-tbNQyLYQSsCBd8cEtf3RM-vuuij0RgiNeaEl_HLxUX6SPVNmBaGo5xSo0bZ0ngnBZAQfRuHbDkolIRrxW40nBTpzTLE53e0EO5zOydqwLQ5kiAFWXI5ztKpui6DWOwO2LSx0yrcBZtv8LJo_tertPO6UF4uh7P2EsmnPDaUBGIU6oP5beeBqs8Wy45FIsv6cvaXcjp_wZUsSZJJfhVg0v6WDvREb8R3-0MPxtDdgITLWOjpwb_ssxu0-xzKQf_Q',
      targetArea: { top: '15%', left: '60%', width: '38%', height: '10%' },
      targetLabel: 'Add to cart mobile margin overlay',
      iconName: 'visibility_off',
      rootCause: "Absolute positioning offsets overriding flex parameters inside narrow mobile headers standard.",
      suggestedFix: "Migrate navigation elements to mobile grid alignments or leverage Tailwind CSS responsive utility classes (sm:flex-col, etc.).",
      logs: [
        "[VISUAL COMPILATION] Viewport scale set: width=360px height=800px",
        "[COMPARE] Comparing pixels with layout baselines image #283",
        "[FAILURE] Element mismatch triggered at node coordinates X=240 Y=14",
        "[DIFF_MAP] Highlighted 38 overlaps. Mismatch threshold exceeded."
      ]
    }
  ]);

  // Expansion toggle states for stack trace lists
  const [expandedIds, setExpandedIds] = React.useState<string[]>(['FAIL-9422']);
  const [createdJiraIds, setCreatedJiraIds] = React.useState<string[]>([]);
  const [isFixingId, setIsFixingId] = React.useState<string | null>(null);

  const toggleExpand = (id: string) => {
    setExpandedIds(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  // Simulated Jira Ticket creation
  const handleJiraCreation = (id: string) => {
    if (createdJiraIds.includes(id)) return;
    
    setCreatedJiraIds([...createdJiraIds, id]);
    if (onSetStatusText) onSetStatusText(`Successfully generated and dispatched Jira issue JIRA-${id.slice(5)} to target triage board.`);
  };

  // Simulated AI patch applicator
  const applyAIFix = (id: string) => {
    setIsFixingId(id);
    if (onSetStatusText) onSetStatusText(`Initiating automatic code patch application for failure ${id}...`);

    setTimeout(() => {
      setIsFixingId(null);
      // Change severity or state to fixed representation
      setFailures(failures.map(item => 
        item.id === id ? { ...item, severity: 'Minor issue' as any, riskScore: 12, diffPercent: 'RESOLVED via AI Patch' } : item
      ));
      if (onSetStatusText) onSetStatusText(`Patched file pay.controller.js. Restarting continuous sandbox integration.`);
    }, 2000);
  };

  const filteredFailures = failures.filter(item => 
    searchText ? (item.title.toLowerCase().includes(searchText.toLowerCase()) || item.id.toLowerCase().includes(searchText.toLowerCase())) : true
  );

  return (
    <div className="flex-1 p-6 overflow-y-auto max-w-[1600px] mx-auto w-full space-y-6 select-none leading-relaxed">
      
      {/* Failure Overview Heading Panel */}
      <div className="flex justify-between items-center bg-neutral-900/40 p-5 rounded-2xl border border-neutral-800">
        <div>
          <h2 className="text-base font-bold text-neutral-100 flex items-center gap-2">
            <AlertOctagon className="text-rose-400 w-5 h-5" />
            Failure Analysis Portal
          </h2>
          <p className="text-xs text-neutral-400 mt-1">
            Analyzing stack outputs, layout misalignments, and interactive DOM variables.
          </p>
        </div>
        <span className="text-[11px] font-mono font-bold bg-neutral-950 border border-neutral-850 py-1 px-3 rounded text-neutral-400">
          CONCURRENCY THREADS active
        </span>
      </div>

      {/* Primary diagnostic cards listing */}
      <div className="space-y-6">
        {filteredFailures.length === 0 ? (
          <div className="glass-panel p-12 text-center text-xs text-neutral-500 font-mono rounded-2xl">
            No active anomalies detected or matching log query.
          </div>
        ) : (
          filteredFailures.map((item) => {
            const isExpanded = expandedIds.includes(item.id);
            const isJiraCreated = createdJiraIds.includes(item.id);
            const isCritical = item.severity === 'Critical Failure';
            const isVisual = item.severity === 'Visual Regression';
            
            return (
              <div 
                key={item.id} 
                className={`glass-panel rounded-2xl overflow-hidden border transition-all ${
                  isCritical 
                    ? 'border-rose-950/60 shadow-[0_4px_24px_rgba(244,63,94,0.02)]' 
                    : isVisual 
                      ? 'border-amber-950/60 shadow-[0_4px_24px_rgba(245,158,11,0.02)]' 
                      : 'border-emerald-950/60'
                }`}
              >
                
                {/* Header Row */}
                <div 
                  onClick={() => toggleExpand(item.id)}
                  className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 cursor-pointer hover:bg-neutral-850/20 transition-all select-none bg-neutral-950/20"
                >
                  <div className="flex items-start gap-4">
                    {/* Ring diagnostic radial score indicator */}
                    <div className="relative w-12 h-12 flex items-center justify-center shrink-0">
                      <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                        <circle 
                          className="text-neutral-800" 
                          cx="18" cy="18" r="15.915" 
                          fill="none" stroke="currentColor" strokeWidth="3" 
                        />
                        <circle 
                          className={isCritical ? 'text-rose-400' : isVisual ? 'text-amber-400' : 'text-emerald-400'} 
                          cx="18" cy="18" r="15.915" 
                          fill="none" stroke="currentColor" strokeWidth="3"
                          strokeDasharray={`${item.riskScore}, 100`} 
                        />
                      </svg>
                      <span className={`absolute text-[11px] font-bold ${
                        isCritical ? 'text-rose-400' : isVisual ? 'text-amber-400' : 'text-emerald-450'
                      }`}>
                        {item.riskScore}%
                      </span>
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center gap-2.5 flex-wrap">
                        <span className="text-xs font-mono font-bold text-neutral-500 uppercase">{item.id}</span>
                        <h3 className="text-sm font-bold text-neutral-100 leading-snug group-hover:text-indigo-400">{item.title}</h3>
                        
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                          isCritical 
                            ? 'bg-rose-500/10 text-rose-400 border-rose-500/20' 
                            : isVisual 
                              ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' 
                              : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                        }`}>
                          {item.severity}
                        </span>
                      </div>
                      <p className="text-xs text-neutral-400 font-mono leading-relaxed">{item.step}</p>
                    </div>
                  </div>

                  {/* Right hand details indicator */}
                  <div className="flex items-center gap-3 self-end md:self-auto font-mono text-xs text-neutral-400">
                    <span className="text-rose-400/90 font-bold bg-neutral-900 p-1 rounded-md border border-neutral-800">
                      {item.diffPercent}
                    </span>
                    {isExpanded ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
                  </div>
                </div>

                {/* Expanded Details workspace layout splits into Visual Snapshot comparison and stack code details */}
                {isExpanded && (
                  <div className="border-t border-neutral-800/80 p-5 grid grid-cols-1 xl:grid-cols-12 gap-6 bg-neutral-950/40">
                    
                    {/* Visual Regression preview column - 5 cols */}
                    <div className="col-span-1 xl:col-span-5 flex flex-col gap-3">
                      <div className="flex justify-between items-center text-[10px] font-mono text-neutral-400 font-bold uppercase tracking-wider pl-1">
                        <span>Failure Snapshot context</span>
                        <span className="text-indigo-400 flex items-center gap-1">
                          <ImageIcon className="w-3.5 h-3.5" />
                          Coordinate matched
                        </span>
                      </div>

                      {/* Mini visual viewport preview */}
                      <div className="bg-neutral-900 border border-neutral-800 rounded-xl overflow-hidden relative aspect-[4/3] flex items-center justify-center">
                        <img 
                          alt="Failure visual highlight"
                          className="w-full h-full object-cover select-none"
                          src={item.screenshotUrl}
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = "https://images.unsplash.com/photo-1531403009284-440f080d1e12?auto=format&fit=crop&q=80&w=400";
                          }}
                        />

                        {/* Red visual outline indicator highlights overlaying the failure area exactly */}
                        <div 
                          className={`absolute border-2 rounded ${
                            isCritical ? 'border-rose-500 bg-rose-500/5 shadow-[0_0_20px_rgba(244,63,94,0.15)]' : 'border-amber-500 bg-amber-500/5 shadow-[0_0_20px_rgba(245,158,11,0.15)]'
                          }`}
                          style={{
                            top: item.targetArea.top,
                            left: item.targetArea.left,
                            width: item.targetArea.width,
                            height: item.targetArea.height
                          }}
                        />

                        <span className={`absolute px-1.5 py-0.5 rounded text-[9px] font-mono font-bold uppercase text-white shadow-lg ${isCritical ? 'bg-rose-600' : 'bg-amber-600'}`}
                          style={{
                            top: `calc(${item.targetArea.top} - 16px)`,
                            left: item.targetArea.left
                          }}
                        >
                          Target: {item.targetLabel}
                        </span>
                      </div>
                    </div>

                    {/* Diagnostics & AI Fix columns - 7 cols */}
                    <div className="col-span-1 xl:col-span-7 flex flex-col gap-4">
                      
                      {/* Diagnostic logs stack list */}
                      <div className="bg-black border border-neutral-850 p-4 rounded-xl flex flex-col gap-2 font-mono text-[11px] leading-relaxed relative">
                        <span className="text-[9px] text-neutral-500 uppercase tracking-widest absolute right-3 top-2.5 font-bold">Execution logs diagnostic</span>
                        <h4 className="text-xs font-semibold text-neutral-400 flex items-center gap-1.5 mb-1">
                          <Bug className="w-4.5 h-4.5 text-rose-450" />
                          Stack Trace Details
                        </h4>
                        
                        <div className="space-y-1 overflow-x-auto select-text text-neutral-300">
                          {item.logs.map((log, idx) => (
                            <p key={idx} className={idx === 0 ? 'text-rose-400 font-semibold' : 'text-neutral-450 pl-2'}>
                              {log}
                            </p>
                          ))}
                        </div>
                      </div>

                      {/* AI Fix proposal insights */}
                      <div className="bg-indigo-950/20 border border-indigo-500/15 p-4 rounded-xl space-y-3">
                        <div className="flex gap-2 items-center text-indigo-400">
                          <Sparkles className="w-4.5 h-4.5 text-indigo-400 animate-pulse" />
                          <span className="text-[10px] font-mono font-bold uppercase tracking-widest">AI Fix Proposal</span>
                        </div>
                        <div className="space-y-1 text-xs">
                          <p className="text-neutral-200"><span className="text-neutral-400 font-mono font-semibold">Root Cause:</span> {item.rootCause}</p>
                          <p className="text-neutral-200 mt-2"><span className="text-neutral-400 font-mono font-semibold">Suggested Remediation:</span> {item.suggestedFix}</p>
                        </div>
                      </div>

                      {/* Failure Actions */}
                      <div className="flex flex-wrap items-center gap-2.5 mt-2 self-end">
                        <button
                          onClick={() => applyAIFix(item.id)}
                          disabled={isFixingId === item.id || item.riskScore === 12}
                          className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 font-bold text-xs py-2 px-4 rounded-lg flex items-center gap-1.5 text-indigo-100 cursor-pointer shadow-[0_0_15px_rgba(99,102,241,0.1)]"
                        >
                          {isFixingId === item.id ? (
                            <>
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              Applying AI Code Patch...
                            </>
                          ) : (
                            <>
                              <Workflow className="w-3.5 h-3.5" />
                              {item.riskScore === 12 ? 'Patch Applied Successfully' : 'Execute AI Reflow auto-fix'}
                            </>
                          )}
                        </button>

                        <button 
                          onClick={() => handleJiraCreation(item.id)}
                          disabled={isJiraCreated}
                          className="bg-neutral-850 hover:bg-neutral-700 disabled:bg-neutral-900 disabled:text-neutral-600 font-bold text-xs py-2 px-4 rounded-lg border border-neutral-750 transition-all text-neutral-200 cursor-pointer flex items-center gap-1.5"
                        >
                          <CheckCircle className={`w-3.5 h-3.5 ${isJiraCreated ? 'text-emerald-400' : 'text-neutral-500'}`} />
                          {isJiraCreated ? `JIRA Ticket Dispatched` : 'Generate Jira Ticket'}
                        </button>
                      </div>

                    </div>

                  </div>
                )}

              </div>
            );
          })
        )}
      </div>

    </div>
  );
}
