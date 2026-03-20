import React, { useState, useEffect, createContext, useContext, useRef } from 'react';
import { 
  LayoutDashboard, 
  TrendingUp, 
  Briefcase, 
  MessageSquare, 
  Mic, 
  Settings, 
  LogOut,
  ChevronRight,
  Shield,
  Fingerprint,
  Lock,
  Globe,
  Moon,
  Sun,
  Plus,
  ArrowUpRight,
  ArrowDownRight,
  Search,
  Bell,
  Star,
  CheckCircle,
  Eye,
  EyeOff,
  X,
  Video,
  Download,
  ExternalLink,
  Database,
  Cpu,
  RefreshCcw,
  Newspaper,
  Trash2,
  Sparkles,
  Bot,
  AlertCircle,
  BarChart3
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { io, Socket } from 'socket.io-client';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  AreaChart,
  Area
} from 'recharts';
import { useTranslation } from 'react-i18next';
import './i18n';
import { analyzeStock, generateLiveNews, chatWithAI } from './services/geminiService';
import { cn } from './utils/cn';
import { GoogleGenAI } from "@google/genai";

// --- Constants & Helpers ---
const getApiBase = () => {
  if (typeof window !== 'undefined') {
    const storedBase = localStorage.getItem('VITE_API_URL');
    if (storedBase) return storedBase.replace(/\/$/, '');
  }
  
  const envBase = (
    typeof 'https://stockai-ultra-v2.onrender.com' === 'string' && 
    'https://stockai-ultra-v2.onrender.com' !== 'undefined' && 
    'https://stockai-ultra-v2.onrender.com'.startsWith('http') 
      ? 'https://stockai-ultra-v2.onrender.com' 
      : ''
  ).replace(/\/$/, '');
  
  return envBase;
};

const API_BASE = getApiBase();

// Helper to check if we are likely in a mobile/packaged environment
const isMobileEnvironment = typeof window !== 'undefined' && (
  window.location.protocol === 'file:' || 
  window.location.hostname === 'localhost' || 
  window.location.hostname === '127.0.0.1' ||
  /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
);

console.log("StockAI API_BASE:", API_BASE || "(relative)");
if (isMobileEnvironment && !API_BASE) {
  console.warn("StockAI: Running in mobile-like environment without VITE_API_URL. Backend calls will likely fail.");
}

const ALL_STOCKS_DATA = [
  { symbol: "AAPL", name: "Apple Inc.", sector: "Technology" },
  { symbol: "TSLA", name: "Tesla Inc.", sector: "Consumer Cyclical" },
  { symbol: "GOOGL", name: "Alphabet Inc.", sector: "Technology" },
  { symbol: "AMZN", name: "Amazon.com Inc.", sector: "Consumer Cyclical" },
  { symbol: "MSFT", name: "Microsoft Corp.", sector: "Technology" },
  { symbol: "NVDA", name: "NVIDIA Corp.", sector: "Technology" },
  { symbol: "META", name: "Meta Platforms Inc.", sector: "Technology" },
  { symbol: "BTC", name: "Bitcoin", sector: "Crypto" },
  { symbol: "ETH", name: "Ethereum", sector: "Crypto" },
  { symbol: "NFLX", name: "Netflix Inc.", sector: "Communication Services" },
  { symbol: "DIS", name: "Walt Disney Co.", sector: "Communication Services" },
  { symbol: "PYPL", name: "PayPal Holdings Inc.", sector: "Financial Services" },
  { symbol: "ADBE", name: "Adobe Inc.", sector: "Technology" },
  { symbol: "INTC", name: "Intel Corp.", sector: "Technology" },
  { symbol: "AMD", name: "Advanced Micro Devices Inc.", sector: "Technology" },
  { symbol: "ORCL", name: "Oracle Corp.", sector: "Technology" },
  { symbol: "CRM", name: "Salesforce Inc.", sector: "Technology" },
  { symbol: "UBER", name: "Uber Technologies Inc.", sector: "Technology" },
  { symbol: "ABNB", name: "Airbnb Inc.", sector: "Consumer Cyclical" },
  { symbol: "COIN", name: "Coinbase Global Inc.", sector: "Financial Services" },
  { symbol: "HOOD", name: "Robinhood Markets Inc.", sector: "Financial Services" },
  { symbol: "SQ", name: "Block Inc.", sector: "Technology" },
  { symbol: "SHOP", name: "Shopify Inc.", sector: "Technology" },
  { symbol: "SPOT", name: "Spotify Technology S.A.", sector: "Communication Services" },
  { symbol: "ZM", name: "Zoom Video Communications Inc.", sector: "Technology" },
  { symbol: "PLTR", name: "Palantir Technologies Inc.", sector: "Technology" },
  { symbol: "SNOW", name: "Snowflake Inc.", sector: "Technology" },
  { symbol: "TSM", name: "Taiwan Semiconductor Manufacturing Co.", sector: "Technology" },
  { symbol: "BABA", name: "Alibaba Group Holding Ltd.", sector: "Consumer Cyclical" },
  { symbol: "NIO", name: "NIO Inc.", sector: "Consumer Cyclical" },
  { symbol: "XPEV", name: "XPeng Inc.", sector: "Consumer Cyclical" },
  { symbol: "LI", name: "Li Auto Inc.", sector: "Consumer Cyclical" },
  { symbol: "MSTR", name: "MicroStrategy Inc.", sector: "Technology" },
  { symbol: "MARA", name: "Marathon Digital Holdings Inc.", sector: "Technology" },
  { symbol: "RIOT", name: "Riot Platforms Inc.", sector: "Technology" },
  { symbol: "CLSK", name: "CleanSpark Inc.", sector: "Technology" },
  { symbol: "HUT", name: "Hut 8 Corp.", sector: "Technology" },
  { symbol: "WMT", name: "Walmart Inc.", sector: "Consumer Defensive" },
  { symbol: "COST", name: "Costco Wholesale Corp.", sector: "Consumer Defensive" },
  { symbol: "TGT", name: "Target Corp.", sector: "Consumer Defensive" },
  { symbol: "HD", name: "Home Depot Inc.", sector: "Consumer Cyclical" },
  { symbol: "LOW", name: "Lowe's Companies Inc.", sector: "Consumer Cyclical" },
  { symbol: "NKE", name: "NIKE Inc.", sector: "Consumer Cyclical" },
  { symbol: "SBUX", name: "Starbucks Corp.", sector: "Consumer Cyclical" },
  { symbol: "MCD", name: "McDonald's Corp.", sector: "Consumer Cyclical" },
  { symbol: "KO", name: "Coca-Cola Co.", sector: "Consumer Defensive" },
  { symbol: "PEP", name: "PepsiCo Inc.", sector: "Consumer Defensive" },
  { symbol: "XLF", name: "Financial Select Sector SPDR Fund", sector: "Financial Services" }
];

const ALL_STOCKS = ALL_STOCKS_DATA.map(s => s.symbol);

// --- Types ---
type Tab = 'market' | 'search' | 'watchlist' | 'ai' | 'settings';

interface StockData {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
}

// --- Contexts ---
const AuthContext = createContext<{
  user: any;
  login: (data: any) => void;
  logout: () => void;
} | null>(null);

const WatchlistContext = createContext<{
  watchlist: any[];
  addToWatchlist: (symbol: string, price: number) => Promise<void>;
  removeFromWatchlist: (symbol: string) => Promise<void>;
  refreshWatchlist: () => Promise<void>;
  isLoading: boolean;
  setModalType: (type: string | null) => void;
}>({
  watchlist: [],
  addToWatchlist: async () => {},
  removeFromWatchlist: async () => {},
  refreshWatchlist: async () => {},
  isLoading: false,
  setModalType: () => {}
});

// --- App Component ---
export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>('market');
  const [searchQuery, setSearchQuery] = useState('');
  const [user, setUser] = useState<any>(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isLocked, setIsLocked] = useState(false);
  const [pendingPrompt, setPendingPrompt] = useState<string | null>(null);
  const [prices, setPrices] = useState<Record<string, number>>({});
  const [marketNews, setMarketNews] = useState<any[]>([]);
  const [modalType, setModalType] = useState<string | null>(null);
  const [watchlist, setWatchlist] = useState<any[]>([]);
  const [watchlistLoading, setWatchlistLoading] = useState(false);
  const { t, i18n } = useTranslation();

  const refreshWatchlist = async () => {
    if (!localStorage.getItem('token')) return;
    setWatchlistLoading(true);
    try {
      const url = API_BASE + '/api/portfolio';
      const res = await fetch(url, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      if (res.ok) {
        const contentType = res.headers.get("content-type");
        if (contentType && contentType.includes("application/json")) {
          const data = await res.json();
          setWatchlist(Array.isArray(data) ? data : []);
        } else {
          const text = await res.text();
          console.error(`Expected JSON from ${url} but got HTML/Text. Check if API_BASE is correct. Response start:`, text.slice(0, 100));
        }
      } else if (res.status === 401 || res.status === 403) {
        setModalType('login');
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        setIsLoggedIn(false);
      }
    } catch (e) {
      console.error("Failed to refresh watchlist:", e);
      if (isMobileEnvironment && !API_BASE) {
        alert("Connection Error: Backend URL not configured. Please go to Settings and set your Backend API URL.");
      }
    } finally {
      setWatchlistLoading(true); // Keep loading state for a bit to prevent flicker
      setTimeout(() => setWatchlistLoading(false), 500);
    }
  };

  useEffect(() => {
    if (isLoggedIn) {
      refreshWatchlist();
    }
  }, [isLoggedIn]);

  const addToWatchlist = async (symbol: string, price: number) => {
    try {
      const res = await fetch(API_BASE + '/api/portfolio', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ symbol, quantity: 1, buy_price: price })
      });
      if (res.ok) {
        await refreshWatchlist();
      } else {
        if (res.status === 401 || res.status === 403) {
          setModalType('login');
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          setIsLoggedIn(false);
          return; // Do not throw error to avoid console logs
        }
        throw new Error(await res.text());
      }
    } catch (e) {
      console.error("Failed to add to watchlist:", e);
      throw e;
    }
  };

  const removeFromWatchlist = async (symbol: string) => {
    try {
      const res = await fetch(API_BASE + `/api/portfolio/${symbol}`, {
        method: 'DELETE',
        headers: { 
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      if (res.ok) {
        await refreshWatchlist();
      } else {
        if (res.status === 401 || res.status === 403) {
          setModalType('login');
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          setIsLoggedIn(false);
          return; // Do not throw error to avoid console logs
        }
        throw new Error(await res.text());
      }
    } catch (e) {
      console.error("Failed to remove from watchlist:", e);
      throw e;
    }
  };

  useEffect(() => {
    const savedUser = localStorage.getItem('user');
    if (savedUser) {
      const userData = JSON.parse(savedUser);
      setUser(userData);
      setIsLoggedIn(true);
      if (userData.hasPin) {
        setIsLocked(true);
      }
    }

    const socket = io(API_BASE || undefined);
    socket.on('stock_update', (data) => setPrices(data));
    socket.on('news_update', (newsItem) => {
      setMarketNews(prev => [newsItem, ...prev].slice(0, 20));
    });

    // Fetch initial data
    const fetchInitialData = async () => {
      try {
        const pricesRes = await fetch(API_BASE + '/api/prices');
        if (pricesRes.ok) {
          const pricesData = await pricesRes.json();
          setPrices(pricesData);
        }

        const newsRes = await fetch(API_BASE + '/api/news');
        if (newsRes.ok) {
          const newsData = await newsRes.json();
          if (Array.isArray(newsData)) {
            setMarketNews(newsData);
          }
        } else {
          console.error("Initial news fetch failed with status:", newsRes.status);
        }
      } catch (err) {
        console.error("Failed to fetch initial data:", err);
        if (isMobileEnvironment && !API_BASE) {
          console.warn("Initial fetch failed. This is expected if Backend URL is not set in Settings.");
        }
      }
    };

    fetchInitialData();

    // Gemini Live News Update
    const updateGeminiNews = async () => {
      const symbols = ALL_STOCKS_DATA.slice(0, 10).map(s => s.symbol);
      const aiNews = await generateLiveNews(symbols);
      if (aiNews && aiNews.length > 0) {
        const formattedNews = aiNews.map((item: any) => ({
          ...item,
          id: Math.random().toString(36).substr(2, 9),
          date: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
          timestamp: Date.now(),
          isAI: true
        }));
        setMarketNews(prev => [...formattedNews, ...prev].slice(0, 30));
      }
    };

    const newsInterval = setInterval(updateGeminiNews, 600000); // Every 10 minutes to avoid rate limits
    updateGeminiNews(); // Initial AI news

    return () => { 
      socket.disconnect();
      clearInterval(newsInterval);
    };
  }, []);

  const login = (data: any) => {
    setUser(data.user);
    localStorage.setItem('token', data.token);
    localStorage.setItem('user', JSON.stringify(data.user));
    setIsLoggedIn(true);
    if (data.user.hasPin) {
      setIsLocked(true);
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setIsLoggedIn(false);
  };

  const handleAnalyzeStock = (symbol: string) => {
    setPendingPrompt(`Analyze ${symbol} stock performance and give me a recommendation.`);
    setActiveTab('ai');
  };

  if (!isLoggedIn) {
    return <LoginScreen onLogin={login} />;
  }

  if (isLocked) {
    return <PinLock onUnlock={() => setIsLocked(false)} onLogout={logout} />;
  }

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      <WatchlistContext.Provider value={{ 
        watchlist, 
        addToWatchlist, 
        removeFromWatchlist, 
        refreshWatchlist,
        isLoading: watchlistLoading,
        setModalType
      }}>
        <div className="flex flex-col h-screen bg-[#020617] text-white font-sans overflow-hidden">
        {/* Header */}
        <header className="px-6 py-4 flex justify-between items-center border-b border-white/5 bg-[#020617]/80 backdrop-blur-md sticky top-0 z-50">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-xl font-bold tracking-tight">StockAI <span className="text-blue-500">Ultra</span></h1>
          </div>
          <div className="flex items-center gap-4">
            <button 
              onClick={() => {
                console.log('Bell clicked');
                setModalType('notifications');
              }}
              className="p-2 hover:bg-white/5 rounded-full transition-colors relative z-10"
            >
              <Bell className="w-5 h-5 text-gray-400" />
            </button>
            <button 
              onClick={() => setActiveTab('settings')}
              className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-xs font-bold hover:ring-2 hover:ring-blue-500/50 transition-all active:scale-95 relative z-10"
            >
              {user?.email?.[0].toUpperCase()}
            </button>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 overflow-hidden relative">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className={cn(
                "max-w-2xl mx-auto w-full h-full",
                activeTab === 'ai' ? "p-0" : "p-6 overflow-y-auto pb-24"
              )}
            >
              {activeTab === 'market' && <MarketScreen onAnalyze={handleAnalyzeStock} prices={prices} news={marketNews} onNavigateToSearch={(query) => { setSearchQuery(query); setActiveTab('search'); }} />}
              {activeTab === 'search' && <SearchScreen onAnalyze={handleAnalyzeStock} prices={prices} initialSearch={searchQuery} onSearchChange={setSearchQuery} />}
              {activeTab === 'watchlist' && <WatchlistScreen onAnalyze={handleAnalyzeStock} prices={prices} onRemove={removeFromWatchlist} onBrowse={(query) => { if (typeof query === 'string') setSearchQuery(query); else setSearchQuery(''); setActiveTab('search'); }} />}
              {activeTab === 'ai' && (
                <AIScreen 
                  pendingPrompt={pendingPrompt} 
                  clearPendingPrompt={() => setPendingPrompt(null)} 
                  setActiveTab={setActiveTab}
                />
              )}
              {activeTab === 'settings' && <SettingsScreen onLogout={logout} modalType={modalType} setModalType={setModalType} />}
            </motion.div>
          </AnimatePresence>
        </main>

        {activeTab !== 'ai' && <VoiceGuide activeTab={activeTab} prices={prices} onVoiceInput={(text) => {
          setPendingPrompt(text);
          setActiveTab('ai');
        }} />}

        {/* Bottom Navigation */}
        <nav className="fixed bottom-0 left-0 right-0 bg-[#020617]/95 backdrop-blur-lg border-t border-white/5 px-4 py-3 flex justify-around items-center z-50">
          <NavButton icon={BarChart3} label={t('market')} active={activeTab === 'market'} onClick={() => setActiveTab('market')} />
          <NavButton icon={Search} label={t('search')} active={activeTab === 'search'} onClick={() => setActiveTab('search')} />
          <NavButton icon={Star} label={t('watchlist')} active={activeTab === 'watchlist'} onClick={() => setActiveTab('watchlist')} />
          <NavButton icon={Sparkles} label={t('ai')} active={activeTab === 'ai'} onClick={() => setActiveTab('ai')} />
          <NavButton icon={Settings} label={t('settings')} active={activeTab === 'settings'} onClick={() => setActiveTab('settings')} />
        </nav>

        <AnimatePresence>
          {modalType && modalType !== 'pin' && (
            <Modal type={modalType} onClose={() => setModalType(null)} />
          )}
        </AnimatePresence>
      </div>
      </WatchlistContext.Provider>
    </AuthContext.Provider>
  );
}

