import { useState } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(import.meta.env.VITE_SUPABASE_URL, import.meta.env.VITE_SUPABASE_ANON_KEY);

const PLANS = [
  { id: "free", name: "Free", price: 0, deals: 1, label: "ฟรีตลอด", color: "#4a6072", features: ["1 โปรเจกต์", "คำนวณต้นทุน", "ปักหมุด Map", "Export PDF 1 ครั้ง"] },
  { id: "prepaid5", name: "Prepaid 5", price: 990, deals: 5, label: "990 ฿/เดือน", color: "#d4a843", features: ["5 โปรเจกต์/เดือน", "Export PDF ไม่จำกัด", "ปักหมุด Map", "บันทึก Cloud"] },
  { id: "prepaid20", name: "Prepaid 20", price: 2900, deals: 20, label: "2,900 ฿/เดือน", color: "#1e90ff", features: ["20 โปรเจกต์/เดือน", "Export PDF ไม่จำกัด", "ปักหมุด Map", "บันทึก Cloud", "Priority Support"] },
  { id: "unlimited", name: "Unlimited", price: 1990, deals: 999, label: "1,990 ฿/เดือน", color: "#2ed573", features: ["ไม่จำกัดโปรเจกต์", "Export PDF ไม่จำกัด", "ปักหมุด Map", "บันทึก Cloud", "Priority Support", "Early Access"] },
];

export { PLANS };

