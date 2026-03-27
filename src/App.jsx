import { useState, useEffect, useCallback, useRef } from "react";
import { Search, Plus, X, Users, MessageCircle, Send, ArrowLeft, Trash2, BarChart3, Target, TrendingUp, Instagram, FileText, Upload, Download, ExternalLink, AlertTriangle, Settings, Menu, XCircle, Edit3, Check, CheckSquare, Square, LogOut, UserPlus, Eye, EyeOff } from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";

// ── Supabase Config ──
const SUPABASE_URL = "https://mwjcsxlaqbeyxmaqmndx.supabase.co";
const SUPABASE_KEY = "sb_publishable_NDm4f99XfizBOYzMw0mOEg_mf2qFeVE";

const sbHeaders = (token) => ({
  "apikey": SUPABASE_KEY,
  "Authorization": `Bearer ${token || SUPABASE_KEY}`,
  "Content-Type": "application/json",
  "Prefer": "return=representation"
});

const sbFetch = async (table, opts = {}, token) => {
  const { method = "GET", body, query = "" } = opts;
  const url = `${SUPABASE_URL}/rest/v1/${table}${query}`;
  const hdrs = { ...sbHeaders(token) };
  if (method === "GET") {
    hdrs["Range"] = "0-9999";
    hdrs["Prefer"] = "count=exact";
  }
  const res = await fetch(url, {
    method,
    headers: hdrs,
    ...(body ? { body: JSON.stringify(body) } : {})
  });
  if (!res.ok && res.status !== 206) { const err = await res.text(); console.error("Supabase error:", err); throw new Error(err); }
  const text = await res.text();
  return text ? JSON.parse(text) : [];
};

