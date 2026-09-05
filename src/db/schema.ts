import {
  boolean,
  integer,
  pgTable,
  serial,
  text,
  timestamp,
} from "drizzle-orm/pg-core";

export const applications = pgTable("applications", {
  id: serial("id").primaryKey(),
  tiktokUrl: text("tiktok_url").notNull(),
  followers: integer("followers").notNull(),
  postingFrequency: text("posting_frequency").notNull(),
  languages: text("languages").notNull(), // JSON array of language values
  hasPriorCollab: boolean("has_prior_collab").notNull(),
  priorAgents: text("prior_agents"),
  invitedUsers: integer("invited_users"),
  activeUsers: integer("active_users"),
  discord: text("discord").notNull(),
  email: text("email").notNull(),
  screenshot: text("screenshot"), // compressed data-URL of the Litbuy dashboard
  status: text("status").notNull().default("new"),
  createdAt: timestamp("created_at", { mode: "string" }).defaultNow().notNull(),
});

export type ApplicationRow = typeof applications.$inferSelect;
