import type { Express } from "express";
import { storage } from "./storage";
import { 
  insertConversationSchema, 
  insertMessageSchema,
  insertStudioFileSchema,
  insertTerminalCommandSchema 
} from "@shared/schema";
import { generateTherapyResponse } from "./ai/gemini";
import { generateDevResponse, generateCodeFromDescription, analyzeCode } from "./ai/milesai";
import { z } from "zod";

export function registerRoutes(app: Express) {
  // Conversation routes
  app.get("/api/conversations", async (req, res) => {
    try {
      // For demo purposes, using a mock user ID
      // In production, this would come from authenticated session
      const userId = "demo-user";
      const conversations = await storage.getConversations(userId);
      res.json(conversations);
    } catch (error) {
      console.error("Error fetching conversations:", error);
      res.status(500).json({ error: "Failed to fetch conversations" });
    }
  });

  app.post("/api/conversations", async (req, res) => {
    try {
      const userId = "demo-user";
      const data = insertConversationSchema.parse({
        ...req.body,
        userId,
      });
      const conversation = await storage.createConversation(data);
      res.json(conversation);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: error.errors });
      } else {
        console.error("Error creating conversation:", error);
        res.status(500).json({ error: "Failed to create conversation" });
      }
    }
  });

  app.patch("/api/conversations/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const updates = req.body;
      const conversation = await storage.updateConversation(id, updates);
      res.json(conversation);
    } catch (error) {
      console.error("Error updating conversation:", error);
      res.status(500).json({ error: "Failed to update conversation" });
    }
  });

  app.delete("/api/conversations/:id", async (req, res) => {
    try {
      const { id } = req.params;
      await storage.deleteConversation(id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting conversation:", error);
      res.status(500).json({ error: "Failed to delete conversation" });
    }
  });

  // Message routes
  app.get("/api/messages/:conversationId", async (req, res) => {
    try {
      const { conversationId } = req.params;
      const messages = await storage.getMessages(conversationId);
      res.json(messages);
    } catch (error) {
      console.error("Error fetching messages:", error);
      res.status(500).json({ error: "Failed to fetch messages" });
    }
  });

  app.post("/api/messages", async (req, res) => {
    try {
      const data = insertMessageSchema.parse(req.body);
      
      // Save user message
      const userMessage = await storage.createMessage(data);

      // Get conversation to determine which AI model to use
      const conversation = await storage.getConversation(data.conversationId);
      if (!conversation) {
        return res.status(404).json({ error: "Conversation not found" });
      }

      // Get all messages in conversation for context
      const allMessages = await storage.getMessages(data.conversationId);
      const messageHistory = allMessages.map((msg) => ({
        role: msg.role,
        content: msg.content,
      }));

      // Generate AI response based on model
      let aiResponse: string;
      if (conversation.model === "gemini") {
        aiResponse = await generateTherapyResponse(messageHistory);
      } else {
        aiResponse = await generateDevResponse(messageHistory);
      }

      // Save AI response
      const assistantMessage = await storage.createMessage({
        conversationId: data.conversationId,
        role: "assistant",
        content: aiResponse,
      });

      res.json({
        userMessage,
        assistantMessage,
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: error.errors });
      } else {
        console.error("Error creating message:", error);
        res.status(500).json({ error: "Failed to create message" });
      }
    }
  });

  // Studio file routes
  app.get("/api/studio/files", async (req, res) => {
    try {
      const userId = "demo-user";
      const files = await storage.getStudioFiles(userId);
      res.json(files);
    } catch (error) {
      console.error("Error fetching studio files:", error);
      res.status(500).json({ error: "Failed to fetch files" });
    }
  });

  app.post("/api/studio/files", async (req, res) => {
    try {
      const userId = "demo-user";
      const data = insertStudioFileSchema.parse({
        ...req.body,
        userId,
      });
      const file = await storage.createStudioFile(data);
      res.json(file);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: error.errors });
      } else {
        console.error("Error creating file:", error);
        res.status(500).json({ error: "Failed to create file" });
      }
    }
  });

  app.patch("/api/studio/files/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const updates = req.body;
      const file = await storage.updateStudioFile(id, updates);
      res.json(file);
    } catch (error) {
      console.error("Error updating file:", error);
      res.status(500).json({ error: "Failed to update file" });
    }
  });

  app.delete("/api/studio/files/:id", async (req, res) => {
    try {
      const { id } = req.params;
      await storage.deleteStudioFile(id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting file:", error);
      res.status(500).json({ error: "Failed to delete file" });
    }
  });

  // Terminal command routes
  app.get("/api/studio/terminal", async (req, res) => {
    try {
      const userId = "demo-user";
      const commands = await storage.getTerminalCommands(userId, 50);
      res.json(commands);
    } catch (error) {
      console.error("Error fetching terminal history:", error);
      res.status(500).json({ error: "Failed to fetch terminal history" });
    }
  });

  app.post("/api/studio/ai-assist", async (req, res) => {
    try {
      const { messages, context } = req.body;
      
      if (!messages || !Array.isArray(messages)) {
        return res.status(400).json({ error: "Messages array is required" });
      }

      const mode = context?.mode || 'assistant';
      const systemPrompt = context?.systemPrompt || 'You are a helpful coding assistant.';
      const contextInfo = context?.files ? `\n\nCurrent project files: ${context.files.join(', ')}` : '';
      
      // Prepare messages with system context
      const conversationMessages = [
        { role: 'system', content: systemPrompt + contextInfo },
        ...messages
      ];

      const response = await generateDevResponse(conversationMessages, currentModel);
      
      res.json({ response });
    } catch (error) {
      console.error("Error in AI assist:", error);
      res.status(500).json({ error: "Failed to get AI response" });
    }
  });

  app.post("/api/studio/terminal", async (req, res) => {
    try {
      const userId = "demo-user";
      const { command } = req.body;

      if (!command) {
        return res.status(400).json({ error: "Command is required" });
      }

      // In a real implementation, this would execute the command safely
      // For now, we'll simulate command execution with MilesAI
      let output: string;
      let exitCode = "0";

      try {
        // Use MilesAI to simulate command execution and provide helpful output
        const aiResponse = await generateDevResponse([
          {
            role: "user",
            content: `Simulate the output of this terminal command: ${command}\n\nProvide realistic terminal output as if this command was executed. Be concise and accurate.`,
          },
        ]);
        output = aiResponse;
      } catch (error) {
        output = "Command simulation failed. In production, this would execute real commands.";
        exitCode = "1";
      }

      const terminalCommand = await storage.createTerminalCommand({
        userId,
        command,
        output,
        exitCode,
      });

      res.json(terminalCommand);
    } catch (error) {
      console.error("Error executing command:", error);
      res.status(500).json({ error: "Failed to execute command" });
    }
  });

  // AI-specific endpoints
  app.post("/api/ai/generate-code", async (req, res) => {
    try {
      const { description } = req.body;
      if (!description) {
        return res.status(400).json({ error: "Description is required" });
      }

      const code = await generateCodeFromDescription(description);
      res.json({ code });
    } catch (error) {
      console.error("Error generating code:", error);
      res.status(500).json({ error: "Failed to generate code" });
    }
  });

  app.post("/api/ai/analyze-code", async (req, res) => {
    try {
      const { code } = req.body;
      if (!code) {
        return res.status(400).json({ error: "Code is required" });
      }

      const analysis = await analyzeCode(code);
      res.json({ analysis });
    } catch (error) {
      console.error("Error analyzing code:", error);
      res.status(500).json({ error: "Failed to analyze code" });
    }
  });
}
