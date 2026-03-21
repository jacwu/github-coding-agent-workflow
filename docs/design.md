# Travel Website — Technical Design Document

## 1. Tech Stack

| Layer | Technology | Description |
|---|---|---|
| Frontend | Next.js 15 (App Router) | React framework with SSR/SSG support |
| UI Components | Tailwind CSS + shadcn/ui | Rapid responsive UI development |
| State Management | React Context + SWR | Lightweight data fetching and caching |
| Backend | Next.js API Routes (TypeScript) | Full-stack unified; no separate backend service |
| Database | SQLite (better-sqlite3) | Zero-install embedded database |
| ORM | Drizzle ORM | Type-safe, lightweight, native SQLite support |
| Authentication | NextAuth.js (Credentials Provider) | Email/password login with JWT sessions |
| Images | Unsplash / Pexels CDN | Destination images sourced from public CDNs |

---

## 2. Visual Design & UI Style

Given the travel-oriented nature of the platform, the overall UI adopts a **"Light & Airy Vacation Style"**, aiming to minimize interface boundaries and let scenic images take center stage.

- **Color Palette**:
  - **Primary color**: **Ocean Teal**, used for buttons, links, filter highlights, and key actions to unify the site's visual identity.
  - **Secondary colors**: Sandy beige and light gray-white for backgrounds and content sections, keeping pages clean and airy.
  - **Background colors**: Minimalist white and light gray-white (`bg-slate-50` or `bg-gray-50`) alternating to create a sense of breathing room.
- **Typography & Spacing**:
  - Use a modern sans-serif font (Next.js default Inter/Geist is sufficient).
  - Generous whitespace and wide spacing to avoid the claustrophobic feel of dense information.
- **Component Styles**:
  - **Border Radius**: Extensively use large border radii (`rounded-2xl` or `rounded-3xl`) on cards for a friendly, approachable look.
  - **Shadows**: Replace hard, prominent borders with soft, physically floating shadows (`shadow-sm`, elevating to `shadow-xl` on hover).
  - **Glassmorphism**: Top navigation bar and floating labels over images use a semi-transparent frosted glass effect (`backdrop-blur-md`).


---

## 3. Project Structure

The repository root keeps workflow documents and automation scripts, while all application source code, configuration, and static assets are generated under the `travel-website/` directory.

```
root/
├── AGENTS.md
├── README.md
├── docs/
│   ├── requirements.md
│   ├── design.md
│   ├── tasks.md
│   └── tasks/
├── scripts/
└── travel-website/
  ├── AGENTS.md
  ├── public/
  │   └── images/
  │       └── destinations/
  ├── src/
  │   ├── app/                    # Next.js App Router
  │   │   ├── (auth)/
  │   │   │   ├── login/page.tsx
  │   │   │   └── register/page.tsx
  │   │   ├── destinations/
  │   │   │   ├── page.tsx        # Destination list
  │   │   │   └── [id]/page.tsx   # Destination detail
  │   │   ├── trips/
  │   │   │   ├── page.tsx        # Trip list
  │   │   │   └── [id]/page.tsx   # Trip detail/edit
  │   │   ├── about/page.tsx      # About page
  │   │   ├── api/                # API Routes
  │   │   │   ├── auth/register/route.ts
  │   │   │   ├── auth/[...nextauth]/route.ts
  │   │   │   ├── destinations/route.ts
  │   │   │   ├── destinations/[id]/route.ts
  │   │   │   ├── trips/route.ts
  │   │   │   ├── trips/[id]/route.ts
  │   │   │   └── trips/[id]/stops/route.ts
  │   │   ├── layout.tsx
  │   │   └── page.tsx            # Root path, redirects to /destinations
  │   ├── components/
  │   │   ├── ui/                 # shadcn/ui components
  │   │   ├── DestinationCard.tsx
  │   │   ├── SearchBar.tsx
  │   │   ├── TripEditor.tsx
  │   │   └── Navbar.tsx
  │   ├── db/
  │   │   ├── index.ts            # Database connection
  │   │   ├── schema.ts           # Drizzle schema definitions
  │   │   └── seed.ts             # Seed data
  │   ├── lib/
  │   │   ├── auth.ts             # NextAuth configuration
  │   │   └── utils.ts
  │   └── types/
  │       └── index.ts            # Global type definitions
  ├── drizzle.config.ts
  ├── package.json
  └── tsconfig.json
```

