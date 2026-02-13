import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { parseIncomingWebhook, sendTextMessage } from '@/lib/whatsapp'
import { processMessage } from '@/lib/bot'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    console.log('📩 Webhook recebido:', JSON.stringify(body, null, 2))

    const incomingMessage = parseIncomingWebhook(body)
    if (!incomingMessage) {
      console.log('⚠️ Mensagem ignorada')
      return NextResponse.json({ ok: true })
    }

    const { phone, text } = incomingMessage
    console.log('📞 Phone:', phone, '💬 Text:', text)

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

    const botResponse = processMessage(lead, text)
    console.log('🤖 Resposta:', botResponse.replyText)

    if (Object.keys(botResponse.leadUpdates).length > 0) {
      await prisma.lead.update({
        where: { id: lead.id },
        data: botResponse.leadUpdates,
      })
    }

    await prisma.message.create({
      data: { leadId: lead.id, from: 'bot', text: botResponse.replyText }
    })

    await sendTextMessage(phone, botResponse.replyText)

    console.log('✅ Mensagem processada!')
    return NextResponse.json({ ok: true })

  } catch (error: any) {
    console.error('❌ Erro no webhook:', error.message)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
