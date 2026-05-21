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
      mode,
    } = body;

    const conceptText =
      concepts
        .map(
          (c: any) =>
            `
Concept: ${c.concept_name}

Summary:
${c.summary || ""}
`
        )
        .join("\n");

    const prompt =
      mode === "assertion_reasoning"

        ? `
Generate exactly 10 assertion and reasoning questions.

Subject:
${subject}

Class:
${classLevel}

Chapter:
${chapter}

Concepts:
${conceptText}

Requirements:
- suitable for school students
- medium difficulty
- avoid duplicates
- scientifically accurate

Each question should contain:
- assertion
- reason
- 4 options
- answer
- explanation

Use EXACTLY these options:

1. Both Assertion and Reason are true and Reason is the correct explanation of Assertion
2. Both Assertion and Reason are true but Reason is NOT the correct explanation of Assertion
3. Assertion is true but Reason is false
4. Assertion is false but Reason is true

Return ONLY valid JSON.

Format:

[
  {
    "question": "Choose the correct option.",

    "assertion": "...",

    "reason": "...",

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
`

        : `
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

    // CLEAN MARKDOWN

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

    console.error(error);

    return Response.json({
      success: false,

      error: error.message,
    });
  }
}