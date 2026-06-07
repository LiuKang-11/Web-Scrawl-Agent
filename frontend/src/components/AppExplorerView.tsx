import React from 'react';
import { 
  Compass, 
  Info, 
  CheckCircle2, 
  ChevronRight, 
  HelpCircle, 
  Activity, 
  Server, 
  Database, 
  AlertTriangle, 
  Layers, 
  ArrowRight, 
  Eye, 
  ShieldAlert, 
  MousePointerClick, 
  Cpu, 
  Network,
  Clock,
  ExternalLink,
  Search,
  FileCode,
  Lock,
  Workflow
} from 'lucide-react';
import { DiscoveredNode, UserFlowPath } from '../types';

interface AppExplorerViewProps {
  searchText: string;
}

export default function AppExplorerView({ searchText }: AppExplorerViewProps) {
  // Interactive selected node state
  const [selectedNodeId, setSelectedNodeId] = React.useState<string>('home');
  const [activeTabSub, setActiveTabSub] = React.useState<'pages' | 'forms' | 'apis'>('pages');

  // Interactive nodes representing graph with enriched telemetry metrics
  const nodes = [
    { 
      id: 'home', 
      label: 'Home Feed', 
      type: 'Page', 
      x: 100, 
      y: 180, 
      status: 'Passed', 
      traffic: '92 RPM',
      latency: '124ms',
      tech: 'Next.js Frontend',
      activeApis: ['/api/products/featured', '/api/banners'],
      cookies: ['session_token', 'visitor_id'],
      formsCount: 0
    },
    { 
      id: 'login', 
      label: '/login', 
      type: 'Page', 
      x: 250, 
      y: 80, 
      status: 'Passed', 
      traffic: '45 RPM',
      latency: '186ms',
      tech: 'Bcrypt Encryption',
      activeApis: ['/api/auth/login-intent', '/api/auth/mfa'],
      cookies: ['xsrf_token', 'mfa_required'],
      formsCount: 1
    },
    { 
      id: 'products', 
      label: '/products', 
      type: 'Page', 
      x: 250, 
      y: 280, 
      status: 'Passed', 
      traffic: '120 RPM',
      latency: '215ms',
      tech: 'Redis Caching tier',
      activeApis: ['/api/products/list', '/api/products/inventory'],
      cookies: ['preferred_currency', 'user_geo'],
      formsCount: 1
    },
    { 
      id: 'cart', 
      label: '/cart', 
      type: 'Page', 
      x: 400, 
      y: 280, 
      status: 'Passed', 
      traffic: '32 RPM',
      latency: '164ms',
      tech: 'LocalStore Synchronization',
      activeApis: ['/api/cart/items', '/api/cart/pricing'],
      cookies: ['cart_session_id'],
      formsCount: 1
    },
    { 
      id: 'checkout', 
      label: '/checkout', 
      type: 'Page', 
      x: 550, 
      y: 180, 
      status: 'Failed', 
      traffic: '18 RPM',
      latency: '420ms (Critical Warning)',
      tech: 'Stripe API proxy',
      activeApis: ['/api/checkout/stripe-intent', '/api/checkout/verify'],
      cookies: ['secure_checkout_token'],
      formsCount: 2
    },
  ];

  // Discovered list details
  const discoveredPages: DiscoveredNode[] = [
    { id: 'home', label: '/', type: 'Page', status: 'Passed' },
    { id: 'login', label: '/login', type: 'Page', status: 'Passed' },
    { id: 'products', label: '/products', type: 'Page', status: 'Passed' },
    { id: 'cart', label: '/cart', type: 'Page', status: 'Passed' },
    { id: 'checkout', label: '/checkout', type: 'Page', status: 'Failed' },
    { id: 'profile', label: '/profile', type: 'Page', status: 'Draft' },
  ];

  const detectedForms: DiscoveredNode[] = [
    { id: 'login_form', label: 'LoginForm', type: 'Form', endpoint: 'POST /api/auth' },
    { id: 'payment_form', label: 'CheckoutPaymentForm', type: 'Form', endpoint: 'POST /api/checkout/pay' },
    { id: 'search_form', label: 'ProductSearchQuery', type: 'Form', endpoint: 'GET /api/search' }
  ];

  const apiEndpoints: DiscoveredNode[] = [
    { id: 'api_auth', label: '/api/auth/username', type: 'API', endpoint: 'GET verify' },
    { id: 'api_inv', label: '/api/products/inventory', type: 'API', endpoint: 'GET count' },
    { id: 'api_stripe', label: '/api/checkout/stripe-intent', type: 'API', endpoint: 'POST create' },
    { id: 'api_logs', label: '/api/telemetry/errors', type: 'API', endpoint: 'POST log' }
  ];

  const userPaths: UserFlowPath[] = [
    { id: 'p1', name: 'Standard Auth Funnel', risk: 'High Risk', steps: 'home → login → products → checkout' },
    { id: 'p2', name: 'Direct Guest Checkout', risk: 'Low Risk', steps: 'home → products → cart → checkout' },
    { id: 'p3', name: 'Quick Subscription Path', risk: 'Medium Risk', steps: 'login → checkout' }
  ];

  // Node relationships for drawing lines
  const links = [
    { sourceId: 'home', targetId: 'login' },
    { sourceId: 'home', targetId: 'products' },
    { sourceId: 'login', targetId: 'checkout' },
    { sourceId: 'products', targetId: 'cart' },
    { sourceId: 'cart', targetId: 'checkout' }
  ];

  const selectedNode = nodes.find(n => n.id === selectedNodeId) || nodes[0];

  // Filtering lists based on search query
  const query = searchText.toLowerCase();
  
  const filteredPages = discoveredPages.filter(p => p.label.toLowerCase().includes(query));
  const filteredForms = detectedForms.filter(f => f.label.toLowerCase().includes(query) || f.endpoint?.toLowerCase().includes(query));
  const filteredApis = apiEndpoints.filter(a => a.label.toLowerCase().includes(query) || a.endpoint?.toLowerCase().includes(query));

  // Determine current active display list
  const activeList = activeTabSub === 'pages' 
    ? filteredPages 
    : activeTabSub === 'forms' 
      ? filteredForms 
      : filteredApis;

  return (
    <div className="flex-1 overflow-y-auto p-6 max-w-[1600px] mx-auto w-full space-y-6 select-none leading-relaxed">
      
      {/* Inline styles for custom premium animations inside SVG Topology */}
      <style>{`
        @keyframes dash {
          to {
            stroke-dashoffset: -40;
          }
        }
        .animate-flow-trace {
          stroke-dasharray: 6, 12;
          animation: dash 1.8s linear infinite;
        }
        .gridbg-lens {
          mask-image: radial-gradient(circle at 50% 50%, rgba(0,0,0,1) 50%, rgba(0,0,0,0.15) 100%);
        }
      `}</style>

      {/* Row 1: Header / Explanatory Board Bento Box */}
      <section className="glass-panel rounded-2xl p-6 relative overflow-hidden flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="absolute top-0 right-0 w-80 h-80 bg-indigo-500/5 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none" />
        
        <div className="space-y-1.5 z-10 max-w-2xl">
          <div className="flex items-center gap-2">
            <span className="bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-widest flex items-center gap-1">
              <Cpu className="w-3 h-3 text-indigo-400" />
              Live Discovery State Space
            </span>
            <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-widest flex items-center gap-1">
              ● Crawl Active
            </span>
          </div>
          <h1 className="text-xl font-bold text-zinc-100 tracking-tight font-display">
            Autonomous State Space &amp; Site Topology
          </h1>
          <p className="text-xs text-zinc-400">
            Interactive crawler map tracing path transitions, endpoints, and input form boundaries mapped automatically by agent scripts during the walkthroughs.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-right hidden sm:block">
            <p className="text-[10px] text-zinc-500 font-bold uppercase font-mono tracking-widest">Discovered Nodes</p>
            <p className="text-lg font-bold text-zinc-200 font-display">13 Endpoints</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-400 shadow-md">
            <Network className="w-5 h-5 text-indigo-400" />
          </div>
        </div>
      </section>

      {/* Main Bento Grid layout mapping */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-5">
        
        {/* Bento Cell 1: Interactive State Machine Graph Map (span 8) */}
        <div className="xl:col-span-8 glass-panel rounded-2xl p-6 flex flex-col justify-between overflow-hidden relative min-h-[460px]">
          <div className="absolute top-4 right-4 z-10 bg-zinc-950/80 border border-zinc-800/80 backdrop-blur rounded-lg px-2.5 py-1.5 text-[10px] font-mono text-zinc-400 flex items-center gap-3">
            <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-emerald-500 inline-block"></span>Passed</span>
            <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-red-500 inline-block"></span>Failed</span>
            <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-indigo-400 inline-block"></span>Selected</span>
          </div>

          <div className="flex justify-between items-start mb-4">
            <div>
              <h2 className="text-sm font-bold text-zinc-100 font-display flex items-center gap-1.5">
                <Compass className="w-4 h-4 text-indigo-400" />
                Inter-page Topology Scanner
              </h2>
              <p className="text-[11px] text-zinc-400">
                Click on the circular nodes to inspect dynamic routes, database hooks, and latency levels.
              </p>
            </div>
            {searchText && (
              <span className="text-[10px] bg-zinc-800 py-0.5 px-2.5 rounded font-mono text-zinc-300">
                Found {filteredPages.length + filteredForms.length + filteredApis.length} related nodes
              </span>
            )}
          </div>

          {/* SVG Canvas Container */}
          <div className="flex-1 bg-zinc-950/90 border border-zinc-900 rounded-xl relative flex items-center justify-center overflow-hidden h-[300px] select-none">
            {/* Ambient graph coordinates background */}
            <div className="absolute inset-0 opacity-[0.03] gridbg-lens pointer-events-none" style={{ 
              backgroundImage: 'radial-gradient(ellipse 2px 2px at 50% 50%, #818cf8 100%, transparent)',
              backgroundSize: '24px 24px' 
            }} />

            {/* Helper label */}
            <div className="absolute bottom-3 left-4 text-[9px] font-mono text-zinc-500 flex items-center gap-1.5 pointer-events-none">
              <MousePointerClick className="w-3.5 h-3.5 animate-bounce text-indigo-400" />
              <span>Interactive View: Click any node above to focus metrics</span>
            </div>

            <svg className="absolute inset-0 w-full h-full pointer-events-auto" viewBox="0 0 650 360">
              <defs>
                <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                  <feGaussianBlur stdDeviation="4" result="blur" />
                  <feComposite in="SourceGraphic" in2="blur" operator="over" />
                </filter>
              </defs>

              {/* Draw animated flow patterns over links */}
              {links.map((link, idx) => {
                const src = nodes.find(n => n.id === link.sourceId);
                const dest = nodes.find(n => n.id === link.targetId);
                if (!src || !dest) return null;
                
                // Highlight link dynamic status if any endpoint fails
                const isFailedLink = src.id === 'checkout' || dest.id === 'checkout';
                const isActiveUserFlow = selectedNodeId === src.id || selectedNodeId === dest.id;

                return (
                  <g key={idx}>
                    {/* Background Connection line */}
                    <line
                      x1={src.x}
                      y1={src.y}
                      x2={dest.x}
                      y2={dest.y}
                      stroke={isActiveUserFlow ? '#818cf8' : isFailedLink ? '#f43f5e' : '#27272a'}
                      strokeWidth={isActiveUserFlow ? '2.5' : '1.5'}
                      strokeOpacity={isActiveUserFlow ? '0.9' : '0.55'}
                      className="transition-all duration-300"
                    />
                    
                    {/* Dynamic flowing flow lines */}
                    <line
                      x1={src.x}
                      y1={src.y}
                      x2={dest.x}
                      y2={dest.y}
                      stroke={isFailedLink ? '#f43f5e' : '#10b981'}
                      strokeWidth="2.2"
                      strokeOpacity="0.75"
                      className="animate-flow-trace"
                    />
                  </g>
                );
              })}

              {/* Draw interactive Nodes on top */}
              {nodes.map((node) => {
                const isSelected = node.id === selectedNodeId;
                const isFailed = node.status === 'Failed';
                
                return (
                  <g 
                    key={node.id} 
                    className="cursor-pointer group"
                    onClick={() => setSelectedNodeId(node.id)}
                    transform={`translate(${node.x}, ${node.y})`}
                  >
                    {/* Glowing status pulse backing */}
                    {(isSelected || isFailed) && (
                      <circle
                        r="25"
                        className="animate-ping opacity-20"
                        fill={isFailed ? '#f43f5e' : '#4f46e5'}
                        style={{ animationDuration: isFailed ? '2.2s' : '4.5s' }}
                      />
                    )}

                    {/* Node base body circle */}
                    <circle
                      r="16.5"
                      className="transition-all duration-300"
                      fill={isSelected ? '#1e1b4b' : isFailed ? '#450a0a' : '#18181b'}
                      stroke={isSelected ? '#818cf8' : isFailed ? '#ef4444' : '#3f3f46'}
                      strokeWidth={isSelected ? '3.5' : '2'}
                      filter={isSelected ? 'url(#glow)' : undefined}
                    />

                    {/* Concentric node state indicator */}
                    <circle
                      r="6.5"
                      fill={isFailed ? '#f43f5e' : isSelected ? '#818cf8' : '#10b981'}
                      className="transition-all"
                    />

                    {/* Node text tags on background shield to guarantee high-fidelity legibility */}
                    <g transform="translate(0, 32)">
                      <rect 
                        x={-(node.label.length * 3.5) - 6} 
                        y="-10" 
                        width={(node.label.length * 7) + 12} 
                        height="16" 
                        rx="4" 
                        className="fill-zinc-950/90 stroke stroke-zinc-800/60"
                        strokeWidth="1"
                      />
                      <text
                        textAnchor="middle"
                        y="2"
                        className="font-mono text-[10px] font-bold fill-zinc-200 group-hover:fill-indigo-300 transition-colors pointer-events-none"
                      >
                        {node.label}
                      </text>
                    </g>
                  </g>
                );
              })}
            </svg>
          </div>
        </div>

        {/* Bento Cell 2: Node Detail Telemetry Board Inspector (span 4) */}
        <div className="xl:col-span-4 glass-panel rounded-2xl p-6 flex flex-col justify-between overflow-hidden relative">
          <div className="absolute top-0 right-0 w-44 h-44 bg-indigo-500/5 rounded-full blur-xl pointer-events-none" />
          
          <div className="space-y-4">
            <div className="flex justify-between items-center pb-2.5 border-b border-zinc-800">
              <div>
                <span className="text-[9px] text-zinc-500 font-mono font-extrabold uppercase tracking-widest block">TELEMETRY DETECTOR</span>
                <span className="text-sm font-bold text-zinc-100 font-display flex items-baseline gap-1.5 mt-0.5">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75" style={{ backgroundColor: selectedNode.status === 'Failed' ? '#ef4444' : '#10b981' }}></span>
                    <span className="relative inline-flex rounded-full h-2 w-2" style={{ backgroundColor: selectedNode.status === 'Failed' ? '#ef4444' : '#10b981' }}></span>
                  </span>
                  {selectedNode.label}
                </span>
              </div>
              <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-lg border uppercase ${
                selectedNode.status === 'Failed' 
                  ? 'bg-red-500/10 text-red-400 border-red-500/20' 
                  : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
              }`}>
                {selectedNode.status}
              </span>
            </div>

            {/* Performance KPIs */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-zinc-950/60 p-3 rounded-xl border border-zinc-800 flex flex-col gap-1">
                <span className="text-[9px] text-zinc-500 font-mono uppercase font-bold flex items-center gap-1">
                  <Activity className="w-3 h-3 text-indigo-400" />
                  Traffic Rate
                </span>
                <span className="text-xs font-semibold text-zinc-200 font-mono">{selectedNode.traffic}</span>
              </div>
              
              <div className="bg-zinc-950/60 p-3 rounded-xl border border-zinc-800 flex flex-col gap-1">
                <span className="text-[9px] text-zinc-500 font-mono uppercase font-bold flex items-center gap-1">
                  <Clock className="w-3 h-3 text-indigo-400" />
                  Avg Latency
                </span>
                <span className={`text-xs font-semibold font-mono ${selectedNode.status === 'Failed' ? 'text-rose-400' : 'text-zinc-200'}`}>
                  {selectedNode.latency}
                </span>
              </div>
            </div>

            {/* Framework Signal metadata */}
            <div className="bg-zinc-950/40 p-3 rounded-xl border border-zinc-800 space-y-1 text-xs">
              <div className="flex justify-between text-[11px] text-zinc-400">
                <span className="flex items-center gap-1"><Cpu className="w-3.5 h-3.5 text-zinc-500" /> Technology:</span>
                <span className="font-mono text-indigo-300 font-bold">{selectedNode.tech}</span>
              </div>
            </div>

            {/* Discovered Form inputs in this node */}
            <div className="bg-zinc-950/80 p-3.5 rounded-xl border border-zinc-800/80 space-y-2">
              <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5 font-mono">
                <FileCode className="w-3.5 h-3.5 text-indigo-400" />
                Parsed Form Hooks
              </p>
              
              <ul className="text-xs space-y-2 font-mono">
                {selectedNode.id === 'checkout' ? (
                  <>
                    <li className="p-1 px-2.5 rounded bg-zinc-900 border border-zinc-800 flex flex-col gap-0.5">
                      <span className="text-[10.5px] text-rose-400 font-bold">CheckoutPaymentForm</span>
                      <span className="text-[9px] text-zinc-500">Inputs: cardholder, credit_no, cvv</span>
                      <span className="text-[9px] text-zinc-400">Target action: POST /checkout/pay</span>
                    </li>
                    <li className="p-1 px-2.5 rounded bg-zinc-900 border border-zinc-800 flex flex-col gap-0.5">
                      <span className="text-[10.5px] text-zinc-300 font-bold">PromoVoucherForm</span>
                      <span className="text-[9px] text-zinc-500">Inputs: voucher_code</span>
                      <span className="text-[9px] text-zinc-400">Target action: GET /cart/promo</span>
                    </li>
                  </>
                ) : selectedNode.id === 'login' ? (
                  <li className="p-1 px-2.5 rounded bg-zinc-900 border border-zinc-800 flex flex-col gap-0.5">
                    <span className="text-[10.5px] text-emerald-400 font-bold">LoginForm</span>
                    <span className="text-[9px] text-zinc-500">Inputs: user_email, security_pass</span>
                    <span className="text-[9px] text-zinc-400">Target action: POST /api/auth</span>
                  </li>
                ) : selectedNode.id === 'products' ? (
                  <li className="p-1 px-2.5 rounded bg-zinc-900 border border-zinc-800 flex flex-col gap-0.5">
                    <span className="text-[10.5px] text-indigo-300 font-bold">ProductSearchQuery</span>
                    <span className="text-[9px] text-zinc-500">Inputs: search_text, price_range</span>
                    <span className="text-[9px] text-zinc-400">Target action: GET /api/search</span>
                  </li>
                ) : (
                  <li className="text-[10px] text-zinc-500 italic py-1 font-sans pl-2">
                    No active input fields detected during robot crawl walkthrough of this view.
                  </li>
                )}
              </ul>
            </div>

            {/* API Router Links attached */}
            <div className="space-y-1.5">
              <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5 font-mono">
                <Server className="w-3.5 h-3.5 text-indigo-400" />
                Linked API Integrations
              </p>
              <div className="flex flex-wrap gap-1 md:gap-1.5">
                {selectedNode.activeApis.map((api, idx) => (
                  <span key={idx} className="bg-zinc-900/90 border border-zinc-800 text-[9.5px] font-mono text-zinc-300 px-2.5 py-1 rounded-md flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-500"></span>
                    {api}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Cookie tracking payload footer */}
          <div className="mt-4 pt-3.5 border-t border-zinc-800 text-[10px] text-zinc-500 font-mono space-y-1">
            <span className="text-[9px] uppercase tracking-wider block">Discovered Cookie Payload:</span>
            <div className="flex flex-wrap gap-1">
              {selectedNode.cookies.map((cookie, idx) => (
                <span key={idx} className="bg-zinc-900/50 px-1.5 py-0.5 rounded text-zinc-400 border border-zinc-800/50">
                  {cookie}
                </span>
              ))}
            </div>
          </div>
        </div>

      </div>

      {/* Row 3: Split columns: Tabbed Discovery List + User Walkthrough Simulation */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-5">
        
        {/* Bento Cell 3: Discovery Tabbed List Dashboard (span 6) */}
        <div className="xl:col-span-6 glass-panel rounded-2xl p-6 flex flex-col justify-between">
          <div className="space-y-4">
            
            {/* Headers selectors with interactive Bento configuration */}
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3">
              <div>
                <h2 className="text-sm font-bold text-zinc-100 font-display flex items-center gap-1.5">
                  <Layers className="text-indigo-400 w-4 h-4" />
                  Discovery Catalog Explorer
                </h2>
                <p className="text-[11px] text-zinc-400">
                  Tabbed inventory of elements extracted recursively by the robot crawler.
                </p>
              </div>

              {/* Bento Switch Navigation buttons */}
              <div className="grid grid-cols-3 gap-1 bg-zinc-950 p-1 rounded-xl border border-zinc-850/80 shadow-inner">
                <button 
                  onClick={() => setActiveTabSub('pages')}
                  className={`text-[10px] font-mono font-extrabold py-1.5 px-3 rounded-lg transition-all cursor-pointer ${
                    activeTabSub === 'pages' 
                      ? 'bg-indigo-600 text-white shadow-md' 
                      : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900'
                  }`}
                >
                  Pages
                </button>
                <button 
                  onClick={() => setActiveTabSub('forms')}
                  className={`text-[10px] font-mono font-extrabold py-1.5 px-3 rounded-lg transition-all cursor-pointer ${
                    activeTabSub === 'forms' 
                      ? 'bg-indigo-600 text-white shadow-md' 
                      : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900'
                  }`}
                >
                  Forms
                </button>
                <button 
                  onClick={() => setActiveTabSub('apis')}
                  className={`text-[10px] font-mono font-extrabold py-1.5 px-3 rounded-lg transition-all cursor-pointer ${
                    activeTabSub === 'apis' 
                      ? 'bg-indigo-600 text-white shadow-md' 
                      : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900'
                  }`}
                >
                  APIs
                </button>
              </div>
            </div>

            {/* List with styled detail lines */}
            <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1 hide-scrollbar">
              {activeList.length === 0 ? (
                <div className="p-8 text-center text-xs text-zinc-500 font-mono bg-zinc-950/40 rounded-xl border border-dashed border-zinc-800">
                  <Search className="w-5 h-5 text-zinc-600 mx-auto mb-1.5" />
                  No matching nodes found for &ldquo;{searchText}&rdquo; template.
                </div>
              ) : (
                activeList.map((item) => {
                  const nodeExists = nodes.some(n => n.id === item.id);
                  const isSelected = item.id === selectedNodeId;
                  
                  return (
                    <div 
                      key={item.id}
                      onClick={() => {
                        if (nodeExists) {
                          setSelectedNodeId(item.id);
                        }
                      }}
                      className={`p-3 rounded-xl border transition-all flex justify-between items-center group relative cursor-pointer ${
                        isSelected 
                          ? 'bg-indigo-500/10 border-indigo-500/40 shadow-sm' 
                          : 'bg-zinc-950/40 border-zinc-850/60 hover:bg-zinc-900/60 hover:border-zinc-800'
                      }`}
                    >
                      <div className="flex gap-3 items-center">
                        <span className={`w-2 h-2 rounded-full ${
                          item.status === 'Failed' 
                            ? 'bg-rose-500' 
                            : item.status === 'Draft' 
                              ? 'bg-zinc-600' 
                              : 'bg-emerald-500'
                        }`} />
                        <div>
                          <p className={`text-xs font-mono font-bold transition-all ${
                            isSelected ? 'text-indigo-300' : 'text-zinc-200 group-hover:text-indigo-400'
                          }`}>
                            {item.label}
                          </p>
                          {item.endpoint ? (
                            <span className="text-[10px] text-zinc-500 font-mono font-semibold uppercase">{item.endpoint}</span>
                          ) : (
                            <span className="text-[9px] text-zinc-400 uppercase tracking-wider font-semibold font-mono">Walkthrough trace ready</span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {item.endpoint ? (
                          <span className="bg-zinc-950 border border-zinc-800 font-bold text-zinc-400 text-[9px] px-2 py-0.5 rounded font-mono">
                            {item.endpoint.split(' ')[0] || 'REST'}
                          </span>
                        ) : (
                          <span className="bg-zinc-950 border border-zinc-800 font-bold text-zinc-400 text-[9px] px-2 py-0.5 rounded font-mono">
                            PAGE
                          </span>
                        )}
                        {nodeExists && (
                          <Eye className={`w-3.5 h-3.5 transition-colors ${isSelected ? 'text-indigo-400' : 'text-zinc-600 group-hover:text-zinc-400'}`} />
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-zinc-850/60 text-[10px] text-zinc-500 flex justify-between items-center bg-zinc-950/20 px-2 rounded-lg py-1.5">
            <span>Scan updated {new Date().toLocaleDateString()}</span>
            <span className="text-zinc-400 font-bold font-mono">Total Found: {activeList.length} Items</span>
          </div>
        </div>

        {/* Bento Cell 4: Discovered Walkthrough simulated paths & risk indexes (span 6) */}
        <div className="xl:col-span-6 glass-panel rounded-2xl p-6 flex flex-col justify-between">
          <div className="space-y-4">
            <div>
              <h2 className="text-sm font-bold text-zinc-100 font-display flex items-center gap-1.5">
                <Workflow className="text-indigo-400 w-4.5 h-4.5" />
                Exploratory Walkthrough Funnels
              </h2>
              <p className="text-[11px] text-zinc-400">
                AI agents test complex route sequences continuous integrations to find logic leaks.
              </p>
            </div>

            <div className="space-y-3">
              {userPaths.map((path) => {
                const isHigh = path.risk === 'High Risk';
                const isMed = path.risk === 'Medium Risk';
                return (
                  <div 
                    key={path.id} 
                    className={`p-4 rounded-xl border transition-all relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                      isHigh
                        ? 'bg-red-500/5 border-red-500/20 hover:border-red-500/40'
                        : isMed
                          ? 'bg-amber-500/5 border-amber-500/20 hover:border-amber-500/40'
                          : 'bg-emerald-500/5 border-emerald-500/20 hover:border-emerald-500/40'
                    }`}
                  >
                    <div className="space-y-1 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-zinc-200">{path.name}</span>
                        <span className={`text-[9px] font-mono font-extrabold px-1.5 py-0.5 rounded border uppercase ${
                          isHigh
                            ? 'bg-red-500/10 text-red-400 border-red-500/20'
                            : isMed
                              ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                              : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                        }`}>
                          {path.risk}
                        </span>
                      </div>

                      {/* Decoded steps */}
                      <div className="flex flex-wrap items-center gap-1.5 pt-1.5">
                        {path.steps.split(' → ').map((step, sIdx, sArr) => (
                          <React.Fragment key={sIdx}>
                            <span 
                              onClick={() => {
                                const matchedNode = nodes.find(n => n.label.toLowerCase() === step.toLowerCase() || n.id === step.toLowerCase());
                                if (matchedNode) {
                                  setSelectedNodeId(matchedNode.id);
                                }
                              }}
                              className="font-mono text-[10px] bg-zinc-900 border border-zinc-800 text-zinc-300 px-1.5 py-0.5 rounded-md hover:text-indigo-400 transition-colors cursor-pointer block"
                            >
                              {step}
                            </span>
                            {sIdx < sArr.length - 1 && (
                              <ChevronRight className="w-3 h-3 text-zinc-600" />
                            )}
                          </React.Fragment>
                        ))}
                      </div>
                    </div>

                    <div className="text-left md:text-right shrink-0">
                      <p className="text-[9px] text-zinc-500 font-mono block">TEST RELIABILITY</p>
                      <p className={`text-sm font-bold font-display ${isHigh ? 'text-rose-400' : 'text-emerald-400'}`}>
                        {isHigh ? '66% Integrity' : isMed ? '85% Integrity' : '100% Core Pass'}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-zinc-850/60 bg-zinc-950/40 p-3 rounded-xl border border-zinc-900">
            <h4 className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1 flex items-center gap-1 font-mono">
              <ShieldAlert className="w-3.5 h-3.5 text-rose-400" /> Security Signal crawler report:
            </h4>
            <p className="text-[10.5px] text-zinc-500">
              Flow paths are verified hourly against CSRF parameter tampering, click-jacking headers, and state space leakage risks.
            </p>
          </div>
        </div>

      </div>

    </div>
  );
}