function PaymentModal({ plan, user, onSuccess, onClose }) {
  const [step, setStep] = useState("card"); // card | processing | done | error
  const [card, setCard] = useState({ number: "", name: "", expiry: "", cvv: "" });
  const [errMsg, setErrMsg] = useState("");

  const formatCardNumber = (v) => v.replace(/\D/g, "").slice(0, 16).replace(/(.{4})/g, "$1 ").trim();
  const formatExpiry = (v) => { const d = v.replace(/\D/g, "").slice(0, 4); return d.length > 2 ? d.slice(0, 2) + "/" + d.slice(2) : d; };

  const handlePay = async () => {
    const num = card.number.replace(/\s/g, "");
    const [mm, yy] = card.expiry.split("/");
    if (num.length < 16 || !card.name || !mm || !yy || card.cvv.length < 3) {
      return setErrMsg("กรอกข้อมูลบัตรให้ครบก่อนครับ");
    }
    setStep("processing");
    setErrMsg("");
    try {
      // Create Omise token
      const tokenRes = await new Promise((resolve, reject) => {
        window.Omise.createToken("card", {
          number: num,
          name: card.name,
          expiration_month: mm,
          expiration_year: "20" + yy,
          security_code: card.cvv,
        }, (statusCode, response) => {
          if (response.object === "error") reject(new Error(response.message));
          else resolve(response);
        });
      });

      // Call Edge Function
      const { data, error } = await supabase.functions.invoke("create-payment", {
        body: { planId: plan.id, token: tokenRes.id, userId: user.id },
      });

      if (error || data?.error) throw new Error(data?.error || error.message);
      setStep("done");
      setTimeout(() => { onSuccess(); onClose(); }, 2000);
    } catch (e) {
      setErrMsg(e.message || "เกิดข้อผิดพลาด กรุณาลองใหม่");
      setStep("card");
    }
  };

  return (
    <>
      <style>{`
        .pm-overlay{position:fixed;inset:0;background:rgba(0,0,0,0.8);z-index:2000;display:flex;align-items:center;justify-content:center;padding:20px;backdrop-filter:blur(6px);}
        .pm-modal{background:#111820;border:1px solid #1e2d3d;border-radius:18px;width:100%;max-width:420px;padding:28px;}
        .pm-title{font-size:18px;font-weight:700;color:#fff;margin-bottom:4px;}
        .pm-sub{font-size:12px;color:#4a6072;font-family:'IBM Plex Mono',monospace;margin-bottom:24px;}
        .pm-plan-badge{display:inline-flex;align-items:center;gap:6px;padding:6px 14px;border-radius:20px;font-size:13px;font-weight:600;margin-bottom:20px;}
        .pm-field{margin-bottom:14px;}
        .pm-field label{display:block;font-size:10px;color:#8aa0b0;margin-bottom:5px;text-transform:uppercase;letter-spacing:.06em;}
        .pm-field input{width:100%;background:#0a0e14;border:1px solid #243040;border-radius:8px;color:#c8d8e8;font-family:'IBM Plex Mono',monospace;font-size:14px;padding:10px 12px;outline:none;transition:border-color .2s;}
        .pm-field input:focus{border-color:#9a7730;}
        .pm-row{display:grid;grid-template-columns:1fr 1fr;gap:10px;}
        .pm-btn{width:100%;padding:13px;border-radius:10px;border:none;cursor:pointer;font-family:'Anuphan',sans-serif;font-size:15px;font-weight:700;margin-top:6px;transition:all .2s;}
        .pm-cancel{background:transparent;border:1px solid #1e2d3d;color:#4a6072;margin-top:10px;padding:9px;}
        .pm-cancel:hover{color:#c8d8e8;border-color:#243040;}
        .pm-err{background:rgba(255,71,87,.1);border:1px solid rgba(255,71,87,.3);color:#ff4757;padding:8px 12px;border-radius:8px;font-size:12px;margin-bottom:12px;}
        .pm-secure{display:flex;align-items:center;justify-content:center;gap:6px;font-size:11px;color:#4a6072;margin-top:14px;}
        .pm-processing{text-align:center;padding:40px 20px;}
        .pm-spinner{width:40px;height:40px;border:3px solid #1e2d3d;border-top-color:#d4a843;border-radius:50%;animation:spin 0.8s linear infinite;margin:0 auto 16px;}
        @keyframes spin{to{transform:rotate(360deg);}}
        .pm-done{text-align:center;padding:40px 20px;}
        .pm-done-icon{font-size:48px;margin-bottom:12px;}
        .pm-done h3{font-size:20px;font-weight:700;color:#2ed573;margin-bottom:6px;}
        .pm-done p{font-size:13px;color:#8aa0b0;}
      `}</style>
      {/* Load Omise.js */}
      {!window.Omise && (() => { const s = document.createElement("script"); s.src = "https://cdn.omise.co/omise.js"; s.onload = () => window.Omise.setPublicKey(import.meta.env.VITE_OMISE_PUBLIC_KEY); document.head.appendChild(s); })()}

      <div className="pm-overlay" onClick={(e) => e.target.className === "pm-overlay" && onClose()}>
        <div className="pm-modal">
          {step === "processing" && (
            <div className="pm-processing">
              <div className="pm-spinner" />
              <p style={{ color: "#8aa0b0", fontSize: 13 }}>กำลังดำเนินการชำระเงิน...</p>
            </div>
          )}
          {step === "done" && (
            <div className="pm-done">
              <div className="pm-done-icon">🎉</div>
              <h3>ชำระเงินสำเร็จ!</h3>
              <p>อัปเกรดเป็น {plan.name} Plan แล้วครับ</p>
            </div>
          )}
          {step === "card" && (
            <>
              <div className="pm-title">ชำระเงิน</div>
              <div className="pm-sub">กรอกข้อมูลบัตรเครดิต/เดบิต</div>
              <div className="pm-plan-badge" style={{ background: plan.color + "22", color: plan.color, border: `1px solid ${plan.color}44` }}>
                {plan.name} · {plan.label}
              </div>
              {errMsg && <div className="pm-err">⚠️ {errMsg}</div>}
              <div className="pm-field">
                <label>หมายเลขบัตร</label>
                <input value={card.number} onChange={(e) => setCard({ ...card, number: formatCardNumber(e.target.value) })} placeholder="0000 0000 0000 0000" maxLength={19} />
              </div>
              <div className="pm-field">
                <label>ชื่อบนบัตร</label>
                <input value={card.name} onChange={(e) => setCard({ ...card, name: e.target.value.toUpperCase() })} placeholder="FIRSTNAME LASTNAME" />
              </div>
              <div className="pm-row">
                <div className="pm-field">
                  <label>วันหมดอายุ</label>
                  <input value={card.expiry} onChange={(e) => setCard({ ...card, expiry: formatExpiry(e.target.value) })} placeholder="MM/YY" maxLength={5} />
                </div>
                <div className="pm-field">
                  <label>CVV</label>
                  <input value={card.cvv} onChange={(e) => setCard({ ...card, cvv: e.target.value.replace(/\D/g, "").slice(0, 4) })} placeholder="123" maxLength={4} type="password" />
                </div>
              </div>
              <button className="pm-btn" style={{ background: `linear-gradient(135deg,${plan.color},${plan.color}99)`, color: "#000" }} onClick={handlePay}>
                💳 ชำระ {plan.label}
              </button>
              <button className="pm-btn pm-cancel" onClick={onClose}>ยกเลิก</button>
              <div className="pm-secure">🔒 ปลอดภัยด้วย Omise · PCI DSS Compliant</div>
            </>
          )}
        </div>
      </div>
    </>
  );
}

