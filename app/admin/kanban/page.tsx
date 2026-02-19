"use client";

import { useState, useEffect, useRef, useCallback } from "react";

// ─── Types (espelham seu Prisma schema) ───────────────────────────────────────
type Stage =
  | "Novos"
  | "Triagem (bot)"
  | "Em atendimento"
  | "Orçamento enviado"
  | "Agendamento pendente"
  | "Agendado"
  | "Fechou"
  | "Perdido";

type Status = "new" | "warm" | "hot" | "lost";

interface Message {
  id: string;
  from: "client" | "bot" | "team";
  text: string;
  createdAt: string;
}

interface Message {
  id: string;
  from: "client" | "bot" | "team";
  text: string;
  createdAt: string;
}

interface Lead {
  id: string;
  phone: string;
  name: string | null;
  treatment: string | null;
  stage: Stage;
  status: Status;
  botStep: string;
  botData: Record<string, any> | null;
  lastMessageAt: string;
  createdAt: string;
  lastMessage?: string | null;
  lastMessageFrom?: string | null;
  messages?: Message[];
  unreadCount?: number;
}

// ─── Constants ────────────────────────────────────────────────────────────────
const STAGES: { id: Stage; label: string; icon: string; color: string }[] = [
  { id: "Novos",                 label: "Novos",                icon: "✨", color: "#0B6E6E" },
  { id: "Triagem (bot)",         label: "Triagem (bot)",        icon: "🤖", color: "#C2610A" },
  { id: "Em atendimento",        label: "Em atendimento",       icon: "💬", color: "#7B4CA5" },
  { id: "Orçamento enviado",     label: "Orçamento enviado",    icon: "📋", color: "#C9A84C" },
  { id: "Agendamento pendente",  label: "Agendamento pendente", icon: "⏳", color: "#1A6276" },
  { id: "Agendado",              label: "Agendado",             icon: "📅", color: "#1A7A4A" },
  { id: "Fechou",                label: "Fechou",               icon: "🏆", color: "#1A5276" },
  { id: "Perdido",               label: "Perdido",              icon: "❌", color: "#9E9D96" },
];

const STATUS_LABELS: Record<Status, { label: string; color: string; bg: string }> = {
  new:  { label: "Novo",    color: "#0B6E6E", bg: "#E6F4F4" },
  warm: { label: "Morno",   color: "#C2610A", bg: "#FEF0E3" },
  hot:  { label: "Quente",  color: "#B03A2E", bg: "#FDECEA" },
  lost: { label: "Perdido", color: "#6B6A64", bg: "#F0F0EC" },
};

const C = {
  teal: "#0B6E6E", tealDark: "#084F4F", tealLight: "#0E8A8A",
  gold: "#C9A84C", goldLight: "#E2C06A",
  cream: "#FAF7F2", white: "#FFFFFF",
  g50: "#F8F8F6", g100: "#EFEFEB", g200: "#DEDDD7",
  g400: "#9E9D96", g600: "#6B6A64", g800: "#2C2C28",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
function initials(lead: Lead) {
  const n = lead.name || lead.phone;
  const parts = n.trim().split(" ");
  return parts.length >= 2
    ? (parts[0][0] + parts[1][0]).toUpperCase()
    : n.slice(0, 2).toUpperCase();
}

function relativeTime(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1)  return "agora";
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
}

const AVATAR_COLORS = ["#0B6E6E","#C9A84C","#7B4CA5","#1A7A4A","#1A5276","#C2610A"];
function avatarColor(str: string) {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = str.charCodeAt(i) + ((h << 5) - h);
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length];
}

// ─── Sub-components ───────────────────────────────────────────────────────────
function Avatar({ lead, size = 36 }: { lead: Lead; size?: number }) {
  const bg = avatarColor(lead.phone);
  return (
    <div style={{
      width: size, height: size, borderRadius: "50%", background: bg,
      display: "flex", alignItems: "center", justifyContent: "center",
      color: "#fff", fontWeight: 700, fontSize: size * 0.36,
      fontFamily: "'Playfair Display', serif", flexShrink: 0,
      boxShadow: `0 2px 8px ${bg}50`,
    }}>
      {initials(lead)}
    </div>
  );
}

