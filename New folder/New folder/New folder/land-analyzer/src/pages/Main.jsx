import { useState, useMemo, useEffect, useCallback } from "react";
import { createClient } from "@supabase/supabase-js";
import { MapContainer, TileLayer, Marker, useMapEvents } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import Pricing, { PLANS } from "./Pricing";

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
});

const supabase = createClient(import.meta.env.VITE_SUPABASE_URL, import.meta.env.VITE_SUPABASE_ANON_KEY);
const fmt = (n) => n == null || isNaN(n) ? "—" : new Intl.NumberFormat("th-TH", { maximumFractionDigits: 0 }).format(n);
const DEFAULT = { landPrice: "", landSize: "", devCost: 2000, plots: "", area: 120, buildCost: 10000, profit: 20, market: "", note: "" };

function Clicker({ onPin }) {
  useMapEvents({ click: (e) => onPin({ lat: e.latlng.lat, lng: e.latlng.lng }) });
  return null;
}

function F({ label, sub, children }) {
  return (
    <div className="field">
      <label>{label}{sub && <span className="sub"> {sub}</span>}</label>
      {children}
    </div>
  );
}

function NI({ value, onChange, placeholder }) {
  return <input type="number" value={value} placeholder={placeholder || "0"}
    onChange={(e) => onChange(e.target.value === "" ? "" : Number(e.target.value))} />;
}

function Row({ label, value, hi, ac }) {
  return (
    <div className={`cr ${hi ? "hi" : ""} ${ac ? "ac" : ""}`}>
      <span className="rl">{label}</span><span className="rv">{value}</span>
    </div>
  );
}

