import OpenAI from "openai";

const client = new OpenAI({
  apiKey: process.env.GROQ_API_KEY,

  baseURL:
    "https://api.groq.com/openai/v1",
});

function extractJSONArray(
  text: string
) {

  const start =
    text.indexOf("[");

  const end =
    text.lastIndexOf("]");

  if (
    start === -1 ||
    end === -1
  ) {
    return null;
  }

  return text.slice(
    start,
    end + 1
  );
}

function safeJSONParse(
  raw: string
) {

  try {

    return JSON.parse(raw);

  } catch (err) {

    // ATTEMPT FIXES

    let fixed = raw;

    // remove markdown

    fixed = fixed
      .replace(/```json/g, "")
      .replace(/```/g, "");

    // smart quotes

    fixed = fixed
      .replace(/[“”]/g, '"')
      .replace(/[‘’]/g, "'");

    // trailing commas

    fixed = fixed
      .replace(/,\s*}/g, "}")
      .replace(/,\s*]/g, "]");

    // remove bad chars

    fixed = fixed.replace(
      /[\u0000-\u001F]+/g,
      " "
    );

    // extract json array

    const extracted =
      extractJSONArray(
        fixed
      );

    if (!extracted) {
      throw new Error(
        "Could not extract JSON array"
      );
    }

    return JSON.parse(
      extracted
    );
  }
}

export async function POST(
  req: Request
) {

  try {

    const body =
      await req.json();

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
Concept:
${c.concept_name}

Summary:
${c.summary || ""}
`
        )
        .join("\n");

    const difficultyPlan = `
Questions 1-5:
Easy

Questions 6-10:
Medium

Questions 11-15:
Medium Hard

Questions 16-20:
Hard

Questions 21-25:
Advanced

Questions 26-30:
Olympiad Level
`;

    const prompt =
      mode ===
      "assertion_reasoning"

        ? `
Generate EXACTLY 30 assertion reasoning questions.

Subject:
${subject}

Class:
${classLevel}

Chapter:
${chapter}

Concepts:
${conceptText}

Difficulty progression:
${difficultyPlan}

Rules:
- valid JSON only
- no markdown
- no comments
- no trailing commas
- double quotes only

Format:

[
  {
    "question": "...",
    "difficulty": "easy",
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
Generate EXACTLY 30 MCQs.

Subject:
${subject}

Class:
${classLevel}

Chapter:
${chapter}

Concepts:
${conceptText}

Difficulty progression:
${difficultyPlan}

Rules:
- valid JSON only
- no markdown
- no comments
- no trailing commas
- double quotes only

Format:

[
  {
    "question": "...",
    "difficulty": "easy",
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

    let parsed = null;

    let lastError: any =
      null;

    // RETRIES

    for (
      let attempt = 1;
      attempt <= 3;
      attempt++
    ) {

      try {

        const response =
          await client.chat.completions.create({
            model:
              "llama-3.3-70b-versatile",

            messages: [
              {
                role: "user",
                content:
                  prompt,
              },
            ],

            temperature: 0.7,
          });

        const text =
          response.choices[0]
            .message.content || "";

        parsed =
          safeJSONParse(
            text
          );

        if (
          Array.isArray(
            parsed
          )
        ) {
          break;
        }

      } catch (err) {

        console.error(
          `Attempt ${attempt} failed`
        );

        console.error(err);

        lastError = err;
      }
    }

    if (!parsed) {

      return Response.json({
        success: false,

        error:
          "Failed after retries",

        details:
          lastError?.message,
      });
    }

    const validQuestions =
      parsed.filter(
        (q: any) =>
          q.question &&
          Array.isArray(
            q.options
          ) &&
          q.answer
      );

    return Response.json({
      success: true,

      total:
        validQuestions.length,

      questions:
        validQuestions,
    });

  } catch (error: any) {

    console.error(error);

    return Response.json({
      success: false,

      error:
        error.message,
    });
  }
}