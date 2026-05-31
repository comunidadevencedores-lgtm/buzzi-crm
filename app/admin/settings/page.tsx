'use client'

import { useState, useEffect } from 'react'

interface Config {
  whatsappApiUrl: string
  whatsappInstanceId: string
  whatsappClientToken: string
  whatsappSecurityToken: string
  groqApiKey: string
}

export default function SettingsPage() {
  const [config, setConfig] = useState<Config>({
    whatsappApiUrl: '',
    whatsappInstanceId: '',
    whatsappClientToken: '',
    whatsappSecurityToken: '',
    groqApiKey: '',
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  useEffect(() => {
    fetchConfig()
  }, [])

  async function fetchConfig() {
    try {
      const res = await fetch('/api/config')
      if (res.ok) {
        const data = await res.json()
        setConfig(data.config || config)
      }
    } catch (error) {
      console.error('Erro ao buscar configurações:', error)
    } finally {
      setLoading(false)
    }
  }

  async function saveConfig(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setMessage(null)

    try {
      const res = await fetch('/api/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ config }),
      })

      if (res.ok) {
        setMessage({ type: 'success', text: '✅ Configurações salvas com sucesso!' })
      } else {
        setMessage({ type: 'error', text: '❌ Erro ao salvar configurações' })
      }
    } catch (error) {
      setMessage({ type: 'error', text: '❌ Erro ao conectar com o servidor' })
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-slate-600">Carregando configurações...</p>
      </div>
    )
  }

  return (
    <div className="h-full overflow-auto">
      <div className="max-w-2xl mx-auto p-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Configurações</h1>
          <p className="text-slate-600">Configure sua instância de WhatsApp e IA</p>
        </div>

        {message && (
          <div
            className={`mb-6 p-4 rounded-lg ${
              message.type === 'success'
                ? 'bg-green-50 text-green-800 border border-green-200'
                : 'bg-red-50 text-red-800 border border-red-200'
            }`}
          >
            {message.text}
          </div>
        )}

        <form onSubmit={saveConfig} className="space-y-8">
          {/* Z-API Configuration */}
          <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
            <h2 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2">
              <span className="text-2xl">📱</span> Configuração Z-API (WhatsApp)
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  URL da API Z-API
                </label>
                <input
                  type="url"
                  value={config.whatsappApiUrl}
                  onChange={(e) =>
                    setConfig({ ...config, whatsappApiUrl: e.target.value })
                  }
                  placeholder="https://api.z-api.io"
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-200 text-sm"
                />
                <p className="text-xs text-slate-500 mt-1">
                  Encontre em: Painel Z-API → Instâncias Web → Dados da instância
                </p>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  ID da Instância
                </label>
                <input
                  type="text"
                  value={config.whatsappInstanceId}
                  onChange={(e) =>
                    setConfig({ ...config, whatsappInstanceId: e.target.value })
                  }
                  placeholder="Seu ID de instância"
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-200 text-sm"
                />
                <p className="text-xs text-slate-500 mt-1">
                  Encontre em: Painel Z-API → Instâncias Web → Dados da instância
                </p>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  API Token (Client Token)
                </label>
                <input
                  type="password"
                  value={config.whatsappClientToken}
                  onChange={(e) =>
                    setConfig({ ...config, whatsappClientToken: e.target.value })
                  }
                  placeholder="Seu token de acesso"
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-200 text-sm"
                />
                <p className="text-xs text-slate-500 mt-1">
                  Encontre em: Painel Z-API → Instâncias Web → Dados da instância
                </p>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Security Token (Account Security Token)
                </label>
                <input
                  type="password"
                  value={config.whatsappSecurityToken}
                  onChange={(e) =>
                    setConfig({ ...config, whatsappSecurityToken: e.target.value })
                  }
                  placeholder="Seu token de segurança da conta"
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-200 text-sm"
                />
                <p className="text-xs text-slate-500 mt-1">
                  Encontre em: Painel Z-API → Segurança → Account Security Token
                </p>
              </div>
            </div>
          </div>

          {/* Groq Configuration */}
          <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
            <h2 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2">
              <span className="text-2xl">🤖</span> Configuração Groq (IA)
            </h2>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Groq API Key
              </label>
              <input
                type="password"
                value={config.groqApiKey}
                onChange={(e) =>
                  setConfig({ ...config, groqApiKey: e.target.value })
                }
                placeholder="Sua chave de API do Groq"
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-200 text-sm"
              />
              <p className="text-xs text-slate-500 mt-1">
                Obtenha em:{' '}
                <a
                  href="https://console.groq.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-amber-600 hover:underline"
                >
                  console.groq.com
                </a>
              </p>
            </div>

            <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-800">
                <strong>💡 Dica:</strong> A IA (Bia) usa o Groq para gerar respostas automáticas aos clientes.
                Sem essa chave, o bot não conseguirá responder.
              </p>
            </div>
          </div>

          {/* Test Connection */}
          <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
            <h2 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
              <span className="text-2xl">🧪</span> Testar Conexão
            </h2>
            <p className="text-sm text-slate-600 mb-4">
              Clique no botão abaixo para verificar se suas configurações estão corretas.
            </p>
            <button
              type="button"
              className="px-4 py-2 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 transition-colors text-sm font-medium"
            >
              🔗 Testar Conexão
            </button>
          </div>

          {/* Save Button */}
          <div className="flex gap-4">
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-3 bg-amber-500 text-white rounded-lg hover:bg-amber-600 disabled:bg-slate-300 disabled:cursor-not-allowed text-sm font-semibold transition-colors"
            >
              {saving ? '💾 Salvando...' : '💾 Salvar Configurações'}
            </button>
            <button
              type="button"
              onClick={fetchConfig}
              className="px-6 py-3 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 transition-colors text-sm font-semibold"
            >
              🔄 Recarregar
            </button>
          </div>
        </form>

        {/* Info Box */}
        <div className="mt-8 p-6 bg-slate-50 rounded-xl border border-slate-200">
          <h3 className="font-semibold text-slate-900 mb-3">ℹ️ Informações Importantes</h3>
          <ul className="space-y-2 text-sm text-slate-700">
            <li>
              • Suas configurações são armazenadas de forma segura no servidor
            </li>
            <li>
              • Nunca compartilhe seus tokens com terceiros
            </li>
            <li>
              • Se você alterar os tokens, as mudanças entram em vigor imediatamente
            </li>
            <li>
              • Para suporte, entre em contato com nossa equipe
            </li>
          </ul>
        </div>
      </div>
    </div>
  )
}
