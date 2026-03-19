import { GoogleGenAI } from "@google/genai";

const getApiKey = () => {
  if (typeof localStorage !== 'undefined') {
    const storedKey = localStorage.getItem('GEMINI_API_KEY');
    if (storedKey) return storedKey;
  }
  return process.env.GEMINI_API_KEY || "";
};

const ai = new GoogleGenAI({ apiKey: getApiKey() });

// Cooldown mechanism to prevent hitting API when quota is exhausted
let cooldownUntil = 0;
const COOLDOWN_DURATION = 60000; // 1 minute cooldown after 429

// Simple cache for stock analysis to reduce API calls
const analysisCache: Record<string, { data: any, timestamp: number }> = {};
const CACHE_DURATION = 300000; // 5 minutes cache

function isCooldownActive() {
  return Date.now() < cooldownUntil;
}

function setCooldown() {
  cooldownUntil = Date.now() + COOLDOWN_DURATION;
}

function checkRateLimit(error: any) {
  const isRateLimit = 
    error?.status === "RESOURCE_EXHAUSTED" || 
    error?.code === 429 ||
    error?.error?.status === "RESOURCE_EXHAUSTED" ||
    error?.error?.code === 429 ||
    (error?.message && (
      error.message.includes("429") || 
      error.message.includes("RESOURCE_EXHAUSTED") ||
      error.message.includes("quota")
    ));
  
  if (isRateLimit) {
    setCooldown();
  }
  return isRateLimit;
}

export async function generateLiveNews(symbols: string[]) {
  if (isCooldownActive()) {
    return symbols.slice(0, 3).map(symbol => ({
      title: `${symbol} remains stable as market awaits further economic indicators.`,
      symbol: symbol,
      source: "MarketWatch",
      impact: "neutral"
    }));
  }

  try {
    const prompt = `Generate 5 short, realistic, and urgent financial news headlines for the following stocks: ${symbols.join(", ")}. 
    The headlines should sound like they are from a live trading floor. 
    Format the output as a JSON array of objects with the following structure:
    [
      { "title": "Headline text", "symbol": "STOCK_SYMBOL", "source": "News Source (e.g., Bloomberg, Reuters)", "impact": "positive|negative|neutral" }
    ]
    Keep headlines under 80 characters.`;

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
      }
    });

    const text = response.text;
    if (text) {
      return JSON.parse(text);
    }
    return [];
  } catch (error: any) {
    if (checkRateLimit(error)) {
      console.warn("Gemini API rate limit reached. Using fallback news data.");
      return symbols.slice(0, 3).map(symbol => ({
        title: `${symbol} shows strong resistance at current levels amid market volatility.`,
        symbol: symbol,
        source: "MarketWatch",
        impact: "neutral"
      }));
    }
    console.error("Failed to generate live news with Gemini:", error);
    return [];
  }
}

export async function chatWithAI(query: string) {
  if (isCooldownActive()) {
    return { 
      recommendation: "Info", 
      confidence: 50, 
      summary: "I'm currently resting to stay within my limits.", 
      explanation: "I've received a lot of questions recently. Please wait about a minute before asking another detailed question. I'll be back soon!", 
      disclaimer: "Not financial advice." 
    };
  }

  try {
    const prompt = `You are a helpful AI stock trading assistant. Respond to the user's query: "${query}".
    Provide a detailed and informative response. If the user is asking about a stock, provide comprehensive analysis. If it's a general question, give a thorough and friendly answer.
    Format the response strictly as a JSON object with the following structure:
    { 
      "recommendation": "Buy" | "Sell" | "Hold" | "Info", 
      "confidence": number (0-100, representing your confidence in the answer, use 90-100 for general chat), 
      "summary": "A clear, informative summary (1-2 sentences)", 
      "explanation": "A detailed, comprehensive explanation providing lots of useful information", 
      "disclaimer": "Standard financial disclaimer" 
    }`;

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
      }
    });

    const text = response.text;
    if (text) {
      return JSON.parse(text);
    }
    return { recommendation: "Info", confidence: 0, summary: "Unable to respond at this time.", explanation: "No data available.", disclaimer: "Not financial advice." };
  } catch (error: any) {
    if (checkRateLimit(error)) {
      return { 
        recommendation: "Info", 
        confidence: 50, 
        summary: "My quota has been temporarily reached.", 
        explanation: "I've been very busy helping other traders! I need to take a short break (about 60 seconds) before I can provide more detailed analysis. Thank you for your patience.", 
        disclaimer: "Not financial advice." 
      };
    }
    console.error("Failed to chat with Gemini:", error);
    return { recommendation: "Info", confidence: 0, summary: "Chat failed due to an error.", explanation: "Please try again.", disclaimer: "Not financial advice." };
  }
}

export async function analyzeStock(symbol: string, context: string) {
  // Check cache first
  const cached = analysisCache[symbol];
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return cached.data;
  }

  if (isCooldownActive()) {
    return { 
      recommendation: "Hold", 
      confidence: 50,
      summary: `Analysis for ${symbol} is temporarily paused.`,
      explanation: "I'm currently managing a high volume of requests. I'll be able to provide a fresh analysis for you in about a minute.",
      disclaimer: "Not financial advice. Data may be delayed."
    };
  }

  try {
    const prompt = `Analyze the stock ${symbol} based on the following context: ${context}. 
    Provide a concise summary of the sentiment and potential outlook. 
    Format the response as a JSON object: { "recommendation": "Buy|Sell|Hold", "confidence": number (0-100), "summary": "Short summary text", "explanation": "Detailed explanation text", "disclaimer": "Standard financial disclaimer" }`;

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
      }
    });

    const text = response.text;
    if (text) {
      const data = JSON.parse(text);
      // Save to cache
      analysisCache[symbol] = { data, timestamp: Date.now() };
      return data;
    }
    return { recommendation: "Hold", confidence: 50, summary: "Unable to analyze at this time.", explanation: "No data available.", disclaimer: "Not financial advice." };
  } catch (error: any) {
    if (checkRateLimit(error)) {
      console.warn("Gemini API rate limit reached for analysis. Using fallback.");
      return { 
        recommendation: "Hold", 
        confidence: 50,
        summary: `Analysis for ${symbol} is currently unavailable due to high demand.`,
        explanation: `Technical indicators suggest consolidation. I'm currently on a short cooldown to stay within my limits. Please try again in a minute.`,
        disclaimer: "Not financial advice. Data may be delayed."
      };
    }
    console.error("Failed to analyze stock with Gemini:", error);
    return { recommendation: "Hold", confidence: 0, summary: "Analysis failed due to an error.", explanation: "Please try again.", disclaimer: "Not financial advice." };
  }
}
