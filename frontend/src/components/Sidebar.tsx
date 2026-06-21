import React from 'react';
import { TabType, TestingSourceType } from '../types';
import { 
  LayoutDashboard, 
  Compass, 
  ClipboardList, 
  PlayCircle, 
  AlertOctagon, 
  BarChart3, 
  Globe, 
  Database, 
  Github, 
  HelpCircle, 
  LogOut, 
  Zap,
  Check,
  Plus
} from 'lucide-react';

interface SidebarProps {
  activeTab: TabType;
  setActiveTab: (tab: TabType) => void;
  testingSource: TestingSourceType;
  setTestingSource: (source: TestingSourceType) => void;
  publicUrl: string;
  setPublicUrl: (url: string) => void;
  isDarkMode: boolean;
  onNewTestSuite?: () => void;
  onHelpCenter?: () => void;
  sidebarCollapsed?: boolean;
}

export default function Sidebar({
  activeTab,
  setActiveTab,
  testingSource,
  setTestingSource,
  publicUrl,
  setPublicUrl,
  isDarkMode,
  onNewTestSuite,
  onHelpCenter,
  sidebarCollapsed = false
}: SidebarProps) {
  
  const [urlInput, setUrlInput] = React.useState(publicUrl);
  const [showUrlEditor, setShowUrlEditor] = React.useState(false);

  const navigationItems = [
    { name: 'Dashboard' as TabType, icon: LayoutDashboard },
    { name: 'App Explorer' as TabType, icon: Compass },
    { name: 'Test Cases' as TabType, icon: ClipboardList },
    { name: 'Test Execution' as TabType, icon: PlayCircle },
    { name: 'Failure Analysis' as TabType, icon: AlertOctagon },
    { name: 'Reports' as TabType, icon: BarChart3 },
  ];

  const handleUrlSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPublicUrl(urlInput);
    setShowUrlEditor(false);
  };

  const shellClass = isDarkMode
    ? 'bg-zinc-950 border-zinc-800 text-zinc-100'
    : 'bg-white border-zinc-200 text-zinc-950 shadow-sm';
  const dividerClass = isDarkMode ? 'border-zinc-800' : 'border-zinc-200';
  const brandTextClass = isDarkMode ? 'text-zinc-100' : 'text-zinc-950';
  const mutedTextClass = isDarkMode ? 'text-zinc-400' : 'text-zinc-500';
  const sectionLabelClass = isDarkMode ? 'text-zinc-500' : 'text-zinc-400';
  const inactiveNavClass = isDarkMode
    ? 'text-zinc-400 border-transparent hover:bg-zinc-900 hover:text-zinc-200'
    : 'text-zinc-600 border-transparent hover:bg-zinc-100 hover:text-zinc-950';
  const inactiveIconClass = isDarkMode ? 'text-zinc-400' : 'text-zinc-500';
  const inputClass = isDarkMode
    ? 'bg-zinc-950 border-zinc-800 text-indigo-300 placeholder:text-zinc-700'
    : 'bg-white border-zinc-300 text-indigo-700 placeholder:text-zinc-400';

  return (
    <aside className={`w-[260px] border-r flex flex-col py-4 h-full shrink-0 justify-between select-none transition-colors ${shellClass}`}>
      <div>
        {/* Brand Header with Bento Rotating Diamond */}
        <div className={`px-6 pb-6 pt-2 flex items-center gap-3 border-b transition-colors ${dividerClass}`}>
          <div className="w-9 h-9 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/20 rotate-45">
            <Zap className="text-white w-4.5 h-4.5 -rotate-45" />
          </div>
          <div>
            <h1 className={`text-sm font-bold tracking-tight leading-none font-display ${brandTextClass}`}>FlowGuard AI</h1>
            <p className={`text-[10px] font-mono mt-1 uppercase tracking-wider ${mutedTextClass}`}>Autonomous QA</p>
          </div>
        </div>

        {/* Quick Action: New Test Suite button */}
        <div className="px-4 py-4">
          <button 
            onClick={onNewTestSuite}
            className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs py-2.5 px-4 rounded-xl flex items-center justify-center gap-2 transition-all shadow-[0_0_15px_rgba(99,102,241,0.15)] cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            New Test Suite
          </button>
        </div>

        {/* Primary Navigation */}
        <nav className="flex-1 px-3 space-y-1">
          {navigationItems.map((item) => {
            const IconComponent = item.icon;
            const isActive = activeTab === item.name;
            return (
              <button
                key={item.name}
                onClick={() => setActiveTab(item.name)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-xs font-semibold cursor-pointer border-l-4 transition-all duration-200 ${
                  isActive 
                    ? 'text-indigo-400 bg-indigo-500/10 border-indigo-500 shadow-[inset_4px_0_12px_rgba(99,102,241,0.05)]' 
                    : inactiveNavClass
                }`}
              >
                <IconComponent className={`w-4 h-4 ${isActive ? 'text-indigo-400' : inactiveIconClass}`} />
                <span>{item.name}</span>
              </button>
            );
          })}
        </nav>
      </div>

      <div className="mt-auto">
        {/* Testing Source Config Panel */}
        <div className="px-4 mb-4">
          <p className={`text-[10px] uppercase tracking-widest pl-2 mb-2 font-semibold ${sectionLabelClass}`}>Testing Source</p>
          <div className="space-y-1">
            {/* Public URL Button */}
            <div className="flex flex-col gap-1">
              <button 
                onClick={() => {
                  setTestingSource('Public URL');
                  setShowUrlEditor(true);
                }}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium border transition-all cursor-pointer ${
                  testingSource === 'Public URL'
                    ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/30'
                    : inactiveNavClass
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Globe className="w-4 h-4" />
                  <span>Public URL</span>
                </div>
                {testingSource === 'Public URL' && <Check className="w-3.5 h-3.5" />}
              </button>

              {/* URL Editor input below button when active/clicked */}
              {testingSource === 'Public URL' && (showUrlEditor || publicUrl) && (
                <form onSubmit={handleUrlSubmit} className="mt-1.5 px-1 relative flex items-center">
                  <input
                    type="url"
                    value={urlInput}
                    onChange={(e) => setUrlInput(e.target.value)}
                    placeholder="https://example.com"
                    className={`w-full border focus:border-indigo-500 rounded-md py-1 px-2.5 pr-8 text-[11px] outline-none transition-all font-mono ${inputClass}`}
                  />
                  <button type="submit" className="absolute right-2 text-indigo-400 hover:text-indigo-300 transition-colors">
                    <Check className="w-3.5 h-3.5" />
                  </button>
                </form>
              )}
            </div>

            {/* Localhost Button */}
            <button 
              onClick={() => {
                setTestingSource('Localhost');
                setShowUrlEditor(false);
              }}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium border transition-all cursor-pointer ${
                testingSource === 'Localhost'
                  ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/30'
                  : inactiveNavClass
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Database className="w-4 h-4" />
                <span>Localhost</span>
              </div>
              {testingSource === 'Localhost' && <Check className="w-3.5 h-3.5" />}
            </button>

            {/* GitHub Repo Button */}
            <button 
              onClick={() => {
                setTestingSource('GitHub Repo');
                setShowUrlEditor(false);
              }}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium border transition-all cursor-pointer ${
                testingSource === 'GitHub Repo'
                  ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/30'
                  : inactiveNavClass
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Github className="w-4 h-4" />
                <span>GitHub Repo</span>
              </div>
              {testingSource === 'GitHub Repo' && <Check className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>

        {/* Footer Actions */}
        <div className={`px-3 border-t pt-3 space-y-1 ${dividerClass}`}>
          <button
            type="button"
            onClick={() => {
              if (onHelpCenter) onHelpCenter();
              else setActiveTab('Help Center');
            }}
            className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg transition-all text-xs font-medium cursor-pointer ${
              activeTab === 'Help Center'
                ? 'bg-indigo-500/10 text-indigo-400'
                : inactiveNavClass
            }`}
          >
            <HelpCircle className={`w-4 h-4 ${activeTab === 'Help Center' ? 'text-indigo-400' : inactiveIconClass}`} />
            <span>Help Center</span>
          </button>
          <div className={`flex items-center gap-3 px-4 py-2.5 rounded-lg hover:text-rose-400 transition-all text-xs font-medium cursor-pointer ${inactiveNavClass}`}>
            <LogOut className={`w-4 h-4 ${inactiveIconClass}`} />
            <span>Sign Out</span>
          </div>
        </div>
      </div>
    </aside>
  );
}
