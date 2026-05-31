'use client'

import { useState, useRef, useEffect, useCallback } from 'react'

interface Lead {
  id: string
  name: string
  phone: string
  email?: string
  company?: string
  status: string
  treatment?: string
}

export default function LeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([])
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [uploading, setUploading] = useState(false)
  const [uploadResult, setUploadResult] = useState<string | null>(null)
  const [feedback, setFeedback] = useState<{ msg: string; ok: boolean } | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

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

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    setUploadResult(null)
    const fd = new FormData()
    fd.append('file', file)
    try {
      const res = await fetch('/api/upload-leads', { method: 'POST', body: fd })
      const data = await res.json()
      setUploadResult(data.message || data.error || 'Resultado da importação')
      if (res.ok) {
        showFeedback('✅ Lista importada com sucesso!')
        fetchLeads()
      } else {
        showFeedback(data.error || 'Erro no upload', false)
      }
    } catch (error) {
      showFeedback('Erro ao conectar com o servidor', false)
    } finally {
      setUploading(false)
    }
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

      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-end mb-8">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 mb-2">Gestão de Leads</h1>
            <p className="text-slate-600">Importe e gerencie sua base de contatos</p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => fileRef.current?.click()}
              className="px-6 py-3 bg-amber-500 text-white rounded-lg hover:bg-amber-600 font-semibold transition-all shadow-md flex items-center gap-2"
            >
              <span>{uploading ? '⌛ Importando...' : '📁 Importar CSV'}</span>
              <input
                ref={fileRef}
                type="file"
                accept=".csv"
                className="hidden"
                onChange={handleUpload}
              />
            </button>
            <button
              onClick={fetchLeads}
              className="px-6 py-3 bg-white border border-slate-200 text-slate-700 rounded-lg hover:bg-slate-50 font-semibold transition-all shadow-sm"
            >
              🔄 Atualizar
            </button>
          </div>
        </div>

        {/* Upload Feedback */}
        {uploadResult && (
          <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-xl text-blue-800 text-sm">
            {uploadResult}
          </div>
        )}

        {/* Leads Table */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-200 bg-slate-50 flex justify-between items-center">
            <p className="text-sm font-semibold text-slate-700">
              {leads.length} leads cadastrados
            </p>
            <button
              onClick={toggleAll}
              className="text-xs font-bold text-amber-600 hover:text-amber-700"
            >
              {selected.size === leads.length ? 'Desmarcar todos' : 'Selecionar todos'}
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-slate-100 text-xs font-bold text-slate-400 uppercase tracking-wider">
                  <th className="px-6 py-4 w-10">
                    <input
                      type="checkbox"
                      checked={selected.size === leads.length && leads.length > 0}
                      onChange={toggleAll}
                      className="rounded border-slate-300 text-amber-500 focus:ring-amber-500"
                    />
                  </th>
                  <th className="px-6 py-4">Nome</th>
                  <th className="px-6 py-4">Telefone</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4">Tratamento</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {leads.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-slate-400">
                      Nenhum lead encontrado. Importe uma lista para começar.
                    </td>
                  </tr>
                ) : (
                  leads.map((l) => (
                    <tr
                      key={l.id}
                      className={`hover:bg-slate-50 transition-colors ${
                        selected.has(l.id) ? 'bg-amber-50' : ''
                      }`}
                    >
                      <td className="px-6 py-4">
                        <input
                          type="checkbox"
                          checked={selected.has(l.id)}
                          onChange={() => toggleSelect(l.id)}
                          className="rounded border-slate-300 text-amber-500 focus:ring-amber-500"
                        />
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-sm font-semibold text-slate-900">
                          {l.name || 'Sem nome'}
                        </p>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-600">{l.phone}</td>
                      <td className="px-6 py-4">
                        <span
                          className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase ${
                            l.status === 'hot'
                              ? 'bg-red-100 text-red-600'
                              : l.status === 'warm'
                              ? 'bg-orange-100 text-orange-600'
                              : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {l.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-500">
                        {l.treatment || '-'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Selection Info */}
        {selected.size > 0 && (
          <div className="fixed bottom-8 left-1/2 -translate-x-1/2 bg-slate-900 text-white px-8 py-4 rounded-2xl shadow-2xl flex items-center gap-6 animate-in fade-in slide-in-from-bottom-4">
            <p className="text-sm font-medium">
              <span className="text-amber-400 font-bold">{selected.size}</span> leads selecionados
            </p>
            <div className="h-6 w-px bg-slate-700" />
            <button
              onClick={() => (window.location.href = '/admin/send-batch')}
              className="px-4 py-2 bg-amber-500 text-slate-900 rounded-lg text-xs font-bold hover:bg-amber-400 transition-colors"
            >
              🚀 Ir para Disparos
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
