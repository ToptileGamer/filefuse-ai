import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { Groq } from "groq-sdk";

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
const client = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

// ----------------------
// API ENDPOINT
// ----------------------
app.post("/api/recommend", async (req, res) => {
  try {
    const { languages, genres, mood, age } = req.body;

    const prompt = `
Return STRICT JSON. No extra text.

Generate 10 movie recommendations based on:

Languages: ${languages}
Genres: ${genres}
Mood: ${mood}
Age Rating: ${age}

Return JSON only:
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

    const result = await client.chat.completions.create({
      model: "llama-3.1-70b-versatile",
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: "You must ALWAYS return valid JSON only." },
        { role: "user", content: prompt },
      ],
      temperature: 0.6,
    });

    const json = JSON.parse(result.choices[0].message.content);

    res.json(json);
  } catch (error) {
    console.error("Groq API error:", error);
    res.status(500).json({
      error: "AI failed to generate valid JSON. Try again.",
    });
  }
});

// ----------------------
// PORT
// ----------------------
const PORT = process.env.PORT || 4000;

app.listen(PORT, () => {
  console.log(`FilmFuseAI backend running on port ${PORT}`);
});
