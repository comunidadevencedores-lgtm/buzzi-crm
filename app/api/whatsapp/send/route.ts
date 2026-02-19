import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { sendTextMessage } from '@/lib/whatsapp'

export async function POST(request: NextRequest) {
  try {
    const { leadId, phone, text } = await request.json()

    if (!leadId || !phone || !text?.trim()) {
      return NextResponse.json({ error: 'leadId, phone e text são obrigatórios' }, { status: 400 })
    }

    // 1) Salva no banco
    const message = await prisma.message.create({
      data: {
        leadId,
        from: 'bot', // ajuste para 'team' se seu enum tiver esse valor
        text: text.trim(),
      },
    })

    // 2) Atualiza lastMessageAt
    await prisma.lead.update({
      where: { id: leadId },
      data: { lastMessageAt: new Date() },
    })

    // 3) Envia pelo WhatsApp
    await sendTextMessage(phone, text.trim())

    return NextResponse.json({ success: true, message })
  } catch (error: any) {
    console.error('[POST /api/send-message]', error.message)
    return NextResponse.json({ error: 'Erro ao enviar mensagem' }, { status: 500 })
  }
}
