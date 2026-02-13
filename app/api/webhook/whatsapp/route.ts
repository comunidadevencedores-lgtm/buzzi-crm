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
      console.log('⏸️ Bot pausado')
      return NextResponse.json({ ok: true })
    }

    const historyMessages = await prisma.message.findMa
