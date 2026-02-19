import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { sendTextMessage } from '@/lib/whatsapp'

export async function POST(request: NextRequest) {
  try {
    const { leadId, text } = await request.json()

    if (!leadId || !text?.trim()) {
      return NextResponse.json({ error: 'leadId e text são obrigatórios' }, { status: 400 })
    }

    // Busca o phone pelo leadId (não precisa passar phone do frontend)
    const lead = await prisma.lead.findUnique({
      where: { id: leadId },
      select: { id: true, phone: true, botStep: true },
    })

    if (!lead) {
      return NextResponse.json({ error: 'Lead não encontrado' }, { status: 404 })
    }

    // Salva mensagem no banco
    const message = await prisma.message.create({
      data: {
        leadId: lead.id,
        from: 'bot',
        text: text.trim(),
      },
    })

    // Atualiza lastMessageAt
    await prisma.lead.update({
      where: { id: lead.id },
      data: { lastMessageAt: new Date() },
    })

    // Envia pelo WhatsApp
    await sendTextMessage(lead.phone, text.trim())

    return NextResponse.json({ success: true, message })
  } catch (error: any) {
    console.error('[POST /api/whatsapp/send]', error.message)
    return NextResponse.json({ error: 'Erro ao enviar mensagem' }, { status: 500 })
  }
}
