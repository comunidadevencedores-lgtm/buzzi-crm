import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { parseIncomingWebhook, sendTextMessage } from '@/lib/evolution'
import { processMessage } from '@/lib/bot' // Garanta que este arquivo existe na lib

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    console.log('📩 Webhook recebido:', JSON.stringify(body, null, 2))

    const incomingMessage = parseIncomingWebhook(body)
    
    if (!incomingMessage) {
      return NextResponse.json({ ok: true })
    }

    const { phone, text } = incomingMessage

    // 1. Localiza ou cria o Lead
    let lead = await prisma.lead.findUnique({ where: { phone } })

    if (!lead) {
      lead = await prisma.lead.create({
        data: {
          phone,
          stage: 'Novos',
          status: 'new',
          botStep: 'start'
        }
      })
    }

    // 2. Salva mensagem do cliente
    await prisma.message.create({
      data: { leadId: lead.id, from: 'client', text }
    })

    // 3. Verifica se o bot está pausado
    if (lead.botStep === 'paused') {
      return NextResponse.json({ ok: true })
    }

    // 4. Gera resposta (usando sua lógica do bot.ts ou ai-bot.ts)
    const botResponse = processMessage(lead, text)

    // 5. Salva resposta do bot e envia
    await prisma.message.create({
      data: { leadId: lead.id, from: 'bot', text: botResponse.replyText }
    })

    await sendTextMessage({ phone, text: botResponse.replyText })

    return NextResponse.json({ ok: true })
  } catch (error: any) {
    console.error('❌ Erro no webhook:', error.message)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
