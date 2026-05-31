import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

function normalizePhone(raw: string): string {
  const digits = raw.replace(/\D/g, '')
  const clean = digits.startsWith('0') ? digits.slice(1) : digits
  if (clean.length <= 11) return `55${clean}`
  return clean
}

function parseCSV(text: string): Record<string, string>[] {
  const lines = text.trim().split('\n')
  if (lines.length < 2) return []
  const header = lines[0]
  const sep = header.includes(';') ? ';' : ','
  const cols = header.split(sep).map(c => c.trim().toLowerCase().replace(/['"]/g, ''))
  return lines.slice(1).map(line => {
    const vals = line.split(sep).map(v => v.trim().replace(/['"]/g, ''))
    const row: Record<string, string> = {}
    cols.forEach((col, i) => { row[col] = vals[i] || '' })
    return row
  })
}

function detectCols(cols: string[]) {
  const find = (keys: string[]) => cols.find(c => keys.some(k => c.includes(k))) || null
  return {
    nameCol: find(['nome', 'name', 'contato', 'cliente']),
    phoneCol: find(['telefone', 'fone', 'celular', 'whatsapp', 'phone', 'tel', 'numero']),
    emailCol: find(['email', 'e-mail', 'mail']),
    companyCol: find(['empresa', 'company']),
  }
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File | null
    if (!file) return NextResponse.json({ error: 'Arquivo não enviado' }, { status: 400 })

    const fileName = file.name.toLowerCase()
    if (!fileName.endsWith('.csv')) {
      return NextResponse.json({ error: 'Use CSV. No Excel: Arquivo → Salvar como → CSV UTF-8' }, { status: 400 })
    }

    const text = await file.text()
    const rows = parseCSV(text)
    if (rows.length === 0) return NextResponse.json({ error: 'Arquivo vazio' }, { status: 400 })

    const colNames = Object.keys(rows[0])
    const { nameCol, phoneCol, emailCol, companyCol } = detectCols(colNames)

    if (!phoneCol) {
      return NextResponse.json({
        error: 'Coluna de telefone não encontrada.',
        colunas_detectadas: colNames,
        hint: 'Nomeie a coluna como: telefone, celular, whatsapp ou phone',
      }, { status: 400 })
    }

    let imported = 0, skipped = 0, duplicates = 0

    for (const row of rows) {
      const rawPhone = phoneCol ? row[phoneCol] : ''
      if (!rawPhone) { skipped++; continue }
      const phone = normalizePhone(rawPhone)
      const name = nameCol ? row[nameCol] || null : null
      const email = emailCol ? row[emailCol] || null : null
      const company = companyCol ? row[companyCol] || null : null
      const existing = await prisma.lead.findFirst({ where: { phone } })
      if (existing) { duplicates++; continue }
      await prisma.lead.create({
        data: { name: name || phone, phone, stage: 'Novos', status: 'new', botStep: 'start' },
      })
      imported++
    }

    return NextResponse.json({
      success: true,
      imported,
      duplicates,
      skipped,
      total: rows.length,
      message: `✅ ${imported} leads importados | ${duplicates} duplicatas | ${skipped} sem telefone`,
    })
  } catch (error) {
    console.error('[upload-leads]', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
