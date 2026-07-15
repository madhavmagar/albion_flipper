import { AODPPrice } from './api';

export interface FlipResult {
  itemId: string;
  itemName: string;
  quality: number;
  caerleonPrice: number;
  bmPrice: number;
  profit: number;
  roi: number;
  caerleonDate: string;
  bmDate: string;
}

export interface UpgradeFlipResult extends FlipResult {
  baseItemId: string;
  upgradeCost: number;
}

// 6.5% for non-premium (4% market fee + 2.5% setup fee on sell)
// 4% for premium (1.5% market fee + 2.5% setup fee on sell)
// Assuming we only pay tax when SELLING on the Black Market
// But when buying via buy order in Caerleon, we'd pay 2.5% setup fee.
// For flipping, typically people direct-buy in Caerleon (no setup fee)
// and direct-sell to BM Buy Orders (no setup fee, just market tax) or Setup Sell Orders.
// A common conservative approach is:
// Sell Tax = Premium ? 0.04 : 0.065;
export const calculateTax = (price: number, isPremium: boolean): number => {
  const taxRate = isPremium ? 0.04 : 0.065;
  return price * taxRate;
};

const mapPrices = (prices: AODPPrice[]) => {
  const map: Record<string, Record<string, Record<number, AODPPrice>>> = {};

  prices.forEach(p => {
    if (!map[p.item_id]) map[p.item_id] = {};
    if (!map[p.item_id][p.city]) map[p.item_id][p.city] = {};
    map[p.item_id][p.city][p.quality] = p;
  });

  return map;
};

export const calculateRegularFlips = (
  prices: AODPPrice[],
  isPremium: boolean
): FlipResult[] => {
  const priceMap = mapPrices(prices);
  const results: FlipResult[] = [];

  for (const itemId in priceMap) {
    const cityData = priceMap[itemId];
    if (!cityData["Caerleon"] || !cityData["Black Market"]) continue;

    // Check across qualities 1-5 (Normal to Masterpiece)
    for (let q = 1; q <= 5; q++) {
      const cPrice = cityData["Caerleon"][q];
      const bmPrice = cityData["Black Market"][q];

      if (!cPrice || !bmPrice) continue;

      // Buy in Caerleon via Sell Orders (sell_price_min)
      const buyPrice = cPrice.sell_price_min;

      // Sell in BM via Buy Orders (buy_price_max)
      const sellPrice = bmPrice.buy_price_max;

      if (buyPrice > 0 && sellPrice > 0) {
        const tax = calculateTax(sellPrice, isPremium);
        const netSell = sellPrice - tax;
        const profit = netSell - buyPrice;
        const roi = (profit / buyPrice) * 100;

        if (profit > 0) {
          results.push({
            itemId,
            itemName: itemId, // You can map this with item_names.ts in the UI
            quality: q,
            caerleonPrice: buyPrice,
            bmPrice: sellPrice,
            profit,
            roi,
            caerleonDate: cPrice.sell_price_min_date,
            bmDate: bmPrice.buy_price_max_date
          });
        }
      }
    }
  }

  return results.sort((a, b) => b.profit - a.profit);
};

// Map runes/souls/relics to enchantment level
const ENCHANT_MATERIALS = {
  1: "_RUNE",
  2: "_SOUL",
  3: "_RELIC",
  4: "_SHARD" // T4+ enchant 4 is rarer but exists, maybe ignore for now
};

const getMaterialCost = (
  tier: string,
  enchantLevel: number, // Target enchant level (1, 2, 3)
  prices: AODPPrice[]
): number => {
  if (enchantLevel < 1 || enchantLevel > 3) return 0;

  const suffix = ENCHANT_MATERIALS[enchantLevel as 1|2|3];
  const matId = `${tier}${suffix}`;

  const matPrices = prices.filter(p => p.item_id === matId && p.city === "Caerleon");
  if (matPrices.length === 0) return 0;

  // Material has quality 1 only
  const price = matPrices[0].sell_price_min;
  return price > 0 ? price : 0;
};

