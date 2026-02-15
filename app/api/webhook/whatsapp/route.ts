import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { parseIncomingWebhook, sendTextMessage } from '@/lib/whatsapp'
import { generateAIResponse } from '@/lib/ai-bot'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    console.log('📩 Webhook recebido:', JSON.stringify(body, null, 2))

    const incomingMessage = parseIncomingWebhook(body)
    if (!incomingMessage) {
      return NextResponse.json({ ok: true })
    }

    const { phone, text } = incomingMessage

    let lead = await prisma.lead.findUnique({ where: { phone } })
    if (!lead) {
      lead = await prisma.lead.create({
        data: {
          phone,
          stage: 'Novos',
          status: 'new',
          botStep: 'start',
          botData: {},
        }
      })
    }

    await prisma.message.create({
      data: { leadId: lead.id, from: 'client', text }
    })

    await prisma.lead.update({
      where: { id: lead.id },
      data: { lastMessageAt: new Date() }
    })

    if (lead.botStep === 'paused') {
      return NextResponse.json({ ok: true })
    }

    const historyMessages = await prisma.message.findMany({
      where: { leadId: lead.id },
      orderBy: { createdAt: 'asc' },
      take: 10,
    })

    const history = historyMessages.map(m => ({
      role: (m.from === 'bot' ? 'assistant' : 'user') as 'user' | 'assistant',
      content: m.text
    }))

    const aiReply = await generateAIResponse(text, history)

    await prisma.message.create({
      data: { leadId: lead.id, from: 'bot', text: aiReply }
    })

    await sendTextMessage(phone, aiReply)

    console.log('✅ Mensagem processada!')
    return NextResponse.json({ ok: true })

  } catch (error: any) {
    console.error('❌ ERRO:', error.message)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
