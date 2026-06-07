import React from 'react';
import { 
  BarChart3, 
  TrendingUp, 
  Download, 
  Sparkles, 
  CheckCircle2, 
  Printer, 
  HelpCircle,
  FileCheck2,
  PieChart as PieIcon,
  ChevronRight,
  Info,
  Loader2
} from 'lucide-react';

interface ReportsViewProps {
  searchText: string;
  onSetStatusText?: (msg: string) => void;
}

export default function ReportsView({
  searchText,
  onSetStatusText
}: ReportsViewProps) {
  
  const [activeSprint, setActiveSprint] = React.useState('Sprint 42');
  const [isDownloading, setIsDownloading] = React.useState(false);
  const [hoveredTrendIdx, setHoveredTrendIdx] = React.useState<number | null>(null);

  const coverageTrend = [
    { sprint: 'Sprint 38', coverage: 82, errors: 12 },
    { sprint: 'Sprint 39', coverage: 84, errors: 8 },
    { sprint: 'Sprint 40', coverage: 85, errors: 6 },
    { sprint: 'Sprint 41', coverage: 86, errors: 5 },
    { sprint: 'Sprint 42', coverage: 88, errors: 3 }
  ];

  const failureDistribution = [
    { category: 'Stripe API Webhooks', weight: '45%' },
    { category: 'Mobile Viewport CSS Offsets', weight: '30%' },
    { category: 'Session Token Cookie Expire', weight: '25%' }
  ];

  const handleDownload = () => {
    setIsDownloading(true);
    if (onSetStatusText) onSetStatusText("Aggregating system logs and visual regression state to generate PDF workspace diagnostics...");

    setTimeout(() => {
      setIsDownloading(false);
      if (onSetStatusText) onSetStatusText("Downloaded Acme-Store-Sprint-42-Report.pdf successfully.");
      
      // Minimal in-app confirmation triggers
      alert("FlowGuard AI: ACM-42-Ready-Digest.pdf has been prepared and compiled successfully under CJS standalone. Ready for executive board.");
    }, 2000);
  };

  return (
    <div className="flex-1 p-6 overflow-y-auto max-w-[1600px] mx-auto w-full space-y-6 select-none leading-relaxed text-white">
      
      {/* Top action layout cards */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-neutral-900/40 p-5 rounded-2xl border border-neutral-800">
        <div>
          <h2 className="text-base font-bold text-neutral-100 flex items-center gap-2">
            <BarChart3 className="text-indigo-400 w-5 h-5" />
            Executive Release Metrics & Reports
          </h2>
          <p className="text-xs text-neutral-400 mt-1">
            Analyzing release metrics, compliance health indexes, and continuous sandbox quality assessments.
          </p>
        </div>

        {/* Aggregate download buttons */}
        <div className="flex items-center gap-2.5">
          <button 
            onClick={handleDownload}
            disabled={isDownloading}
            className="bg-indigo-650 hover:bg-indigo-600 disabled:bg-neutral-800 font-bold text-xs py-2 px-4 rounded-lg flex items-center gap-1.5 border border-indigo-500/25 transition-all cursor-pointer shadow-[0_0_15px_rgba(99,102,241,0.15)]"
          >
            {isDownloading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Compiling Report...
              </>
            ) : (
              <>
                <Download className="w-4 h-4" />
                Download PDF Report
              </>
            )}
          </button>
        </div>
      </div>

      {/* Main details metrics splits */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Release readiness index column - 8 cols */}
        <div className="lg:col-span-8 flex flex-col gap-6">
          
          <div className="bg-neutral-900/40 border border-neutral-800/80 p-6 rounded-2xl space-y-6">
            <div className="flex justify-between items-center">
              <h3 className="text-xs font-bold text-neutral-300 font-mono uppercase tracking-widest flex items-center gap-1.5">
                <FileCheck2 className="w-4.5 h-4.5 text-indigo-400" />
                Release Decision Readiness Gauge
              </h3>
              <span className="text-emerald-400 text-xs font-bold uppercase tracking-widest font-mono">
                ● RECOMMENDED GO DECISION
              </span>
            </div>

            {/* Simulated readiness dial indicator */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-neutral-950 p-4 rounded-xl border border-neutral-850/80 relative overflow-hidden flex flex-col justify-between">
                <span className="text-[10px] text-neutral-400 uppercase tracking-wider font-semibold">Ready Index</span>
                <span className="text-3xl font-extrabold text-emerald-400 mt-2">98.4%</span>
                <p className="text-[10px] text-neutral-500 mt-1 font-mono">Passes 95% target barrier requirement</p>
              </div>

              <div className="bg-neutral-950 p-4 rounded-xl border border-neutral-850/80 relative overflow-hidden flex flex-col justify-between">
                <span className="text-[10px] text-neutral-400 uppercase tracking-wider font-semibold">Active Defect Count</span>
                <span className="text-3xl font-extrabold text-neutral-200 mt-2">0 Blockers</span>
                <p className="text-[10px] text-neutral-500 mt-1 font-mono">0 Critical anomalies active</p>
              </div>

              <div className="bg-neutral-950 p-4 rounded-xl border border-neutral-850/80 relative overflow-hidden flex flex-col justify-between">
                <span className="text-[10px] text-neutral-400 uppercase tracking-wider font-semibold">Regression Risk Index</span>
                <span className="text-3xl font-extrabold text-indigo-300 mt-2">Low Concern</span>
                <p className="text-[10px] text-neutral-500 mt-1 font-mono">Continuous checkups completed</p>
              </div>
            </div>
          </div>

          {/* Svg Trend Chart - line of coverage progress */}
          <div className="glass-panel rounded-2xl p-6">
            <h3 className="text-xs font-bold text-neutral-300 font-mono uppercase tracking-widest flex items-center gap-1.5 mb-6">
              <TrendingUp className="w-4.5 h-4.5 text-indigo-400" />
              Sprints Test Coverage Trend line
            </h3>

            {/* Custom interactive path line rendered using clear SVG vectors */}
            <div className="h-[210px] bg-neutral-950/60 rounded-xl border border-neutral-850 relative flex items-end p-6">
              {/* Grid aligning overlay markers */}
              <div className="absolute inset-x-0 top-[25%] border-b border-white/[0.03]" />
              <div className="absolute inset-x-0 top-[50%] border-b border-white/[0.03]" />
              <div className="absolute inset-x-0 top-[75%] border-b border-white/[0.03]" />

              <svg className="absolute inset-0 w-full h-full pointer-events-auto" viewBox="0 0 650 200">
                {/* SVG path lines representing trend */}
                <path
                  d="M 60 140 L 200 130 L 340 110 L 480 90 L 590 60"
                  fill="none"
                  stroke="#6366f1"
                  strokeWidth="3.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                
                {/* Point indicators of coordinates */}
                {coverageTrend.map((pt, idx) => {
                  const x = 60 + idx * 132.5;
                  // Map coverage values smoothly to Y bounds
                  const y = 200 - (pt.coverage * 1.5);
                  const isHovered = hoveredTrendIdx === idx;

                  return (
                    <g 
                      key={idx} 
                      className="cursor-pointer group"
                      onMouseEnter={() => setHoveredTrendIdx(idx)}
                      onMouseLeave={() => setHoveredTrendIdx(null)}
                    >
                      <circle
                        cx={x}
                        cy={y}
                        r={isHovered ? "10" : "6"}
                        fill={isHovered ? "#818cf8" : "#4f46e5"}
                        className="transition-all duration-200"
                      />
                      <circle
                        cx={x}
                        cy={y}
                        r="3.5"
                        fill="#fff"
                      />
                      
                      {/* Active hovered statistics bubble label */}
                      {isHovered && (
                        <text
                          x={x}
                          y={y - 18}
                          textAnchor="middle"
                          className="fill-neutral-250 font-mono text-[10px] font-bold"
                        >
                          {pt.coverage}% verified
                        </text>
                      )}
                    </g>
                  );
                })}
              </svg>

              {/* Sprints labels mapping */}
              <div className="absolute inset-x-0 bottom-1.5 flex justify-between px-10 text-[10px] font-mono text-neutral-500 font-bold uppercase">
                {coverageTrend.map((pt) => (
                  <span key={pt.sprint}>{pt.sprint}</span>
                ))}
              </div>
            </div>
          </div>

        </div>

        {/* AI Recommendations Column - 4 cols */}
        <div className="lg:col-span-4 flex flex-col gap-6">
          
          {/* Failure metrics pie distribution summary */}
          <div className="glass-panel rounded-2xl p-5 flex flex-col gap-4">
            <h3 className="text-xs font-bold text-neutral-300 font-mono uppercase tracking-widest flex items-center gap-1.5">
              <PieIcon className="w-4.5 h-4.5 text-indigo-400" />
              Anomalies Division
            </h3>

            <div className="space-y-3.5">
              {failureDistribution.map((dist, idx) => (
                <div key={idx} className="bg-neutral-950 p-3 rounded-lg border border-neutral-850/80 flex justify-between items-center text-xs font-mono">
                  <span className="text-neutral-400 truncate pr-4 font-semibold">{dist.category}</span>
                  <span className="text-indigo-400 font-extrabold shrink-0">{dist.weight}</span>
                </div>
              ))}
            </div>
          </div>

          {/* AI Auditor insights recommendations card */}
          <div className="ai-insight-panel rounded-2xl p-5 flex flex-col gap-4">
            <div className="flex items-center gap-2 text-indigo-400">
              <Sparkles className="w-5 h-5 text-indigo-400 animate-pulse" />
              <span className="text-[10px] font-bold uppercase tracking-widest font-mono">Auditor recommendations</span>
            </div>
            
            <div className="space-y-3.5 text-xs">
              <div className="bg-neutral-950/60 p-3 rounded-lg border border-neutral-850/60 flex flex-col gap-1.5">
                <span className="text-[10px] font-mono font-bold text-indigo-400 uppercase">1. REDUNDANT ROUTE checks</span>
                <p className="text-neutral-300 leading-normal">
                  Skipping duplicate viewport checks on static layout elements on non-responsive routes saves <span className="text-indigo-400 font-mono font-bold">~2.4 sec</span> per execution cycle.
                </p>
              </div>

              <div className="bg-neutral-950/60 p-3 rounded-lg border border-neutral-850/60 flex flex-col gap-1.5">
                <span className="text-[10px] font-mono font-bold text-amber-400 uppercase font-bold">2. STRIPE latency wait latching</span>
                <p className="text-neutral-300 leading-normal">
                  Adding temporary locks prevents timeout errors originating from stripe test limits during busy release cycles.
                </p>
              </div>
            </div>
          </div>

        </div>

      </div>

    </div>
  );
}
