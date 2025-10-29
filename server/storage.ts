import { 
  type User, 
  type InsertUser,
  type Conversation,
  type InsertConversation,
  type Message,
  type InsertMessage,
  type StudioFile,
  type InsertStudioFile,
  type TerminalCommand,
  type InsertTerminalCommand
} from "@shared/schema";
import { randomUUID } from "crypto";

export interface IStorage {
  // User operations
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  // Conversation operations
  getConversations(userId: string): Promise<Conversation[]>;
  getConversation(id: string): Promise<Conversation | undefined>;
  createConversation(conversation: InsertConversation): Promise<Conversation>;
  updateConversation(id: string, updates: Partial<Conversation>): Promise<Conversation>;
  deleteConversation(id: string): Promise<void>;

  // Message operations
  getMessages(conversationId: string): Promise<Message[]>;
  getMessage(id: string): Promise<Message | undefined>;
  createMessage(message: InsertMessage): Promise<Message>;

  // Studio file operations
  getStudioFiles(userId: string): Promise<StudioFile[]>;
  getStudioFile(id: string): Promise<StudioFile | undefined>;
  createStudioFile(file: InsertStudioFile): Promise<StudioFile>;
  updateStudioFile(id: string, updates: Partial<StudioFile>): Promise<StudioFile>;
  deleteStudioFile(id: string): Promise<void>;

  // Terminal command operations
  getTerminalCommands(userId: string, limit?: number): Promise<TerminalCommand[]>;
  createTerminalCommand(command: InsertTerminalCommand): Promise<TerminalCommand>;
}

export class MemStorage implements IStorage {
  private users: Map<string, User>;
  private conversations: Map<string, Conversation>;
  private messages: Map<string, Message>;
  private studioFiles: Map<string, StudioFile>;
  private terminalCommands: Map<string, TerminalCommand>;

  constructor() {
    this.users = new Map();
    this.conversations = new Map();
    this.messages = new Map();
    this.studioFiles = new Map();
    this.terminalCommands = new Map();
  }

  // User operations
  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID();
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }

  // Conversation operations
  async getConversations(userId: string): Promise<Conversation[]> {
    return Array.from(this.conversations.values())
      .filter((c) => c.userId === userId)
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  }

  async getConversation(id: string): Promise<Conversation | undefined> {
    return this.conversations.get(id);
  }

  async createConversation(insertConversation: InsertConversation): Promise<Conversation> {
    const id = randomUUID();
    const now = new Date();
    const conversation: Conversation = {
      id,
      userId: insertConversation.userId || null,
      title: insertConversation.title,
      model: insertConversation.model,
      createdAt: now,
      updatedAt: now,
    };
    this.conversations.set(id, conversation);
    return conversation;
  }

  async updateConversation(id: string, updates: Partial<Conversation>): Promise<Conversation> {
    const conversation = this.conversations.get(id);
    if (!conversation) {
      throw new Error("Conversation not found");
    }
    const updated: Conversation = {
      ...conversation,
      ...updates,
      updatedAt: new Date(),
    };
    this.conversations.set(id, updated);
    return updated;
  }

  async deleteConversation(id: string): Promise<void> {
    this.conversations.delete(id);
    // Delete associated messages
    Array.from(this.messages.values())
      .filter((m) => m.conversationId === id)
      .forEach((m) => this.messages.delete(m.id));
  }

  // Message operations
  async getMessages(conversationId: string): Promise<Message[]> {
    return Array.from(this.messages.values())
      .filter((m) => m.conversationId === conversationId)
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  }

  async getMessage(id: string): Promise<Message | undefined> {
    return this.messages.get(id);
  }

  async createMessage(insertMessage: InsertMessage): Promise<Message> {
    const id = randomUUID();
    const message: Message = {
      ...insertMessage,
      id,
      createdAt: new Date(),
    };
    this.messages.set(id, message);
    
    // Update conversation's updatedAt timestamp
    const conversation = this.conversations.get(insertMessage.conversationId);
    if (conversation) {
      await this.updateConversation(conversation.id, {});
    }
    
    return message;
  }

  // Studio file operations
  async getStudioFiles(userId: string): Promise<StudioFile[]> {
    return Array.from(this.studioFiles.values())
      .filter((f) => f.userId === userId)
      .sort((a, b) => a.path.localeCompare(b.path));
  }

  async getStudioFile(id: string): Promise<StudioFile | undefined> {
    return this.studioFiles.get(id);
  }

  async createStudioFile(insertFile: InsertStudioFile): Promise<StudioFile> {
    const id = randomUUID();
    const now = new Date();
    const file: StudioFile = {
      id,
      userId: insertFile.userId || null,
      path: insertFile.path,
      content: insertFile.content,
      language: insertFile.language || null,
      createdAt: now,
      updatedAt: now,
    };
    this.studioFiles.set(id, file);
    return file;
  }

  async updateStudioFile(id: string, updates: Partial<StudioFile>): Promise<StudioFile> {
    const file = this.studioFiles.get(id);
    if (!file) {
      throw new Error("File not found");
    }
    const updated: StudioFile = {
      ...file,
      ...updates,
      updatedAt: new Date(),
    };
    this.studioFiles.set(id, updated);
    return updated;
  }

  async deleteStudioFile(id: string): Promise<void> {
    this.studioFiles.delete(id);
  }

  // Terminal command operations
  async getTerminalCommands(userId: string, limit: number = 50): Promise<TerminalCommand[]> {
    return Array.from(this.terminalCommands.values())
      .filter((c) => c.userId === userId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, limit);
  }

  async createTerminalCommand(insertCommand: InsertTerminalCommand): Promise<TerminalCommand> {
    const id = randomUUID();
    const command: TerminalCommand = {
      id,
      userId: insertCommand.userId || null,
      command: insertCommand.command,
      output: insertCommand.output || null,
      exitCode: insertCommand.exitCode || null,
      createdAt: new Date(),
    };
    this.terminalCommands.set(id, command);
    return command;
  }
}

export const storage = new MemStorage();
