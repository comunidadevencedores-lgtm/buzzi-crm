"use client";
import { useState, useRef } from "react";

interface Lead {
  id: string;
  name: string;
  phone: string;
  email?: string;
  company?: string;
  status: string;
  treatment?: string;
}

interface BatchStatus {
  id: string;
  name: string;
  totalLeads: number;
  sentCount: number;
  failCount: number;
  status: string;
}

export default function LeadsPage() {
  const [tab, setTab] = useState<"upload" | "dispatch" | "schedule" | "followup">("upload");
  const [leads, setLeads] = useState<Lead[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<string | null>(null);
  const [batchMsg, setBatchMsg] = useState("");
  const [batchName, setBatchName] = useState("");
  const [batchStatus, setBatchStatus] = useState<BatchStatus | null>(null);
  const [sending, setSending] = useState(false);
  const [scheduleData, setScheduleData] = useState({ leadId: "", title: "Reunião comercial", scheduledAt: "", duration: "30", notes: "" });
  const [followupData, setFollowupData] = useState({ leadId: "", type: "followup", message: "", scheduledAt: "" });
  const [feedback, setFeedback] = useState<{ msg: string; ok: boolean } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  function showFeedback(msg: string, ok = true) {
    setFeedback({ msg, ok });
    setTimeout(() => setFeedback(null), 4000);
  }

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setUploadResult(null);
    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch("/api/upload-leads", { method: "POST", body: fd });
    const data = await res.json();
    setUploading(false);
    setUploadResult(data.message || data.error || "Erro desconhecido");
    if (res.ok) fetchLeads();
  }

  async function fetchLeads() {
    const res = await fetch("/api/leads");
    if (res.ok) {
      const data = await res.json();
      setLeads(data.leads || data);
    }
  }

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function toggleAll() {
    if (selected.size === leads.length) setSelected(new Set());
    else setSelected(new Set(leads.map((l) => l.id)));
  }

  async function handleBatchSend() {
    if (!batchMsg.trim()) return showFeedback("Digite a mensagem antes de enviar", false);
    const targets = leads.filter((l) => selected.has(l.id));
    if (!targets.length) return showFeedback("Selecione ao menos um lead", false);
    setSending(true);
    const res = await fetch("/api/send-batch", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: batchName || `Lote ${new Date().toLocaleDateString("pt-BR")}`,
        message: batchMsg,
        phones: targets.map((l) => ({ phone: l.phone, name: l.name })),
      }),
    });
    const data = await res.json();
    setSending(false);
    if (res.ok) { showFeedback(`✅ ${data.message}`); pollBatch(data.batchId); }
    else showFeedback(data.error || "Erro ao enviar", false);
  }

  async function pollBatch(id: string) {
    const interval = setInterval(async () => {
      const res = await fetch(`/api/send-batch?id=${id}`);
      const data = await res.json();
      setBatchStatus(data);
      if (data.status === "done" || data.status === "paused") clearInterval(interval);
    }, 3000);
  }

  async function handleSchedule() {
    if (!scheduleData.leadId || !scheduleData.scheduledAt) return showFeedback("Preencha lead e data/hora", false);
    const res = await fetch("/api/schedule", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(scheduleData),
    });
    const data = await res.json();
    res.ok ? showFeedback("✅ Reunião agendada! Confirmação enviada via WhatsApp.") : showFeedback(data.error || "Erro", false);
  }

  async function handleFollowup() {
    if (!followupData.leadId || !followupData.message) return showFeedback("Preencha lead e mensagem", false);
    const res = await fetch("/api/followup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(followupData),
    });
    const data = await res.json();
    res.ok ? showFeedback("✅ Follow-up agendado!") : showFeedback(data.error || "Erro", false);
  }

  const s: Record<string, React.CSSProperties> = {
    page: { minHeight: "100vh", background: "#0a0f1e", color: "#e2e8f0", fontFamily: "sans-serif", padding: "32px 24px" },
    title: { fontSize: 26, fontWeight: 700, margin: "0 0 4px", color: "#f1f5f9" },
    sub: { fontSize: 13, color: "#64748b", margin: "0 0 24px" },
    toast: { position: "fixed" as const, top: 20, right: 20, padding: "12px 20px", borderRadius: 10, color: "#fff", fontWeight: 600, zIndex: 999 },
    tabs: { display: "flex", gap: 8, marginBottom: 24, flexWrap: "wrap" as const },
    tab: { padding: "8px 16px", borderRadius: 8, border: "1px solid #1e293b", background: "transparent", color: "#94a3b8", cursor: "pointer", fontSize: 13 },
    tabOn: { background: "#1e40af", color: "#fff", borderColor: "#3b82f6" },
    card: { background: "#0f172a", border: "1px solid #1e293b", borderRadius: 14, padding: 28, maxWidth: 700 },
    h2: { fontSize: 18, fontWeight: 700, margin: "0 0 6px", color: "#f1f5f9" },
    hint: { fontSize: 13, color: "#64748b", margin: "0 0 20px" },
    drop: { border: "2px dashed #1e40af", borderRadius: 12, padding: "40px 20px", textAlign: "center" as const, cursor: "pointer", color: "#64748b" },
    result: { marginTop: 16, padding: "12px 16px", borderRadius: 8, fontSize: 13, color: "#e2e8f0" },
    table: { border: "1px solid #1e293b", borderRadius: 8, overflow: "hidden", marginBottom: 16 },
    row: { display: "flex", alignItems: "center", padding: "10px 14px", borderBottom: "1px solid #1e293b", gap: 12 },
    name: { fontWeight: 500, flex: 1, color: "#e2e8f0", fontSize: 14 },
    phone: { color: "#64748b", fontSize: 13 },
    lbl: { display: "block", fontSize: 12, color: "#94a3b8", marginBottom: 4, fontWeight: 600, textTransform: "uppercase" as const },
    inp: { width: "100%", padding: "10px 14px", background: "#1e293b", border: "1px solid #334155", borderRadius: 8, color: "#e2e8f0", fontSize: 14, marginBottom: 14, boxSizing: "border-box" as const },
    btn: { width: "100%", padding: 12, background: "#1d4ed8", color: "#fff", border: "none", borderRadius: 8, fontSize: 15, fontWeight: 700, cursor: "pointer", marginTop: 8 },
    btnOut: { padding: "6px 14px", background: "transparent", border: "1px solid #334155", color: "#94a3b8", borderRadius: 6, cursor: "pointer", fontSize: 12 },
    bar: { background: "#0f172a", borderRadius: 4, height: 8, overflow: "hidden" },
    fill: { background: "#1d4ed8", height: "100%", borderRadius: 4 },
  };

  return (
    <div style={s.page}>
      <h1 style={s.title}>Central de Leads</h1>
      <p style={s.sub}>Importe, dispare e acompanhe seus contatos</p>

      {feedback && <div style={{ ...s.toast, background: feedback.ok ? "#16a34a" : "#dc2626" }}>{feedback.msg}</div>}

      <div style={s.tabs}>
        {[["upload","📁 Importar CSV"],["dispatch","📤 Disparar"],["schedule","📅 Agendar Reunião"],["followup","🔁 Follow-up / Pós"]].map(([k,l]) => (
          <button key={k} onClick={() => { setTab(k as typeof tab); fetchLeads(); }} style={{ ...s.tab, ...(tab === k ? s.tabOn : {}) }}>{l}</button>
        ))}
      </div>

      {tab === "upload" && (
        <div style={s.card}>
          <h2 style={s.h2}>Importar lista de leads</h2>
          <p style={s.hint}>Aceita CSV. Colunas: <b>nome</b>, <b>telefone</b> (obrigatório), email, empresa</p>
          <div style={s.drop} onClick={() => fileRef.current?.click()}>
            <span style={{ fontSize: 40 }}>📂</span>
            <p style={{ margin: "8px 0 0" }}>{uploading ? "Importando..." : "Clique ou arraste o CSV aqui"}</p>
            <input ref={fileRef} type="file" accept=".csv" style={{ display: "none" }} onChange={handleUpload} />
          </div>
          {uploadResult && <div style={{ ...s.result, background: uploadResult.includes("✅") ? "#0f2a1a" : "#2a0f0f" }}>{uploadResult}</div>}
          {leads.length > 0 && (
            <div style={{ marginTop: 20 }}>
              <p style={{ color: "#94a3b8", marginBottom: 8 }}>{leads.length} leads carregados</p>
              <div style={s.table}>
                {leads.slice(0, 10).map(l => (
                  <div key={l.id} style={s.row}>
                    <span style={s.name}>{l.name || "Sem nome"}</span>
                    <span style={s.phone}>{l.phone}</span>
                  </div>
                ))}
                {leads.length > 10 && <p style={{ color: "#64748b", padding: "8px 12px" }}>+ {leads.length - 10} mais...</p>}
              </div>
            </div>
          )}
        </div>
      )}

      {tab === "dispatch" && (
        <div style={s.card}>
          <h2 style={s.h2}>Disparar mensagem em lote</h2>
          <p style={s.hint}>Envia de 10 em 10 com delay. Use <b>{"{nome}"}</b> para personalizar.</p>
          <input style={s.inp} placeholder="Nome do lote" value={batchName} onChange={e => setBatchName(e.target.value)} />
          <textarea style={{ ...s.inp, height: 100, resize: "vertical" }} placeholder={"Olá {nome}! Tudo bem?\n\nPassando para apresentar..."} value={batchMsg} onChange={e => setBatchMsg(e.target.value)} />
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
            <p style={{ color: "#94a3b8", margin: 0 }}>{leads.length} leads — {selected.size} selecionados</p>
            <button style={s.btnOut} onClick={toggleAll}>{selected.size === leads.length ? "Desmarcar todos" : "Selecionar todos"}</button>
          </div>
          <div style={s.table}>
            {leads.slice(0, 50).map(l => (
              <div key={l.id} style={{ ...s.row, cursor: "pointer", background: selected.has(l.id) ? "#1e3a5f" : "transparent" }} onClick={() => toggleSelect(l.id)}>
                <input type="checkbox" checked={selected.has(l.id)} readOnly style={{ marginRight: 10 }} />
                <span style={s.name}>{l.name || "Sem nome"}</span>
                <span style={s.phone}>{l.phone}</span>
              </div>
            ))}
          </div>
          <button style={{ ...s.btn, opacity: sending ? 0.6 : 1 }} onClick={handleBatchSend} disabled={sending}>
            {sending ? "Disparando..." : `🚀 Disparar para ${selected.size} leads`}
          </button>
          {batchStatus && (
            <div style={{ marginTop: 20, padding: "14px 16px", background: "#1e293b", borderRadius: 8 }}>
              <p style={{ margin: "0 0 6px", color: "#94a3b8" }}>{batchStatus.name} — {batchStatus.status}</p>
              <div style={s.bar}><div style={{ ...s.fill, width: `${Math.round((batchStatus.sentCount / batchStatus.totalLeads) * 100)}%` }} /></div>
              <p style={{ margin: "6px 0 0", color: "#64748b", fontSize: 13 }}>✅ {batchStatus.sentCount} enviados · ❌ {batchStatus.failCount} falhas · total {batchStatus.totalLeads}</p>
            </div>
          )}
        </div>
      )}

      {tab === "schedule" && (
        <div style={s.card}>
          <h2 style={s.h2}>Agendar reunião</h2>
          <p style={s.hint}>Confirma via WhatsApp automaticamente e agenda follow-up D+1.</p>
          <label style={s.lbl}>Lead</label>
          <select style={s.inp} value={scheduleData.leadId} onChange={e => setScheduleData({ ...scheduleData, leadId: e.target.value })}>
            <option value="">Selecione o lead...</option>
            {leads.map(l => <option key={l.id} value={l.id}>{l.name || "Sem nome"} — {l.phone}</option>)}
          </select>
          <label style={s.lbl}>Título</label>
          <input style={s.inp} value={scheduleData.title} onChange={e => setScheduleData({ ...scheduleData, title: e.target.value })} />
          <label style={s.lbl}>Data e hora</label>
          <input type="datetime-local" style={s.inp} value={scheduleData.scheduledAt} onChange={e => setScheduleData({ ...scheduleData, scheduledAt: e.target.value })} />
          <label style={s.lbl}>Duração (minutos)</label>
          <input type="number" style={s.inp} value={scheduleData.duration} onChange={e => setScheduleData({ ...scheduleData, duration: e.target.value })} />
          <label style={s.lbl}>Observações</label>
          <textarea style={{ ...s.inp, height: 80 }} value={scheduleData.notes} onChange={e => setScheduleData({ ...scheduleData, notes: e.target.value })} placeholder="Link Meet, endereço..." />
          <button style={s.btn} onClick={handleSchedule}>📅 Confirmar agendamento</button>
        </div>
      )}

      {tab === "followup" && (
        <div style={s.card}>
          <h2 style={s.h2}>Follow-up / Pós-vendas</h2>
          <p style={s.hint}>Agende uma mensagem para envio automático.</p>
          <label style={s.lbl}>Lead</label>
          <select style={s.inp} value={followupData.leadId} onChange={e => setFollowupData({ ...followupData, leadId: e.target.value })}>
            <option value="">Selecione o lead...</option>
            {leads.map(l => <option key={l.id} value={l.id}>{l.name || "Sem nome"} — {l.phone}</option>)}
          </select>
          <label style={s.lbl}>Tipo</label>
          <select style={s.inp} value={followupData.type} onChange={e => setFollowupData({ ...followupData, type: e.target.value })}>
            <option value="followup">🔁 Follow-up</option>
            <option value="posvendas">🎉 Pós-vendas</option>
            <option value="posreuniao">📅 Pós-reunião</option>
          </select>
          <label style={s.lbl}>Mensagem</label>
          <textarea style={{ ...s.inp, height: 120 }} value={followupData.message} onChange={e => setFollowupData({ ...followupData, message: e.target.value })} placeholder="Oi! Passando para saber se ficou alguma dúvida..." />
          <label style={s.lbl}>Enviar em</label>
          <input type="datetime-local" style={s.inp} value={followupData.scheduledAt} onChange={e => setFollowupData({ ...followupData, scheduledAt: e.target.value })} />
          <button style={s.btn} onClick={handleFollowup}>🔁 Agendar envio</button>
        </div>
      )}
    </div>
  );
}