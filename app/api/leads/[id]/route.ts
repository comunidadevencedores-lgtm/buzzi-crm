import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

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
    console.error('[POST /api/leads/:id/stage]', error.message)
    return NextResponse.json({ error: 'Erro ao atualizar lead' }, { status: 500 })
  }
}

// PATCH também para compatibilidade
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  return POST(request, { params })
}
