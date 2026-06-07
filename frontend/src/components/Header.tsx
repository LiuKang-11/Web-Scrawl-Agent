import React from 'react';
import { TabType } from '../types';
import { Search, Bell, HelpCircle, Check, Loader2 } from 'lucide-react';

interface HeaderProps {
  activeTab: TabType;
  onSearch: (query: string) => void;
  isAnalyzing?: boolean;
}

export default function Header({
  activeTab,
  onSearch,
  isAnalyzing = false
}: HeaderProps) {
  const [searchQuery, setSearchQuery] = React.useState('');
  const [showNotifications, setShowNotifications] = React.useState(false);
  const [notifications, setNotifications] = React.useState([
    { id: 1, text: "AI generated 12 new test cases for AuthService.js", read: false, time: "2m ago" },
    { id: 2, text: "Visual Regression check failed on /checkout path", read: false, time: "1 hour ago" },
    { id: 3, text: "Sprint 42 Release report generated", read: true, time: "Yesterday" }
  ]);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setSearchQuery(val);
    onSearch(val);
  };

  const markAllRead = () => {
    setNotifications(notifications.map(n => ({ ...n, read: true })));
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <header className="bg-zinc-950/80 border-b border-zinc-800 backdrop-blur-md flex justify-between items-center h-16 px-6 relative select-none">
      {/* Title / Tab Breadcrumb */}
      <div className="flex items-center gap-6">
        <span className="text-sm font-semibold text-zinc-400 font-mono tracking-tight uppercase">
          FlowGuard AI <span className="text-zinc-700 mx-1">/</span> <span className="text-indigo-400 capitalize font-display font-semibold tracking-normal">{activeTab}</span>
        </span>
        
        {isAnalyzing && (
          <span className="bg-indigo-500/10 text-indigo-400 border border-indigo-500/30 px-2 py-0.5 rounded text-[11px] font-medium flex items-center gap-1.5 animate-pulse">
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            Analyzing app topology...
          </span>
        )}
      </div>

      {/* Global Actions Bar */}
      <div className="flex items-center gap-4">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 w-4 h-4" />
          <input
            type="text"
            value={searchQuery}
            onChange={handleSearchChange}
            placeholder={`Search across ${activeTab.toLowerCase()}...`}
            className="bg-zinc-900 border border-zinc-800 rounded-full py-1.5 pl-9 pr-4 text-xs text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 w-64 transition-all"
          />
        </div>

        {/* Notifications Button */}
        <div className="relative">
          <button 
            onClick={() => setShowNotifications(!showNotifications)}
            className="text-zinc-400 hover:text-indigo-400 hover:bg-zinc-900 p-2 rounded-full cursor-pointer relative"
          >
            <Bell className="w-4 h-4" />
            {unreadCount > 0 && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-rose-500 rounded-full animate-ping" />
            )}
          </button>

          {/* Notifications Popover */}
          {showNotifications && (
            <div className="absolute right-0 top-11 w-80 bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl z-50 overflow-hidden text-zinc-100">
              <div className="p-3 border-b border-zinc-800 flex justify-between items-center bg-zinc-950">
                <span className="text-xs font-semibold text-zinc-200">System Notifications</span>
                {unreadCount > 0 && (
                  <button 
                    onClick={markAllRead} 
                    className="text-[10px] text-indigo-400 hover:text-indigo-300 font-semibold"
                  >
                    Mark all read
                  </button>
                )}
              </div>
              <div className="divide-y divide-zinc-800/60 max-h-64 overflow-y-auto">
                {notifications.map((n) => (
                  <div key={n.id} className={`p-3 text-xs flex gap-2.5 transition-colors hover:bg-zinc-850/50 ${n.read ? 'opacity-80' : 'border-l-2 border-emerald-400'}`}>
                    <div className="flex-1">
                      <p className="font-semibold text-zinc-200">{n.text}</p>
                      <span className="text-[10px] text-zinc-500 font-mono mt-1 block">{n.time}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Help Circle */}
        <button className="text-zinc-400 hover:text-indigo-400 hover:bg-zinc-900 p-2 rounded-full cursor-pointer">
          <HelpCircle className="w-4 h-4" />
        </button>

        {/* Custom profile picture */}
        <div className="w-8 h-8 rounded-full bg-[#1b253b] border border-neutral-700 flex items-center justify-center overflow-hidden cursor-pointer hover:border-indigo-400 transition-colors">
          <img 
            alt="User profile" 
            className="w-full h-full object-cover opacity-95"
            src="https://lh3.googleusercontent.com/aida-public/AB6AXuBlBY_skZdeWgBOqInEbZPHjANCa6w5hy1fcxAcje42czxvgsHGQ-QH8g9nvBzYuCi_EsAWaWmW3Ok6-_7_thmo7gDNJpNc8Aqh4W1qZiquzJTTkqT2HrnFMcuxi2qtwMHBSO57OlxOj4xcQR2xv-OokugOgKJjtK5msUsFqqdAEgbHC1rOIXjqf8LRoisiTedTBaFkIhe3QS3CK41yjO8QMPHh2J-sxppnGdb_0AueERBTIM4HgYBPfZimct2LPvSFsKrcIR-qhrQ"
            onError={(e) => {
              // Fallback if network blocks or fails
              (e.target as HTMLImageElement).src = "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=100";
            }}
          />
        </div>
      </div>
    </header>
  );
}
