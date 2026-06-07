import React, { useState, useEffect } from 'react';
import { TabType, TestingSourceType } from './types';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import DashboardView from './components/DashboardView';
import AppExplorerView from './components/AppExplorerView';
import TestCasesView from './components/TestCasesView';
import TestExecutionView from './components/TestExecutionView';
import FailureAnalysisView from './components/FailureAnalysisView';
import ReportsView from './components/ReportsView';
import { Info, Sparkles, X, Check, Loader2 } from 'lucide-react';

export default function App() {
  
  // Tab view controller state
  const [activeTab, setActiveTab] = useState<TabType>('Dashboard');
  
  // Global search text state
  const [searchText, setSearchText] = useState('');

  // Active testing coordinates configurations
  const [testingSource, setTestingSource] = useState<TestingSourceType>('Public URL');
  const [publicUrl, setPublicUrl] = useState('https://acme-store.com');

  // Interactive executing batch test ids
  const [runningTestIds, setRunningTestIds] = useState<string[]>([]);
  
  // Custom interactive system alert ticker status
  const [systemAlert, setSystemAlert] = useState<{ msg: string; type: 'info' | 'success' | 'warn' } | null>(null);

  // Triggering the alert messages
  const notify = (msg: string, type: 'info' | 'success' | 'warn' = 'success') => {
    setSystemAlert({ msg, type });
  };

  const clearNotification = () => {
    setSystemAlert(null);
  };

  // Automatically dismiss notifications after 5 seconds
  useEffect(() => {
    if (systemAlert) {
      const timer = setTimeout(() => {
        setSystemAlert(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [systemAlert]);

  // Initial welcome message
  useEffect(() => {
    notify('Welcome to FlowGuard AI. Autonomous crawler walkthrough session loaded successfully.', 'info');
  }, []);

  // When user selects elements from TestCase to execute
  const handleRunSelectedTests = (selectedIds: string[]) => {
    setRunningTestIds(selectedIds);
    setActiveTab('Test Execution');
    notify(`Starting active pipeline execution for selected specs: ${selectedIds.join(', ')}`, 'success');
  };

  const handleNewTestSuiteCreation = () => {
    notify("Constructing new test suite definition sandbox with public source rules...", "info");
    setActiveTab("Test Cases");
  };

  return (
    <div className="flex h-screen bg-zinc-950 font-sans text-zinc-100 overflow-hidden select-none">
      
      {/* Side Navigation Rail Panel */}
      <Sidebar 
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        testingSource={testingSource}
        setTestingSource={setTestingSource}
        publicUrl={publicUrl}
        setPublicUrl={setPublicUrl}
        onNewTestSuite={handleNewTestSuiteCreation}
      />

      {/* Main Command Workspace */}
      <div className="flex-1 flex flex-col h-full overflow-hidden relative">
        
        {/* Dynamic header alerts ticker block */}
        {systemAlert && (
          <div className="absolute top-18 right-6 z-50 animate-bounce">
            <div className={`p-3 rounded-xl shadow-2xl flex items-center justify-between gap-4 border text-xs max-w-md ${
              systemAlert.type === 'success'
                ? 'bg-[#14532d]/40 text-emerald-300 border-emerald-500/20'
                : systemAlert.type === 'warn'
                  ? 'bg-[#78350f]/40 text-amber-300 border-amber-500/20'
                  : 'bg-[#1e1b4b]/50 text-indigo-200 border-indigo-500/25'
            }`}>
              <div className="flex items-center gap-2.5">
                {systemAlert.type === 'success' ? (
                  <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                ) : (
                  <Info className="w-4 h-4 text-indigo-300 shrink-0" />
                )}
                <span>{systemAlert.msg}</span>
              </div>
              <button onClick={clearNotification} className="text-neutral-500 hover:text-neutral-300 cursor-pointer">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* Global Toolbar and Profile controls */}
        <Header 
          activeTab={activeTab}
          onSearch={setSearchText}
          isAnalyzing={false}
        />

        {/* Active main workspace viewport renderer */}
        <main className="flex-1 overflow-hidden flex flex-col bg-zinc-950/40">
          
          {activeTab === 'Dashboard' && (
            <DashboardView 
              searchText={searchText}
              onNavigateToTab={(tab) => {
                setActiveTab(tab);
                setSearchText('');
              }}
              onSetStatusText={(msg) => notify(msg, 'success')}
            />
          )}

          {activeTab === 'App Explorer' && (
            <AppExplorerView 
              searchText={searchText}
            />
          )}

          {activeTab === 'Test Cases' && (
            <TestCasesView 
              searchText={searchText}
              onRunSelected={handleRunSelectedTests}
              onSetStatusText={(msg) => notify(msg, 'success')}
            />
          )}

          {activeTab === 'Test Execution' && (
            <TestExecutionView 
              searchText={searchText}
              runningTestIds={runningTestIds}
              onSetStatusText={(msg) => notify(msg, 'info')}
            />
          )}

          {activeTab === 'Failure Analysis' && (
            <FailureAnalysisView 
              searchText={searchText}
              onSetStatusText={(msg) => notify(msg, 'warn')}
            />
          )}

          {activeTab === 'Reports' && (
            <ReportsView 
              searchText={searchText}
              onSetStatusText={(msg) => notify(msg, 'info')}
            />
          )}

        </main>
      </div>

    </div>
  );
}
