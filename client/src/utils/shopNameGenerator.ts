/**
 * Shop Name Generator - Privacy-Friendly
 * 
 * Generates attractive, memorable shop names that don't reveal provider identity
 */

export interface ShopNameOptions {
  userId?: number;
  category?: string;
  setCount?: number;
}

// Creative shop name components
const shopPrefixes = [
  'Tech', 'Maker', 'Smart', 'Future', 'Innovate', 'Craft', 'Build', 'Invent', 'Create',
  'Explore', 'Design', 'Develop', 'Construct', 'Program', 'Hack', 'Code', 'Wire', 'Connect'
];

const shopSuffixes = [
  'Lab', 'Workshop', 'Studio', 'Atelier', 'Hub', 'Forge', 'Den', 'Space',
  'Craft', 'Works', 'Creators', 'Innovators', 'Makers', 'Builders', 'Designers'
];

const creativeNames = [
  'Quantum', 'Nexus', 'Pulse', 'Circuit', 'Neon', 'Echo', 'Spark', 'Nova', 'Zenith',
  'Apex', 'Vortex', 'Photon', 'Neural', 'Cyber', 'Proto', 'Meta', 'Pro', 'Elite'
];

const studioTypes = [
  'Tech Lab', 'Maker Studio', 'Innovation Hub', 'Craft Workshop', 'Design Den',
  'Build Space', 'Invent Studio', 'Create Hub', 'Future Forge', 'Smart Workshop',
  'Code Studio', 'Wire Lab', 'Tech Forge', 'Maker Space', 'Build Studio'
];

/**
 * Generate a fancy, privacy-friendly shop name
 * Does NOT reveal real provider information
 */
export const generateShopName = (options: ShopNameOptions): string => {
  const { userId, category } = options;

  // Use deterministic but creative name generation based on user ID
  // This ensures same provider always gets same name
  const seed = userId || Math.floor(Math.random() * 10000);
  const random = seededRandom(seed);

  // Generate name pattern: CreativeName + Type
  const creativeName = creativeNames[Math.floor(random() * creativeNames.length)];
  const type = studioTypes[Math.floor(random() * studioTypes.length)];

  return `${creativeName} ${type}`;
};

/**
 * Generate an alternative fancy name (for variety)
 */
export const generateAlternativeShopName = (userId: number): string => {
  const seed = userId * 2; // Different seed for variety
  const random = seededRandom(seed);

  const prefix = shopPrefixes[Math.floor(random() * shopPrefixes.length)];
  const suffix = shopSuffixes[Math.floor(random() * shopSuffixes.length)];

  return `${prefix} ${suffix}`;
};

/**
 * Seeded random number generator (for consistency)
 */
function seededRandom(seed: number): () => number {
  let state = seed;
  return () => {
    state = (state * 9301 + 49297) % 233280;
    return state / 233280;
  };
}

/**
 * Format existing company name (if provider wants to use their own)
 */
const formatCompanyName = (name: string): string => {
  // Remove common suffixes and format
  let formatted = name
    .replace(/\b(ltd|limited|inc|incorporated|llc|corp|corporation|llp)\b/gi, '')
    .trim();

  // Add workshop if it doesn't already have one
  if (!/\b(workshop|studio|lab|laboratory|shop|store|market)\b/i.test(formatted)) {
    formatted += ' Workshop';
  }

  return formatted;
};

/**
 * Generate a short handle for the shop (for URLs, etc.)
 */
export const generateShopHandle = (shopName: string): string => {
  return shopName
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, '')
    .slice(0, 20); // Max 20 chars
};

/**
 * Get display name with fallback chain
 * Priority: Fancy generated name > Custom shop name > Provider code
 */
export const getProviderDisplayName = (provider: {
  user_id?: number;
  shop_name?: string;
  provider_code?: string;
  provider_company?: string;
  provider_name?: string;
  company_name?: string;
}): string => {
  // Priority order for privacy-friendly display:
  // 1. Fancy auto-generated shop name (if user_id available)
  // 2. Custom shop name (if set)
  // 3. Provider code (minimal reveal)
  
  // Generate fancy name if we have user_id but no shop_name
  if (provider.user_id && !provider.shop_name) {
    return generateShopName({ userId: provider.user_id });
  }

  // Use custom shop name if set
  if (provider.shop_name) {
    return provider.shop_name;
  }

  // Fallback to provider code - minimal info reveal
  if (provider.provider_code) {
    return `Shop ${provider.provider_code}`;
  }

  return 'Provider Shop';
};

