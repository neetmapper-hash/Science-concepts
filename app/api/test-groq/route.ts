import OpenAI from "openai";

const client = new OpenAI({
  apiKey: process.env.GROQ_API_KEY,

  baseURL:
    "https://api.groq.com/openai/v1",
});

export async function GET() {
  try {

    const response =
      await client.chat.completions.create({
        model: "llama-3.3-70b-versatile",

        messages: [
          {
            role: "user",

            content:
              "Generate 2 Class 9 biology MCQs with 4 options and answers.",
          },
        ],

        temperature: 0.7,
      });

    return Response.json({
      success: true,

      output:
        response.choices[0]
          .message.content,
    });

  } catch (error: any) {

    return Response.json({
      success: false,

      error: error.message,
    });
  }
}
