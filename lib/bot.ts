import { Lead, Prisma } from '@prisma/client'

export type BotStep = 
  | 'start'
  | 'ask_treatment'
  | 'ask_name'
  | 'ask_goal'
  | 'ask_pain'
  | 'ask_time'
  | 'done'

export interface BotData {
  treatment?: string
  name?: string
  goal?: string
  pain?: string
  time?: string
}

export interface BotResponse {
  replyText: string
  nextStep: BotStep
  leadUpdates: Prisma.LeadUpdateInput
}

export function processMessage(
  lead: Lead,
  messageText: string
): BotResponse {
  const currentStep = lead.botStep as BotStep
  const botData = (lead.botData ?? {}) as BotData
  const text = messageText.toLowerCase().trim()

  switch (currentStep) {
    case 'start':
      return {
        replyText: `Olá! 👋 Bem-vindo(a) à Clínica Buzzi!\n\nEstou aqui para te ajudar. Qual tratamento você tem interesse?\n\n1️⃣ Implantes\n2️⃣ Lentes de contato dental\n3️⃣ Clareamento\n4️⃣ Aparelho ortodôntico\n5️⃣ Outros`,
        nextStep: 'ask_treatment',
        leadUpdates: {
          botStep: 'ask_treatment',
          stage: 'Triagem (bot)',
        },
      }

    case 'ask_treatment':
      let treatment = 'Outros'
      
      if (text.includes('implante') || text === '1') {
        treatment = 'Implantes'
      } else if (text.includes('lente') || text === '2') {
        treatment = 'Lentes de contato'
      } else if (text.includes('clarea') || text === '3') {
        treatment = 'Clareamento'
      } else if (text.includes('aparelho') || text.includes('ortodon') || text === '4') {
        treatment = 'Aparelho ortodôntico'
      } else if (text === '5') {
        treatment = 'Outros'
      } else {
        treatment = messageText
      }

      return {
        replyText: `Perfeito! ${treatment} é uma ótima escolha! 😊\n\nPara te atender melhor, qual é o seu nome?`,
        nextStep: 'ask_name',
        leadUpdates: {
          botStep: 'ask_name',
          treatment,
          botData: { ...botData, treatment },
        },
      }

    case 'ask_name':
      const name = messageText.trim()
      
      return {
        replyText: `Prazer, ${name}! 🤝\n\nO que você busca?\n\n1️⃣ Agendar uma avaliação\n2️⃣ Tirar dúvidas sobre o tratamento\n3️⃣ Saber valores`,
        nextStep: 'ask_goal',
        leadUpdates: {
          botStep: 'ask_goal',
          name,
          botData: { ...botData, name },
        },
      }

    case 'ask_goal':
      let goal = 'Outros'
      
      if (text.includes('agendar') || text.includes('avalia') || text === '1') {
        goal = 'Agendar avaliação'
      } else if (text.includes('dúvida') || text.includes('duvida') || text === '2') {
        goal = 'Tirar dúvidas'
      } else if (text.includes('valor') || text.includes('preço') || text.includes('preco') || text === '3') {
        goal = 'Saber valores'
      } else {
        goal = messageText
      }

      return {
        replyText: `Entendi! Você sente alguma dor ou desconforto no momento?`,
        nextStep: 'ask_pain',
        leadUpdates: {
          botStep: 'ask_pain',
          status: goal === 'Agendar avaliação' ? 'hot' : 'warm',
          botData: { ...botData, goal },
        },
      }

    case 'ask_pain':
      const hasPain = text.includes('sim') || text.includes('dor') || text.includes('desconforto')
      const pain = hasPain ? 'Com dor' : 'Sem dor'

      return {
        replyText: `${hasPain ? 'Entendo. Vamos priorizar seu atendimento! 🚨' : 'Ótimo! 👍'}\n\nQual período você prefere para um atendimento?\n\n1️⃣ Manhã (8h-12h)\n2️⃣ Tarde (13h-17h)\n3️⃣ Noite (18h-20h)`,
        nextStep: 'ask_time',
        leadUpdates: {
          botStep: 'ask_time',
          status: hasPain ? 'hot' : lead.status,
          botData: { ...botData, pain },
        },
      }

    case 'ask_time':
      let time = 'Qualquer horário'
      
      if (text.includes('manhã') || text === '1') {
        time = 'Manhã (8h-12h)'
      } else if (text.includes('tarde') || text === '2') {
        time = 'Tarde (13h-17h)'
      } else if (text.includes('noite') || text === '3') {
        time = 'Noite (18h-20h)'
      }

      return {
        replyText: `Perfeito, ${botData.name}! ✅\n\nJá registrei todas as suas informações:\n📋 Tratamento: ${botData.treatment}\n🎯 Objetivo: ${botData.goal}\n⏰ Horário preferido: ${time}\n\nNossa equipe vai entrar em contato em breve para agendar sua avaliação! 🦷\n\nEnquanto isso, se tiver alguma dúvida, pode me chamar!`,
        nextStep: 'done',
        leadUpdates: {
          botStep: 'done',
          stage: 'Em atendimento',
          botData: { ...botData, time },
        },
      }

    case 'done':
      return {
        replyText: `Oi, ${botData.name || 'tudo bem'}! 👋\n\nJá anotei suas informações anteriormente. Nossa equipe vai te responder em breve!\n\nSe precisar de algo urgente, só me avisar que chamo alguém da equipe.`,
        nextStep: 'done',
        leadUpdates: {},
      }

    default:
      return {
        replyText: 'Desculpe, algo deu errado. Vou transferir você para nossa equipe! 🙏',
        nextStep: 'done',
        leadUpdates: {
          botStep: 'done',
          stage: 'Em atendimento',
        },
      }
  }
}
