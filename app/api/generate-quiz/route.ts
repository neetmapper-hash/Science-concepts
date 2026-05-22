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

    // remove invalid control chars

    fixed = fixed.replace(
      /[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g,
      ""
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
Questions 1:
Easy

Questions 2:
Easy

Questions 3:
Medium

Questions 4:
Hard

Questions 5:
Advanced
`;

    const prompt =
      mode ===
      "assertion_reasoning"

        ? `
Generate EXACTLY 5 assertion reasoning questions.

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
- output ONLY JSON array
- no markdown
- no comments
- no trailing commas
- double quotes only
- escape quotes properly
- every object must be valid JSON
- never truncate output

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
Generate EXACTLY 5 MCQs.

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
- output ONLY JSON array
- no markdown
- no comments
- no trailing commas
- double quotes only
- escape quotes properly
- every object must be valid JSON
- never truncate output

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

    const allQuestions: any[] = [];

    // 6 batches × 5 questions = 30

    for (
      let batch = 0;
      batch < 6;
      batch++
    ) {

      let parsed = null;

      let lastError: any =
        null;

      for (
        let attempt = 1;
        attempt <= 3;
        attempt++
      ) {

        try {

          const response =
            await Promise.race([
              client.chat.completions.create({
                model:
                  "llama-3.3-70b-versatile",

                messages: [
                  {
                    role: "user",
                    content:
                      prompt,
                  },
                ],

                temperature: 0.5,

                max_tokens: 4000,
              }),

              new Promise(
                (_, reject) =>
                  setTimeout(
                    () =>
                      reject(
                        new Error(
                          "Groq timeout"
                        )
                      ),
                    30000
                  )
              ),
            ]);

          const text =
            (
              response as any
            ).choices?.[0]
              ?.message
              ?.content || "";

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
            `Batch ${
              batch + 1
            } Attempt ${attempt} failed`
          );

          console.error(err);

          lastError = err;
        }
      }

      if (!parsed) {

        console.error(
          `Batch ${
            batch + 1
          } failed completely`
        );

        continue;
      }

      allQuestions.push(
        ...parsed
      );
    }

    // VALIDATE QUESTIONS

    const validQuestions =
      allQuestions.filter(
        (q: any) =>
          q.question &&
          Array.isArray(
            q.options
          ) &&
          q.options.length ===
            4 &&
          q.answer &&
          q.explanation
      );

    // REMOVE DUPLICATES

    const uniqueQuestions =
      validQuestions.filter(
        (
          question,
          index,
          self
        ) =>
          index ===
          self.findIndex(
            (q: any) =>
              q.question ===
              question.question
          )
      );

    // MINIMUM SAFETY

    if (
      uniqueQuestions.length < 5
    ) {

      return Response.json({
        success: false,

        error:
          "Too few valid questions generated",
      });
    }

    return Response.json({
      success: true,

      total:
        uniqueQuestions.length,

      questions:
        uniqueQuestions,
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