const sbAuth = async (endpoint, body) => {
  const res = await fetch(`${SUPABASE_URL}/auth/v1/${endpoint}`, {
    method: "POST",
    headers: { "apikey": SUPABASE_KEY, "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error_description || data.msg || data.message || "Erreur d'authentification");
  return data;
};

// ── Constants ──
const STAGES = [
  { id: "new", label: "Nouveau lead", color: "#6366f1" },
  { id: "dm_sent", label: "DM envoyée", color: "#f59e0b" },
  { id: "dm_impossible", label: "DM Impossible", color: "#ef4444" },
  { id: "hors_cible", label: "Hors cible", color: "#f97316" },
  { id: "discussion", label: "Discussion", color: "#8b5cf6" },
  { id: "pas_interesse", label: "Pas intéressé", color: "#fb7185" },
  { id: "rdv_ok", label: "RDV OK", color: "#10b981" },
  { id: "rdv_booked", label: "RDV Booké", color: "#06d6a0" },
  { id: "won", label: "Deal gagné", color: "#22d3ee" }
];
const FUNNEL = ["new", "dm_sent", "discussion", "rdv_ok", "rdv_booked", "won"];
const DEAD_ENDS = ["dm_impossible", "hors_cible", "pas_interesse"];
const SOURCES = [{ id: "outbound", label: "Outbound", color: "#f59e0b" }, { id: "inbound", label: "Inbound", color: "#06d6a0" }];
const gid = () => Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
const td = () => new Date().toISOString().split("T")[0];
const fmtD = d => { if (!d || d === "—") return "—"; try { return new Date(d + "T00:00:00").toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" }); } catch { return "—"; } };
const instaUrl = h => { if (!h) return null; const c = h.replace(/^@/, "").trim(); return c ? "https://instagram.com/" + c : null; };
const pct = (n, d) => d > 0 ? Math.round((n / d) * 100) : 0;
const normH = h => (h || "").toLowerCase().replace(/^@/, "").trim();
const inPeriod = (ds, p) => { if (!ds || p === "all") return true; const now = new Date(), d = new Date(ds), days = p === "7d" ? 7 : 30, cut = new Date(now); cut.setDate(cut.getDate() - days); cut.setHours(0, 0, 0, 0); return d >= cut; };
const rowBg = stage => stage === "won" ? "rgba(34,211,238,0.06)" : "transparent";

// ── Shared Components ──
function Badge({ children, color, sm }) {
  return (
    <span style={{ backgroundColor: color + "18", color, borderColor: color + "30" }} className={"inline-flex items-center border rounded-full font-semibold whitespace-nowrap " + (sm ? "px-1.5 py-px text-[9px]" : "px-2 py-0.5 text-[10px]")}>{children}</span>
  );
}

function StatCard({ icon: I, label, value, sub, color }) {
  return (
    <div className="rounded-xl p-3.5 relative overflow-hidden" style={{ backgroundColor: "#111128", border: "1px solid #1c1c3a" }}>
      <div className="absolute top-0 right-0 w-14 h-14 rounded-full opacity-[0.05]" style={{ backgroundColor: color, transform: "translate(20%,-20%)" }} />
      <div className="flex items-center gap-2 mb-2">
        <div className="p-1 rounded-md" style={{ backgroundColor: color + "12" }}><I size={13} style={{ color }} /></div>
        <span className="text-[9px] font-semibold tracking-wider uppercase" style={{ color: "#7777a0" }}>{label}</span>
      </div>
      <div className="text-xl font-extrabold text-white leading-none">{value}</div>
      {sub && <div className="text-[9px] mt-1 font-medium" style={{ color: color + "bb" }}>{sub}</div>}
    </div>
  );
}

function Modal({ open, onClose, title, children }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: "rgba(0,0,0,0.7)", backdropFilter: "blur(3px)" }} onClick={onClose}>
      <div className="w-full max-w-lg rounded-2xl p-5 max-h-[85vh] overflow-y-auto" style={{ backgroundColor: "#131330", border: "1px solid #252550" }} onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-bold text-white">{title}</h2>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-white/5 text-gray-500 hover:text-white"><X size={15} /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

function FL({ label, children }) { return <div>{label && <label className="block text-[9px] font-semibold mb-1 tracking-wider uppercase" style={{ color: "#7777a0" }}>{label}</label>}{children}</div>; }
const ic = "w-full rounded-lg px-3 py-2 text-[13px] text-white placeholder-gray-600 outline-none";
const ist = { backgroundColor: "#0e0e24", border: "1px solid #1e1e3e" };

function InstaLink({ handle }) {
  const url = instaUrl(handle);
  if (!url) return <span className="text-[10px]" style={{ color: "#444460" }}>—</span>;
  return <a href={url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-[10px] hover:underline" style={{ color: "#c084fc" }} onClick={e => e.stopPropagation()}><Instagram size={10} />{handle}<ExternalLink size={8} /></a>;
}

function DupAlert({ lead, onView, onDismiss }) {
  if (!lead) return null;
  const st = STAGES.find(s => s.id === lead.stage);
  return (
    <div className="rounded-lg p-2.5 mb-2" style={{ backgroundColor: "#f59e0b10", border: "1px solid #f59e0b20" }}>
      <div className="flex items-start gap-2">
        <AlertTriangle size={13} style={{ color: "#f59e0b", flexShrink: 0, marginTop: 1 }} />
        <div className="flex-1 min-w-0">
          <p className="text-[10px] font-bold mb-1" style={{ color: "#f59e0b" }}>Ce lead existe déjà</p>
          <div className="rounded-md p-2 mb-1.5" style={{ backgroundColor: "#0a0a1a" }}>
            <p className="text-[11px] font-semibold text-white">{lead.name}</p>
            {st && <Badge color={st.color} sm>{st.label}</Badge>}
          </div>
          <div className="flex gap-2">
            <button onClick={onView} className="text-[9px] font-bold px-2 py-1 rounded-md" style={{ backgroundColor: "#f59e0b15", color: "#f59e0b" }}>Voir</button>
            <button onClick={onDismiss} className="text-[9px] px-2 py-1" style={{ color: "#7777a0" }}>Ignorer</button>
          </div>
        </div>
      </div>
    </div>
  );
}

function InlineSelect({ value, options, onChange, colorMap }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const cur = options.find(o => o.id === value);
  const color = colorMap?.[value] || "#7777a0";
  useEffect(() => {
    const h = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    if (open) document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [open]);
  return (
    <div ref={ref} className="relative">
      <button onClick={e => { e.stopPropagation(); setOpen(!open); }} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border cursor-pointer hover:brightness-125" style={{ backgroundColor: color + "18", color, borderColor: color + "30" }}>{cur ? cur.label : "—"}</button>
      {open && <div className="absolute z-40 mt-1 left-0 min-w-36 rounded-xl py-1 shadow-xl" style={{ backgroundColor: "#1a1a3d", border: "1px solid #2a2a55" }}>
        {options.map(o => <button key={o.id} onClick={e => { e.stopPropagation(); onChange(o.id); setOpen(false); }} className="w-full text-left px-3 py-1.5 text-[10px] font-medium hover:bg-white/5 flex items-center gap-2" style={{ color: value === o.id ? colorMap?.[o.id] || "#fff" : "#ccc" }}><div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: colorMap?.[o.id] || "#aaa" }} />{o.label}</button>)}
      </div>}
    </div>
  );
}

function DateCell({ value, onChange }) {
  return (
    <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
      <input type="date" value={value || ""} onChange={e => onChange(e.target.value)} className="bg-transparent text-[10px] outline-none cursor-pointer" style={{ color: "#999bb0", colorScheme: "dark", width: "110px" }} />
      <button onClick={e => { e.stopPropagation(); onChange(td()); }} className="text-[8px] font-bold px-1.5 py-0.5 rounded-md whitespace-nowrap hover:brightness-125" style={{ backgroundColor: "#6366f115", color: "#818cf8" }}>Auj.</button>
    </div>
  );
}

function parseCSV(t) {
  const l = t.split("\n").filter(l => l.trim());
  if (l.length < 2) return [];
  const h = l[0].split(",").map(h => h.trim().toLowerCase().replace(/"/g, "").replace(/\r/g, ""));
  return l.slice(1).map(line => {
    const v = line.match(/(".*?"|[^",]+)(?=\s*,|\s*$)/g) || [];
    const o = {};
    h.forEach((hh, i) => { o[hh] = (v[i] || "").replace(/^"|"$/g, "").replace(/\r/g, "").trim(); });
    return o;
  });
}

const renderPieLabel = ({ cx, cy, midAngle, outerRadius, percent }) => {
  const R = Math.PI / 180; const r = outerRadius + 18;
  const x = cx + r * Math.cos(-midAngle * R); const y = cy + r * Math.sin(-midAngle * R);
  if (percent < 0.05) return null;
  return <text x={x} y={y} fill="#ccc" textAnchor={x > cx ? "start" : "end"} dominantBaseline="central" fontSize={10} fontWeight={600}>{Math.round(percent * 100)}%</text>;
};

// ══════════════════════════════════════
// LOGIN PAGE
// ══════════════════════════════════════
function LoginPage({ onLogin }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const data = await sbAuth("token?grant_type=password", { email, password });
      const token = data.access_token;
      const refreshToken = data.refresh_token;
      const userId = data.user?.id;
      // Get user profile
      const profiles = await sbFetch("user_profiles", { query: `?id=eq.${userId}&select=*` }, token);
      const profile = profiles[0];
      if (!profile) {
        // Auto-create partner profile on first login
        await sbFetch("user_profiles", { method: "POST", body: { id: userId, email, display_name: email.split("@")[0], role: "partner" } }, token);
        onLogin({ id: userId, email, displayName: email.split("@")[0], role: "partner", token, refreshToken });
      } else {
        onLogin({ id: userId, email: profile.email, displayName: profile.display_name || email.split("@")[0], role: profile.role, token, refreshToken });
      }
    } catch (err) {
      setError(err.message === "Invalid login credentials" ? "Email ou mot de passe incorrect" : err.message);
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ backgroundColor: "#0a0a1a" }}>
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="w-12 h-12 rounded-xl mx-auto mb-4 flex items-center justify-center" style={{ background: "linear-gradient(135deg,#6366f1,#8b5cf6)" }}>
            <Target size={22} className="text-white" />
          </div>
          <h1 className="text-xl font-bold text-white mb-1">Authority CRM</h1>
          <p className="text-[11px]" style={{ color: "#7777a0" }}>AuthorityOS™</p>
        </div>
        <form onSubmit={handleLogin} className="rounded-2xl p-6 space-y-4" style={{ backgroundColor: "#111128", border: "1px solid #1c1c3a" }}>
          <FL label="Email">
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} className={ic} style={ist} placeholder="email@exemple.com" required autoFocus />
          </FL>
          <FL label="Mot de passe">
            <div className="relative">
              <input type={showPw ? "text" : "password"} value={password} onChange={e => setPassword(e.target.value)} className={ic + " pr-10"} style={ist} placeholder="••••••••" required />
              <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white">
                {showPw ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
          </FL>
          {error && <p className="text-[11px] text-red-400 bg-red-400/10 rounded-lg px-3 py-2">{error}</p>}
          <button type="submit" disabled={loading || !email || !password} className="w-full py-2.5 rounded-lg text-sm font-bold text-white hover:brightness-110 disabled:opacity-40 transition-all" style={{ background: "linear-gradient(135deg,#6366f1,#8b5cf6)" }}>
            {loading ? "Connexion..." : "Se connecter"}
          </button>
        </form>
      </div>
    </div>
  );
}

// ══════════════════════════════════════
// MAIN CRM
// ══════════════════════════════════════
function CRMApp({ user, onLogout }) {
  const [leads, setLeads] = useState([]);
  const [cats, setCats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [view, setView] = useState("list");
  const [sel, setSel] = useState(null);
  const [showAdd, setShowAdd] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [showCats, setShowCats] = useState(false);
  const [sbOpen, setSbOpen] = useState(true);
  const [search, setSearch] = useState("");
  const [fCat, setFCat] = useState("");
  const [fSrc, setFSrc] = useState("");
  const [fStg, setFStg] = useState("");
  const [aPer, setAPer] = useState("all");
  const [aCat, setACat] = useState("");
  const [toast, setToast] = useState(null);
  const fileRef = useRef(null);
  const [form, setForm] = useState({ name: "", instagram: "", category: "", source: "outbound", stage: "new", notes: "", owner: user.displayName, lastMsgDate: "", valueAsset: false });
  const [dup, setDup] = useState(null);
  const [newCat, setNewCat] = useState("");
  const [editCat, setEditCat] = useState(null);
  const [editCatVal, setEditCatVal] = useState("");
  const [editName, setEditName] = useState(false);
  const [editNameVal, setEditNameVal] = useState("");
  const [selected, setSelected] = useState(new Set());
  const [showListPicker, setShowListPicker] = useState(false);

  const isAdmin = user.role === "admin";
  const flash = m => { setToast(m); setTimeout(() => setToast(null), 2200); };
  const stgCM = {}; STAGES.forEach(s => { stgCM[s.id] = s.color; });
  const srcCM = {}; SOURCES.forEach(s => { srcCM[s.id] = s.color; });

  // ── Data Loading ──
  const loadData = useCallback(async () => {
    try {
      const userFilter = isAdmin ? "" : `&user_id=eq.${user.id}`;
      const [dbLeads, dbCats] = await Promise.all([
        sbFetch("leads", { query: `?select=*&order=created_at.desc${userFilter}` }, user.token),
        sbFetch("categories", { query: "?select=*&order=id.asc" }, user.token)
      ]);
      setLeads(dbLeads.map(l => ({
        id: l.id, name: l.name, instagram: l.instagram, category: l.category,
        source: l.source, stage: l.stage, notes: l.notes, owner: l.owner,
        lastMsgDate: l.last_msg_date, valueAsset: l.value_asset,
        createdAt: l.created_at, updatedAt: l.updated_at, userId: l.user_id
      })));
      setCats(dbCats.map(c => c.name));
    } catch (err) {
      console.error("Load error:", err);
      flash("Erreur de chargement");
    }
    setLoading(false);
  }, [isAdmin, user.id, user.token]);

  useEffect(() => { loadData(); }, [loadData]);

  const toDb = (l) => ({
    id: l.id, name: l.name, instagram: l.instagram, category: l.category,
    source: l.source, stage: l.stage, notes: l.notes, owner: l.owner,
    last_msg_date: l.lastMsgDate, value_asset: l.valueAsset,
    created_at: l.createdAt, updated_at: l.updatedAt, user_id: l.userId
  });

  const saveOneLead = async (id, updates) => {
    setSaving(true);
    try {
      const dbUpdates = {};
      if ("name" in updates) dbUpdates.name = updates.name;
      if ("instagram" in updates) dbUpdates.instagram = updates.instagram;
      if ("category" in updates) dbUpdates.category = updates.category;
      if ("source" in updates) dbUpdates.source = updates.source;
      if ("stage" in updates) dbUpdates.stage = updates.stage;
      if ("notes" in updates) dbUpdates.notes = updates.notes;
      if ("owner" in updates) dbUpdates.owner = updates.owner;
      if ("lastMsgDate" in updates) dbUpdates.last_msg_date = updates.lastMsgDate;
      if ("valueAsset" in updates) dbUpdates.value_asset = updates.valueAsset;
      dbUpdates.updated_at = td();
      await sbFetch("leads", { method: "PATCH", body: dbUpdates, query: `?id=eq.${id}` }, user.token);
    } catch (err) { console.error("Save error:", err); flash("Erreur sauvegarde"); }
    setSaving(false);
  };

  // ── Lead CRUD ──
  const findDup = (h, ex) => { const n = normH(h); return n ? leads.find(l => normH(l.instagram) === n && l.id !== ex) || null : null; };

  const addLead = async () => {
    if (!form.name.trim()) return;
    const d = findDup(form.instagram);
    if (d) { setDup(d); return; }
    const h = form.instagram ? (form.instagram.startsWith("@") ? form.instagram : "@" + form.instagram) : "";
    const now = td();
    const newLead = { ...form, id: gid(), instagram: h, createdAt: now, updatedAt: now, lastMsgDate: form.lastMsgDate || "", userId: user.id };
    setLeads(prev => [newLead, ...prev]);
    setForm({ name: "", instagram: "", category: cats[0] || "", source: "outbound", stage: "new", notes: "", owner: user.displayName, lastMsgDate: "", valueAsset: false });
    setDup(null); setShowAdd(false); flash("Lead ajouté ✓");
    try { await sbFetch("leads", { method: "POST", body: toDb(newLead) }, user.token); } catch (err) { console.error("Insert error:", err); }
  };

  const updL = (id, u) => {
    const n = leads.map(l => l.id === id ? { ...l, ...u, updatedAt: td() } : l);
    setLeads(n);
    if (sel?.id === id) setSel(p => ({ ...p, ...u }));
    saveOneLead(id, u);
  };

  const delL = async (id) => {
    setLeads(prev => prev.filter(l => l.id !== id));
    if (sel?.id === id) { setSel(null); setView("list"); }
    flash("Supprimé");
    try { await sbFetch("leads", { method: "DELETE", query: `?id=eq.${id}` }, user.token); } catch (err) { console.error("Delete error:", err); }
  };

  const toggleSel = id => { const s = new Set(selected); if (s.has(id)) s.delete(id); else s.add(id); setSelected(s); };
  const selAll = () => { if (selected.size === fil.length) setSelected(new Set()); else setSelected(new Set(fil.map(l => l.id))); };

  const bulkDel = async () => {
    const ids = [...selected]; const sz = ids.length;
    setLeads(prev => prev.filter(l => !selected.has(l.id)));
    setSelected(new Set()); flash(sz + " supprimés");
    try { for (const id of ids) { await sbFetch("leads", { method: "DELETE", query: `?id=eq.${id}` }, user.token); } } catch (err) { console.error("Bulk delete error:", err); }
  };

  const bulkList = async (cat) => {
    const ids = [...selected]; const sz = ids.length;
    setLeads(prev => prev.map(l => selected.has(l.id) ? { ...l, category: cat } : l));
    setSelected(new Set()); setShowListPicker(false); flash(sz + " → " + cat);
    try {
      // Update all selected leads in one request per batch
      const batchSize = 100;
      for (let i = 0; i < ids.length; i += batchSize) {
        const batchIds = ids.slice(i, i + batchSize);
        const idFilter = batchIds.map(id => `id.eq.${id}`).join(",");
        await sbFetch("leads", { method: "PATCH", body: { category: cat, updated_at: td() }, query: `?or=(${idFilter})` }, user.token);
      }
    } catch (err) { console.error("Bulk list error:", err); flash("Erreur assignation liste"); }
  };

  const handleCSV = (e) => {
    const file = e.target.files?.[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = async (ev) => {
      try {
        const rows = parseCSV(ev.target.result);
        const ex = new Set(leads.map(l => normH(l.instagram)).filter(Boolean));
        let added = 0, skip = 0, dbFailed = 0; const nl = [];
        rows.forEach(r => {
          const h = r.instagram || r.handle || ""; const n = normH(h);
          if (n && ex.has(n)) { skip++; return; }
          if (n) ex.add(n);
          const cat = r.category || r.liste || r.list || fCat || "";
          nl.push({
            id: gid(), name: r.name || r.nom || "Sans nom",
            instagram: h.startsWith("@") ? h : h ? "@" + h : "",
            category: cat, source: (r.source || "").toLowerCase().includes("inbound") ? "inbound" : "outbound",
            stage: r.stage || r.statut || "new", notes: r.notes || "", owner: r.owner || user.displayName,
            lastMsgDate: r.lastmsgdate || "", createdAt: r.created || td(), updatedAt: td(),
            valueAsset: (r.valueasset || "").toLowerCase() === "yes", userId: user.id
          });
          added++;
        });
        // Insert to Supabase FIRST, then update UI with only successful inserts
        setShowImport(false);
        flash("Import en cours... " + added + " leads");
        const successLeads = [];
        const batchSize = 50;
        for (let i = 0; i < nl.length; i += batchSize) {
          const batch = nl.slice(i, i + batchSize);
          try {
            await sbFetch("leads", { method: "POST", body: batch.map(toDb) }, user.token);
            successLeads.push(...batch);
          } catch (err) {
            // Try inserting one by one to skip only the duplicates
            for (const lead of batch) {
              try {
                await sbFetch("leads", { method: "POST", body: toDb(lead) }, user.token);
                successLeads.push(lead);
              } catch { dbFailed++; }
            }
          }
        }
        // Only add to UI the leads that were actually saved to Supabase
        setLeads(prev => [...successLeads, ...prev]);
        flash(successLeads.length + " importés" + (skip ? " · " + skip + " doublons ignorés" : "") + (dbFailed ? " · " + dbFailed + " rejetés par la base" : "") + " ✓");
      } catch (err) { console.error("CSV error:", err); flash("Erreur CSV : " + err.message); }
    };
    reader.readAsText(file); e.target.value = "";
  };

  const exportCSV = () => {
    const data = fil;
    const headers = ["name", "instagram", "category", "source", "stage", "notes", "owner", "lastmsgdate", "createdAt", "valueasset"];
    const rows = data.map(l => [l.name, l.instagram, l.category, l.source, l.stage, l.notes, l.owner, l.lastMsgDate, l.createdAt, l.valueAsset ? "yes" : "no"].map(v => '"' + String(v || "").replace(/"/g, '""') + '"').join(","));
    const csv = [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "authority-crm-export.csv"; a.click();
    URL.revokeObjectURL(url); flash(data.length + " leads exportés ✓");
  };

  // ── Category CRUD ──
  const addCat = async () => {
    const c = newCat.trim(); if (!c || cats.includes(c)) return;
    setCats(prev => [...prev, c]); setNewCat("");
    try { await sbFetch("categories", { method: "POST", body: { name: c } }, user.token); } catch (err) { console.error("Add cat error:", err); }
  };
  const delCat = async (c) => {
    setCats(prev => prev.filter(x => x !== c));
    try { await sbFetch("categories", { method: "DELETE", query: `?name=eq.${encodeURIComponent(c)}` }, user.token); } catch (err) { console.error("Del cat error:", err); }
  };
  const renameCat = async (old, nw) => {
    const n = nw.trim(); if (!n || cats.includes(n)) return;
    setCats(prev => prev.map(c => c === old ? n : c));
    setLeads(prev => prev.map(l => l.category === old ? { ...l, category: n } : l));
    setEditCat(null);
    try {
      await sbFetch("categories", { method: "PATCH", body: { name: n }, query: `?name=eq.${encodeURIComponent(old)}` }, user.token);
      await sbFetch("leads", { method: "PATCH", body: { category: n, updated_at: td() }, query: `?category=eq.${encodeURIComponent(old)}` }, user.token);
    } catch (err) { console.error("Rename cat error:", err); }
  };

  // ── Filters & Analytics ──
  const fil = leads.filter(l => {
    if (search && !l.name.toLowerCase().includes(search.toLowerCase()) && !normH(l.instagram).includes(search.toLowerCase())) return false;
    if (fCat && l.category !== fCat) return false;
    if (fSrc && l.source !== fSrc) return false;
    if (fStg && l.stage !== fStg) return false;
    return true;
  });
  const aL = leads.filter(l => inPeriod(l.createdAt, aPer) && (!aCat || l.category === aCat));
  const cBS = sid => aL.filter(l => l.stage === sid).length;
  const cCum = sid => { const i = FUNNEL.indexOf(sid); if (i < 0) return 0; return aL.filter(l => FUNNEL.indexOf(l.stage) >= i).length; };
  const aTotal = aL.filter(l => !DEAD_ENDS.includes(l.stage)).length;
  const cDm = cCum("dm_sent"), cDisc = cCum("discussion"), cRO = cCum("rdv_ok"), cRB = cCum("rdv_booked"), cWon = cCum("won");
  const catCounts = {}; cats.forEach(c => { catCounts[c] = leads.filter(l => l.category === c).length; });
  const pieData = [
    { name: "DM envoyée", value: cCum("dm_sent"), color: "#f59e0b" },
    { name: "Discussion", value: cCum("discussion"), color: "#8b5cf6" },
    { name: "Appel OK", value: cCum("rdv_ok"), color: "#10b981" },
    { name: "Appel Booké", value: cCum("rdv_booked"), color: "#06d6a0" },
    { name: "Deal gagné", value: cCum("won"), color: "#22d3ee" },
    { name: "Pas intéressé", value: cBS("pas_interesse"), color: "#fb7185" },
    { name: "Hors cible", value: cBS("hors_cible"), color: "#f97316" },
    { name: "DM Impossible", value: cBS("dm_impossible"), color: "#ef4444" }
  ].filter(d => d.value > 0);

  // ── Loading ──
  if (loading) return (
    <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: "#0a0a1a" }}>
      <div className="text-center">
        <div className="w-7 h-7 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-[10px]" style={{ color: "#7777a0" }}>Chargement...</p>
      </div>
    </div>
  );

  // ── Sidebar ──
  const SB = () => (
    <div className="w-52 flex-shrink-0 flex flex-col h-full overflow-y-auto py-3 px-2.5" style={{ backgroundColor: "#0d0d22", borderRight: "1px solid #181838" }}>
      <div className="flex items-center gap-2 px-2 mb-5">
        <div className="w-6 h-6 rounded-md flex items-center justify-center" style={{ background: "linear-gradient(135deg,#6366f1,#8b5cf6)" }}><Target size={11} className="text-white" /></div>
        <div><p className="text-[11px] font-bold text-white leading-none">Authority CRM</p><p className="text-[8px]" style={{ color: "#555570" }}>AuthorityOS™</p></div>
      </div>
      <div className="space-y-px mb-4">
        {[{ id: "analytics", l: "Analytics", i: BarChart3 }, { id: "list", l: "Contacts", i: FileText }, { id: "pipeline", l: "Pipeline", i: TrendingUp }].map(t => (
          <button key={t.id} onClick={() => { setView(t.id); setSelected(new Set()); }} className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-[11px] font-medium transition-all text-left" style={{ backgroundColor: view === t.id ? "#6366f110" : "transparent", color: view === t.id ? "#a5b4fc" : "#7777a0" }}><t.i size={13} /> {t.l}</button>
        ))}
      </div>
      <div className="mb-3">
        <div className="flex items-center justify-between px-2.5 mb-1.5">
          <span className="text-[8px] font-bold tracking-widest uppercase" style={{ color: "#555570" }}>Listes</span>
          <button onClick={() => setShowCats(true)} className="p-0.5 rounded hover:bg-white/5"><Settings size={10} style={{ color: "#555570" }} /></button>
        </div>
        <button onClick={() => { setFCat(""); if (view !== "list") setView("list"); setSelected(new Set()); }} className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-[10px] font-medium" style={{ backgroundColor: !fCat ? "#ffffff06" : "transparent", color: !fCat ? "#ddd" : "#7777a0" }}><span>All records</span><span className="text-[9px] font-bold" style={{ color: "#6366f1" }}>{leads.length}</span></button>
        <div className="space-y-px max-h-52 overflow-y-auto mt-0.5">
          {cats.map(cat => (
            <button key={cat} onClick={() => { setFCat(cat === fCat ? "" : cat); if (view !== "list") setView("list"); setSelected(new Set()); }} className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-[10px] font-medium transition-all text-left" style={{ backgroundColor: fCat === cat ? "#6366f10d" : "transparent", color: fCat === cat ? "#a5b4fc" : "#888899" }}>
              <span className="truncate mr-1">{cat}</span><span className="text-[9px] font-bold flex-shrink-0" style={{ color: "#555570" }}>{catCounts[cat] || 0}</span>
            </button>
          ))}
        </div>
      </div>
      <div className="mt-auto pt-2 space-y-1" style={{ borderTop: "1px solid #181838" }}>
        <div className="px-2.5 py-1.5">
          <p className="text-[10px] font-semibold text-white">{user.displayName}</p>
          <p className="text-[8px]" style={{ color: "#555570" }}>{user.email}</p>
          {isAdmin && <span className="text-[7px] font-bold px-1.5 py-0.5 rounded-full mt-1 inline-block" style={{ backgroundColor: "#6366f120", color: "#a5b4fc" }}>ADMIN</span>}
        </div>
        <button onClick={onLogout} className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-[10px] font-medium hover:bg-white/5 text-left" style={{ color: "#7777a0" }}>
          <LogOut size={12} /> Déconnexion
        </button>
      </div>
    </div>
  );

  // ── Analytics View ──
  const Analytics = () => {
    const funnel = [
      { l: "Total", c: aTotal, pT: 100, pP: null, col: "#6366f1" },
      { l: "Contactés", c: cDm, pT: pct(cDm, aTotal), pP: pct(cDm, aTotal), col: "#f59e0b" },
      { l: "Pas intéressé", c: cBS("pas_interesse"), pT: pct(cBS("pas_interesse"), aTotal), pP: pct(cBS("pas_interesse"), cDm), col: "#fb7185" },
      { l: "Discussion", c: cDisc, pT: pct(cDisc, aTotal), pP: pct(cDisc, cDm), col: "#8b5cf6" },
      { l: "Appel OK", c: cRO, pT: pct(cRO, aTotal), pP: pct(cRO, cDisc), col: "#10b981" },
      { l: "Appel Booké", c: cRB, pT: pct(cRB, aTotal), pP: pct(cRB, cRO || 1), col: "#06d6a0" },
      { l: "Closé", c: cWon, pT: pct(cWon, aTotal), pP: pct(cWon, cRB || 1), col: "#22d3ee" }
    ];
    const de = [{ l: "Hors cible", c: cBS("hors_cible"), col: "#f97316" }, { l: "DM Impossible", c: cBS("dm_impossible"), col: "#ef4444" }];
    const mx = Math.max(...funnel.map(f => f.c), 1);
    return (
      <div className="p-5 space-y-4 overflow-y-auto">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <h2 className="text-sm font-bold text-white">Analytics</h2>
          <div className="flex gap-2 items-center">
            <select value={aCat} onChange={e => setACat(e.target.value)} className="rounded-lg px-2.5 py-1.5 text-[10px] text-white outline-none" style={{ backgroundColor: "#111128", border: "1px solid #1e1e3e" }}><option value="">Toutes listes</option>{cats.map(c => <option key={c} value={c}>{c}</option>)}</select>
            <div className="flex gap-px p-0.5 rounded-lg" style={{ backgroundColor: "#111128" }}>
              {[{ id: "7d", l: "7j" }, { id: "30d", l: "30j" }, { id: "all", l: "Tout" }].map(p => (
                <button key={p.id} onClick={() => setAPer(p.id)} className="px-2.5 py-1 rounded-md text-[9px] font-semibold" style={{ backgroundColor: aPer === p.id ? "#6366f118" : "transparent", color: aPer === p.id ? "#a5b4fc" : "#7777a0" }}>{p.l}</button>
              ))}
            </div>
          </div>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
          <StatCard icon={Users} label="Total" value={aTotal} color="#6366f1" />
          <StatCard icon={Send} label="Contactés" value={cDm} sub={pct(cDm, aTotal) + "%"} color="#f59e0b" />
          <StatCard icon={MessageCircle} label="Discussion" value={cDisc} sub={pct(cDisc, cDm) + "% réponse"} color="#8b5cf6" />
          <StatCard icon={Target} label="Closé" value={cWon} sub={pct(cWon, cDm) + "% conv."} color="#22d3ee" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
          <div className="lg:col-span-2 rounded-xl p-4" style={{ backgroundColor: "#111128", border: "1px solid #1c1c3a" }}>
            <h3 className="text-xs font-bold text-white mb-3">Pipeline <span className="text-[8px] font-normal" style={{ color: "#7777a0" }}>(cumulatif)</span></h3>
            <div className="space-y-1.5">
              {funnel.map((s, i) => (
                <div key={s.l} className="flex items-center gap-2">
                  <div className="w-5 text-[10px] font-bold text-center" style={{ color: "#555570" }}>#{i + 1}</div>
                  <div className="w-20 text-[10px] font-semibold truncate" style={{ color: s.col }}>{s.l}</div>
                  <div className="flex-1 h-7 rounded-md overflow-hidden" style={{ backgroundColor: "#0a0a1a" }}><div className="h-full rounded-md transition-all duration-500" style={{ width: Math.max((s.c / mx) * 100, s.c > 0 ? 4 : 0) + "%", backgroundColor: s.col + "30" }} /></div>
                  <div className="w-10 text-right text-xs font-extrabold text-white">{s.c}</div>
                  <div className="w-10 text-right text-[10px] font-bold" style={{ color: "#7777a0" }}>{s.pT}%</div>
                  {i > 0 && s.pP !== null ? <div className="w-12 text-right"><span className="text-[8px] font-bold px-1 py-px rounded" style={{ backgroundColor: "#ffffff06", color: "#8888aa" }}>↓{s.pP}%</span></div> : <div className="w-12" />}
                </div>
              ))}
            </div>
            <div className="mt-3 pt-3" style={{ borderTop: "1px solid #1a1a35" }}>
              <p className="text-[8px] font-bold tracking-wider uppercase mb-2" style={{ color: "#555570" }}>Sorties</p>
              {de.map(d => (<div key={d.l} className="flex items-center gap-2"><div className="w-5" /><div className="w-20 text-[10px] font-medium" style={{ color: d.col }}>{d.l}</div><div className="flex-1" /><div className="w-10 text-right text-xs font-bold text-white">{d.c}</div><div className="w-22" /></div>))}
            </div>
          </div>
          <div className="rounded-xl p-4" style={{ backgroundColor: "#111128", border: "1px solid #1c1c3a" }}>
            <h3 className="text-xs font-bold text-white mb-2">Répartition</h3>
            {pieData.length > 0 ? (
              <ResponsiveContainer width="100%" height={260}>
                <PieChart><Pie data={pieData} cx="50%" cy="50%" innerRadius={35} outerRadius={70} paddingAngle={2} dataKey="value" label={renderPieLabel} labelLine={false}>{pieData.map((d, i) => <Cell key={i} fill={d.color} stroke="none" />)}</Pie><Tooltip contentStyle={{ backgroundColor: "#1a1a35", border: "1px solid #2a2a50", borderRadius: 8, fontSize: 11, color: "#fff" }} itemStyle={{ color: "#fff" }} formatter={(v, n) => [v + " (" + pct(v, aL.length) + "%)", n]} /><Legend wrapperStyle={{ fontSize: 9 }} /></PieChart>
              </ResponsiveContainer>
            ) : <p className="text-[10px] text-center py-10" style={{ color: "#555570" }}>—</p>}
          </div>
        </div>
        <div className="rounded-xl p-4" style={{ backgroundColor: "#111128", border: "1px solid #1c1c3a" }}>
          <h3 className="text-xs font-bold text-white mb-3">By Users</h3>
          {[...new Set(aL.map(l => l.owner || "—"))].map(ow => {
            const c = aL.filter(l => (l.owner || "—") === ow).length;
            return (
              <div key={ow} className="flex items-center justify-between py-2 px-2 rounded-lg" style={{ backgroundColor: "#0a0a1a" }}>
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-md flex items-center justify-center text-[9px] font-bold text-white" style={{ backgroundColor: "#6366f125" }}>{ow.substring(0, 2).toUpperCase()}</div>
                  <span className="text-xs font-medium text-white">{ow}</span>
                </div>
                <span className="text-sm font-extrabold text-white">{c}</span>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // ── List View ──
  const List = () => (
    <div className="p-4 overflow-y-auto">
      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
        <h2 className="text-sm font-bold text-white">{fCat || "Contacts"} <span className="text-[10px] font-normal" style={{ color: "#7777a0" }}>({fil.length})</span></h2>
        <div className="flex gap-1.5">
          <button onClick={exportCSV} className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-[9px] font-medium hover:bg-white/5" style={{ border: "1px solid #1e1e3e", color: "#7777a0" }}><Download size={10} /> Export</button>
          <button onClick={() => setShowImport(true)} className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-[9px] font-medium hover:bg-white/5" style={{ border: "1px solid #1e1e3e", color: "#7777a0" }}><Upload size={10} /> Import</button>
          <button onClick={() => { setShowAdd(true); setDup(null); }} className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[9px] font-semibold text-white hover:brightness-110" style={{ background: "linear-gradient(135deg,#6366f1,#8b5cf6)" }}><Plus size={11} /> Nouveau</button>
        </div>
      </div>
      {selected.size > 0 && (
        <div className="mb-3 flex items-center gap-3 px-3 py-2 rounded-xl" style={{ backgroundColor: "#1a1a3d", border: "1px solid #2a2a55" }}>
          <span className="text-[11px] font-bold text-white">{selected.size} record{selected.size > 1 ? "s" : ""}</span><div className="flex-1" />
          <div className="relative">
            <button onClick={() => setShowListPicker(!showListPicker)} className="px-3 py-1.5 rounded-lg text-[10px] font-medium hover:bg-white/5" style={{ color: "#a5b4fc" }}>Ajouter à une liste</button>
            {showListPicker && <div className="absolute bottom-full mb-1 right-0 min-w-40 rounded-xl py-1 shadow-xl" style={{ backgroundColor: "#1a1a3d", border: "1px solid #2a2a55" }}>{cats.map(c => (<button key={c} onClick={() => bulkList(c)} className="w-full text-left px-3 py-1.5 text-[10px] font-medium hover:bg-white/5 text-gray-300">{c}</button>))}</div>}
          </div>
          <button onClick={bulkDel} className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-[10px] font-medium hover:bg-red-500/10" style={{ color: "#ef4444" }}><Trash2 size={12} /> Supprimer</button>
          <button onClick={() => { setSelected(new Set()); setShowListPicker(false); }} className="p-1 rounded-lg hover:bg-white/5 text-gray-500"><X size={14} /></button>
        </div>
      )}
      <div className="flex gap-2 mb-3 flex-wrap">
        <div className="relative flex-1 min-w-48"><Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2" style={{ color: "#555570" }} /><input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search..." className="w-full rounded-lg pl-8 pr-3 py-1.5 text-[11px] text-white placeholder-gray-600 outline-none" style={ist} /></div>
        <select value={fSrc} onChange={e => setFSrc(e.target.value)} className="rounded-lg px-2 py-1.5 text-[10px] text-white outline-none" style={{ backgroundColor: "#111128", border: "1px solid #1e1e3e" }}><option value="">Source</option>{SOURCES.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}</select>
        <select value={fStg} onChange={e => setFStg(e.target.value)} className="rounded-lg px-2 py-1.5 text-[10px] text-white outline-none" style={{ backgroundColor: "#111128", border: "1px solid #1e1e3e" }}><option value="">Statut</option>{STAGES.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}</select>
        {(fSrc || fStg || search) && <button onClick={() => { setFSrc(""); setFStg(""); setSearch(""); }} className="text-[9px] text-red-400 px-1.5">Reset</button>}
      </div>
      <div className="rounded-xl overflow-visible" style={{ border: "1px solid #1c1c3a" }}>
        <table className="w-full">
          <thead><tr style={{ backgroundColor: "#111128" }}>
            <th className="px-2 py-2.5 w-8"><button onClick={selAll} className="p-0.5">{selected.size === fil.length && fil.length > 0 ? <CheckSquare size={14} style={{ color: "#818cf8" }} /> : <Square size={14} style={{ color: "#555570" }} />}</button></th>
            {["Nom", "Statut", "V.Asset", "Instagram", "Dernier msg", "Création", "Origine"].map(h => <th key={h} className="px-2 py-2.5 text-left text-[8px] font-bold tracking-widest uppercase" style={{ color: "#555570" }}>{h}</th>)}
          </tr></thead>
          <tbody>
            {fil.length === 0 ? <tr><td colSpan={8} className="py-12 text-center text-[11px]" style={{ color: "#555570" }}>Aucun lead</td></tr> : fil.map(lead => (
              <tr key={lead.id} className="hover:bg-white/[0.02] transition-all" style={{ backgroundColor: selected.has(lead.id) ? "rgba(99,102,241,0.05)" : rowBg(lead.stage), borderTop: "1px solid " + (lead.stage === "won" ? "rgba(34,211,238,0.15)" : "#141430") }}>
                <td className="px-2 py-2.5 w-8"><button onClick={e => { e.stopPropagation(); toggleSel(lead.id); }} className="p-0.5">{selected.has(lead.id) ? <CheckSquare size={14} style={{ color: "#818cf8" }} /> : <Square size={14} style={{ color: "#444460" }} />}</button></td>
                <td className="px-2 py-2.5 cursor-pointer" onClick={() => { setSel(lead); setView("detail"); setEditName(false); }}><div className="flex items-center gap-2"><div className="w-6 h-6 rounded-md flex items-center justify-center text-[8px] font-bold flex-shrink-0" style={{ backgroundColor: lead.stage === "won" ? "#22d3ee20" : "#6366f115", color: lead.stage === "won" ? "#22d3ee" : "#818cf8" }}>{(lead.name || "").substring(0, 2).toUpperCase()}</div><span className="text-[12px] font-semibold text-white truncate max-w-32 hover:underline">{lead.name}</span></div></td>
                <td className="px-2 py-2.5"><InlineSelect value={lead.stage} options={STAGES.map(s => ({ id: s.id, label: s.label }))} colorMap={stgCM} onChange={v => updL(lead.id, { stage: v })} /></td>
                <td className="px-2 py-2.5"><button onClick={e => { e.stopPropagation(); updL(lead.id, { valueAsset: !lead.valueAsset }); }} className="text-[10px] font-medium px-2 py-0.5 rounded-full cursor-pointer" style={{ backgroundColor: lead.valueAsset ? "#10b98115" : "#ffffff08", color: lead.valueAsset ? "#10b981" : "#666680" }}>{lead.valueAsset ? "Yes" : "No"}</button></td>
                <td className="px-2 py-2.5"><InstaLink handle={lead.instagram} /></td>
                <td className="px-2 py-2.5"><DateCell value={lead.lastMsgDate} onChange={v => updL(lead.id, { lastMsgDate: v })} /></td>
                <td className="px-2 py-2.5"><span className="text-[10px]" style={{ color: "#666680" }}>{fmtD(lead.createdAt)}</span></td>
                <td className="px-2 py-2.5"><InlineSelect value={lead.source} options={SOURCES.map(s => ({ id: s.id, label: s.label }))} colorMap={srcCM} onChange={v => updL(lead.id, { source: v })} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  // ── Pipeline View ──
  const Pipe = () => (
    <div className="p-4 overflow-y-auto">
      <h2 className="text-sm font-bold text-white mb-3">Pipeline</h2>
      <div className="flex gap-2.5 overflow-x-auto pb-4" style={{ minHeight: "50vh" }}>
        {STAGES.map(st => {
          const sl = fil.filter(l => l.stage === st.id);
          return (
            <div key={st.id} className="flex-shrink-0 w-52 rounded-xl p-2.5" style={{ backgroundColor: "#111128", border: "1px solid #1c1c3a" }}>
              <div className="flex items-center gap-1.5 mb-2.5 px-0.5">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: st.color }} />
                <span className="text-[9px] font-bold" style={{ color: st.color }}>{st.label}</span>
                <span className="ml-auto text-[8px] font-bold rounded-full px-1.5 py-px" style={{ backgroundColor: st.color + "15", color: st.color }}>{sl.length}</span>
              </div>
              <div className="space-y-1.5">
                {sl.map(l => (
                  <div key={l.id} onClick={() => { setSel(l); setView("detail"); }} className="rounded-lg p-2 cursor-pointer hover:border-indigo-500/20 transition-all" style={{ backgroundColor: l.stage === "won" ? "rgba(34,211,238,0.05)" : "#0a0a1a", border: "1px solid #181838" }}>
                    <p className="text-[11px] font-semibold text-white mb-0.5 truncate">{l.name}</p>
                    {l.instagram && <div className="mb-1"><InstaLink handle={l.instagram} /></div>}
                    {l.category && <Badge color="#6366f1" sm>{l.category}</Badge>}
                  </div>
                ))}
                {!sl.length && <p className="text-[9px] text-center py-4" style={{ color: "#333350" }}>—</p>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );

  // ── Detail View ──
  const Detail = () => {
    const lead = leads.find(l => l.id === sel?.id) || sel;
    if (!lead) return null;
    return (
      <div className="p-5 max-w-2xl mx-auto overflow-y-auto">
        <button onClick={() => { setSel(null); setView("list"); setEditName(false); }} className="flex items-center gap-1 text-[10px] mb-4 hover:text-white" style={{ color: "#7777a0" }}><ArrowLeft size={12} /> Retour</button>
        <div className="rounded-2xl p-5" style={{ backgroundColor: "#111128", border: "1px solid #1c1c3a" }}>
          <div className="flex items-start justify-between mb-4">
            <div>
              {editName ? (
                <div className="flex items-center gap-2 mb-1">
                  <input value={editNameVal} onChange={e => setEditNameVal(e.target.value)} onKeyDown={e => { if (e.key === "Enter" && editNameVal.trim()) { updL(lead.id, { name: editNameVal.trim() }); setEditName(false); } }} className="text-lg font-bold text-white bg-transparent outline-none border-b-2 border-indigo-500 pb-0.5" autoFocus />
                  <button onClick={() => { if (editNameVal.trim()) { updL(lead.id, { name: editNameVal.trim() }); setEditName(false); } }} className="p-1 rounded hover:bg-green-500/10 text-green-400"><Check size={14} /></button>
                  <button onClick={() => setEditName(false)} className="p-1 rounded hover:bg-white/5 text-gray-500"><X size={14} /></button>
                </div>
              ) : (
                <div className="flex items-center gap-2 mb-1 group">
                  <h2 className="text-lg font-bold text-white">{lead.name}</h2>
                  <button onClick={() => { setEditName(true); setEditNameVal(lead.name); }} className="p-1 rounded hover:bg-white/5 text-gray-600 hover:text-white opacity-0 group-hover:opacity-100 transition-opacity"><Edit3 size={13} /></button>
                </div>
              )}
              {lead.instagram && <InstaLink handle={lead.instagram} />}
            </div>
            <button onClick={() => delL(lead.id)} className="p-1.5 rounded-lg hover:bg-red-500/10 text-gray-600 hover:text-red-400"><Trash2 size={14} /></button>
          </div>
          <div className="grid grid-cols-2 gap-3 mb-4">
            <FL label="Statut"><select value={lead.stage} onChange={e => updL(lead.id, { stage: e.target.value })} className={ic} style={ist}>{STAGES.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}</select></FL>
            <FL label="Liste"><select value={lead.category} onChange={e => updL(lead.id, { category: e.target.value })} className={ic} style={ist}><option value="">—</option>{cats.map(c => <option key={c} value={c}>{c}</option>)}</select></FL>
            <FL label="Source"><select value={lead.source} onChange={e => updL(lead.id, { source: e.target.value })} className={ic} style={ist}>{SOURCES.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}</select></FL>
            <FL label="Owner"><input value={lead.owner || ""} onChange={e => updL(lead.id, { owner: e.target.value })} className={ic} style={ist} /></FL>
            <FL label="Date création"><div className="rounded-lg px-3 py-2 text-[13px]" style={{ backgroundColor: "#0a0a1a", border: "1px solid #1a1a35", color: "#666680" }}>{fmtD(lead.createdAt)}</div></FL>
            <FL label="Dernier message"><div className="flex gap-1.5 items-center"><input type="date" value={lead.lastMsgDate || ""} onChange={e => updL(lead.id, { lastMsgDate: e.target.value })} className={ic + " flex-1 cursor-pointer"} style={{ ...ist, colorScheme: "dark" }} /><button onClick={() => updL(lead.id, { lastMsgDate: td() })} className="px-2.5 py-2 rounded-lg text-[9px] font-semibold whitespace-nowrap flex-shrink-0" style={{ backgroundColor: "#6366f115", color: "#818cf8", border: "1px solid #1e1e3e" }}>Auj.</button></div></FL>
            <FL label="Instagram"><input value={lead.instagram || ""} onChange={e => updL(lead.id, { instagram: e.target.value })} className={ic} style={ist} /></FL>
            <FL label="Value Asset"><button onClick={() => updL(lead.id, { valueAsset: !lead.valueAsset })} className="flex items-center gap-2 px-3 py-2 rounded-lg text-[12px] font-medium w-full" style={{ backgroundColor: "#0e0e24", border: "1px solid #1e1e3e", color: lead.valueAsset ? "#10b981" : "#666680" }}><div className="w-4 h-4 rounded-full flex items-center justify-center" style={{ backgroundColor: lead.valueAsset ? "#10b981" : "#333350" }}>{lead.valueAsset && <Check size={10} className="text-white" />}</div>{lead.valueAsset ? "Yes" : "No"}</button></FL>
          </div>
          <FL label="Notes"><textarea value={lead.notes || ""} onChange={e => updL(lead.id, { notes: e.target.value })} className={ic + " resize-none"} style={ist} rows={3} /></FL>
          <div className="flex gap-3 mt-3 text-[9px]" style={{ color: "#555570" }}><span>Créé {fmtD(lead.createdAt)}</span><span>MAJ {fmtD(lead.updatedAt)}</span></div>
          <div className="mt-4 pt-4" style={{ borderTop: "1px solid #1c1c3a" }}>
            <p className="text-[8px] font-bold uppercase tracking-widest mb-2" style={{ color: "#7777a0" }}>Progression rapide</p>
            <div className="flex flex-wrap gap-1">
              {STAGES.map(s => (
                <button key={s.id} onClick={() => updL(lead.id, { stage: s.id })} className={"px-2 py-1 rounded-md text-[9px] font-semibold transition-all " + (lead.stage === s.id ? "ring-1 opacity-100" : "opacity-30 hover:opacity-60")} style={{ backgroundColor: s.color + "15", color: s.color }}>{s.label}</button>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  };

  // ── Main Render ──
  return (
    <div className="h-screen flex overflow-hidden" style={{ backgroundColor: "#0a0a1a", fontFamily: "-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif" }}>
      <button onClick={() => setSbOpen(!sbOpen)} className="lg:hidden fixed top-2.5 left-2.5 z-40 p-1.5 rounded-lg" style={{ backgroundColor: "#111128" }}><Menu size={15} className="text-white" /></button>
      <div className={(sbOpen ? "translate-x-0" : "-translate-x-full") + " lg:translate-x-0 fixed lg:relative z-30 h-full transition-transform"}><SB /></div>
      {sbOpen && <div className="lg:hidden fixed inset-0 z-20 bg-black/50" onClick={() => setSbOpen(false)} />}
      <div className="flex-1 flex flex-col min-w-0">
        <div className="flex items-center justify-end px-4 py-2 flex-shrink-0" style={{ borderBottom: "1px solid #181838" }}>
          {saving && <span className="text-[8px] px-2 py-0.5 rounded-md font-medium" style={{ color: "#f59e0b", backgroundColor: "#f59e0b10" }}>Sauvegarde...</span>}
        </div>
        <div className="flex-1 overflow-y-auto">
          {view === "analytics" && <Analytics />}
          {view === "list" && <List />}
          {view === "pipeline" && <Pipe />}
          {view === "detail" && <Detail />}
        </div>
      </div>
      <Modal open={showAdd} onClose={() => { setShowAdd(false); setDup(null); }} title="Nouveau lead">
        <div className="space-y-2.5">
          <FL label="Nom"><input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className={ic} style={ist} placeholder="Prénom Nom" /></FL>
          <FL label="Instagram"><input value={form.instagram} onChange={e => { setForm({ ...form, instagram: e.target.value }); setDup(findDup(e.target.value)); }} className={ic} style={{ ...ist, ...(dup ? { borderColor: "#f59e0b" } : {}) }} placeholder="@handle" /></FL>
          <DupAlert lead={dup} onView={() => { setShowAdd(false); setDup(null); setSel(dup); setView("detail"); }} onDismiss={() => setDup(null)} />
          <div className="grid grid-cols-2 gap-2.5">
            <FL label="Liste"><select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} className={ic} style={ist}><option value="">—</option>{cats.map(c => <option key={c} value={c}>{c}</option>)}</select></FL>
            <FL label="Source"><select value={form.source} onChange={e => setForm({ ...form, source: e.target.value })} className={ic} style={ist}>{SOURCES.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}</select></FL>
          </div>
          <FL label="Statut"><select value={form.stage} onChange={e => setForm({ ...form, stage: e.target.value })} className={ic} style={ist}>{STAGES.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}</select></FL>
          <FL label="Owner"><input value={form.owner} onChange={e => setForm({ ...form, owner: e.target.value })} className={ic} style={ist} /></FL>
          <FL label="Notes"><textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} className={ic + " resize-none"} style={ist} rows={2} /></FL>
          <button onClick={addLead} disabled={!form.name.trim() || !!dup} className="w-full py-2 rounded-lg text-xs font-bold text-white hover:brightness-110 disabled:opacity-30" style={{ background: "linear-gradient(135deg,#6366f1,#8b5cf6)" }}>Ajouter</button>
        </div>
      </Modal>
      <Modal open={showImport} onClose={() => setShowImport(false)} title="Import CSV">
        <div className="space-y-3">
          <p className="text-[10px]" style={{ color: "#7777a0" }}>Colonnes: name, instagram, category, source, stage, notes, owner, lastmsgdate, valueasset</p>
          <input ref={fileRef} type="file" accept=".csv" onChange={handleCSV} className="hidden" />
          <button onClick={() => fileRef.current?.click()} className="w-full py-2 rounded-lg text-xs font-bold text-white hover:brightness-110 flex items-center justify-center gap-2" style={{ background: "linear-gradient(135deg,#6366f1,#8b5cf6)" }}><Upload size={13} /> CSV</button>
        </div>
      </Modal>
      <Modal open={showCats} onClose={() => { setShowCats(false); setEditCat(null); }} title="Gérer les listes">
        <div className="space-y-3">
          <div className="flex gap-2">
            <input value={newCat} onChange={e => setNewCat(e.target.value)} onKeyDown={e => e.key === "Enter" && addCat()} className={ic + " text-xs flex-1"} style={ist} placeholder="Nouvelle liste..." />
            <button onClick={addCat} disabled={!newCat.trim()} className="px-3 py-1.5 rounded-lg text-[10px] font-bold text-white hover:brightness-110 disabled:opacity-30 flex-shrink-0" style={{ background: "linear-gradient(135deg,#6366f1,#8b5cf6)" }}>+</button>
          </div>
          <div className="space-y-1 max-h-64 overflow-y-auto">
            {cats.map(cat => (
              <div key={cat} className="flex items-center justify-between px-3 py-2 rounded-lg group" style={{ backgroundColor: "#0a0a1a" }}>
                {editCat === cat ? (
                  <div className="flex items-center gap-2 flex-1">
                    <input value={editCatVal} onChange={e => setEditCatVal(e.target.value)} onKeyDown={e => e.key === "Enter" && renameCat(cat, editCatVal)} className="flex-1 rounded-md px-2 py-1 text-xs text-white outline-none" style={{ backgroundColor: "#0e0e24", border: "1px solid #2a2a50" }} autoFocus />
                    <button onClick={() => renameCat(cat, editCatVal)} className="p-1 rounded hover:bg-green-500/10 text-green-400"><Check size={12} /></button>
                    <button onClick={() => setEditCat(null)} className="p-1 rounded hover:bg-white/5 text-gray-500"><X size={12} /></button>
                  </div>
                ) : (
                  <>
                    <span className="text-[11px] text-white truncate mr-2">{cat}</span>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[9px]" style={{ color: "#555570" }}>{catCounts[cat] || 0}</span>
                      <button onClick={() => { setEditCat(cat); setEditCatVal(cat); }} className="p-1 rounded hover:bg-white/5 text-gray-600 hover:text-white opacity-0 group-hover:opacity-100 transition-opacity"><Edit3 size={11} /></button>
                      <button onClick={() => delCat(cat)} className="p-1 rounded hover:bg-red-500/10 text-gray-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"><XCircle size={11} /></button>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        </div>
      </Modal>
      {toast && <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 px-3.5 py-1.5 rounded-xl text-[10px] font-semibold text-white" style={{ backgroundColor: "#6366f1", boxShadow: "0 6px 24px rgba(99,102,241,0.3)" }}>{toast}</div>}
    </div>
  );
}

// ══════════════════════════════════════
// APP ROOT — Login / CRM Router
// ══════════════════════════════════════
export default function AuthorityCRM() {
  const [user, setUser] = useState(null);

  // Check for saved session
  useEffect(() => {
    const saved = sessionStorage.getItem("authority-crm-session");
    if (saved) {
      try { setUser(JSON.parse(saved)); } catch { sessionStorage.removeItem("authority-crm-session"); }
    }
  }, []);

  // Auto-refresh token every 45 minutes
  useEffect(() => {
    if (!user) return;
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=refresh_token`, {
          method: "POST",
          headers: { "apikey": SUPABASE_KEY, "Content-Type": "application/json" },
          body: JSON.stringify({ refresh_token: user.refreshToken })
        });
        if (res.ok) {
          const data = await res.json();
          const updated = { ...user, token: data.access_token, refreshToken: data.refresh_token };
          setUser(updated);
          sessionStorage.setItem("authority-crm-session", JSON.stringify(updated));
        }
      } catch (err) { console.error("Token refresh error:", err); }
    }, 45 * 60 * 1000);
    return () => clearInterval(interval);
  }, [user]);

  const handleLogin = (userData) => {
    setUser(userData);
    sessionStorage.setItem("authority-crm-session", JSON.stringify(userData));
  };

  const handleLogout = () => {
    setUser(null);
    sessionStorage.removeItem("authority-crm-session");
  };

  if (!user) return <LoginPage onLogin={handleLogin} />;
  return <CRMApp user={user} onLogout={handleLogout} />;
}
