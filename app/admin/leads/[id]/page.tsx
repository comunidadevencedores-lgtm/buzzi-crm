'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

interface Message {
  id: string
  from: string
  text: string
  createdAt: string
}

interface Lead {
  id: string
  name: string | null
  phone: string
  stage: string
  status: string
  treatment: string | null
  botData: any
  messages: Message[]
}

export default function LeadPage({ params }: { params: { id: string } }) {
  const [lead, setLead] = useState<Lead | null>(null)
  const [message, setMessage] = useState('')
  const [sending, setSending] = useState(false)
  const router = useRouter()

  useEffect(() => {
    fetchLead()
  }, [params.id])

  async function fetchLead() {
    try {
      const res = await fetch(`/api/leads/${params.id}`)
      const data = await res.json()
      setLead(data.lead)
    } catch (error) {
      console.error('Erro ao buscar lead:', error)
    }
  }

  async function sendMessage(e: React.FormEvent) {
    e.preventDefault()
    if (!message.trim() || sending) return

    setSending(true)
    try {
      await fetch('/api/whatsapp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          leadId: params.id,
          text: message,
        }),
      })

      setMessage('')
      await fetchLead()
    } catch (error) {
      console.error('Erro ao enviar mensagem:', error)
      alert('Erro ao enviar mensagem')
    } finally {
      setSending(false)
    }
  }

  if (!lead) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-xl">Carregando...</div>
      </div>
    )
  }

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar com info do lead */}
      <div className="w-80 bg-white border-r border-gray-200 p-6 overflow-y-auto">
        <button
          onClick={() => router.push('/admin/kanban')}
          className="mb-6 text-blue-600 hover:text-blue-700"
        >
          ← Voltar ao Kanban
        </button>

        <h2 className="text-2xl font-bold mb-4">
          {lead.name || 'Sem nome'}
        </h2>

        <div className="space-y-4">
          <div>
            <p className="text-sm text-gray-500">Telefone</p>
            <p className="font-medium">{lead.phone}</p>
          </div>

          <div>
            <p className="text-sm text-gray-500">Etapa</p>
            <p className="font-medium">{lead.stage}</p>
          </div>

          <div>
            <p className="text-sm text-gray-500">Status</p>
            <span
              className={`inline-block px-3 py-1 rounded-full text-sm ${
                lead.status === 'hot'
                  ? 'bg-red-100 text-red-700'
                  : lead.status === 'warm'
                  ? 'bg-yellow-100 text-yellow-700'
                  : lead.status === 'cold'
                  ? 'bg-blue-100 text-blue-700'
                  : 'bg-gray-100 text-gray-700'
              }`}
            >
              {lead.status === 'hot'
                ? '🔥 Quente'
                : lead.status === 'warm'
                ? '☀️ Morno'
                : lead.status === 'cold'
                ? '❄️ Frio'
                : '🆕 Novo'}
            </span>
          </div>

          {lead.treatment && (
            <div>
              <p className="text-sm text-gray-500">Tratamento</p>
              <p className="font-medium">{lead.treatment}</p>
            </div>
          )}

          {lead.botData && Object.keys(lead.botData).length > 0 && (
            <div>
              <p className="text-sm text-gray-500 mb-2">Dados coletados</p>
              <div className="bg-gray-50 rounded p-3 space-y-2">
                {Object.entries(lead.botData).map(([key, value]) => (
                  <div key={key}>
                    <span className="text-xs text-gray-500">{key}:</span>
                    <span className="text-sm ml-2">{String(value)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Chat */}
      <div className="flex-1 flex flex-col">
        {/* Histórico de mensagens */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {lead.messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex ${
                msg.from === 'clinic' ? 'justify-end' : 'justify-start'
              }`}
            >
              <div
                className={`max-w-[70%] rounded-lg p-4 ${
                  msg.from === 'clinic'
                    ? 'bg-blue-500 text-white'
                    : msg.from === 'bot'
                    ? 'bg-purple-100 text-purple-900'
                    : 'bg-gray-100 text-gray-900'
                }`}
              >
                <div className="text-xs mb-1 opacity-70">
                  {msg.from === 'clinic'
                    ? '🏥 Clínica'
                    : msg.from === 'bot'
                    ? '🤖 Bot'
                    : '👤 Cliente'}
                </div>
                <p className="whitespace-pre-wrap">{msg.text}</p>
                <p className="text-xs mt-2 opacity-70">
                  {new Date(msg.createdAt).toLocaleString('pt-BR')}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Campo de envio */}
        <div className="border-t border-gray-200 p-4 bg-white">
          <form onSubmit={sendMessage} className="flex gap-2">
            <input
              type="text"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Digite sua mensagem..."
              className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
              disabled={sending}
            />
            <button
              type="submit"
              disabled={sending || !message.trim()}
              className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed"
            >
              {sending ? 'Enviando...' : 'Enviar'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
