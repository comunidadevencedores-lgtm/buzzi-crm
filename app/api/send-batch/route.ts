import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { sendTextMessage } from '@/lib/whatsapp'

function randomDelay(minMs: number, maxMs: number): Promise<void> {
  const ms = Math.floor(Math.random() * (maxMs - minMs) + minMs)
  return new Promise(r => setTimeout(r, ms))
}

export async function POST(request: NextRequest) {
  try {
    const { name, message, phones, batchSize = 10, delayMs = 8000 } = await request.json()

    if (!phones?.length || !message) {
      return NextResponse.json({ error: 'message e phones são obrigatórios' }, { status: 400 })
    }

    const batch = await prisma.batchDispatch.create({
      data: {
        name: name || `Lote ${new Date().toLocaleDateString('pt-BR')}`,
        message,
        totalLeads: phones.length,
        status: 'running',
        items: {
          create: phones.map((p: { phone: string; name?: string }) => ({
            phone: p.phone,
            name: p.name || null,
            status: 'pending',
          })),
        },
      },
    })

    processBatch(batch.id, message, batchSize, delayMs)

    return NextResponse.json({
      success: true,
      batchId: batch.id,
      total: phones.length,
      message: `Lote criado. Enviando ${phones.length} msgs em grupos de ${batchSize}.`,
    })
  } catch (error) {
    console.error('[send-batch]', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  const id = request.nextUrl.searchParams.get('id')

  if (id) {
    const batch = await prisma.batchDispatch.findUnique({
      where: { id },
      include: { items: { orderBy: { sentAt: 'desc' }, take: 50 } },
    })
    return NextResponse.json(batch)
  }

  const batches = await prisma.batchDispatch.findMany({
    orderBy: { createdAt: 'desc' },
    take: 20,
    select: {
      id: true, name: true, totalLeads: true,
      sentCount: true, failCount: true, status: true, createdAt: true,
    },
  })
  return NextResponse.json(batches)
}

async function processBatch(batchId: string, message: string, batchSize: number, delayMs: number) {
  const items = await prisma.batchDispatchItem.findMany({
    where: { batchId, status: 'pending' },
  })

  let sentCount = 0
  let failCount = 0

  for (let i = 0; i < items.length; i++) {
    const item = items[i]

    const msgPersonalizada = item.name
      ? message.replace(/\{nome\}/gi, item.name.split(' ')[0])
      : message.replace(/\{nome\},?\s*/gi, '')

    try {
      await sendTextMessage(item.phone, msgPersonalizada)
      await prisma.batchDispatchItem.update({
        where: { id: item.id },
        data: { status: 'sent', sentAt: new Date() },
      })
      sentCount++
    } catch {
      await prisma.batchDispatchItem.update({
        where: { id: item.id },
        data: { status: 'failed', error: 'Falha no envio' },
      })
      failCount++
    }

    await prisma.batchDispatch.update({
      where: { id: batchId },
      data: { sentCount, failCount },
    })
    }
  }

  await prisma.batchDispatch.update({
    where: { id: batchId },
    data: { status: 'done', sentCount, failCount },
  })
}
