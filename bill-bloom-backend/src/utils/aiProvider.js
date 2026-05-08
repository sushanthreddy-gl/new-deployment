import { GoogleGenAI } from '@google/genai';

export const generateAIContent = async (prompt) => {
  const aiClient = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY,
  });
  const AI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash';

  const result = await aiClient.models.generateContent({
    model: AI_MODEL,
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
  });

  if (!result || !result.text) {
    throw new Error('No response received from AI API');
  }

  return result.text;
};

export const generateAIContentWithImage = async (prompt, base64Image, mimeType) => {
  const aiClient = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY,
  });
  const AI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash';

  const result = await aiClient.models.generateContent({
    model: AI_MODEL,
    contents: [
      {
        role: 'user',
        parts: [
          { text: prompt },
          { inlineData: { data: base64Image, mimeType } },
        ],
      },
    ],
  });

  if (!result || !result.text) {
    throw new Error('No response received from AI API');
  }

  return result.text;
};
