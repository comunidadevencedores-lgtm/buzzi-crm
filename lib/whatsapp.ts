// lib/whatsapp.ts
// Integracao com Z-API 

import axios from "axios"

const ZAPI_BASE_URL = process.env.WHATSAPP_API_URL
const ZAPI_TOKEN = process.env.WHATSAPP_API_TOKEN
const ZAPI_INSTANCE_ID = process.env.WHATSAPP_INSTANCE_ID
const ZAPI_CLIENT_TOKEN = process.env.WHATSAPP_CLIENT_TOKEN

export async function sendTextMessage(phone: string, text: string) {
  try {
    console.log("🔍 DEBUG sendTextMessage:")
    console.log("  📞 Phone:", phone)
    console.log("  💬 Text:", text)
    console.log("  📏 Text length:", text?.length)
    console.log("  ❓ Text is empty?", !text || text.trim() === "")

    if (!text || text.trim() === "") {
      throw new Error("❌ Texto da mensagem está vazio!")
    }

    if (!ZAPI_BASE_URL || !ZAPI_TOKEN || !ZAPI_INSTANCE_ID || !ZAPI_CLIENT_TOKEN) {
      throw new Error(
        "❌ Variáveis Z-API não configuradas (falta WHATSAPP_API_URL / WHATSAPP_API_TOKEN / WHATSAPP_INSTANCE_ID / WHATSAPP_CLIENT_TOKEN)"
      )
    }

    const url = `${ZAPI_BASE_URL}/instances/${ZAPI_INSTANCE_ID}/token/${ZAPI_TOKEN}/send-text`

    const payload = {
      phone: normalizePhone(phone),
      message: text,
    }

    console.log("📤 Enviando para Z-API:", payload)

    const response = await axios.post(url, payload, {
      headers: {
  "Content-Type": "application/json",
  "Client-Token": ZAPI_CLIENT_TOKEN,
}
    })

    console.log("✅ Resposta Z-API:", response.data)
    return response.data
  } catch (error: any) {
    console.error(
      "❌ Erro ao enviar mensagem Z-API:",
      error.response?.data || error.message
    )
    throw error
  }
}

export function normalizePhone(phone: string): string {
  const cleaned = phone.replace(/\D/g, "")
  if (cleaned.startsWith("55")) return cleaned
  return `55${cleaned}`
}

export interface IncomingMessage {
  phone: string
  text: string
  messageId: string
  timestamp: number
}

/**
 * Extrai o texto da mensagem conforme o formato Z-API (e fallbacks).
 * Z-API: text.message, hydratedTemplate.message, buttonsResponseMessage.message, listResponseMessage.message, image.caption, etc.
 */
function extractText(body: any): string | null {
  if (body.text?.message) return body.text.message
  if (body.hydratedTemplate?.message) return body.hydratedTemplate.message
  if (body.buttonsResponseMessage?.message) return body.buttonsResponseMessage.message
  if (body.listResponseMessage?.message) return body.listResponseMessage.message
  if (body.image?.caption) return body.image.caption
  if (body.video?.caption) return body.video.caption
  if (body.document?.caption) return body.document.caption

  // Reação: pode tratar como texto fixo ou ignorar
  if (body.reaction?.value) return `[Reação: ${body.reaction.value}]`

  // Fallback formato Evolution/Baileys
  const data = body.data
  if (data?.message?.conversation) return data.message.conversation
  if (data?.message?.extendedTextMessage?.text)
    return data.message.extendedTextMessage.text

  return null
}

/**
 * Extrai o número de quem enviou (Z-API: phone; em grupo use participantPhone).
 */
function extractPhone(body: any): string | null {
  const isGroup = body.isGroup === true
  const phone = isGroup ? body.participantPhone : body.phone
  const fallback = body.phone || body.data?.key?.remoteJid?.split("@")[0]
  return phone || fallback || null
}

export function parseIncomingWebhook(body: any): IncomingMessage | null {
  try {
    // Z-API: ignorar mensagens enviadas por nós
    if (body.fromMe === true) return null

    const phone = extractPhone(body)
    const text = extractText(body)
    const messageId = body.messageId || body.data?.key?.id || `msg_${Date.now()}`
    const timestamp = body.momment ?? body.timestamp ?? Date.now()

    if (!phone || !text || String(text).trim() === "") {
      return null
    }

    return {
      phone: normalizePhone(String(phone)),
      text: String(text).trim(),
      messageId: String(messageId),
      timestamp: Number(timestamp),
    }
  } catch (error) {
    console.error("Erro ao parsear webhook:", error)
    return null
  }
}
