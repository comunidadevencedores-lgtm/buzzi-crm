import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { generateAIResponse } from "@/lib/ai-bot";
import axios from "axios";

const prisma = new PrismaClient();

export async function POST(req: Request) {
  try {
    const body = await req.json();

    // Bloqueia loop: se a mensagem veio de nós, ignora
    if (body.fromMe === true) return NextResponse.json({ ok: true });

    const phone = body.phone;
    // Ajuste para capturar o texto correto vindo da Z-API
    const text = body.text?.message || body.text; 

    if (!phone || !text) return NextResponse.json({ ok: true });

    // 1. Localizar ou criar o Lead
    let lead = await prisma.lead.findFirst({
      where: { phone: String(phone) }
    });

    if (!lead) {
      lead = await prisma.lead.create({
        data: { phone: String(phone), name: "Contato WhatsApp" }
      });
    }

    // 2. Salvar mensagem do cliente
    await prisma.message.create({
      data: { leadId: lead.id, text: String(text), from: "client" }
    });

    // 3. Buscar histórico (últimas 3 mensagens) para a IA ter contexto
    const lastMessages = await prisma.message.findMany({
      where: { leadId: lead.id },
      take: 3,
      orderBy: { createdAt: 'desc' }
    });

    const history = lastMessages.reverse().map(m => ({
      role: (m.from === "client" ? "user" : "assistant") as "user" | "assistant",
      content: m.text
    }));

    // 4. Gerar resposta com IA
    const aiResponse = await generateAIResponse(String(text), history);

    if (aiResponse) {
      // 5. Salvar resposta da IA no banco
      await prisma.message.create({
        data: { leadId: lead.id, text: aiResponse, from: "bot" }
      });

      // 6. Enviar para Z-API usando as variáveis da Vercel
      const instance = process.env.ZAPI_INSTANCE;
      const token = process.env.ZAPI_TOKEN;
      const zApiUrl = `https://api.z-api.io/instances/${instance}/token/${token}/send-text`;
      
      await axios.post(zApiUrl, {
        phone: phone,
        message: aiResponse
      });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Erro no Webhook:", error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
