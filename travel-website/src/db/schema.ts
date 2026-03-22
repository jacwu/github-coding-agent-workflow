import { sqliteTable, integer, text, real, index, uniqueIndex, check } from "drizzle-orm/sqlite-core";
import { relations, sql } from "drizzle-orm";

// ─── Users ──────────────────────────────────────────────────────────────────

export const users = sqliteTable("users", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  name: text("name").notNull(),
  avatarUrl: text("avatar_url"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

// ─── Destinations ───────────────────────────────────────────────────────────

export const destinations = sqliteTable(
  "destinations",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
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
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    check("destinations_price_level_check", sql`${table.priceLevel} >= 1 AND ${table.priceLevel} <= 5`),
    check("destinations_rating_check", sql`${table.rating} >= 0 AND ${table.rating} <= 5`),
  ],
);

// ─── Trips ──────────────────────────────────────────────────────────────────

export const trips = sqliteTable(
  "trips",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    startDate: text("start_date"),
    endDate: text("end_date"),
    status: text("status").notNull().default("draft"),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    index("trips_user_id_idx").on(table.userId),
    check("trips_status_check", sql`${table.status} IN ('draft', 'planned', 'completed')`),
  ],
);

// ─── Trip Stops ─────────────────────────────────────────────────────────────

export const tripStops = sqliteTable(
  "trip_stops",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    tripId: integer("trip_id").notNull().references(() => trips.id, { onDelete: "cascade" }),
    destinationId: integer("destination_id").notNull().references(() => destinations.id, { onDelete: "restrict" }),
    sortOrder: integer("sort_order").notNull(),
    arrivalDate: text("arrival_date"),
    departureDate: text("departure_date"),
    notes: text("notes"),
  },
  (table) => [
    index("trip_stops_trip_id_idx").on(table.tripId),
    uniqueIndex("trip_stops_trip_id_sort_order_idx").on(table.tripId, table.sortOrder),
  ],
);

// ─── Relations ──────────────────────────────────────────────────────────────

export const usersRelations = relations(users, ({ many }) => ({
  trips: many(trips),
}));

export const destinationsRelations = relations(destinations, ({ many }) => ({
  tripStops: many(tripStops),
}));

export const tripsRelations = relations(trips, ({ one, many }) => ({
  user: one(users, { fields: [trips.userId], references: [users.id] }),
  tripStops: many(tripStops),
}));

export const tripStopsRelations = relations(tripStops, ({ one }) => ({
  trip: one(trips, { fields: [tripStops.tripId], references: [trips.id] }),
  destination: one(destinations, { fields: [tripStops.destinationId], references: [destinations.id] }),
}));

// ─── Type Exports ───────────────────────────────────────────────────────────

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Destination = typeof destinations.$inferSelect;
export type NewDestination = typeof destinations.$inferInsert;
export type Trip = typeof trips.$inferSelect;
export type NewTrip = typeof trips.$inferInsert;
export type TripStop = typeof tripStops.$inferSelect;
export type NewTripStop = typeof tripStops.$inferInsert;
