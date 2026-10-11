import { pgTable, timestamp, uuid, text, primaryKey, unique } from "drizzle-orm/pg-core";
import { title } from "process";

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom().notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at")
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
  name: text("name").notNull().unique(),
});

export const feeds = pgTable("feeds", {
  id: uuid("id").primaryKey().defaultRandom().notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at")
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
  lastFetchedAt: timestamp("last_fetched_at").defaultNow().$onUpdate(() => new Date()),
  name: text("name"),
  url: text("url"),
  user_id: uuid("user_id").references(() => users.id, {onDelete: "cascade"}),
});

export const feed_follows = pgTable("feed_follows", {
  id: uuid("id").primaryKey().defaultRandom().notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at")
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
  user_id: uuid("user_id").references(() => users.id, {onDelete: "cascade"}).notNull(),
  feed_id: uuid("feed_id").references(() => feeds.id, {onDelete: "cascade"}).notNull()
}, (table) => [
  unique().on(table.feed_id, table.user_id)
]);

export const posts = pgTable("posts", {
  id: uuid("id").primaryKey().defaultRandom().notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at")
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
  title: text("name").notNull().unique(),
  url: text("url").unique(),
  description: text("description"),
  publishedAt:timestamp("published_at"),
  feedID: uuid("feed_id").references(() => feeds.id, {onDelete: "cascade"})
});