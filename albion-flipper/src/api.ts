export type ServerType = "americas" | "asia" | "europe";

const BASE_URLS = {
  americas: "https://west.albion-online-data.com/api/v2/stats/prices",
  asia: "https://east.albion-online-data.com/api/v2/stats/prices",
  europe: "https://europe.albion-online-data.com/api/v2/stats/prices"
};

export interface AODPPrice {
  item_id: string;
  city: string;
  quality: number;
  sell_price_min: number;
  sell_price_min_date: string;
  sell_price_max: number;
  sell_price_max_date: string;
  buy_price_min: number;
  buy_price_min_date: string;
  buy_price_max: number;
  buy_price_max_date: string;
}

/**
 * Fetches prices for a given list of item IDs.
 * Divides into chunks to avoid too long URLs.
 */
export async function fetchPrices(server: ServerType, itemIds: string[]): Promise<AODPPrice[]> {
  const url = BASE_URLS[server];
  const cities = "Caerleon,Black Market";
  const chunkSize = 150; // max items per request to avoid URL length limits

  let allPrices: AODPPrice[] = [];

  for (let i = 0; i < itemIds.length; i += chunkSize) {
    const chunk = itemIds.slice(i, i + chunkSize);
    const fetchUrl = `${url}/${chunk.join(",")}?locations=${cities}`;

    try {
      const response = await fetch(fetchUrl);
      if (!response.ok) {
         console.error(`API Error: ${response.status} ${response.statusText}`);
         continue;
      }
      const data: AODPPrice[] = await response.json();
      allPrices = allPrices.concat(data);
    } catch (e) {
      console.error("Failed to fetch chunk", e);
    }
  }

  return allPrices;
}
