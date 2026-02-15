// lib/whatsapp.ts - API Oficial do Meta

const META_TOKEN = process.env.META_WHATSAPP_TOKEN
const META_PHONE_ID = process.env.META_PHONE_NUMBER_ID
const META_VERIFY_TOKEN = process.env.META_VERIFY_TOKEN || 'buzzi123'

export async function sendTextMessage(phone: string, text: string) {
  try {
    if (!text || text.trim() === '') throw new Error('Texto vazio!')
    if (!META_TOKEN || !META_PHONE_ID) throw new Error('Variáveis META não configuradas!')

    const url = `https://graph.facebook.com/v22.0/${META_PHONE_ID}/messages`

    const payload = {
      messaging_product: 'whatsapp',
      to: normalizePhone(phone),
      type: 'text',
      text: { body: text }
    }

    console.log('📤 Enviando para Meta API:', payload)

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${META_TOKEN}`
      },
      body: JSON.stringify(payload)
    })

    const data = await response.json()
    if (!response.ok) throw new Error(JSON.stringify(data))

    console.log('✅ Resposta Meta API:', data)
    return data

  } catch (error: any) {
    console.error('❌ Erro ao enviar Meta API:', error.message)
    throw error
  }
}

export function normalizePhone(phone: string): string {
  const cleaned = phone.replace(/\D/g, '')
  if (cleaned.startsWith('55')) return cleaned
  return `55${cleaned}`
}

export interface IncomingMessage {
  phone: string
  text: string
  messageId: string
  timestamp: number
}

export function parseIncomingWebhook(body: any): IncomingMessage | null {
  try {
    console.log('🔎 DEBUG BODY:', JSON.stringify(body, null, 2))

    // Formato API Oficial Meta
    const entry = body?.entry?.[0]
    const changes = entry?.changes?.[0]
    const value = changes?.value
    const message = value?.messages?.[0]

    if (!message) return null

    // Ignora mensagens enviadas pelo bot
    if (message.from === META_PHONE_ID) return null

    const phone = message.from
    const text = message?.text?.body || null

    if (!phone || !text || text.trim() === '') {
      console.log('⚠️ Mensagem ignorada:', { phone, text })
      return null
    }

    return {
      phone: normalizePhone(String(phone)),
      text: String(text).trim(),
      messageId: message.id || `msg_${Date.now()}`,
      timestamp: message.timestamp || Date.now(),
    }

  } catch (error) {
    console.error('Erro ao parsear webhook Meta:', error)
    return null
  }
}
