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
    console.log('📞 Phone:', phone)
    console.log('💬 Text:', text)

    // Busca ou cria o Lead
    let lead = await prisma.lead.findUnique({ where: { phone } })

    if (!lead) {
      console.log('🆕 Criando novo lead:', phone)
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

    // Salva mensagem do cliente
    await prisma.message.create({
      data: { leadId: lead.id, from: 'client', text }
    })

    // Atualiza última mensagem
    await prisma.lead.update({
      where: { id: lead.id },
      data: { lastMessageAt: new Date() }
    })

    // Bot pausado = humano assumiu
    if (lead.botStep === 'paused') {
      console.log('⏸️ Bot pausado')
      return NextResponse.json({ ok: true })
    }

    // Processa resposta
    const botResponse = processMessage(lead, text)
    console.log('🤖 Resposta:', botResponse.replyText)

    // Atualiza lead
    if (Object.keys(botResponse.leadUpdates).length > 0) {
      await prisma.lead.update({
        where: { id: lead.id },
        data: botResponse.leadUpdates,
      })
    }

    // Salva resposta do bot
    await prisma.message.create({
      data: { leadId: lead.id, from: 'bot', text: botResponse.replyText }
    })

    // Envia pelo WhatsApp
    await sendTextMessage(phone, botResponse.replyText)

    console.log('✅ Mensagem processada!')
    return NextResponse.json({ ok: true })

  } catch (error: any) {
    console.error('❌ Erro no webhook:', error.message)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
