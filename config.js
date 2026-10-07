/**
 * JVāN Streetwear - Maintenance Page Configuration
 * You can modify any text, dates, codes, or links directly in this file.
 */
const BRAND_CONFIG = {
  // Brand details
  brandName: "JVāN",
  brandNameLower: "jvān",
  brandSubtext: "STREETWEAR ARCHIVE // EST. 2024",
  
  // Maintenance Notice
  maintenanceStatus: "SYSTEM UNDER MAINTENANCE",
  statusBadge: "OFFLINE // UPGRADING VAULT",
  headline: "THE VAULT IS TEMPORARILY LOCKED.",
  subheadline: "We're currently restructuring our infrastructure and refining the upcoming collection. Shopify storefront will be back online shortly.",
  
  // Next Drop / Relaunch Info
  nextDropLabel: "NEXT COLLECTION RELAUNCH",
  estimatedDate: "FALL / WINTER 2026",
  countdownTarget: "2026-11-15T00:00:00", // Update to your target drop date
  
  // Game & Reward Settings
  gameTitle: "THE DROP CATCHER",
  gameInstructions: "Catch the falling apparel & sneakers in the JVāN tote. Avoid the SOLD OUT tags! Reach 200 PTS to unlock your VIP early-access discount code.",
  vipTargetScore: 200,
  vipDiscountCode: "JVAN-VAULT-20",
  vipDiscountDescription: "20% OFF YOUR FIRST ORDER AT RELAUNCH",
  
  // Social Links
  socials: {
    instagram: "https://instagram.com",
    tiktok: "https://tiktok.com",
    discord: "https://discord.com",
    twitter: "https://x.com"
  },
  
  // Contact & Support
  supportEmail: "concierge@jvan-studios.com",
  copyrightNotice: "© 2026 JVāN ALL RIGHTS RESERVED. DESIGNED FOR THE UNDERGROUND."
};

// Export for module use if loaded as module, or assign to window
if (typeof module !== "undefined" && module.exports) {
  module.exports = BRAND_CONFIG;
} else if (typeof window !== "undefined") {
  window.BRAND_CONFIG = BRAND_CONFIG;
}
