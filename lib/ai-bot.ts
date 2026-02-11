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
      model: "gpt-3.5-turbo", // Mais barato e rápido
      messages: [
        {
          role: "system",
          content: "Você é um assistente virtual prestativo do Buzzi CRM. Seu objetivo é ajudar o cliente de forma educada e rápida. Seja conciso.",
        },
        ...history.map(h => ({
          role: h.role,
          content: h.content,
        })),
        { role: "user", content: message },
      ],
      max_tokens: 500,
    });

    return response.choices[0].message.content;
  } catch (error) {
    console.error("Erro OpenAI:", error);
    return "Desculpe, tive um probleminha técnico. Pode repetir?";
  }
}
