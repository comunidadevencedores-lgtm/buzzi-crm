import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { sendTextMessage } from '@/lib/whatsapp'

export async function POST(request: NextRequest) {
  try { 
    const { leadId, text } = await request.json()

    if (!leadId || !text?.trim()) {
      return NextResponse.json({ error: 'leadId e text são obrigatórios' }, { status: 400 })
    }

    const lead = await prisma.lead.findUnique({ where: { id: leadId } })
    if (!lead) {
      return NextResponse.json({ error: 'Lead não encontrado' }, { status: 404 })
    }

    // Salva mensagem como 'agent' (atendente humano)
    await prisma.message.create({
      data: { leadId: lead.id, from: 'agent', text: text.trim() }
    })

    // Envia pelo WhatsApp
    await sendTextMessage(lead.phone, text.trim())

    // Atualiza última mensagem
    await prisma.lead.update({
      where: { id: lead.id },
      data: { lastMessageAt: new Date() }
    })

    console.log('✅ Mensagem manual enviada para:', lead.phone)
    return NextResponse.json({ ok: true })

  } catch (error: any) {
    console.error('❌ Erro ao enviar mensagem manual:', error.message)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
