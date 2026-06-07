import React from 'react';
import { 
  Terminal, 
  Globe, 
  Github, 
  Radio, 
  Sparkle, 
  ArrowRight, 
  TrendingUp, 
  BarChart2, 
  AlertCircle,
  Play,
  RotateCw,
  Clock,
  Info
} from 'lucide-react';

interface DashboardViewProps {
  searchText: string;
  onNavigateToTab: (tabName: 'App Explorer' | 'Test Cases' | 'Test Execution' | 'Failure Analysis' | 'Reports') => void;
  onSetStatusText?: (msg: string) => void;
}

export default function DashboardView({
  searchText,
  onNavigateToTab,
  onSetStatusText
}: DashboardViewProps) {
  const [pagesDiscovered, setPagesDiscovered] = React.useState(48);
  const [totalTestCases, setTotalTestCases] = React.useState(156);
  const [passedRate, setPassedRate] = React.useState(98.4);
  const [failedCount, setFailedCount] = React.useState(3);
  
  const [isScanning, setIsScanning] = React.useState(false);
  const [scanProgress, setScanProgress] = React.useState(0);
  const [scanMessage, setScanMessage] = React.useState('');
  const [activeTooltip, setActiveTooltip] = React.useState<string | null>(null);

  // Quick Action dialog states
  const [openModalType, setOpenModalType] = React.useState<'local' | 'public' | 'repo' | null>(null);
  const [publicUrlInput, setPublicUrlInput] = React.useState('https://acme-store.com');
  const [githubUrlInput, setGithubUrlInput] = React.useState('github.com/acme/web-portal');

  const startScan = () => {
    if (isScanning) return;
    setIsScanning(true);
    setScanProgress(5);
    setScanMessage('Initiating crawler session...');
    if (onSetStatusText) onSetStatusText('Initiating crawling on virtual host...');

    const interval = setInterval(() => {
      setScanProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          setTimeout(() => {
            setIsScanning(false);
            setPagesDiscovered(52);
            setTotalTestCases(164);
            setPassedRate(98.8);
            if (onSetStatusText) onSetStatusText('Scan finished successfully. Found 4 new pages.');
          }, 600);
          return 100;
        }

        const next = prev + Math.floor(Math.random() * 15) + 5;
        const current = next > 100 ? 100 : next;
        
        if (current < 25) {
          setScanMessage('Analyzing sitemap and links...');
        } else if (current < 55) {
          setScanMessage('Mapping router endpoints...');
        } else if (current < 80) {
          setScanMessage('Resolving 164 functional unit selectors...');
        } else {
          setScanMessage('Formulating stateful transition matrices...');
        }

        return current;
      });
    }, 450);
  };

  // Static bars representing coverage chart data
  const coverageData = [
    { name: 'Auth', activeHeight: 'h-[40%]', percent: '76%', colorClass: 'bg-indigo-400/35 hover:bg-indigo-400/50' },
    { name: 'Cart', activeHeight: 'h-[70%]', percent: '84%', colorClass: 'bg-indigo-400/45 hover:bg-indigo-400/60' },
    { name: 'Checkout', activeHeight: 'h-[90%]', percent: '98%', colorClass: 'bg-emerald-400/50 border-t-2 border-emerald-400' },
    { name: 'Profile', activeHeight: 'h-[50%]', percent: '88%', colorClass: 'bg-indigo-400/35 hover:bg-indigo-400/50' },
    { name: 'API', activeHeight: 'h-[25%]', percent: '52%', colorClass: 'bg-rose-400/35 border-t-2 border-rose-400 hover:bg-rose-400/50' },
  ];

  const failures = [
    { tc: 'TC-8492', title: 'Stripe Webhook Timeout', time: '2m ago' },
    { tc: 'TC-8411', title: 'Cart Total Calculation', time: '5m ago' },
    { tc: 'TC-8305', title: 'Promo Code Validation', time: '12m ago' },
  ].filter(f => 
    searchText ? (f.title.toLowerCase().includes(searchText.toLowerCase()) || f.tc.toLowerCase().includes(searchText.toLowerCase())) : true
  );

  return (
    <div className="flex-1 p-6 overflow-y-auto max-w-[1600px] mx-auto w-full space-y-6">
      
      {/* Hero / State Card */}
      <section className="glass-panel rounded-2xl p-6 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none" />
        
        <div className="flex flex-col gap-2 z-10">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-neutral-100 tracking-tight font-display">Acme Web Portal</h1>
            <span className="bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 px-2 py-0.5 rounded text-xs font-semibold flex items-center gap-1">
              <Radio className="w-3.5 h-3.5 animate-pulse text-indigo-400" />
              {isScanning ? 'Scanning...' : 'Analyzing'}
            </span>
          </div>
          <div className="flex items-center gap-4 text-xs text-neutral-400">
            <span className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-neutral-500" /> 
              Last Run: 14m ago
            </span>
            <span className="w-1.5 h-1.5 rounded-full bg-neutral-700" />
            <span className="flex items-center gap-1.5">
              <Sparkle className="w-3.5 h-3.5 text-emerald-400" />
              Release: <span className="text-emerald-400 font-semibold">Recommended</span>
            </span>
          </div>
        </div>

        {/* Risk Score Component */}
        <div className="flex items-center gap-4 bg-neutral-900/60 p-4 rounded-lg border border-neutral-800 z-10 min-w-[210px]">
          <div className="relative w-14 h-14 flex items-center justify-center">
            {/* SVG circle track and fill */}
            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
              <path 
                className="text-neutral-800" 
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" 
                fill="none" 
                stroke="currentColor" 
                strokeWidth="3.5" 
              />
              <path 
                className="text-emerald-400" 
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" 
                fill="none" 
                stroke="currentColor" 
                strokeWidth="3.5"
                strokeDasharray="12, 100" 
              />
            </svg>
            <span className="absolute text-sm font-bold text-emerald-400">12</span>
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] text-neutral-400 uppercase tracking-wider font-semibold">Risk Score</span>
            <span className="text-sm text-emerald-400 font-bold">Low Concern</span>
          </div>
        </div>
      </section>

      {/* Progress display if scanning */}
      {isScanning && (
        <section className="bg-indigo-950/25 border border-indigo-500/20 p-4 rounded-xl space-y-2">
          <div className="flex justify-between items-center text-xs font-mono">
            <span className="text-indigo-400 font-semibold">{scanMessage}</span>
            <span className="text-indigo-200">{scanProgress}%</span>
          </div>
          <div className="h-2 w-full bg-neutral-800 rounded-full overflow-hidden">
            <div 
              className="h-full bg-indigo-500 rounded-full transition-all duration-300 relative" 
              style={{ width: `${scanProgress}%` }}
            >
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-pulse" />
            </div>
          </div>
        </section>
      )}

      {/* Quick Actions Grid */}
      <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Connect Link Local */}
        <button 
          onClick={() => setOpenModalType('local')}
          className="bg-neutral-900 hover:bg-neutral-800/80 hover:border-neutral-700 transition-all border border-neutral-800/60 rounded-xl p-4 flex flex-col items-start gap-4 text-left group cursor-pointer"
        >
          <div className="w-10 h-10 rounded-lg bg-indigo-500/10 flex items-center justify-center text-indigo-400 group-hover:bg-indigo-500 group-hover:text-neutral-950 transition-all">
            <Terminal className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-xs font-semibold text-neutral-200">Connect Local App</h3>
            <p className="text-[11px] text-neutral-400 font-mono mt-1">Via FlowGuard CLI daemon</p>
          </div>
        </button>

        {/* Connect Public URL */}
        <button 
          onClick={() => setOpenModalType('public')}
          className="bg-neutral-900 hover:bg-neutral-800/80 hover:border-neutral-700 transition-all border border-neutral-800/60 rounded-xl p-4 flex flex-col items-start gap-4 text-left group cursor-pointer"
        >
          <div className="w-10 h-10 rounded-lg bg-indigo-500/10 flex items-center justify-center text-indigo-400 group-hover:bg-indigo-500 group-hover:text-neutral-950 transition-all">
            <Globe className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-xs font-semibold text-neutral-200">Connect Public URL</h3>
            <p className="text-[11px] text-neutral-400 font-mono mt-1">Agentless crawler discovery</p>
          </div>
        </button>

        {/* Connect GitHub */}
        <button 
          onClick={() => setOpenModalType('repo')}
          className="bg-neutral-900 hover:bg-neutral-800/80 hover:border-neutral-700 transition-all border border-neutral-800/60 rounded-xl p-4 flex flex-col items-start gap-4 text-left group cursor-pointer"
        >
          <div className="w-10 h-10 rounded-lg bg-indigo-500/10 flex items-center justify-center text-indigo-400 group-hover:bg-indigo-500 group-hover:text-neutral-950 transition-all">
            <Github className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-xs font-semibold text-neutral-200">Import Repository</h3>
            <p className="text-[11px] text-neutral-400 font-mono mt-1">Connect GitHub action pipelines</p>
          </div>
        </button>

        {/* Start New Scan Action */}
        <button 
          onClick={startScan}
          disabled={isScanning}
          className="bg-indigo-600 hover:bg-indigo-500 disabled:bg-neutral-800 disabled:opacity-60 transition-all rounded-xl p-4 flex flex-col items-start gap-4 text-left relative overflow-hidden group shadow-[0_0_20px_rgba(99,102,241,0.2)] cursor-pointer"
        >
          <div className="absolute inset-0 bg-gradient-to-tr from-transparent to-white/10 pointer-events-none" />
          
          <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center text-white">
            {isScanning ? (
              <RotateCw className="w-5 h-5 animate-spin" />
            ) : (
              <Radio className="w-5 h-5" />
            )}
          </div>
          <div>
            <h3 className="text-xs font-bold text-white">Start New Scan</h3>
            <p className="text-[11px] text-white/80 font-mono mt-1">
              {isScanning ? 'Scan active...' : 'Initiate deep analysis session'}
            </p>
          </div>
        </button>
      </section>

      {/* Main Bento Grid */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Metrics & Graph charts Column */}
        <div className="lg:col-span-8 space-y-6">
          
          {/* Diagnostic Metrics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="glass-panel rounded-2xl p-4 flex flex-col justify-between">
              <span className="text-[10px] text-neutral-400 uppercase tracking-widest font-bold">Pages Discovered</span>
              <span className="text-2xl font-bold text-neutral-100 mt-2 font-display">{pagesDiscovered}</span>
            </div>
            
            <div className="glass-panel rounded-2xl p-4 flex flex-col justify-between">
              <span className="text-[10px] text-neutral-400 uppercase tracking-widest font-bold">Test Cases</span>
              <span className="text-2xl font-bold text-neutral-100 mt-2 font-display">{totalTestCases}</span>
            </div>

            <div className="glass-panel rounded-2xl p-4 flex flex-col justify-between border-l-2 border-emerald-400">
              <span className="text-[10px] text-neutral-400 uppercase tracking-widest font-bold">Passed Checks</span>
              <div className="flex items-baseline gap-2 mt-2">
                <span className="text-2xl font-bold text-emerald-400 font-display">{passedRate}%</span>
                <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-1 py-0.5 rounded font-bold">↑ 1.2%</span>
              </div>
            </div>

            <div className="glass-panel rounded-2xl p-4 flex flex-col justify-between border-l-2 border-rose-400">
              <span className="text-[10px] text-neutral-400 uppercase tracking-widest font-bold">Failed Blocks</span>
              <span className="text-2xl font-bold text-rose-400 mt-2 font-display">{failedCount}</span>
            </div>
          </div>

          {/* Test Coverage SVG Chart */}
          <div className="glass-panel rounded-2xl p-6 flex flex-col min-h-[300px]">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-sm font-bold text-neutral-200 flex items-center gap-2 font-display tracking-tight">
                <BarChart2 className="w-4.5 h-4.5 text-indigo-400" />
                Test Coverage Breakdown
              </h2>
              <span className="text-lg font-bold text-indigo-300 font-display font-medium">88% Total</span>
            </div>

            {/* Simulated Chart Plot Area */}
            <div className="flex-1 w-full bg-neutral-950/60 rounded-lg border border-[#2a2a2b] relative flex items-end p-4 gap-4 min-h-[180px]">
              {coverageData.map((bar, i) => (
                <div 
                  key={i}
                  onMouseEnter={() => setActiveTooltip(bar.name)}
                  onMouseLeave={() => setActiveTooltip(null)}
                  className={`w-full ${bar.activeHeight} rounded-t transition-all duration-300 relative group cursor-pointer ${bar.colorClass}`}
                >
                  {/* Tooltip render */}
                  {activeTooltip === bar.name && (
                    <div className="absolute -top-11 left-1/2 -translate-x-1/2 bg-neutral-900 border border-neutral-700 font-mono text-[10px] px-2 py-1 rounded text-neutral-200 whitespace-nowrap z-30 shadow-xl">
                      {bar.name}: <span className="font-semibold text-emerald-400">{bar.percent} verified</span>
                    </div>
                  )}
                  {/* Visual hover grid alignment lines indicators */}
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              ))}
            </div>
            
            {/* Legend Labels */}
            <div className="flex justify-between text-[11px] font-semibold text-neutral-400 mt-3 px-3">
              {coverageData.map((bar, i) => (
                <span key={i} className="hover:text-indigo-400 transition-colors uppercase font-mono">{bar.name}</span>
              ))}
            </div>
          </div>

        </div>

        {/* AI Insights & Recent Activity Column */}
        <div className="lg:col-span-4 flex flex-col gap-6">
          
          {/* AI FlowGuard Insight Panel */}
          <div className="ai-insight-panel rounded-xl p-5 flex flex-col gap-4">
            <div className="flex items-center gap-2 text-indigo-400">
              <Sparkle className="w-5 h-5 text-indigo-400 animate-pulse" />
              <span className="text-[10px] font-bold uppercase tracking-widest font-mono">FlowGuard AI Insight</span>
            </div>
            <p className="text-xs text-neutral-300 leading-normal">
              Analysis indicates the 3 failed tests are localized to the <code className="font-mono text-[11px] bg-neutral-950 px-1 py-0.5 rounded text-indigo-400 border border-neutral-800">/checkout/payment</code> route.
            </p>
            <div className="bg-neutral-950/70 p-3 rounded-lg border border-neutral-800">
              <p className="text-[11px] font-mono text-neutral-400 leading-relaxed">
                Potential cause: Latency spike in 3rd party payment gateway mock during concurrent load testing phase.
              </p>
            </div>
            <button 
              onClick={() => onNavigateToTab('Failure Analysis')}
              className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold flex items-center gap-1.5 transition-colors self-start cursor-pointer"
            >
              View Root Cause Analysis 
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Recent Failures compact table */}
          <div className="glass-panel rounded-2xl flex flex-col h-full overflow-hidden">
            <div className="p-4 border-b border-[#2a2a2b] bg-neutral-950/20 flex justify-between items-center">
              <h3 className="text-xs font-bold text-neutral-300 uppercase tracking-wider font-mono flex items-center gap-1.5">
                <AlertCircle className="w-4 h-4 text-rose-400" />
                Recent Failures
              </h3>
              <span className="text-[9px] bg-rose-500/10 text-rose-400 px-1.5 py-0.5 rounded-sm font-bold font-mono">
                {failures.length} active
              </span>
            </div>

            <div className="divide-y divide-neutral-800 flex-1 flex flex-col justify-start">
              {failures.length === 0 ? (
                <div className="p-8 text-center text-xs text-neutral-500 font-mono">
                  No matching failures found.
                </div>
              ) : (
                failures.map((f, i) => (
                  <div 
                    key={i} 
                    onClick={() => onNavigateToTab('Failure Analysis')}
                    className="p-4 hover:bg-neutral-800/30 transition-all flex justify-between items-start gap-4 cursor-pointer group"
                  >
                    <div className="flex gap-3">
                      <div className="w-1.5 h-1.5 rounded-full bg-rose-400 mt-1.5 shrink-0 animate-pulse" />
                      <div className="flex flex-col">
                        <span className="text-xs text-neutral-200 font-medium group-hover:text-indigo-300 transition-colors">
                          {f.title}
                        </span>
                        <span className="text-[10px] text-neutral-500 font-mono mt-0.5">{f.tc}</span>
                      </div>
                    </div>
                    <span className="text-[10px] text-neutral-500 font-mono whitespace-nowrap">{f.time}</span>
                  </div>
                ))
              )}
            </div>
          </div>

        </div>
      </section>

      {/* Modal Dialog Simulator */}
      {openModalType && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 select-none">
          <div className="bg-neutral-900 border border-neutral-800 w-full max-w-md rounded-2xl overflow-hidden p-6 space-y-4 shadow-2xl text-white">
            <h2 className="text-base font-bold text-neutral-100 flex items-center gap-2">
              <Info className="w-5 h-5 text-indigo-400" />
              {openModalType === 'local' && 'Connect Local Daemon'}
              {openModalType === 'public' && 'Configure Public Crawler'}
              {openModalType === 'repo' && 'Import GitHub Action'}
            </h2>

            {openModalType === 'local' && (
              <div className="space-y-3 text-xs text-neutral-300">
                <p>Run the FlowGuard CLI daemon in your local dev workspace root or staging cluster container:</p>
                <code className="block bg-black/80 p-3 rounded-lg border border-neutral-800 text-indigo-400 font-mono text-[11px] leading-relaxed">
                  npx @flowguard/cli connect --key=usr_saimoe_92348a --port=3000
                </code>
                <p className="text-neutral-500 text-[11px]">FlowGuard will instantly pipe localhost traffic to the diagnostics stream.</p>
              </div>
            )}

            {openModalType === 'public' && (
              <div className="space-y-3 text-xs">
                <p className="text-neutral-300">Input target URL to scan recursively. The autonomous agent parses paths, forms, and triggers element states automatically:</p>
                <input
                  type="url"
                  value={publicUrlInput}
                  onChange={(e) => setPublicUrlInput(e.target.value)}
                  className="w-full bg-neutral-950 border border-neutral-700 focus:border-indigo-500 rounded-lg p-2 text-xs font-mono"
                />
              </div>
            )}

            {openModalType === 'repo' && (
              <div className="space-y-3 text-xs">
                <p className="text-neutral-300">Provide repository source namespace to trigger scans automatically during code pushes and pipeline commits:</p>
                <input
                  type="text"
                  value={githubUrlInput}
                  onChange={(e) => setGithubUrlInput(e.target.value)}
                  className="w-full bg-neutral-950 border border-neutral-700 focus:border-indigo-500 rounded-lg p-2 text-xs font-mono"
                />
              </div>
            )}

            <div className="flex justify-end gap-2.5 pt-2">
              <button 
                onClick={() => setOpenModalType(null)}
                className="bg-neutral-800 hover:bg-neutral-700 px-4 py-2 rounded-lg text-xs font-semibold cursor-pointer"
              >
                Close
              </button>
              {openModalType !== 'local' && (
                <button 
                  onClick={() => {
                    setOpenModalType(null);
                    if (onSetStatusText) onSetStatusText(`Testing Source updated successfully.`);
                  }}
                  className="bg-indigo-600 hover:bg-indigo-500 px-4 py-2 rounded-lg text-xs font-bold cursor-pointer"
                >
                  Save Integration
                </button>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
