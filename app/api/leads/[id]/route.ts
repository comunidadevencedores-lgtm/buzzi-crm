import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET - busca lead específico com mensagens
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const lead = await prisma.lead.findUnique({
      where: { id: params.id },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' },
        },
        followups: {
          orderBy: { runAt: 'desc' },
        },
      },
    })

    if (!lead) {
      return NextResponse.json({ error: 'Lead não encontrado' }, { status: 404 })
    }

    return NextResponse.json({ lead })
  } catch (error) {
    console.error('Erro ao buscar lead:', error)
    return NextResponse.json({ error: 'Erro ao buscar lead' }, { status: 500 })
  }
}

// POST/PATCH - atualiza stage, status, botStep, name, treatment
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json()
    const { stage, status, botStep, name, treatment } = body

    const lead = await prisma.lead.update({
      where: { id: params.id },
      data: {
        ...(stage     !== undefined && { stage }),
        ...(status    !== undefined && { status }),
        ...(botStep   !== undefined && { botStep }),
        ...(name      !== undefined && { name }),
        ...(treatment !== undefined && { treatment }),
      },
    })

    return NextResponse.json({ lead })
  } catch (error: any) {
    console.error('[POST /api/leads/:id]', error.message)
    return NextResponse.json({ error: 'Erro ao atualizar lead' }, { status: 500 })
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  return POST(request, { params })
}