export default function Pricing({ currentPlan, user, onClose, onSuccess }) {
  const [selectedPlan, setSelectedPlan] = useState(null);

  return (
    <>
      <style>{`
        .pr-overlay{position:fixed;inset:0;background:rgba(0,0,0,0.75);z-index:1000;display:flex;align-items:center;justify-content:center;padding:20px;backdrop-filter:blur(4px);}
        .pr-modal{background:#111820;border:1px solid #1e2d3d;border-radius:20px;width:100%;max-width:920px;max-height:90vh;overflow-y:auto;padding:32px;}
        .pr-header{text-align:center;margin-bottom:28px;}
        .pr-header h2{font-size:22px;font-weight:700;color:#fff;margin-bottom:6px;}
        .pr-header p{font-size:12px;color:#4a6072;font-family:'IBM Plex Mono',monospace;}
        .pr-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(195px,1fr));gap:14px;}
        .pr-card{background:#0a0e14;border:1px solid #1e2d3d;border-radius:13px;padding:20px;position:relative;transition:all .2s;}
        .pr-card:hover{transform:translateY(-2px);box-shadow:0 8px 30px rgba(0,0,0,0.4);}
        .pr-card.cur{border-width:2px;}
        .pr-badge{position:absolute;top:-10px;left:50%;transform:translateX(-50%);font-size:9px;padding:3px 10px;border-radius:10px;font-family:'IBM Plex Mono',monospace;white-space:nowrap;}
        .pr-name{font-size:15px;font-weight:700;margin-bottom:3px;margin-top:8px;}
        .pr-price{font-size:18px;font-weight:700;margin-bottom:14px;font-family:'IBM Plex Mono',monospace;}
        .pr-feats{list-style:none;display:flex;flex-direction:column;gap:6px;margin-bottom:18px;}
        .pr-feats li{font-size:11px;color:#8aa0b0;display:flex;align-items:center;gap:6px;}
        .pr-feats li::before{content:'✓';color:#2ed573;font-size:10px;flex-shrink:0;}
        .pr-btn{width:100%;padding:9px;border-radius:8px;border:none;cursor:pointer;font-family:'Anuphan',sans-serif;font-size:12px;font-weight:600;transition:all .15s;}
        .pr-close{display:block;margin:20px auto 0;background:transparent;border:1px solid #1e2d3d;color:#4a6072;padding:7px 24px;border-radius:8px;cursor:pointer;font-family:'Anuphan',sans-serif;font-size:12px;}
        .pr-close:hover{color:#c8d8e8;border-color:#243040;}
      `}</style>
      {selectedPlan && (
        <PaymentModal plan={selectedPlan} user={user} onClose={() => setSelectedPlan(null)}
          onSuccess={() => { setSelectedPlan(null); onSuccess && onSuccess(); onClose(); }} />
      )}
      <div className="pr-overlay" onClick={(e) => e.target.className === "pr-overlay" && onClose()}>
        <div className="pr-modal">
          <div className="pr-header">
            <h2>🏗️ เลือก Plan ที่เหมาะกับคุณ</h2>
            <p>ใช้ฟรี 1 โปรเจกต์ · อัปเกรดเพื่อปลดล็อคเพิ่มเติม</p>
          </div>
          <div className="pr-grid">
            {PLANS.map((plan) => (
              <div key={plan.id} className={`pr-card ${currentPlan === plan.id ? "cur" : ""}`}
                style={{ borderColor: currentPlan === plan.id ? plan.color : undefined }}>
                {currentPlan === plan.id && (
                  <div className="pr-badge" style={{ background: plan.color + "22", color: plan.color, border: `1px solid ${plan.color}44` }}>Plan ปัจจุบัน</div>
                )}
                {plan.id === "unlimited" && currentPlan !== "unlimited" && (
                  <div className="pr-badge" style={{ background: "rgba(46,213,115,0.15)", color: "#2ed573", border: "1px solid rgba(46,213,115,0.3)" }}>⭐ ยอดนิยม</div>
                )}
                <div className="pr-name" style={{ color: plan.color }}>{plan.name}</div>
                <div className="pr-price" style={{ color: plan.color }}>{plan.label}</div>
                <ul className="pr-feats">{plan.features.map((f, i) => <li key={i}>{f}</li>)}</ul>
                {currentPlan === plan.id ? (
                  <button className="pr-btn" style={{ background: plan.color + "22", color: plan.color, border: `1px solid ${plan.color}44` }} disabled>✓ ใช้งานอยู่</button>
                ) : plan.id === "free" ? (
                  <button className="pr-btn" style={{ background: "#1e2d3d", color: "#4a6072" }} disabled>Free</button>
                ) : (
                  <button className="pr-btn" style={{ background: plan.color, color: "#000" }} onClick={() => setSelectedPlan(plan)}>
                    อัปเกรด →
                  </button>
                )}
              </div>
            ))}
          </div>
          <button className="pr-close" onClick={onClose}>ปิด</button>
        </div>
      </div>
    </>
  );
}
