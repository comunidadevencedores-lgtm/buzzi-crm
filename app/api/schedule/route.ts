import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { sendTextMessage } from '@/lib/whatsapp'

export async function POST(request: NextRequest) {
  try {
    const { leadId, title, scheduledAt, duration, notes } = await request.json()

    if (!leadId || !scheduledAt) {
      return NextResponse.json({ error: 'leadId e scheduledAt obrigatórios' }, { status: 400 })
    }

    const lead = await prisma.lead.findUnique({ where: { id: leadId } })
    if (!lead) return NextResponse.json({ error: 'Lead não encontrado' }, { status: 404 })

    const appointment = await prisma.appointment.create({
      data: {
        leadId,
        title: title || 'Reunião',
        scheduledAt: new Date(scheduledAt),
        duration: duration ? parseInt(duration) : 30,
        notes: notes || null,
        status: 'confirmed',
      },
    })

    const dt = new Date(scheduledAt)
    const dataFormatada = dt.toLocaleString('pt-BR', {
      timeZone: 'America/Sao_Paulo',
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    })

    const msgConfirmacao =
      `Olá ${lead.name || ''}! 👋\n\n` +
      `✅ Sua reunião está confirmada!\n\n` +
      `📅 *${title || 'Reunião'}*\n` +
      `🕐 ${dataFormatada}\n` +
      `⏱ Duração: ${duration || 30} minutos\n\n` +
      `${notes ? `📝 ${notes}\n\n` : ''}` +
      `Qualquer dúvida é só chamar aqui. Até lá! 🚀`

    const phone = lead.phone?.replace(/\D/g, '')
    if (phone) {
      try { await sendTextMessage(phone, msgConfirmacao) } catch {}
    }

    const followUpDate = new Date(scheduledAt)
    followUpDate.setDate(followUpDate.getDate() + 1)

    await prisma.followup.create({
      data: {
        leadId,
        runAt: followUpDate,
        status: 'pending',
        message:
          `Oi ${lead.name || ''}! Tudo bem? 😊\n\n` +
          `Passando para saber o que achou da nossa conversa de ontem.\n` +
          `Ficou alguma dúvida? Posso te ajudar com mais informações! 💪`,
      },
    })

    return NextResponse.json({ success: true, appointment })
  } catch (error) {
    console.error('[schedule]', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  const leadId = request.nextUrl.searchParams.get('leadId')
  const where = leadId ? { leadId } : {}
  const appointments = await prisma.appointment.findMany({
    where,
    include: { lead: { select: { name: true, phone: true } } },
    orderBy: { scheduledAt: 'asc' },
  })
  return NextResponse.json(appointments)
}