export default function Main({ user }) {
  const [type, setType] = useState("small");
  const [form, setForm] = useState(DEFAULT);
  const [projects, setProjects] = useState([]);
  const [pname, setPname] = useState("");
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showList, setShowList] = useState(false);
  const [toast, setToast] = useState(null);
  const [pid, setPid] = useState(null);
  const [pin, setPin] = useState(null);
  const [tab, setTab] = useState("calc");
  const [showPricing, setShowPricing] = useState(false);
  const [sub, setSub] = useState({ plan: "free", deals_used: 0, deals_limit: 1 });

  const s = (k) => (v) => setForm((f) => ({ ...f, [k]: v }));
  const msg = (m, t = "ok") => { setToast({ m, t }); setTimeout(() => setToast(null), 3500); };

  const planInfo = PLANS.find(p => p.id === sub.plan) || PLANS[0];
  const isUnlimited = sub.plan === "unlimited";
  const dealsLeft = isUnlimited ? "∞" : Math.max(0, sub.deals_limit - sub.deals_used);
  const canSave = isUnlimited || sub.deals_used < sub.deals_limit;
  const pdfUsed = sub.pdf_exports_used || 0;
  const canExportPDF = sub.plan !== "free" || pdfUsed < 1;

  const caPct = type === "small" ? 0.1 : 0.3;
  const sellPct = 1 - caPct;

  const c = useMemo(() => {
    const lp = Number(form.landPrice) || 0, ls = Number(form.landSize) || 0;
    const dc = Number(form.devCost) || 0, pl = Number(form.plots) || 0;
    const ua = Number(form.area) || 0, bc = Number(form.buildCost) || 0;
    const pp = (Number(form.profit) || 20) / 100, mk = Number(form.market) || 0;
    const sa = ls * sellPct, ca = ls * caPct, caSqm = ca * 4;
    const tdc = dc * caSqm, tlp = lp + tdc;
    const ppw = sa > 0 ? tlp / sa : 0;
    const lpp = pl > 0 ? sa / pl : 0;
    const lcp = lpp * ppw, bph = ua * bc;
    const sub2 = lcp + bph, op = sub2 * 0.15, tot = sub2 + op;
    const pft = tot * pp, esp = tot + pft;
    const isGo = mk > 0 && mk >= esp;
    const gap = mk - esp, gapPct = esp > 0 ? (gap / esp) * 100 : 0;
    return { sa, ca, caSqm, tdc, tlp, ppw, lpp, lcp, bph, sub: sub2, op, tot, pft, esp, isGo, gap, gapPct };
  }, [form, type, caPct, sellPct]);

  const fetchSub = async () => {
    const { data } = await supabase.from("subscriptions").select("*").eq("user_id", user.id).single();
    if (data) setSub(data);
    else {
      const { data: newSub } = await supabase.from("subscriptions").insert({ user_id: user.id, plan: "free", deals_used: 0, deals_limit: 1 }).select().single();
      if (newSub) setSub(newSub);
    }
  };

  const fetchProjects = async () => {
    setLoading(true);
    const { data } = await supabase.from("projects").select("*").eq("user_id", user.id).order("created_at", { ascending: false });
    setProjects(data || []);
    setLoading(false);
  };

  useEffect(() => { fetchSub(); fetchProjects(); }, []);

  const save = async () => {
    if (!pname.trim()) return msg("กรุณาตั้งชื่อโปรเจกต์ก่อน", "err");
    if (!canSave && !pid) return msg("ครบลิมิตแล้วครับ กรุณาอัปเกรด Plan", "err");
    setSaving(true);
    const payload = { name: pname.trim(), land_type: type, user_id: user.id, data: { form, pin } };
    let error;
    if (pid) {
      ({ error } = await supabase.from("projects").update(payload).eq("id", pid));
    } else {
      ({ error } = await supabase.from("projects").insert(payload));
      if (!error && !isUnlimited) {
        await supabase.from("subscriptions").update({ deals_used: sub.deals_used + 1 }).eq("user_id", user.id);
        setSub(s => ({ ...s, deals_used: s.deals_used + 1 }));
      }
    }
    setSaving(false);
    if (error) return msg("บันทึกไม่สำเร็จ: " + error.message, "err");
    msg("บันทึกสำเร็จแล้วครับ ✅");
    fetchProjects();
  };

  const load = (p) => {
    setForm(p.data?.form || DEFAULT);
    setType(p.land_type || "small");
    setPname(p.name); setPid(p.id);
    setPin(p.data?.pin || null);
    setShowList(false);
    msg(`โหลด "${p.name}" แล้วครับ`);
  };

  const del = async (id, e) => {
    e.stopPropagation();
    if (!confirm("ลบโปรเจกต์นี้?")) return;
    await supabase.from("projects").delete().eq("id", id);
    if (!isUnlimited) await supabase.from("subscriptions").update({ deals_used: Math.max(0, sub.deals_used - 1) }).eq("user_id", user.id);
    if (pid === id) { setPid(null); setPname(""); setPin(null); }
    fetchProjects(); fetchSub();
    msg("ลบแล้วครับ");
  };

  const newP = () => { setForm(DEFAULT); setType("small"); setPname(""); setPid(null); setPin(null); };
  const signOut = () => supabase.auth.signOut();
  const onPin = useCallback((loc) => { setPin(loc); msg("ปักหมุดแล้วครับ 📍"); }, []);

  const exportPDF = async () => {
    if (!canExportPDF) { setShowPricing(true); return msg("ใช้สิทธิ์ Export PDF ฟรีครบแล้ว กรุณาอัปเกรด Plan ครับ", "err"); }
    const hasResult = Number(form.landPrice) > 0 && Number(form.landSize) > 0 && Number(form.plots) > 0;
    if (!hasResult) return msg("กรอกข้อมูลให้ครบก่อนครับ", "err");

    const now = new Date().toLocaleDateString("th-TH", { year: "numeric", month: "long", day: "numeric" });
    const typeLabel = type === "small" ? "ที่ดินขนาดเล็ก (ส่วนกลาง 10%)" : "ที่ดินขนาดใหญ่ (ส่วนกลาง 30%)";
    const decision = Number(form.market) > 0 ? (c.isGo ? "✅ GO — คุ้มค่าลงทุน" : "🛑 STOP — ควรทบทวน") : "⏳ รอราคาตลาด";

    const html = `<!DOCTYPE html><html><head><meta charset="utf-8">
    <style>
      body{font-family:Arial,sans-serif;padding:40px;color:#1a1a1a;max-width:700px;margin:0 auto;}
      h1{font-size:22px;color:#1a1a1a;margin-bottom:4px;}
      .sub{font-size:12px;color:#666;margin-bottom:24px;}
      .section{margin-bottom:20px;}
      .section-title{font-size:13px;font-weight:bold;color:#888;text-transform:uppercase;letter-spacing:0.08em;border-bottom:1px solid #eee;padding-bottom:4px;margin-bottom:10px;}
      .row{display:flex;justify-content:space-between;padding:5px 0;font-size:13px;border-bottom:1px solid #f5f5f5;}
      .row.hi{background:#fffbf0;padding:6px 8px;border-radius:4px;font-weight:bold;}
      .row.ac{background:#f0f7ff;padding:6px 8px;border-radius:4px;}
      .label{color:#555;}.value{font-weight:600;color:#1a1a1a;}
      .decision{padding:16px;border-radius:8px;text-align:center;font-size:18px;font-weight:bold;margin-top:20px;}
      .go{background:#f0fff4;border:2px solid #2ed573;color:#1a7a3c;}
      .stop{background:#fff0f0;border:2px solid #ff4757;color:#c0392b;}
      .pending{background:#f8f8f8;border:2px solid #ccc;color:#666;}
      .gap{font-size:13px;margin-top:6px;font-weight:normal;}
      .header{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:24px;}
      .logo{font-size:28px;}
      .pin-info{font-size:12px;color:#888;margin-top:4px;}
      @media print{body{padding:20px;}}
    </style></head><body>
    <div class="header">
      <div>
        <h1>🏗️ ${pname || "Land Investment Report"}</h1>
        <div class="sub">${typeLabel} · วันที่ ${now}</div>
        ${pin ? `<div class="pin-info">📍 พิกัด: ${pin.lat.toFixed(5)}, ${pin.lng.toFixed(5)}</div>` : ""}
      </div>
      <div style="text-align:right;font-size:11px;color:#aaa;">Land Investment Analyzer<br/>Generated by AI</div>
    </div>

    <div class="section">
      <div class="section-title">📐 ข้อมูลที่ดิน</div>
      <div class="row"><span class="label">ราคาที่ดิน</span><span class="value">${fmt(Number(form.landPrice))} บาท</span></div>
      <div class="row"><span class="label">ขนาดที่ดิน</span><span class="value">${fmt(Number(form.landSize))} ตร.ว.</span></div>
      <div class="row"><span class="label">พื้นที่ขาย</span><span class="value">${fmt(c.sa)} ตร.ว.</span></div>
      <div class="row"><span class="label">ค่าพัฒนาส่วนกลาง</span><span class="value">${fmt(Number(form.devCost))} บาท/ตร.ม.</span></div>
    </div>

    <div class="section">
      <div class="section-title">🏠 ข้อมูลบ้าน</div>
      <div class="row"><span class="label">จำนวนแปลง</span><span class="value">${fmt(Number(form.plots))} แปลง</span></div>
      <div class="row"><span class="label">พื้นที่ใช้สอย</span><span class="value">${fmt(Number(form.area))} ตร.ม.</span></div>
      <div class="row"><span class="label">ค่าก่อสร้าง</span><span class="value">${fmt(Number(form.buildCost))} บาท/ตร.ม.</span></div>
    </div>

    <div class="section">
      <div class="section-title">💰 ผลการคำนวณต้นทุน</div>
      <div class="row"><span class="label">รวมที่ดิน + ค่าพัฒนา</span><span class="value">${fmt(c.tlp)} บาท</span></div>
      <div class="row"><span class="label">ต้นทุนที่ดินต่อแปลง</span><span class="value">${fmt(c.lcp)} บาท</span></div>
      <div class="row"><span class="label">ค่าก่อสร้างต่อหลัง</span><span class="value">${fmt(c.bph)} บาท</span></div>
      <div class="row ac"><span class="label">ที่ดิน + ก่อสร้าง</span><span class="value">${fmt(c.sub)} บาท</span></div>
      <div class="row"><span class="label">ค่าดำเนินการ 15%</span><span class="value">${fmt(c.op)} บาท</span></div>
      <div class="row"><span class="label">กำไร ${form.profit}%</span><span class="value">${fmt(c.pft)} บาท</span></div>
      <div class="row hi"><span class="label">ประมาณการราคาขาย</span><span class="value">${fmt(c.esp)} บาท</span></div>
      ${Number(form.market) > 0 ? `<div class="row"><span class="label">ราคาตลาด</span><span class="value">${fmt(Number(form.market))} บาท</span></div>` : ""}
    </div>

    ${Number(form.market) > 0 ? `
    <div class="decision ${c.isGo ? "go" : "stop"}">
      ${decision}
      <div class="gap">ส่วนต่าง: ${c.gap >= 0 ? "+" : ""}${fmt(c.gap)} บาท (${c.gapPct >= 0 ? "+" : ""}${c.gapPct.toFixed(1)}%)</div>
    </div>` : `<div class="decision pending">${decision}</div>`}

    ${form.note ? `<div class="section" style="margin-top:16px;"><div class="section-title">📝 หมายเหตุ</div><p style="font-size:13px;color:#555;">${form.note}</p></div>` : ""}

    </body></html>`;

    const win = window.open("", "_blank");
    win.document.write(html);
    win.document.close();
    setTimeout(() => win.print(), 500);
    // นับจำนวนครั้งที่ Export สำหรับ Free plan
    if (sub.plan === "free") {
      const newCount = pdfUsed + 1;
      await supabase.from("subscriptions").update({ pdf_exports_used: newCount }).eq("user_id", user.id);
      setSub(s => ({ ...s, pdf_exports_used: newCount }));
    }
  };

  const hasResult = Number(form.landPrice) > 0 && Number(form.landSize) > 0;

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Anuphan:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500&display=swap');
        *,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
        :root{--bg:#0a0e14;--sf:#111820;--sf2:#161e28;--br:#1e2d3d;--br2:#243040;
          --go:#d4a843;--gd:#9a7730;--gn:#2ed573;--rd:#ff4757;--mu:#4a6072;
          --tx:#c8d8e8;--t2:#8aa0b0;--fn:'Anuphan',sans-serif;--mo:'IBM Plex Mono',monospace;}
        body{background:var(--bg);color:var(--tx);font-family:var(--fn);min-height:100vh;
          background-image:radial-gradient(ellipse at 20% 0%,rgba(212,168,67,0.04) 0%,transparent 60%),radial-gradient(ellipse at 80% 100%,rgba(30,144,255,0.04) 0%,transparent 60%);}
        .app{max-width:1200px;margin:0 auto;padding:20px 20px 80px;}
        .toast{position:fixed;bottom:24px;left:50%;transform:translateX(-50%);padding:10px 20px;border-radius:30px;
          font-size:13px;z-index:9999;box-shadow:0 4px 20px rgba(0,0,0,0.4);animation:fu .3s ease;white-space:nowrap;font-family:var(--fn);}
        .toast.ok{background:#1a3a28;border:1px solid var(--gn);color:var(--gn);}
        .toast.err{background:#3a1a1e;border:1px solid var(--rd);color:var(--rd);}
        @keyframes fu{from{opacity:0;transform:translateX(-50%) translateY(10px);}to{opacity:1;transform:translateX(-50%) translateY(0);}}
        header{display:flex;align-items:center;justify-content:space-between;padding-bottom:16px;border-bottom:1px solid var(--br);margin-bottom:16px;flex-wrap:wrap;gap:10px;}
        .brand{display:flex;align-items:center;gap:10px;}
        .logo{width:38px;height:38px;background:linear-gradient(135deg,var(--go),#8b6220);border-radius:9px;display:flex;align-items:center;justify-content:center;font-size:18px;flex-shrink:0;}
        .brand h1{font-size:15px;font-weight:600;color:#fff;}
        .brand p{font-size:10px;color:var(--mu);font-family:var(--mo);}
        .hdr{display:flex;align-items:center;gap:8px;flex-wrap:wrap;}
        .chip{display:flex;align-items:center;gap:6px;padding:5px 10px;background:var(--sf);border:1px solid var(--br);border-radius:16px;}
        .av{width:22px;height:22px;border-radius:50%;background:var(--go);display:flex;align-items:center;justify-content:center;font-size:11px;overflow:hidden;}
        .av img{width:100%;height:100%;object-fit:cover;}
        .uname{font-size:11px;color:var(--t2);}
        .plan-chip{padding:4px 10px;border-radius:12px;font-size:10px;font-family:var(--mo);font-weight:600;cursor:pointer;transition:all .15s;}
        .plan-chip:hover{filter:brightness(1.2);}
        .bso{background:transparent;border:1px solid var(--br);color:var(--mu);padding:5px 10px;border-radius:7px;cursor:pointer;font-family:var(--fn);font-size:11px;transition:all .15s;}
        .bso:hover{color:var(--rd);border-color:var(--rd);}
        /* Deal meter */
        .deal-bar{background:var(--sf);border:1px solid var(--br);border-radius:10px;padding:10px 14px;margin-bottom:14px;display:flex;align-items:center;gap:12px;flex-wrap:wrap;}
        .deal-info{flex:1;min-width:180px;}
        .deal-label{font-size:10px;color:var(--mu);font-family:var(--mo);margin-bottom:4px;}
        .deal-track{height:4px;background:var(--br2);border-radius:3px;overflow:hidden;}
        .deal-fill{height:100%;border-radius:3px;transition:width .4s ease;}
        .deal-count{font-size:12px;font-family:var(--mo);color:var(--tx);white-space:nowrap;}
        .deal-upgrade{background:linear-gradient(135deg,var(--go),#b8892a);color:#000;border:none;padding:6px 14px;border-radius:7px;cursor:pointer;font-family:var(--fn);font-size:11px;font-weight:600;transition:all .15s;flex-shrink:0;}
        .deal-upgrade:hover{filter:brightness(1.1);}
        .limit-warn{background:rgba(255,71,87,0.08);border:1px solid rgba(255,71,87,0.2);border-radius:10px;padding:10px 14px;margin-bottom:14px;font-size:12px;color:var(--rd);display:flex;align-items:center;justify-content:space-between;gap:8px;}
        /* Toolbar */
        .tb{display:flex;gap:8px;align-items:center;margin-bottom:14px;flex-wrap:wrap;}
        .pni{flex:1;min-width:150px;background:var(--sf);border:1px solid var(--br2);border-radius:8px;color:var(--tx);font-family:var(--fn);font-size:13px;padding:8px 12px;outline:none;}
        .pni:focus{border-color:var(--gd);}.pni::placeholder{color:var(--mu);}
        .btn{padding:8px 14px;border-radius:8px;border:none;cursor:pointer;font-family:var(--fn);font-size:12px;font-weight:500;transition:all .15s;white-space:nowrap;}
        .b-gold{background:linear-gradient(135deg,var(--go),#b8892a);color:#000;}
        .b-gold:hover{filter:brightness(1.1);}
        .b-out{background:transparent;border:1px solid var(--br2);color:var(--t2);}
        .b-out:hover{border-color:var(--gd);color:var(--tx);}
        .b-gh{background:transparent;border:1px solid var(--br);color:var(--mu);}
        .b-gh:hover{color:var(--t2);}
        .b-pdf{background:rgba(255,71,87,0.1);border:1px solid rgba(255,71,87,0.2);color:#ff6b81;}
        .b-pdf:hover{background:rgba(255,71,87,0.18);}
        .b-pdf.locked{opacity:.5;cursor:not-allowed;}
        .btn:disabled{opacity:.5;cursor:not-allowed;}
        .cnt{font-size:10px;font-family:var(--mo);color:var(--mu);padding:4px 7px;background:var(--sf);border:1px solid var(--br);border-radius:5px;}
        /* Projects list */
        .pl{background:var(--sf);border:1px solid var(--br);border-radius:13px;margin-bottom:14px;overflow:hidden;}
        .plh{padding:10px 14px;background:var(--sf2);border-bottom:1px solid var(--br);display:flex;align-items:center;justify-content:space-between;}
        .plh h3{font-size:11px;font-weight:600;color:var(--t2);text-transform:uppercase;letter-spacing:.08em;}
        .pll{max-height:200px;overflow-y:auto;}
        .pi{display:flex;align-items:center;gap:10px;padding:10px 14px;border-bottom:1px solid var(--br);cursor:pointer;transition:background .15s;}
        .pi:hover{background:rgba(255,255,255,.03);}
        .pi:last-child{border-bottom:none;}
        .pin-name{font-size:13px;color:var(--tx);flex:1;}
        .pin-meta{font-size:10px;font-family:var(--mo);color:var(--mu);}
        .tag{font-size:9px;padding:2px 6px;border-radius:8px;}
        .tag-go{background:rgba(212,168,67,.1);color:var(--go);border:1px solid rgba(212,168,67,.2);}
        .tag-gn{background:rgba(46,213,115,.1);color:var(--gn);border:1px solid rgba(46,213,115,.2);}
        .tag-bl{background:rgba(30,144,255,.1);color:#5aacff;border:1px solid rgba(30,144,255,.2);}
        .bdel{background:transparent;border:none;cursor:pointer;color:var(--mu);font-size:12px;padding:4px;border-radius:4px;transition:color .15s;}
        .bdel:hover{color:var(--rd);}
        .ep{padding:24px;text-align:center;color:var(--mu);font-size:12px;}
        /* Type toggle */
        .tt{display:grid;grid-template-columns:1fr 1fr;background:var(--sf);border:1px solid var(--br);border-radius:9px;overflow:hidden;margin-bottom:14px;}
        .tb2{padding:10px 16px;border:none;background:transparent;color:var(--t2);cursor:pointer;font-family:var(--fn);font-size:12px;font-weight:500;transition:all .2s;text-align:center;}
        .tb2.on{background:linear-gradient(135deg,rgba(212,168,67,.15),rgba(212,168,67,.05));color:var(--go);border-bottom:2px solid var(--go);}
        .tb2 small{font-size:9px;font-family:var(--mo);opacity:.7;display:block;margin-top:1px;}
        /* Tabs */
        .tabs{display:flex;gap:3px;margin-bottom:14px;background:var(--sf);border:1px solid var(--br);border-radius:9px;padding:4px;}
        .tab{flex:1;padding:7px;border:none;background:transparent;color:var(--mu);cursor:pointer;font-family:var(--fn);font-size:12px;font-weight:500;border-radius:6px;transition:all .2s;text-align:center;}
        .tab.on{background:var(--sf2);color:var(--tx);border:1px solid var(--br);}
        /* Grid & Sections */
        .grid{display:grid;grid-template-columns:1fr 1fr;gap:14px;}
        @media(max-width:768px){.grid{grid-template-columns:1fr;}}
        .sec{background:var(--sf);border:1px solid var(--br);border-radius:13px;overflow:hidden;margin-bottom:14px;}
        .sh{padding:9px 13px;background:var(--sf2);border-bottom:1px solid var(--br);display:flex;align-items:center;gap:7px;}
        .sh h2{font-size:10px;font-weight:600;color:var(--t2);text-transform:uppercase;letter-spacing:.08em;}
        .dot{width:5px;height:5px;border-radius:50%;background:var(--go);flex-shrink:0;}
        .sb{padding:13px;}
        .flds{display:flex;flex-direction:column;gap:9px;}
        .field label{display:block;font-size:10px;color:var(--t2);margin-bottom:3px;font-weight:500;}
        .field .sub{font-family:var(--mo);font-size:9px;color:var(--mu);}
        .field input,.field textarea{width:100%;background:var(--bg);border:1px solid var(--br2);border-radius:7px;color:var(--tx);font-family:var(--mo);font-size:13px;padding:7px 10px;outline:none;transition:border-color .2s;}
        .field input:focus,.field textarea:focus{border-color:var(--gd);}
        .field input::placeholder{color:var(--mu);}
        .iu{position:relative;}
        .iu input{padding-right:52px;}
        .ub{position:absolute;right:7px;top:50%;transform:translateY(-50%);font-size:9px;font-family:var(--mo);color:var(--mu);background:var(--sf2);padding:2px 5px;border-radius:3px;pointer-events:none;}
        /* Calc rows */
        .cg{margin-bottom:7px;}
        .cgl{font-size:9px;font-family:var(--mo);color:var(--mu);text-transform:uppercase;letter-spacing:.1em;margin-bottom:4px;}
        .cr{display:flex;align-items:center;justify-content:space-between;padding:5px 8px;border-radius:5px;gap:8px;margin-bottom:2px;}
        .cr:hover{background:rgba(255,255,255,.02);}
        .cr.hi{background:rgba(212,168,67,.07);border:1px solid rgba(212,168,67,.15);}
        .cr.ac{background:rgba(30,144,255,.07);border:1px solid rgba(30,144,255,.12);}
        .rl{font-size:11px;color:var(--t2);flex:1;}
        .rv{font-size:11px;font-family:var(--mo);color:var(--tx);font-weight:500;white-space:nowrap;}
        .cr.hi .rv{color:var(--go);}.cr.ac .rv{color:#5aacff;}
        .dv{border:none;border-top:1px solid var(--br);margin:7px 0;}
        .bns{display:grid;grid-template-columns:1fr 1fr;gap:7px;margin-top:7px;}
        .bn{background:var(--bg);border:1px solid var(--br);border-radius:8px;padding:9px 11px;}
        .bnl{font-size:9px;color:var(--mu);font-family:var(--mo);text-transform:uppercase;margin-bottom:3px;}
        .bnv{font-size:14px;font-family:var(--mo);font-weight:600;color:var(--tx);}
        .bn.p .bnv{color:var(--go);}.bn.m .bnv{color:#5aacff;}
        /* Decision */
        .dec{border-radius:11px;padding:14px;display:flex;align-items:center;gap:12px;flex-wrap:wrap;transition:all .4s;}
        .dec.go{background:linear-gradient(135deg,rgba(46,213,115,.12),rgba(46,213,115,.04));border:1px solid rgba(46,213,115,.3);}
        .dec.stop{background:linear-gradient(135deg,rgba(255,71,87,.12),rgba(255,71,87,.04));border:1px solid rgba(255,71,87,.3);}
        .dec.pend{background:var(--sf);border:1px dashed var(--br2);}
        .di{font-size:28px;flex-shrink:0;}
        .dm{flex:1;min-width:110px;}
        .dv2{font-size:20px;font-weight:700;letter-spacing:.05em;line-height:1;}
        .dec.go .dv2{color:var(--gn);}.dec.stop .dv2{color:var(--rd);}.dec.pend .dv2{color:var(--mu);font-size:13px;}
        .ds{font-size:11px;color:var(--t2);margin-top:3px;}
        .dg{text-align:right;min-width:110px;}
        .dgl{font-size:10px;color:var(--t2);margin-bottom:2px;}
        .dgv{font-size:16px;font-family:var(--mo);font-weight:600;}
        .dec.go .dgv{color:var(--gn);}.dec.stop .dgv{color:var(--rd);}
        .dgp{font-size:10px;font-family:var(--mo);opacity:.7;margin-top:1px;}
        /* Compare bar */
        .cb{margin-top:10px;}
        .cbl{display:flex;justify-content:space-between;font-size:9px;font-family:var(--mo);color:var(--mu);margin-bottom:4px;}
        .cbt{height:5px;background:var(--br2);border-radius:3px;overflow:hidden;}
        .cbf{height:100%;border-radius:3px;transition:width .5s ease;}
        .ph{text-align:center;padding:36px 20px;color:var(--mu);}
        .ph-i{font-size:28px;margin-bottom:8px;}.ph p{font-size:12px;}
        /* Map */
        .map-wrap{border-radius:10px;overflow:hidden;border:1px solid var(--br);margin-bottom:14px;}
        .map-info{padding:10px 13px;background:var(--sf);border:1px solid var(--br);border-radius:10px;font-size:12px;color:var(--t2);margin-bottom:10px;}
        .map-info strong{color:var(--go);font-family:var(--mo);}
        ::-webkit-scrollbar{width:4px;}::-webkit-scrollbar-track{background:var(--bg);}::-webkit-scrollbar-thumb{background:var(--br2);border-radius:3px;}
      `}</style>

      {toast && <div className={`toast ${toast.t}`}>{toast.m}</div>}
      {showPricing && <Pricing currentPlan={sub.plan} user={user} onClose={() => setShowPricing(false)} onSuccess={() => { fetchSub(); msg("อัปเกรด Plan สำเร็จแล้วครับ 🎉"); }} />}

      <div className="app">
        <header>
          <div className="brand">
            <div className="logo">🏗️</div>
            <div>
              <h1>Land Investment Analyzer</h1>
              <p>ระบบวิเคราะห์การลงทุนที่ดิน</p>
            </div>
          </div>
          <div className="hdr">
            <div className="chip">
              <div className="av">{user.user_metadata?.avatar_url ? <img src={user.user_metadata.avatar_url} alt="" /> : "👤"}</div>
              <span className="uname">{user.user_metadata?.full_name?.split(" ")[0] || user.email}</span>
            </div>
            <button className="plan-chip" onClick={() => setShowPricing(true)}
              style={{ background: planInfo.color + "22", color: planInfo.color, border: `1px solid ${planInfo.color}44` }}>
              {planInfo.name} Plan ▴
            </button>
            <button className="bso" onClick={signOut}>ออกจากระบบ</button>
          </div>
        </header>

        {/* Deal meter */}
        <div className="deal-bar">
          <div className="deal-info">
            <div className="deal-label">โปรเจกต์ที่ใช้ไป · {planInfo.name} Plan</div>
            <div className="deal-track">
              <div className="deal-fill" style={{
                width: isUnlimited ? "30%" : `${Math.min(100, (sub.deals_used / sub.deals_limit) * 100)}%`,
                background: isUnlimited ? "#2ed573" : sub.deals_used >= sub.deals_limit ? "#ff4757" : "#d4a843"
              }} />
            </div>
          </div>
          <span className="deal-count">{isUnlimited ? "∞ ไม่จำกัด" : `${sub.deals_used} / ${sub.deals_limit} ดีล`}</span>
          {!isUnlimited && <button className="deal-upgrade" onClick={() => setShowPricing(true)}>⚡ อัปเกรด</button>}
        </div>

        {!canSave && <div className="limit-warn">⛔ ใช้ครบลิมิตแล้ว ไม่สามารถบันทึกโปรเจกต์ใหม่ได้ <button className="deal-upgrade" onClick={() => setShowPricing(true)}>อัปเกรด Plan</button></div>}

        {/* Toolbar */}
        <div className="tb">
          <button className="btn b-gh" onClick={newP}>＋ ใหม่</button>
          <input className="pni" placeholder="ชื่อโปรเจกต์..." value={pname} onChange={(e) => setPname(e.target.value)} />
          <button className="btn b-gold" onClick={save} disabled={saving || (!canSave && !pid)}>{saving ? "⏳..." : "💾 บันทึก"}</button>
          <button className="btn b-out" onClick={() => { setShowList(!showList); if (!showList) fetchProjects(); }}>📂 ทั้งหมด</button>
          <button className={`btn b-pdf ${!canExportPDF ? "locked" : ""}`} onClick={canExportPDF ? exportPDF : () => setShowPricing(true)}>
            {canExportPDF ? (sub.plan === "free" ? `📄 PDF (ฟรี ${1 - pdfUsed}/1)` : "📄 Export PDF") : "🔒 PDF (หมดสิทธิ์)"}
          </button>
          {projects.length > 0 && <span className="cnt">{projects.length} โปรเจกต์</span>}
        </div>

        {/* Projects List */}
        {showList && (
          <div className="pl">
            <div className="plh">
              <h3>📂 โปรเจกต์ที่บันทึกไว้</h3>
              {loading && <span style={{ fontSize: 10, color: "var(--mu)", fontFamily: "var(--mo)" }}>กำลังโหลด...</span>}
            </div>
            <div className="pll">
              {projects.length === 0 && !loading
                ? <div className="ep">ยังไม่มีโปรเจกต์ที่บันทึกไว้</div>
                : projects.map((p) => (
                  <div key={p.id} className="pi" onClick={() => load(p)}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 3 }}>
                        <span className="pin-name">{p.name}</span>
                        {p.id === pid && <span className="tag tag-gn">เปิดอยู่</span>}
                        {p.data?.pin && <span className="tag tag-bl">📍</span>}
                      </div>
                      <div style={{ display: "flex", gap: 6 }}>
                        <span className="tag tag-go">{p.land_type === "small" ? "เล็ก 10%" : "ใหญ่ 30%"}</span>
                        <span className="pin-meta">{new Date(p.created_at).toLocaleDateString("th-TH")}</span>
                      </div>
                    </div>
                    <button className="bdel" onClick={(e) => del(p.id, e)}>🗑️</button>
                  </div>
                ))}
            </div>
          </div>
        )}

        {/* Type Toggle */}
        <div className="tt">
          <button className={`tb2 ${type === "small" ? "on" : ""}`} onClick={() => setType("small")}>
            🏘️ ที่ดินขนาดเล็ก<small>ส่วนกลาง 10% · ขาย 90%</small>
          </button>
          <button className={`tb2 ${type === "large" ? "on" : ""}`} onClick={() => setType("large")}>
            🏙️ ที่ดินขนาดใหญ่<small>ส่วนกลาง 30% · ขาย 70%</small>
          </button>
        </div>

        {/* Tabs */}
        <div className="tabs">
          <button className={`tab ${tab === "calc" ? "on" : ""}`} onClick={() => setTab("calc")}>📊 คำนวณ</button>
          <button className={`tab ${tab === "map" ? "on" : ""}`} onClick={() => setTab("map")}>🗺️ Map ปักหมุด</button>
        </div>

        {/* MAP TAB */}
        {tab === "map" && (
          <>
            <div className="map-info">
              {pin ? <>📍 หมุดอยู่ที่ <strong>{pin.lat.toFixed(5)}, {pin.lng.toFixed(5)}</strong> — กดที่ Map เพื่อย้ายหมุด</>
                : <>กดที่ตำแหน่งบน Map เพื่อปักหมุดที่ดิน</>}
            </div>
            <div className="map-wrap" style={{ height: 460 }}>
              <MapContainer center={pin ? [pin.lat, pin.lng] : [13.7563, 100.5018]} zoom={pin ? 15 : 6}
                style={{ height: "100%", width: "100%" }}>
                <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution="&copy; OpenStreetMap" />
                <Clicker onPin={onPin} />
                {pin && <Marker position={[pin.lat, pin.lng]} />}
              </MapContainer>
            </div>
            {pin && <button className="btn b-gh" onClick={() => { setPin(null); msg("ลบหมุดแล้วครับ"); }}>🗑️ ลบหมุด</button>}
          </>
        )}

        {/* CALC TAB */}
        {tab === "calc" && (
          <div className="grid">
            <div>
              <div className="sec">
                <div className="sh"><div className="dot" /><h2>ข้อมูลที่ดิน</h2></div>
                <div className="sb"><div className="flds">
                  <F label="ราคาที่ดิน" sub="บาท"><div className="iu"><NI value={form.landPrice} onChange={s("landPrice")} placeholder="2,450,000" /><span className="ub">บาท</span></div></F>
                  <F label="ขนาดที่ดิน" sub="ตร.ว."><div className="iu"><NI value={form.landSize} onChange={s("landSize")} placeholder="252" /><span className="ub">ตร.ว.</span></div></F>
                  <F label="ค่าพัฒนาส่วนกลาง" sub="บาท/ตร.ม."><div className="iu"><NI value={form.devCost} onChange={s("devCost")} placeholder="2000" /><span className="ub">฿/ตร.ม.</span></div></F>
                </div></div>
              </div>
              <div className="sec">
                <div className="sh"><div className="dot" style={{ background: "#5aacff" }} /><h2>ข้อมูลบ้าน</h2></div>
                <div className="sb"><div className="flds">
                  <F label="จำนวนแปลง"><div className="iu"><NI value={form.plots} onChange={s("plots")} placeholder="5" /><span className="ub">แปลง</span></div></F>
                  <F label="พื้นที่ใช้สอยต่อหลัง"><div className="iu"><NI value={form.area} onChange={s("area")} placeholder="120" /><span className="ub">ตร.ม.</span></div></F>
                  <F label="ค่าก่อสร้าง"><div className="iu"><NI value={form.buildCost} onChange={s("buildCost")} placeholder="10000" /><span className="ub">฿/ตร.ม.</span></div></F>
                </div></div>
              </div>
              <div className="sec">
                <div className="sh"><div className="dot" style={{ background: "#2ed573" }} /><h2>ราคาตลาด & เป้าหมาย</h2></div>
                <div className="sb"><div className="flds">
                  <F label="ราคาตลาด (ต่อหลัง)"><div className="iu"><NI value={form.market} onChange={s("market")} placeholder="3,190,000" /><span className="ub">บาท</span></div></F>
                  <F label="เป้าหมายกำไร"><div className="iu"><NI value={form.profit} onChange={s("profit")} placeholder="20" /><span className="ub">%</span></div></F>
                  <F label="หมายเหตุ"><textarea rows={2} value={form.note} onChange={(e) => s("note")(e.target.value)} placeholder="เช่น ยังไม่รวมถมดิน, ค่ารั้ว..." style={{ resize: "vertical" }} /></F>
                </div></div>
              </div>
            </div>

            <div>
              {!hasResult ? (
                <div className="sec">
                  <div className="sh"><div className="dot" style={{ background: "var(--mu)" }} /><h2>ผลการวิเคราะห์</h2></div>
                  <div className="sb"><div className="ph"><div className="ph-i">📊</div><p>กรอกข้อมูลราคาที่ดิน<br />และขนาดที่ดินเพื่อเริ่มวิเคราะห์</p></div></div>
                </div>
              ) : (
                <>
                  <div className="sec">
                    <div className="sh"><div className="dot" /><h2>การคำนวณต้นทุน</h2></div>
                    <div className="sb">
                      <div className="cg"><div className="cgl">📐 พื้นที่</div>
                        <Row label="พื้นที่ขาย" value={`${fmt(c.sa)} ตร.ว.`} />
                        <Row label="ส่วนกลาง (ตร.ม.)" value={`${fmt(c.caSqm)} ตร.ม.`} />
                      </div>
                      <hr className="dv" />
                      <div className="cg"><div className="cgl">🏗️ ค่าพัฒนา</div>
                        <Row label="ค่าพัฒนาส่วนกลางรวม" value={`${fmt(c.tdc)} ฿`} />
                        <Row label="รวมที่ดิน + ค่าพัฒนา" value={`${fmt(c.tlp)} ฿`} hi />
                        <Row label="ราคา / ตร.ว." value={`${fmt(c.ppw)} ฿`} />
                      </div>
                      {Number(form.plots) > 0 && (<>
                        <hr className="dv" />
                        <div className="cg"><div className="cgl">🏠 ต้นทุนต่อแปลง</div>
                          <Row label="ขนาดที่ดินต่อแปลง" value={`${fmt(c.lpp)} ตร.ว.`} />
                          <Row label="ต้นทุนที่ดินต่อแปลง" value={`${fmt(c.lcp)} ฿`} />
                          <Row label="ค่าก่อสร้างต่อหลัง" value={`${fmt(c.bph)} ฿`} />
                          <Row label="ที่ดิน + ก่อสร้าง" value={`${fmt(c.sub)} ฿`} ac />
                        </div>
                        <hr className="dv" />
                        <div className="cg"><div className="cgl">💰 ราคาขาย</div>
                          <Row label="ค่าดำเนินการ 15%" value={`${fmt(c.op)} ฿`} />
                          <Row label={`กำไร ${form.profit}%`} value={`${fmt(c.pft)} ฿`} />
                          <Row label="ประมาณการราคาขาย" value={`${fmt(c.esp)} ฿`} hi />
                        </div>
                      </>)}
                    </div>
                  </div>

                  {Number(form.plots) > 0 && (
                    <div className="sec">
                      <div className="sh"><div className="dot" style={{ background: "#2ed573" }} /><h2>สรุปราคา</h2></div>
                      <div className="sb">
                        <div className="bns">
                          <div className="bn p"><div className="bnl">ประมาณการขาย</div><div className="bnv">{fmt(c.esp)}</div></div>
                          {Number(form.market) > 0 && <div className="bn m"><div className="bnl">ราคาตลาด</div><div className="bnv">{fmt(Number(form.market))}</div></div>}
                          <div className="bn"><div className="bnl">ต้นทุนรวม</div><div className="bnv">{fmt(c.tot)}</div></div>
                          <div className="bn"><div className="bnl">กำไรต่อหลัง</div><div className="bnv">{fmt(c.pft)}</div></div>
                        </div>
                        {Number(form.market) > 0 && (
                          <div className="cb">
                            <div className="cbl"><span>ต้นทุน+กำไร</span><span>ราคาตลาด</span></div>
                            <div className="cbt"><div className="cbf" style={{ width: `${Math.min(100, (c.esp / Number(form.market)) * 100)}%`, background: c.isGo ? "linear-gradient(90deg,#2ed573,#7bed9f)" : "linear-gradient(90deg,#ff4757,#ff6b81)" }} /></div>
                            <div style={{ textAlign: "right", marginTop: 3 }}><span style={{ fontSize: 9, fontFamily: "var(--mo)", color: "var(--mu)" }}>{((c.esp / Number(form.market)) * 100).toFixed(1)}% ของราคาตลาด</span></div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {Number(form.plots) > 0 && Number(form.market) > 0 && (
                    <div className={`dec ${c.isGo ? "go" : "stop"}`}>
                      <div className="di">{c.isGo ? "✅" : "🛑"}</div>
                      <div className="dm">
                        <div className="dv2">{c.isGo ? "GO" : "STOP"}</div>
                        <div className="ds">{c.isGo ? "ราคาตลาดสูงกว่าต้นทุน — คุ้มค่าลงทุน" : "ราคาตลาดต่ำกว่าต้นทุน — ควรทบทวน"}</div>
                        {pin && <div style={{ fontSize: 10, color: "#5aacff", marginTop: 4 }}>📍 ปักหมุดแล้ว</div>}
                      </div>
                      <div className="dg">
                        <div className="dgl">ส่วนต่าง</div>
                        <div className="dgv">{c.gap >= 0 ? "+" : ""}{fmt(c.gap)}</div>
                        <div className="dgp">({c.gapPct >= 0 ? "+" : ""}{c.gapPct.toFixed(1)}%)</div>
                      </div>
                    </div>
                  )}

                  {Number(form.plots) > 0 && !Number(form.market) && (
                    <div className="dec pend">
                      <div className="di">⏳</div>
                      <div className="dm"><div className="dv2">รอราคาตลาด</div><div className="ds">กรอกราคาตลาดเพื่อดูผล Go / Stop</div></div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
