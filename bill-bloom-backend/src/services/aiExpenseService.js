import { generateAIContent, generateAIContentWithImage } from '../utils/aiProvider.js';
import { suggestCategory } from '../utils/aiStub.js';

export const parseExpenseText = async (text, members, currentUserId) => {
  const today = new Date().toISOString().split('T')[0];

  const memberList = members
    .map((m) => `- username: "${m.username}", _id: "${m._id}"`)
    .join('\n');

  const prompt = `
Today's date is ${today}.

You are a smart expense parser for a group expense tracking app.

Given the following natural language expense description:
"${text}"

And the following group members:
${memberList}

Extract the expense details and return ONLY a valid JSON object (no markdown, no explanation) with these exact fields:
{
  "amount": <number>,
  "description": <short title string, e.g. "Dinner">,
  "category": <one of: "Food", "Travel", "Grocery", "Rent", "Entertainment", "Utilities", "Healthcare", "Shopping", "Education", "Misc">,
  "participantIds": [<_id strings of participants mentioned, including the payer>],
  "paidById": <_id of the person who paid, or null if it is "I" / "me" / the current user>,
  "date": <ISO date string YYYY-MM-DD, infer from relative terms like "last Friday" using today's date>
}

Rules:
- If the payer is "I" or "me", set paidById to null (the system will substitute the current user's ID).
- Only include members that are mentioned by name in participantIds. Always include the payer in participantIds.
- If no participants are clearly named other than the payer, include all group members in participantIds.
- If the date cannot be determined, use today's date (${today}).
- Return ONLY the JSON object. No extra text.
`;

  try {
    const raw = await generateAIContent(prompt);

    // Strip markdown code fences if Gemini wraps the response
    const cleaned = raw
      .replace(/^```(?:json)?\s*/i, '')
      .replace(/\s*```$/, '')
      .trim();

    const parsed = JSON.parse(cleaned);

    // Resolve "I / me" payer to the current logged-in user
    if (!parsed.paidById || parsed.paidById === 'null') {
      parsed.paidById = currentUserId;
    }

    // Ensure payer is always in participants
    if (!parsed.participantIds.includes(parsed.paidById)) {
      parsed.participantIds.push(parsed.paidById);
    }

    return {
      amount: parsed.amount,
      description: parsed.description,
      category: parsed.category,
      participantIds: parsed.participantIds,
      paidById: parsed.paidById,
      date: parsed.date,
    };
  } catch (err) {
    // Fallback: if AI is unavailable or response is malformed, use keyword-based category
    const fallbackCategory = await suggestCategory(text);
    throw Object.assign(err, {
      fallbackCategory,
      message: `AI parsing failed: ${err.message}. Suggested category: ${fallbackCategory}`,
    });
  }
};

export const analysePersonalExpenses = async (categoryData, monthlyData) => {
  if (!categoryData?.length) {
    return 'No personal expenses found to analyse.';
  }

  const sorted = [...categoryData].sort((a, b) => b.value - a.value);
  const highestCat = sorted[0];
  const lowestCat = sorted[sorted.length - 1];
  const grandTotal = sorted.reduce((s, c) => s + c.value, 0);

  let trendNote = '';
  if (monthlyData?.length >= 2) {
    const lastMonth = monthlyData[monthlyData.length - 1];
    const prevMonth = monthlyData[monthlyData.length - 2];
    const diff = lastMonth.totalAmount - prevMonth.totalAmount;
    if (diff > 0) {
      trendNote = `- Monthly spending increased by \u20b9${diff.toFixed(2)} from ${prevMonth.month} to ${lastMonth.month}.`;
    } else if (diff < 0) {
      trendNote = `- Monthly spending decreased by \u20b9${Math.abs(diff).toFixed(2)} from ${prevMonth.month} to ${lastMonth.month} — good progress!`;
    }
  }

  const prompt = `
You are a personal finance assistant. Your ONLY job is to convert the pre-analysed facts below into a friendly, natural 3-4 sentence paragraph. Do NOT change, re-interpret, or re-calculate any of the facts. Do NOT mention any category or amount that is not listed here.

FACTS (treat these as absolute truth):
- Highest spending category: ${highestCat.name}, total \u20b9${highestCat.value.toFixed(2)}
- Lowest spending category: ${lowestCat.name}, total \u20b9${lowestCat.value.toFixed(2)}
- Grand total: \u20b9${grandTotal.toFixed(2)}
- All categories (ranked highest to lowest): ${sorted.map((c) => `${c.name} (\u20b9${c.value.toFixed(2)})`).join(', ')}
${trendNote}

Write the paragraph in this exact order:
Sentence 1: Mention the highest spending category and its exact total.
Sentence 2: Compliment the lowest spending category as the best managed.
Sentence 3: Suggest a practical way to reduce spending in the highest category next month.
Sentence 4 (optional): An encouraging closing line.

Output only the paragraph. No headings, no lists, no extra text.
`;

  const text = await generateAIContent(prompt);
  return text.trim();
};

export const scanBillImageService = async (base64Image) => {
  let imageData = base64Image;
  let mimeType = 'image/jpeg';

  const match = base64Image.match(/^data:(image\/\w+);base64,(.+)$/);
  if (match) {
    mimeType = match[1];
    imageData = match[2];
  }

  const prompt = `
You are looking at a photo of a bill, receipt, or invoice.

Extract a natural language summary of this bill that can be used to create an expense entry. Include:
- The total amount (use the final/grand total if multiple amounts are shown)
- A short description of what was purchased (e.g. "Dinner at restaurant", "Grocery shopping", "Cab ride")
- The date if visible on the bill

Write it as a single natural sentence, like: "I paid \u20b9800 for dinner on 25th March"
If the date is not visible, omit it from the sentence.
If you cannot read the bill clearly, describe whatever you can make out.

Output ONLY the one sentence. No extra text.
`;

  const text = await generateAIContentWithImage(prompt, imageData, mimeType);
  return text.trim();
};