function BotBadge({ step, paused }: { step: string; paused: boolean }) {
  if (paused) return (
    <span style={{ fontSize: 10, background: "#FEF0E3", color: "#C2610A", borderRadius: 10, padding: "1px 7px", fontWeight: 600 }}>
      ⏸ Pausado
    </span>
  );
  return (
    <span style={{ fontSize: 10, background: "#E6F4F4", color: C.teal, borderRadius: 10, padding: "1px 7px", fontWeight: 600 }}>
      🤖 {step}
    </span>
  );
}

function LeadCard({
  lead, isActive, onClick,
}: {
  lead: Lead; isActive: boolean; onClick: () => void;
}) {
  const stage = STAGES.find(s => s.id === lead.stage)!;
  const st = STATUS_LABELS[lead.status] ?? STATUS_LABELS.new;

  return (
    <div
      onClick={onClick}
      style={{
        background: "#fff",
        border: isActive ? `2px solid ${C.teal}` : "1.5px solid #E8E8E2",
        borderRadius: 14, padding: "13px 14px", cursor: "pointer",
        marginBottom: 9, transition: "all 0.18s",
        boxShadow: isActive ? `0 4px 20px ${C.teal}20` : "0 1px 6px rgba(0,0,0,0.05)",
        position: "relative", overflow: "hidden",
      }}
      onMouseEnter={e => {
        if (!isActive) {
          (e.currentTarget as HTMLDivElement).style.borderColor = C.tealLight;
          (e.currentTarget as HTMLDivElement).style.boxShadow = "0 4px 16px rgba(11,110,110,0.12)";
        }
      }}
      onMouseLeave={e => {
        if (!isActive) {
          (e.currentTarget as HTMLDivElement).style.borderColor = "#E8E8E2";
          (e.currentTarget as HTMLDivElement).style.boxShadow = "0 1px 6px rgba(0,0,0,0.05)";
        }
      }}
    >
      {isActive && (
        <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 3, background: C.teal, borderRadius: "14px 0 0 14px" }} />
      )}
      {/* Row 1: avatar + name + unread */}
      <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 7 }}>
        <Avatar lead={lead} size={33} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 700, fontSize: 13.5, color: C.g800, fontFamily: "'Playfair Display', serif", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {lead.name ?? lead.phone}
          </div>
          <div style={{ fontSize: 11, color: C.g400, marginTop: 1 }}>
            {lead.name ? lead.phone : ""} {lead.treatment ? `· ${lead.treatment}` : ""}
          </div>
        </div>
        {(lead.unreadCount ?? 0) > 0 && (
          <div style={{ background: C.teal, color: "#fff", borderRadius: 20, padding: "2px 7px", fontSize: 11, fontWeight: 700 }}>
            {lead.unreadCount}
          </div>
        )}
      </div>

      {/* Last message preview */}
      {lead.lastMessage && (
        <div style={{ fontSize: 12, color: C.g600, lineHeight: 1.4, marginBottom: 8, overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" as any }}>
          {lead.lastMessage}
        </div>
      )}

      {/* Row 3: badges + time */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 6 }}>
        <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
          <span style={{ fontSize: 10.5, background: st.bg, color: st.color, borderRadius: 20, padding: "2px 8px", fontWeight: 600 }}>
            {st.label}
          </span>
          <BotBadge step={lead.botStep} paused={lead.botStep === "paused"} />
        </div>
        <span style={{ fontSize: 11, color: C.g400, flexShrink: 0 }}>
          {relativeTime(lead.lastMessageAt)}
        </span>
      </div>
    </div>
  );
}

