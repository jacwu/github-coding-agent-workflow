export interface DestinationSeedImage {
  sourceUrl: string;
  filename: string;
}

export interface DestinationSeedEntry {
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
  image: DestinationSeedImage;
}

export const DESTINATION_SEED_DATA: DestinationSeedEntry[] = [
  {
    name: "Bali",
    description:
      "A tropical paradise known for its stunning temples, terraced rice paddies, and vibrant culture. Bali offers world-class surfing, lush jungles, and serene beaches.",
    country: "Indonesia",
    region: "Asia",
    category: "beach",
    priceLevel: 2,
    rating: 4.7,
    bestSeason: "Apr-Oct",
    latitude: -8.3405,
    longitude: 115.092,
    image: {
      sourceUrl:
        "https://images.unsplash.com/photo-1537996194471-e657df975ab4?w=800&q=80",
      filename: "bali.jpg",
    },
  },
  {
    name: "Maldives",
    description:
      "An archipelago of 26 atolls in the Indian Ocean, famous for crystal-clear waters, overwater bungalows, and extraordinary marine life perfect for snorkeling and diving.",
    country: "Maldives",
    region: "Asia",
    category: "beach",
    priceLevel: 5,
    rating: 4.9,
    bestSeason: "Nov-Apr",
    latitude: 3.2028,
    longitude: 73.2207,
    image: {
      sourceUrl:
        "https://images.unsplash.com/photo-1514282401047-d79a71a590e8?w=800&q=80",
      filename: "maldives.jpg",
    },
  },
  {
    name: "Cancún",
    description:
      "A Mexican Caribbean resort city known for its white-sand beaches, turquoise waters, and vibrant nightlife. Explore nearby Mayan ruins and natural cenotes.",
    country: "Mexico",
    region: "North America",
    category: "beach",
    priceLevel: 3,
    rating: 4.5,
    bestSeason: "Dec-Apr",
    latitude: 21.1619,
    longitude: -86.8515,
    image: {
      sourceUrl:
        "https://images.unsplash.com/photo-1510097467424-192d713fd8b2?w=800&q=80",
      filename: "cancun.jpg",
    },
  },
  {
    name: "Phuket",
    description:
      "Thailand's largest island, offering stunning beaches, ornate temples, and a lively old town. A gateway to the Andaman Sea's spectacular islands and diving spots.",
    country: "Thailand",
    region: "Asia",
    category: "beach",
    priceLevel: 2,
    rating: 4.4,
    bestSeason: "Nov-Mar",
    latitude: 7.8804,
    longitude: 98.3923,
    image: {
      sourceUrl:
        "https://images.unsplash.com/photo-1589394815804-964ed0be2eb5?w=800&q=80",
      filename: "phuket.jpg",
    },
  },
  {
    name: "Santorini",
    description:
      "A dramatic volcanic island in the Aegean Sea, famous for whitewashed buildings with blue domes, breathtaking sunsets, and unique black-sand beaches.",
    country: "Greece",
    region: "Europe",
    category: "beach",
    priceLevel: 4,
    rating: 4.8,
    bestSeason: "May-Oct",
    latitude: 36.3932,
    longitude: 25.4615,
    image: {
      sourceUrl:
        "https://images.unsplash.com/photo-1570077188670-e3a8d69ac5ff?w=800&q=80",
      filename: "santorini.jpg",
    },
  },
  {
    name: "Zanzibar",
    description:
      "A semi-autonomous archipelago off Tanzania's coast, blending Swahili culture, spice plantations, and pristine white-sand beaches with turquoise waters.",
    country: "Tanzania",
    region: "Africa",
    category: "beach",
    priceLevel: 2,
    rating: 4.3,
    bestSeason: "Jun-Oct",
    latitude: -6.1659,
    longitude: 39.2026,
    image: {
      sourceUrl:
        "https://images.unsplash.com/photo-1586861635167-e5223aadc9fe?w=800&q=80",
      filename: "zanzibar.jpg",
    },
  },
  {
    name: "Maui",
    description:
      "A Hawaiian island known for the scenic Road to Hana, Haleakalā crater sunrise, world-class whale watching, and golden beaches surrounded by lush mountains.",
    country: "United States",
    region: "North America",
    category: "beach",
    priceLevel: 4,
    rating: 4.6,
    bestSeason: "Apr-Nov",
    latitude: 20.7984,
    longitude: -156.3319,
    image: {
      sourceUrl:
        "https://images.unsplash.com/photo-1542259009477-d625272157b7?w=800&q=80",
      filename: "maui.jpg",
    },
  },
  {
    name: "Boracay",
    description:
      "A small Philippine island renowned for its powdery White Beach, crystal-clear waters, and vibrant nightlife. A top tropical destination in Southeast Asia.",
    country: "Philippines",
    region: "Asia",
    category: "beach",
    priceLevel: 2,
    rating: 4.5,
    bestSeason: "Nov-May",
    latitude: 11.9674,
    longitude: 121.9248,
    image: {
      sourceUrl:
        "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800&q=80",
      filename: "boracay.jpg",
    },
  },
  {
    name: "Swiss Alps",
    description:
      "A majestic mountain range offering world-class skiing, scenic train rides, and charming alpine villages. Experience breathtaking peaks, glaciers, and pristine lakes.",
    country: "Switzerland",
    region: "Europe",
    category: "mountain",
    priceLevel: 5,
    rating: 4.8,
    bestSeason: "Jun-Sep / Dec-Mar",
    latitude: 46.8182,
    longitude: 8.2275,
    image: {
      sourceUrl:
        "https://images.unsplash.com/photo-1531366936337-7c912a4589a7?w=800&q=80",
      filename: "swiss-alps.jpg",
    },
  },
  {
    name: "Banff",
    description:
      "Canada's first national park in the Rocky Mountains, featuring turquoise glacial lakes, snow-capped peaks, abundant wildlife, and the charming town of Banff.",
    country: "Canada",
    region: "North America",
    category: "mountain",
    priceLevel: 3,
    rating: 4.7,
    bestSeason: "Jun-Sep",
    latitude: 51.4968,
    longitude: -115.9281,
    image: {
      sourceUrl:
        "https://images.unsplash.com/photo-1503614472-8c93d56e92ce?w=800&q=80",
      filename: "banff.jpg",
    },
  },
  {
    name: "Patagonia",
    description:
      "A vast wilderness at South America's southern tip shared by Argentina and Chile, featuring dramatic glaciers, rugged peaks, and pristine lakes.",
    country: "Argentina",
    region: "South America",
    category: "mountain",
    priceLevel: 3,
    rating: 4.6,
    bestSeason: "Oct-Mar",
    latitude: -49.3,
    longitude: -72.35,
    image: {
      sourceUrl:
        "https://images.unsplash.com/photo-1478827536114-da961b7f86d2?w=800&q=80",
      filename: "patagonia.jpg",
    },
  },
  {
    name: "Nepal Himalayas",
    description:
      "Home to eight of the world's fourteen highest peaks, including Mount Everest. A trekker's paradise with ancient monasteries, Sherpa culture, and awe-inspiring scenery.",
    country: "Nepal",
    region: "Asia",
    category: "mountain",
    priceLevel: 1,
    rating: 4.5,
    bestSeason: "Mar-May / Sep-Nov",
    latitude: 27.9881,
    longitude: 86.925,
    image: {
      sourceUrl:
        "https://images.unsplash.com/photo-1544735716-392fe2489ffa?w=800&q=80",
      filename: "nepal.jpg",
    },
  },
  {
    name: "Dolomites",
    description:
      "A stunning mountain range in northeastern Italy, known for dramatic limestone spires, world-class hiking trails, and charming Italian alpine villages.",
    country: "Italy",
    region: "Europe",
    category: "mountain",
    priceLevel: 4,
    rating: 4.7,
    bestSeason: "Jun-Sep",
    latitude: 46.4102,
    longitude: 11.8441,
    image: {
      sourceUrl:
        "https://images.unsplash.com/photo-1586348943529-beaae6c28db9?w=800&q=80",
      filename: "dolomites.jpg",
    },
  },
  {
    name: "Mount Fuji",
    description:
      "Japan's iconic symmetrical volcano and highest peak, a UNESCO World Heritage Site. Surrounded by five scenic lakes and stunning cherry blossom views in spring.",
    country: "Japan",
    region: "Asia",
    category: "mountain",
    priceLevel: 3,
    rating: 4.4,
    bestSeason: "Jul-Sep",
    latitude: 35.3606,
    longitude: 138.7274,
    image: {
      sourceUrl:
        "https://images.unsplash.com/photo-1490806843957-31f4c9a91c65?w=800&q=80",
      filename: "mount-fuji.jpg",
    },
  },
  {
    name: "Queenstown",
    description:
      "New Zealand's adventure capital on the shores of Lake Wakatipu, surrounded by the Remarkables mountain range. Offers bungee jumping, skiing, and stunning fjord cruises.",
    country: "New Zealand",
    region: "Oceania",
    category: "mountain",
    priceLevel: 4,
    rating: 4.6,
    bestSeason: "Jun-Aug / Dec-Feb",
    latitude: -45.0312,
    longitude: 168.6626,
    image: {
      sourceUrl:
        "https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=800&q=80",
      filename: "queenstown.jpg",
    },
  },
  {
    name: "Kyoto",
    description:
      "Japan's ancient capital, home to over 2,000 temples and shrines, traditional tea houses, geisha districts, and stunning bamboo groves. A cultural treasure trove.",
    country: "Japan",
    region: "Asia",
    category: "city",
    priceLevel: 3,
    rating: 4.8,
    bestSeason: "Mar-May / Oct-Nov",
    latitude: 35.0116,
    longitude: 135.7681,
    image: {
      sourceUrl:
        "https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?w=800&q=80",
      filename: "kyoto.jpg",
    },
  },
  {
    name: "Paris",
    description:
      "The City of Light, renowned for the Eiffel Tower, world-class museums like the Louvre, charming cafés, and exquisite cuisine. A timeless destination for art and romance.",
    country: "France",
    region: "Europe",
    category: "city",
    priceLevel: 4,
    rating: 4.7,
    bestSeason: "Apr-Jun / Sep-Oct",
    latitude: 48.8566,
    longitude: 2.3522,
    image: {
      sourceUrl:
        "https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=800&q=80",
      filename: "paris.jpg",
    },
  },
  {
    name: "Barcelona",
    description:
      "A vibrant Catalan city famous for Gaudí's architectural masterpieces, lively tapas culture, beautiful beaches, and a thriving arts scene along Las Ramblas.",
    country: "Spain",
    region: "Europe",
    category: "city",
    priceLevel: 3,
    rating: 4.6,
    bestSeason: "May-Jun / Sep-Oct",
    latitude: 41.3874,
    longitude: 2.1686,
    image: {
      sourceUrl:
        "https://images.unsplash.com/photo-1583422409516-2895a77efded?w=800&q=80",
      filename: "barcelona.jpg",
    },
  },
  {
    name: "Istanbul",
    description:
      "A transcontinental city straddling Europe and Asia, rich in Ottoman and Byzantine heritage. Visit the Hagia Sophia, Grand Bazaar, and enjoy stunning Bosphorus views.",
    country: "Turkey",
    region: "Europe",
    category: "city",
    priceLevel: 2,
    rating: 4.5,
    bestSeason: "Apr-May / Sep-Nov",
    latitude: 41.0082,
    longitude: 28.9784,
    image: {
      sourceUrl:
        "https://images.unsplash.com/photo-1524231757912-21f4fe3a7200?w=800&q=80",
      filename: "istanbul.jpg",
    },
  },
  {
    name: "New York",
    description:
      "The city that never sleeps, featuring iconic landmarks like the Statue of Liberty, Central Park, Times Square, and a world-leading culinary and cultural scene.",
    country: "United States",
    region: "North America",
    category: "city",
    priceLevel: 5,
    rating: 4.6,
    bestSeason: "Apr-Jun / Sep-Nov",
    latitude: 40.7128,
    longitude: -74.006,
    image: {
      sourceUrl:
        "https://images.unsplash.com/photo-1496442226666-8d4d0e62e6e9?w=800&q=80",
      filename: "new-york.jpg",
    },
  },
  {
    name: "Marrakech",
    description:
      "A vibrant Moroccan city known for its bustling souks, ornate palaces, aromatic gardens, and the iconic Djemaa el-Fnaa square alive with storytellers and musicians.",
    country: "Morocco",
    region: "Africa",
    category: "city",
    priceLevel: 2,
    rating: 4.4,
    bestSeason: "Mar-May / Sep-Nov",
    latitude: 31.6295,
    longitude: -7.9811,
    image: {
      sourceUrl:
        "https://images.unsplash.com/photo-1597212618440-806262de4f6b?w=800&q=80",
      filename: "marrakech.jpg",
    },
  },
  {
    name: "Singapore",
    description:
      "A futuristic city-state blending cutting-edge architecture with lush gardens, diverse hawker food culture, and a spotless urban environment in Southeast Asia.",
    country: "Singapore",
    region: "Asia",
    category: "city",
    priceLevel: 4,
    rating: 4.5,
    bestSeason: "Year-round",
    latitude: 1.3521,
    longitude: 103.8198,
    image: {
      sourceUrl:
        "https://images.unsplash.com/photo-1525625293386-3f8f99389edd?w=800&q=80",
      filename: "singapore.jpg",
    },
  },
  {
    name: "Buenos Aires",
    description:
      "Argentina's passionate capital, famous for tango, colorful La Boca neighborhood, world-class steak houses, and a vibrant European-influenced cultural scene.",
    country: "Argentina",
    region: "South America",
    category: "city",
    priceLevel: 2,
    rating: 4.3,
    bestSeason: "Mar-May / Sep-Nov",
    latitude: -34.6037,
    longitude: -58.3816,
    image: {
      sourceUrl:
        "https://images.unsplash.com/photo-1589909202802-8f4aadce1849?w=800&q=80",
      filename: "buenos-aires.jpg",
    },
  },
  {
    name: "Tuscany",
    description:
      "An Italian region of rolling hills, vineyards, olive groves, and medieval hilltop towns. Renowned for Renaissance art, fine wines, and rustic countryside cuisine.",
    country: "Italy",
    region: "Europe",
    category: "countryside",
    priceLevel: 4,
    rating: 4.7,
    bestSeason: "Apr-Jun / Sep-Oct",
    latitude: 43.7711,
    longitude: 11.2486,
    image: {
      sourceUrl:
        "https://images.unsplash.com/photo-1534445867742-43195f401b6c?w=800&q=80",
      filename: "tuscany.jpg",
    },
  },
  {
    name: "Provence",
    description:
      "A sun-drenched region in southeastern France, famous for endless lavender fields, charming villages, exceptional rosé wines, and Mediterranean-inspired cuisine.",
    country: "France",
    region: "Europe",
    category: "countryside",
    priceLevel: 3,
    rating: 4.6,
    bestSeason: "Jun-Aug",
    latitude: 43.9352,
    longitude: 6.0679,
    image: {
      sourceUrl:
        "https://images.unsplash.com/photo-1499346030926-9a72daac6c63?w=800&q=80",
      filename: "provence.jpg",
    },
  },
  {
    name: "Cotswolds",
    description:
      "A quintessentially English countryside region of honey-colored stone villages, rolling green hills, thatched-roof cottages, and charming country pubs.",
    country: "United Kingdom",
    region: "Europe",
    category: "countryside",
    priceLevel: 3,
    rating: 4.4,
    bestSeason: "May-Sep",
    latitude: 51.8306,
    longitude: -1.7472,
    image: {
      sourceUrl:
        "https://images.unsplash.com/photo-1590523741831-ab7e8b8f9c7f?w=800&q=80",
      filename: "cotswolds.jpg",
    },
  },
  {
    name: "Ubud",
    description:
      "Bali's cultural heart, surrounded by terraced rice paddies, sacred monkey forests, and artisan workshops. A haven for yoga, meditation, and traditional Balinese arts.",
    country: "Indonesia",
    region: "Asia",
    category: "countryside",
    priceLevel: 2,
    rating: 4.5,
    bestSeason: "Apr-Oct",
    latitude: -8.5069,
    longitude: 115.2625,
    image: {
      sourceUrl:
        "https://images.unsplash.com/photo-1555400038-63f5ba517a47?w=800&q=80",
      filename: "ubud.jpg",
    },
  },
  {
    name: "Luang Prabang",
    description:
      "A UNESCO World Heritage city in Laos, where gilded Buddhist temples meet French colonial architecture along the Mekong River. Famous for its morning alms ceremony.",
    country: "Laos",
    region: "Asia",
    category: "countryside",
    priceLevel: 1,
    rating: 4.3,
    bestSeason: "Nov-Mar",
    latitude: 19.8856,
    longitude: 102.135,
    image: {
      sourceUrl:
        "https://images.unsplash.com/photo-1583417319070-4a69db38a482?w=800&q=80",
      filename: "luang-prabang.jpg",
    },
  },
  {
    name: "Napa Valley",
    description:
      "California's premier wine country, featuring over 400 wineries, Michelin-starred restaurants, hot-air balloon rides, and stunning vineyard-covered landscapes.",
    country: "United States",
    region: "North America",
    category: "countryside",
    priceLevel: 4,
    rating: 4.5,
    bestSeason: "Aug-Oct",
    latitude: 38.5025,
    longitude: -122.2654,
    image: {
      sourceUrl:
        "https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=800&q=80",
      filename: "napa-valley.jpg",
    },
  },
  {
    name: "Chiang Mai",
    description:
      "A culturally rich city in northern Thailand, surrounded by misty mountains, ancient temples, vibrant night markets, and elephant sanctuaries in the lush countryside.",
    country: "Thailand",
    region: "Asia",
    category: "countryside",
    priceLevel: 1,
    rating: 4.4,
    bestSeason: "Nov-Feb",
    latitude: 18.7883,
    longitude: 98.9853,
    image: {
      sourceUrl:
        "https://images.unsplash.com/photo-1528181304800-259b08848526?w=800&q=80",
      filename: "chiang-mai.jpg",
    },
  },
];
