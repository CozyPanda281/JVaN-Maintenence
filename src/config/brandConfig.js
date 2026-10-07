/**
 * JVāN - Luxury Streetwear Brand Configuration & CMS Storage
 */
export const DEFAULT_BRAND_CONFIG = {
  brandName: "JVāN",
  brandNameLower: "jvān",
  brandSubtext: "HAUTE STREETWEAR ATELIER // SS26 COLLECTION",

  // Maintenance Notice
  maintenance: {
    statusBadge: "ATELIER STATUS // UNDER MAINTENANCE",
    headline: "JVāN IS CURRENTLY UNDER MAINTENANCE",
    subheadline: "STOREFRONT TEMPORARILY PAUSED // PREPARING THE BESPOKE SS26 ARCHIVE CAPSULE",
    description: "Our online storefront is temporarily paused while our atelier team upgrades our digital infrastructure and finalizes production on our upcoming garment collection. We will return online shortly with our newest silhouettes and custom checkout.",
    telemetry: [
      { label: "ATELIER STOREFRONT", val: "PAUSED (SHOPIFY)", status: "warning" },
      { label: "COLLECTION RUNWAY", val: "SS26 SILHOUETTES IN LAB", status: "active" },
      { label: "GARMENT QUALITY", val: "100% HEAVYWEIGHT TEXTILES", status: "ok" },
      { label: "UPCOMING RELEASE", val: "COMMUNITY DESIGN CAPSULE", status: "ok" }
    ]
  },

  // Technical Ticker Ribbon (Apparel specs)
  tickerItems: [
    "SHOPIFY STOREFRONT TEMPORARILY PAUSED",
    "SS26 ATELIER CAPSULE IN PRODUCTION",
    "COMMUNITY STREETWEAR CONTEST OPEN",
    "EXPLORE THE FULL-SCREEN TEXTILE ARCHIVE RPG"
  ],

  // Contest Information
  contest: {
    enabled: true,
    title: "COMMUNITY STREETWEAR DESIGN CONTEST",
    description: "While our storefront is under maintenance, we are inviting graphic designers, illustrators, and creators to submit original apparel graphics for our relaunch collection.",
    prizes: [
      {
        rank: "TOP 3 DESIGNS",
        highlight: "FEATURED IN OUR STORE",
        details: "The top 3 winning designs will be officially manufactured, produced, and featured in our streetwear clothing store with full creator recognition."
      },
      {
        rank: "TOP 10 ENTRIES",
        highlight: "EXCLUSIVE COUPON CODE",
        details: "The top 10 entries will receive an exclusive VIP coupon code to redeem when our storefront relaunches."
      }
    ]
  },

  // Game Settings (Fashion Atelier theme: collect fabric swatches, sketches & patterns)
  game: {
    title: "JVāN ATELIER ARCHIVE",
    buttonLabel: "EXPLORE THE ATELIER ARCHIVE // FULL-SCREEN PIXEL RPG",
    buttonSubtext: "COLLECT BESPOKE TEXTILES & SKETCHES • SPRAWLING RUNWAY VAULT • INFINITE LEVELS"
  },

  // Game 2 Settings (Level Devil precision platformer)
  runwayDevil: {
    title: "RUNWAY DEVIL",
    buttonLabel: "PLAY RUNWAY DEVIL // TROLL PRECISION PLATFORMER",
    buttonSubtext: "INFINITE DECEPTIVE LEVELS • SHIFTING FLOORS & TRICKS • NEVER IMPOSSIBLE"
  },

  // Social Links & Contact
  socials: {
    masterEnabled: true,
    instagram: "https://instagram.com",
    tiktok: "https://tiktok.com",
    discord: "https://discord.com",
    twitter: "https://x.com",
    enabled: {
      instagram: true,
      tiktok: true,
      discord: true,
      twitter: true
    }
  },

  // Secret Admin Login Methods (Toggleable)
  loginMethods: {
    easterEggClick: true,      // Triple-click 'ā' or double-click status notice
    keystrokeSequence: true,   // Typing "jvan" or "vault" anywhere
    keyboardShortcut: true,    // Cmd+Option+J or Ctrl+Alt+J
    urlHash: true              // #vault or ?access=vault
  },

  conciergeEmail: "concierge@jvan-studios.com",
  copyright: "© 2026 JVāN. ALL RIGHTS RESERVED."
};

export const BRAND_CONFIG = DEFAULT_BRAND_CONFIG;

const CMS_STORAGE_KEY = 'jvan_cms_config';

/**
 * Loads current CMS config from localStorage, falling back to defaults.
 */
export const loadCmsConfig = () => {
  try {
    const raw = localStorage.getItem(CMS_STORAGE_KEY);
    if (!raw) return { ...DEFAULT_BRAND_CONFIG };
    const parsed = JSON.parse(raw);
    return {
      ...DEFAULT_BRAND_CONFIG,
      ...parsed,
      maintenance: {
        ...DEFAULT_BRAND_CONFIG.maintenance,
        ...(parsed.maintenance || {})
      },
      contest: {
        ...DEFAULT_BRAND_CONFIG.contest,
        ...(parsed.contest || {})
      },
      game: {
        ...DEFAULT_BRAND_CONFIG.game,
        ...(parsed.game || {})
      },
      runwayDevil: {
        ...DEFAULT_BRAND_CONFIG.runwayDevil,
        ...(parsed.runwayDevil || {})
      },
      socials: {
        ...DEFAULT_BRAND_CONFIG.socials,
        ...(parsed.socials || {}),
        enabled: {
          ...DEFAULT_BRAND_CONFIG.socials.enabled,
          ...(parsed.socials?.enabled || {})
        }
      },
      loginMethods: {
        ...DEFAULT_BRAND_CONFIG.loginMethods,
        ...(parsed.loginMethods || {})
      }
    };
  } catch (err) {
    console.error("Failed to load CMS config:", err);
    return { ...DEFAULT_BRAND_CONFIG };
  }
};

/**
 * Saves updated CMS config to localStorage.
 */
export const saveCmsConfig = (updated) => {
  try {
    localStorage.setItem(CMS_STORAGE_KEY, JSON.stringify(updated));
    return true;
  } catch (err) {
    console.error("Failed to save CMS config:", err);
    return false;
  }
};

/**
 * Resets CMS config back to default brand settings.
 */
export const resetCmsConfig = () => {
  try {
    localStorage.removeItem(CMS_STORAGE_KEY);
    return { ...DEFAULT_BRAND_CONFIG };
  } catch (err) {
    console.error("Failed to reset CMS config:", err);
    return { ...DEFAULT_BRAND_CONFIG };
  }
};