function ChatPanel({
  lead,
  onClose,
  onStageChange,
  onStatusChange,
  onToggleBot,
  onRefresh,
}: {
  lead: Lead;
  onClose: () => void;
  onStageChange: (stage: Stage) => void;
  onStatusChange: (status: Status) => void;
  onToggleBot: () => void;
  onRefresh: () => void;
}) {
  // Mensagens vêm direto do lead (já carregadas pelo polling de /api/leads)
  const messages = lead.messages ?? [];
  const loading = false;
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const paused = lead.botStep === "paused";

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length, lead.id]);

  const handleSend = async () => {
    if (!text.trim() || sending) return;
    setSending(true);
    try {
      const res = await fetch("/api/send-message", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leadId: lead.id, phone: lead.phone, text: text.trim() }),
      });
      if (res.ok) {
        setText("");
        onRefresh(); // força atualização do polling
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSending(false);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", background: "#fff" }}>
      {/* Header */}
      <div style={{ padding: "14px 18px", borderBottom: `1px solid ${C.g100}`, display: "flex", alignItems: "center", gap: 11 }}>
        <Avatar lead={lead} size={40} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 800, fontSize: 15, color: C.g800, fontFamily: "'Playfair Display', serif" }}>
            {lead.name ?? lead.phone}
          </div>
          <div style={{ fontSize: 11.5, color: C.g400, marginTop: 2, display: "flex", alignItems: "center", gap: 5 }}>
            <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#25D366", display: "inline-block" }} />
            {lead.phone}
            {lead.treatment && ` · ${lead.treatment}`}
          </div>
        </div>
        <div style={{ display: "flex", gap: 7, alignItems: "center" }}>
          {/* Bot toggle */}
          <button
            onClick={onToggleBot}
            style={{
              background: paused ? C.g100 : C.teal, color: paused ? C.g600 : "#fff",
              border: "none", borderRadius: 20, padding: "5px 12px",
              fontSize: 11.5, fontWeight: 700, cursor: "pointer", transition: "all 0.2s",
            }}
          >
            🤖 Bot {paused ? "OFF" : "ON"}
          </button>
          {/* Status */}
          <select
            value={lead.status}
            onChange={e => onStatusChange(e.target.value as Status)}
            style={{ border: `1.5px solid ${C.g200}`, borderRadius: 8, padding: "5px 8px", fontSize: 11.5, color: C.g800, background: "#fff", cursor: "pointer", outline: "none" }}
          >
            {(Object.keys(STATUS_LABELS) as Status[]).map(s => (
              <option key={s} value={s}>{STATUS_LABELS[s].label}</option>
            ))}
          </select>
          <button onClick={onClose} style={{ background: C.g100, border: "none", borderRadius: "50%", width: 30, height: 30, cursor: "pointer", fontSize: 18, color: C.g600, lineHeight: "30px" }}>
            ×
          </button>
        </div>
      </div>

      {/* Stage selector */}
      <div style={{ padding: "9px 16px", borderBottom: `1px solid ${C.g100}`, display: "flex", gap: 5, overflowX: "auto" }}>
        {STAGES.map(s => (
          <button
            key={s.id}
            onClick={() => onStageChange(s.id)}
            style={{
              border: lead.stage === s.id ? `2px solid ${s.color}` : `1.5px solid ${C.g200}`,
              background: lead.stage === s.id ? `${s.color}15` : "#fff",
              color: lead.stage === s.id ? s.color : C.g600,
              borderRadius: 20, padding: "4px 11px", fontSize: 11.5,
              fontWeight: lead.stage === s.id ? 700 : 500,
              cursor: "pointer", whiteSpace: "nowrap", transition: "all 0.15s",
            }}
          >
            {s.icon} {s.label}
          </button>
        ))}
      </div>

      {/* Bot data summary */}
      {lead.botData && Object.keys(lead.botData).length > 0 && (
        <div style={{ padding: "8px 16px", background: "#E6F4F4", borderBottom: `1px solid ${C.g100}`, display: "flex", gap: 12, flexWrap: "wrap" }}>
          {Object.entries(lead.botData).map(([k, v]) => v ? (
            <span key={k} style={{ fontSize: 11, color: C.tealDark }}>
              <b>{k}:</b> {String(v)}
            </span>
          ) : null)}
        </div>
      )}

      {/* Messages */}
      <div style={{ flex: 1, overflowY: "auto", padding: "14px 18px", background: "#F2F5F2", display: "flex", flexDirection: "column", gap: 8 }}>
        {loading ? (
          <div style={{ textAlign: "center", color: C.g400, fontSize: 13, marginTop: 40 }}>Carregando mensagens...</div>
        ) : messages.length === 0 ? (
          <div style={{ textAlign: "center", color: C.g400, fontSize: 13, marginTop: 40 }}>Nenhuma mensagem ainda.</div>
        ) : (
          messages.map(m => {
            const isClient = m.from === "client";
            const isBot    = m.from === "bot";
            return (
              <div key={m.id} style={{ display: "flex", justifyContent: isClient ? "flex-start" : "flex-end" }}>
                <div style={{
                  maxWidth: "76%",
                  background: isClient ? "#fff" : isBot ? `${C.teal}EE` : C.gold,
                  color: isClient ? C.g800 : "#fff",
                  borderRadius: isClient ? "4px 16px 16px 16px" : "16px 4px 16px 16px",
                  padding: "9px 13px", fontSize: 13.5, lineHeight: 1.5,
                  boxShadow: "0 1px 4px rgba(0,0,0,0.08)",
                }}>
                  {isBot && <div style={{ fontSize: 9.5, fontWeight: 700, marginBottom: 3, opacity: 0.75, letterSpacing: 0.5 }}>🤖 BOT BUZZI</div>}
                  {m.from === "team" && <div style={{ fontSize: 9.5, fontWeight: 700, marginBottom: 3, opacity: 0.75, letterSpacing: 0.5 }}>👤 EQUIPE</div>}
                  <div style={{ whiteSpace: "pre-wrap", wordBreak: "break-word" }}>{m.text}</div>
                  <div style={{ fontSize: 10, marginTop: 4, opacity: 0.55, textAlign: "right" }}>
                    {new Date(m.createdAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div style={{ padding: "12px 14px", borderTop: `1px solid ${C.g100}`, background: "#fff", display: "flex", gap: 9, alignItems: "flex-end" }}>
        <textarea
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
          placeholder={paused ? "Bot pausado — você está no controle" : "Enviar como equipe (bot continua ativo)..."}
          rows={2}
          style={{
            flex: 1, border: `1.5px solid ${C.g200}`, borderRadius: 11,
            padding: "9px 13px", fontSize: 13.5, resize: "none",
            fontFamily: "inherit", color: C.g800, outline: "none",
            background: C.g50, transition: "border 0.2s",
          }}
          onFocus={e => (e.target.style.borderColor = C.teal)}
          onBlur={e => (e.target.style.borderColor = C.g200)}
        />
        <button
          onClick={handleSend}
          disabled={sending || !text.trim()}
          style={{
            background: sending || !text.trim() ? C.g200 : C.teal,
            color: sending || !text.trim() ? C.g400 : "#fff",
            border: "none", borderRadius: 11, width: 43, height: 43,
            cursor: sending || !text.trim() ? "default" : "pointer",
            fontSize: 17, display: "flex", alignItems: "center", justifyContent: "center",
            flexShrink: 0, transition: "all 0.2s",
          }}
        >
          {sending ? "…" : "➤"}
        </button>
      </div>
    </div>
  );
}

function KanbanColumn({
  stage, leads, activeId, onLeadClick,
}: {
  stage: typeof STAGES[0]; leads: Lead[]; activeId: string | null; onLeadClick: (l: Lead) => void;
}) {
  return (
    <div style={{
      minWidth: 272, maxWidth: 272, display: "flex", flexDirection: "column",
      background: C.g50, borderRadius: 16, border: `1.5px solid ${C.g100}`, height: "100%", overflow: "hidden",
    }}>
      {/* Column header */}
      <div style={{ padding: "12px 14px", borderBottom: `1.5px solid ${C.g100}`, background: "#fff", display: "flex", alignItems: "center", gap: 7 }}>
        <span style={{ fontSize: 17 }}>{stage.icon}</span>
        <span style={{ fontWeight: 700, fontSize: 13, color: C.g800, flex: 1, fontFamily: "'Playfair Display', serif" }}>{stage.label}</span>
        <span style={{ background: `${stage.color}18`, color: stage.color, borderRadius: 20, padding: "2px 9px", fontSize: 12, fontWeight: 700, border: `1px solid ${stage.color}30` }}>
          {leads.length}
        </span>
      </div>
      {/* Cards */}
      <div style={{ padding: "10px 9px", flex: 1, overflowY: "auto" }}>
        {leads.length === 0 ? (
          <div style={{ textAlign: "center", padding: "28px 8px", color: C.g400, fontSize: 12 }}>
            <div style={{ fontSize: 24, marginBottom: 6, opacity: 0.4 }}>—</div>
            Nenhum lead
          </div>
        ) : (
          leads.map(l => (
            <LeadCard key={l.id} lead={l} isActive={l.id === activeId} onClick={() => onLeadClick(l)} />
          ))
        )}
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function KanbanPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [activeLead, setActiveLead] = useState<Lead | null>(null);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  const fetchLeads = useCallback(async () => {
    try {
      const res = await fetch("/api/leads");
      if (res.ok) {
        const data = await res.json();
        setLeads(data.leads ?? data);
        // keep activeLead in sync
        if (activeLead) {
          const updated = data.find((l: Lead) => l.id === activeLead.id);
          if (updated) setActiveLead(updated);
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [activeLead?.id]);

  useEffect(() => {
    fetchLeads();
    const interval = setInterval(fetchLeads, 8000); // poll every 8s
    return () => clearInterval(interval);
  }, []);

  const updateLead = async (id: string, data: Partial<Pick<Lead, "stage" | "status" | "botStep">>) => {
    // optimistic update
    setLeads(prev => prev.map(l => l.id === id ? { ...l, ...data } : l));
    if (activeLead?.id === id) setActiveLead(prev => prev ? { ...prev, ...data } : prev);

    await fetch(`/api/leads/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
  };

  const handleStageChange = (stage: Stage) => {
    if (!activeLead) return;
    updateLead(activeLead.id, { stage });
  };

  const handleStatusChange = (status: Status) => {
    if (!activeLead) return;
    updateLead(activeLead.id, { status });
  };

  const handleToggleBot = () => {
    if (!activeLead) return;
    const newStep = activeLead.botStep === "paused" ? "done" : "paused";
    updateLead(activeLead.id, { botStep: newStep });
  };

  const filtered = leads.filter(l => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      (l.name ?? "").toLowerCase().includes(q) ||
      l.phone.includes(q) ||
      (l.treatment ?? "").toLowerCase().includes(q) ||
      (l.lastMessage ?? "").toLowerCase().includes(q)
    );
  });

  const totalUnread  = leads.reduce((a, l) => a + (l.unreadCount ?? 0), 0);
  const botActive    = leads.filter(l => l.botStep !== "paused").length;

  return (
    <div style={{ fontFamily: "'DM Sans','Helvetica Neue',sans-serif", background: C.cream, height: "100vh", display: "flex", flexDirection: "column", overflow: "hidden" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;700;800&family=DM+Sans:wght@400;500;600;700&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        ::-webkit-scrollbar { width: 5px; height: 5px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: ${C.g200}; border-radius: 10px; }
        textarea, select, input { font-family: 'DM Sans', sans-serif; }
        @keyframes pulse { 0%,100% { opacity:1; } 50% { opacity:.5; } }
        @keyframes fadeIn { from { opacity:0; transform:translateX(16px); } to { opacity:1; transform:translateX(0); } }
        ::placeholder { color: rgba(255,255,255,0.45); }
      `}</style>

      {/* ── Top Nav ── */}
      <div style={{ background: C.tealDark, color: "#fff", padding: "0 24px", display: "flex", alignItems: "center", height: 56, boxShadow: "0 2px 16px rgba(8,79,79,0.3)", flexShrink: 0 }}>
        {/* Logo */}
        <div style={{ display: "flex", alignItems: "center", gap: 11, marginRight: 28 }}>
          <div style={{ width: 33, height: 33, borderRadius: 9, background: C.gold, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Playfair Display',serif", fontWeight: 800, fontSize: 18, color: C.tealDark, boxShadow: `0 2px 8px ${C.gold}60` }}>B</div>
          <div>
            <div style={{ fontFamily: "'Playfair Display',serif", fontWeight: 700, fontSize: 15.5, letterSpacing: 0.3 }}>Buzzi CRM</div>
            <div style={{ fontSize: 9.5, opacity: 0.55, letterSpacing: 0.6, marginTop: -1 }}>ODONTOLOGIA · CURITIBA</div>
          </div>
        </div>

        {/* Search */}
        <div style={{ position: "relative", flex: 1, maxWidth: 360 }}>
          <span style={{ position: "absolute", left: 11, top: "50%", transform: "translateY(-50%)", fontSize: 13, opacity: 0.5 }}>🔍</span>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar paciente, telefone, tratamento..."
            style={{ width: "100%", padding: "7px 13px 7px 32px", background: "rgba(255,255,255,0.1)", border: "1.5px solid rgba(255,255,255,0.15)", borderRadius: 9, color: "#fff", fontSize: 13, outline: "none" }}
          />
        </div>

        <div style={{ flex: 1 }} />

        {/* Pills */}
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          {totalUnread > 0 && (
            <div style={{ background: C.gold, color: C.tealDark, borderRadius: 20, padding: "4px 12px", fontSize: 12, fontWeight: 700, display: "flex", alignItems: "center", gap: 4, animation: "pulse 2s infinite" }}>
              📩 {totalUnread} nova{totalUnread > 1 ? "s" : ""}
            </div>
          )}
          <div style={{ background: "rgba(255,255,255,0.1)", borderRadius: 20, padding: "4px 12px", fontSize: 12, opacity: 0.85 }}>
            🤖 {botActive} bot ativo
          </div>
          <div style={{ background: "rgba(255,255,255,0.1)", borderRadius: 20, padding: "4px 12px", fontSize: 12, opacity: 0.85 }}>
            👥 {leads.length} leads
          </div>
          {/* Live indicator */}
          <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, opacity: 0.7 }}>
            <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#4ADE80", display: "inline-block", animation: "pulse 2s infinite" }} />
            live
          </div>
          <div style={{ width: 32, height: 32, borderRadius: "50%", background: C.gold, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Playfair Display',serif", fontWeight: 800, fontSize: 13, color: C.tealDark, cursor: "pointer", marginLeft: 4 }}>
            FB
          </div>
        </div>
      </div>

      {/* ── Stats bar ── */}
      <div style={{ background: "#fff", borderBottom: `1px solid ${C.g100}`, padding: "8px 24px", display: "flex", gap: 20, alignItems: "center", flexShrink: 0, boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
        <div style={{ fontSize: 12.5, color: C.g600, display: "flex", gap: 5, alignItems: "center" }}>
          <span style={{ fontWeight: 800, color: C.teal, fontSize: 19 }}>{leads.length}</span> leads totais
        </div>
        <div style={{ width: 1, height: 18, background: C.g200 }} />
        {STAGES.map(s => {
          const n = filtered.filter(l => l.stage === s.id).length;
          return (
            <div key={s.id} style={{ display: "flex", gap: 4, alignItems: "center", fontSize: 12 }}>
              <span>{s.icon}</span>
              <span style={{ fontWeight: 700, color: s.color }}>{n}</span>
            </div>
          );
        })}
        <div style={{ flex: 1 }} />
        {loading && <span style={{ fontSize: 11.5, color: C.g400 }}>Atualizando...</span>}
      </div>

      {/* ── Main ── */}
      <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
        {/* Kanban board */}
        <div style={{ flex: 1, overflowX: "auto", overflowY: "hidden", padding: "18px 16px 18px 22px", display: "flex", gap: 12 }}>
          {STAGES.map(stage => (
            <KanbanColumn
              key={stage.id}
              stage={stage}
              leads={filtered.filter(l => l.stage === stage.id).sort((a, b) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime())}
              activeId={activeLead?.id ?? null}
              onLeadClick={l => setActiveLead(l)}
            />
          ))}
        </div>

        {/* Chat panel */}
        {activeLead && (
          <div style={{ width: 430, borderLeft: `1.5px solid ${C.g100}`, flexShrink: 0, display: "flex", flexDirection: "column", animation: "fadeIn 0.2s ease" }}>
            <ChatPanel
              lead={activeLead}
              onClose={() => setActiveLead(null)}
              onStageChange={handleStageChange}
              onStatusChange={handleStatusChange}
              onToggleBot={handleToggleBot}
              onRefresh={fetchLeads}
            />
          </div>
        )}
      </div>

      {/* Footer */}
      <div style={{ textAlign: "center", padding: "5px", fontSize: 10, color: C.g400, background: "#fff", borderTop: `1px solid ${C.g100}`, flexShrink: 0 }}>
        Buzzi Odontologia · Dra. Fernanda Buzzi · CRO-PR 17042 · {new Date().toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
      </div>
    </div>
  );
}
