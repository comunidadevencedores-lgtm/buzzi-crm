import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const leads = await prisma.lead.findMany({
      orderBy: { lastMessageAt: 'desc' },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' },
          // Retorna todas as mensagens para o chat funcionar
          // Se tiver muitos leads, considere limitar e criar endpoint separado
        },
      },
    })

    // Formata pra não expor dados desnecessários e adiciona lastMessage
    const result = leads.map(lead => ({
      id: lead.id,
      phone: lead.phone,
      name: lead.name,
      treatment: lead.treatment,
      stage: lead.stage,
      status: lead.status,
      botStep: lead.botStep,
      botData: lead.botData,
      lastMessageAt: lead.lastMessageAt,
      createdAt: lead.createdAt,
      // Preview da última mensagem (para o card do kanban)
      lastMessage: lead.messages[lead.messages.length - 1]?.text ?? null,
      lastMessageFrom: lead.messages[lead.messages.length - 1]?.from ?? null,
      // Histórico completo (para o chat lateral)
      messages: lead.messages.map(m => ({
        id: m.id,
        from: m.from,
        text: m.text,
        createdAt: m.createdAt,
      })),
    }))

    return NextResponse.json({ leads: result })
  } catch (error) {
    console.error('[GET /api/leads]', error)
    return NextResponse.json({ error: 'Erro ao buscar leads' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { phone, name, treatment, stage, status } = body

    if (!phone) {
      return NextResponse.json({ error: 'phone é obrigatório' }, { status: 400 })
    }

    const lead = await prisma.lead.upsert({
      where: { phone },
      create: {
        phone,
        name: name ?? null,
        treatment: treatment ?? null,
        stage: stage ?? 'Novos',
        status: status ?? 'new',
        botStep: 'start',
        lastMessageAt: new Date(),
      },
      update: {
        name: name ?? undefined,
        treatment: treatment ?? undefined,
        stage: stage ?? undefined,
        status: status ?? undefined,
      },
    })

    return NextResponse.json(lead, { status: 201 })
  } catch (error) {
    console.error('[POST /api/leads]', error)
    return NextResponse.json({ error: 'Erro ao criar lead' }, { status: 500 })
  }
}