// --- Screens ---

// --- Components ---

function PinLock({ onUnlock, onLogout }: { onUnlock: () => void, onLogout: () => void }) {
  const [pin, setPin] = useState('');
  const [error, setError] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const { t } = useTranslation();

  const handlePinInput = async (digit: string) => {
    if (pin.length >= 4) return;
    const newPin = pin + digit;
    setPin(newPin);
    
    if (newPin.length === 4) {
      const res = await fetch(API_BASE + '/api/user/verify-pin', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ pin: newPin })
      });
      
      if (res.ok) {
        onUnlock();
      } else {
        setError(true);
        setTimeout(() => {
          setPin('');
          setError(false);
        }, 500);
      }
    }
  };

  const handleBiometrics = async () => {
    const biometricsEnabled = localStorage.getItem('biometrics') === 'true';
    if (biometricsEnabled) {
      // Simulate a quick scan delay
      setIsScanning(true);
      setTimeout(() => {
        setIsScanning(false);
        onUnlock();
      }, 800);
    } else {
      alert("Biometrics not enabled. Please enable it in Settings > Security.");
    }
  };

  return (
    <div className="h-screen bg-[#020617] flex flex-col items-center justify-center p-8">
      <div className="text-center space-y-8 w-full max-w-xs">
        <div className="space-y-2">
          <div className="w-16 h-16 bg-blue-600/10 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-blue-500/20">
            <Lock className="w-8 h-8 text-blue-500" />
          </div>
          <h2 className="text-2xl font-bold">Enter PIN</h2>
          <p className="text-gray-500 text-sm">Unlock StockAI Ultra</p>
        </div>

        <div className="flex justify-center gap-4">
          {[0, 1, 2, 3].map(i => (
            <div 
              key={i} 
              className={cn(
                "w-4 h-4 rounded-full border-2 transition-all duration-200",
                pin.length > i ? "bg-blue-500 border-blue-500 scale-110" : "border-white/10",
                error && "border-rose-500 bg-rose-500 animate-shake"
              )} 
            />
          ))}
        </div>

        <div className="grid grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => (
            <button 
              key={num}
              onClick={() => handlePinInput(num.toString())}
              className="w-16 h-16 rounded-full bg-[#0A1227] border border-white/5 text-xl font-bold hover:bg-white/5 active:scale-90 transition-all"
            >
              {num}
            </button>
          ))}
          <button 
            onClick={handleBiometrics}
            disabled={isScanning}
            className={cn(
              "w-16 h-16 rounded-full bg-[#0A1227] border border-white/5 flex items-center justify-center hover:bg-white/5 active:scale-90 transition-all",
              isScanning && "bg-blue-500/20 border-blue-500 animate-pulse"
            )}
          >
            <Fingerprint className={cn("w-6 h-6", isScanning ? "text-blue-400" : "text-blue-500")} />
          </button>
          <button 
            onClick={() => handlePinInput('0')}
            className="w-16 h-16 rounded-full bg-[#0A1227] border border-white/5 text-xl font-bold hover:bg-white/5 active:scale-90 transition-all"
          >
            0
          </button>
          <button 
            onClick={() => setPin(pin.slice(0, -1))}
            className="w-16 h-16 rounded-full bg-[#0A1227] border border-white/5 flex items-center justify-center hover:bg-white/5 active:scale-90 transition-all text-gray-500"
          >
            <ChevronRight className="w-6 h-6 rotate-180" />
          </button>
        </div>

        <button 
          onClick={onLogout}
          className="text-gray-500 text-sm font-medium hover:text-white transition-colors pt-4"
        >
          Sign out and use another account
        </button>
      </div>
    </div>
  );
}

function LoginScreen({ onLogin }: { onLogin: (data: any) => void }) {
  const [email, setEmail] = useState('demo@stockai.com');
  const [password, setPassword] = useState('password123');
  const [isSignup, setIsSignup] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const endpoint = isSignup ? API_BASE + '/api/auth/signup' : API_BASE + '/api/auth/login';
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    
    const contentType = res.headers.get("content-type");
    let data: any = {};
    if (contentType && contentType.includes("application/json")) {
      data = await res.json();
    } else {
      const text = await res.text();
      console.error("Login failed: Expected JSON but got:", text.slice(0, 100));
      alert("Server error. Please try again later.");
      return;
    }

    if (res.ok) {
      if (isSignup) {
        setIsSignup(false);
        alert("Account created! Please login.");
      } else {
        onLogin(data);
      }
    } else {
      alert(data.error);
    }
  };

  return (
    <div className="h-screen bg-[#020617] flex flex-col items-center justify-center p-8">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md space-y-8"
      >
        <div className="text-center space-y-2">
          <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-blue-500/20">
            <TrendingUp className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-3xl font-bold">StockAI <span className="text-blue-500">Ultra</span></h1>
          <p className="text-gray-400">Secure AI-Powered Stock Intelligence</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider ml-1">Email Address</label>
            <input 
              type="email" 
              value={email} 
              onChange={e => setEmail(e.target.value)}
              className="w-full bg-[#0A1227] border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-blue-500 transition-colors"
              placeholder="name@example.com"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider ml-1">Password</label>
            <div className="relative">
              <input 
                type={showPassword ? "text" : "password"} 
                value={password} 
                onChange={e => setPassword(e.target.value)}
                className="w-full bg-[#0A1227] border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-blue-500 transition-colors pr-12"
                placeholder="••••••••"
              />
              <button 
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors"
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>
          <button className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 rounded-xl shadow-lg shadow-blue-500/20 transition-all active:scale-[0.98]">
            {isSignup ? "Create Account" : "Sign In"}
          </button>
        </form>

        <div className="text-center">
          <button 
            onClick={() => setIsSignup(!isSignup)}
            className="text-blue-500 text-sm font-medium hover:underline"
          >
            {isSignup ? "Already have an account? Sign In" : "Don't have an account? Sign Up"}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

function VoiceGuide({ activeTab, prices, onVoiceInput }: { activeTab: Tab, prices: Record<string, number>, onVoiceInput: (text: string) => void }) {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<any>(null);
  const { t, i18n } = useTranslation();

  const speak = (text: string) => {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = i18n.language === 'en' ? 'en-US' : i18n.language;
    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    window.speechSynthesis.speak(utterance);
  };

  const handleVoiceAction = () => {
    if (isListening) {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (e) {}
      }
      setIsListening(false);
      return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      handleGuide();
      return;
    }

    const recognition = new SpeechRecognition();
    recognitionRef.current = recognition;
    recognition.lang = i18n.language === 'en' ? 'en-US' : i18n.language;
    recognition.continuous = true;
    recognition.interimResults = true;
    
    recognition.onstart = () => {
      setIsListening(true);
      window.speechSynthesis.cancel();
    };

    recognition.onresult = (event: any) => {
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          const transcript = event.results[i][0].transcript;
          onVoiceInput(transcript);
          setIsListening(false);
          try {
            recognition.stop();
          } catch (e) {}
        }
      }
    };

    recognition.onerror = (event: any) => {
      if (event.error !== 'aborted') {
        console.error("Speech recognition error:", event.error);
      }
      setIsListening(false);
    };
    recognition.onend = () => setIsListening(false);

    try {
      recognition.start();
    } catch (e) {
      console.error("Failed to start recognition", e);
      setIsListening(false);
    }
  };

  const handleGuide = () => {
    let guideText = "";
    if (activeTab === 'market') {
      const spx = prices['SPX'] || 5847;
      guideText = `You are on the Market screen. The S&P 500 is currently at ${spx}. Global markets are active 24/7. You can see top gainers and losers below.`;
    } else if (activeTab === 'watchlist') {
      guideText = "This is your personal watchlist. Here you can track stocks you're interested in and see their real-time performance.";
    } else if (activeTab === 'ai') {
      guideText = "Welcome to the AI Assistant. You can ask me complex questions about market trends, technical analysis, or specific stock recommendations.";
    } else if (activeTab === 'search') {
      guideText = "Use the search bar to find any stock or index. Click on a result to see detailed charts and AI-powered insights.";
    } else {
      guideText = "Welcome to StockAI Ultra. I'm here to help you navigate the markets with real-time data and AI intelligence.";
    }
    speak(guideText);
  };

  return (
    <div className="fixed bottom-24 right-6 flex flex-col gap-3 items-end z-50">
      <AnimatePresence>
        {isListening && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.8, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 10 }}
            className="bg-blue-600 text-white px-4 py-2 rounded-2xl text-xs font-bold shadow-xl mb-2"
          >
            Listening...
          </motion.div>
        )}
      </AnimatePresence>
      <div className="flex gap-2">
        <button 
          onClick={handleGuide}
          className={cn(
            "p-4 rounded-full shadow-2xl transition-all active:scale-90",
            isSpeaking ? "bg-emerald-500 animate-pulse" : "bg-white/10 backdrop-blur-md border border-white/10"
          )}
        >
          <Globe className="w-5 h-5 text-white" />
        </button>
        <button 
          onClick={handleVoiceAction}
          className={cn(
            "p-4 rounded-full shadow-2xl transition-all active:scale-90",
            isListening ? "bg-rose-500 animate-pulse" : "bg-blue-600"
          )}
        >
          <Mic className="w-5 h-5 text-white" />
        </button>
      </div>
    </div>
  );
}

