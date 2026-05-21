import OpenAI from "openai";

const client = new OpenAI({
  apiKey: process.env.GROQ_API_KEY,

  baseURL:
    "https://api.groq.com/openai/v1",
});

export async function POST(req: Request) {
  try {

    const body = await req.json();

    const {
      chapter,
      concepts,
      classLevel,
      subject,
    } = body;

    const conceptText =
      concepts
        .map(
          (c: any) =>
            `Concept: ${c.concept_name}
Summary: ${c.summary || ""}
`
        )
        .join("\n");

    const prompt = `
Generate exactly 10 multiple choice questions.

Subject:
${subject}

Class:
${classLevel}

Chapter:
${chapter}

Concepts:
${conceptText}

Requirements:
- 4 options per question
- exactly 1 correct answer
- include explanation
- medium difficulty
- avoid duplicate questions
- suitable for school students

Return ONLY valid JSON.

Format:

[
  {
    "question": "...",
    "options": [
      "...",
      "...",
      "...",
      "..."
    ],
    "answer": "...",
    "explanation": "..."
  }
]
`;

    const response =
      await client.chat.completions.create({
        model:
          "llama-3.3-70b-versatile",

        messages: [
          {
            role: "user",
            content: prompt,
          },
        ],

        temperature: 0.7,
      });

    const text =
      response.choices[0]
        .message.content || "";

    // CLEAN JSON

    const cleaned = text
      .replace(/```json/g, "")
      .replace(/```/g, "")
      .trim();

    const parsed =
      JSON.parse(cleaned);

    return Response.json({
      success: true,
      questions: parsed,
    });

  } catch (error: any) {

    return Response.json({
      success: false,
      error: error.message,
    });
  }
}
