import express from "express";
import cors from "cors";
import { createServer } from "http";
import { Server } from "socket.io";
import { createServer as createViteServer } from "vite";
import path from "path";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import Database from "better-sqlite3";
import dotenv from "dotenv";
import YahooFinance from 'yahoo-finance2';

dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET || "stockai-ultra-secret-key-2024";
const yahooFinance = new YahooFinance();
const db = new Database("stockai.db");
db.pragma('foreign_keys = ON');

// Initialize Database
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE,
    password TEXT,
    pin TEXT,
    biometrics_enabled INTEGER DEFAULT 0,
    language TEXT DEFAULT 'en',
    theme TEXT DEFAULT 'dark'
  );

  CREATE TABLE IF NOT EXISTS portfolio (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    symbol TEXT,
    quantity REAL,
    buy_price REAL,
    FOREIGN KEY(user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS chat_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    role TEXT,
    content TEXT,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES users(id)
  );
`);

async function startServer() {
  const app = express();
  app.use(cors());
  const httpServer = createServer(app);
  const io = new Server(httpServer, {
    cors: { origin: "*" }
  });

  const PORT = 3000;

  app.use(express.json());

  // Logging middleware
  app.use((req, res, next) => {
    console.log(`${req.method} ${req.url}`);
    next();
  });

  // --- Auth Middleware ---
  const authenticateToken = (req: any, res: any, next: any) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) return res.sendStatus(401);

    jwt.verify(token, JWT_SECRET, (err: any, user: any) => {
      if (err) return res.sendStatus(403);
      
      try {
        const dbUser = db.prepare("SELECT id FROM users WHERE id = ?").get(user.id);
        if (!dbUser) {
          return res.status(401).json({ error: "User not found" });
        }
      } catch (e) {
        return res.status(500).json({ error: "Database error" });
      }

      req.user = user;
      next();
    });
  };

  // --- API Routes ---
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", time: new Date().toISOString() });
  });

  // Auth
  app.post("/api/auth/signup", async (req, res) => {
    const { email, password } = req.body;
    try {
      const hashedPassword = await bcrypt.hash(password, 10);
      const stmt = db.prepare("INSERT INTO users (email, password) VALUES (?, ?)");
      const info = stmt.run(email, hashedPassword);
      res.status(201).json({ id: info.lastInsertRowid });
    } catch (e) {
      res.status(400).json({ error: "Email already exists" });
    }
  });

  app.post("/api/auth/login", async (req, res) => {
    const { email, password } = req.body;
    try {
      const user: any = db.prepare("SELECT * FROM users WHERE email = ?").get(email);
      if (!user || !(await bcrypt.compare(password, user.password))) {
        return res.status(401).json({ error: "Invalid credentials" });
      }
      const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET);
      res.json({ 
        token, 
        user: { 
          id: user.id, 
          email: user.email, 
          language: user.language, 
          theme: user.theme,
          hasPin: !!user.pin,
          biometrics_enabled: !!user.biometrics_enabled
        } 
      });
    } catch (e) {
      res.status(500).json({ error: "Login failed" });
    }
  });

  // Portfolio
  app.get("/api/portfolio", authenticateToken, (req: any, res) => {
    try {
      const stocks = db.prepare("SELECT * FROM portfolio WHERE user_id = ?").all(req.user.id);
      res.json(stocks);
    } catch (e) {
      res.status(500).json({ error: "Failed to fetch portfolio" });
    }
  });

  app.post("/api/portfolio", authenticateToken, (req: any, res) => {
    const { symbol, quantity, buy_price } = req.body;
    try {
      console.log(`Adding stock to portfolio: ${symbol} for user ${req.user.id}`);
      const existing = db.prepare("SELECT * FROM portfolio WHERE user_id = ? AND symbol = ?").get(req.user.id, symbol);
      if (existing) {
        return res.status(400).json({ error: "Stock already in watchlist" });
      }
      const stmt = db.prepare("INSERT INTO portfolio (user_id, symbol, quantity, buy_price) VALUES (?, ?, ?, ?)");
      stmt.run(req.user.id, symbol, quantity, buy_price);
      res.sendStatus(201);
    } catch (e) {
      console.error("Portfolio POST error:", e);
      res.status(500).json({ error: "Failed to add to watchlist" });
    }
  });

  app.delete("/api/portfolio/:symbol", authenticateToken, (req: any, res) => {
    const { symbol } = req.params;
    try {
      db.prepare("DELETE FROM portfolio WHERE user_id = ? AND symbol = ?").run(req.user.id, symbol);
      res.sendStatus(200);
    } catch (e) {
      res.status(500).json({ error: "Failed to remove from watchlist" });
    }
  });

  // User Settings
  app.get("/api/user/settings", authenticateToken, (req: any, res) => {
    const settings: any = db.prepare("SELECT language, theme, biometrics_enabled, pin FROM users WHERE id = ?").get(req.user.id);
    if (!settings) {
      return res.status(401).json({ error: "User not found" });
    }
    res.json({
      ...settings,
      hasPin: !!settings.pin
    });
  });

  app.post("/api/user/settings", authenticateToken, (req: any, res) => {
    const { language, theme, biometrics_enabled } = req.body;
    try {
      db.prepare("UPDATE users SET language = ?, theme = ?, biometrics_enabled = ? WHERE id = ?")
        .run(language, theme, biometrics_enabled ? 1 : 0, req.user.id);
      res.sendStatus(200);
    } catch (e) {
      res.status(500).json({ error: "Failed to update settings" });
    }
  });

  app.post("/api/user/pin", authenticateToken, (req: any, res) => {
    const { pin } = req.body;
    try {
      db.prepare("UPDATE users SET pin = ? WHERE id = ?").run(pin, req.user.id);
      res.sendStatus(200);
    } catch (e) {
      res.status(500).json({ error: "Failed to update PIN" });
    }
  });

  app.post("/api/user/verify-pin", authenticateToken, (req: any, res) => {
    const { pin } = req.body;
    const user: any = db.prepare("SELECT pin FROM users WHERE id = ?").get(req.user.id);
    if (user && user.pin === pin) {
      res.json({ success: true });
    } else {
      res.status(401).json({ error: "Invalid PIN" });
    }
  });

  app.post("/api/user/password", authenticateToken, async (req: any, res) => {
    const { currentPassword, newPassword } = req.body;
    try {
      const user: any = db.prepare("SELECT * FROM users WHERE id = ?").get(req.user.id);
      if (!user || !(await bcrypt.compare(currentPassword, user.password))) {
        return res.status(401).json({ error: "Invalid current password" });
      }
      const hashedNewPassword = await bcrypt.hash(newPassword, 10);
      db.prepare("UPDATE users SET password = ? WHERE id = ?").run(hashedNewPassword, req.user.id);
      res.sendStatus(200);
    } catch (e) {
      res.status(500).json({ error: "Failed to update password" });
    }
  });

  app.delete("/api/user", authenticateToken, (req: any, res) => {
    try {
      const userId = req.user.id;
      // Use a transaction to ensure all data is deleted
      const deleteUser = db.transaction((id) => {
        db.prepare("DELETE FROM portfolio WHERE user_id = ?").run(id);
        db.prepare("DELETE FROM chat_history WHERE user_id = ?").run(id);
        db.prepare("DELETE FROM users WHERE id = ?").run(id);
      });
      deleteUser(userId);
      res.sendStatus(200);
    } catch (e) {
      res.status(500).json({ error: "Failed to delete account" });
    }
  });

  // Prices API
  app.get("/api/prices", (req, res) => {
    res.json(stockPrices);
  });

  // News API
  app.get("/api/news", (req, res) => {
    const symbol = req.query.symbol as string;
    res.json(generateNews(symbol));
  });

  // Catch-all for API routes to prevent falling through to Vite
  app.all("/api/*", (req, res) => {
    res.status(404).json({ error: `API route not found: ${req.method} ${req.url}` });
  });

  // --- Real-time Stock Data ---
  const SYMBOL_MAP: Record<string, string> = {
    SPX: "^GSPC",
    IXIC: "^IXIC",
    DJI: "^DJI",
    BTC: "BTC-USD",
    ETH: "ETH-USD",
    XLF: "XLF",
    // India
    RELIANCE: "RELIANCE.NS",
    TCS: "TCS.NS",
    INFY: "INFY.NS",
    HDFCBANK: "HDFCBANK.NS",
    // UK
    HSBC: "HSBA.L",
    BP: "BP.L",
    VOD: "VOD.L",
    AZN: "AZN.L"
  };

  const STOCKS = [
    "AAPL", "TSLA", "GOOGL", "AMZN", "MSFT", "NVDA", "META", "BTC", "ETH", "NFLX", 
    "DIS", "PYPL", "ADBE", "INTC", "AMD", "ORCL", "CRM", "UBER", "ABNB", "COIN", 
    "HOOD", "SQ", "SHOP", "SPOT", "ZM", "SPX", "IXIC", "DJI", "PLTR", "SNOW", 
    "TSM", "BABA", "NIO", "XPEV", "LI", "MSTR", "MARA", "RIOT", "CLSK", "HUT",
    "WMT", "COST", "TGT", "HD", "LOW", "NKE", "SBUX", "MCD", "KO", "PEP", "XLF",
    "RELIANCE", "TCS", "INFY", "HDFCBANK", "HSBC", "BP", "VOD", "AZN"
  ];

  const stockPrices: Record<string, number> = {
    AAPL: 185.92, TSLA: 175.34, GOOGL: 142.12, AMZN: 178.22, MSFT: 415.10, NVDA: 875.23, META: 490.22, BTC: 65000, ETH: 3500,
    NFLX: 605.20, DIS: 112.45, PYPL: 64.32, ADBE: 520.11, INTC: 42.50, AMD: 180.45, ORCL: 125.30, CRM: 305.20, UBER: 78.45,
    ABNB: 155.20, COIN: 245.30, HOOD: 18.45, SQ: 72.10, SHOP: 75.40, SPOT: 260.10, ZM: 65.20,
    PLTR: 24.50, SNOW: 165.30, TSM: 145.20, BABA: 72.45, NIO: 5.80, XPEV: 8.45, LI: 28.30,
    MSTR: 1450.20, MARA: 22.45, RIOT: 12.30, CLSK: 18.45, HUT: 10.20,
    WMT: 60.45, COST: 725.30, TGT: 168.45, HD: 345.20, LOW: 235.10,
    NKE: 92.45, SBUX: 88.30, MCD: 282.10, KO: 60.20, PEP: 168.45,
    SPX: 5847.23, IXIC: 20891.54, DJI: 43524.12, XLF: 45.32,
    RELIANCE: 2985.40, TCS: 4120.15, INFY: 1645.30, HDFCBANK: 1450.20,
    HSBC: 650.40, BP: 485.20, VOD: 72.15, AZN: 10540.00
  };

  const generateNews = (symbol?: string) => {
    const sources = ["Bloomberg", "Reuters", "CNBC", "Financial Times", "Wall Street Journal"];
    const templates = [
      "{symbol} shares surge as quarterly earnings beat expectations.",
      "Analysts upgrade {symbol} to 'Strong Buy' following recent market performance.",
      "New regulatory changes could impact {symbol}'s operations in the coming months.",
      "{symbol} announces strategic partnership to expand its global footprint.",
      "Investors remain cautious as {symbol} faces increased competition in the sector.",
      "Market volatility affects {symbol} and other major technology stocks.",
      "{symbol} CEO remains optimistic about future growth despite economic headwinds.",
      "Recent data suggests a shift in consumer behavior impacting {symbol}'s revenue."
    ];

    const count = symbol ? 5 : 10;
    const news = [];
    const symbols = symbol ? [symbol] : STOCKS.filter(s => !['SPX', 'IXIC', 'DJI'].includes(s));

    for (let i = 0; i < count; i++) {
      const s = symbols[Math.floor(Math.random() * symbols.length)];
      const template = templates[Math.floor(Math.random() * templates.length)];
      const now = new Date();
      const timeStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`;
      
      news.push({
        id: Math.random().toString(36).substr(2, 9),
        title: template.replace(/{symbol}/g, s),
        source: sources[Math.floor(Math.random() * sources.length)],
        date: timeStr,
        timestamp: now.getTime(),
        symbol: s
      });
    }
    return news;
  };

  // Fetch real data every 30 seconds
  const fetchRealData = async () => {
    try {
      const symbolsToFetch = STOCKS.map(s => SYMBOL_MAP[s] || s);
      const quotes = await yahooFinance.quote(symbolsToFetch) as any[];
      
      quotes.forEach(quote => {
        const originalSymbol = Object.keys(SYMBOL_MAP).find(key => SYMBOL_MAP[key] === quote.symbol) || quote.symbol;
        if (quote.regularMarketPrice) {
          stockPrices[originalSymbol] = quote.regularMarketPrice;
        } else {
          console.warn(`No price for ${quote.symbol}`);
        }
      });
      console.log("Updated stock prices with real data. XLF price:", stockPrices['XLF']);
    } catch (error) {
      console.error("Failed to fetch real stock data:", error);
    }
  };

  // Initial fetch
  fetchRealData();
  // Refresh every 30 seconds
  setInterval(fetchRealData, 30000);

  // Emit updates every second with small random fluctuations for "live" feel
  setInterval(() => {
    Object.keys(stockPrices).forEach(symbol => {
      // Very small fluctuation (0.01%) to keep UI active between real fetches
      const fluctuation = (Math.random() - 0.5) * (stockPrices[symbol] * 0.0002);
      stockPrices[symbol] = parseFloat((stockPrices[symbol] + fluctuation).toFixed(2));
    });
    io.emit("stock_update", stockPrices);
    if (Math.random() > 0.9) {
      io.emit("news_update", generateNews()[0]);
    }
  }, 1000);

  // --- Vite Middleware ---
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true, hmr: false },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.resolve(__dirname, "dist", "index.html"));
    });
  }

  httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
