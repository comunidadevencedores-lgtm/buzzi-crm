import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { parseIncomingWebhook, sendTextMessage } from '@/lib/whatsapp'
import { generateAIResponse } from '@/lib/ai-bot'

const META_VERIFY_TOKEN = process.env.META_VERIFY_TOKEN || 'buzzi123'

// ─── Helpers de qualificação ──────────────────────────────────────────────────

/** Detecta se o bot já confirmou nome + tratamento + horário */
function isLeadQualified(botData: Record<string, any> | null): boolean {
  if (!botData) return false
  return !!(botData.name && botData.treatment && botData.time)
}

/** Extrai dados do lead a partir da resposta da IA + histórico */
function extractBotData(
  history: { role: string; content: string }[],
  currentBotData: Record<string, any>
): Record<string, any> {
  const allText = history.map(h => h.content).join(' ').toLowerCase()

  const updated = { ...currentBotData }

  // Detecta tratamento mencionado
  if (!updated.treatment) {
    if (/implante/i.test(allText))      updated.treatment = 'Implantes'
    else if (/lente|faceta/i.test(allText)) updated.treatment = 'Lentes/Facetas'
    else if (/clareamento|clarear/i.test(allText)) updated.treatment = 'Clareamento'
    else if (/aparelho|ortodon/i.test(allText))    updated.treatment = 'Ortodontia'
    else if (/prot[eé]se/i.test(allText))          updated.treatment = 'Prótese'
    else if (/cirurgia|siso/i.test(allText))       updated.treatment = 'Cirurgia'
  }

  // Detecta horário
  if (!updated.time) {
    if (/manh[ãa]|8h|9h|10h|11h/i.test(allText))   updated.time = 'Manhã'
    else if (/tarde|13h|14h|15h|16h|17h/i.test(allText)) updated.time = 'Tarde'
    else if (/noite|18h|19h|20h/i.test(allText))    updated.time = 'Noite'
  }

  return updated
}

/** Define o novo stage com base no progresso */
function resolveStage(
  currentStage: string,
  botMessageCount: number,
  botData: Record<string, any>
): string {
  // Já passou da triagem manualmente — não regredir
  const manualStages = ['Em atendimento', 'Orçamento enviado', 'Agendamento pendente', 'Agendado', 'Fechou', 'Perdido']
  if (manualStages.includes(currentStage)) return currentStage

  // Lead qualificado (nome + tratamento + horário) → Em atendimento
  if (isLeadQualified(botData)) return 'Em atendimento'

  // Bot já respondeu pelo menos 1x → Triagem (bot)
  if (botMessageCount >= 1) return 'Triagem (bot)'

  return currentStage
}

// ─── GET — Verificação Meta ───────────────────────────────────────────────────
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const mode      = searchParams.get('hub.mode')
  const token     = searchParams.get('hub.verify_token')
  const challenge = searchParams.get('hub.challenge')

  if (mode === 'subscribe' && token === META_VERIFY_TOKEN) {
    console.log('✅ Webhook verificado pelo Meta!')
    return new NextResponse(challenge, { status: 200 })
  }
  return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
}

