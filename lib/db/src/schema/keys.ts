import { pgTable, text, serial, timestamp, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const keysTable = pgTable("keys", {
  id: serial("id").primaryKey(),
  key: text("key").notNull().unique(),
  label: text("label"),
  duration: text("duration").notNull().default("lifetime"),
  maxDevices: integer("max_devices").notNull().default(0),
  expiresAt: timestamp("expires_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const keyHwidsTable = pgTable("key_hwids", {
  id: serial("id").primaryKey(),
  keyId: integer("key_id").notNull().references(() => keysTable.id, { onDelete: "cascade" }),
  hwid: text("hwid").notNull(),
  registeredAt: timestamp("registered_at").notNull().defaultNow(),
});

export const insertKeySchema = createInsertSchema(keysTable).omit({ id: true, createdAt: true });
export type InsertKey = z.infer<typeof insertKeySchema>;
export type Key = typeof keysTable.$inferSelect;
export type KeyHwid = typeof keyHwidsTable.$inferSelect;
