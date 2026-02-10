// app/api/whatsapp/send/route.ts
import { NextRequest, NextResponse } from "next/server"
import { sendTextMessage } from "@/lib/whatsapp"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}))

    const phone = body?.phone
    const text = body?.text

    if (!phone || !text) {
      return NextResponse.json(
        {
          error: "Phone and text are required",
          received: body,
        },
        { status: 400 }
      )
    }

    // envia direto (sem objeto)
    await sendTextMessage(phone, text)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Erro ao enviar mensagem:", error)
    return NextResponse.json(
      { error: "Failed to send message" },
      { status: 500 }
    )
  }
}