// ─── POST — Receber mensagens ─────────────────────────────────────────────────
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    console.log('📩 Webhook recebido:', JSON.stringify(body, null, 2))

    const incomingMessage = parseIncomingWebhook(body)
    if (!incomingMessage) {
      return NextResponse.json({ ok: true })
    }

    const { phone, text } = incomingMessage

    // 1) Busca ou cria lead
    let lead = await prisma.lead.findUnique({ where: { phone } })
    if (!lead) {
      lead = await prisma.lead.create({
        data: {
          phone,
          stage: 'Novos',
          status: 'new',
          botStep: 'start',
          botData: {},
        },
      })
    }

    // 2) Salva mensagem do cliente
    await prisma.message.create({
      data: { leadId: lead.id, from: 'client', text },
    })

    // 3) Atualiza lastMessageAt
    await prisma.lead.update({
      where: { id: lead.id },
      data: { lastMessageAt: new Date() },
    })

    // 4) Se bot pausado, para aqui
    if (lead.botStep === 'paused') {
      return NextResponse.json({ ok: true })
    }

    // 5) Busca histórico (últimas 10 msgs)
    const historyMessages = await prisma.message.findMany({
      where: { leadId: lead.id },
      orderBy: { createdAt: 'asc' },
      take: 10,
    })

    const history = historyMessages.map(m => ({
      role: (m.from === 'bot' ? 'assistant' : 'user') as 'user' | 'assistant',
      content: m.text,
    }))

    // 6) Chama IA
    const aiReply = await generateAIResponse(text, history)

    // 7) Salva resposta do bot
    await prisma.message.create({
      data: { leadId: lead.id, from: 'bot', text: aiReply },
    })

    // 8) Conta quantas msgs o bot já mandou (pra saber se já estava em triagem)
    const botMessageCount = historyMessages.filter(m => m.from === 'bot').length

    // 9) Extrai dados do lead do histórico
    const allHistory = [...history, { role: 'assistant', content: aiReply }]
    const updatedBotData = extractBotData(
      allHistory,
      (lead.botData as Record<string, any>) ?? {}
    )

    // Tenta capturar nome das mensagens do cliente
    if (!updatedBotData.nome) {
      const IGNORAR = /^(olá|ola|oi|bom dia|boa tarde|boa noite|ok|sim|não|nao|tudo bem|tá|ta|entendi|obrigado|obrigada|claro)$/i
      const clientMsgs = historyMessages.filter(m => m.from === 'client').map(m => m.text.trim())
      for (const msg of clientMsgs) {
        // Padrão explícito: "meu nome é X", "me chamo X"
        const match = msg.match(/(?:meu nome [eé]|me chamo|sou o|sou a|pode me chamar de)\s+([A-ZÀ-Ú][a-zà-ú]+(?:\s+[A-ZÀ-Ú][a-zà-ú]+)?)/i)
        if (match) { updatedBotData.nome = match[1]; break }
        // Mensagem curta que parece um nome (2-4 palavras, sem verbos, sem saudações)
        const words = msg.split(' ')
        if (
          words.length >= 2 &&
          words.length <= 4 &&
          !IGNORAR.test(msg) &&
          /^[A-ZÀ-Ú]/i.test(msg) &&
          !/[0-9!?.,]/.test(msg)
        ) {
          updatedBotData.nome = msg; break
        }
      }
    }

    // 10) Detecta se a IA confirmou os dados (sinal de qualificação)
    const replyLower = aiReply.toLowerCase()
    const confirmedData =
      replyLower.includes('entrar em contato') ||
      replyLower.includes('nossa equipe') ||
      replyLower.includes('confirmo') ||
      replyLower.includes('anotado') ||
      replyLower.includes('agendaremos')

    const isQualified = confirmedData && updatedBotData.treatment && updatedBotData.time

    // Remove 'qualified' do botData (não precisa aparecer na UI)
    delete updatedBotData.qualified

    // 11) Resolve novo stage
    const newStage = resolveStage(
      lead.stage,
      botMessageCount + 1,
      { ...updatedBotData, qualified: isQualified }
    )

    // 12) Atualiza lead com dados extraídos + novo stage
    await prisma.lead.update({
      where: { id: lead.id },
      data: {
        stage: newStage,
        status: isQualified ? 'warm' : lead.status,
        botData: updatedBotData,
        // Salva nome no campo oficial do lead
        name: updatedBotData.nome ?? lead.name,
        treatment: updatedBotData.treatment ?? lead.treatment,
        botStep: isQualified ? 'done' : 'collecting',
        lastMessageAt: new Date(),
      },
    })

    // 13) Envia pelo WhatsApp
    await sendTextMessage(phone, aiReply)

    console.log(`✅ Lead ${phone} | stage: ${lead.stage} → ${newStage}`)
    return NextResponse.json({ ok: true })

  } catch (error: any) {
    console.error('❌ ERRO:', error.message)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