// Upgrade amount formulas:
// Weapons: 1H = 72, 2H = 96
// Armors: Head = 36, Chest = 72, Shoes = 36, Offhand = 24
// A simplified heuristic if exact material amounts aren't available:
// Most 1H = 72. Just assume 72 for a baseline if we don't have perfect mapping.
// For accuracy, one needs a mapping of item ID -> slots. We'll use a conservative default of 96 or allow user to refine.
const getMaterialAmount = (itemId: string): number => {
  if (itemId.includes("HEAD") || itemId.includes("SHOES")) return 36;
  if (itemId.includes("ARMOR")) return 72;
  if (itemId.includes("OFF")) return 24;
  if (itemId.includes("2H")) return 96;
  if (itemId.includes("MAIN")) return 72;
  return 72; // default
};

export const calculateUpgradeFlips = (
  prices: AODPPrice[],
  isPremium: boolean
): UpgradeFlipResult[] => {
  const priceMap = mapPrices(prices);
  const results: UpgradeFlipResult[] = [];

  for (const targetId in priceMap) {
    // Only look at enchanted items (e.g., @1, @2, @3)
    const match = targetId.match(/(T[4-8])_.*@([1-3])/);
    if (!match) continue;

    const tier = match[1];
    const enchantStr = match[2];
    const targetEnchantLevel = parseInt(enchantStr, 10);

    // We are looking to buy the BASE item.
    // e.g. if target is T4_HEAD_CLOTH@1, base is T4_HEAD_CLOTH
    const baseId = targetId.replace(`@${targetEnchantLevel}`, "");

    // For upgrades: To get @2, you might upgrade from @1 or from base.
    // For simplicity, we calculate upgrading from Base (0) -> @1
    // Upgrading @1 -> @2 requires @1 item + Souls.
    // Let's implement single step upgrade: (targetLevel - 1) to targetLevel.
    const sourceId = targetEnchantLevel === 1 ? baseId : targetId.replace(`@${targetEnchantLevel}`, `@${targetEnchantLevel - 1}`);

    const sourceData = priceMap[sourceId];
    const targetData = priceMap[targetId];

    if (!sourceData || !sourceData["Caerleon"] || !targetData || !targetData["Black Market"]) continue;

    const matPriceUnit = getMaterialCost(tier, targetEnchantLevel, prices);
    if (matPriceUnit === 0) continue;

    const matAmount = getMaterialAmount(baseId);
    const totalMatCost = matPriceUnit * matAmount;

    // Check across qualities
    for (let q = 1; q <= 5; q++) {
      const sourceCaerleon = sourceData["Caerleon"][q];
      const targetBM = targetData["Black Market"][q];

      if (!sourceCaerleon || !targetBM) continue;

      const buyItemPrice = sourceCaerleon.sell_price_min;
      const sellItemPrice = targetBM.buy_price_max;

      if (buyItemPrice > 0 && sellItemPrice > 0) {
        const totalBuyCost = buyItemPrice + totalMatCost;

        const tax = calculateTax(sellItemPrice, isPremium);
        const netSell = sellItemPrice - tax;

        const profit = netSell - totalBuyCost;
        const roi = (profit / totalBuyCost) * 100;

        if (profit > 0) {
          results.push({
            itemId: targetId,
            itemName: targetId,
            quality: q,
            caerleonPrice: totalBuyCost, // This is synthetic (item + mats)
            bmPrice: sellItemPrice,
            profit,
            roi,
            baseItemId: sourceId,
            upgradeCost: totalMatCost,
            caerleonDate: sourceCaerleon.sell_price_min_date,
            bmDate: targetBM.buy_price_max_date
          });
        }
      }
    }
  }

  return results.sort((a, b) => b.profit - a.profit);
};
