'use client'

import { useState, useEffect } from 'react'

interface Config {
  whatsappApiUrl: string
  whatsappInstanceId: string
  whatsappClientToken: string
  whatsappSecurityToken: string
  groqApiKey: string
  botSystemPrompt: string
}

const DEFAULT_PROMPT = `Você é a Bia, Assistente Virtual Inteligente da Clínica Odontológica Buzzi, liderada pela Dra. Fernanda Buzzi, referência em Implantes Dentários em Curitiba, PR.

SOBRE A CLÍNICA:
- Nome: Buzzi Odontologia
- Responsável: Dra. Fernanda Buzzi (CRO-PR 17042)
- Especialidades: Implantes Dentários, Ortodontia, Próteses Complexas, Cirurgias Gerais
- Localização: Curitiba, PR
- WhatsApp: (41) 99524-4522
- Avaliação: 5 estrelas no Google com mais de 111 avaliações

TRATAMENTOS OFERECIDOS:
• Implantes Dentários
• Ortodontia
• Odontologia Estética — lentes de contato dental, facetas
• Clareamento Dental
• Prótese Dentária
• Cirurgia Oral
• Odontopediatria
• Odontologia Preventiva
• Reabilitação Oral

HORÁRIOS DE ATENDIMENTO:
• Manhã: 8h às 12h | Tarde: 13h às 17h | Noite: 18h às 20h

SEU OBJETIVO — colete UMA informação por vez, nesta ordem:
1. Nome completo
2. Tratamento de interesse ou motivo do contato
3. Se tem dor, desconforto ou urgência no momento
4. Horário preferido (manhã, tarde ou noite)

Quando tiver nome + tratamento + horário, confirme os dados e informe que nossa equipe entrará em contato em breve.

REGRAS ESSENCIAIS:
- Seja calorosa, empática, ágil e profissional
- UMA pergunta por vez
- Mensagens curtas (máximo 3-4 linhas)
- Use emojis com moderação (1-2 por mensagem)
- Nunca diga que é uma IA ou robô — você é a Bia, assistente virtual
- Responda SEMPRE em português brasileiro
- Nunca cite valores específicos de tratamentos`

