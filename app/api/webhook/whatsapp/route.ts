import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { parseIncomingWebhook, sendTextMessage } from '@/lib/whatsapp'
import { processMessage } from '@/lib/bot'

// Função para retry em caso de erro de conexão
async function withRetry<T>(fn: () => Promise<T>, retries = 3): Promise<T> {
  for (let i = 0; i < retries; i++) {
    try {
      return await fn()
    } catch (error: any) {
      const isConnectionError = error.message?.includes('ConnectorError') || 
                                error.message?.includes('Connection') ||
                                error.message?.includes('ECONNREFUSED')
      if (isConnectionError && i < retries - 1) {
        console.log(`⚠️ Erro de conexão, tentativa ${i + 2}/${retries}...`)
        await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)))
        continue
      }
      throw error
    }
  }
  throw new Error('Max retries reached')
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    console.log('📩 Webhook recebido:', JSON.stringify(body, null, 2))

    const incomingMessage = parseIncomingWebhook(body)
    if (!incomingMessage) {
      return NextResponse.json({ ok: true })
    }

    const { phone, text } = incomingMessage

    // Busca ou cria o Lead COM RETRY
    let lead = await withRetry(() => prisma.lead.findUnique({ where: { phone } }))

    if (!lead) {
      lead = await withRetry(() => prisma.lead.create({
        data: {
          phone,
          stage: 'Novos',
          status: 'new',
          botStep: 'start',
          botData: {},
        }
      }))
    }

    // Salva mensagem do cliente
    await withRetry(() => prisma.message.create({
      data: { leadId: lead!.id, from: 'client', text }
    }))

    // Atualiza última mensagem
    await withRetry(() => prisma.lead.update({
      where: { id: lead!.id },
      data: { lastMessageAt: new Date() }
    }))

    // Bot pausado = humano assumiu
    if (lead.botStep === 'paused') {
      return NextResponse.json({ ok: true })
    }

    // Processa resposta
    const botResponse = processMessage(lead, text)

    // Atualiza lead
    if (Object.keys(botResponse.leadUpdates).length > 0) {
      await withRetry(() => prisma.lead.update({
        where: { id: lead!.id },
        data: botResponse.leadUpdates,
      }))
    }

    // Salva e envia resposta
    await withRetry(() => prisma.message.create({
      data: { leadId: lead!.id, from: 'bot', text: botResponse.replyText }
    }))

    await sendTextMessage(phone, botResponse.replyText)

    console.log('✅ Mensagem processada!')
    return NextResponse.json({ ok: true })

  } catch (error: any) {
    console.error('❌ Erro no webhook:', error.message)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
