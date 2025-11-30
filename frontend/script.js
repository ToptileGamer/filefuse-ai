import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { Groq } from "groq-sdk";

dotenv.config();

const app = express();

// ----------------------
// CORS CONFIG
// ----------------------
app.use(
  cors({
    origin: [
      "http://localhost:5500",     // Local frontend
      "http://127.0.0.1:5500",
      process.env.FRONTEND_URL     // Netlify URL (set this in Render env vars)
    ],
    methods: ["GET", "POST"],
  })
);

app.use(express.json());

// ----------------------
// GROQ CLIENT
// ----------------------
const client = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

// ----------------------
// API ROUTE
// ----------------------
app.post("/api/recommend", async (req, res) => {
  try {
    const { languages, genres, moods, age } = req.body;

    const prompt = `
Generate a JSON list of 10 movies based on:

Languages: ${languages}
Genres: ${genres}
Moods: ${moods}
Age Rating: ${age}

Return STRICT JSON (no markdown, no commentary):

{
  "movies": [
    {
      "title": "",
      "year": "",
      "language": "",
      "age_rating": "",
      "genres": [],
      "mood_tags": [],
      "short_reason": ""
    }
  ]
}
`;

    const response = await client.chat.completions.create({
      model: "llama3-8b-8192",
      messages: [
        { role: "system", content: "Return ONLY valid JSON." },
        { role: "user", content: prompt }
      ],
      temperature: 0.7,
      response_format: { type: "json_object" }   // Forces valid JSON output
    });

    const json = JSON.parse(response.choices[0].message.content);

    res.json(json);

  } catch (err) {
    console.error("Groq API error:", err);
    res.status(500).json({ error: "AI failed to generate recommendations." });
  }
});

// ----------------------
// PORT CONFIG (IMPORTANT)
// ----------------------
const PORT = process.env.PORT || 4000;  // <-- Render will auto-set PORT

app.listen(PORT, () => {
  console.log(`FilmFuseAI backend running on port ${PORT}`);
});
