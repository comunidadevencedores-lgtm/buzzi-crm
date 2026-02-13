// lib/ai-bot.ts - Usando Groq (GRÁTIS!)
const GROQ_API_KEY = process.env.GROQ_API_KEY

export async function generateAIResponse(
  message: string,
  history: { role: "user" | "assistant"; content: string }[]
): Promise<string> {
  try {
    if (!GROQ_API_KEY) {
      console.error("❌ GROQ_API_KEY não configurada!")
      return "Olá! 👋 Bem-vindo à Clínica Buzzi! Como posso te ajudar hoje?"
    }

    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${GROQ_API_KEY}`
      },
      body: JSON.stringify({
        model: "llama-3.1-8b-instant",
        messages: [
          {
            role: "system",
            content: `Você é a assistente virtual da Clínica Buzzi Odontologia. 
Seu objetivo é atender clientes de forma acolhedora e profissional.

COLETE ESSAS INFORMAÇÕES (uma por vez, naturalmente):
1. Nome do cliente
2. Tratamento de interesse (implantes, lentes, clareamento, aparelho ou outros)
3. Se sente dor ou desconforto
4. Horário preferido (manhã 8h-12h, tarde 13h-17h, noite 18h-20h)

REGRAS:
- Seja natural e empático, UMA pergunta por vez
- Use emojis com moderação
- Quando tiver nome + tratamento + horário, confirme os dados e diga que a equipe entrará em contato
- Nunca diga que é uma IA
- Responda SEMPRE em português`
          },
          ...history.slice(-8),
          { role: "user", content: message }
        ],
        temperature: 0.7,
        max_tokens: 200
      })
    })

    const data = await response.json()
    
    if (!response.ok) {
      console.error("❌ Erro Groq:", data)
      return "Olá! 😊 Bem-vindo à Clínica Buzzi! Qual tratamento você tem interesse?"
    }

    return data.choices[0]?.message?.content || "Pode repetir, por favor?"

  } catch (error) {
    console.error("❌ Erro na IA:", error)
    return "Olá! 😊 Bem-vindo à Clínica Buzzi! Como posso te ajudar?"
  }
}
