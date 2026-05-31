// lib/whatsapp.ts - Z-API (fallback para Meta se Z-API não configurada)
const META_TOKEN = process.env.META_WHATSAPP_TOKEN
const META_PHONE_ID = process.env.META_PHONE_NUMBER_ID
const META_VERIFY_TOKEN = process.env.META_VERIFY_TOKEN || 'buzzi123'

const ZAPI_URL = process.env.WHATSAPP_API_URL // https://api.z-api.io
const ZAPI_INSTANCE = process.env.WHATSAPP_INSTANCE_ID
const ZAPI_TOKEN = process.env.WHATSAPP_CLIENT_TOKEN

export async function sendTextMessage(phone: string, text: string) {
  if (!text || text.trim() === '') throw new Error('Texto vazio!')

  // Usa Z-API se configurada
  if (ZAPI_URL && ZAPI_INSTANCE && ZAPI_TOKEN) {
    return sendViaZAPI(phone, text)
  }

  // Fallback Meta
  return sendViaMeta(phone, text)
}

async function sendViaZAPI(phone: string, text: string) {
  try {
    const url = `${ZAPI_URL}/instances/${ZAPI_INSTANCE}/token/${ZAPI_TOKEN}/send-text`
    const payload = { phone: normalizePhone(phone), message: text }
    console.log('📤 Enviando via Z-API:', { phone: payload.phone })
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    const data = await response.json()
    if (!response.ok) throw new Error(JSON.stringify(data))
    console.log('✅ Z-API enviou:', data)
    return data
  } catch (error: any) {
    console.error('❌ Erro Z-API:', error.message)
    throw error
  }
}

async function sendViaMeta(phone: string, text: string) {
  try {
    if (!META_TOKEN || !META_PHONE_ID) throw new Error('Variáveis META não configuradas!')
    const url = `https://graph.facebook.com/v22.0/${META_PHONE_ID}/messages`
    const payload = {
      messaging_product: 'whatsapp',
      to: normalizePhone(phone),
      type: 'text',
      text: { body: text },
    }
    console.log('📤 Enviando para Meta API:', payload)
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${META_TOKEN}`,
      },
      body: JSON.stringify(payload),
    })
    const data = await response.json()
    if (!response.ok) throw new Error(JSON.stringify(data))
    console.log('✅ Meta API enviou:', data)
    return data
  } catch (error: any) {
    console.error('❌ Erro Meta API:', error.message)
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
    const entry = body?.entry?.[0]
    const changes = entry?.changes?.[0]
    const value = changes?.value
    const message = value?.messages?.[0]
    if (!message) return null
    if (message.from === META_PHONE_ID) return null
    const phone = message.from
    const text = message?.text?.body || null
    if (!phone || !text || text.trim() === '') return null
    return {
      phone: normalizePhone(String(phone)),
      text: String(text).trim(),
      messageId: message.id || `msg_${Date.now()}`,
      timestamp: message.timestamp || Date.now(),
    }
  } catch (error) {
    console.error('Erro ao parsear webhook:', error)
    return null
  }
}
