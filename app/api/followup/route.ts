import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { sendTextMessage } from '@/lib/whatsapp'

const CRON_SECRET = process.env.CRON_SECRET || 'flip2024seguro'

export async function POST(request: NextRequest) {
  try {
    const { leadId, type, message, scheduledAt } = await request.json()

    if (!leadId || !message) {
      return NextResponse.json({ error: 'leadId e message obrigatórios' }, { status: 400 })
    }

    const followup = await prisma.followup.create({
      data: {
        leadId,
        runAt: scheduledAt ? new Date(scheduledAt) : new Date(),
        status: 'pending',
        message,
      },
    })

    return NextResponse.json({ success: true, followup })
  } catch (error) {
    console.error('[followup POST]', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  const secret = request.nextUrl.searchParams.get('secret')
  if (secret !== CRON_SECRET) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }

  const agora = new Date()

  const pendentes = await prisma.followup.findMany({
    where: { status: 'pending', runAt: { lte: agora } },
    include: { lead: { select: { name: true, phone: true } } },
    take: 20,
  })

  const resultados = []

  for (const fu of pendentes) {
    const phone = fu.lead?.phone?.replace(/\D/g, '')
    if (!phone || !fu.message) {
      await prisma.followup.update({ where: { id: fu.id }, data: { status: 'failed' } })
      continue
    }

    try {
      await sendTextMessage(phone, fu.message)
      await prisma.followup.update({
        where: { id: fu.id },
        data: { status: 'sent', sentAt: new Date() },
      })
      resultados.push({ id: fu.id, phone, status: 'sent' })
    } catch {
      await prisma.followup.update({ where: { id: fu.id }, data: { status: 'failed' } })
      resultados.push({ id: fu.id, phone, status: 'failed' })
    }

    await new Promise(r => setTimeout(r, 2000))
  }

  return NextResponse.json({ processed: resultados.length, results: resultados })
}
