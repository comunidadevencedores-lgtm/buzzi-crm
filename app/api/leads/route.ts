// API para listar leads (usado no Kanban)
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const leads = await prisma.lead.findMany({
      orderBy: {
        lastMessageAt: 'desc',
      },
      include: {
        messages: {
          take: 1,
          orderBy: {
            createdAt: 'desc',
          },
        },
      },
    })

    return NextResponse.json({ leads })
  } catch (error) {
    console.error('Erro ao buscar leads:', error)
    return NextResponse.json(
      { error: 'Erro ao buscar leads' },
      { status: 500 }
    )
  }
}
