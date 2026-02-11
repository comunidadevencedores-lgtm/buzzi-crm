// Webhook que recebe mensagens do WhatsApp - COM IA
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { parseIncomingWebhook, sendTextMessage } from '@/lib/evolution'
import { processMessage } from '@/lib/bot'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    console.log('📩 Webhook recebido:', JSON.stringify(body, null, 2))

    // Parse da mensagem
    const incomingMessage = parseIncomingWebhook(body)
    
    if (!incomingMessage) {
      console.log('⚠️ Mensagem ignorada (formato inválido ou mensagem própria)')
      return NextResponse.json({ ok: true })
    }

    const { phone, text, messageId } = incomingMessage

    // Busca ou cria o Lead
    let lead = await prisma.lead.findUnique({
      where: { phone },
    })

    if (!lead) {
      console.log('🆕 Criando novo lead:', phone)
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

    // Salva a mensagem do cliente
    await prisma.message.create({
      data: {
        leadId: lead.id,
        from: 'client',
        text,
      },
    })

    // Atualiza última mensagem
    await prisma.lead.update({
      where: { id: lead.id },
      data: { lastMessageAt: new Date() },
    })

    // VERIFICA SE O BOT ESTÁ PAUSADO (humano assumiu)
    if (lead.botStep === 'paused') {
      console.log('⏸️ Bot pausado - mensagem não será respondida automaticamente')
      return NextResponse.json({ ok: true, botPaused: true })
    }

    // Processa a mensagem pelo bot (usa o bot simples por enquanto)
    console.log('🤖 Processando com bot...')
    const botResponse = processMessage(lead, text)

    console.log('✅ Resposta do bot gerada:', botResponse.replyText)

    // Atualiza o lead com as mudanças do bot
    if (Object.keys(botResponse.leadUpdates).length > 0) {
      await prisma.lead.update({
        where: { id: lead.id },
        data: botResponse.leadUpdates,
      })
      console.log('📝 Lead atualizado')
    }
    
    // Salva a resposta do bot
    await prisma.message.create({
      data: {
        leadId: lead.id,
        from: 'bot',
        text: botResponse.replyText,
      },
    })

    // Envia a resposta pelo WhatsApp
    console.log('📤 Enviando resposta para WhatsApp...')
    await sendTextMessage({ phone, text: botResponse.replyText })
    console.log('✅ Mensagem enviada com sucesso!')

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('❌ Erro no webhook:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}