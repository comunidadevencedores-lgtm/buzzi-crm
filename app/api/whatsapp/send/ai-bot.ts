import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function generateAIResponse(
  message: string,
  history: { role: "user" | "assistant"; content: string }[]
) {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: "Você é um assistente do Buzzi CRM. Responda de forma curta e prestativa.",
        },
        ...history,
        { role: "user", content: message },
      ],
    });

    return response.choices[0].message.content;
  } catch (error) {
    console.error("Erro OpenAI:", error);
    return null;
  }
}
