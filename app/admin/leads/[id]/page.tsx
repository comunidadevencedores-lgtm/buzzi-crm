'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
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
  botStep: string
  messages: Message[]
}

const STAGES = ['Novos', 'Triagem (bot)', 'Em atendimento', 'Orçamento enviado', 'Agendamento pendente', 'Agendado', 'Fechou', 'Perdido']

export default function LeadPage({ params }: { params: { id: string } }) {
  const [lead, setLead] = useState<Lead | null>(null)
  const [message, setMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [botPaused, setBotPaused] = useState(false)
  const [editingName, setEditingName] = useState(false)
  const [nameInput, setNameInput] = useState('')
  const [saving, setSaving] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const router = useRouter()

  const fetchLead = useCallback(async () => {
    try {
      const res = await fetch(`/api/leads/${params.id}`)
      const data = await res.json()
      setLead(data.lead)
      setBotPaused(data.lead?.botStep === 'paused')
    } catch (error) {
      console.error('Erro ao buscar lead:', error)
    }
  }, [params.id])

  useEffect(() => {
    fetchLead()
    const interval = setInterval(fetchLead, 5000)
    return () => clearInterval(interval)
  }, [fetchLead])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [lead?.messages])

  async function saveName() {
    if (!nameInput.trim()) return
    setSaving(true)
    try {
      await fetch(`/api/leads/${params.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: nameInput.trim() }),
      })
      setEditingName(false)
      await fetchLead()
    } catch {
      alert('Erro ao salvar nome')
    } finally {
      setSaving(false)
    }
  }

  async function updateField(field: string, value: string) {
    try {
      await fetch(`/api/leads/${params.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [field]: value }),
      })
      await fetchLead()
    } catch {
      alert('Erro ao atualizar')
    }
  }

  async function sendMessage(e: React.FormEvent) {
    e.preventDefault()
    if (!message.trim() || sending) return
    setSending(true)
    try {
      const res = await fetch('/api/whatsapp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leadId: params.id, text: message }),
      })
      if (!res.ok) throw new Error('Erro ao enviar')
      setMessage('')
      await fetchLead()
    } catch {
      alert('Erro ao enviar mensagem')
    } finally {
      setSending(false)
    }
  }

  async function toggleBot() {
    try {
      await fetch(`/api/leads/${params.id}/stage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ botStep: botPaused ? 'start' : 'paused' }),
      })
      setBotPaused(!botPaused)
      await fetchLead()
    } catch {
      alert('Erro ao alterar bot')
    }
  }

  if (!lead) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="text-4xl mb-4">⏳</div>
          <p className="text-slate-600">Carregando lead...</p>
        </div>
      </div>
    )
  }

  const statusMap: Record<string, { label: string; color: string; bg: string }> = {
    hot:  { label: '🔥 Quente', color: '#dc2626', bg: '#fee2e2' },
    warm: { label: '☀️ Morno',  color: '#ea580c', bg: '#fed7aa' },
    cold: { label: '❄️ Frio',   color: '#0369a1', bg: '#cffafe' },
    new:  { label: '🆕 Novo',   color: '#0891b2', bg: '#ecf0f1' },
  }
  const st = statusMap[lead.status] ?? statusMap.new

  return (
    <div className="flex h-full bg-slate-50">
      {/* Sidebar */}
      <div className="w-80 bg-white border-r border-slate-200 flex flex-col">
        <div className="p-6 border-b border-slate-200">
          <button
            onClick={() => router.push('/admin/kanban')}
            className="mb-4 text-sm text-amber-600 hover:text-amber-700 font-medium flex items-center gap-2"
          >
            ← Voltar ao Kanban
          </button>

          {/* Nome editável */}
          {editingName ? (
            <div className="flex gap-2 items-center">
              <input
                autoFocus
                value={nameInput}
                onChange={e => setNameInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') saveName(); if (e.key === 'Escape') setEditingName(false) }}
                className="flex-1 text-lg font-bold border-b-2 border-amber-500 outline-none bg-transparent text-slate-900 py-1"
                placeholder="Nome do lead"
              />
              <button onClick={saveName} disabled={saving} className="text-xs bg-amber-500 text-white px-2 py-1 rounded font-semibold">
                {saving ? '...' : '✓'}
              </button>
              <button onClick={() => setEditingName(false)} className="text-xs text-slate-400 px-1">✕</button>
            </div>
          ) : (
            <div className="flex items-center gap-2 group">
              <h2 className="text-2xl font-bold text-slate-900">{lead.name || 'Sem nome'}</h2>
              <button
                onClick={() => { setNameInput(lead.name || ''); setEditingName(true) }}
                className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-amber-500 transition-all text-sm"
                title="Editar nome"
              >
                ✏️
              </button>
            </div>
          )}
          <p className="text-sm text-slate-500 mt-1">{lead.phone}</p>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Status */}
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Status</p>
            <select
              value={lead.status}
              onChange={e => updateField('status', e.target.value)}
              className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:border-amber-500"
            >
              <option value="new">🆕 Novo</option>
              <option value="cold">❄️ Frio</option>
              <option value="warm">☀️ Morno</option>
              <option value="hot">🔥 Quente</option>
            </select>
          </div>

          {/* Stage */}
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Etapa</p>
            <select
              value={lead.stage}
              onChange={e => updateField('stage', e.target.value)}
              className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:border-amber-500"
            >
              {STAGES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>

          {/* Treatment */}
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Tratamento</p>
            <select
              value={lead.treatment || ''}
              onChange={e => updateField('treatment', e.target.value)}
              className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:border-amber-500"
            >
              <option value="">Não definido</option>
              <option value="Implantes">Implantes</option>
              <option value="Lentes/Facetas">Lentes/Facetas</option>
              <option value="Clareamento">Clareamento</option>
              <option value="Ortodontia">Ortodontia</option>
              <option value="Prótese">Prótese</option>
              <option value="Cirurgia">Cirurgia</option>
              <option value="Consulta geral">Consulta geral</option>
            </select>
          </div>

          {/* Bot Data */}
          {lead.botData && Object.keys(lead.botData).length > 0 && (
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Dados Coletados</p>
              <div className="space-y-2">
                {Object.entries(lead.botData).map(([key, value]) => (
                  <div key={key} className="bg-slate-50 rounded-lg p-3">
                    <p className="text-xs text-slate-500 mb-1">{key}</p>
                    <p className="text-sm font-medium text-slate-900">{String(value)}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="p-6 border-t border-slate-200">
          <button
            onClick={toggleBot}
            className={`w-full py-3 px-4 rounded-lg text-sm font-semibold transition-all ${
              botPaused ? 'bg-green-100 text-green-700 hover:bg-green-200' : 'bg-orange-100 text-orange-700 hover:bg-orange-200'
            }`}
          >
            {botPaused ? '▶️ Retomar Bot' : '⏸️ Pausar Bot'}
          </button>
          <p className="text-xs text-slate-500 mt-2 text-center">
            {botPaused ? 'Você está no controle' : 'Bot respondendo automaticamente'}
          </p>
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col">
        <div className="bg-white border-b border-slate-200 px-8 py-4 flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-slate-900">{lead.name || lead.phone}</h3>
            <p className="text-xs text-slate-500 mt-1">
              {new Date(lead.messages[lead.messages.length - 1]?.createdAt || new Date()).toLocaleString('pt-BR')}
            </p>
          </div>
          <span className={`text-xs px-3 py-1 rounded-full font-bold ${botPaused ? 'bg-orange-100 text-orange-600' : 'bg-green-100 text-green-600'}`}>
            {botPaused ? '⏸️ Bot pausado' : '🤖 Bot ativo'}
          </span>
        </div>

        <div className="flex-1 overflow-y-auto p-8 space-y-4">
          {lead.messages.map((msg) => (
            <div key={msg.id} className={`flex ${msg.from === 'agent' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-xs rounded-2xl px-4 py-3 ${
                msg.from === 'agent' ? 'bg-amber-500 text-white' : msg.from === 'bot' ? 'bg-purple-100 text-purple-900' : 'bg-slate-100 text-slate-900'
              }`}>
                <div className="text-xs mb-1 opacity-70 font-semibold">
                  {msg.from === 'agent' ? '🏥 Você' : msg.from === 'bot' ? '🤖 Bia' : '👤 Cliente'}
                </div>
                <p className="text-sm whitespace-pre-wrap">{msg.text}</p>
                <p className="text-xs mt-2 opacity-60">
                  {new Date(msg.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        <div className="bg-white border-t border-slate-200 p-6">
          <form onSubmit={sendMessage} className="flex gap-3">
            <input
              type="text"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Digite sua mensagem..."
              className="flex-1 px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-200 text-sm"
              disabled={sending}
            />
            <button
              type="submit"
              disabled={sending || !message.trim()}
              className="px-6 py-3 bg-amber-500 text-white rounded-lg hover:bg-amber-600 disabled:bg-slate-300 disabled:cursor-not-allowed text-sm font-semibold transition-colors"
            >
              {sending ? '...' : '📤 Enviar'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
