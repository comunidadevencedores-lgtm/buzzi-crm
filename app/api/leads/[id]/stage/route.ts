// API para atualizar o stage do lead (arrastar no Kanban)
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { stage } = await request.json()

    if (!stage) {
      return NextResponse.json(
        { error: 'stage é obrigatório' },
        { status: 400 }
      )
    }

    const lead = await prisma.lead.update({
      where: { id: params.id },
      data: { stage },
    })

    return NextResponse.json({ lead })
  } catch (error) {
    console.error('Erro ao atualizar stage:', error)
    return NextResponse.json(
      { error: 'Erro ao atualizar stage' },
      { status: 500 }
    )
  }
}
