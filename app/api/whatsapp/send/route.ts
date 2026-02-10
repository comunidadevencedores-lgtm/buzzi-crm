
// API para enviar mensagens do WhatsApp
import { NextRequest, NextResponse } from 'next/server'
import { sendTextMessage } from '@/lib/whatsapp'

export async function POST(request: NextRequest) {
  try {
    const { phone, text } = await request.json()

    if (!phone || !text) {
      return NextResponse.json(
        { error: 'Phone and text are required' },
        { status: 400 }
      )
    }

    await sendTextMessage({ phone, text })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Erro ao enviar mensagem:', error)
    return NextResponse.json(
      { error: 'Failed to send message' },
      { status: 500 }
    )
  }
}