type Tab = 'whatsapp' | 'groq' | 'bot'

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<Tab>('whatsapp')
  const [config, setConfig] = useState<Config>({
    whatsappApiUrl: '',
    whatsappInstanceId: '',
    whatsappClientToken: '',
    whatsappSecurityToken: '',
    groqApiKey: '',
    botSystemPrompt: '',
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState<string | null>(null)

  useEffect(() => {
    fetchConfig()
  }, [])

  async function fetchConfig() {
    try {
      const res = await fetch('/api/config')
      if (res.ok) {
        const data = await res.json()
        setConfig(prev => ({
          ...prev,
          ...(data.config || {}),
          botSystemPrompt: data.config?.botSystemPrompt || DEFAULT_PROMPT,
        }))
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
    } catch {
      setMessage({ type: 'error', text: '❌ Erro ao conectar com o servidor' })
    } finally {
      setSaving(false)
    }
  }

  async function testGroq() {
    setTesting(true)
    setTestResult(null)
    try {
      const key = config.groqApiKey
      if (!key) {
        setTestResult('❌ Insira a chave Groq antes de testar.')
        setTesting(false)
        return
      }
      const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${key}`,
        },
        body: JSON.stringify({
          model: 'llama-3.1-8b-instant',
          messages: [{ role: 'user', content: 'Diga apenas: conexão ok' }],
          max_tokens: 20,
        }),
      })
      if (res.ok) {
        setTestResult('✅ Conexão com Groq funcionando!')
      } else {
        const data = await res.json()
        setTestResult(`❌ Erro: ${data?.error?.message || 'Chave inválida'}`)
      }
    } catch {
      setTestResult('❌ Erro ao conectar com Groq')
    } finally {
      setTesting(false)
    }
  }

  function resetPrompt() {
    if (confirm('Restaurar o prompt padrão? As alterações serão perdidas.')) {
      setConfig(prev => ({ ...prev, botSystemPrompt: DEFAULT_PROMPT }))
    }
  }

  const tabs: { id: Tab; label: string; icon: string }[] = [
    { id: 'whatsapp', label: 'WhatsApp (Z-API)', icon: '📱' },
    { id: 'groq', label: 'IA (Groq)', icon: '🤖' },
    { id: 'bot', label: 'Personalidade do Bot', icon: '💬' },
  ]

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-slate-600">Carregando configurações...</p>
      </div>
    )
  }

  return (
    <div className="h-full overflow-auto bg-slate-50">
      <div className="max-w-3xl mx-auto p-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Configurações</h1>
          <p className="text-slate-600">Gerencie integrações e o comportamento do bot</p>
        </div>

        {message && (
          <div className={`mb-6 p-4 rounded-xl ${message.type === 'success' ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-red-50 text-red-800 border border-red-200'}`}>
            {message.text}
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-2 mb-6 bg-white rounded-xl p-1.5 border border-slate-200 shadow-sm">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-semibold transition-all flex items-center justify-center gap-2 ${
                activeTab === tab.id
                  ? 'bg-amber-500 text-white shadow'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <span>{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        <form onSubmit={saveConfig}>
          {/* WhatsApp Tab */}
          {activeTab === 'whatsapp' && (
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-5">
              <div>
                <h2 className="text-lg font-bold text-slate-900 mb-1">Z-API — WhatsApp</h2>
                <p className="text-sm text-slate-500 mb-5">Credenciais para envio e recebimento de mensagens</p>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">URL da API</label>
                    <input
                      type="url"
                      value={config.whatsappApiUrl}
                      onChange={e => setConfig({ ...config, whatsappApiUrl: e.target.value })}
                      placeholder="https://api.z-api.io"
                      className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-200 text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">ID da Instância</label>
                    <input
                      type="text"
                      value={config.whatsappInstanceId}
                      onChange={e => setConfig({ ...config, whatsappInstanceId: e.target.value })}
                      placeholder="Seu ID de instância"
                      className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-200 text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">Client Token</label>
                    <input
                      type="password"
                      value={config.whatsappClientToken}
                      onChange={e => setConfig({ ...config, whatsappClientToken: e.target.value })}
                      placeholder="Seu token de acesso"
                      className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-200 text-sm"
                    />
                    <p className="text-xs text-slate-400 mt-1">Painel Z-API → Instâncias Web → Dados da instância</p>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">Security Token</label>
                    <input
                      type="password"
                      value={config.whatsappSecurityToken}
                      onChange={e => setConfig({ ...config, whatsappSecurityToken: e.target.value })}
                      placeholder="Seu token de segurança"
                      className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-200 text-sm"
                    />
                    <p className="text-xs text-slate-400 mt-1">Painel Z-API → Segurança → Account Security Token</p>
                  </div>
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm text-blue-800">
                <strong>Webhook:</strong> Configure na Z-API a URL <code className="bg-blue-100 px-1 rounded">https://seu-dominio.vercel.app/api/webhook/whatsapp</code> com o evento <code className="bg-blue-100 px-1 rounded">messages.upsert</code>
              </div>
            </div>
          )}

          {/* Groq Tab */}
          {activeTab === 'groq' && (
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-5">
              <div>
                <h2 className="text-lg font-bold text-slate-900 mb-1">Groq — Inteligência Artificial</h2>
                <p className="text-sm text-slate-500 mb-5">Chave para o bot responder automaticamente via IA</p>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">Groq API Key</label>
                    <input
                      type="password"
                      value={config.groqApiKey}
                      onChange={e => setConfig({ ...config, groqApiKey: e.target.value })}
                      placeholder="gsk_..."
                      className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-200 text-sm font-mono"
                    />
                    <p className="text-xs text-slate-400 mt-1">
                      Obtenha em{' '}
                      <a href="https://console.groq.com" target="_blank" rel="noopener noreferrer" className="text-amber-600 hover:underline">
                        console.groq.com
                      </a>{' '}
                      — é gratuito
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={testGroq}
                    disabled={testing}
                    className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors text-sm font-semibold"
                  >
                    {testing ? '⏳ Testando...' : '🔗 Testar Conexão'}
                  </button>

                  {testResult && (
                    <div className={`p-3 rounded-lg text-sm font-medium ${testResult.startsWith('✅') ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-red-50 text-red-800 border border-red-200'}`}>
                      {testResult}
                    </div>
                  )}
                </div>
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800">
                <strong>💡 Como funciona:</strong> O Groq processa as mensagens dos leads usando o modelo <strong>LLaMA 3.1</strong> e o prompt que você configurar na aba <em>Personalidade do Bot</em>.
              </div>
            </div>
          )}

          {/* Bot Prompt Tab */}
          {activeTab === 'bot' && (
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-5">
              <div>
                <div className="flex items-start justify-between mb-1">
                  <div>
                    <h2 className="text-lg font-bold text-slate-900">Personalidade do Bot</h2>
                    <p className="text-sm text-slate-500 mt-0.5">Defina como o bot deve se apresentar, o que responder e como qualificar leads</p>
                  </div>
                  <button
                    type="button"
                    onClick={resetPrompt}
                    className="text-xs text-slate-400 hover:text-amber-600 font-semibold transition-colors whitespace-nowrap ml-4"
                  >
                    ↺ Restaurar padrão
                  </button>
                </div>

                <div className="mt-4 space-y-3">
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-sm text-slate-700 space-y-1.5">
                    <p className="font-semibold text-slate-900">✏️ O que você pode editar aqui:</p>
                    <p>• <strong>Nome do bot</strong> — mude "Bia" para o nome que quiser</p>
                    <p>• <strong>Nome da clínica</strong>, responsável, telefone, endereço</p>
                    <p>• <strong>Tratamentos oferecidos</strong> — adicione ou remova</p>
                    <p>• <strong>Horários de atendimento</strong></p>
                    <p>• <strong>Ordem das perguntas</strong> para qualificar o lead</p>
                    <p>• <strong>Tom e regras</strong> de como o bot deve responder</p>
                  </div>

                  <textarea
                    value={config.botSystemPrompt}
                    onChange={e => setConfig({ ...config, botSystemPrompt: e.target.value })}
                    rows={28}
                    className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-200 text-sm font-mono resize-y leading-relaxed"
                    placeholder="Digite aqui as instruções para o bot..."
                  />

                  <p className="text-xs text-slate-400">
                    {config.botSystemPrompt.length} caracteres — Quanto mais detalhado, melhor o bot responde.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Save Button */}
          <div className="flex gap-3 mt-6">
            <button
              type="submit"
              disabled={saving}
              className="px-8 py-3 bg-amber-500 text-white rounded-xl hover:bg-amber-600 disabled:bg-slate-300 disabled:cursor-not-allowed text-sm font-bold transition-colors shadow-md"
            >
              {saving ? '💾 Salvando...' : '💾 Salvar Configurações'}
            </button>
            <button
              type="button"
              onClick={fetchConfig}
              className="px-6 py-3 bg-white border border-slate-200 text-slate-700 rounded-xl hover:bg-slate-50 transition-colors text-sm font-semibold"
            >
              🔄 Recarregar
            </button>
          </div>
        </form>

        <div className="mt-8 p-5 bg-white rounded-xl border border-slate-200 text-sm text-slate-600 space-y-1.5">
          <p className="font-semibold text-slate-800 mb-2">ℹ️ Informações</p>
          <p>• As configurações são salvas no banco de dados e entram em vigor imediatamente</p>
          <p>• A chave Groq tem prioridade sobre a variável de ambiente <code className="bg-slate-100 px-1 rounded text-xs">GROQ_API_KEY</code></p>
          <p>• O prompt do bot é o "cérebro" da Bia — edite com cuidado</p>
          <p>• Nunca compartilhe suas chaves de API com terceiros</p>
        </div>
      </div>
    </div>
  )
}
