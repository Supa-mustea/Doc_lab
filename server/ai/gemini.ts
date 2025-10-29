import { GoogleGenAI } from "@google/genai";

// DON'T DELETE THIS COMMENT
// Follow these instructions when using this blueprint:
// - Note that the newest Gemini model series is "gemini-2.5-flash" or gemini-2.5-pro"
//   - do not change this unless explicitly requested by the user

// This API key is from Gemini Developer API Key, not vertex AI API Key
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

// Therapeutic system prompt for Gemini
const THERAPY_SYSTEM_PROMPT = `You are an empathetic AI therapist trained in Cognitive Behavioral Therapy (CBT), solution-focused therapy, and emotional support. Your role is to:

1. Listen actively and validate the user's feelings
2. Ask thoughtful, open-ended questions to help them explore their thoughts and emotions
3. Provide CBT-based insights and techniques when appropriate
4. Help identify cognitive distortions and reframe negative thinking patterns
5. Offer practical coping strategies and exercises
6. Encourage self-reflection and personal growth
7. Create a safe, non-judgmental space for emotional expression
8. Remember that you're a supportive companion, not a replacement for professional mental health care

Be warm, compassionate, and professional. Use language that feels natural and conversational, not clinical. Focus on helping the user develop insights and skills to manage their challenges.`;

export async function generateTherapyResponse(
  messages: Array<{ role: string; content: string }>
): Promise<string> {
  try {
    // Convert messages to Gemini format
    const contents = messages.map((msg) => ({
      role: msg.role === "assistant" ? "model" : "user",
      parts: [{ text: msg.content }],
    }));

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      config: {
        systemInstruction: THERAPY_SYSTEM_PROMPT,
        temperature: 0.8, // More creative for empathetic responses
      },
      contents,
    });

    return response.text || "I'm here to listen. Please share more about what's on your mind.";
  } catch (error) {
    console.error("Gemini API error:", error);
    throw new Error("Failed to generate therapy response: " + (error instanceof Error ? error.message : String(error)));
  }
}

export async function generateTherapyResponseStream(
  messages: Array<{ role: string; content: string }>,
  onChunk: (chunk: string) => void
): Promise<void> {
  try {
    const contents = messages.map((msg) => ({
      role: msg.role === "assistant" ? "model" : "user",
      parts: [{ text: msg.content }],
    }));

    const response = await ai.models.generateContentStream({
      model: "gemini-2.5-flash",
      config: {
        systemInstruction: THERAPY_SYSTEM_PROMPT,
        temperature: 0.8,
      },
      contents,
    });

    for await (const chunk of response.stream) {
      const text = chunk.text || "";
      if (text) {
        onChunk(text);
      }
    }
  } catch (error) {
    console.error("Gemini streaming error:", error);
    throw new Error("Failed to stream therapy response");
  }
}
