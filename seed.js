require("dotenv").config();
// Script para criar leads de teste no banco
const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function main() {
  console.log('🚀 Criando leads de teste...')

  // Lead 1: Novo
  const lead1 = await prisma.lead.create({
    data: {
      name: 'Maria Silva',
      phone: '5511999999999',
      stage: 'Novos',
      status: 'new',
      treatment: null,
      botStep: 'start',
      botData: {},
      messages: {
        create: [
          {
            from: 'client',
            text: 'Olá, gostaria de saber sobre implantes',
          },
        ],
      },
    },
  })

  // Lead 2: Triagem (bot)
  const lead2 = await prisma.lead.create({
    data: {
      name: 'João Pedro',
      phone: '5511988888888',
      stage: 'Triagem (bot)',
      status: 'warm',
      treatment: 'Implantes',
      botStep: 'ask_name',
      botData: { treatment: 'Implantes' },
      messages: {
        create: [
          {
            from: 'client',
            text: 'Quero fazer implante',
          },
          {
            from: 'bot',
            text: 'Perfeito! Para te atender melhor, qual é o seu nome?',
          },
        ],
      },
    },
  })

  // Lead 3: Em atendimento
  const lead3 = await prisma.lead.create({
    data: {
      name: 'Ana Costa',
      phone: '5511977777777',
      stage: 'Em atendimento',
      status: 'hot',
      treatment: 'Clareamento',
      botStep: 'done',
      botData: {
        treatment: 'Clareamento',
        name: 'Ana',
        goal: 'Agendar avaliação',
        pain: 'Sem dor',
        time: 'Tarde',
      },
      messages: {
        create: [
          {
            from: 'client',
            text: 'Oi, quero fazer clareamento',
          },
          {
            from: 'bot',
            text: 'Ótimo! Já registrei suas informações.',
          },
          {
            from: 'clinic',
            text: 'Olá Ana! Tudo bem? Vamos agendar sua avaliação?',
          },
        ],
      },
    },
  })

  // Lead 4: Orçamento enviado
  const lead4 = await prisma.lead.create({
    data: {
      name: 'Carlos Mendes',
      phone: '5511966666666',
      stage: 'Orçamento enviado',
      status: 'warm',
      treatment: 'Aparelho ortodôntico',
      botStep: 'done',
      botData: {
        treatment: 'Aparelho',
        name: 'Carlos',
      },
      messages: {
        create: [
          {
            from: 'client',
            text: 'Quanto custa aparelho?',
          },
          {
            from: 'clinic',
            text: 'Oi Carlos! O orçamento está entre R$ 2.000 e R$ 5.000 dependendo do caso.',
          },
        ],
      },
    },
  })

  // Lead 5: Agendado
  const lead5 = await prisma.lead.create({
    data: {
      name: 'Beatriz Alves',
      phone: '5511955555555',
      stage: 'Agendado',
      status: 'hot',
      treatment: 'Lentes de contato',
      botStep: 'done',
      botData: {
        treatment: 'Lentes',
        name: 'Beatriz',
        goal: 'Agendar',
      },
      messages: {
        create: [
          {
            from: 'client',
            text: 'Quero agendar avaliação para lentes',
          },
          {
            from: 'clinic',
            text: 'Perfeito! Agendamos para terça-feira às 14h. Confirma?',
          },
          {
            from: 'client',
            text: 'Confirmo!',
          },
        ],
      },
    },
  })

  console.log('✅ Leads criados com sucesso!')
  console.log(`- ${lead1.name} (${lead1.stage})`)
  console.log(`- ${lead2.name} (${lead2.stage})`)
  console.log(`- ${lead3.name} (${lead3.stage})`)
  console.log(`- ${lead4.name} (${lead4.stage})`)
  console.log(`- ${lead5.name} (${lead5.stage})`)
  console.log('\n🎉 Agora atualize a página do Kanban (F5) para ver os leads!')
}

main()
  .catch((e) => {
    console.error('❌ Erro ao criar leads:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
