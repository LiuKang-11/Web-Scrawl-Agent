import React from 'react';
import { 
  ClipboardList, 
  Search, 
  Plus, 
  CheckCircle, 
  Play, 
  Trash2, 
  AlertCircle, 
  CheckCircle2, 
  HelpCircle,
  Sparkles,
  ChevronDown,
  Info,
  X,
  Edit
} from 'lucide-react';
import { TestCase } from '../types';

interface TestCasesViewProps {
  searchText: string;
  onRunSelected: (selectedIds: string[]) => void;
  onSetStatusText?: (msg: string) => void;
}

export default function TestCasesView({
  searchText,
  onRunSelected,
  onSetStatusText
}: TestCasesViewProps) {
  
  // Base initial test cases state
  const [testCases, setTestCases] = React.useState<TestCase[]>([
    { id: 'TC-8492', name: 'Verify Stripe Webhook handles payload signatures securely', priority: 'Critical', category: 'API', status: 'Failed', generatedBy: 'Walkthrough Agent' },
    { id: 'TC-8411', name: 'Check cart total calculation matches checkout summary on decimal rounding', priority: 'High', category: 'UI', status: 'Failed', generatedBy: 'Walkthrough Agent' },
    { id: 'TC-8305', name: 'Validate promo code field triggers dynamic order price reduction update', priority: 'Medium', category: 'UI', status: 'Failed', generatedBy: 'Form Agent' },
    { id: 'TC-8134', name: 'Regress CSRF state parameters on multi-step forms submission', priority: 'Critical', category: 'Security', status: 'Approved', generatedBy: 'Walkthrough Agent' },
    { id: 'TC-8110', name: 'Test cookie session timeout regeneration and cross-tab storage synchrony', priority: 'High', category: 'Security', status: 'Approved', generatedBy: 'Scan Engine' },
    { id: 'TC-7890', name: 'Compare visual checkout layout consistency across microviewport bounds', priority: 'Medium', category: 'UI', status: 'Draft', generatedBy: 'Vision Agent' },
    { id: 'TC-7650', name: 'Verify rate limiter blocks burst login attempts over 10 reqs/sec threshold', priority: 'High', category: 'API', status: 'Draft', generatedBy: 'Walkthrough Agent' },
  ]);

  // Selected Checkboxes states
  const [selectedIds, setSelectedIds] = React.useState<string[]>([]);
  // Filtering state
  const [activeFilter, setActiveFilter] = React.useState<'All' | 'Approved' | 'Draft' | 'Failed'>('All');

  // Triggering the add test case dialog state
  const [showAddForm, setShowAddForm] = React.useState(false);
  const [newTestName, setNewTestName] = React.useState('');
  const [newPriority, setNewPriority] = React.useState<'Critical' | 'High' | 'Medium' | 'Low'>('High');
  const [newCategory, setNewCategory] = React.useState<'UI' | 'API' | 'Security'>('UI');

  // Master checkout toggler
  const toggleSelectAll = () => {
    if (selectedIds.length === filteredTestCases.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredTestCases.map(tc => tc.id));
    }
  };

  const toggleSelectOne = (id: string) => {
    setSelectedIds((prev) => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  // Status badges mapping
  const getStatusBadge = (status: TestCase['status']) => {
    switch (status) {
      case 'Approved':
        return <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase">Approved</span>;
      case 'Draft':
        return <span className="bg-neutral-800 text-neutral-400 border border-neutral-700 px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase">Draft</span>;
      case 'Failed':
        return <span className="bg-rose-500/10 text-rose-400 border border-rose-500/20 px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase">Failed</span>;
      case 'Generated':
        return <span className="bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase">AI Generated</span>;
    }
  };

  // Add a newly created test case
  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTestName.trim()) return;

    const nextId = `TC-${Math.floor(1000 + Math.random() * 8999)}`;
    const newCase: TestCase = {
      id: nextId,
      name: newTestName,
      priority: newPriority,
      category: newCategory,
      status: 'Draft',
      generatedBy: 'User Form'
    };

    setTestCases([newCase, ...testCases]);
    setNewTestName('');
    setShowAddForm(false);
    if (onSetStatusText) onSetStatusText(`Created custom test case ${nextId} successfully.`);
  };

  // Approve selected test cases
  const approveSelected = () => {
    if (selectedIds.length === 0) return;
    setTestCases(testCases.map(tc => 
      selectedIds.includes(tc.id) ? { ...tc, status: 'Approved' } : tc
    ));
    setSelectedIds([]);
    if (onSetStatusText) onSetStatusText(`Approved ${selectedIds.length} test cases.`);
  };

  // AI-powered test cases regeneration simulation
  const [isRegenerating, setIsRegenerating] = React.useState(false);
  const handleRegenerate = () => {
    setIsRegenerating(true);
    if (onSetStatusText) onSetStatusText(`Pinging Gemini to analyze Router mappings...`);
    
    setTimeout(() => {
      const gCases: TestCase[] = [
        { id: 'TC-9005', name: 'Verify checkout modal renders properly on high pixel density screens', priority: 'Medium', category: 'UI', status: 'Generated', generatedBy: 'Walkthrough Agent' },
        { id: 'TC-9102', name: 'Check OAuth connection callback retains state token parameter check', priority: 'Critical', category: 'Security', status: 'Generated', generatedBy: 'Form Agent' }
      ];
      setTestCases([...gCases, ...testCases]);
      setIsRegenerating(false);
      if (onSetStatusText) onSetStatusText(`AI generated and injected 2 new robust test cases.`);
    }, 2000);
  };

  // Delete an individual test case
  const deleteTestCase = (id: string) => {
    setTestCases(testCases.filter(tc => tc.id !== id));
    setSelectedIds(selectedIds.filter(item => item !== id));
  };

  // Filter & Search logic
  const filteredTestCases = testCases.filter((tc) => {
    const matchesSearch = searchText 
      ? (tc.name.toLowerCase().includes(searchText.toLowerCase()) || tc.id.toLowerCase().includes(searchText.toLowerCase())) 
      : true;
    
    if (activeFilter === 'All') return matchesSearch;
    return tc.status === activeFilter && matchesSearch;
  });

  return (
    <div className="flex-1 w-full p-6 overflow-y-auto max-w-[1600px] mx-auto space-y-6 select-none relative">
      
      {/* Test Cases actions header panel */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-neutral-900/40 p-5 rounded-2xl border border-neutral-800">
        <div>
          <h2 className="text-base font-bold text-neutral-100 flex items-center gap-2">
            <ClipboardList className="text-indigo-400 w-5 h-5" />
            Autonomous Test Suite Specs
          </h2>
          <p className="text-xs text-neutral-400 mt-1">
            Browse and regulate functional tests generated by agents. ({filteredTestCases.length} matching specs showing)
          </p>
        </div>

        {/* Master Actions Buttons */}
        <div className="flex items-center gap-2.5">
          <button 
            disabled={selectedIds.length === 0}
            onClick={() => onRunSelected(selectedIds)}
            className="bg-indigo-600 hover:bg-indigo-500 disabled:bg-neutral-800/80 disabled:text-neutral-500 disabled:shadow-none font-bold text-xs py-2 px-4 rounded-lg flex items-center gap-1.5 transition-all shadow-[0_0_15px_rgba(99,102,241,0.15)] cursor-pointer"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            Run Selected ({selectedIds.length})
          </button>
          
          <button 
            disabled={selectedIds.length === 0}
            onClick={approveSelected}
            className="bg-neutral-800 hover:bg-neutral-700 disabled:opacity-40 font-bold text-xs py-2 px-4 rounded-lg flex items-center gap-1.5 border border-neutral-700 transition-all text-neutral-200 cursor-pointer"
          >
            <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
            Approve Selected
          </button>

          <button 
            onClick={handleRegenerate}
            disabled={isRegenerating}
            className="bg-neutral-950 hover:bg-neutral-900 disabled:opacity-40 font-bold text-xs py-2 px-4 rounded-lg flex items-center gap-1.5 border border-neutral-850 transition-all text-indigo-400 cursor-pointer"
          >
            <Sparkles className={`w-3.5 h-3.5 text-indigo-400 ${isRegenerating ? 'animate-spin' : ''}`} />
            {isRegenerating ? 'Pinging Gemini...' : 'Regenerate API Tests'}
          </button>

          <button 
            onClick={() => setShowAddForm(true)}
            className="bg-indigo-650 hover:bg-indigo-600 text-indigo-100 font-bold text-xs py-2 px-3 rounded-lg flex items-center gap-1 border border-indigo-800 transition-all cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Spec
          </button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center justify-between">
        <div className="flex gap-1.5 bg-neutral-900/60 p-1 rounded-lg border border-neutral-805">
          {['All', 'Approved', 'Draft', 'Failed'].map((filterName) => (
            <button
              key={filterName}
              onClick={() => {
                setActiveFilter(filterName as any);
                setSelectedIds([]);
              }}
              className={`text-[11px] font-mono font-bold px-3 py-1.5 rounded-md transition-all cursor-pointer ${
                activeFilter === filterName
                  ? 'bg-neutral-800 text-white border border-neutral-700'
                  : 'text-neutral-400 hover:text-white hover:bg-neutral-900/40'
              }`}
            >
              {filterName}
            </button>
          ))}
        </div>
      </div>

      {/* Primary Table rendering with Custom Spacings */}
      <div className="glass-panel rounded-2xl overflow-hidden border border-neutral-800/80">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-neutral-950 p-4 border-b border-neutral-800 font-mono text-[10px] text-neutral-400 font-bold uppercase tracking-wider select-none">
              <th className="p-4 w-12 text-center">
                <input 
                  type="checkbox" 
                  checked={filteredTestCases.length > 0 && selectedIds.length === filteredTestCases.length}
                  onChange={toggleSelectAll}
                  className="rounded border-neutral-700 accent-indigo-600 w-3.5 h-3.5 cursor-pointer"
                />
              </th>
              <th className="p-4">Spec Specification / Name</th>
              <th className="p-4 w-32">Priority</th>
              <th className="p-4 w-32">Scope</th>
              <th className="p-4 w-32">Telemetry</th>
              <th className="p-4 w-32">Generator</th>
              <th className="p-4 w-20 text-center">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-850 bg-neutral-900/20">
            {filteredTestCases.length === 0 ? (
              <tr>
                <td colSpan={7} className="p-12 text-center text-xs text-neutral-500 font-mono">
                  No specs matched your filtering selections or tags.
                </td>
              </tr>
            ) : (
              filteredTestCases.map((tc) => {
                const isChecked = selectedIds.includes(tc.id);
                
                return (
                  <tr 
                    key={tc.id} 
                    className={`hover:bg-neutral-850/30 transition-colors ${
                      isChecked ? 'bg-indigo-500/[0.02]' : ''
                    }`}
                  >
                    {/* Item checkbox */}
                    <td className="p-4 text-center">
                      <input 
                        type="checkbox" 
                        checked={isChecked}
                        onChange={() => toggleSelectOne(tc.id)}
                        className="rounded border-neutral-700 accent-indigo-600 w-3.5 h-3.5 cursor-pointer"
                      />
                    </td>

                    {/* Spec details */}
                    <td className="p-4">
                      <div className="flex flex-col gap-1">
                        <span className="text-xs font-semibold text-neutral-200 leading-normal">
                          {tc.name}
                        </span>
                        <span className="text-[10px] font-mono text-neutral-500 uppercase font-semibold">{tc.id}</span>
                      </div>
                    </td>

                    {/* Priority badge */}
                    <td className="p-4">
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                        tc.priority === 'Critical' 
                          ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' 
                          : tc.priority === 'High' 
                            ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' 
                            : 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20'
                      }`}>
                        {tc.priority}
                      </span>
                    </td>

                    {/* Category Label */}
                    <td className="p-4">
                      <span className="text-[11px] text-neutral-400 font-mono font-bold">{tc.category}</span>
                    </td>

                    {/* Telemetry output status indicator */}
                    <td className="p-4">
                      {getStatusBadge(tc.status)}
                    </td>

                    {/* AI Generator identifier */}
                    <td className="p-4">
                      <span className="text-xs text-neutral-400 font-sans">{tc.generatedBy}</span>
                    </td>

                    {/* Delete individually */}
                    <td className="p-4 text-center">
                      <button 
                        onClick={() => deleteTestCase(tc.id)}
                        className="text-neutral-500 hover:text-rose-400 hover:bg-rose-500/10 p-1.5 rounded transition-all cursor-pointer"
                        title="Delete Spec"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>

                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Slide-out or Dialog Custom Spec Creator */}
      {showAddForm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <form 
            onSubmit={handleAddSubmit}
            className="bg-neutral-900 border border-neutral-805 w-full max-w-lg rounded-2xl overflow-hidden p-6 space-y-4 shadow-2xl text-white"
          >
            <div className="flex justify-between items-center pb-2 border-b border-neutral-800">
              <span className="text-sm font-bold text-neutral-200 font-sans flex items-center gap-2">
                <Plus className="w-5 h-5 text-indigo-400" />
                Add Custom Spec Specification
              </span>
              <button 
                type="button" 
                onClick={() => setShowAddForm(false)} 
                className="text-neutral-500 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3.5">
              <div className="space-y-1.5">
                <label className="text-[11px] text-neutral-400 font-mono uppercase font-semibold">Spec Action Statement</label>
                <textarea
                  required
                  rows={2}
                  value={newTestName}
                  onChange={(e) => setNewTestName(e.target.value)}
                  placeholder="e.g. Ensure session cookie regenerate token successfully matches profile parameters on redirect"
                  className="w-full bg-neutral-950 border border-neutral-700 focus:border-indigo-500 rounded-lg p-2.5 text-xs text-white placeholder:text-neutral-600 outline-none transition-all font-sans"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[11px] text-neutral-400 font-mono uppercase font-semibold">Priority Rating</label>
                  <select
                    value={newPriority}
                    onChange={(e: any) => setNewPriority(e.target.value)}
                    className="w-full bg-neutral-950 border border-neutral-700 rounded-lg p-2 text-xs font-semibold select-none text-neutral-300"
                  >
                    <option value="Critical">Critical</option>
                    <option value="High">High</option>
                    <option value="Medium">Medium</option>
                    <option value="Low">Low</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] text-neutral-400 font-mono uppercase font-semibold">Category Boundary</label>
                  <select
                    value={newCategory}
                    onChange={(e: any) => setNewCategory(e.target.value)}
                    className="w-full bg-neutral-950 border border-neutral-700 rounded-lg p-2 text-xs font-semibold select-none text-neutral-300"
                  >
                    <option value="UI">UI</option>
                    <option value="API">API</option>
                    <option value="Security">Security</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2.5 pt-2">
              <button 
                type="button" 
                onClick={() => setShowAddForm(false)}
                className="bg-neutral-800 hover:bg-neutral-700 px-4 py-2 rounded-lg text-xs font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button 
                type="submit"
                className="bg-indigo-600 hover:bg-indigo-500 px-4 py-2 rounded-lg text-xs font-bold cursor-pointer"
              >
                Save Specification
              </button>
            </div>
          </form>
        </div>
      )}

    </div>
  );
}
