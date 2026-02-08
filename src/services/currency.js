/**
 * Currency exchange rate service.
 *
 * Fetches live rates from the free frankfurter.app API (ECB data).
 * Falls back to bundled static rates if the API is unreachable.
 * Caches rates for 1 hour in localStorage.
 */

const CACHE_KEY = "opencost-exchange-rates";
const CACHE_TTL = 60 * 60 * 1000; // 1 hour
const API_BASE = "https://api.frankfurter.app";

// Fallback rates (approximate, USD-based) used when offline
export const FALLBACK_RATES = {
  USD: 1,
  EUR: 0.92,
  GBP: 0.79,
  JPY: 149.5,
  CAD: 1.36,
  AUD: 1.55,
  CHF: 0.88,
  CNY: 7.24,
  INR: 83.1,
  KRW: 1330,
  BRL: 4.97,
  MXN: 17.15,
  SGD: 1.34,
  HKD: 7.82,
  SEK: 10.45,
  NOK: 10.62,
  NZD: 1.63,
  ZAR: 18.65,
};

/**
 * All supported currencies with metadata.
 * INR is placed 3rd for easy access per user preference.
 */
export const CURRENCY_OPTIONS = [
  { code: "USD", symbol: "$", name: "US Dollar" },
  { code: "INR", symbol: "₹", name: "Indian Rupee" },
  { code: "EUR", symbol: "€", name: "Euro" },
  { code: "GBP", symbol: "£", name: "British Pound" },
  { code: "JPY", symbol: "¥", name: "Japanese Yen" },
  { code: "CAD", symbol: "CA$", name: "Canadian Dollar" },
  { code: "AUD", symbol: "A$", name: "Australian Dollar" },
  { code: "CHF", symbol: "CHF", name: "Swiss Franc" },
  { code: "CNY", symbol: "¥", name: "Chinese Yuan" },
  { code: "KRW", symbol: "₩", name: "Korean Won" },
  { code: "BRL", symbol: "R$", name: "Brazilian Real" },
  { code: "MXN", symbol: "MX$", name: "Mexican Peso" },
  { code: "SGD", symbol: "S$", name: "Singapore Dollar" },
  { code: "HKD", symbol: "HK$", name: "Hong Kong Dollar" },
  { code: "SEK", symbol: "kr", name: "Swedish Krona" },
  { code: "NOK", symbol: "kr", name: "Norwegian Krone" },
  { code: "NZD", symbol: "NZ$", name: "New Zealand Dollar" },
  { code: "ZAR", symbol: "R", name: "South African Rand" },
];

/**
 * Try to load cached rates from localStorage.
 * Returns null if cache is missing or expired.
 */
function loadCachedRates() {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const { rates, timestamp } = JSON.parse(raw);
    if (Date.now() - timestamp > CACHE_TTL) return null;
    return rates;
  } catch {
    return null;
  }
}

/**
 * Save rates to localStorage cache.
 */
function cacheRates(rates) {
  try {
    localStorage.setItem(
      CACHE_KEY,
      JSON.stringify({ rates, timestamp: Date.now() }),
    );
  } catch {
    // Storage full or unavailable — silently ignore
  }
}

/**
 * Fetch live exchange rates from frankfurter.app (ECB data, free, no key).
 * Returns rates object keyed by currency code, values relative to USD.
 */
async function fetchLiveRates() {
  const codes = CURRENCY_OPTIONS.map((c) => c.code)
    .filter((c) => c !== "USD")
    .join(",");

  const res = await fetch(`${API_BASE}/latest?from=USD&to=${codes}`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);

  const data = await res.json();
  // data.rates is { EUR: 0.92, GBP: 0.79, ... }
  return { USD: 1, ...data.rates };
}

/**
 * Get exchange rates — tries cache first, then live API, then fallback.
 * Returns { rates: { USD: 1, INR: 83.1, ... }, isLive: boolean }
 */
export async function getExchangeRates() {
  // 1. Try cache
  const cached = loadCachedRates();
  if (cached) {
    return { rates: cached, isLive: true, isCached: true };
  }

  // 2. Try live API
  try {
    const rates = await fetchLiveRates();
    cacheRates(rates);
    return { rates, isLive: true, isCached: false };
  } catch (err) {
    console.warn("Failed to fetch live exchange rates, using fallback:", err);
    return { rates: FALLBACK_RATES, isLive: false, isCached: false };
  }
}

export default { getExchangeRates, CURRENCY_OPTIONS, FALLBACK_RATES };
