/**
 * Canonical destination seed data.
 *
 * Single source of truth for the initial 30-destination catalog. Each entry
 * includes all fields required by the `destinations` table as well as the
 * remote CDN source URL used by the seed script to download the image asset.
 *
 * The `filename` value is what gets stored in the database `image` column.
 * The `sourceUrl` is used only at seed time and is **not** persisted.
 */

export interface DestinationSeedEntry {
  id: number;
  name: string;
  description: string;
  country: string;
  region: string;
  category: string;
  priceLevel: number;
  rating: number;
  bestSeason: string;
  latitude: number;
  longitude: number;
  sourceUrl: string;
  filename: string;
}

export const DESTINATION_SEED_DATA: readonly DestinationSeedEntry[] = [
  {
    id: 1,
    name: "Bali",
    description:
      "A tropical paradise known for its forested volcanic mountains, iconic rice paddies, and stunning coral reefs.",
    country: "Indonesia",
    region: "Asia",
    category: "beach",
    priceLevel: 2,
    rating: 4.7,
    bestSeason: "Apr-Oct",
    latitude: -8.3405,
    longitude: 115.092,
    sourceUrl:
      "https://images.unsplash.com/photo-1537996194471-e657df975ab4?w=800&q=80",
    filename: "bali.jpg",
  },
  {
    id: 2,
    name: "Maldives",
    description:
      "An idyllic archipelago of over 1,000 coral islands famous for crystal-clear lagoons and overwater bungalows.",
    country: "Maldives",
    region: "Asia",
    category: "beach",
    priceLevel: 5,
    rating: 4.9,
    bestSeason: "Nov-Apr",
    latitude: 3.2028,
    longitude: 73.2207,
    sourceUrl:
      "https://images.unsplash.com/photo-1514282401047-d79a71a590e8?w=800&q=80",
    filename: "maldives.jpg",
  },
  {
    id: 3,
    name: "Cancún",
    description:
      "A Mexican Caribbean resort city known for its white-sand beaches, turquoise waters, and vibrant nightlife.",
    country: "Mexico",
    region: "North America",
    category: "beach",
    priceLevel: 3,
    rating: 4.5,
    bestSeason: "Dec-Apr",
    latitude: 21.1619,
    longitude: -86.8515,
    sourceUrl:
      "https://images.unsplash.com/photo-1510097467424-192d713fd8b2?w=800&q=80",
    filename: "cancun.jpg",
  },
  {
    id: 4,
    name: "Phuket",
    description:
      "Thailand's largest island, offering palm-fringed beaches, ornate temples, and a lively street-food scene.",
    country: "Thailand",
    region: "Asia",
    category: "beach",
    priceLevel: 2,
    rating: 4.4,
    bestSeason: "Nov-Mar",
    latitude: 7.8804,
    longitude: 98.3923,
    sourceUrl:
      "https://images.unsplash.com/photo-1589394815804-964ed0be2eb5?w=800&q=80",
    filename: "phuket.jpg",
  },
  {
    id: 5,
    name: "Santorini",
    description:
      "A dramatic Greek island with whitewashed cliff-side villages, blue-domed churches, and breathtaking sunsets.",
    country: "Greece",
    region: "Europe",
    category: "beach",
    priceLevel: 4,
    rating: 4.8,
    bestSeason: "May-Oct",
    latitude: 36.3932,
    longitude: 25.4615,
    sourceUrl:
      "https://images.unsplash.com/photo-1570077188670-e3a8d69ac5ff?w=800&q=80",
    filename: "santorini.jpg",
  },
  {
    id: 6,
    name: "Zanzibar",
    description:
      "A Tanzanian archipelago offering spice-scented streets, pristine beaches, and rich Swahili culture.",
    country: "Tanzania",
    region: "Africa",
    category: "beach",
    priceLevel: 2,
    rating: 4.3,
    bestSeason: "Jun-Oct",
    latitude: -6.1659,
    longitude: 39.1989,
    sourceUrl:
      "https://images.unsplash.com/photo-1548550023-2bdb3c5beed7?w=800&q=80",
    filename: "zanzibar.jpg",
  },
  {
    id: 7,
    name: "Maui",
    description:
      "A Hawaiian island renowned for its dramatic coastline, lush valleys, and world-class snorkeling.",
    country: "United States",
    region: "North America",
    category: "beach",
    priceLevel: 4,
    rating: 4.6,
    bestSeason: "Apr-Nov",
    latitude: 20.7984,
    longitude: -156.3319,
    sourceUrl:
      "https://images.unsplash.com/photo-1542259009477-d625272157b7?w=800&q=80",
    filename: "maui.jpg",
  },
  {
    id: 8,
    name: "Boracay",
    description:
      "A tiny Philippine island with powdery White Beach, vibrant coral gardens, and a relaxed tropical vibe.",
    country: "Philippines",
    region: "Asia",
    category: "beach",
    priceLevel: 2,
    rating: 4.5,
    bestSeason: "Nov-May",
    latitude: 11.9674,
    longitude: 121.9248,
    sourceUrl:
      "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800&q=80",
    filename: "boracay.jpg",
  },
  {
    id: 9,
    name: "Swiss Alps",
    description:
      "Majestic alpine peaks offering world-class skiing in winter and scenic hiking trails in summer.",
    country: "Switzerland",
    region: "Europe",
    category: "mountain",
    priceLevel: 5,
    rating: 4.8,
    bestSeason: "Jun-Sep / Dec-Mar",
    latitude: 46.8182,
    longitude: 8.2275,
    sourceUrl:
      "https://images.unsplash.com/photo-1531366936337-7c912a4589a7?w=800&q=80",
    filename: "swiss-alps.jpg",
  },
  {
    id: 10,
    name: "Banff",
    description:
      "A stunning Canadian national park in the Rockies, famed for turquoise lakes, glaciers, and wildlife.",
    country: "Canada",
    region: "North America",
    category: "mountain",
    priceLevel: 3,
    rating: 4.7,
    bestSeason: "Jun-Sep",
    latitude: 51.4968,
    longitude: -115.9281,
    sourceUrl:
      "https://images.unsplash.com/photo-1503614472-8c93d56e92ce?w=800&q=80",
    filename: "banff.jpg",
  },
  {
    id: 11,
    name: "Patagonia",
    description:
      "A remote South American frontier of glaciers, granite towers, and windswept steppe at the edge of the world.",
    country: "Argentina",
    region: "South America",
    category: "mountain",
    priceLevel: 3,
    rating: 4.6,
    bestSeason: "Oct-Mar",
    latitude: -50.3403,
    longitude: -72.2648,
    sourceUrl:
      "https://images.unsplash.com/photo-1531761535209-180857e963b9?w=800&q=80",
    filename: "patagonia.jpg",
  },
  {
    id: 12,
    name: "Nepal Himalayas",
    description:
      "Home to Mount Everest and ancient temples, Nepal offers unrivaled trekking and spiritual discovery.",
    country: "Nepal",
    region: "Asia",
    category: "mountain",
    priceLevel: 1,
    rating: 4.5,
    bestSeason: "Mar-May / Sep-Nov",
    latitude: 27.9881,
    longitude: 86.925,
    sourceUrl:
      "https://images.unsplash.com/photo-1544735716-392fe2489ffa?w=800&q=80",
    filename: "nepal.jpg",
  },
  {
    id: 13,
    name: "Dolomites",
    description:
      "Italy's jagged limestone peaks offer dramatic scenery, charming alpine villages, and via ferrata adventures.",
    country: "Italy",
    region: "Europe",
    category: "mountain",
    priceLevel: 4,
    rating: 4.7,
    bestSeason: "Jun-Sep",
    latitude: 46.4102,
    longitude: 11.8441,
    sourceUrl:
      "https://images.unsplash.com/photo-1589308078059-be1415eab4c3?w=800&q=80",
    filename: "dolomites.jpg",
  },
  {
    id: 14,
    name: "Mount Fuji",
    description:
      "Japan's iconic symmetrical volcano, a sacred peak surrounded by lakes, hot springs, and forests.",
    country: "Japan",
    region: "Asia",
    category: "mountain",
    priceLevel: 3,
    rating: 4.4,
    bestSeason: "Jul-Sep",
    latitude: 35.3606,
    longitude: 138.7274,
    sourceUrl:
      "https://images.unsplash.com/photo-1490806843957-31f4c9a91c65?w=800&q=80",
    filename: "mount-fuji.jpg",
  },
  {
    id: 15,
    name: "Queenstown",
    description:
      "New Zealand's adventure capital set on a glacial lake, offering bungee jumping, skiing, and jet-boating.",
    country: "New Zealand",
    region: "Oceania",
    category: "mountain",
    priceLevel: 4,
    rating: 4.6,
    bestSeason: "Jun-Aug / Dec-Feb",
    latitude: -45.0312,
    longitude: 168.6626,
    sourceUrl:
      "https://images.unsplash.com/photo-1589871973318-9ca1258faa5d?w=800&q=80",
    filename: "queenstown.jpg",
  },
  {
    id: 16,
    name: "Kyoto",
    description:
      "Japan's cultural heart, filled with classical Buddhist temples, Shinto shrines, and stunning cherry blossoms.",
    country: "Japan",
    region: "Asia",
    category: "city",
    priceLevel: 3,
    rating: 4.8,
    bestSeason: "Mar-May / Oct-Nov",
    latitude: 35.0116,
    longitude: 135.7681,
    sourceUrl:
      "https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?w=800&q=80",
    filename: "kyoto.jpg",
  },
  {
    id: 17,
    name: "Paris",
    description:
      "The City of Light, celebrated for its art, architecture, cuisine, and timeless romantic charm.",
    country: "France",
    region: "Europe",
    category: "city",
    priceLevel: 4,
    rating: 4.7,
    bestSeason: "Apr-Jun / Sep-Oct",
    latitude: 48.8566,
    longitude: 2.3522,
    sourceUrl:
      "https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=800&q=80",
    filename: "paris.jpg",
  },
  {
    id: 18,
    name: "Barcelona",
    description:
      "A vibrant Spanish city blending Gaudí's fantastical architecture, Mediterranean beaches, and lively tapas bars.",
    country: "Spain",
    region: "Europe",
    category: "city",
    priceLevel: 3,
    rating: 4.6,
    bestSeason: "May-Jun / Sep-Oct",
    latitude: 41.3874,
    longitude: 2.1686,
    sourceUrl:
      "https://images.unsplash.com/photo-1583422409516-2895a77efded?w=800&q=80",
    filename: "barcelona.jpg",
  },
  {
    id: 19,
    name: "Istanbul",
    description:
      "A transcontinental city straddling Europe and Asia, rich in Ottoman palaces, bazaars, and Byzantine mosaics.",
    country: "Turkey",
    region: "Europe",
    category: "city",
    priceLevel: 2,
    rating: 4.5,
    bestSeason: "Apr-May / Sep-Nov",
    latitude: 41.0082,
    longitude: 28.9784,
    sourceUrl:
      "https://images.unsplash.com/photo-1524231757912-21f4fe3a7200?w=800&q=80",
    filename: "istanbul.jpg",
  },
  {
    id: 20,
    name: "New York",
    description:
      "The city that never sleeps, offering iconic landmarks, world-class museums, and an unmatched food scene.",
    country: "United States",
    region: "North America",
    category: "city",
    priceLevel: 5,
    rating: 4.6,
    bestSeason: "Apr-Jun / Sep-Nov",
    latitude: 40.7128,
    longitude: -74.006,
    sourceUrl:
      "https://images.unsplash.com/photo-1496442226666-8d4d0e62e6e9?w=800&q=80",
    filename: "new-york.jpg",
  },
  {
    id: 21,
    name: "Marrakech",
    description:
      "A Moroccan city of sensory delights, with bustling souks, fragrant gardens, and ornate palaces.",
    country: "Morocco",
    region: "Africa",
    category: "city",
    priceLevel: 2,
    rating: 4.4,
    bestSeason: "Mar-May / Sep-Nov",
    latitude: 31.6295,
    longitude: -7.9811,
    sourceUrl:
      "https://images.unsplash.com/photo-1597212618440-806262de4f6b?w=800&q=80",
    filename: "marrakech.jpg",
  },
  {
    id: 22,
    name: "Singapore",
    description:
      "A futuristic city-state blending cutting-edge architecture, lush gardens, and a legendary hawker food culture.",
    country: "Singapore",
    region: "Asia",
    category: "city",
    priceLevel: 4,
    rating: 4.5,
    bestSeason: "Year-round",
    latitude: 1.3521,
    longitude: 103.8198,
    sourceUrl:
      "https://images.unsplash.com/photo-1525625293386-3f8f99389edd?w=800&q=80",
    filename: "singapore.jpg",
  },
  {
    id: 23,
    name: "Buenos Aires",
    description:
      "Argentina's passionate capital, famous for tango, colorful La Boca streets, and sizzling parrilla steaks.",
    country: "Argentina",
    region: "South America",
    category: "city",
    priceLevel: 2,
    rating: 4.3,
    bestSeason: "Mar-May / Sep-Nov",
    latitude: -34.6037,
    longitude: -58.3816,
    sourceUrl:
      "https://images.unsplash.com/photo-1589909202802-8f4aadce1849?w=800&q=80",
    filename: "buenos-aires.jpg",
  },
  {
    id: 24,
    name: "Tuscany",
    description:
      "Rolling Italian hills dotted with vineyards, cypress-lined roads, and Renaissance art in every village.",
    country: "Italy",
    region: "Europe",
    category: "countryside",
    priceLevel: 4,
    rating: 4.7,
    bestSeason: "Apr-Jun / Sep-Oct",
    latitude: 43.7711,
    longitude: 11.2486,
    sourceUrl:
      "https://images.unsplash.com/photo-1534445867742-43195f401b6c?w=800&q=80",
    filename: "tuscany.jpg",
  },
  {
    id: 25,
    name: "Provence",
    description:
      "Sun-drenched French countryside renowned for lavender fields, rosé wines, and charming hilltop villages.",
    country: "France",
    region: "Europe",
    category: "countryside",
    priceLevel: 3,
    rating: 4.6,
    bestSeason: "Jun-Aug",
    latitude: 43.9352,
    longitude: 6.0679,
    sourceUrl:
      "https://images.unsplash.com/photo-1499346030926-9a72daac6c63?w=800&q=80",
    filename: "provence.jpg",
  },
  {
    id: 26,
    name: "Cotswolds",
    description:
      "Quintessentially English countryside with honey-stone villages, rolling meadows, and cozy country pubs.",
    country: "United Kingdom",
    region: "Europe",
    category: "countryside",
    priceLevel: 3,
    rating: 4.4,
    bestSeason: "May-Sep",
    latitude: 51.8301,
    longitude: -1.7658,
    sourceUrl:
      "https://images.unsplash.com/photo-1573152958734-1922c188fba3?w=800&q=80",
    filename: "cotswolds.jpg",
  },
  {
    id: 27,
    name: "Ubud",
    description:
      "Bali's spiritual heartland, surrounded by terraced rice paddies, sacred monkey forests, and artisan workshops.",
    country: "Indonesia",
    region: "Asia",
    category: "countryside",
    priceLevel: 2,
    rating: 4.5,
    bestSeason: "Apr-Oct",
    latitude: -8.5069,
    longitude: 115.2625,
    sourceUrl:
      "https://images.unsplash.com/photo-1555400038-63f5ba517a47?w=800&q=80",
    filename: "ubud.jpg",
  },
  {
    id: 28,
    name: "Luang Prabang",
    description:
      "A tranquil Laotian town where saffron-robed monks, French-colonial architecture, and the Mekong River converge.",
    country: "Laos",
    region: "Asia",
    category: "countryside",
    priceLevel: 1,
    rating: 4.3,
    bestSeason: "Nov-Mar",
    latitude: 19.8857,
    longitude: 102.1347,
    sourceUrl:
      "https://images.unsplash.com/photo-1583417319070-4a69db38a482?w=800&q=80",
    filename: "luang-prabang.jpg",
  },
  {
    id: 29,
    name: "Napa Valley",
    description:
      "California's premier wine region, offering vineyard tours, gourmet dining, and hot-air balloon rides.",
    country: "United States",
    region: "North America",
    category: "countryside",
    priceLevel: 4,
    rating: 4.5,
    bestSeason: "Aug-Oct",
    latitude: 38.5025,
    longitude: -122.2654,
    sourceUrl:
      "https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=800&q=80",
    filename: "napa-valley.jpg",
  },
  {
    id: 30,
    name: "Chiang Mai",
    description:
      "A laid-back Thai city encircled by misty mountains, ancient temples, and vibrant night markets.",
    country: "Thailand",
    region: "Asia",
    category: "countryside",
    priceLevel: 1,
    rating: 4.4,
    bestSeason: "Nov-Feb",
    latitude: 18.7883,
    longitude: 98.9853,
    sourceUrl:
      "https://images.unsplash.com/photo-1528181304800-259b08848526?w=800&q=80",
    filename: "chiang-mai.jpg",
  },
] as const;
