import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { parseIncomingWebhook, sendTextMessage } from "@/lib/whatsapp";
import { generateAIResponse } from "@/lib/ai-bot";

const prisma = new PrismaClient();

export async function POST(req: Request) {
  try {
    const body = await req.json();
    
    // 1. Usa sua função do lib/whatsapp.ts para validar e limpar os dados da Z-API
    const incoming = parseIncomingWebhook(body);
    
    // Se a função retornar null (ex: mensagem enviada por você ou erro de formato), encerra
    if (!incoming) {
      return NextResponse.json({ ok: true });
    }

    const { phone, text } = incoming;

    // 2. Banco de Dados: Localizar ou criar o Lead pelo número de telefone
    let lead = await prisma.lead.findFirst({
      where: { phone: phone }
    });

    if (!lead) {
      lead = await prisma.lead.create({
        data: { 
          phone: phone, 
          name: "Novo Contato WhatsApp" 
        }
      });
    }

    // 3. Salvar a mensagem que o cliente acabou de enviar
    await prisma.message.create({
      data: { 
        leadId: lead.id, 
        text: text, 
        from: "client" 
      }
    });

    // 4. Buscar histórico (últimas 5 mensagens) para dar contexto à IA
    const historyData = await prisma.message.findMany({
      where: { leadId: lead.id },
      take: 5,
      orderBy: { createdAt: 'desc' }
    });

    // Inverte para ficar na ordem cronológica (mais antiga para mais recente)
    const formattedHistory = historyData.reverse().map(m => ({
      role: (m.from === "client" ? "user" : "assistant") as "user" | "assistant",
      content: m.text
    }));

    // 5. Gerar a resposta usando a OpenAI (seu arquivo lib/ai-bot.ts)
    const aiResponse = await generateAIResponse(text, formattedHistory);

    // 6. Se a IA gerou uma resposta válida, salva no banco e envia ao cliente
    if (aiResponse) {
      // Salva a resposta do bot no banco de dados
      await prisma.message.create({
        data: { 
          leadId: lead.id, 
          text: aiResponse, 
          from: "bot" 
        }
      });

      // ENVIAR PARA Z-API: Usa a função que você já tem no lib/whatsapp.ts
      // Ela já utiliza os tokens e instâncias configurados na Vercel!
      await sendTextMessage(phone, aiResponse);
    }

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    console.error("❌ Erro fatal no Webhook:", error.message);
    return NextResponse.json({ error: "Erro interno no servidor" }, { status: 500 });
  }
}