---

## 4. Database Design

### 4.1 ER Relationships

```
users 1──N trips
trips 1──N trip_stops
trip_stops N──1 destinations
```

### 4.2 Table Schemas

#### users — User Table

| Field | Type | Constraints | Description |
|---|---|---|---|
| id | INTEGER | PK, AUTOINCREMENT | User ID |
| email | TEXT | UNIQUE, NOT NULL | Email address |
| password_hash | TEXT | NOT NULL | bcrypt password hash |
| name | TEXT | NOT NULL | Username |
| avatar_url | TEXT | | Avatar URL |
| created_at | TEXT | DEFAULT CURRENT_TIMESTAMP | Creation timestamp |

#### destinations — Destination Table

| Field | Type | Constraints | Description |
|---|---|---|---|
| id | INTEGER | PK, AUTOINCREMENT | Destination ID |
| name | TEXT | NOT NULL | Destination name |
| description | TEXT | | Detailed description |
| country | TEXT | NOT NULL | Country |
| region | TEXT | | Region (Asia, Europe, etc.) |
| category | TEXT | NOT NULL | Category: beach / mountain / city / countryside |
| price_level | INTEGER | NOT NULL | Price level 1–5 |
| rating | REAL | DEFAULT 0 | Average rating 0–5 |
| best_season | TEXT | | Best travel season |
| latitude | REAL | | Latitude |
| longitude | REAL | | Longitude |
| image | TEXT | NOT NULL | Local image filename (stored in travel-website/public/images/destinations/) |
| created_at | TEXT | DEFAULT CURRENT_TIMESTAMP | Creation timestamp |

> Images are downloaded from Unsplash/Pexels CDN to the `travel-website/public/images/destinations/` directory when the seed script runs. The frontend accesses them via `/images/destinations/{filename}`.

#### trips — Trip Table

| Field | Type | Constraints | Description |
|---|---|---|---|
| id | INTEGER | PK, AUTOINCREMENT | Trip ID |
| user_id | INTEGER | FK → users.id, NOT NULL | Owning user |
| title | TEXT | NOT NULL | Trip title |
| start_date | TEXT | | Departure date |
| end_date | TEXT | | Return date |
| status | TEXT | DEFAULT 'draft' | Status: draft / planned / completed |
| created_at | TEXT | DEFAULT CURRENT_TIMESTAMP | Creation timestamp |
| updated_at | TEXT | DEFAULT CURRENT_TIMESTAMP | Last updated timestamp |

#### trip_stops — Trip Stop Table

| Field | Type | Constraints | Description |
|---|---|---|---|
| id | INTEGER | PK, AUTOINCREMENT | Stop ID |
| trip_id | INTEGER | FK → trips.id, NOT NULL | Associated trip |
| destination_id | INTEGER | FK → destinations.id, NOT NULL | Associated destination |
| sort_order | INTEGER | NOT NULL | Stop order |
| arrival_date | TEXT | | Arrival date |
| departure_date | TEXT | | Departure date |
| notes | TEXT | | Notes |

---

## 5. API Design

### 5.1 Authentication

| Method | Path | Description |
|---|---|---|
| POST | `/api/auth/register` | Register a new user |
| POST | `/api/auth/[...nextauth]` | NextAuth login/logout |

**POST /api/auth/register**

Request:
```json
{
  "email": "user@example.com",
  "password": "securepassword",
  "name": "Alice"
}
```

Response `201`:
```json
{
  "id": 1,
  "email": "user@example.com",
  "name": "Alice"
}
```

### 5.2 Destinations

| Method | Path | Description |
|---|---|---|
| GET | `/api/destinations` | Get destination list (supports search, filtering, pagination) |
| GET | `/api/destinations/:id` | Get destination details (with image) |

**GET /api/destinations**

Query Parameters:

| Parameter | Type | Description |
|---|---|---|
| q | string | Keyword search |
| region | string | Region filter |
| category | string | Category filter |
| price_min | number | Minimum price level |
| price_max | number | Maximum price level |
| sort | string | Sort by: rating / price / popularity |
| page | number | Page number, default 1 |
| limit | number | Items per page, default 12 |

