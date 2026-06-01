import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { parseIncomingWebhook, sendTextMessage } from '@/lib/whatsapp'
import { generateAIResponse } from '@/lib/ai-bot'

const META_VERIFY_TOKEN = process.env.META_VERIFY_TOKEN || 'buzzi123'

function isLeadQualified(botData: Record<string, any> | null): boolean {
  if (!botData) return false
  return !!(botData.name && botData.treatment && botData.time)
}

function extractBotData(
  history: { role: string; content: string }[],
  currentBotData: Record<string, any>
): Record<string, any> {
  const allText = history.map(h => h.content).join(' ').toLowerCase()
  const updated = { ...currentBotData }

  if (!updated.treatment) {
    if (/implante/i.test(allText))                    updated.treatment = 'Implantes'
    else if (/lente|faceta/i.test(allText))           updated.treatment = 'Lentes/Facetas'
    else if (/clareamento|clarear/i.test(allText))    updated.treatment = 'Clareamento'
    else if (/aparelho|ortodon/i.test(allText))       updated.treatment = 'Ortodontia'
    else if (/prot[eé]se/i.test(allText))             updated.treatment = 'Prótese'
    else if (/cirurgia|siso/i.test(allText))          updated.treatment = 'Cirurgia'
  }

  if (!updated.time) {
    if (/manh[ãa]|8h|9h|10h|11h/i.test(allText))         updated.time = 'Manhã'
    else if (/tarde|13h|14h|15h|16h|17h/i.test(allText))  updated.time = 'Tarde'
    else if (/noite|18h|19h|20h/i.test(allText))          updated.time = 'Noite'
  }

  return updated
}

function resolveStage(
  currentStage: string,
  botMessageCount: number,
  botData: Record<string, any>
): string {
  const manualStages = ['Em atendimento', 'Orçamento enviado', 'Agendamento pendente', 'Agendado', 'Fechou', 'Perdido']
  if (manualStages.includes(currentStage)) return currentStage
  if (isLeadQualified(botData)) return 'Em atendimento'
  if (botMessageCount >= 1) return 'Triagem (bot)'
  return currentStage
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const mode      = searchParams.get('hub.mode')
  const token     = searchParams.get('hub.verify_token')
  const challenge = searchParams.get('hub.challenge')

  if (mode === 'subscribe' && token === META_VERIFY_TOKEN) {
    return new NextResponse(challenge, { status: 200 })
  }
  return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const incomingMessage = parseIncomingWebhook(body)
    if (!incomingMessage) return NextResponse.json({ ok: true })

    const { phone, text } = incomingMessage

    // Mensagem outbound — só registra
    if (body.fromMe === true || body.isOutbound === true) {
      const lead = await prisma.lead.findUnique({ where: { phone } })
      if (lead) {
        await prisma.message.create({ data: { leadId: lead.id, from: 'agent', text } })
        await prisma.lead.update({ where: { id: lead.id }, data: { lastMessageAt: new Date() } })
      }
      return NextResponse.json({ ok: true })
    }

    // Busca ou cria lead
    let lead = await prisma.lead.findUnique({ where: { phone } })
    if (!lead) {
      lead = await prisma.lead.create({
        data: { phone, stage: 'Novos', status: 'new', botStep: 'start', botData: {} },
      })
    }

    await prisma.message.create({ data: { leadId: lead.id, from: 'client', text } })
    await prisma.lead.update({ where: { id: lead.id }, data: { lastMessageAt: new Date() } })

    if (lead.botStep === 'paused') return NextResponse.json({ ok: true })

    const historyMessages = await prisma.message.findMany({
      where: { leadId: lead.id },
      orderBy: { createdAt: 'asc' },
      take: 20,
    })

    const history = historyMessages.map(m => ({
      role: (m.from === 'bot' ? 'assistant' : 'user') as 'user' | 'assistant',
      content: m.text,
    }))

    const aiReply = await generateAIResponse(text, history)

    await prisma.message.create({ data: { leadId: lead.id, from: 'bot', text: aiReply } })

    const botMessageCount = historyMessages.filter(m => m.from === 'bot').length
    const allHistory = [...history, { role: 'assistant', content: aiReply }]
    const updatedBotData = extractBotData(allHistory, (lead.botData as Record<string, any>) ?? {})

    // Captura nome SOMENTE por padrão explícito
    if (!updatedBotData.nome) {
      const IGNORAR = /^(olá|ola|oi|bom dia|boa tarde|boa noite|ok|sim|não|nao|tudo|tá|ta|entendi|obrigado|obrigada|claro|bia|buzzi|odontologia|clínica|dra|fernanda|quero|gostaria|preciso|tenho|pode|qual|quando|como|onde|agendar|consulta|dúvida|duvida|ajuda|opa|vão|vao|eai|salve|hey|hello)$/i
      const clientMsgs = historyMessages.filter(m => m.from === 'client').map(m => m.text.trim())

      for (const msg of clientMsgs) {
        const match = msg.match(/(?:meu nome [eé]|me chamo|sou o|sou a|pode me chamar de)\s+([A-ZÀ-Ú][a-zà-ú]+(?:\s+[A-ZÀ-Ú][a-zà-ú]+)?)\b/i)
        if (match && !IGNORAR.test(match[1].trim())) {
          updatedBotData.nome = match[1]
          break
        }
      }
    }

    const replyLower = aiReply.toLowerCase()
    const confirmedData =
      replyLower.includes('entrar em contato') ||
      replyLower.includes('nossa equipe') ||
      replyLower.includes('confirmo') ||
      replyLower.includes('anotado') ||
      replyLower.includes('agendaremos')

    const isQualified = confirmedData && updatedBotData.treatment && updatedBotData.time
    delete updatedBotData.qualified

    const newStage = resolveStage(lead.stage, botMessageCount + 1, { ...updatedBotData, qualified: isQualified })

    await prisma.lead.update({
      where: { id: lead.id },
      data: {
        stage: newStage,
        status: isQualified ? 'warm' : lead.status,
        botData: updatedBotData,
        name: updatedBotData.nome ?? lead.name,
        treatment: updatedBotData.treatment ?? lead.treatment,
        botStep: isQualified ? 'done' : 'collecting',
        lastMessageAt: new Date(),
      },
    })

    await sendTextMessage(phone, aiReply)
    console.log(`✅ Lead ${phone} | ${lead.stage} → ${newStage}`)
    return NextResponse.json({ ok: true })

  } catch (error: any) {
    console.error('❌ ERRO:', error.message)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
