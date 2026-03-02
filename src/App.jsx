import { useState, useMemo, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

const fmt = (n) =>
  n == null || isNaN(n)
    ? "—"
    : new Intl.NumberFormat("th-TH", { maximumFractionDigits: 0 }).format(n);

const FIELD = ({ label, children, sub }) => (
  <div className="field">
    <label>{label}{sub && <span className="sub">{sub}</span>}</label>
    {children}
  </div>
);

const NumInput = ({ value, onChange, placeholder = "0" }) => (
  <input
    type="number"
    value={value}
    onChange={(e) => onChange(e.target.value === "" ? "" : Number(e.target.value))}
    placeholder={placeholder}
  />
);

const Row = ({ label, value, highlight, formula, accent }) => (
  <div className={`calc-row ${highlight ? "highlight" : ""} ${accent ? "accent" : ""}`}>
    <span className="row-label">{label}</span>
    <span className="row-value">{value}</span>
    {formula && <span className="row-formula">{formula}</span>}
  </div>
);

const DEFAULT_FORM = {
  landPrice: "", landSize: "", devCostPerSqm: 2000,
  plots: "", usableArea: 120, constructionCost: 10000,
  profitTarget: 20, marketPrice: "", remarks: "",
};

export default function App() {
  const [landType, setLandType] = useState("small");
  const [form, setForm] = useState(DEFAULT_FORM);
  const [projects, setProjects] = useState([]);
  const [projectName, setProjectName] = useState("");
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showProjects, setShowProjects] = useState(false);
  const [toast, setToast] = useState(null);
  const [currentProjectId, setCurrentProjectId] = useState(null);

  const set = (key) => (val) => setForm((f) => ({ ...f, [key]: val }));

  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const commonAreaPct = landType === "small" ? 0.1 : 0.3;
  const sellAreaPct = 1 - commonAreaPct;

  const calc = useMemo(() => {
    const landPrice = Number(form.landPrice) || 0;
    const landSize = Number(form.landSize) || 0;
    const devCostPerSqm = Number(form.devCostPerSqm) || 0;
    const plots = Number(form.plots) || 0;
    const usableArea = Number(form.usableArea) || 0;
    const constructionCost = Number(form.constructionCost) || 0;
    const profitPct = (Number(form.profitTarget) || 20) / 100;
    const marketPrice = Number(form.marketPrice) || 0;
    const sellArea = landSize * sellAreaPct;
    const commonArea = landSize * commonAreaPct;
    const commonAreaSqm = commonArea * 4;
    const totalDevCost = devCostPerSqm * commonAreaSqm;
    const totalLandPlusDev = landPrice + totalDevCost;
    const landPricePerWah = sellArea > 0 ? totalLandPlusDev / sellArea : 0;
    const landPerPlot = plots > 0 ? sellArea / plots : 0;
    const landCostPerPlot = landPerPlot * landPricePerWah;
    const constructionPerHouse = usableArea * constructionCost;
    const subTotal = landCostPerPlot + constructionPerHouse;
    const opCost = subTotal * 0.15;
    const totalWithOp = subTotal + opCost;
    const profit = totalWithOp * profitPct;
    const estimatedSalePrice = totalWithOp + profit;
    const isGo = marketPrice > 0 && marketPrice >= estimatedSalePrice;
    const gap = marketPrice - estimatedSalePrice;
    const gapPct = estimatedSalePrice > 0 ? (gap / estimatedSalePrice) * 100 : 0;
    return { sellArea, commonArea, commonAreaSqm, totalDevCost, totalLandPlusDev, landPricePerWah, landPerPlot, landCostPerPlot, constructionPerHouse, subTotal, opCost, totalWithOp, profit, estimatedSalePrice, isGo, gap, gapPct };
  }, [form, landType, commonAreaPct, sellAreaPct]);

  const fetchProjects = async () => {
    setLoading(true);
    const { data, error } = await supabase.from("projects").select("*").order("created_at", { ascending: false });
    if (!error) setProjects(data || []);
    setLoading(false);
  };

  useEffect(() => { fetchProjects(); }, []);

  const saveProject = async () => {
    if (!projectName.trim()) return showToast("กรุณาตั้งชื่อโปรเจกต์ก่อนครับ", "error");
    setSaving(true);
    const payload = { name: projectName.trim(), land_type: landType, data: { form } };
    let error;
    if (currentProjectId) {
      ({ error } = await supabase.from("projects").update(payload).eq("id", currentProjectId));
    } else {
      ({ error } = await supabase.from("projects").insert(payload));
    }
    setSaving(false);
    if (error) return showToast("บันทึกไม่สำเร็จ: " + error.message, "error");
    showToast("บันทึกสำเร็จแล้วครับ ✅");
    fetchProjects();
  };

  const loadProject = (p) => {
    setForm(p.data.form);
    setLandType(p.land_type || "small");
    setProjectName(p.name);
    setCurrentProjectId(p.id);
    setShowProjects(false);
    showToast(`โหลด "${p.name}" แล้วครับ`);
  };

  const deleteProject = async (id, e) => {
    e.stopPropagation();
    if (!confirm("ลบโปรเจกต์นี้?")) return;
    await supabase.from("projects").delete().eq("id", id);
    if (currentProjectId === id) { setCurrentProjectId(null); setProjectName(""); }
    fetchProjects();
    showToast("ลบแล้วครับ");
  };

  const newProject = () => {
    setForm(DEFAULT_FORM); setLandType("small"); setProjectName(""); setCurrentProjectId(null);
  };

  const hasResult = Number(form.landPrice) > 0 && Number(form.landSize) > 0;

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Anuphan:wght@300;400;500;600;700&family=IBM+Plex+Mono:wght@400;500&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        :root {
          --bg:#0a0e14;--surface:#111820;--surface2:#161e28;--border:#1e2d3d;--border2:#243040;
          --gold:#d4a843;--gold-dim:#9a7730;--green:#2ed573;--red:#ff4757;--blue:#1e90ff;
          --muted:#4a6072;--text:#c8d8e8;--text2:#8aa0b0;
          --font:'Anuphan',sans-serif;--mono:'IBM Plex Mono',monospace;
        }
        body{background:var(--bg);color:var(--text);font-family:var(--font);min-height:100vh;
          background-image:radial-gradient(ellipse at 20% 0%,rgba(212,168,67,0.04) 0%,transparent 60%),radial-gradient(ellipse at 80% 100%,rgba(30,144,255,0.04) 0%,transparent 60%);}
        .app{max-width:1200px;margin:0 auto;padding:24px 20px 80px;}
        .toast{position:fixed;bottom:24px;left:50%;transform:translateX(-50%);padding:10px 20px;border-radius:30px;font-size:13px;z-index:999;font-family:var(--font);box-shadow:0 4px 20px rgba(0,0,0,0.4);animation:fadeUp 0.3s ease;}
        .toast.success{background:#1a3a28;border:1px solid var(--green);color:var(--green);}
        .toast.error{background:#3a1a1e;border:1px solid var(--red);color:var(--red);}
        @keyframes fadeUp{from{opacity:0;transform:translateX(-50%) translateY(10px);}to{opacity:1;transform:translateX(-50%) translateY(0);}}
        header{display:flex;align-items:flex-start;justify-content:space-between;padding-bottom:28px;border-bottom:1px solid var(--border);margin-bottom:28px;flex-wrap:wrap;gap:12px;}
        .brand{display:flex;align-items:center;gap:14px;}
        .logo-icon{width:44px;height:44px;background:linear-gradient(135deg,var(--gold),#8b6220);border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:22px;flex-shrink:0;}
        .brand-text h1{font-size:18px;font-weight:600;color:#fff;}
        .brand-text p{font-size:12px;color:var(--muted);margin-top:2px;font-family:var(--mono);}
        .badge{font-size:11px;font-family:var(--mono);color:var(--gold);background:rgba(212,168,67,0.1);border:1px solid rgba(212,168,67,0.2);padding:4px 10px;border-radius:20px;}
        .toolbar{display:flex;gap:8px;align-items:center;margin-bottom:20px;flex-wrap:wrap;}
        .project-name-input{flex:1;min-width:180px;background:var(--surface);border:1px solid var(--border2);border-radius:8px;color:var(--text);font-family:var(--font);font-size:14px;padding:9px 14px;outline:none;}
        .project-name-input:focus{border-color:var(--gold-dim);}
        .project-name-input::placeholder{color:var(--muted);}
        .btn{padding:9px 16px;border-radius:8px;border:none;cursor:pointer;font-family:var(--font);font-size:13px;font-weight:500;transition:all 0.15s;white-space:nowrap;}
        .btn-gold{background:linear-gradient(135deg,var(--gold),#b8892a);color:#000;}
        .btn-gold:hover{filter:brightness(1.1);}
        .btn-outline{background:transparent;border:1px solid var(--border2);color:var(--text2);}
        .btn-outline:hover{border-color:var(--gold-dim);color:var(--text);}
        .btn-ghost{background:transparent;border:1px solid var(--border);color:var(--muted);}
        .btn-ghost:hover{color:var(--text2);border-color:var(--border2);}
        .btn:disabled{opacity:0.5;cursor:not-allowed;}
        .project-count{font-size:11px;font-family:var(--mono);color:var(--muted);padding:4px 8px;background:var(--surface);border:1px solid var(--border);border-radius:6px;}
        .projects-panel{background:var(--surface);border:1px solid var(--border);border-radius:14px;margin-bottom:20px;overflow:hidden;}
        .projects-panel-header{padding:12px 16px;background:var(--surface2);border-bottom:1px solid var(--border);display:flex;align-items:center;justify-content:space-between;}
        .projects-panel-header h3{font-size:13px;font-weight:600;color:var(--text2);text-transform:uppercase;letter-spacing:0.08em;}
        .projects-list{max-height:260px;overflow-y:auto;}
        .project-item{display:flex;align-items:center;gap:12px;padding:12px 16px;border-bottom:1px solid var(--border);cursor:pointer;transition:background 0.15s;}
        .project-item:hover{background:rgba(255,255,255,0.03);}
        .project-item:last-child{border-bottom:none;}
        .project-item-name{font-size:14px;color:var(--text);}
        .project-item-meta{font-size:11px;font-family:var(--mono);color:var(--muted);}
        .project-item-type{font-size:10px;padding:2px 8px;border-radius:10px;background:rgba(212,168,67,0.1);color:var(--gold);border:1px solid rgba(212,168,67,0.2);}
        .btn-delete{background:transparent;border:none;cursor:pointer;color:var(--muted);font-size:14px;padding:4px;border-radius:4px;transition:color 0.15s;}
        .btn-delete:hover{color:var(--red);}
        .empty-projects{padding:30px;text-align:center;color:var(--muted);font-size:13px;}
        .current-badge{font-size:10px;padding:2px 7px;border-radius:10px;background:rgba(46,213,115,0.1);color:var(--green);border:1px solid rgba(46,213,115,0.2);}
        .type-toggle{display:grid;grid-template-columns:1fr 1fr;background:var(--surface);border:1px solid var(--border);border-radius:10px;overflow:hidden;margin-bottom:20px;}
        .type-btn{padding:12px 20px;border:none;background:transparent;color:var(--text2);cursor:pointer;font-family:var(--font);font-size:14px;font-weight:500;transition:all 0.2s;text-align:center;}
        .type-btn.active{background:linear-gradient(135deg,rgba(212,168,67,0.15),rgba(212,168,67,0.05));color:var(--gold);border-bottom:2px solid var(--gold);}
        .type-btn .type-pct{font-size:11px;font-family:var(--mono);opacity:0.7;margin-top:2px;}
        .grid{display:grid;grid-template-columns:1fr 1fr;gap:20px;}
        @media(max-width:768px){.grid{grid-template-columns:1fr;}}
        .section{background:var(--surface);border:1px solid var(--border);border-radius:14px;overflow:hidden;margin-bottom:20px;}
        .section-header{padding:12px 16px;background:var(--surface2);border-bottom:1px solid var(--border);display:flex;align-items:center;gap:8px;}
        .section-header h2{font-size:12px;font-weight:600;color:var(--text2);text-transform:uppercase;letter-spacing:0.08em;}
        .dot{width:6px;height:6px;border-radius:50%;background:var(--gold);flex-shrink:0;}
        .section-body{padding:16px;}
        .fields{display:flex;flex-direction:column;gap:12px;}
        .field label{display:block;font-size:12px;color:var(--text2);margin-bottom:4px;font-weight:500;}
        .field .sub{font-family:var(--mono);font-size:10px;color:var(--muted);margin-left:6px;}
        .field input,.field textarea{width:100%;background:var(--bg);border:1px solid var(--border2);border-radius:8px;color:var(--text);font-family:var(--mono);font-size:14px;padding:9px 12px;outline:none;transition:border-color 0.2s;}
        .field input:focus,.field textarea:focus{border-color:var(--gold-dim);}
        .field input::placeholder{color:var(--muted);}
        .input-with-unit{position:relative;}
        .input-with-unit input{padding-right:60px;}
        .unit-badge{position:absolute;right:10px;top:50%;transform:translateY(-50%);font-size:10px;font-family:var(--mono);color:var(--muted);background:var(--surface2);padding:2px 6px;border-radius:4px;pointer-events:none;}
        .calc-group{margin-bottom:10px;}
        .calc-group-label{font-size:10px;font-family:var(--mono);color:var(--muted);text-transform:uppercase;letter-spacing:0.1em;margin-bottom:5px;padding-left:2px;}
        .calc-row{display:flex;align-items:center;justify-content:space-between;padding:7px 10px;border-radius:7px;gap:8px;margin-bottom:2px;}
        .calc-row:hover{background:rgba(255,255,255,0.02);}
        .calc-row.highlight{background:rgba(212,168,67,0.07);border:1px solid rgba(212,168,67,0.15);}
        .calc-row.accent{background:rgba(30,144,255,0.07);border:1px solid rgba(30,144,255,0.12);}
        .row-label{font-size:12px;color:var(--text2);flex:1;}
        .row-formula{font-size:10px;font-family:var(--mono);color:var(--muted);}
        .row-value{font-size:13px;font-family:var(--mono);color:var(--text);font-weight:500;white-space:nowrap;}
        .calc-row.highlight .row-value{color:var(--gold);}
        .calc-row.accent .row-value{color:#5aacff;}
        .divider{border:none;border-top:1px solid var(--border);margin:10px 0;}
        .big-nums{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:10px;}
        .big-num{background:var(--bg);border:1px solid var(--border);border-radius:10px;padding:12px 14px;}
        .big-num-label{font-size:10px;color:var(--muted);font-family:var(--mono);text-transform:uppercase;margin-bottom:4px;}
        .big-num-val{font-size:16px;font-family:var(--mono);font-weight:600;color:var(--text);}
        .big-num.primary .big-num-val{color:var(--gold);}
        .big-num.market .big-num-val{color:#5aacff;}
        .decision{border-radius:14px;padding:20px;display:flex;align-items:center;gap:16px;flex-wrap:wrap;margin-top:0;transition:all 0.4s;}
        .decision.go{background:linear-gradient(135deg,rgba(46,213,115,0.12),rgba(46,213,115,0.04));border:1px solid rgba(46,213,115,0.3);}
        .decision.stop{background:linear-gradient(135deg,rgba(255,71,87,0.12),rgba(255,71,87,0.04));border:1px solid rgba(255,71,87,0.3);}
        .decision.pending{background:var(--surface);border:1px dashed var(--border2);}
        .decision-icon{font-size:36px;line-height:1;flex-shrink:0;}
        .decision-main{flex:1;min-width:140px;}
        .decision-verdict{font-size:26px;font-weight:700;letter-spacing:0.05em;line-height:1;}
        .go .decision-verdict{color:var(--green);}.stop .decision-verdict{color:var(--red);}
        .pending .decision-verdict{color:var(--muted);font-size:15px;}
        .decision-sub{font-size:12px;color:var(--text2);margin-top:4px;}
        .decision-gap{text-align:right;min-width:130px;}
        .gap-label{font-size:11px;color:var(--text2);margin-bottom:2px;}
        .gap-value{font-size:18px;font-family:var(--mono);font-weight:600;}
        .go .gap-value{color:var(--green);}.stop .gap-value{color:var(--red);}
        .gap-pct{font-size:11px;font-family:var(--mono);opacity:0.7;margin-top:2px;}
        .remark-chip{display:inline-flex;align-items:center;gap:5px;font-size:11px;color:var(--gold);background:rgba(212,168,67,0.08);border:1px solid rgba(212,168,67,0.15);padding:3px 10px;border-radius:20px;margin-top:8px;}
        .compare-bar{margin-top:14px;}
        .bar-labels{display:flex;justify-content:space-between;font-size:10px;font-family:var(--mono);color:var(--muted);margin-bottom:5px;}
        .bar-track{height:6px;background:var(--border2);border-radius:3px;overflow:hidden;}
        .bar-fill{height:100%;border-radius:3px;transition:width 0.5s ease;}
        .placeholder{text-align:center;padding:40px 20px;color:var(--muted);}
        .placeholder .ph-icon{font-size:32px;margin-bottom:10px;}
        .placeholder p{font-size:13px;}
        ::-webkit-scrollbar{width:5px;}::-webkit-scrollbar-track{background:var(--bg);}::-webkit-scrollbar-thumb{background:var(--border2);border-radius:3px;}
      `}</style>

      {toast && <div className={`toast ${toast.type}`}>{toast.msg}</div>}

      <div className="app">
        <header>
          <div className="brand">
            <div className="logo-icon">🏗️</div>
            <div className="brand-text">
              <h1>Land Investment Analyzer</h1>
              <p>ระบบวิเคราะห์การลงทุนที่ดิน · Real Estate ROI</p>
            </div>
          </div>
          <span className="badge">Supabase Edition</span>
        </header>

        {/* Toolbar */}
        <div className="toolbar">
          <button className="btn btn-ghost" onClick={newProject}>＋ โปรเจกต์ใหม่</button>
          <input className="project-name-input" placeholder="ชื่อโปรเจกต์ เช่น H23/1, บ้านพัทยา..." value={projectName} onChange={(e) => setProjectName(e.target.value)} />
          <button className="btn btn-gold" onClick={saveProject} disabled={saving}>{saving ? "⏳ กำลังบันทึก..." : "💾 บันทึก"}</button>
          <button className="btn btn-outline" onClick={() => { setShowProjects(!showProjects); if (!showProjects) fetchProjects(); }}>📂 โปรเจกต์ทั้งหมด</button>
          {projects.length > 0 && <span className="project-count">{projects.length} โปรเจกต์</span>}
        </div>

        {/* Projects Panel */}
        {showProjects && (
          <div className="projects-panel">
            <div className="projects-panel-header">
              <h3>📂 โปรเจกต์ที่บันทึกไว้</h3>
              {loading && <span style={{ fontSize: 11, color: "var(--muted)", fontFamily: "var(--mono)" }}>กำลังโหลด...</span>}
            </div>
            <div className="projects-list">
              {projects.length === 0 && !loading
                ? <div className="empty-projects">ยังไม่มีโปรเจกต์ที่บันทึกไว้</div>
                : projects.map((p) => (
                  <div key={p.id} className="project-item" onClick={() => loadProject(p)}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                        <span className="project-item-name">{p.name}</span>
                        {p.id === currentProjectId && <span className="current-badge">เปิดอยู่</span>}
                      </div>
                      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                        <span className="project-item-type">{p.land_type === "small" ? "ขนาดเล็ก 10%" : "ขนาดใหญ่ 30%"}</span>
                        <span className="project-item-meta">{new Date(p.created_at).toLocaleDateString("th-TH")}</span>
                        {p.data?.form?.marketPrice && <span className="project-item-meta">ตลาด {fmt(p.data.form.marketPrice)} ฿</span>}
                      </div>
                    </div>
                    <button className="btn-delete" onClick={(e) => deleteProject(p.id, e)}>🗑️</button>
                  </div>
                ))}
            </div>
          </div>
        )}

        {/* Type Toggle */}
        <div className="type-toggle">
          <button className={`type-btn ${landType === "small" ? "active" : ""}`} onClick={() => setLandType("small")}>
            <div>🏘️ ที่ดินขนาดเล็ก</div><div className="type-pct">พื้นที่ส่วนกลาง 10% · ขาย 90%</div>
          </button>
          <button className={`type-btn ${landType === "large" ? "active" : ""}`} onClick={() => setLandType("large")}>
            <div>🏙️ ที่ดินขนาดใหญ่</div><div className="type-pct">พื้นที่ส่วนกลาง 30% · ขาย 70%</div>
          </button>
        </div>

        <div className="grid">
          <div>
            <div className="section">
              <div className="section-header"><div className="dot"/><h2>ข้อมูลที่ดิน</h2></div>
              <div className="section-body"><div className="fields">
                <FIELD label="ราคาที่ดิน" sub="บาท"><div className="input-with-unit"><NumInput value={form.landPrice} onChange={set("landPrice")} placeholder="2,450,000"/><span className="unit-badge">บาท</span></div></FIELD>
                <FIELD label="ขนาดที่ดิน" sub="ตร.ว."><div className="input-with-unit"><NumInput value={form.landSize} onChange={set("landSize")} placeholder="252"/><span className="unit-badge">ตร.ว.</span></div></FIELD>
                <FIELD label="ค่าพัฒนาส่วนกลาง" sub="บาท/ตร.ม."><div className="input-with-unit"><NumInput value={form.devCostPerSqm} onChange={set("devCostPerSqm")} placeholder="2000"/><span className="unit-badge">฿/ตร.ม.</span></div></FIELD>
              </div></div>
            </div>
            <div className="section">
              <div className="section-header"><div className="dot" style={{background:"#5aacff"}}/><h2>ข้อมูลบ้าน</h2></div>
              <div className="section-body"><div className="fields">
                <FIELD label="จำนวนแปลง"><div className="input-with-unit"><NumInput value={form.plots} onChange={set("plots")} placeholder="5"/><span className="unit-badge">แปลง</span></div></FIELD>
                <FIELD label="พื้นที่ใช้สอยต่อหลัง"><div className="input-with-unit"><NumInput value={form.usableArea} onChange={set("usableArea")} placeholder="120"/><span className="unit-badge">ตร.ม.</span></div></FIELD>
                <FIELD label="ค่าก่อสร้าง"><div className="input-with-unit"><NumInput value={form.constructionCost} onChange={set("constructionCost")} placeholder="10000"/><span className="unit-badge">฿/ตร.ม.</span></div></FIELD>
              </div></div>
            </div>
            <div className="section">
              <div className="section-header"><div className="dot" style={{background:"#2ed573"}}/><h2>ราคาตลาด & เป้าหมาย</h2></div>
              <div className="section-body"><div className="fields">
                <FIELD label="ราคาตลาด (ต่อหลัง)"><div className="input-with-unit"><NumInput value={form.marketPrice} onChange={set("marketPrice")} placeholder="3,190,000"/><span className="unit-badge">บาท</span></div></FIELD>
                <FIELD label="เป้าหมายกำไร"><div className="input-with-unit"><NumInput value={form.profitTarget} onChange={set("profitTarget")} placeholder="20"/><span className="unit-badge">%</span></div></FIELD>
                <FIELD label="หมายเหตุ"><textarea rows={2} value={form.remarks} onChange={(e)=>set("remarks")(e.target.value)} placeholder="เช่น ยังไม่รวมถมดิน, ค่ารั้ว..." style={{resize:"vertical"}}/></FIELD>
              </div></div>
            </div>
          </div>

          <div>
            {!hasResult ? (
              <div className="section">
                <div className="section-header"><div className="dot" style={{background:"var(--muted)"}}/><h2>ผลการวิเคราะห์</h2></div>
                <div className="section-body"><div className="placeholder"><div className="ph-icon">📊</div><p>กรอกข้อมูลราคาที่ดิน<br/>และขนาดที่ดินเพื่อเริ่มวิเคราะห์</p></div></div>
              </div>
            ) : (
              <>
                <div className="section">
                  <div className="section-header"><div className="dot"/><h2>การคำนวณต้นทุน</h2></div>
                  <div className="section-body">
                    <div className="calc-group">
                      <div className="calc-group-label">📐 พื้นที่</div>
                      <Row label="พื้นที่ขาย" value={`${fmt(calc.sellArea)} ตร.ว.`} formula={`×${sellAreaPct*100}%`}/>
                      <Row label="พื้นที่ส่วนกลาง" value={`${fmt(calc.commonArea)} ตร.ว.`} formula={`×${commonAreaPct*100}%`}/>
                      <Row label="ส่วนกลาง (ตร.ม.)" value={`${fmt(calc.commonAreaSqm)} ตร.ม.`} formula="×4"/>
                    </div>
                    <hr className="divider"/>
                    <div className="calc-group">
                      <div className="calc-group-label">🏗️ ค่าพัฒนา</div>
                      <Row label="ค่าพัฒนาส่วนกลางรวม" value={`${fmt(calc.totalDevCost)} ฿`}/>
                      <Row label="รวมที่ดิน + ค่าพัฒนา" value={`${fmt(calc.totalLandPlusDev)} ฿`} highlight/>
                      <Row label="ราคาที่ดิน / ตร.ว." value={`${fmt(calc.landPricePerWah)} ฿`}/>
                    </div>
                    {Number(form.plots) > 0 && (<>
                      <hr className="divider"/>
                      <div className="calc-group">
                        <div className="calc-group-label">🏠 ต้นทุนต่อแปลง</div>
                        <Row label="ขนาดที่ดินต่อแปลง" value={`${fmt(calc.landPerPlot)} ตร.ว.`}/>
                        <Row label="ต้นทุนที่ดินต่อแปลง" value={`${fmt(calc.landCostPerPlot)} ฿`}/>
                        <Row label="ค่าก่อสร้างต่อหลัง" value={`${fmt(calc.constructionPerHouse)} ฿`}/>
                        <Row label="ที่ดิน + ก่อสร้าง" value={`${fmt(calc.subTotal)} ฿`} accent/>
                      </div>
                      <hr className="divider"/>
                      <div className="calc-group">
                        <div className="calc-group-label">💰 ราคาขาย</div>
                        <Row label="ค่าดำเนินการ 15%" value={`${fmt(calc.opCost)} ฿`}/>
                        <Row label="รวมกับค่าดำเนินการ" value={`${fmt(calc.totalWithOp)} ฿`}/>
                        <Row label={`กำไร ${form.profitTarget}%`} value={`${fmt(calc.profit)} ฿`}/>
                        <Row label="ประมาณการราคาขาย" value={`${fmt(calc.estimatedSalePrice)} ฿`} highlight/>
                      </div>
                    </>)}
                  </div>
                </div>

                {Number(form.plots) > 0 && (
                  <div className="section">
                    <div className="section-header"><div className="dot" style={{background:"#2ed573"}}/><h2>สรุปราคา</h2></div>
                    <div className="section-body">
                      <div className="big-nums">
                        <div className="big-num primary"><div className="big-num-label">ประมาณการขาย</div><div className="big-num-val">{fmt(calc.estimatedSalePrice)}</div></div>
                        {Number(form.marketPrice)>0 && <div className="big-num market"><div className="big-num-label">ราคาตลาด</div><div className="big-num-val">{fmt(Number(form.marketPrice))}</div></div>}
                        <div className="big-num"><div className="big-num-label">ต้นทุนรวม</div><div className="big-num-val">{fmt(calc.totalWithOp)}</div></div>
                        <div className="big-num"><div className="big-num-label">กำไรต่อหลัง</div><div className="big-num-val">{fmt(calc.profit)}</div></div>
                      </div>
                      {Number(form.marketPrice)>0 && (
                        <div className="compare-bar" style={{marginTop:16}}>
                          <div className="bar-labels"><span>ต้นทุน + กำไร</span><span>ราคาตลาด</span></div>
                          <div className="bar-track"><div className="bar-fill" style={{width:`${Math.min(100,(calc.estimatedSalePrice/Number(form.marketPrice))*100)}%`,background:calc.isGo?"linear-gradient(90deg,#2ed573,#7bed9f)":"linear-gradient(90deg,#ff4757,#ff6b81)"}}/></div>
                          <div style={{display:"flex",justifyContent:"flex-end",marginTop:4}}><span style={{fontSize:10,fontFamily:"var(--mono)",color:"var(--muted)"}}>{((calc.estimatedSalePrice/Number(form.marketPrice))*100).toFixed(1)}% ของราคาตลาด</span></div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {Number(form.plots)>0 && Number(form.marketPrice)>0 && (
                  <div className={`decision ${calc.isGo?"go":"stop"}`}>
                    <div className="decision-icon">{calc.isGo?"✅":"🛑"}</div>
                    <div className="decision-main">
                      <div className="decision-verdict">{calc.isGo?"GO":"STOP"}</div>
                      <div className="decision-sub">{calc.isGo?"ราคาตลาดสูงกว่าต้นทุน — คุ้มค่าลงทุน":"ราคาตลาดต่ำกว่าต้นทุน — ควรทบทวน"}</div>
                      {form.remarks && <div className="remark-chip">📌 {form.remarks}</div>}
                    </div>
                    <div className="decision-gap">
                      <div className="gap-label">ส่วนต่าง</div>
                      <div className="gap-value">{calc.gap>=0?"+":""}{fmt(calc.gap)}</div>
                      <div className="gap-pct">({calc.gapPct>=0?"+":""}{calc.gapPct.toFixed(1)}%)</div>
                    </div>
                  </div>
                )}

                {Number(form.plots)>0 && !Number(form.marketPrice) && (
                  <div className="decision pending">
                    <div className="decision-icon">⏳</div>
                    <div className="decision-main"><div className="decision-verdict">รอข้อมูลราคาตลาด</div><div className="decision-sub">กรอกราคาตลาดเพื่อดูผล Go / Stop</div></div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
