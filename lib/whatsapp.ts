const META_TOKEN = process.env.META_WHATSAPP_TOKEN
const META_PHONE_ID = process.env.META_PHONE_NUMBER_ID

const ZAPI_URL = process.env.WHATSAPP_API_URL
const ZAPI_INSTANCE = process.env.WHATSAPP_INSTANCE_ID
const ZAPI_TOKEN = process.env.WHATSAPP_CLIENT_TOKEN
const ZAPI_SECURITY_TOKEN = process.env.WHATSAPP_SECURITY_TOKEN

export function normalizePhone(phone: string): string {
  const digits = phone.replace(/\D/g, '')
  // Garante DDI 55
  let n = digits.startsWith('55') ? digits : `55${digits}`
  // Brasil: 55 + DDD(2) + número
  // Móvel com 8 dígitos após DDD → adiciona o 9
  if (n.length === 12) n = n.slice(0, 4) + '9' + n.slice(4)
  return n
}

export async function sendTextMessage(phone: string, text: string) {
  if (!text?.trim()) throw new Error('Texto vazio!')
  if (ZAPI_URL && ZAPI_INSTANCE && ZAPI_TOKEN) return sendViaZAPI(phone, text)
  return sendViaMeta(phone, text)
}

async function sendViaZAPI(phone: string, text: string) {
  const url = `${ZAPI_URL}/instances/${ZAPI_INSTANCE}/token/${ZAPI_TOKEN}/send-text`
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (ZAPI_SECURITY_TOKEN) headers['Client-Token'] = ZAPI_SECURITY_TOKEN
  console.log('📤 Z-API:', normalizePhone(phone))
  const res = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify({ phone: normalizePhone(phone), message: text }),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || JSON.stringify(data))
  console.log('✅ Z-API ok:', data)
  return data
}

async function sendViaMeta(phone: string, text: string) {
  if (!META_TOKEN || !META_PHONE_ID) throw new Error('META não configurado!')
  const res = await fetch(`https://graph.facebook.com/v22.0/${META_PHONE_ID}/messages`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${META_TOKEN}` },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      to: normalizePhone(phone),
      type: 'text',
      text: { body: text },
    }),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(JSON.stringify(data))
  return data
}

export interface IncomingMessage {
  phone: string
  text: string
  messageId: string
  timestamp: number
}

export function parseIncomingWebhook(body: any): IncomingMessage | null {
  try {
    // Z-API
    if (body.phone && (body.text || body.message)) {
      if (body.fromMe === true || body.isOutbound === true) return null
      const text = body.text?.message || body.message || ''
      if (!text.trim()) return null
      return {
        phone: normalizePhone(String(body.phone)),
        text: text.trim(),
        messageId: body.messageId || `zapi_${Date.now()}`,
        timestamp: body.moment || Date.now(),
      }
    }
    // Meta
    const message = body?.entry?.[0]?.changes?.[0]?.value?.messages?.[0]
    if (message) {
      if (message.from === META_PHONE_ID) return null
      const text = message?.text?.body
      if (!message.from || !text?.trim()) return null
      return {
        phone: normalizePhone(String(message.from)),
        text: text.trim(),
        messageId: message.id || `meta_${Date.now()}`,
        timestamp: message.timestamp || Date.now(),
      }
    }
    return null
  } catch (e) {
    console.error('parseIncomingWebhook erro:', e)
    retu
