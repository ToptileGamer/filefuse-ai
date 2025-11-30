// server.js
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import Groq from "groq-sdk";

dotenv.config();

const app = express();

// ----------------------
// CORS CONFIGURATION
// ----------------------
app.use(
  cors({
    origin: [
      "http://localhost:5500",
      "http://127.0.0.1:5500",
      "https://filmfuseai.netlify.app", // your Netlify frontend
    ],
    methods: ["GET", "POST"],
  })
);

app.use(express.json());

// ----------------------
// GROQ CLIENT
// ----------------------
if (!process.env.GROQ_API_KEY) {
  console.warn("⚠ GROQ_API_KEY is not set in environment variables!");
}

const client = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

// ----------------------
// RECOMMENDATION API
// ----------------------
app.post("/api/recommend", async (req, res) => {
  try {
    const { languages, genres, mood, age } = req.body;

    const prompt = `
Return STRICT JSON only. No extra commentary.

Generate 10 movie recommendations based on:

Languages: ${JSON.stringify(languages)}
Genres: ${JSON.stringify(genres)}
Mood: ${JSON.stringify(mood)}
Age Rating: ${JSON.stringify(age)}

Return JSON exactly in this shape:

{
  "movies": [
    {
      "title": "",
      "year": 0,
      "language": "",
      "age_rating": "",
      "genres": [],
      "mood_tags": [],
      "short_reason": ""
    }
  ]
}
`;

    const result = await client.chat.completions.create({
      // modern Groq Llama 3.1 model
      model: "llama-3.1-70b-versatile",
      response_format: { type: "json_object" }, // force JSON
      temperature: 0.6,
      messages: [
        {
          role: "system",
          content: "You must ALWAYS respond with valid JSON only.",
        },
        { role: "user", content: prompt },
      ],
    });

    const content = result?.choices?.[0]?.message?.content?.trim() || "";

    let json;
    try {
      json = JSON.parse(content);
    } catch (parseErr) {
      console.error("❌ JSON parse failed. Raw Groq content:\n", content);
      throw new Error("Groq returned invalid JSON");
    }

    if (!json.movies || !Array.isArray(json.movies)) {
      console.error("❌ JSON did not contain movies[]:\n", json);
      throw new Error("Groq JSON had wrong shape");
    }

    res.json(json);
  } catch (error) {
    console.error("🔥 Groq / backend error:", error);

    const msg =
      error?.response?.data?.error?.message ||
      error?.message ||
      "AI failed to generate JSON";

    res.status(500).json({ error: msg });
  }
});

// ----------------------
// PORT (LOCAL + RENDER)
// ----------------------
const PORT = process.env.PORT || 4000;

app.listen(PORT, () => {
  console.log(`FilmFuseAI backend running on port ${PORT}`);
});