function MarketScreen({ onAnalyze, prices, news, onNavigateToSearch }: { onAnalyze: (symbol: string) => void, prices: Record<string, number>, news: any[], onNavigateToSearch: (query: string) => void }) {
  const { t } = useTranslation();
  const [selectedStock, setSelectedStock] = useState<string | null>(null);

  if (selectedStock) {
    return <StockDetail symbol={selectedStock} onBack={() => setSelectedStock(null)} onAnalyze={onAnalyze} prices={prices} />;
  }

  const globalMarkets = [
    { name: 'NYSE', time: '9:30 AM', status: 'OPEN', country: 'US', trend: 'Live' },
    { name: 'NSDQ', time: '9:30 AM', status: 'OPEN', country: 'US', trend: 'Live' },
    { name: 'NSE', time: '3:30 PM', status: 'OPEN', country: 'IN', trend: 'Live' },
    { name: 'LSE', time: '4:30 PM', status: 'OPEN', country: 'GB', trend: 'Live' },
  ];

  const indices = [
    { name: 'S&P 500', value: prices['SPX'] ? prices['SPX'].toLocaleString() : '5,847.23', change: '+ 0.73%', color: 'text-emerald-400' },
    { name: 'NASDAQ', value: prices['IXIC'] ? prices['IXIC'].toLocaleString() : '20,891.54', change: '+ 1.12%', color: 'text-emerald-400' },
    { name: 'DOW', value: prices['DJI'] ? prices['DJI'].toLocaleString() : '43,524.12', change: '+ 0.48%', color: 'text-emerald-400' },
    { name: 'RELIANCE', value: prices['RELIANCE'] ? prices['RELIANCE'].toLocaleString() : '2,985.40', change: '+ 1.25%', color: 'text-emerald-400' },
    { name: 'TCS', value: prices['TCS'] ? prices['TCS'].toLocaleString() : '4,120.15', change: '- 0.32%', color: 'text-rose-400' },
    { name: 'HSBC', value: prices['HSBC'] ? prices['HSBC'].toLocaleString() : '650.40', change: '+ 0.15%', color: 'text-emerald-400' },
  ];

  const sectors = [
    { name: 'Technology', icon: '💻', count: ALL_STOCKS_DATA.filter(s => s.sector === 'Technology').length },
    { name: 'Crypto', icon: '🪙', count: ALL_STOCKS_DATA.filter(s => s.sector === 'Crypto').length },
    { name: 'Consumer', icon: '🛍️', count: ALL_STOCKS_DATA.filter(s => s.sector.includes('Consumer')).length },
    { name: 'Finance', icon: '🏦', count: ALL_STOCKS_DATA.filter(s => s.sector.includes('Financial')).length },
  ];

  return (
    <div className="space-y-8">
      <section className="space-y-4">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold">Good afternoon, {localStorage.getItem('user') ? JSON.parse(localStorage.getItem('user')!).email.split('@')[0] : 'Trader'}</h2>
            <div className="flex items-center gap-2 mt-1">
              <div className="w-2 h-2 rounded-full bg-emerald-500" />
              <span className="text-xs text-emerald-400 font-medium">{t('market_open')} — 24/7 ACTIVE</span>
            </div>
          </div>
          <button className="p-3 bg-blue-600/20 rounded-2xl text-blue-400">
            <TrendingUp className="w-6 h-6" />
          </button>
        </div>

        {/* Live News Ticker */}
        <div className="bg-blue-500/10 border border-blue-500/20 rounded-2xl p-4 flex flex-col gap-3 overflow-hidden">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
              <span className="text-[10px] font-bold text-blue-400 uppercase tracking-wider">Live Market Feed</span>
            </div>
            <span className="text-[9px] text-blue-400/50 font-mono">UPDATED REAL-TIME</span>
          </div>
          <div className="flex gap-8 animate-marquee whitespace-nowrap">
            {(Array.isArray(news) ? news : []).slice(0, 10).map((item, i) => (
              <span key={i} className="text-xs font-medium text-gray-300">
                <span className="text-blue-400 font-bold mr-2">{item.symbol}:</span>
                {item.title}
              </span>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {sectors.map((s, i) => (
            <button 
              key={i}
              onClick={() => onNavigateToSearch(s.name)}
              className="bg-[#0A1227] p-4 rounded-2xl border border-white/5 flex items-center gap-3 hover:bg-white/5 transition-colors text-left"
            >
              <div className="text-2xl">{s.icon}</div>
              <div>
                <p className="text-xs font-bold">{s.name}</p>
                <p className="text-[10px] text-gray-500">{s.count} Stocks</p>
              </div>
            </button>
          ))}
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-[10px] font-bold text-gray-500 uppercase tracking-[0.2em]">{t('global_markets')} — 24/7</h3>
            <span className="text-[9px] bg-emerald-500/10 text-emerald-400 px-1.5 py-0.5 rounded font-bold">LIVE 24/7</span>
          </div>
          <div className="flex gap-3 overflow-x-auto pb-2 no-scrollbar">
            {globalMarkets.map((m, i) => (
              <div key={i} className="min-w-[100px] bg-[#0A1227] p-4 rounded-2xl border border-white/5 space-y-2 flex flex-col items-center justify-center">
                <div className="flex justify-center text-lg font-medium">{m.country}</div>
                <div className="text-center">
                  <p className="text-xs font-bold">{m.name}</p>
                  <p className="text-[10px] text-gray-500">{m.time}</p>
                  <p className={cn("text-[9px] font-bold mt-1", m.trend === 'Weekend' ? "text-rose-400" : (m.trend.startsWith('+') ? "text-emerald-400" : "text-rose-400"))}>{m.trend}</p>
                </div>
                <div className="flex items-center justify-center gap-1">
                  <div className={cn("w-1.5 h-1.5 rounded-full", m.status === 'OPEN' ? "bg-emerald-500" : "bg-rose-500")} />
                  <span className={cn("text-[9px] font-bold uppercase", m.status === 'OPEN' ? "text-emerald-400" : "text-rose-400")}>{m.status}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-[#0A1227] p-6 rounded-3xl border border-white/5 space-y-4">
        <h3 className="text-[10px] font-bold text-gray-500 uppercase tracking-[0.2em]">{t('us_indices')}</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {indices.map((idx, i) => (
            <div key={i} className="text-center space-y-1 p-2 bg-white/5 rounded-2xl border border-white/5">
              <p className="text-[10px] text-gray-500 font-bold">{idx.name}</p>
              <p className="text-sm font-bold">{idx.value}</p>
              <p className={cn("text-[10px] font-bold", idx.color)}>{idx.change}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-bold flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-500" />
            {t('top_gainers')}
          </h3>
          <button className="text-blue-500 text-sm font-medium">{t('see_all')}</button>
        </div>
        <div className="space-y-3">
          {(Object.entries(prices) as [string, number][])
            .filter(([symbol]) => !['SPX', 'IXIC', 'DJI'].includes(symbol))
            .slice(0, 10)
            .map(([symbol, price]) => (
              <StockRow key={`gainer-${symbol}`} symbol={symbol} price={price} change={Math.random() * 3 + 1} onClick={() => setSelectedStock(symbol)} />
            ))}
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-bold flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-rose-500" />
            {t('top_losers')}
          </h3>
        </div>
        <div className="space-y-3">
          {(Object.entries(prices) as [string, number][])
            .filter(([symbol]) => !['SPX', 'IXIC', 'DJI'].includes(symbol))
            .slice(10, 20)
            .map(([symbol, price]) => (
              <StockRow key={`loser-${symbol}`} symbol={symbol} price={price} change={-(Math.random() * 3 + 1)} onClick={() => setSelectedStock(symbol)} />
            ))}
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-[10px] font-bold text-gray-500 uppercase tracking-[0.2em]">Latest Updates</h3>
          <button className="text-[10px] text-blue-400 font-bold uppercase tracking-wider">View All</button>
        </div>
        <div className="space-y-3">
          {(Array.isArray(news) ? news : []).slice(0, 10).map((item) => (
            <div 
              key={item.id}
              onClick={() => onAnalyze(item.symbol)}
              className="bg-[#0A1227] p-4 rounded-2xl border border-white/5 space-y-3 hover:bg-white/5 transition-colors cursor-pointer group"
            >
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded uppercase">{item.symbol}</span>
                  <span className="text-[10px] text-gray-500">{item.source}</span>
                  {item.isAI && (
                    <span className="text-[8px] font-bold bg-rose-500/20 text-rose-400 px-1.5 py-0.5 rounded animate-pulse">LIVE</span>
                  )}
                </div>
                <span className="text-[10px] text-gray-600 font-mono">{item.date}</span>
              </div>
              <p className="text-sm font-medium leading-relaxed group-hover:text-blue-400 transition-colors">{item.title}</p>
              <div className="flex items-center gap-2">
                <div className="flex -space-x-2">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="w-5 h-5 rounded-full border-2 border-[#050A18] bg-gray-800 flex items-center justify-center overflow-hidden">
                      <img src={`https://picsum.photos/seed/${item.symbol}${i}/20/20`} alt="" referrerPolicy="no-referrer" />
                    </div>
                  ))}
                </div>
                <span className="text-[10px] text-gray-500">+124 traders watching</span>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function StockDetail({ symbol, onBack, onAnalyze, prices }: { symbol: string, onBack: () => void, onAnalyze: (symbol: string) => void, prices: Record<string, number> }) {
  const { t } = useTranslation();
  const currentPrice = prices[symbol] || 0;
  const watchlistCtx = useContext(WatchlistContext);
  const [chartData, setChartData] = useState<any[]>([]);
  const [news, setNews] = useState<any[]>([]);
  const [newsLoading, setNewsLoading] = useState(true);
  const [selectedArticle, setSelectedArticle] = useState<any | null>(null);
  const [showAllNews, setShowAllNews] = useState(false);

  const { watchlist, addToWatchlist, removeFromWatchlist } = watchlistCtx;
  const isAdded = watchlist.some(s => s.symbol === symbol);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    // Mock news fetching
    const fetchNews = async () => {
      setNewsLoading(true);
      try {
        const res = await fetch(API_BASE + `/api/news?symbol=${symbol}`);
        const contentType = res.headers.get("content-type");
        if (contentType && contentType.includes("application/json")) {
          const data = await res.json();
          setNews(Array.isArray(data) ? data : []);
        } else {
          console.error("News fetch failed: Expected JSON");
        }
      } catch (e) {
        console.error("Failed to fetch news:", e);
      } finally {
        setNewsLoading(false);
      }
    };

    fetchNews();

    // Initialize chart data
    const initialData = Array.from({ length: 20 }, (_, i) => ({ 
      name: i, 
      value: (prices[symbol] || 200) + (Math.random() - 0.5) * 20 
    }));
    setChartData(initialData);
  }, [symbol]);

  // Update chart data when price changes
  useEffect(() => {
    if (currentPrice > 0) {
      setChartData(prev => {
        const newData = [...prev.slice(1), { name: prev.length, value: currentPrice }];
        return newData;
      });
    }
  }, [currentPrice]);

  const toggleWatchlist = async () => {
    if (!localStorage.getItem('token')) {
      watchlistCtx.setModalType('login');
      return;
    }
    if (isProcessing) return;
    setIsProcessing(true);
    try {
      if (isAdded) {
        await removeFromWatchlist(symbol);
      } else {
        await addToWatchlist(symbol, currentPrice);
      }
    } catch (e) {
      console.error("Watchlist toggle error:", e);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <button onClick={onBack} className="p-2 bg-[#0A1227] rounded-xl border border-white/5">
          <ChevronRight className="w-6 h-6 rotate-180" />
        </button>
        <div className="text-center flex-1">
          <div className="flex items-center justify-center gap-2">
            <h2 className="text-xl font-bold">{symbol}</h2>
          </div>
          <div className="flex items-center justify-center gap-2 mt-1">
            <p className="text-[10px] text-gray-500 uppercase tracking-widest">
              NASDAQ · {ALL_STOCKS_DATA.find(s => s.symbol === symbol)?.sector || 'Technology'}
            </p>
            <button 
              onClick={toggleWatchlist}
              disabled={isProcessing}
              className={cn(
                "px-2 py-1 rounded-lg border transition-all active:scale-90",
                isAdded ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/20" : "bg-blue-600 text-white border-blue-500 hover:bg-blue-700",
                isProcessing && "opacity-50"
              )}
            >
              {isAdded ? (
                <div className="flex items-center gap-1">
                  <CheckCircle className="w-3 h-3" />
                  <span className="text-[9px] font-bold">SAVED</span>
                </div>
              ) : (
                <div className="flex items-center gap-1">
                  <Plus className="w-3 h-3" />
                  <span className="text-[9px] font-bold">SAVE</span>
                </div>
              )}
            </button>
          </div>
        </div>
      </div>

      <div className="space-y-1 text-center">
        <p className="text-gray-400 text-sm">{ALL_STOCKS_DATA.find(s => s.symbol === symbol)?.name || symbol + ' Inc.'}</p>
        <h2 className="text-5xl font-bold">${currentPrice.toLocaleString()}</h2>
        <div className="flex items-center justify-center gap-2">
          <span className="text-emerald-400 text-sm font-medium">▲ 1.30%</span>
          <span className="text-gray-500 text-xs">Vol: 72.2M</span>
        </div>
      </div>

      <div className="h-64 w-full bg-[#0A1227] rounded-3xl border border-white/5 overflow-hidden relative">
        <div className="absolute inset-4">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData}>
            <defs>
              <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <Tooltip 
              contentStyle={{ backgroundColor: '#0A1227', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }}
              itemStyle={{ color: '#fff', fontSize: '12px', fontWeight: 'bold' }}
              labelStyle={{ display: 'none' }}
              formatter={(value: number) => [`$${value.toLocaleString()}`, 'Price']}
            />
            <Area type="monotone" dataKey="value" stroke="#3b82f6" fillOpacity={1} fill="url(#colorPrice)" strokeWidth={3} />
          </AreaChart>
        </ResponsiveContainer>
        </div>
      </div>

      <button 
        onClick={() => onAnalyze(symbol)}
        className="w-full bg-blue-500 text-white font-bold py-4 rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20 active:scale-[0.98] transition-all"
      >
        <TrendingUp className="w-5 h-5" />
        AI Analysis
      </button>

      <div className="space-y-4">
        <h3 className="text-sm font-bold text-gray-400">Key Metrics</h3>
        <div className="grid grid-cols-2 gap-4">
          <MetricCard label="Market Cap" value="$454.3B" />
          <MetricCard label="P/E Ratio" value="24.1" />
          <MetricCard label="EPS" value="$8.45" />
          <MetricCard label="Beta" value="1.86" sub="High volatility" />
          <MetricCard label="52W High" value="$288.21" />
          <MetricCard label="52W Low" value="$153.71" />
        </div>
      </div>

      <div className="space-y-4 pb-12">
        <div className="flex justify-between items-center">
          <h3 className="text-sm font-bold text-gray-400">Latest News</h3>
          <button 
            onClick={() => setShowAllNews(!showAllNews)}
            className="text-blue-500 text-xs font-medium"
          >
            {showAllNews ? "Show Less" : "View All"}
          </button>
        </div>
        
        {newsLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="bg-[#0A1227] p-4 rounded-2xl border border-white/5 animate-pulse space-y-2">
                <div className="h-4 bg-white/5 rounded w-3/4" />
                <div className="h-3 bg-white/5 rounded w-1/2" />
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-3">
            {(Array.isArray(news) ? (showAllNews ? news : news.slice(0, 3)) : []).map(article => (
              <div 
                key={article.id} 
                onClick={() => setSelectedArticle(article)}
                className="bg-[#0A1227] p-4 rounded-2xl border border-white/5 hover:bg-white/5 transition-colors cursor-pointer group"
              >
                <div className="space-y-2">
                  <h4 className="text-sm font-medium group-hover:text-blue-400 transition-colors line-clamp-2">
                    {article.title}
                  </h4>
                  <div className="flex items-center justify-between text-[10px] text-gray-500 font-bold uppercase tracking-wider">
                    <span className="flex items-center gap-1.5">
                      <div className={cn(
                        "w-1.5 h-1.5 rounded-full",
                        article.sentiment === 'positive' ? "bg-emerald-500" : "bg-gray-500"
                      )} />
                      {article.source}
                    </span>
                    <span>{article.date}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* News Detail Modal */}
      <AnimatePresence>
        {selectedArticle && (
          <div className="fixed inset-0 z-[100] flex items-end justify-center sm:items-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedArticle(null)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              className="relative w-full max-w-lg bg-[#0A1227] rounded-t-[32px] sm:rounded-[32px] border border-white/10 overflow-hidden shadow-2xl"
            >
              <div className="p-8 space-y-6">
                <div className="flex justify-between items-start">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold text-blue-500 uppercase tracking-widest">{selectedArticle.source}</span>
                      <span className="text-[10px] text-gray-500">•</span>
                      <span className="text-[10px] text-gray-500 uppercase tracking-widest">{selectedArticle.date}</span>
                    </div>
                    <h3 className="text-xl font-bold leading-tight">{selectedArticle.title}</h3>
                  </div>
                  <button 
                    onClick={() => setSelectedArticle(null)}
                    className="p-2 hover:bg-white/5 rounded-full transition-colors"
                  >
                    <X className="w-5 h-5 text-gray-500" />
                  </button>
                </div>

                <div className="aspect-video w-full bg-white/5 rounded-2xl overflow-hidden relative">
                  <img 
                    src={`https://picsum.photos/seed/${selectedArticle.id}/800/450`} 
                    alt="News" 
                    className="w-full h-full object-cover opacity-60"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#0A1227] to-transparent" />
                </div>

                <div className="space-y-4">
                  <p className="text-gray-400 text-sm leading-relaxed">
                    Financial markets are reacting to the latest developments from {symbol}. Analysts suggest that the current trend could have significant implications for the technology sector in the coming months.
                  </p>
                  <p className="text-gray-400 text-sm leading-relaxed">
                    "The performance we're seeing is indicative of broader market shifts," says one senior analyst. "Investors should keep a close eye on upcoming regulatory changes that might impact {symbol}'s strategic initiatives."
                  </p>
                </div>

                <button 
                  onClick={() => setSelectedArticle(null)}
                  className="w-full bg-white/5 hover:bg-white/10 text-white font-bold py-4 rounded-2xl transition-all border border-white/5"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

function MetricCard({ label, value, sub }: { label: string, value: string, sub?: string }) {
  return (
    <div className="bg-[#0A1227] p-4 rounded-2xl border border-white/5 space-y-1">
      <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">{label}</p>
      <p className="text-lg font-bold">{value}</p>
      {sub && <p className="text-[10px] text-gray-600">{sub}</p>}
    </div>
  );
}

function SearchScreen({ onAnalyze, prices, initialSearch = '', onSearchChange }: { onAnalyze: (symbol: string) => void, prices: Record<string, number>, initialSearch?: string, onSearchChange?: (val: string) => void }) {
  const [search, setSearch] = useState(initialSearch);
  const [selectedStock, setSelectedStock] = useState<string | null>(null);

  useEffect(() => {
    setSearch(initialSearch);
  }, [initialSearch]);

  const handleSearchChange = (val: string) => {
    setSearch(val);
    if (onSearchChange) onSearchChange(val);
  };

  if (selectedStock) {
    return <StockDetail symbol={selectedStock} onBack={() => setSelectedStock(null)} onAnalyze={onAnalyze} prices={prices} />;
  }

  const filteredStocks = ALL_STOCKS_DATA.filter(stock => 
    stock.symbol.toLowerCase().includes(search.toLowerCase()) ||
    stock.name.toLowerCase().includes(search.toLowerCase()) ||
    stock.sector.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
        <input 
          type="text"
          placeholder="Search symbols, names, or sectors (e.g. Technology)..."
          value={search}
          onChange={e => handleSearchChange(e.target.value)}
          className="w-full bg-[#0A1227] border border-white/10 rounded-2xl pl-12 pr-4 py-4 focus:outline-none focus:border-blue-500 transition-colors"
        />
      </div>

      <div className="space-y-3">
        {filteredStocks.length > 0 ? (
          filteredStocks.map((stock) => (
            <StockRow 
              key={`search-${stock.symbol}`} 
              symbol={stock.symbol} 
              price={prices[stock.symbol] || 0} 
              change={(Math.random() - 0.5) * 4} 
              onClick={() => setSelectedStock(stock.symbol)}
            />
          ))
        ) : (
          <div className="text-center py-12 text-gray-500">
            No stocks found matching "{search}"
          </div>
        )}
      </div>
    </div>
  );
}

function WatchlistScreen({ onAnalyze, prices, onRemove, onBrowse }: { onAnalyze: (symbol: string) => void, prices: Record<string, number>, onRemove: (symbol: string) => void, onBrowse: (query?: string) => void }) {
  const { t } = useTranslation();
  const [selectedStock, setSelectedStock] = useState<string | null>(null);
  const watchlistCtx = useContext(WatchlistContext);
  const { watchlist } = watchlistCtx;

  if (selectedStock) {
    return <StockDetail symbol={selectedStock} onBack={() => setSelectedStock(null)} onAnalyze={onAnalyze} prices={prices} />;
  }

  return (
    <div className="flex flex-col h-[calc(100vh-180px)] space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-4xl font-bold tracking-tight">{t('watchlist')}</h2>
      </div>

      <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2">
        <button 
          onClick={() => onBrowse()}
          className="px-4 py-2 bg-blue-600 text-white text-xs font-bold rounded-xl whitespace-nowrap shadow-lg shadow-blue-500/20"
        >
          Browse All
        </button>
        <button 
          onClick={() => onBrowse('Technology')}
          className="px-4 py-2 bg-[#0A1227] text-gray-400 text-xs font-bold rounded-xl whitespace-nowrap border border-white/5 hover:bg-white/5 transition-colors flex items-center gap-1"
        >
          <Search className="w-3 h-3" />
          Browse Technology
        </button>
      </div>

      {watchlist.length > 0 ? (
        <div className="space-y-3 overflow-y-auto no-scrollbar">
          {watchlist.map((stock) => (
            <StockRow 
              key={stock.id} 
              symbol={stock.symbol} 
              price={prices[stock.symbol] || stock.buy_price || 0} 
              change={prices[stock.symbol] && stock.buy_price ? ((prices[stock.symbol] - stock.buy_price) / stock.buy_price) * 100 : 0}
              onClick={() => setSelectedStock(stock.symbol)}
              onRemove={() => onRemove(stock.symbol)}
              hideAddButton={true}
            />
          ))}
        </div>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center text-center space-y-8">
          <div className="w-32 h-32 bg-[#0A1227] rounded-[40px] border border-white/5 flex items-center justify-center relative">
            <div className="absolute inset-0 bg-blue-500/5 rounded-[40px] blur-2xl" />
            <Star className="w-16 h-16 text-gray-600 opacity-20 relative z-10" />
          </div>
          <div className="space-y-3">
            <h3 className="text-2xl font-bold">Your watchlist is empty</h3>
            <p className="text-gray-500 text-sm max-w-[240px] leading-relaxed">Search for stocks and add them here to track their performance</p>
          </div>
          <button 
            onClick={() => onBrowse()}
            className="bg-[#00D1FF] text-[#050A18] font-bold px-10 py-4 rounded-2xl shadow-lg shadow-blue-500/20 hover:scale-105 transition-all active:scale-95"
          >
            Browse Stocks
          </button>
        </div>
      )}
    </div>
  );
}

function AIScreen({ pendingPrompt, clearPendingPrompt, setActiveTab }: { 
  pendingPrompt: string | null, 
  clearPendingPrompt: () => void,
  setActiveTab: (tab: string) => void
}) {
  return (
    <div className="flex flex-col h-[calc(100vh-180px)]">
      <ChatScreen 
        pendingPrompt={pendingPrompt} 
        clearPendingPrompt={clearPendingPrompt} 
        setActiveTab={setActiveTab}
      />
    </div>
  );
}

function ChatScreen({ pendingPrompt, clearPendingPrompt, setActiveTab }: { 
  pendingPrompt: string | null, 
  clearPendingPrompt: () => void,
  setActiveTab: (tab: string) => void
}) {
  const { i18n, t } = useTranslation();
  const [messages, setMessages] = useState<any[]>([
    { role: 'ai', content: 'Hey there! 👋 I\'m your StockAI buddy. Ready to find some winners today? Ask me anything!' }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);

  const [geminiKeyMissing, setGeminiKeyMissing] = useState(() => {
    if (typeof localStorage === 'undefined') return false;
    const key = localStorage.getItem('GEMINI_API_KEY');
    return !key && !process.env.GEMINI_API_KEY;
  });

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, loading]);

  useEffect(() => {
    if (pendingPrompt) {
      handleSend(pendingPrompt, true);
      clearPendingPrompt();
    }
  }, [pendingPrompt]);

  const handleSend = async (text?: string, isVoice = false) => {
    const messageText = text || input;
    if (!messageText.trim()) return;
    
    const userMsg = { role: 'user', content: messageText };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const analysis = await chatWithAI(messageText);
      setMessages(prev => [...prev, { role: 'ai', content: analysis }]);
      if (isVoice && analysis.summary) {
        speak(analysis.summary);
      }
    } catch (e) {
      setMessages(prev => [...prev, { role: 'ai', content: { explanation: "Oops! My brain hit a snag. Can you try again, friend? 😅" } }]);
    } finally {
      setLoading(false);
    }
  };

  const speak = (text: string) => {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = i18n.language === 'en' ? 'en-US' : i18n.language;
    window.speechSynthesis.speak(utterance);
  };

  const toggleListening = () => {
    if (isListening) {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (e) {}
      }
      setIsListening(false);
      return;
    }
    
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Speech recognition is not supported in this browser.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognitionRef.current = recognition;
    recognition.lang = i18n.language === 'en' ? 'en-US' : i18n.language;
    recognition.interimResults = true;
    recognition.continuous = false;

    recognition.onstart = () => {
      setIsListening(true);
      window.speechSynthesis.cancel();
    };

    recognition.onresult = (event: any) => {
      const transcript = Array.from(event.results)
        .map((result: any) => result[0])
        .map(result => result.transcript)
        .join('');
      
      setInput(transcript);
      
      if (event.results[0].isFinal) {
        setTimeout(() => {
          handleSend(transcript, true);
          setIsListening(false);
          try {
            recognition.stop();
          } catch (e) {}
        }, 500);
      }
    };

    recognition.onerror = (event: any) => {
      if (event.error !== 'aborted') {
        console.error("Speech recognition error:", event.error);
      }
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    try {
      recognition.start();
    } catch (e) {
      console.error("Failed to start recognition", e);
      setIsListening(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#050A18]">
      {/* Header */}
      <div className="p-4 border-b border-white/5 flex items-center justify-between bg-[#0A1227]/50 backdrop-blur-xl sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
            <Bot className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="font-bold text-sm">StockAI Assistant</h3>
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[10px] text-emerald-500 font-bold uppercase tracking-wider">Online</span>
            </div>
          </div>
        </div>
        <button 
          onClick={() => setMessages([{ role: 'ai', content: 'Hey there! 👋 I\'m your StockAI buddy. Ready to find some winners today? Ask me anything!' }])}
          className="p-2 hover:bg-white/5 rounded-xl transition-colors text-gray-400"
          title="Clear Chat"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      {geminiKeyMissing && (
        <div className="m-4 p-4 bg-amber-500/10 border border-amber-500/20 rounded-2xl space-y-2">
          <div className="flex items-center gap-2 text-amber-500">
            <AlertCircle className="w-4 h-4" />
            <span className="text-xs font-bold uppercase tracking-wider">AI Key Required</span>
          </div>
          <p className="text-[10px] text-gray-400 leading-relaxed">
            To use AI features in a mobile build or new tab, you must provide your own Gemini API Key.
          </p>
          <button 
            onClick={() => setActiveTab('settings')}
            className="text-[10px] text-amber-500 font-bold underline uppercase tracking-wider"
          >
            Go to Settings to configure
          </button>
        </div>
      )}

      <div ref={scrollRef} className="flex-1 overflow-y-auto space-y-4 p-6 no-scrollbar">
        {messages.map((msg, i) => (
          <div key={i} className={cn("flex", msg.role === 'user' ? "justify-end" : "justify-start")}>
            <div className={cn(
              "max-w-[85%] p-4 rounded-2xl",
              msg.role === 'user' ? "bg-blue-600 text-white shadow-lg shadow-blue-500/20" : "bg-[#0A1227] border border-white/5"
            )}>
              {typeof msg.content === 'string' ? (
                <p className="text-sm leading-relaxed">{msg.content}</p>
              ) : (
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className={cn(
                      "px-2 py-1 rounded text-[10px] font-bold uppercase",
                      msg.content.recommendation === 'Buy' ? "bg-emerald-500/20 text-emerald-400" :
                      msg.content.recommendation === 'Sell' ? "bg-rose-500/20 text-rose-400" : 
                      msg.content.recommendation === 'Hold' ? "bg-amber-500/20 text-amber-400" :
                      "bg-blue-500/20 text-blue-400"
                    )}>
                      {msg.content.recommendation || 'Info'}
                    </span>
                    <span className="text-xs text-gray-400">Confidence: {msg.content.confidence || 0}%</span>
                  </div>
                  <p className="text-sm font-medium">{msg.content.summary}</p>
                  <p className="text-xs text-gray-400 leading-relaxed">{msg.content.explanation}</p>
                  <div className="pt-2 border-t border-white/5">
                    <p className="text-[10px] text-gray-500 italic">{msg.content.disclaimer}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-[#0A1227] p-4 rounded-2xl border border-white/5 animate-pulse">
              <div className="flex gap-1">
                <div className="w-2 h-2 bg-gray-600 rounded-full animate-bounce" />
                <div className="w-2 h-2 bg-gray-600 rounded-full animate-bounce [animation-delay:0.2s]" />
                <div className="w-2 h-2 bg-gray-600 rounded-full animate-bounce [animation-delay:0.4s]" />
              </div>
            </div>
          </div>
        )}
      </div>
      <div className="p-4 bg-[#0A1227]/90 backdrop-blur-xl border-t border-white/5 flex gap-2 items-center pb-[100px] z-40 relative">
        <div className="relative flex-1 flex items-center bg-[#050A18] border border-white/10 rounded-2xl px-2">
          <input 
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSend()}
            placeholder={isListening ? "Listening... Speak now" : "Ask your StockAI buddy..."}
            className={cn(
              "flex-1 bg-transparent border-none py-4 px-2 focus:outline-none text-white placeholder:text-gray-600 text-sm",
              isListening && "placeholder:text-blue-400"
            )}
          />
          <div className="flex items-center gap-1">
            <button 
              onClick={toggleListening}
              className={cn(
                "p-2 rounded-xl transition-all",
                isListening ? "bg-rose-500 text-white animate-pulse" : "text-gray-500 hover:text-blue-500 hover:bg-white/5"
              )}
            >
              <Mic className="w-5 h-5" />
            </button>
            <button 
              onClick={() => handleSend()}
              disabled={loading || !input.trim()}
              className="bg-blue-600 p-2 rounded-xl hover:bg-blue-700 transition-colors shadow-lg shadow-blue-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronRight className="w-5 h-5 text-white" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function VoiceScreen() {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');

  const toggleListening = () => {
    setIsListening(!isListening);
    if (!isListening) {
      // Mock voice recognition
      setTimeout(() => {
        setTranscript("How is Apple stock performing today?");
        setIsListening(false);
      }, 2000);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center h-[calc(100vh-200px)] space-y-12">
      <div className="text-center space-y-4">
        <h2 className="text-2xl font-bold">Voice Assistant</h2>
        <p className="text-gray-400">Speak to analyze stocks or manage portfolio</p>
      </div>

      <div className="relative">
        <AnimatePresence>
          {isListening && (
            <motion.div 
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1.5, opacity: 0.2 }}
              exit={{ scale: 0.8, opacity: 0 }}
              transition={{ repeat: Infinity, duration: 1.5 }}
              className="absolute inset-0 bg-blue-500 rounded-full"
            />
          )}
        </AnimatePresence>
        <button 
          onClick={toggleListening}
          className={cn(
            "relative w-32 h-32 rounded-full flex items-center justify-center transition-all shadow-2xl",
            isListening ? "bg-rose-500 shadow-rose-500/40" : "bg-blue-600 shadow-blue-500/40"
          )}
        >
          <Mic className="w-12 h-12 text-white" />
        </button>
      </div>

      <div className="w-full max-w-sm bg-[#0A1227] p-6 rounded-3xl border border-white/5 min-h-[100px] flex items-center justify-center text-center">
        {transcript ? (
          <p className="text-lg font-medium italic">"{transcript}"</p>
        ) : (
          <p className="text-gray-500">Tap the mic to start speaking</p>
        )}
      </div>
    </div>
  );
}

function SettingsScreen({ onLogout, modalType, setModalType }: { onLogout: () => void, modalType: string | null, setModalType: (type: string | null) => void }) {
  const { t, i18n } = useTranslation();
  const [biometrics, setBiometrics] = useState(() => localStorage.getItem('biometrics') === 'true');
  const [hasPin, setHasPin] = useState(false);
  const [newsAlerts, setNewsAlerts] = useState(true);
  const [isEditingProfile, setIsEditingProfile] = useState(false);

  const [userName, setUserName] = useState(() => {
    const user = localStorage.getItem('user');
    return user ? JSON.parse(user).email.split('@')[0] : 'Trader';
  });
  const [userEmail, setUserEmail] = useState(() => {
    const user = localStorage.getItem('user');
    return user ? JSON.parse(user).email : 'user@example.com';
  });

  const changeLanguage = (lng: string) => {
    i18n.changeLanguage(lng);
  };

  useEffect(() => {
    fetch(API_BASE + '/api/user/settings', {
      headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
    })
    .then(res => res.json())
    .then(data => {
      setHasPin(data.hasPin);
      setBiometrics(data.biometrics_enabled);
      localStorage.setItem('biometrics', String(data.biometrics_enabled));
    });
  }, []);

  const handleToggleBiometrics = async () => {
    const newVal = !biometrics;
    setBiometrics(newVal);
    localStorage.setItem('biometrics', String(newVal));
    
    await fetch(API_BASE + '/api/user/settings', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify({ biometrics_enabled: newVal })
    });
  };

  const handleSaveProfile = () => {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    user.email = userEmail;
    user.name = userName;
    localStorage.setItem('user', JSON.stringify(user));
    setIsEditingProfile(false);
    alert('Profile updated successfully!');
  };

  const handleDeleteAccount = async () => {
    if (window.confirm('Are you sure you want to delete your account? This action is permanent and will delete all your data.')) {
      try {
        const res = await fetch(API_BASE + '/api/user', {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });
        if (res.ok) {
          onLogout();
          alert('Account deleted successfully.');
        } else {
          alert('Failed to delete account.');
        }
      } catch (e) {
        console.error(e);
        alert('An error occurred while deleting your account.');
      }
    }
  };

  const [backendUrl, setBackendUrl] = useState(() => localStorage.getItem('VITE_API_URL') || '');
  const [geminiKey, setGeminiKey] = useState(() => localStorage.getItem('GEMINI_API_KEY') || '');

  const handleSaveBackendUrl = () => {
    if (backendUrl) {
      localStorage.setItem('VITE_API_URL', backendUrl);
      alert('Backend URL saved. Please restart the app for changes to take effect.');
      window.location.reload();
    } else {
      localStorage.removeItem('VITE_API_URL');
      alert('Backend URL reset to default. Please restart the app.');
      window.location.reload();
    }
  };

  const handleSaveGeminiKey = () => {
    if (geminiKey) {
      localStorage.setItem('GEMINI_API_KEY', geminiKey);
      alert('Gemini API Key saved. Please restart the app for changes to take effect.');
      window.location.reload();
    } else {
      localStorage.removeItem('GEMINI_API_KEY');
      alert('Gemini API Key reset to default. Please restart the app.');
      window.location.reload();
    }
  };

  const [isCheckingConnection, setIsCheckingConnection] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'idle' | 'success' | 'error'>('idle');

  const checkConnection = async () => {
    setIsCheckingConnection(true);
    setConnectionStatus('idle');
    try {
      const url = (backendUrl || API_BASE).replace(/\/$/, '') + '/api/health';
      const res = await fetch(url);
      if (res.ok) {
        setConnectionStatus('success');
      } else {
        setConnectionStatus('error');
      }
    } catch (e) {
      setConnectionStatus('error');
    } finally {
      setIsCheckingConnection(false);
    }
  };

  return (
    <div className="space-y-8 pb-12">
      <div className="p-6 bg-[#0A1227] rounded-3xl border border-white/5 space-y-4">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-3xl bg-blue-600 flex items-center justify-center text-2xl font-bold shadow-lg shadow-blue-500/20">
            {userEmail[0].toUpperCase()}
          </div>
          <div className="flex-1">
            {isEditingProfile ? (
              <div className="space-y-2">
                <input 
                  value={userName} 
                  onChange={e => setUserName(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-2 py-1 text-sm focus:outline-none focus:border-blue-500"
                />
                <input 
                  value={userEmail} 
                  onChange={e => setUserEmail(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-2 py-1 text-sm focus:outline-none focus:border-blue-500"
                />
              </div>
            ) : (
              <>
                <h3 className="text-xl font-bold">{userName}</h3>
                <p className="text-gray-400 text-sm mb-2">{userEmail}</p>
              </>
            )}
            <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-500/10 text-amber-500 rounded-full text-[10px] font-bold uppercase tracking-wider border border-amber-500/20">
              <span className="text-xs">💎</span> {t('pro_trader')}
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          {isEditingProfile ? (
            <>
              <button onClick={handleSaveProfile} className="flex-1 bg-blue-600 text-white text-xs font-bold py-2 rounded-xl">{t('save')}</button>
              <button onClick={() => setIsEditingProfile(false)} className="flex-1 bg-white/5 text-gray-400 text-xs font-bold py-2 rounded-xl">{t('cancel')}</button>
            </>
          ) : (
            <button onClick={() => setIsEditingProfile(true)} className="w-full bg-white/5 text-blue-400 text-xs font-bold py-2 rounded-xl border border-white/5">{t('edit_profile')}</button>
          )}
        </div>
      </div>

      <div className="space-y-4">
        <h4 className="text-[10px] font-bold text-gray-500 uppercase tracking-[0.2em] ml-2">Backend Configuration</h4>
        <div className="p-6 bg-[#0A1227] rounded-3xl border border-white/5 space-y-4">
          <div className="space-y-4">
            <div>
              <p className="text-xs text-gray-400 mb-2">Backend API URL (e.g., https://your-app.run.app)</p>
              <div className="flex flex-col gap-3">
                <div className="flex gap-2">
                  <input 
                    type="text"
                    value={backendUrl}
                    onChange={e => setBackendUrl(e.target.value)}
                    placeholder="https://your-api-url.run.app"
                    className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-blue-500"
                  />
                  <button 
                    onClick={handleSaveBackendUrl}
                    className="bg-blue-600 text-white px-4 py-2 rounded-xl text-xs font-bold hover:bg-blue-700 transition-colors"
                  >
                    Save
                  </button>
                </div>
                <div className="flex items-center justify-between px-1">
                  <button 
                    onClick={checkConnection}
                    disabled={isCheckingConnection}
                    className="text-[10px] text-blue-400 hover:text-blue-300 font-bold uppercase tracking-wider disabled:opacity-50"
                  >
                    {isCheckingConnection ? 'Checking...' : 'Check Connection'}
                  </button>
                  {connectionStatus === 'success' && (
                    <span className="text-[10px] text-emerald-500 font-bold uppercase tracking-wider flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      Connected
                    </span>
                  )}
                  {connectionStatus === 'error' && (
                    <span className="text-[10px] text-rose-500 font-bold uppercase tracking-wider flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                      Failed to Connect
                    </span>
                  )}
                </div>
              </div>
            </div>
            
            <div>
              <p className="text-xs text-gray-400 mb-2">Gemini API Key (Required for AI features in mobile build)</p>
              <div className="flex gap-2">
                <input 
                  type="password"
                  value={geminiKey}
                  onChange={e => setGeminiKey(e.target.value)}
                  placeholder="Enter your Gemini API Key"
                  className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-blue-500"
                />
                <button 
                  onClick={handleSaveGeminiKey}
                  className="bg-blue-600 text-white px-4 py-2 rounded-xl text-xs font-bold hover:bg-blue-700 transition-colors"
                >
                  Save
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <h4 className="text-[10px] font-bold text-gray-500 uppercase tracking-[0.2em] ml-2">Security</h4>
        <div className="bg-[#0A1227] rounded-3xl border border-white/5 overflow-hidden">
          <SettingsRow icon={Lock} label="PIN Lock" value={
            <button 
              onClick={() => setModalType('pin')}
              className="text-xs text-blue-500 font-bold"
            >
              {hasPin ? "Change PIN" : "Set PIN"}
            </button>
          } />
          <SettingsRow icon={Fingerprint} label="Biometric Unlock" value={
            <Toggle active={biometrics} onToggle={handleToggleBiometrics} />
          } />
        </div>
      </div>

      <div className="space-y-4">
        <h4 className="text-[10px] font-bold text-gray-500 uppercase tracking-[0.2em] ml-2">{t('preferences')}</h4>
        <div className="bg-[#0A1227] rounded-3xl border border-white/5 overflow-hidden relative">
          <SettingsRow icon={Globe} label={t('language')} value={
            <div className="flex items-center gap-2 text-gray-400">
              <select 
                className="bg-[#0A1227] text-sm font-medium focus:outline-none appearance-none text-right pr-6"
                onChange={(e) => changeLanguage(e.target.value)}
                value={i18n.language}
              >
                <option value="en">🇺🇸 English</option>
                <option value="te">🇮🇳 Telugu</option>
                <option value="hi">🇮🇳 Hindi</option>
                <option value="es">🇪🇸 Spanish</option>
                <option value="fr">🇫🇷 French</option>
                <option value="de">🇩🇪 German</option>
                <option value="zh">🇨🇳 Chinese</option>
                <option value="ja">🇯🇵 Japanese</option>
                <option value="ko">🇰🇷 Korean</option>
                <option value="ar">🇸🇦 Arabic</option>
                <option value="ru">🇷🇺 Russian</option>
                <option value="pt">🇵🇹 Portuguese</option>
                <option value="it">🇮🇹 Italian</option>
                <option value="tr">🇹🇷 Turkish</option>
                <option value="id">🇮🇩 Indonesian</option>
                <option value="th">🇹🇭 Thai</option>
                <option value="vi">🇻🇳 Vietnamese</option>
                <option value="bn">🇧🇩 Bengali</option>
                <option value="ur">🇵🇰 Urdu</option>
                <option value="ta">🇮🇳 Tamil</option>
                <option value="ml">🇮🇳 Malayalam</option>
                <option value="kn">🇮🇳 Kannada</option>
              </select>
              <ChevronRight className="w-4 h-4 absolute right-4 pointer-events-none" />
            </div>
          } />
        </div>
      </div>

      <div className="space-y-4">
        <h4 className="text-[10px] font-bold text-gray-500 uppercase tracking-[0.2em] ml-2">{t('notifications')}</h4>
        <div className="bg-[#0A1227] rounded-3xl border border-white/5 overflow-hidden">
          <SettingsRow icon={Bell} label={t('price_alerts')} value={
            <span className="text-[9px] bg-emerald-500/10 text-emerald-400 px-2 py-1 rounded font-bold">PERMANENT 24/7</span>
          } />
          <SettingsRow icon={LayoutDashboard} label={t('market_open_close')} value={
            <span className="text-[9px] bg-emerald-500/10 text-emerald-400 px-2 py-1 rounded font-bold">PERMANENT 24/7</span>
          } />
          <SettingsRow icon={MessageSquare} label={t('breaking_news')} value={
            <Toggle active={newsAlerts} onToggle={() => setNewsAlerts(!newsAlerts)} />
          } />
        </div>
      </div>

      <div className="space-y-4">
        <h4 className="text-[10px] font-bold text-gray-500 uppercase tracking-[0.2em] ml-2">{t('account')}</h4>
        <div className="bg-[#0A1227] rounded-3xl border border-white/5 overflow-hidden">
          <button onClick={() => setModalType('account')} className="w-full text-left">
            <SettingsRow icon={MessageSquare} label={t('email')} value={<span className="text-xs text-gray-500">{userEmail} <ChevronRight className="inline w-4 h-4" /></span>} />
          </button>
          <button onClick={() => setModalType('security')} className="w-full text-left">
            <SettingsRow icon={Shield} label={t('two_factor_auth')} value={<span className="text-xs text-gray-500">Enabled <ChevronRight className="inline w-4 h-4" /></span>} />
          </button>
          <button onClick={() => setModalType('security')} className="w-full text-left">
            <SettingsRow icon={Lock} label={t('change_password')} value={<ChevronRight className="w-5 h-5 text-gray-600" />} />
          </button>
        </div>
      </div>

      <div className="space-y-4">
        <h4 className="text-[10px] font-bold text-gray-500 uppercase tracking-[0.2em] ml-2">{t('data_privacy')}</h4>
        <div className="bg-[#0A1227] rounded-3xl border border-white/5 overflow-hidden">
          <button onClick={() => setModalType('data_usage')} className="w-full text-left">
            <SettingsRow icon={Database} label={t('data_usage')} value={<span className="text-xs text-gray-500">Optimized <ChevronRight className="inline w-4 h-4" /></span>} />
          </button>
          <button onClick={() => setModalType('privacy')} className="w-full text-left">
            <SettingsRow icon={Shield} label={t('privacy_policy')} value={<ChevronRight className="w-5 h-5 text-gray-600" />} />
          </button>
          <button onClick={() => setModalType('terms')} className="w-full text-left">
            <SettingsRow icon={Briefcase} label={t('terms_of_service')} value={<ChevronRight className="w-5 h-5 text-gray-600" />} />
          </button>
        </div>
      </div>

      <div className="space-y-4">
        <h4 className="text-[10px] font-bold text-gray-500 uppercase tracking-[0.2em] ml-2">Mobile App</h4>
        <div className="bg-[#0A1227] rounded-3xl border border-white/5 overflow-hidden p-4 space-y-4">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center flex-shrink-0">
              <Globe className="w-4 h-4 text-blue-500" />
            </div>
            <div>
              <p className="text-xs font-bold text-white mb-1">Install on any phone</p>
              <p className="text-[10px] text-gray-400 leading-relaxed">Open this URL in Chrome (Android) or Safari (iOS) and select "Add to Home Screen" for a full native experience.</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center flex-shrink-0">
              <Download className="w-4 h-4 text-emerald-500" />
            </div>
            <div className="flex-1">
              <p className="text-xs font-bold text-white mb-1">Build Native App</p>
              <p className="text-[10px] text-gray-400 leading-relaxed mb-3">Want a real APK or IPA file? Use our build guide to package this app for Android or iOS using VoltBuilder.</p>
              <button 
                onClick={() => setModalType('build_guide')}
                className="bg-emerald-500 text-white text-[10px] font-bold px-3 py-1.5 rounded-lg hover:bg-emerald-600 transition-colors"
              >
                View Build Guide
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <h4 className="text-[10px] font-bold text-gray-500 uppercase tracking-[0.2em] ml-2">{t('about')}</h4>
        <div className="bg-[#0A1227] rounded-3xl border border-white/5 overflow-hidden">
          <button onClick={() => setModalType('about')} className="w-full text-left">
            <SettingsRow icon={Bell} label={t('version')} value={<span className="text-xs text-gray-500">1.2.4 <ChevronRight className="inline w-4 h-4" /></span>} />
          </button>
          <button onClick={() => setModalType('rate')} className="w-full text-left active:scale-[0.98] transition-all">
            <SettingsRow icon={Star} label={t('rate_the_app')} value={<ChevronRight className="w-5 h-5 text-gray-600" />} />
          </button>
          <button onClick={() => setModalType('feedback')} className="w-full text-left active:scale-[0.98] transition-all">
            <SettingsRow icon={MessageSquare} label={t('send_feedback')} value={<ChevronRight className="w-5 h-5 text-gray-600" />} />
          </button>
        </div>
      </div>

      <button 
        onClick={onLogout}
        className="w-full bg-[#0A1227] border border-white/5 text-rose-500 font-bold py-5 rounded-3xl flex items-center justify-center gap-2 hover:bg-rose-500/5 transition-colors"
      >
        <LogOut className="w-5 h-5" />
        {t('sign_out')}
      </button>

      <button 
        onClick={handleDeleteAccount}
        className="w-full bg-rose-500/10 border border-rose-500/20 text-rose-500 font-bold py-4 rounded-2xl flex items-center justify-center gap-2 hover:bg-rose-500/20 transition-colors text-xs"
      >
        {t('delete_account')}
      </button>

      <div className="text-center space-y-1 opacity-30 pb-8">
        <p className="text-[10px] font-bold uppercase tracking-widest">StockAI Ultra v1.2.4</p>
        <p className="text-[10px]">AI-Powered Market Intelligence</p>
      </div>

      {modalType === 'pin' && (
        <PinSetupModal 
          onClose={() => setModalType(null)} 
          onSuccess={() => {
            setHasPin(true);
            setModalType(null);
          }} 
        />
      )}
    </div>
  );
}

function PinSetupModal({ onClose, onSuccess }: { onClose: () => void, onSuccess: () => void }) {
  const [step, setStep] = useState<'enter' | 'confirm'>('enter');
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [error, setError] = useState(false);

  const handlePinInput = async (digit: string) => {
    if (step === 'enter') {
      if (pin.length >= 4) return;
      const newPin = pin + digit;
      setPin(newPin);
      if (newPin.length === 4) {
        setTimeout(() => setStep('confirm'), 300);
      }
    } else {
      if (confirmPin.length >= 4) return;
      const newConfirm = confirmPin + digit;
      setConfirmPin(newConfirm);
      if (newConfirm.length === 4) {
        if (newConfirm === pin) {
          const res = await fetch(API_BASE + '/api/user/pin', {
            method: 'POST',
            headers: { 
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify({ pin: newConfirm })
          });
          if (res.ok) {
            const user = JSON.parse(localStorage.getItem('user') || '{}');
            user.hasPin = true;
            localStorage.setItem('user', JSON.stringify(user));
            onSuccess();
          }
        } else {
          setError(true);
          setTimeout(() => {
            setConfirmPin('');
            setError(false);
          }, 500);
        }
      }
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center p-6">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-[#0A1227] w-full max-w-xs rounded-[40px] border border-white/10 p-8 text-center space-y-8"
      >
        <div className="space-y-2">
          <h3 className="text-xl font-bold">{step === 'enter' ? "Set Security PIN" : "Confirm PIN"}</h3>
          <p className="text-gray-500 text-xs">Choose a 4-digit code to protect your account</p>
        </div>

        <div className="flex justify-center gap-4">
          {[0, 1, 2, 3].map(i => (
            <div 
              key={i} 
              className={cn(
                "w-3 h-3 rounded-full border-2 transition-all duration-200",
                (step === 'enter' ? pin.length : confirmPin.length) > i ? "bg-blue-500 border-blue-500 scale-110" : "border-white/10",
                error && "border-rose-500 bg-rose-500 animate-shake"
              )} 
            />
          ))}
        </div>

        <div className="grid grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9, '', 0, 'back'].map((val, i) => (
            <button 
              key={i}
              onClick={() => {
                if (val === 'back') {
                  if (step === 'enter') setPin(pin.slice(0, -1));
                  else setConfirmPin(confirmPin.slice(0, -1));
                } else if (val !== '') {
                  handlePinInput(val.toString());
                }
              }}
              className={cn(
                "w-14 h-14 rounded-full flex items-center justify-center text-lg font-bold transition-all active:scale-90",
                val === '' ? "invisible" : "bg-[#050A18] border border-white/5 hover:bg-white/5"
              )}
            >
              {val === 'back' ? <ChevronRight className="w-5 h-5 rotate-180 text-gray-500" /> : val}
            </button>
          ))}
        </div>

        <button 
          onClick={onClose}
          className="text-gray-500 text-sm font-medium hover:text-white"
        >
          Cancel
        </button>
      </motion.div>
    </div>
  );
}

function Modal({ type, onClose }: { type: string, onClose: () => void }) {
  const { t } = useTranslation();
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  
  const handlePasswordUpdate = async () => {
    if (!currentPassword || !newPassword) return;
    setLoading(true);
    try {
      const res = await fetch(API_BASE + '/api/user/password', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ currentPassword, newPassword })
      });
      if (res.ok) {
        setSubmitted(true);
        setTimeout(onClose, 1500);
      } else {
        const contentType = res.headers.get("content-type");
        if (contentType && contentType.includes("application/json")) {
          const data = await res.json();
          alert(data.error || 'Failed to update password');
        } else {
          alert('Failed to update password: Server error');
        }
      }
    } catch (e) {
      alert('An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitFeedback = () => {
    setLoading(true);
    setTimeout(() => {
      setSubmitted(true);
      setLoading(false);
      setTimeout(onClose, 1500);
    }, 400);
  };

  const ThankYou = ({ message }: { message: string }) => (
    <motion.div 
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      className="flex flex-col items-center justify-center py-12 space-y-4 text-center"
    >
      <div className="w-20 h-20 bg-emerald-500/20 rounded-full flex items-center justify-center">
        <CheckCircle className="w-10 h-10 text-emerald-500" />
      </div>
      <div className="space-y-2">
        <h3 className="text-2xl font-bold text-white">Thank You!</h3>
        <p className="text-gray-400">{message}</p>
      </div>
    </motion.div>
  );

  const content: Record<string, { title: string, body: React.ReactNode }> = {
    notifications: {
      title: t('notifications'),
      body: (
        <div className="space-y-4">
          <div className="space-y-3">
            {[
              { title: 'Market Alert', desc: 'S&P 500 reached a new all-time high.', time: '2m ago', icon: TrendingUp, color: 'text-emerald-400' },
              { title: 'Security Update', desc: 'Your password was successfully changed.', time: '1h ago', icon: Shield, color: 'text-blue-400' },
              { title: 'Portfolio Update', desc: 'TSLA is up 5.2% in the last 24 hours.', time: '3h ago', icon: Briefcase, color: 'text-emerald-400' },
              { title: 'System Message', desc: 'Welcome to StockAI Ultra v1.2.4!', time: '1d ago', icon: CheckCircle, color: 'text-indigo-400' },
            ].map((n, i) => (
              <div key={i} className="bg-white/5 p-4 rounded-2xl border border-white/5 flex gap-4 items-start">
                <div className={cn("p-2 rounded-xl bg-white/5", n.color)}>
                  <n.icon className="w-5 h-5" />
                </div>
                <div className="flex-1 space-y-1">
                  <div className="flex justify-between items-center">
                    <p className="text-sm font-bold">{n.title}</p>
                    <span className="text-[10px] text-gray-500">{n.time}</span>
                  </div>
                  <p className="text-xs text-gray-400 leading-relaxed">{n.desc}</p>
                </div>
              </div>
            ))}
          </div>
          <button onClick={onClose} className="w-full bg-white/5 py-4 rounded-xl font-bold text-sm border border-white/10">Mark all as read</button>
        </div>
      )
    },
    build_guide: {
      title: "Mobile Build Guide",
      body: <MobileBuildGuide onClose={onClose} />
    },
    account: {
      title: t('account'),
      body: (
        <div className="space-y-4">
          <p className="text-sm text-gray-400">Manage your account details and subscription status.</p>
          <div className="p-4 bg-white/5 rounded-2xl border border-white/5 space-y-2">
            <p className="text-xs text-gray-500 uppercase font-bold">Subscription</p>
            <p className="text-lg font-bold text-amber-500">Pro Lifetime Plan</p>
            <p className="text-[10px] text-gray-400">Active since March 2024</p>
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-gray-500 uppercase ml-1">Email Address</label>
            <input 
              type="email" 
              defaultValue={localStorage.getItem('user') ? JSON.parse(localStorage.getItem('user')!).email : ''}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-500"
            />
          </div>
          <button onClick={() => { alert('Email update request sent!'); onClose(); }} className="w-full bg-blue-600 py-4 rounded-xl font-bold text-sm shadow-lg shadow-blue-500/20">Update Email</button>
        </div>
      )
    },
    security: {
      title: t('security'),
      body: submitted ? <ThankYou message="Your password has been updated successfully." /> : (
        <div className="space-y-4">
          <p className="text-sm text-gray-400">Enhance your account security with 2FA and strong passwords.</p>
          <div className="space-y-3">
            <div className="p-4 bg-white/5 rounded-2xl border border-white/5 flex justify-between items-center">
              <div>
                <p className="text-sm font-bold">Two-Factor Auth</p>
                <p className="text-[10px] text-emerald-400">Enabled via Authenticator App</p>
              </div>
              <Toggle active={true} onToggle={() => alert('For security, 2FA can only be disabled via email verification.')} />
            </div>
            
            <div className="p-4 bg-white/5 rounded-2xl border border-white/5 space-y-3">
              <p className="text-sm font-bold">Change Password</p>
              <input 
                type="password" 
                placeholder="Current Password" 
                value={currentPassword}
                onChange={e => setCurrentPassword(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-blue-500" 
              />
              <input 
                type="password" 
                placeholder="New Password" 
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-blue-500" 
              />
              <button 
                onClick={handlePasswordUpdate} 
                disabled={loading}
                className="w-full bg-blue-600 py-2 rounded-xl font-bold text-xs disabled:opacity-50"
              >
                {loading ? 'Updating...' : 'Update Password'}
              </button>
            </div>

            <div className="p-4 bg-white/5 rounded-2xl border border-white/5 space-y-3">
              <p className="text-sm font-bold">Manage Devices</p>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-emerald-500 rounded-full" />
                    <span className="text-xs">iPhone 15 Pro (This device)</span>
                  </div>
                  <span className="text-[10px] text-gray-500">Active</span>
                </div>
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-gray-500 rounded-full" />
                    <span className="text-xs">MacBook Pro 16"</span>
                  </div>
                  <button className="text-[10px] text-rose-500 font-bold">Revoke</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )
    },
    feedback: {
      title: t('send_feedback'),
      body: submitted ? <ThankYou message="We appreciate your feedback!" /> : (
        <div className="space-y-4">
          <p className="text-sm text-gray-400">We'd love to hear your thoughts on how to improve StockAI Ultra.</p>
          <div className="flex justify-center gap-2 py-2">
            {[1, 2, 3, 4, 5].map((star) => (
              <button key={star} className="text-2xl hover:scale-110 transition-transform">⭐</button>
            ))}
          </div>
          <textarea 
            placeholder="Tell us what you think..."
            className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-sm h-32 focus:outline-none focus:border-blue-500"
          />
          <button 
            onClick={handleSubmitFeedback} 
            disabled={loading}
            className="w-full bg-blue-600 py-4 rounded-xl font-bold text-sm shadow-lg shadow-blue-500/20 disabled:opacity-50"
          >
            {loading ? 'Sending...' : 'Submit Feedback'}
          </button>
        </div>
      )
    },
    data_usage: {
      title: t('data_usage'),
      body: (
        <div className="space-y-4">
          <p className="text-sm text-gray-400">Control how the app consumes data and stores information.</p>
          <div className="space-y-2">
            <div className="flex justify-between text-xs">
              <span className="text-gray-500">Cache Size</span>
              <span>124 MB</span>
            </div>
            <div className="w-full bg-white/5 h-1.5 rounded-full overflow-hidden">
              <div className="bg-blue-500 h-full w-1/3" />
            </div>
          </div>
          <button className="w-full bg-rose-500/10 text-rose-500 py-3 rounded-xl font-bold text-sm border border-rose-500/20">Clear Cache</button>
        </div>
      )
    },
    privacy: {
      title: t('privacy_policy'),
      body: (
        <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 no-scrollbar">
          <p className="text-sm text-gray-400 leading-relaxed">
            At StockAI Ultra, your privacy is our top priority. We use end-to-end encryption for all your portfolio data and chat history.
            <br/><br/>
            1. We do not sell your data to third parties.
            <br/>
            2. AI analysis is performed locally where possible.
            <br/>
            3. Biometric data never leaves your device.
            <br/><br/>
            Our servers are located in secure facilities with 24/7 monitoring.
          </p>
        </div>
      )
    },
    terms: {
      title: t('terms_of_service'),
      body: (
        <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 no-scrollbar">
          <p className="text-sm text-gray-400 leading-relaxed">
            By using StockAI Ultra, you agree to our terms of service.
            <br/><br/>
            - The app is for informational purposes only.
            - We are not responsible for financial losses.
            - AI recommendations are not financial advice.
            - You must be 18+ to use trading features.
            <br/><br/>
            Trading stocks involves significant risk. Always consult with a professional advisor.
          </p>
        </div>
      )
    },
    rate: {
      title: t('rate_the_app'),
      body: submitted ? <ThankYou message="Thank you for rating us!" /> : (
        <div className="space-y-6 text-center">
          <div className="space-y-2">
            <p className="text-sm text-gray-400">How would you rate your experience with StockAI Ultra?</p>
            <div className="flex justify-center gap-3 py-4">
              {[1, 2, 3, 4, 5].map((star) => (
                <button key={star} className="text-4xl hover:scale-125 transition-transform">⭐</button>
              ))}
            </div>
          </div>
          <div className="space-y-3">
            <textarea 
              placeholder="What can we do better?"
              className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-sm h-24 focus:outline-none focus:border-blue-500"
            />
            <button 
              onClick={handleSubmitFeedback} 
              disabled={loading}
              className="w-full bg-blue-600 py-4 rounded-xl font-bold text-sm shadow-lg shadow-blue-500/20 disabled:opacity-50"
            >
              {loading ? 'Submitting...' : 'Submit Rating'}
            </button>
          </div>
        </div>
      )
    },
    about: {
      title: t('about'),
      body: (
        <div className="space-y-6 text-center">
          <div className="w-20 h-20 bg-blue-600 rounded-[32px] flex items-center justify-center mx-auto shadow-xl shadow-blue-500/20">
            <TrendingUp className="w-10 h-10 text-white" />
          </div>
          <div className="space-y-1">
            <h3 className="text-xl font-bold">StockAI Ultra</h3>
            <p className="text-xs text-gray-500 font-bold uppercase tracking-widest">Version 1.2.4 (Build 452)</p>
          </div>
          <p className="text-sm text-gray-400 leading-relaxed">
            The world's most advanced AI-powered stock intelligence platform. Built for traders who demand precision and speed.
          </p>
          <div className="pt-4 border-t border-white/5 flex justify-center gap-6">
            <span className="text-[10px] text-gray-600 font-bold uppercase">© 2026 StockAI Inc.</span>
          </div>
        </div>
      )
    }
  };

  const current = content[type] || { title: 'Info', body: null };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex items-end justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <motion.div 
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        transition={{ type: "spring", damping: 25, stiffness: 200 }}
        className="w-full max-w-md bg-[#0A1227] rounded-t-[40px] border-t border-white/10 p-8 space-y-6"
        onClick={e => e.stopPropagation()}
      >
        <div className="w-12 h-1.5 bg-white/10 rounded-full mx-auto mb-2" />
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold">{current.title}</h2>
          <button onClick={onClose} className="p-2 bg-white/5 rounded-full text-gray-500">
            <Plus className="w-5 h-5 rotate-45" />
          </button>
        </div>
        <div className="pb-8">
          {current.body}
        </div>
      </motion.div>
    </motion.div>
  );
}

// --- UI Components ---

function NavButton({ icon: Icon, label, active, onClick }: { icon: any, label: string, active: boolean, onClick: () => void }) {
  return (
    <button 
      onClick={onClick}
      className={cn(
        "flex flex-col items-center gap-1 transition-all relative z-10",
        active ? "text-blue-500 scale-110" : "text-gray-500 hover:text-gray-300"
      )}
    >
      <Icon className={cn("w-6 h-6", active && "fill-blue-500/10")} />
      <span className="text-[10px] font-medium">{label}</span>
    </button>
  );
}

interface StockRowProps {
  symbol: string;
  price: number;
  change: number;
  key?: string | number;
  onClick?: () => void;
  onRemove?: () => void;
  isAdded?: boolean;
  hideAddButton?: boolean;
}

function StockRow({ symbol, price, change, onClick, onRemove, hideAddButton = false }: StockRowProps) {
  const isPositive = change >= 0;
  const initials = (symbol || "").slice(0, 2);
  const watchlistCtx = useContext(WatchlistContext);
  
  const { watchlist, addToWatchlist, removeFromWatchlist, setModalType } = watchlistCtx;
  const isAdded = watchlist.some(s => s.symbol === symbol);
  const [isProcessing, setIsProcessing] = useState(false);

  const toggleWatchlist = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!localStorage.getItem('token')) {
      setModalType('login');
      return;
    }
    if (isProcessing) return;
    setIsProcessing(true);
    try {
      if (isAdded) {
        await removeFromWatchlist(symbol);
      } else {
        await addToWatchlist(symbol, price);
      }
    } catch (e) {
      console.error("Watchlist error:", e);
    } finally {
      setIsProcessing(false);
    }
  };
  
  // Generate a consistent color based on symbol
  const colors = [
    'bg-emerald-500/20 text-emerald-400',
    'bg-blue-500/20 text-blue-400',
    'bg-rose-500/20 text-rose-400',
    'bg-amber-500/20 text-amber-400',
    'bg-indigo-500/20 text-indigo-400',
    'bg-purple-500/20 text-purple-400'
  ];
  const colorIndex = symbol.charCodeAt(0) % colors.length;
  const colorClass = colors[colorIndex];

  const handleRemoveClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onRemove) onRemove();
  };

  return (
    <div 
      onClick={onClick}
      className="bg-[#0A1227] p-4 rounded-2xl border border-white/5 flex justify-between items-center hover:bg-white/5 transition-colors cursor-pointer group"
    >
      <div className="flex items-center gap-3">
        <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center font-bold text-xs", colorClass)}>
          {initials}
        </div>
        <div>
          <div className="flex items-center gap-2">
            <p className="font-bold">{symbol}</p>
            {!hideAddButton && (
              <button 
                onClick={toggleWatchlist}
                disabled={isProcessing}
                className={cn(
                  "p-2.5 -m-1 rounded-xl transition-all shadow-lg active:scale-90",
                  isAdded ? "text-emerald-400 bg-emerald-500/20 border border-emerald-500/20" : "text-blue-400 bg-blue-500/10 border border-blue-500/20 hover:bg-blue-500/20",
                  isProcessing && "opacity-50"
                )}
              >
                {isAdded ? <CheckCircle className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
              </button>
            )}
            {onRemove && (
              <button 
                onClick={handleRemoveClick}
                className="p-2.5 -m-1 rounded-xl text-rose-400 bg-rose-500/10 border border-rose-500/20 hover:bg-rose-500/20 transition-all active:scale-90"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
          <p className="text-gray-500 text-[10px]">
            {ALL_STOCKS_DATA.find(s => s.symbol === symbol)?.name || 'Company Name'}
          </p>
        </div>
      </div>
      <div className="text-right">
        <p className="font-bold">${price.toLocaleString()}</p>
        <div className={cn("flex items-center justify-end gap-1 text-[10px] font-bold", isPositive ? "text-emerald-400" : "text-rose-400")}>
          {isPositive ? '▲' : '▼'} {Math.abs(change).toFixed(2)}%
        </div>
      </div>
    </div>
  );
}

function SettingsRow({ icon: Icon, label, value }: { icon: any, label: string, value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between p-4 border-b border-white/5 last:border-0">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 bg-white/5 rounded-lg flex items-center justify-center">
          <Icon className="w-4 h-4 text-gray-400" />
        </div>
        <span className="text-sm font-medium">{label}</span>
      </div>
      <div>{value}</div>
    </div>
  );
}

function Toggle({ active, onToggle }: { active: boolean, onToggle: () => void }) {
  return (
    <button 
      onClick={onToggle}
      className={cn(
        "w-10 h-5 rounded-full relative transition-colors",
        active ? "bg-blue-600" : "bg-gray-700"
      )}
    >
      <div className={cn(
        "absolute top-1 w-3 h-3 bg-white rounded-full transition-all",
        active ? "right-1" : "left-1"
      )} />
    </button>
  );
}

function MobileBuildGuide({ onClose }: { onClose: () => void }) {
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState('');

  const generateTutorialVideo = async () => {
    if (!(window as any).aistudio) return;
    
    const hasKey = await (window as any).aistudio.hasSelectedApiKey();
    if (!hasKey) {
      await (window as any).aistudio.openSelectKey();
      return;
    }

    setLoading(true);
    setStatus('Initializing AI Video Engine...');
    
    try {
      const ai = new GoogleGenAI({ apiKey: (process.env as any).API_KEY });
      let operation = await ai.models.generateVideos({
        model: 'veo-3.1-fast-generate-preview',
        prompt: 'A professional 3D animation showing a folder being zipped, uploaded to a cloud platform called VoltBuilder, and transforming into a mobile app icon on a smartphone screen. Clean, tech-focused aesthetic.',
        config: {
          numberOfVideos: 1,
          resolution: '720p',
          aspectRatio: '16:9'
        }
      });

      setStatus('Generating tutorial video (this may take a minute)...');
      
      while (!operation.done) {
        await new Promise(resolve => setTimeout(resolve, 5000));
        operation = await ai.operations.getVideosOperation({ operation: operation });
      }

      const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
      if (downloadLink) {
        const response = await fetch(downloadLink, {
          method: 'GET',
          headers: {
            'x-goog-api-key': (process.env as any).API_KEY,
          },
        });
        const blob = await response.blob();
        setVideoUrl(URL.createObjectURL(blob));
      }
    } catch (e) {
      console.error(e);
      setStatus('Failed to generate video. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-blue-600/10 border border-blue-500/20 rounded-2xl p-4 space-y-3">
        <div className="flex items-center gap-2 text-blue-400">
          <Video className="w-5 h-5" />
          <span className="text-sm font-bold uppercase tracking-wider">AI Tutorial Video</span>
        </div>
        
        {videoUrl ? (
          <video src={videoUrl} controls className="w-full rounded-xl shadow-lg" />
        ) : (
          <div className="aspect-video bg-[#050A18] rounded-xl flex flex-col items-center justify-center p-6 text-center space-y-4">
            {loading ? (
              <>
                <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
                <p className="text-xs text-gray-400 animate-pulse">{status}</p>
              </>
            ) : (
              <>
                <div className="w-16 h-16 bg-blue-500/10 rounded-full flex items-center justify-center">
                  <Video className="w-8 h-8 text-blue-500" />
                </div>
                <div className="space-y-2">
                  <p className="text-sm font-medium">Generate AI Visual Guide</p>
                  <p className="text-[10px] text-gray-500">See the step-by-step process visualized by AI</p>
                </div>
                <button 
                  onClick={generateTutorialVideo}
                  className="bg-blue-600 text-white text-xs font-bold px-6 py-3 rounded-xl hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/20"
                >
                  Generate Video
                </button>
              </>
            )}
          </div>
        )}
      </div>

      <div className="space-y-4">
        <h4 className="text-sm font-bold text-white">How to use VoltBuilder</h4>
        <div className="space-y-4">
          <Step number="1" title="Prepare your files" description="Download your project source code and ensure you have an index.html in the root." />
          <Step number="2" title="Create a ZIP" description="Compress all project files into a single .zip archive." />
          <Step number="3" title="Upload to VoltBuilder" description="Go to volt.build/upload and drag your ZIP file onto the Android or iOS icon." />
          <Step number="4" title="Download & Install" description="Wait for the build to finish, then download the resulting APK (Android) or IPA (iOS) file." />
        </div>
      </div>

      <div className="pt-4">
        <a 
          href="https://volt.build/upload/" 
          target="_blank" 
          rel="noopener noreferrer"
          className="w-full bg-white/5 hover:bg-white/10 text-white font-bold py-4 rounded-2xl transition-all border border-white/5 flex items-center justify-center gap-2"
        >
          Go to VoltBuilder <ExternalLink className="w-4 h-4" />
        </a>
      </div>
    </div>
  );
}

function Step({ number, title, description }: { number: string, title: string, description: string }) {
  return (
    <div className="flex gap-4">
      <div className="w-8 h-8 rounded-full bg-blue-600/20 border border-blue-500/20 flex items-center justify-center flex-shrink-0 text-blue-400 font-bold text-sm">
        {number}
      </div>
      <div className="space-y-1">
        <p className="text-sm font-bold text-white">{title}</p>
        <p className="text-xs text-gray-400 leading-relaxed">{description}</p>
      </div>
    </div>
  );
}