Response `200`:
```json
{
  "data": [
    {
      "id": 1,
      "name": "Bali",
      "country": "Indonesia",
      "category": "beach",
      "price_level": 2,
      "rating": 4.7,
      "image": "/images/destinations/bali.jpg"
    }
  ],
  "total": 30,
  "page": 1,
  "limit": 12
}
```

**GET /api/destinations/:id**

Response `200`:
```json
{
  "id": 1,
  "name": "Bali",
  "description": "A tropical paradise...",
  "country": "Indonesia",
  "region": "Asia",
  "category": "beach",
  "price_level": 2,
  "rating": 4.7,
  "best_season": "Apr-Oct",
  "latitude": -8.3405,
  "longitude": 115.092,
  "image": "/images/destinations/bali.jpg"
}
```

### 5.3 Trips

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/api/trips` | ✅ | Get the current user's trip list |
| POST | `/api/trips` | ✅ | Create a new trip |
| GET | `/api/trips/:id` | ✅ | Get trip details (with stops) |
| PUT | `/api/trips/:id` | ✅ | Update trip information |
| DELETE | `/api/trips/:id` | ✅ | Delete a trip |
| POST | `/api/trips/:id/stops` | ✅ | Add a stop |
| PUT | `/api/trips/:id/stops` | ✅ | Bulk update stop order |
| DELETE | `/api/trips/:id/stops/:stopId` | ✅ | Delete a stop |

**POST /api/trips**

Request:
```json
{
  "title": "Southeast Asia 2026",
  "start_date": "2026-07-01",
  "end_date": "2026-07-15"
}
```

Response `201`:
```json
{
  "id": 1,
  "title": "Southeast Asia 2026",
  "start_date": "2026-07-01",
  "end_date": "2026-07-15",
  "status": "draft",
  "stops": []
}
```

**POST /api/trips/:id/stops**

Request:
```json
{
  "destination_id": 1,
  "arrival_date": "2026-07-01",
  "departure_date": "2026-07-05",
  "notes": "Visit temples and beaches"
}
```

**PUT /api/trips/:id/stops** (Bulk Reorder)

Request:
```json
{
  "stops": [
    { "id": 3, "sort_order": 1 },
    { "id": 1, "sort_order": 2 },
    { "id": 2, "sort_order": 3 }
  ]
}
```

---

## 6. Seed Data — Destination Image Strategy

The seed script `seed.ts` downloads images from Unsplash/Pexels CDN into the `travel-website/public/images/destinations/` directory and stores the local filenames in the database.

**Workflow:**
1. Define destination data including CDN source URLs.
2. When the seed script runs, download images one by one to `travel-website/public/images/destinations/`.
3. Store the local filename (not the CDN URL) in the `image` field of the `destinations` table.
4. The frontend accesses images via Next.js static assets at `/images/destinations/{filename}`.

### 6.1 Complete Seed Destination List

A total of 30 destinations covering 4 categories × multiple regions, ensuring sufficient data for list page filtering and search.

| # | name | country | region | category | price_level | rating | best_season | filename |
|---|---|---|---|---|---|---|---|---|
| 1 | Bali | Indonesia | Asia | beach | 2 | 4.7 | Apr-Oct | bali.jpg |
| 2 | Maldives | Maldives | Asia | beach | 5 | 4.9 | Nov-Apr | maldives.jpg |
| 3 | Cancún | Mexico | North America | beach | 3 | 4.5 | Dec-Apr | cancun.jpg |
| 4 | Phuket | Thailand | Asia | beach | 2 | 4.4 | Nov-Mar | phuket.jpg |
| 5 | Santorini | Greece | Europe | beach | 4 | 4.8 | May-Oct | santorini.jpg |
| 6 | Zanzibar | Tanzania | Africa | beach | 2 | 4.3 | Jun-Oct | zanzibar.jpg |
| 7 | Maui | United States | North America | beach | 4 | 4.6 | Apr-Nov | maui.jpg |
| 8 | Boracay | Philippines | Asia | beach | 2 | 4.5 | Nov-May | boracay.jpg |
| 9 | Swiss Alps | Switzerland | Europe | mountain | 5 | 4.8 | Jun-Sep / Dec-Mar | swiss-alps.jpg |
| 10 | Banff | Canada | North America | mountain | 3 | 4.7 | Jun-Sep | banff.jpg |
| 11 | Patagonia | Argentina | South America | mountain | 3 | 4.6 | Oct-Mar | patagonia.jpg |
| 12 | Nepal Himalayas | Nepal | Asia | mountain | 1 | 4.5 | Mar-May / Sep-Nov | nepal.jpg |
| 13 | Dolomites | Italy | Europe | mountain | 4 | 4.7 | Jun-Sep | dolomites.jpg |
| 14 | Mount Fuji | Japan | Asia | mountain | 3 | 4.4 | Jul-Sep | mount-fuji.jpg |
| 15 | Queenstown | New Zealand | Oceania | mountain | 4 | 4.6 | Jun-Aug / Dec-Feb | queenstown.jpg |
| 16 | Kyoto | Japan | Asia | city | 3 | 4.8 | Mar-May / Oct-Nov | kyoto.jpg |
| 17 | Paris | France | Europe | city | 4 | 4.7 | Apr-Jun / Sep-Oct | paris.jpg |
| 18 | Barcelona | Spain | Europe | city | 3 | 4.6 | May-Jun / Sep-Oct | barcelona.jpg |
| 19 | Istanbul | Turkey | Europe | city | 2 | 4.5 | Apr-May / Sep-Nov | istanbul.jpg |
| 20 | New York | United States | North America | city | 5 | 4.6 | Apr-Jun / Sep-Nov | new-york.jpg |
| 21 | Marrakech | Morocco | Africa | city | 2 | 4.4 | Mar-May / Sep-Nov | marrakech.jpg |
| 22 | Singapore | Singapore | Asia | city | 4 | 4.5 | Year-round | singapore.jpg |
| 23 | Buenos Aires | Argentina | South America | city | 2 | 4.3 | Mar-May / Sep-Nov | buenos-aires.jpg |
| 24 | Tuscany | Italy | Europe | countryside | 4 | 4.7 | Apr-Jun / Sep-Oct | tuscany.jpg |
| 25 | Provence | France | Europe | countryside | 3 | 4.6 | Jun-Aug | provence.jpg |
| 26 | Cotswolds | United Kingdom | Europe | countryside | 3 | 4.4 | May-Sep | cotswolds.jpg |
| 27 | Ubud | Indonesia | Asia | countryside | 2 | 4.5 | Apr-Oct | ubud.jpg |
| 28 | Luang Prabang | Laos | Asia | countryside | 1 | 4.3 | Nov-Mar | luang-prabang.jpg |
| 29 | Napa Valley | United States | North America | countryside | 4 | 4.5 | Aug-Oct | napa-valley.jpg |
| 30 | Chiang Mai | Thailand | Asia | countryside | 1 | 4.4 | Nov-Feb | chiang-mai.jpg |

> The `description`, `latitude`, and `longitude` for each entry are populated internally by the seed script and are not listed here.

### 6.2 Image Download Example Code

```typescript
const destinations = [
  {
    name: "Bali",
    country: "Indonesia",
    region: "Asia",
    category: "beach",
    price_level: 2,
    rating: 4.7,
    best_season: "Apr-Oct",
    image: { source: "https://images.unsplash.com/photo-1537996194471-e657df975ab4?w=800&q=80", filename: "bali.jpg" },
  },
  {
    name: "Kyoto",
    country: "Japan",
    region: "Asia",
    category: "city",
    price_level: 3,
    rating: 4.8,
    best_season: "Mar-May / Oct-Nov",
    image: { source: "https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?w=800&q=80", filename: "kyoto.jpg" },
  },
  // ... remaining 28 destinations follow the same pattern
];
```

---

## 7. Page Routes

| Path | Page | Auth |
|---|---|---|
| `/` | Redirects to `/destinations` | No |
| `/login` | Login | No |
| `/register` | Register | No |
| `/destinations` | Destination list — search/filter | No |
| `/destinations/:id` | Destination detail | No |
| `/trips` | My trip list | ✅ |
| `/trips/:id` | Trip detail/edit | ✅ |
| `/about` | About us | No |

---

## 8. Unit Testing

- **Testing framework**: Backend unit tests use Vitest exclusively.
- **Test file location**: Test files are co-located with source files in the same directory.
- **Naming convention**: Test files follow the `*.test.ts` naming pattern.
