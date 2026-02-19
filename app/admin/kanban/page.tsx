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
      const res = await fetch('/api/leads')
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
    // Atualiza a cada 10 segundos automaticamente
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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-xl">Carregando...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-[1600px] mx-auto">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Kanban CRM</h1>
            <p className="text-gray-600 mt-1">Total de leads: {leads.length}</p>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-gray-400">
              Atualizado: {lastUpdate.toLocaleTimeString('pt-BR')}
            </span>
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" title="Atualizando automaticamente"/>
            <button
              onClick={fetchLeads}
              className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700"
            >
              🔄 Atualizar
            </button>
          </div>
        </div>

        <div className="flex gap-4 overflow-x-auto pb-4">
          {STAGES.map((stage) => {
            const stageLeads = leadsByStage[stage] || []
            return (
              <div key={stage} className="flex-shrink-0 w-80 bg-white rounded-lg shadow-sm border border-gray-200">
                <div className="p-4 border-b border-gray-200">
                  <h2 className="font-semibold text-gray-900">
                    {stage}
                    <span className="ml-2 text-sm text-gray-500">({stageLeads.length})</span>
                  </h2>
                </div>

                <div className="p-4 space-y-3 max-h-[calc(100vh-250px)] overflow-y-auto">
                  {stageLeads.length === 0 ? (
                    <p className="text-sm text-gray-400 text-center py-8">Nenhum lead nesta etapa</p>
                  ) : (
                    stageLeads.map((lead) => (
                      <Link key={lead.id} href={`/admin/leads/${lead.id}`} className="block">
                        <div className="p-4 bg-gray-50 rounded-lg border border-gray-200 hover:border-blue-500 hover:shadow-md transition-all cursor-pointer">
                          <div className="flex items-start justify-between mb-2">
                            <h3 className="font-medium text-gray-900">{lead.name || 'Sem nome'}</h3>
                            <span className={`px-2 py-1 text-xs rounded-full ${
                              lead.status === 'hot' ? 'bg-red-100 text-red-700' :
                              lead.status === 'warm' ? 'bg-yellow-100 text-yellow-700' :
                              lead.status === 'cold' ? 'bg-blue-100 text-blue-700' :
                              'bg-gray-100 text-gray-700'
                            }`}>
                              {lead.status === 'hot' ? '🔥 Quente' :
                               lead.status === 'warm' ? '☀️ Morno' :
                               lead.status === 'cold' ? '❄️ Frio' : '🆕 Novo'}
                            </span>
                          </div>
                          <p className="text-sm text-gray-600 mb-2">{lead.phone}</p>
                          {lead.treatment && (
                            <p className="text-xs text-gray-500 mb-2">📋 {lead.treatment}</p>
                          )}
                          {lead.messages?.[0] && (
                            <p className="text-xs text-gray-400 line-clamp-2">{lead.messages[0].text}</p>
                          )}
                          <p className="text-xs text-gray-400 mt-2">
                            {new Date(lead.lastMessageAt).toLocaleString('pt-BR')}
                          </p>
                        </div>
                      </Link>
                    ))
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
