import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { generateAIResponse } from "@/lib/ai-bot";

const prisma = new PrismaClient();

export async function POST(req: Request) {
  try {
    const body = await req.json();
    
    // Ignorar mensagens enviadas por nós mesmos (evita loop infinito)
    if (body.fromMe === true) return NextResponse.json({ ok: true });

    const phone = body.phone;
    const text = body.text;

    // 1. Localizar ou criar o Lead pelo telefone
    let lead = await prisma.lead.findFirst({
      where: { phone: String(phone) }
    });

    if (!lead) {
      lead = await prisma.lead.create({
        data: {
          phone: String(phone),
          name: "Novo Contato",
        }
      });
    }

    // 2. Salvar a mensagem do cliente no banco
    await prisma.message.create({
      data: {
        leadId: lead.id,
        text: text,
        from: "client"
      }
    });

    // 3. Buscar histórico para a IA
    const history = await prisma.message.findMany({
      where: { leadId: lead.id },
      take: 5,
      orderBy: { createdAt: 'desc' }
    });

    const formattedHistory = history.reverse().map(m => ({
      role: m.from === "client" ? "user" as const : "assistant" as const,
      content: m.text
    }));

    // 4. Gerar resposta com a IA
    const aiResponse = await generateAIResponse(text, formattedHistory);

    // 5. Salvar resposta da IA no banco
    if (aiResponse) {
      await prisma.message.create({
        data: {
          leadId: lead.id,
          text: aiResponse,
          from: "bot"
        }
      });
      
      // AQUI: Você chamaria a API da Evolution para enviar de volta ao WhatsApp
      console.log("Resposta da IA para o WhatsApp:", aiResponse);
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Erro no Webhook:", error);
    return NextResponse.json({ error: "Internal Error" }, { status: 500 });
  }
}
