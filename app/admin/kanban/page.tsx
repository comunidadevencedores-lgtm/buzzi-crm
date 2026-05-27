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

const STAGE_META: Record<string, { icon: string; color: string }> = {
  'Novos':                 { icon: '✨', color: '#0B6E6E' },
  'Triagem (bot)':         { icon: '🤖', color: '#C2610A' },
  'Em atendimento':        { icon: '💬', color: '#7B4CA5' },
  'Orçamento enviado':     { icon: '📋', color: '#C9A84C' },
  'Agendamento pendente':  { icon: '⏳', color: '#1A6276' },
  'Agendado':              { icon: '📅', color: '#1A7A4A' },
  'Fechou':                { icon: '🏆', color: '#1A5276' },
  'Perdido':               { icon: '❌', color: '#9E9D96' },
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

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#FAF7F2', fontFamily: "'DM Sans', sans-serif" }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>🦷</div>
          <div style={{ fontSize: 16, color: '#0B6E6E', fontWeight: 600 }}>Carregando Buzzi CRM...</div>
        </div>
      </div>
    )
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700;800&family=DM+Sans:wght@400;500;600;700&display=swap');
        * { box-sizing: border-box; }
        body { margin: 0; }
        ::-webkit-scrollbar { width: 5px; height: 5px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #DEDDD7; border-radius: 10px; }
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.4} }
      `}</style>

      <div style={{ minHeight: '100vh', background: '#FAF7F2', fontFamily: "'DM Sans', sans-serif", display: 'flex', flexDirection: 'column' }}>

        {/* ── Top Nav ── */}
        <div style={{ background: '#084F4F', color: '#fff', padding: '0 24px', height: 56, display: 'flex', alignItems: 'center', gap: 16, boxShadow: '0 2px 16px rgba(8,79,79,0.3)', position: 'sticky', top: 0, zIndex: 100 }}>
          {/* Logo */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginRight: 16 }}>
            <div style={{ width: 32, height: 32, borderRadius: 9, background: '#C9A84C', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Playfair Display', serif", fontWeight: 800, fontSize: 17, color: '#084F4F' }}>B</div>
            <div>
              <div style={{ fontFamily: "'Playfair Display', serif", fontWeight: 700, fontSize: 15, lineHeight: 1.2 }}>Buzzi CRM</div>
              <div style={{ fontSize: 9, opacity: 0.55, letterSpacing: 0.8 }}>ODONTOLOGIA · CURITIBA</div>
            </div>
          </div>

          <div style={{ flex: 1 }} />

          {/* Stats */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 12, background: 'rgba(255,255,255,0.1)', borderRadius: 20, padding: '3px 12px', opacity: 0.85 }}>
              👥 {leads.length} leads
            </span>
            <span style={{ fontSize: 11, opacity: 0.55 }}>
              {lastUpdate.toLocaleTimeString('pt-BR')}
            </span>
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#4ADE80', display: 'inline-block', animation: 'pulse 2s infinite' }} title="Atualizando automaticamente" />
            <button
              onClick={fetchLeads}
              style={{ background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.2)', color: '#fff', borderRadius: 8, padding: '5px 12px', fontSize: 12, cursor: 'pointer' }}
            >
              🔄 Atualizar
            </button>
            <div style={{ width: 30, height: 30, borderRadius: '50%', background: '#C9A84C', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Playfair Display', serif", fontWeight: 800, fontSize: 12, color: '#084F4F' }}>FB</div>
          </div>
        </div>

        {/* ── Board ── */}
        <div style={{ flex: 1, overflowX: 'auto', padding: '20px 20px 20px 24px', display: 'flex', gap: 12, alignItems: 'flex-start' }}>
          {STAGES.map(stage => {
            const meta = STAGE_META[stage]
            const stageLeads = leadsByStage[stage] || []

            return (
              <div key={stage} style={{ flexShrink: 0, width: 280, background: '#fff', borderRadius: 14, border: '1.5px solid #EFEFEB', boxShadow: '0 1px 6px rgba(0,0,0,0.05)', display: 'flex', flexDirection: 'column', maxHeight: 'calc(100vh - 100px)' }}>

                {/* Column header */}
                <div style={{ padding: '12px 14px', borderBottom: '1.5px solid #EFEFEB', display: 'flex', alignItems: 'center', gap: 7 }}>
                  <span style={{ fontSize: 16 }}>{meta.icon}</span>
                  <span style={{ fontWeight: 700, fontSize: 13, color: '#2C2C28', flex: 1, fontFamily: "'Playfair Display', serif" }}>{stage}</span>
                  <span style={{ background: `${meta.color}18`, color: meta.color, border: `1px solid ${meta.color}30`, borderRadius: 20, padding: '2px 9px', fontSize: 11.5, fontWeight: 700 }}>
                    {stageLeads.length}
                  </span>
                </div>

                {/* Cards */}
                <div style={{ padding: '10px 9px', overflowY: 'auto', flex: 1 }}>
                  {stageLeads.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '28px 8px', color: '#9E9D96', fontSize: 12 }}>
                      <div style={{ fontSize: 22, marginBottom: 6, opacity: 0.3 }}>—</div>
                      Nenhum lead
                    </div>
                  ) : (
                    stageLeads.map(lead => {
                      const statusMap: Record<string, { label: string; color: string; bg: string }> = {
                        hot:  { label: '🔥 Quente', color: '#B03A2E', bg: '#FDECEA' },
                        warm: { label: '☀️ Morno',  color: '#C2610A', bg: '#FEF0E3' },
                        cold: { label: '❄️ Frio',   color: '#1A5276', bg: '#E8EFF8' },
                        new:  { label: '🆕 Novo',   color: '#0B6E6E', bg: '#E6F4F4' },
                      }
                      const st = statusMap[lead.status] ?? statusMap.new
                      const initials = lead.name
                        ? lead.name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase()
                        : lead.phone.slice(-2)
                      const avatarColors = ['#0B6E6E','#C9A84C','#7B4CA5','#1A7A4A','#C2610A','#1A5276']
                      const avatarBg = avatarColors[lead.phone.charCodeAt(lead.phone.length - 1) % avatarColors.length]

                      return (
                        <Link key={lead.id} href={`/admin/leads/${lead.id}`} style={{ textDecoration: 'none', display: 'block', marginBottom: 9 }}>
                          <div style={{ background: '#FAFAF8', border: '1.5px solid #E8E8E2', borderRadius: 12, padding: '12px 13px', transition: 'all 0.15s', cursor: 'pointer' }}
                            onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.borderColor = '#0B6E6E'; (e.currentTarget as HTMLDivElement).style.boxShadow = '0 3px 12px rgba(11,110,110,0.12)' }}
                            onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.borderColor = '#E8E8E2'; (e.currentTarget as HTMLDivElement).style.boxShadow = 'none' }}
                          >
                            {/* Row 1: avatar + name + status */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 7 }}>
                              <div style={{ width: 32, height: 32, borderRadius: '50%', background: avatarBg, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: 12, fontFamily: "'Playfair Display', serif", flexShrink: 0 }}>
                                {initials}
                              </div>
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ fontWeight: 700, fontSize: 13, color: '#2C2C28', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontFamily: "'Playfair Display', serif" }}>
                                  {lead.name || 'Sem nome'}
                                </div>
                                <div style={{ fontSize: 11, color: '#9E9D96', marginTop: 1 }}>{lead.phone}</div>
                              </div>
                              <span style={{ fontSize: 10.5, background: st.bg, color: st.color, borderRadius: 20, padding: '2px 7px', fontWeight: 600, flexShrink: 0 }}>
                                {st.label}
                              </span>
                            </div>

                            {/* Treatment */}
                            {lead.treatment && (
                              <div style={{ fontSize: 11.5, color: '#6B6A64', marginBottom: 6 }}>📋 {lead.treatment}</div>
                            )}

                            {/* Last message */}
                            {lead.messages?.[0] && (
                              <div style={{ fontSize: 11.5, color: '#9E9D96', marginBottom: 7, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' as any }}>
                                {lead.messages[0].text}
                              </div>
                            )}

                            {/* Time */}
                            <div style={{ fontSize: 11, color: '#BEBDB7', textAlign: 'right' }}>
                              {new Date(lead.lastMessageAt).toLocaleString('pt-BR')}
                            </div>
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

        {/* Footer */}
        <div style={{ textAlign: 'center', padding: '5px', fontSize: 10, color: '#9E9D96', background: '#fff', borderTop: '1px solid #EFEFEB' }}>
          Buzzi Odontologia · Dra. Fernanda Buzzi · CRO-PR 17042 · Curitiba, PR
        </div>
      </div>
    </>
  )
}
