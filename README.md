<<<<<<< HEAD
# 🦷 Buzzi CRM - Sistema de WhatsApp com Bot

Sistema completo de CRM com integração WhatsApp, bot de triagem automática e painel Kanban.

## 🚀 Como Rodar no Seu Computador

### 1. Instalar Node.js
Baixe em: https://nodejs.org (versão 18 ou superior)

### 2. Baixar este projeto
Coloque a pasta `buzzi-crm` no seu computador.

### 3. Abrir o terminal na pasta do projeto
```bash
cd buzzi-crm
```

### 4. Instalar dependências
```bash
npm install
```

### 5. Configurar banco de dados
Sua DATABASE_URL já está configurada no `.env.local`!

Rode:
```bash
npm run db:push
```

Isso vai criar todas as tabelas no seu banco Neon.

### 6. Rodar o projeto
```bash
npm run dev
```

Abra: http://localhost:3000

## 📱 Configurar WhatsApp (Evolution API)

Você precisa de uma instância da Evolution API rodando.

### Opções:
1. **Evolution API Cloud** (mais fácil)
   - Contrate em: https://evolution-api.com
   - Ou use: https://typebot.io/whatsapp

2. **Self-hosted** (mais avançado)
   - https://github.com/EvolutionAPI/evolution-api

### Depois de ter a Evolution API:

1. Pegue suas credenciais:
   - API URL (ex: https://sua-api.com)
   - API Key
   - Instance Name

2. Coloque no `.env.local`:
```env
EVOLUTION_API_URL="https://sua-evolution-api.com"
EVOLUTION_API_KEY="sua-chave-aqui"
EVOLUTION_INSTANCE_NAME="buzzi"
```

3. Configure o webhook na Evolution API:
   - URL: `https://seu-dominio.vercel.app/api/whatsapp/webhook`
   - Eventos: `messages.upsert`

## 🌐 Deploy na Vercel

### 1. Criar conta
https://vercel.com

### 2. Instalar Vercel CLI (opcional)
```bash
npm i -g vercel
```

### 3. Fazer deploy
```bash
vercel
```

Ou:
- Suba o código pro GitHub
- Conecte o repositório na Vercel
- Configure as variáveis de ambiente
- Deploy automático!

### Variáveis de ambiente na Vercel:
```
DATABASE_URL=sua-url-neon
EVOLUTION_API_URL=sua-url-evolution
EVOLUTION_API_KEY=sua-chave
EVOLUTION_INSTANCE_NAME=buzzi
```

## 📊 Estrutura do Projeto

```
buzzi-crm/
├── app/
│   ├── admin/
│   │   ├── kanban/page.tsx          # Painel Kanban
│   │   └── leads/[id]/page.tsx      # Chat individual
│   ├── api/
│   │   ├── whatsapp/
│   │   │   ├── webhook/route.ts     # Recebe msgs
│   │   │   └── send/route.ts        # Envia msgs
│   │   └── leads/
│   │       ├── route.ts             # Lista leads
│   │       └── [id]/
│   │           ├── route.ts         # Busca lead
│   │           └── stage/route.ts   # Atualiza etapa
│   ├── layout.tsx
│   ├── page.tsx
│   └── globals.css
├── lib/
│   ├── prisma.ts         # Conexão banco
│   ├── bot.ts            # Lógica do bot
│   └── evolution.ts      # WhatsApp API
├── prisma/
│   └── schema.prisma     # Schema do banco
├── .env.local            # Variáveis de ambiente
└── package.json
```

## 🤖 Como o Bot Funciona

O bot segue um fluxo de perguntas:

1. **Novos** → Pergunta qual tratamento
2. **Triagem (bot)** → Coleta: nome, objetivo, dor, horário
3. **Em atendimento** → Equipe assume
4. **Orçamento enviado** → Aguardando resposta
5. **Agendamento pendente** → Aguardando confirmação
6. **Agendado** → Consulta marcada
7. **Fechou** → Virou paciente! 🎉
8. **Perdido** → Não converteu

## 🔧 Scripts Disponíveis

```bash
npm run dev          # Roda em desenvolvimento
npm run build        # Build para produção
npm run start        # Roda em produção
npm run db:push      # Atualiza banco
npm run db:studio    # Abre Prisma Studio
```

## ❓ Problemas Comuns

### Erro ao conectar no banco
- Verifique se a DATABASE_URL está correta
- Rode `npm run db:push` novamente

### Webhook não funciona
- Certifique-se que a URL está correta na Evolution
- Teste com: `curl -X POST sua-url/api/whatsapp/webhook`

### Mensagens não chegam
- Verifique os logs da Evolution API
- Confirme que o webhook está configurado
- Teste enviando uma mensagem manual

## 📞 Próximos Passos

1. ✅ Configure a Evolution API
2. ✅ Teste enviando uma mensagem pro seu número
3. ✅ Veja o lead aparecer no Kanban
4. ✅ Responda pelo painel
5. 🚀 Personalize o bot em `lib/bot.ts`

## 🎯 Recursos Implementados

- ✅ Webhook WhatsApp
- ✅ Bot de triagem automática
- ✅ Kanban interativo
- ✅ Chat em tempo real
- ✅ Banco de dados Postgres
- ✅ Status (quente/morno/frio)
- ✅ Múltiplas etapas
- ✅ Histórico completo

## 🔜 Para Implementar (V2)

- [ ] Follow-up 6 meses (QStash)
- [ ] Arrastar e soltar no Kanban
- [ ] Múltiplos atendentes
- [ ] Relatórios e métricas
- [ ] Templates de mensagens
- [ ] Integração com calendário

---

**Criado por:** Sistema Buzzi CRM
**Versão:** 1.0.0
**Data:** 2025
=======
# buzzi-crm
buzzi-crm
>>>>>>> 9a4380c465b04631ea2592b991748eacc760be1b
