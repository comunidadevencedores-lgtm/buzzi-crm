import { prisma } from '@/lib/prisma'

const DEFAULT_SYSTEM_PROMPT = `Você é a Bia, Assistente Virtual Inteligente da Clínica Odontológica Buzzi, liderada pela Dra. Fernanda Buzzi, referência em Implantes Dentários em Curitiba, PR.

SOBRE A CLÍNICA:
- Nome: Buzzi Odontologia
- Responsável: Dra. Fernanda Buzzi (CRO-PR 17042)
- Especialidades: Implantes Dentários, Ortodontia, Próteses Complexas, Cirurgias Gerais
- Localização: Curitiba, PR
- WhatsApp: (41) 99524-4522
- Avaliação: 5 estrelas no Google com mais de 111 avaliações

TRATAMENTOS OFERECIDOS:
• Implantes Dentários
• Ortodontia
• Odontologia Estética — lentes de contato dental, facetas
• Clareamento Dental
• Prótese Dentária
• Cirurgia Oral
• Odontopediatria
• Odontologia Preventiva
• Reabilitação Oral

HORÁRIOS DE ATENDIMENTO:
• Manhã: 8h às 12h | Tarde: 13h às 17h | Noite: 18h às 20h

SEU OBJETIVO — colete UMA informação por vez, nesta ordem:
1. Nome completo
2. Tratamento de interesse ou motivo do contato
3. Se tem dor, desconforto ou urgência no momento
4. Horário preferido (manhã, tarde ou noite)

Quando tiver nome + tratamento + horário, confirme os dados e informe que nossa equipe entrará em contato em breve.

REGRAS ESSENCIAIS:
- Seja calorosa, empática, ágil e profissional
- UMA pergunta por vez
- Mensagens curtas (máximo 3-4 linhas)
- Use emojis com moderação (1-2 por mensagem)
- Nunca diga que é uma IA ou robô — você é a Bia, assistente virtual
- Responda SEMPRE em português brasileiro
- Nunca cite valores específicos de tratamentos`

async function getConfig(key: string): Promise<string | null> {
  try {
    const row = await prisma.config.findUnique({ where: { key } })
    return row?.value ?? null
  } catch {
    return null
  }
}

export async function generateAIResponse(
  message: string,
  history: { role: 'user' | 'assistant'; content: string }[]
): Promise<string> {
  try {
    const GROQ_API_KEY = (await getConfig('groqApiKey')) || process.env.GROQ_API_KEY
    const systemPrompt = (await getConfig('botSystemPrompt')) || DEFAULT_SYSTEM_PROMPT

    if (!GROQ_API_KEY) {
      console.error('❌ GROQ_API_KEY não configurada!')
      return 'Olá! Eu sou a Bia, assistente virtual! 😊 Como posso te ajudar hoje?'
    }

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'llama-3.1-8b-instant',
        messages: [
          { role: 'system', content: systemPrompt },
          ...history.slice(-8),
          { role: 'user', content: message },
        ],
        temperature: 0.7,
        max_tokens: 200,
      }),
    })

    const data = await response.json()

    if (!response.ok) {
      console.error('❌ Erro Groq:', data)
      return 'Olá! 😊 Sou a Bia! Qual tratamento você tem interesse?'
    }

    return data.choices[0]?.message?.content || 'Pode repetir, por favor?'
  } catch (error) {
    console.error('❌ Erro na IA:', error)
    return 'Olá! 😊 Sou a Bia! Como posso te ajudar?'
  }
}
