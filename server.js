// backend/server.js – FilmFuseAI backend using Groq (Llama 3.1)

import express from "express";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const GROQ_API_KEY = process.env.GROQ_API_KEY;
const PORT = process.env.PORT || 4000;

console.log("GROQ_API_KEY starts with:", (GROQ_API_KEY || "").slice(0, 4));
if (!GROQ_API_KEY) {
  console.error("❌ GROQ_API_KEY missing in .env");
}

const GROQ_ENDPOINT = "https://api.groq.com/openai/v1/chat/completions";
// Stable, up-to-date model
const GROQ_MODEL = "llama-3.1-8b-instant";

// ---- Helper to call Groq and get JSON text ----
async function callGroqForMovies(promptText) {
  const body = {
    model: GROQ_MODEL,
    temperature: 0.4,
    messages: [
      {
        role: "system",
        content: `
You are FilmFuseAI, an AI movie recommendation engine.

You must ALWAYS respond with a single JSON object of this exact shape and nothing else:

{
  "movies": [
    {
      "title": "string",
      "year": 2010,
      "language": "english",
      "age_rating": "13+",
      "genres": ["action", "thriller"],
      "mood_tags": ["intense", "mind-bending"],
      "short_reason": "1–2 short sentences why this matches the user."
    }
  ]
}

Rules:
- 4–8 movies.
- Respect the user's languages, genres, mood & age rating as much as possible.
- "language" must be lowercase (english, hindi, korean, japanese, spanish, other).
- JSON must be strictly valid:
  - no comments
  - no trailing commas
  - all keys & strings in double quotes
- Do NOT include any text before or after the JSON.
- Do NOT include markdown fences like \`\`\`json.
        `.trim(),
      },
      {
        role: "user",
        content: promptText,
      },
    ],
  };

  const res = await fetch(GROQ_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${GROQ_API_KEY}`,
    },
    body: JSON.stringify(body),
  });

  const raw = await res.text();

  if (!res.ok) {
    console.error("Groq HTTP error:", res.status, raw);
    throw new Error(`Groq API error ${res.status}: ${raw}`);
  }

  let data;
  try {
    data = JSON.parse(raw);
  } catch (e) {
    throw new Error("Failed to parse Groq top-level JSON: " + raw);
  }

  const content = data.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error("Groq returned no message content.");
  }

  return content.trim(); // JSON text
}

// ---- POST /api/recommend ----
app.post("/api/recommend", async (req, res) => {
  try {
    const { languages = [], genres = [], mood = null, age = null } = req.body;

    const userPrefs = `
languages: ${languages.length ? languages.join(", ") : "any"}
genres: ${genres.length ? genres.join(", ") : "any"}
mood: ${mood || "any"}
age rating: ${age || "any"}
    `.trim();

    const userPrompt = `User preferences:\n${userPrefs}`;

    const jsonText = await callGroqForMovies(userPrompt);
    console.log("Raw Groq JSON text:", jsonText);

    // Clean up any wrappers
    let cleaned = jsonText.replace(/```json|```/gi, "").trim();

    const firstBrace = cleaned.indexOf("{");
    const lastBrace = cleaned.lastIndexOf("}");
    if (firstBrace !== -1 && lastBrace !== -1) {
      cleaned = cleaned.slice(firstBrace, lastBrace + 1);
    }

    let json;
    try {
      json = JSON.parse(cleaned);
    } catch (e) {
      console.error("Failed to parse FilmFuseAI JSON:", e, "\nCleaned:", cleaned);
      return res.status(500).json({
        error: "AI returned invalid JSON. Check server logs.",
      });
    }

    if (!json.movies || !Array.isArray(json.movies)) {
      console.error("FilmFuseAI JSON missing 'movies' array:", json);
      return res.status(500).json({
        error: "AI response missing 'movies' array.",
      });
    }

    res.json({ movies: json.movies });
  } catch (err) {
    console.error("FilmFuseAI error:", err);
    res.status(500).json({
      error: err.message || "AI failed to generate recommendations.",
    });
  }
});

app.listen(PORT, () => {
  console.log(`FilmFuseAI backend (Groq) running on http://localhost:${PORT}`);
});
