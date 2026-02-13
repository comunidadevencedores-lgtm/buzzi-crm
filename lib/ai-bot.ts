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
      model: "gpt-4o-mini", // modelo atual recomendado
      messages: [
        {
          role: "system",
          content: `
Você é atendente de uma clínica odontológica.
Responda de forma profissional, objetiva e amigável.
Nunca diga que é uma IA.
Sempre conduza para agendamento.
          `,
        },
        ...history,
        { role: "user", content: message },
      ],
      temperature: 0.7,
      max_tokens: 300,
    });

    return response.choices[0].message.content || "Desculpe, pode repetir?";
  } catch (error) {
    console.error("❌ ERRO OPENAI:", error);
    return "Desculpe, tive um probleminha técnico. Pode repetir?";
  }
}
