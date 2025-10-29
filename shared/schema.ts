import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, jsonb, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// User schema
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

// Conversation schema - tracks chat sessions with either Gemini or MilesAI
export const conversations = pgTable("conversations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id),
  title: text("title").notNull(),
  model: text("model").notNull(), // "gemini" or "milesai"
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertConversationSchema = createInsertSchema(conversations).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertConversation = z.infer<typeof insertConversationSchema>;
export type Conversation = typeof conversations.$inferSelect;

// Message schema - individual messages in a conversation
export const messages = pgTable("messages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  conversationId: varchar("conversation_id").references(() => conversations.id).notNull(),
  role: text("role").notNull(), // "user" or "assistant"
  content: text("content").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertMessageSchema = createInsertSchema(messages).omit({
  id: true,
  createdAt: true,
});

export type InsertMessage = z.infer<typeof insertMessageSchema>;
export type Message = typeof messages.$inferSelect;

// Studio file schema - files managed in the Studio workspace
export const studioFiles = pgTable("studio_files", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id),
  path: text("path").notNull(), // Full file path including directories
  content: text("content").notNull(),
  language: text("language"), // Programming language for syntax highlighting
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertStudioFileSchema = createInsertSchema(studioFiles).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertStudioFile = z.infer<typeof insertStudioFileSchema>;
export type StudioFile = typeof studioFiles.$inferSelect;

// Terminal command history
export const terminalCommands = pgTable("terminal_commands", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id),
  command: text("command").notNull(),
  output: text("output"),
  exitCode: text("exit_code"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertTerminalCommandSchema = createInsertSchema(terminalCommands).omit({
  id: true,
  createdAt: true,
});

export type InsertTerminalCommand = z.infer<typeof insertTerminalCommandSchema>;
export type TerminalCommand = typeof terminalCommands.$inferSelect;
