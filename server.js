// server.js
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import Groq from "groq-sdk";

dotenv.config();

const app = express();

app.use(
  cors({
    origin: [
      "http://localhost:5500",
      "http://127.0.0.1:5500",
      "https://filmfuseai.netlify.app"
    ],
    methods: ["GET", "POST"],
  })
);

app.use(express.json());

// -------------------------
// GROQ CLIENT
// -------------------------
const client = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

// -------------------------
// MOVIE RECOMMENDER API
// -------------------------
app.post("/api/recommend", async (req, res) => {
  try {
    const { languages, genres, mood, age } = req.body;

    const prompt = `
Return STRICT JSON only. No extra text.

Generate 10 movie recommendations using:
Languages: ${languages}
Genres: ${genres}
Mood: ${mood}
Age: ${age}

Return exactly:
{
  "movies": [
    {
      "title": "",
      "year": 2020,
      "language": "",
      "age_rating": "",
      "genres": [],
      "mood_tags": [],
      "short_reason": ""
    }
  ]
}
`;

    const completion = await client.chat.completions.create({
      model: "llama-3.1-70b-versatile",   // ✅ NEW MODEL
      temperature: 0.7,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: "You must return VALID JSON. No markdown." },
        { role: "user", content: prompt },
      ],
    });

    const raw = completion.choices[0].message.content;
    const json = JSON.parse(raw);

    res.json(json);

  } catch (err) {
    console.error("🔥 Backend Error:", err);
    res.status(500).json({
      error: err.message || "AI error",
    });
  }
});

// -------------------------
const PORT = process.env.PORT || 4000;
app.listen(PORT, () =>
  console.log(`FilmFuse backend running on port ${PORT}`)
);
