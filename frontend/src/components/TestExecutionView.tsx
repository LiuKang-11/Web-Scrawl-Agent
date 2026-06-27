import React from 'react';
import { 
  Play, 
  X, 
  CheckCircle, 
  Terminal, 
  ZoomIn, 
  ExternalLink, 
  Maximize2, 
  Cpu, 
  AlertTriangle,
} from 'lucide-react';
import { executeUiPathTests, getUiPathJob } from '../api';
import { TestCase, UiPathJobStatus } from '../types';

interface TestExecutionViewProps {
  searchText: string;
  publicUrl: string;
  runningTestIds?: string[];
  runningTestCases?: TestCase[];
  onSetStatusText?: (msg: string) => void;
}

export default function TestExecutionView({
  searchText,
  publicUrl,
  runningTestIds = [],
  runningTestCases = [],
  onSetStatusText
}: TestExecutionViewProps) {
  void searchText;
  
  const [isRunning, setIsRunning] = React.useState(false);
  const [progress, setProgress] = React.useState(0);
  const [elapsedTime, setElapsedTime] = React.useState(0);
  const [submission, setSubmission] = React.useState<{ jobId?: number | null; packageId?: string; state?: string | null } | null>(null);
  const [jobStatus, setJobStatus] = React.useState<UiPathJobStatus | null>(null);
  const [executionError, setExecutionError] = React.useState<string | null>(null);
  const submittedKeyRef = React.useRef<string>('');
  
  // Terminal logs streaming state
  const [logs, setLogs] = React.useState<string[]>([]);

  const terminalRef = React.useRef<HTMLDivElement>(null);

  // Auto-scroll log screen
  React.useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [logs]);

  const selectedRunKey = React.useMemo(
    () => runningTestIds.length ? runningTestIds.join('|') : '',
    [runningTestIds]
  );

  const isTerminalState = (state?: string | null) =>
    ['Successful', 'Faulted', 'Stopped', 'Suspended'].includes(state || '');

  const stateProgress = (state?: string | null) => {
    switch (state) {
      case 'Successful':
        return 100;
      case 'Faulted':
      case 'Stopped':
      case 'Suspended':
        return 100;
      case 'Running':
        return 65;
      case 'Pending':
        return 35;
      default:
        return runningTestCases.length ? 15 : 0;
    }
  };

  const displayState = executionError
    ? 'ERROR'
    : jobStatus?.state || submission?.state || (isRunning ? 'SUBMITTED' : runningTestCases.length ? 'READY' : 'IDLE');

  React.useEffect(() => {
    if (!selectedRunKey || runningTestCases.length === 0) {
      setIsRunning(false);
      setProgress(0);
      setLogs(["[SYSTEM] Select test cases and click Run Selected to submit a UiPath execution."]);
      return;
    }
    if (submittedKeyRef.current === selectedRunKey) return;

    submittedKeyRef.current = selectedRunKey;
    setElapsedTime(0);
    setProgress(10);
    setJobStatus(null);
    setSubmission(null);
    setExecutionError(null);
    setIsRunning(true);
    setLogs([
      `[SYSTEM] Preparing FlowGuard package for ${runningTestCases.length} selected test case(s).`,
      `[INFO] Target app: ${publicUrl}`,
      "[ACTION] Submitting execution package to UiPath Orchestrator...",
    ]);

    executeUiPathTests(publicUrl, runningTestCases)
      .then(result => {
        setSubmission({ jobId: result.job_id, packageId: result.package_id, state: result.state });
        setProgress(stateProgress(result.state));
        setLogs(prev => [
          ...prev,
          `[SUCCESS] Package ${result.package_id} submitted to UiPath.`,
          result.job_id ? `[INFO] Orchestrator job id: ${result.job_id}` : "[WARNING] UiPath did not return a job id.",
          result.state ? `[INFO] Initial UiPath state: ${result.state}` : "[INFO] Waiting for UiPath job state...",
        ]);
        onSetStatusText?.(`Submitted ${result.submitted_count} tests to UiPath Orchestrator.`);
      })
      .catch(error => {
        const message = error instanceof Error ? error.message : 'UiPath execution failed.';
        setExecutionError(message);
        setIsRunning(false);
        setProgress(100);
        setLogs(prev => [...prev, `[ERROR] ${message}`]);
        onSetStatusText?.('UiPath execution submission failed.');
      });
  }, [onSetStatusText, publicUrl, runningTestCases, selectedRunKey]);

  // Handle timer increments
  React.useEffect(() => {
    let timerId: any;
    if (isRunning) {
      timerId = setInterval(() => {
        setElapsedTime(prev => prev + 1);
      }, 1000);
    }
    return () => clearInterval(timerId);
  }, [isRunning]);

  React.useEffect(() => {
    if (!submission?.jobId || !isRunning) return;

    const poll = async () => {
      try {
        const status = await getUiPathJob(submission.jobId as number);
        setJobStatus(status);
        setProgress(stateProgress(status.state));
        setLogs(prev => {
          const line = `[INFO] UiPath job ${status.id} state: ${status.state || 'Unknown'}`;
          return prev[prev.length - 1] === line ? prev : [...prev, line];
        });
        if (isTerminalState(status.state)) {
          setIsRunning(false);
          if (status.state === 'Successful') {
            setLogs(prev => [...prev, "[SUCCESS] UiPath execution finished successfully."]);
            onSetStatusText?.('UiPath execution completed successfully.');
          } else {
            setLogs(prev => [...prev, `[ERROR] UiPath execution ended as ${status.state}.`]);
            onSetStatusText?.(`UiPath execution ended as ${status.state}.`);
          }
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unable to poll UiPath job.';
        setExecutionError(message);
        setLogs(prev => [...prev, `[ERROR] ${message}`]);
      }
    };

    poll();
    const timer = window.setInterval(poll, 4000);
    return () => window.clearInterval(timer);
  }, [isRunning, onSetStatusText, submission?.jobId]);

  // Execution pipeline configuration
  const steps = runningTestCases.length
    ? runningTestCases.map((testCase, index) => ({
        title: testCase.name,
        status: jobStatus?.state === 'Successful'
          ? 'Passed'
          : executionError || ['Faulted', 'Stopped', 'Suspended'].includes(jobStatus?.state || '')
            ? 'Failed'
            : index === 0
              ? 'Active'
              : 'Pending',
        detail: testCase.expectedResult || testCase.steps?.join(' -> ') || 'Submitted to the UiPath runner.',
      }))
    : [
        { title: "Waiting for selected test cases", status: "Pending", detail: "Open Test Cases, generate from the latest crawl, then run selected specs." },
      ];

  // Convert elapsed seconds to mm:ss block format
  const formatTime = (seconds: number) => {
    const min = Math.floor(seconds / 60);
    const sec = seconds % 60;
    return `${min.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
  };

  const handleAbort = () => {
    setIsRunning(false);
    setLogs(prev => [...prev, "[WARNING] Local polling stopped. The UiPath job may still be running in Orchestrator."]);
    if (onSetStatusText) onSetStatusText("Stopped local execution polling.");
  };

  return (
    <div className="flex-1 overflow-hidden flex flex-col h-full max-w-[1600px] mx-auto w-full select-none">
      
      {/* Execution HUD Status Header */}
      <div className="p-6 border-b border-neutral-800 bg-neutral-900/10 space-y-4 shrink-0">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <h2 className="text-sm font-mono font-bold text-neutral-300 uppercase tracking-widest">Active Run Pipeline</h2>
              <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${isRunning ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/25 animate-pulse' : executionError ? 'bg-rose-500/10 text-rose-400 border border-rose-500/25' : 'bg-neutral-800 text-neutral-400'}`}>
                {displayState}
              </span>
            </div>
            <p className="text-xs text-neutral-400">Spec ID Scope: {runningTestIds.length > 0 ? runningTestIds.join(', ') : 'No selected specs yet'}</p>
            {submission?.jobId ? (
              <p className="text-[11px] text-neutral-500 font-mono">UiPath job: {submission.jobId} · package: {submission.packageId}</p>
            ) : null}
          </div>

          {/* Quick HUD Metrics */}
          <div className="flex items-center gap-6 font-mono text-xs">
            <div className="bg-neutral-950 p-2 rounded-lg border border-neutral-850 px-4">
              <span className="text-[10px] text-neutral-500 block uppercase font-semibold">ELAPSED TIME</span>
              <span className="text-neutral-200 font-bold">{formatTime(elapsedTime)}</span>
            </div>
            
            <div className="bg-neutral-950 p-2 rounded-lg border border-neutral-850 px-4">
              <span className="text-[10px] text-neutral-500 block uppercase font-semibold">ORCHESTRATOR</span>
              <span className="text-emerald-400 font-bold">{submission?.jobId ? 'Connected' : 'Ready'}</span>
            </div>

            {/* Run Actions */}
            <div className="flex items-center gap-2">
              <button 
                disabled
                className="bg-neutral-850 hover:bg-neutral-700 text-neutral-200 font-bold text-xs p-2 rounded-lg border border-neutral-700 transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <Play className="w-4 h-4 text-emerald-400" />
                UiPath Managed
              </button>
              <button 
                onClick={handleAbort}
                className="bg-neutral-950 hover:bg-neutral-900 text-rose-400 font-bold text-xs p-2 rounded-lg border border-neutral-850 transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <X className="w-4 h-4" />
                Abort
              </button>
            </div>
          </div>
        </div>

        {/* Big HUD Progress Bar */}
        <div className="space-y-1.5">
          <div className="flex justify-between items-center text-[10px] font-mono text-neutral-400 font-bold">
            <span>UiPath Execution Progress</span>
            <span>{Math.floor(progress)}% Completed</span>
          </div>
          <div className="h-2 w-full bg-neutral-900 rounded-full overflow-hidden border border-neutral-800">
            <div 
              className="h-full bg-indigo-500 rounded-full transition-all duration-300 relative" 
              style={{ width: `${progress}%` }}
            >
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-pulse" />
            </div>
          </div>
        </div>
      </div>

      {/* Split visual workspace content body */}
      <div className="flex-1 flex flex-col xl:flex-row divide-y xl:divide-y-0 xl:divide-x divide-neutral-800 overflow-hidden">
        
        {/* Left pane: pipeline details list */}
        <div className="w-full xl:w-[350px] bg-neutral-950/20 p-6 overflow-y-auto space-y-4 shrink-0 col-span-3">
          <h3 className="text-[10px] text-neutral-400 uppercase tracking-widest font-mono font-bold mb-2">Execution Steps</h3>
          <div className="space-y-3">
            {steps.map((step, idx) => {
              const isPassed = step.status === "Passed";
              const isActive = step.status === "Active";
              const isFailed = step.status === "Failed";
              
              return (
                <div 
                  key={idx}
                  className={`p-4 rounded-xl border transition-all ${
                    isActive 
                      ? 'bg-indigo-500/10 border-indigo-500/35 shadow-[0_0_15px_rgba(99,102,241,0.08)]' 
                      : isPassed 
                        ? 'bg-neutral-900/30 border-neutral-800/60 opacity-80' 
                        : 'bg-neutral-900/10 border-transparent opacity-40'
                  }`}
                >
                  <div className="flex gap-3 items-start">
                    {/* Visual status index badge */}
                    <div className="mt-1">
                      {isPassed ? (
                        <CheckCircle className="w-4 h-4 text-emerald-400" />
                      ) : isFailed ? (
                        <AlertTriangle className="w-4 h-4 text-rose-400" />
                      ) : isActive ? (
                        <div className="w-4 h-4 rounded-full border-2 border-indigo-400 border-t-transparent animate-spin" />
                      ) : (
                        <div className="w-4 h-4 rounded-full border border-neutral-700" />
                      )}
                    </div>
                    <div>
                      <h4 className={`text-xs font-semibold ${isFailed ? 'text-rose-300' : isActive ? 'text-indigo-300' : 'text-neutral-200'}`}>{step.title}</h4>
                      <p className="text-[10px] text-neutral-400 mt-1 font-mono leading-relaxed">{step.detail}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Center column: Live Console log terminal */}
        <div className="flex-1 flex flex-col p-6 overflow-hidden col-span-5 min-h-[300px]">
          <div className="flex-1 flex flex-col bg-black rounded-2xl border border-neutral-800/80 overflow-hidden font-mono shadow-2xl relative">
            <div className="h-9 bg-neutral-950 border-b border-neutral-850 px-4 flex items-center justify-between text-[11px] text-neutral-400">
              <span className="flex items-center gap-2">
                <Terminal className="w-4 h-4 text-indigo-400" />
                Live Terminal Console Output
              </span>
              <span className="text-[10px] text-neutral-600">STDOUT worker.42</span>
            </div>

            {/* Scrollable logs space */}
            <div 
              ref={terminalRef}
              className="flex-1 p-5 overflow-y-auto text-xs text-neutral-300 space-y-2 select-text hide-scrollbar"
            >
              {logs.map((log, idx) => {
                const isSystem = log.startsWith("[SYSTEM]");
                const isSuccess = log.startsWith("[SUCCESS]");
                return (
                  <div key={idx} className="leading-relaxed select-text">
                    <span className="text-neutral-600 mr-2 font-bold">{`>${(idx + 1).toString().padStart(2, '0')}`}</span>
                    <span className={isSystem ? "text-indigo-400 font-bold" : isSuccess ? "text-emerald-400 font-bold" : "text-neutral-300"}>
                      {log}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Pane: Device Laptop frame web preview preview */}
        <div className="w-full xl:w-[480px] bg-neutral-950/40 p-6 flex flex-col h-full overflow-hidden border-t xl:border-t-0 shrink-0 select-none col-span-4">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-[10px] text-neutral-400 uppercase tracking-widest font-mono font-bold flex items-center gap-1.5">
              <Cpu className="w-4.5 h-4.5 text-indigo-400" />
              Live Chromium iFrame preview
            </h3>

            {/* Overlay tools */}
            <div className="flex items-center gap-1">
              <button className="text-neutral-400 hover:text-indigo-400 p-1.5 rounded-md hover:bg-neutral-850">
                <ZoomIn className="w-4 h-4" />
              </button>
              <button className="text-neutral-400 hover:text-indigo-400 p-1.5 rounded-md hover:bg-neutral-850">
                <Maximize2 className="w-4 h-4" />
              </button>
              <button className="text-neutral-400 hover:text-indigo-400 p-1.5 rounded-md hover:bg-neutral-850">
                <ExternalLink className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Simulated Laptop Frame viewport rendering */}
          <div className="flex-1 bg-neutral-900 border border-neutral-800 rounded-xl overflow-hidden relative shadow-2xl flex flex-col min-h-[300px]">
            {/* Top Safari browser controls frame */}
            <div className="h-8 bg-neutral-950 border-b border-neutral-800 flex items-center px-4 justify-between">
              <div className="flex gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-neutral-700" />
                <div className="w-2.5 h-2.5 rounded-full bg-neutral-700" />
                <div className="w-2.5 h-2.5 rounded-full bg-neutral-700" />
              </div>
              <div className="bg-neutral-900 border border-neutral-800 text-[10px] font-mono py-0.5 px-3 rounded text-neutral-400 w-3/5 truncate text-center">
                {publicUrl}
              </div>
              <div className="w-4" />
            </div>

            {/* Simulated Live Snapshot UI */}
            <div className="flex-1 relative overflow-hidden bg-neutral-950 flex items-center justify-center">
              <img 
                alt="App screenshot"
                className="w-full h-full object-cover select-none pointer-events-none opacity-85"
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuAcDzixMB8jjvvgmf96N-xgSbe2byOs5_A0PHe2OLmjnr-_onVLRFxYEL6pv2GyXvPCsgaTLnS2xv5LHFAuEN22csDn2Bh-g6Vt6gkpFi2MtuxdyGKI4gFHxdvSHEnXXl4uEnSrUfnJCc9BLj2V18lSB1wax5LvQti6wkbDBPfKyQhsKpSHc3CRcizbMdCSwkjj4HcBZ6Jcn4xNi3lA6r5KtFZaE4rPz6Yu1XXlStqb21Z1TmF9zJo0G3R51nEm3TX4UaUNgb-pSOk"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = "https://images.unsplash.com/photo-1531403009284-440f080d1e12?auto=format&fit=crop&q=80&w=600";
                }}
              />

              {/* Glowing cursor pointer simulating AI automation click target */}
              <div 
                className="absolute w-7 h-7 rounded-full bg-indigo-500/20 border-2 border-indigo-400/80 animate-ping" 
                style={{ top: '65%', left: '48%', animationDuration: '3s' }}
              />
              <div 
                className="absolute w-3 h-3 rounded-full bg-indigo-400 shadow-[0_0_15px_#818cf8]"
                style={{ top: '65%', left: '48%' }}
              />

              {/* Glowing interactive highlight outline box on critical form elements */}
              <div 
                className="absolute border border-indigo-400 bg-indigo-400/5 shadow-[0_0_15px_rgba(99,102,241,0.1)] rounded"
                style={{ top: '48%', left: '15%', width: '70%', height: '35%' }}
              />
              <span 
                className="absolute bg-indigo-500 text-white font-mono text-[9px] font-bold px-1 rounded shadow-lg"
                style={{ top: '44%', left: '15%' }}
              >
                Automation Focus: UiPath Test Runner
              </span>
            </div>
          </div>
        </div>

      </div>

    </div>
  );
}
