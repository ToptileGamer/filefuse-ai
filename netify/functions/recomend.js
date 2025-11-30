// netlify/functions/recommend.js
import Groq from "groq-sdk";

const client = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export async function handler(event) {
  // Handle CORS preflight
  if (event.httpMethod === "OPTIONS") {
    return {
      statusCode: 200,
      headers: corsHeaders,
      body: "OK",
    };
  }

  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      headers: corsHeaders,
      body: JSON.stringify({ error: "Method not allowed" }),
    };
  }

  try {
    const body = JSON.parse(event.body || "{}");
    const { languages, genres, mood, age } = body;

    const prompt = `
Return STRICT JSON only. No extra text.

Generate 10 movie recommendations using:
Languages: ${JSON.stringify(languages)}
Genres: ${JSON.stringify(genres)}
Mood: ${JSON.stringify(mood)}
Age Rating: ${JSON.stringify(age)}

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
      model: "llama-3.1-70b-versatile",
      temperature: 0.7,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: "You must return VALID JSON. No markdown." },
        { role: "user", content: prompt },
      ],
    });

    const raw = completion.choices[0].message.content;
    const json = JSON.parse(raw);

    return {
      statusCode: 200,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(json),
    };
  } catch (err) {
    console.error("Netlify function error:", err);
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({
        error: err.message || "AI failed to generate recommendations",
      }),
    };
  }
}
