import React, { useState, useEffect, useMemo } from 'react';
import { RefreshCw, Server, Crown, Settings2, TrendingUp, Loader2 } from 'lucide-react';
import { fetchPrices, ServerType, AODPPrice } from './api';
import { calculateRegularFlips, calculateUpgradeFlips, FlipResult, UpgradeFlipResult } from './calculations';
import { formatItemName } from './item_names';
import itemsData from './items.json';

const ALL_ITEMS = itemsData.equipment;
const MATERIALS = itemsData.materials;
// Generate variants @1, @2, @3 for enchantments for API fetching
const getEnchantedItems = (baseItems: string[]) => {
  const enchanted: string[] = [];
  baseItems.forEach(item => {
    enchanted.push(item); // @0
    enchanted.push(`${item}@1`);
    enchanted.push(`${item}@2`);
    enchanted.push(`${item}@3`);
  });
  return enchanted;
};

// Only fetch a subset initially to avoid hammering the API if we don't have filters active
// For full personal use, we might just load everything.
const ITEMS_TO_FETCH = [...getEnchantedItems(ALL_ITEMS), ...MATERIALS];

type FlipMode = "regular" | "upgrade";

const QUALITY_MAP = {
  1: "Normal",
  2: "Good",
  3: "Outstanding",
  4: "Excellent",
  5: "Masterpiece"
};

