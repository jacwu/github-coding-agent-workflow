/**
 * Canonical schema entrypoint for Drizzle ORM.
 *
 * Defines the four core database tables (users, destinations, trips,
 * trip_stops) and their Drizzle relation declarations.
 */

import { relations, sql } from "drizzle-orm";
import {
  index,
  integer,
  real,
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";

// ---------------------------------------------------------------------------
// users
// ---------------------------------------------------------------------------

export const users = sqliteTable(
  "users",
  {
    id: integer("id", { mode: "number" }).primaryKey({ autoIncrement: true }),
    email: text("email").notNull(),
    passwordHash: text("password_hash").notNull(),
    name: text("name").notNull(),
    avatarUrl: text("avatar_url"),
    createdAt: text("created_at")
      .notNull()
      .default(sql`(CURRENT_TIMESTAMP)`),
  },
  (table) => [uniqueIndex("users_email_unique").on(table.email)],
);

// ---------------------------------------------------------------------------
// destinations
// ---------------------------------------------------------------------------

export const destinations = sqliteTable(
  "destinations",
  {
    id: integer("id", { mode: "number" }).primaryKey({ autoIncrement: true }),
    name: text("name").notNull(),
    description: text("description"),
    country: text("country").notNull(),
    region: text("region"),
    category: text("category").notNull(),
    priceLevel: integer("price_level").notNull(),
    rating: real("rating").notNull().default(0),
    bestSeason: text("best_season"),
    latitude: real("latitude"),
    longitude: real("longitude"),
    image: text("image").notNull(),
    createdAt: text("created_at")
      .notNull()
      .default(sql`(CURRENT_TIMESTAMP)`),
  },
  (table) => [
    index("destinations_region_idx").on(table.region),
    index("destinations_category_idx").on(table.category),
  ],
);

// ---------------------------------------------------------------------------
// trips
// ---------------------------------------------------------------------------

export const trips = sqliteTable(
  "trips",
  {
    id: integer("id", { mode: "number" }).primaryKey({ autoIncrement: true }),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    startDate: text("start_date"),
    endDate: text("end_date"),
    status: text("status").notNull().default("draft"),
    createdAt: text("created_at")
      .notNull()
      .default(sql`(CURRENT_TIMESTAMP)`),
    updatedAt: text("updated_at")
      .notNull()
      .default(sql`(CURRENT_TIMESTAMP)`),
  },
  (table) => [index("trips_user_id_idx").on(table.userId)],
);

// ---------------------------------------------------------------------------
// trip_stops
// ---------------------------------------------------------------------------

export const tripStops = sqliteTable(
  "trip_stops",
  {
    id: integer("id", { mode: "number" }).primaryKey({ autoIncrement: true }),
    tripId: integer("trip_id")
      .notNull()
      .references(() => trips.id, { onDelete: "cascade" }),
    destinationId: integer("destination_id")
      .notNull()
      .references(() => destinations.id, { onDelete: "restrict" }),
    sortOrder: integer("sort_order").notNull(),
    arrivalDate: text("arrival_date"),
    departureDate: text("departure_date"),
    notes: text("notes"),
  },
  (table) => [
    index("trip_stops_trip_id_idx").on(table.tripId),
    index("trip_stops_destination_id_idx").on(table.destinationId),
  ],
);

// ---------------------------------------------------------------------------
// Relations
// ---------------------------------------------------------------------------

export const usersRelations = relations(users, ({ many }) => ({
  trips: many(trips),
}));

export const destinationsRelations = relations(destinations, ({ many }) => ({
  tripStops: many(tripStops),
}));

export const tripsRelations = relations(trips, ({ one, many }) => ({
  user: one(users, {
    fields: [trips.userId],
    references: [users.id],
  }),
  stops: many(tripStops),
}));

export const tripStopsRelations = relations(tripStops, ({ one }) => ({
  trip: one(trips, {
    fields: [tripStops.tripId],
    references: [trips.id],
  }),
  destination: one(destinations, {
    fields: [tripStops.destinationId],
    references: [destinations.id],
  }),
}));
