import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const configs = await prisma.config.findMany()
    const config: Record<string, string> = {}
    configs.forEach(c => { config[c.key] = c.value })
    return NextResponse.json({ config })
  } catch (error) {
    console.error('[GET /api/config]', error)
    return NextResponse.json({ error: 'Erro ao buscar configurações' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { config } = await request.json()

    for (const [key, value] of Object.entries(config)) {
      if (value === undefined || value === null) continue
      await prisma.config.upsert({
        where: { key },
        update: { value: String(value) },
        create: { key, value: String(value) },
      })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[POST /api/config]', error)
    return NextResponse.json({ error: 'Erro ao salvar configurações' }, { status: 500 })
  }
}
