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

    // DIFFICULTY PROGRESSION

    const difficultyPlan = `
Questions 1-5:
- EASY
- direct factual
- concept recognition

Questions 6-10:
- MEDIUM
- understanding based
- simple reasoning

Questions 11-15:
- MEDIUM-HARD
- application based

Questions 16-20:
- HARD
- conceptual traps
- multi-step thinking

Questions 21-25:
- ADVANCED
- analytical
- compare concepts
- edge cases

Questions 26-30:
- OLYMPIAD LEVEL
- deep reasoning
- difficult conceptual combinations
- complex applications
`;

    // ASSERTION / REASONING PROMPT

    const assertionPrompt = `
Generate EXACTLY 30 assertion and reasoning questions.

Subject:
${subject}

Class:
${classLevel}

Chapter:
${chapter}

Concepts:
${conceptText}

Difficulty Progression:
${difficultyPlan}

Requirements:
- scientifically accurate
- suitable for school students
- avoid duplicates
- progressively increase difficulty every 5 questions
- questions should become harder gradually

Each question MUST contain:
- question
- difficulty
- assertion
- reason
- options
- answer
- explanation

Use EXACTLY these options:

1. Both Assertion and Reason are true and Reason is the correct explanation of Assertion
2. Both Assertion and Reason are true but Reason is NOT the correct explanation of Assertion
3. Assertion is true but Reason is false
4. Assertion is false but Reason is true

Return ONLY STRICT VALID JSON.

Rules:
- double quotes only
- no markdown
- no trailing commas
- no comments
- no extra explanation
- output must be directly parsable using JSON.parse()

Format:

[
  {
    "question": "Choose the correct option.",

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
`;

    // NORMAL QUIZ PROMPT

    const normalPrompt = `
Generate EXACTLY 30 multiple choice questions.

Subject:
${subject}

Class:
${classLevel}

Chapter:
${chapter}

Concepts:
${conceptText}

Difficulty Progression:
${difficultyPlan}

Requirements:
- 4 options per question
- exactly 1 correct answer
- include explanation
- avoid duplicate questions
- suitable for school students
- progressively increase difficulty every 5 questions

Return ONLY STRICT VALID JSON.

Rules:
- double quotes only
- no markdown
- no trailing commas
- no comments
- no extra explanation
- output must be directly parsable using JSON.parse()

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

    const prompt =
      mode === "assertion_reasoning"
        ? assertionPrompt
        : normalPrompt;

    // RETRY LOGIC

    let parsed: any = null;

    let lastError: any = null;

    for (let attempt = 1; attempt <= 3; attempt++) {

      try {

        console.log(
          `Quiz generation attempt ${attempt}`
        );

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

        // CLEAN RESPONSE

        const cleaned = text

          .replace(/```json/g, "")

          .replace(/```/g, "")

          .replace(/[“”]/g, '"')

          .replace(/[‘’]/g, "'")

          .trim();

        try {

          parsed = JSON.parse(cleaned);

          break;

        } catch (err) {

          console.error(
            "Initial parse failed"
          );

          // RECOVERY FIXES

          const fixed = cleaned

            // remove trailing commas
            .replace(/,\s*}/g, "}")

            .replace(/,\s*]/g, "]")

            // remove control chars
            .replace(
              /[\u0000-\u001F]+/g,
              " "
            )

            // normalize spaces
            .replace(/\s+/g, " ")

            .trim();

          try {

            parsed = JSON.parse(fixed);

            break;

          } catch (err2) {

            console.error(
              "Recovery parse failed"
            );

            lastError = err2;
          }
        }

      } catch (apiError) {

        console.error(apiError);

        lastError = apiError;
      }
    }

    // FAILED AFTER RETRIES

    if (!parsed) {

      return Response.json({
        success: false,

        error:
          "AI response parsing failed after retries",

        details:
          lastError?.message ||
          "Unknown error",
      });
    }

    // VALIDATE QUESTIONS

    if (
      !Array.isArray(parsed)
    ) {

      return Response.json({
        success: false,

        error:
          "AI did not return an array",
      });
    }

    // FILTER BAD QUESTIONS

    const validQuestions =
      parsed.filter(
        (q: any) =>
          q.question &&
          Array.isArray(q.options) &&
          q.options.length >= 4 &&
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
        error.message ||
        "Unknown server error",
    });
  }
}