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
import { FailureItem, PlaywrightActionRunResult, TestCase } from '../types';

interface FailureAnalysisViewProps {
  searchText: string;
  testCases?: TestCase[];
  executionResult?: PlaywrightActionRunResult | null;
  onSetStatusText?: (msg: string) => void;
}

export default function FailureAnalysisView({
  searchText,
  testCases = [],
  executionResult = null,
  onSetStatusText
}: FailureAnalysisViewProps) {

  const executionFailures = React.useMemo<FailureItem[]>(() => {
    if (!executionResult) return [];

    return executionResult.results
      .filter(result => result.status !== 'passed')
      .map((result, index) => {
        const testCase = testCases.find(item => item.id === result.test_case_id);
        const failedFrame = result.frames.find(frame => frame.status === 'failed') || result.frames[result.frames.length - 1];
        const box = failedFrame?.bounding_box;
        const viewport = failedFrame?.viewport;
        const targetArea = box && viewport
          ? {
              top: `${(box.y / viewport.height) * 100}%`,
              left: `${(box.x / viewport.width) * 100}%`,
              width: `${(box.width / viewport.width) * 100}%`,
              height: `${(box.height / viewport.height) * 100}%`,
            }
          : { top: '20%', left: '10%', width: '80%', height: '45%' };

        return {
          id: `FAIL-${String(index + 1).padStart(4, '0')}`,
          title: testCase?.name || result.name || `Generated test ${result.test_case_id || index + 1} failed`,
          step: failedFrame ? `Step ${failedFrame.index}: ${failedFrame.label}` : 'Playwright action runner failed before frame capture',
          severity: testCase?.priority === 'Critical' ? 'Critical Failure' : 'Visual Regression',
          riskScore: testCase?.priority === 'Critical' ? 92 : 68,
          diffPercent: result.errors[0] || 'Playwright action failed',
          screenshotUrl: failedFrame?.screenshot_b64 ? `data:image/png;base64,${failedFrame.screenshot_b64}` : '',
          targetArea,
          targetLabel: failedFrame?.label || testCase?.feature || 'Failed action target',
          iconName: 'warning',
          rootCause: result.errors[0] || 'The generated selector or page state did not match the browser during execution.',
          suggestedFix: 'Review the highlighted selector, update crawler/test generation rules, or add a wait/precondition before this action.',
          logs: [
            ...result.logs.map(log => `[PLAYWRIGHT] ${log}`),
            ...result.errors.map(error => `[ERROR] ${error}`),
          ],
        } as FailureItem;
      });
  }, [executionResult, testCases]);

  const [resolvedFailures, setResolvedFailures] = React.useState<Record<string, FailureItem>>({});

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
      const current = executionFailures.find(item => item.id === id);
      if (current) {
        setResolvedFailures(prev => ({
          ...prev,
          [id]: { ...current, severity: 'Minor issue' as any, riskScore: 12, diffPercent: 'RESOLVED via AI Patch' },
        }));
      }
      if (onSetStatusText) onSetStatusText(`Patched file pay.controller.js. Restarting continuous sandbox integration.`);
    }, 2000);
  };

  const failures = executionFailures.map(item => resolvedFailures[item.id] || item);
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
