'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'

const STAGES = [
  'Novos',
  'Triagem (bot)',
  'Em atendimento',
  'Orçamento enviado',
  'Agendamento pendente',
  'Agendado',
  'Fechou',
  'Perdido',
]

const STAGE_META: Record<string, { icon: string; color: string; bgColor: string }> = {
  'Novos':                 { icon: '✨', color: '#0891b2', bgColor: '#ecf0f1' },
  'Triagem (bot)':         { icon: '🤖', color: '#ea580c', bgColor: '#fef3c7' },
  'Em atendimento':        { icon: '💬', color: '#7c3aed', bgColor: '#f3e8ff' },
  'Orçamento enviado':     { icon: '📋', color: '#b45309', bgColor: '#fef3c7' },
  'Agendamento pendente':  { icon: '⏳', color: '#0369a1', bgColor: '#e0f2fe' },
  'Agendado':              { icon: '📅', color: '#15803d', bgColor: '#dcfce7' },
  'Fechou':                { icon: '🏆', color: '#1e40af', bgColor: '#dbeafe' },
  'Perdido':               { icon: '❌', color: '#6b7280', bgColor: '#f3f4f6' },
}

interface Lead {
  id: string
  name: string | null
  phone: string
  stage: string
  status: string
  treatment: string | null
  lastMessageAt: string
  messages: Array<{ text: string; from: string }>
}

export default function KanbanPage() {
  const [leads, setLeads] = useState<Lead[]>([])
  const [loading, setLoading] = useState(true)
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date())

  const fetchLeads = useCallback(async () => {
    try {
      const res = await fetch('/api/leads', {
        cache: 'no-store',
        headers: { 'Cache-Control': 'no-cache' },
      })
      const data = await res.json()
      setLeads(data.leads || [])
      setLastUpdate(new Date())
    } catch (error) {
      console.error('Erro ao buscar leads:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchLeads()
    const interval = setInterval(fetchLeads, 10000)
    return () => clearInterval(interval)
  }, [fetchLeads])

  const leadsByStage: Record<string, Lead[]> = {}
  STAGES.forEach(stage => { leadsByStage[stage] = [] })
  leads.forEach(lead => {
    if (leadsByStage[lead.stage]) {
      leadsByStage[lead.stage].push(lead)
    }
  })

  const totalLeads = leads.length
  const qualifiedLeads = leads.filter(l => l.status === 'warm' || l.status === 'hot').length

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="text-5xl mb-4">🦷</div>
          <div className="text-lg font-semibold text-slate-700">Carregando Kanban...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col">
      {/* Stats Bar */}
      <div className="bg-white border-b border-slate-200 px-8 py-4 flex gap-6">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-lg bg-blue-100 flex items-center justify-center text-xl">👥</div>
          <div>
            <p className="text-xs text-slate-500">Total de Leads</p>
            <p className="text-2xl font-bold text-slate-900">{totalLeads}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-lg bg-amber-100 flex items-center justify-center text-xl">🔥</div>
          <div>
            <p className="text-xs text-slate-500">Leads Qualificados</p>
            <p className="text-2xl font-bold text-slate-900">{qualifiedLeads}</p>
          </div>
        </div>
        <div className="flex items-center gap-3 ml-auto">
          <div className="text-right">
            <p className="text-xs text-slate-500">Última atualização</p>
            <p className="text-sm font-medium text-slate-700">{lastUpdate.toLocaleTimeString('pt-BR')}</p>
          </div>
          <button
            onClick={fetchLeads}
            className="px-4 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-colors text-sm font-medium"
          >
            🔄 Atualizar
          </button>
        </div>
      </div>

      {/* Kanban Board */}
      <div className="flex-1 overflow-x-auto p-6">
        <div className="flex gap-6 h-full">
          {STAGES.map(stage => {
            const meta = STAGE_META[stage]
            const stageLeads = leadsByStage[stage] || []

            return (
              <div
                key={stage}
                className="flex-shrink-0 w-80 bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow flex flex-col"
              >
                {/* Column Header */}
                <div className="p-4 border-b border-slate-200 flex items-center gap-3">
                  <span className="text-2xl">{meta.icon}</span>
                  <div className="flex-1">
                    <h3 className="font-semibold text-slate-900">{stage}</h3>
                    <p className="text-xs text-slate-500">{stageLeads.length} leads</p>
                  </div>
                  <span
                    className="px-3 py-1 rounded-full text-xs font-bold"
                    style={{ color: meta.color, backgroundColor: meta.bgColor }}
                  >
                    {stageLeads.length}
                  </span>
                </div>

                {/* Cards Container */}
                <div className="flex-1 overflow-y-auto p-3 space-y-3">
                  {stageLeads.length === 0 ? (
                    <div className="flex items-center justify-center h-32 text-slate-400">
                      <p className="text-sm">Nenhum lead</p>
                    </div>
                  ) : (
                    stageLeads.map(lead => {
                      const statusMap: Record<string, { label: string; color: string; bg: string }> = {
                        hot:  { label: '🔥 Quente', color: '#dc2626', bg: '#fee2e2' },
                        warm: { label: '☀️ Morno',  color: '#ea580c', bg: '#fed7aa' },
                        cold: { label: '❄️ Frio',   color: '#0369a1', bg: '#cffafe' },
                        new:  { label: '🆕 Novo',   color: '#0891b2', bg: '#ecf0f1' },
                      }
                      const st = statusMap[lead.status] ?? statusMap.new
                      const initials = lead.name
                        ? lead.name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase()
                        : lead.phone.slice(-2)
                      const avatarColors = ['#0891b2', '#f59e0b', '#8b5cf6', '#10b981', '#ea580c', '#0369a1']
                      const avatarBg = avatarColors[lead.phone.charCodeAt(lead.phone.length - 1) % avatarColors.length]

                      return (
                        <Link key={lead.id} href={`/admin/leads/${lead.id}`}>
                          <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 hover:shadow-md hover:border-slate-300 transition-all cursor-pointer">
                            {/* Avatar + Name + Status */}
                            <div className="flex items-center gap-2 mb-2">
                              <div
                                className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                                style={{ backgroundColor: avatarBg }}
                              >
                                {initials}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-semibold text-slate-900 truncate">
                                  {lead.name || 'Sem nome'}
                                </p>
                                <p className="text-xs text-slate-500">{lead.phone}</p>
                              </div>
                            </div>

                            {/* Status Badge */}
                            <div className="mb-2">
                              <span
                                className="text-xs font-bold px-2 py-1 rounded-full"
                                style={{ color: st.color, backgroundColor: st.bg }}
                              >
                                {st.label}
                              </span>
                            </div>

                            {/* Treatment */}
                            {lead.treatment && (
                              <p className="text-xs text-slate-600 mb-2">📋 {lead.treatment}</p>
                            )}

                            {/* Last Message */}
                            {lead.messages?.[0] && (
                              <p className="text-xs text-slate-500 line-clamp-2 mb-2">
                                {lead.messages[0].text}
                              </p>
                            )}

                            {/* Time */}
                            <p className="text-xs text-slate-400 text-right">
                              {new Date(lead.lastMessageAt).toLocaleString('pt-BR', {
                                month: 'short',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </p>
                          </div>
                        </Link>
                      )
                    })
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
