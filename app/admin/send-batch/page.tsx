'use client'

import { useState, useEffect, useCallback } from 'react'

interface Lead {
  id: string
  name: string
  phone: string
}

interface BatchStatus {
  id: string
  name: string
  totalLeads: number
  sentCount: number
  failCount: number
  status: string
}

export default function SendBatchPage() {
  const [leads, setLeads] = useState<Lead[]>([])
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [batchMsg, setBatchMsg] = useState('')
  const [batchName, setBatchName] = useState('')
  const [batchStatus, setBatchStatus] = useState<BatchStatus | null>(null)
  const [sending, setSending] = useState(false)
  const [feedback, setFeedback] = useState<{ msg: string; ok: boolean } | null>(null)

  const fetchLeads = useCallback(async () => {
    try {
      const res = await fetch('/api/leads')
      if (res.ok) {
        const data = await res.json()
        setLeads(data.leads || data)
      }
    } catch (error) {
      console.error('Erro ao buscar leads:', error)
    }
  }, [])

  useEffect(() => {
    fetchLeads()
  }, [fetchLeads])

  function showFeedback(msg: string, ok = true) {
    setFeedback({ msg, ok })
    setTimeout(() => setFeedback(null), 4000)
  }

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  function toggleAll() {
    if (selected.size === leads.length) setSelected(new Set())
    else setSelected(new Set(leads.map((l) => l.id)))
  }

  async function handleBatchSend() {
    if (!batchMsg.trim()) return showFeedback('Digite a mensagem antes de enviar', false)
    const targets = leads.filter((l) => selected.has(l.id))
    if (!targets.length) return showFeedback('Selecione ao menos um lead', false)
    
    setSending(true)
    try {
      const res = await fetch('/api/send-batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: batchName || `Lote ${new Date().toLocaleDateString('pt-BR')}`,
          message: batchMsg,
          phones: targets.map((l) => ({ phone: l.phone, name: l.name })),
        }),
      })
      const data = await res.json()
      if (res.ok) {
        showFeedback(`✅ Disparo iniciado!`)
        pollBatch(data.batchId)
      } else {
        showFeedback(data.error || 'Erro ao enviar', false)
      }
    } catch (error) {
      showFeedback('Erro ao conectar com o servidor', false)
    } finally {
      setSending(false)
    }
  }

  async function pollBatch(id: string) {
    const interval = setInterval(async () => {
      const res = await fetch(`/api/send-batch?id=${id}`)
      const data = await res.json()
      setBatchStatus(data)
      if (data.status === 'done' || data.status === 'paused') clearInterval(interval)
    }, 3000)
  }

  return (
    <div className="h-full overflow-auto bg-slate-50 p-8">
      {feedback && (
        <div
          className={`fixed top-6 right-6 px-6 py-3 rounded-xl shadow-2xl z-50 animate-bounce text-white font-bold ${
            feedback.ok ? 'bg-green-500' : 'bg-red-500'
          }`}
        >
          {feedback.msg}
        </div>
      )}

      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Disparos em Massa</h1>
          <p className="text-slate-600">Crie campanhas e envie mensagens personalizadas</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Form Section */}
          <div className="space-y-6">
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
              <h2 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2">
                <span>📝</span> Configurar Mensagem
              </h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Nome da Campanha
                  </label>
                  <input
                    type="text"
                    value={batchName}
                    onChange={(e) => setBatchName(e.target.value)}
                    placeholder="Ex: Campanha de Implantes - Junho"
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-200 text-sm"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Mensagem
                  </label>
                  <textarea
                    value={batchMsg}
                    onChange={(e) => setBatchMsg(e.target.value)}
                    placeholder={"Olá {nome}! Tudo bem?\n\nPassando para apresentar..."}
                    className="w-full h-48 px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-200 text-sm resize-none"
                  />
                  <p className="text-xs text-slate-500 mt-2">
                    💡 Use <b>{"{nome}"}</b> para inserir o nome do lead automaticamente.
                  </p>
                </div>

                <button
                  onClick={handleBatchSend}
                  disabled={sending || selected.size === 0}
                  className="w-full py-4 bg-amber-500 text-white rounded-xl hover:bg-amber-600 disabled:bg-slate-300 disabled:cursor-not-allowed font-bold transition-all shadow-lg flex items-center justify-center gap-2"
                >
                  {sending ? '⌛ Processando...' : `🚀 Disparar para ${selected.size} contatos`}
                </button>
              </div>
            </div>

            {/* Status Section */}
            {batchStatus && (
              <div className="bg-slate-900 text-white rounded-2xl p-6 shadow-xl border border-slate-800">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-bold">{batchStatus.name}</h3>
                  <span className="px-2 py-1 bg-amber-500 text-slate-900 text-[10px] font-black rounded uppercase tracking-wider">
                    {batchStatus.status}
                  </span>
                </div>
                
                <div className="w-full bg-slate-800 rounded-full h-3 mb-4 overflow-hidden">
                  <div
                    className="bg-amber-500 h-full transition-all duration-500"
                    style={{ width: `${Math.round((batchStatus.sentCount / batchStatus.totalLeads) * 100)}%` }}
                  />
                </div>

                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <p className="text-[10px] text-slate-400 uppercase font-bold">Enviados</p>
                    <p className="text-xl font-black text-amber-400">{batchStatus.sentCount}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-400 uppercase font-bold">Falhas</p>
                    <p className="text-xl font-black text-red-400">{batchStatus.failCount}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-400 uppercase font-bold">Total</p>
                    <p className="text-xl font-black text-slate-200">{batchStatus.totalLeads}</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Selection Section */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col max-h-[700px]">
            <div className="p-4 border-b border-slate-200 bg-slate-50 flex justify-between items-center">
              <div>
                <h2 className="text-sm font-bold text-slate-900">Selecionar Contatos</h2>
                <p className="text-xs text-slate-500">{selected.size} de {leads.length} selecionados</p>
              </div>
              <button
                onClick={toggleAll}
                className="text-xs font-bold text-amber-600 hover:text-amber-700"
              >
                {selected.size === leads.length ? 'Desmarcar todos' : 'Selecionar todos'}
              </button>
            </div>

            <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
              {leads.length === 0 ? (
                <div className="p-8 text-center text-slate-400 text-sm">
                  Nenhum lead carregado.
                </div>
              ) : (
                leads.map((l) => (
                  <div
                    key={l.id}
                    onClick={() => toggleSelect(l.id)}
                    className={`p-4 flex items-center gap-4 cursor-pointer transition-colors ${
                      selected.has(l.id) ? 'bg-amber-50' : 'hover:bg-slate-50'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={selected.has(l.id)}
                      readOnly
                      className="rounded border-slate-300 text-amber-500 focus:ring-amber-500"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-900 truncate">
                        {l.name || 'Sem nome'}
                      </p>
                      <p className="text-xs text-slate-500">{l.phone}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