function App() {
  const [server, setServer] = useState<ServerType>("americas");
  const [isPremium, setIsPremium] = useState<boolean>(true);
  const [flipMode, setFlipMode] = useState<FlipMode>("regular");

  const [tierFilter, setTierFilter] = useState<string>("ALL");
  const [minProfit, setMinProfit] = useState<number>(5000);

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [prices, setPrices] = useState<AODPPrice[]>([]);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  const loadData = async () => {
    setIsLoading(true);
    try {
      // In a real scenario with 1000s of items, you'd apply the tier filter BEFORE fetching to save bandwidth.
      // For this demo, let's filter before fetch.
      let itemsToRequest = ITEMS_TO_FETCH;
      if (tierFilter !== "ALL") {
        itemsToRequest = itemsToRequest.filter(id => id.startsWith(tierFilter) || MATERIALS.includes(id));
      }

      const data = await fetchPrices(server, itemsToRequest);
      setPrices(data);
      setLastUpdate(new Date());
    } catch (e) {
      console.error(e);
    }
    setIsLoading(false);
  };

  // Initial load
  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [server, tierFilter]);

  const flips = useMemo(() => {
    if (prices.length === 0) return [];

    let results: (FlipResult | UpgradeFlipResult)[] = [];
    if (flipMode === "regular") {
      results = calculateRegularFlips(prices, isPremium);
    } else {
      results = calculateUpgradeFlips(prices, isPremium);
    }

    // Apply client-side filters
    return results.filter(r => r.profit >= minProfit);
  }, [prices, isPremium, flipMode, minProfit]);

  const formatSilver = (val: number) => {
    return Math.floor(val).toLocaleString() + " 🥈";
  };

  const getQualityColor = (q: number) => {
    const colors: Record<number, string> = {
      1: "text-gray-400",
      2: "text-green-400",
      3: "text-blue-400",
      4: "text-purple-400",
      5: "text-yellow-400"
    };
    return colors[q] || "text-white";
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-gray-200 p-6 font-sans">
      <div className="max-w-7xl mx-auto">

        {/* Header */}
        <header className="flex flex-col md:flex-row items-center justify-between pb-6 border-b border-gray-800 mb-8 gap-4">
          <div className="flex items-center gap-3">
            <div className="bg-orange-500/10 p-3 rounded-xl">
              <TrendingUp className="text-orange-500 w-8 h-8" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white tracking-tight">Albion Flipper</h1>
              <p className="text-gray-400 text-sm">Caerleon to Black Market Arbitrage</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center bg-gray-900 rounded-lg p-1 border border-gray-800">
              {(["americas", "europe", "asia"] as ServerType[]).map(s => (
                <button
                  key={s}
                  onClick={() => setServer(s)}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                    server === s ? "bg-gray-800 text-white shadow-sm" : "text-gray-500 hover:text-gray-300"
                  }`}
                >
                  <span className="capitalize">{s}</span>
                </button>
              ))}
            </div>

            <button
              onClick={() => setIsPremium(!isPremium)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${
                isPremium ? "bg-yellow-500/10 border-yellow-500/20 text-yellow-500" : "bg-gray-900 border-gray-800 text-gray-400"
              }`}
            >
              <Crown className="w-4 h-4" />
              {isPremium ? "Premium" : "Non-Premium"}
            </button>

            <button
              onClick={loadData}
              disabled={isLoading}
              className="flex items-center gap-2 px-4 py-2 bg-orange-600 hover:bg-orange-500 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
            >
              {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
              Refresh Data
            </button>
          </div>
        </header>

        {/* Controls */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
            <h3 className="text-sm font-medium text-gray-400 mb-3 flex items-center gap-2">
              <Settings2 className="w-4 h-4" /> Mode
            </h3>
            <div className="flex bg-black/50 rounded-lg p-1">
              <button
                onClick={() => setFlipMode("regular")}
                className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${flipMode === "regular" ? "bg-gray-800 text-white" : "text-gray-500"}`}
              >
                Regular Flips
              </button>
              <button
                onClick={() => setFlipMode("upgrade")}
                className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${flipMode === "upgrade" ? "bg-gray-800 text-white" : "text-gray-500"}`}
              >
                Upgrade Flips
              </button>
            </div>
          </div>

          <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
            <h3 className="text-sm font-medium text-gray-400 mb-3">Tier Filter</h3>
            <select
              value={tierFilter}
              onChange={(e) => setTierFilter(e.target.value)}
              className="w-full bg-black border border-gray-700 rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-orange-500"
            >
              <option value="ALL">All Tiers (Slow)</option>
              <option value="T4">Tier 4</option>
              <option value="T5">Tier 5</option>
              <option value="T6">Tier 6</option>
              <option value="T7">Tier 7</option>
              <option value="T8">Tier 8</option>
            </select>
          </div>

          <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
            <h3 className="text-sm font-medium text-gray-400 mb-3">Min Profit (Silver)</h3>
            <input
              type="number"
              value={minProfit}
              onChange={(e) => setMinProfit(Number(e.target.value))}
              className="w-full bg-black border border-gray-700 rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-orange-500"
            />
          </div>
        </div>

        {/* Results */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
          <div className="p-4 border-b border-gray-800 flex justify-between items-center bg-gray-900/50">
            <h2 className="font-medium text-white">Profitable Opportunities</h2>
            <span className="text-sm text-gray-500">
              Found {flips.length} items
              {lastUpdate && ` • Updated: ${lastUpdate.toLocaleTimeString()}`}
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-black/40 text-gray-400">
                <tr>
                  <th className="px-6 py-4 font-medium">Item</th>
                  <th className="px-6 py-4 font-medium">Quality</th>
                  <th className="px-6 py-4 font-medium">Caerleon Price</th>
                  <th className="px-6 py-4 font-medium">BM Price</th>
                  {flipMode === "upgrade" && <th className="px-6 py-4 font-medium">Upgrade Cost</th>}
                  <th className="px-6 py-4 font-medium text-green-400">Profit</th>
                  <th className="px-6 py-4 font-medium">ROI</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800/50">
                {isLoading ? (
                  <tr>
                    <td colSpan={flipMode === "upgrade" ? 7 : 6} className="px-6 py-12 text-center text-gray-500">
                      <div className="flex flex-col items-center gap-3">
                        <Loader2 className="w-6 h-6 animate-spin text-orange-500" />
                        Scanning Markets...
                      </div>
                    </td>
                  </tr>
                ) : flips.length === 0 ? (
                  <tr>
                    <td colSpan={flipMode === "upgrade" ? 7 : 6} className="px-6 py-12 text-center text-gray-500">
                      No profitable flips found for current filters.
                    </td>
                  </tr>
                ) : (
                  flips.slice(0, 100).map((flip, idx) => {
                    const isUpgrade = 'baseItemId' in flip;

                    return (
                      <tr key={`${flip.itemId}-${flip.quality}-${idx}`} className="hover:bg-gray-800/50 transition-colors group">
                        <td className="px-6 py-4">
                          <div className="font-medium text-white group-hover:text-orange-400 transition-colors">
                            {formatItemName(flip.itemName)}
                          </div>
                          {isUpgrade && (
                            <div className="text-xs text-gray-500 mt-1">
                              from {formatItemName((flip as UpgradeFlipResult).baseItemId)}
                            </div>
                          )}
                        </td>
                        <td className={`px-6 py-4 font-medium ${getQualityColor(flip.quality)}`}>
                          {QUALITY_MAP[flip.quality as keyof typeof QUALITY_MAP]}
                        </td>
                        <td className="px-6 py-4 text-gray-300">
                          {formatSilver(flip.caerleonPrice)}
                        </td>
                        <td className="px-6 py-4 text-gray-300">
                          {formatSilver(flip.bmPrice)}
                        </td>
                        {isUpgrade && (
                          <td className="px-6 py-4 text-gray-400">
                            {formatSilver((flip as UpgradeFlipResult).upgradeCost)}
                          </td>
                        )}
                        <td className="px-6 py-4 font-bold text-green-400">
                          {formatSilver(flip.profit)}
                        </td>
                        <td className="px-6 py-4 font-medium">
                          <span className={`px-2 py-1 rounded text-xs ${flip.roi > 10 ? 'bg-green-500/10 text-green-400' : 'bg-gray-800 text-gray-300'}`}>
                            {flip.roi.toFixed(1)}%
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
}

export default App;
