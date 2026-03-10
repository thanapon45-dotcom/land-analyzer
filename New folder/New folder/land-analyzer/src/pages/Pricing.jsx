const PLANS = [
  { id: "free", name: "Free", price: 0, deals: 1, label: "ฟรีตลอด", color: "#4a6072", features: ["1 โปรเจกต์", "คำนวณต้นทุน", "ปักหมุด Map", "Export PDF 1 ครั้ง"] },
  { id: "prepaid5", name: "Prepaid 5", price: 990, deals: 5, label: "990 ฿/เดือน", color: "#d4a843", features: ["5 โปรเจกต์/เดือน", "Export PDF", "ปักหมุด Map", "บันทึก Cloud"] },
  { id: "prepaid20", name: "Prepaid 20", price: 2900, deals: 20, label: "2,900 ฿/เดือน", color: "#1e90ff", features: ["20 โปรเจกต์/เดือน", "Export PDF", "ปักหมุด Map", "บันทึก Cloud", "Priority Support"] },
  { id: "unlimited", name: "Unlimited", price: 1990, deals: 999, label: "1,990 ฿/เดือน", color: "#2ed573", features: ["ไม่จำกัดโปรเจกต์", "Export PDF", "ปักหมุด Map", "บันทึก Cloud", "Priority Support", "Early Access Features"] },
];

export { PLANS };

export default function Pricing({ currentPlan, onClose, onSelectPlan }) {
  return (
    <>
      <style>{`
        .pricing-overlay{position:fixed;inset:0;background:rgba(0,0,0,0.7);z-index:1000;display:flex;align-items:center;justify-content:center;padding:20px;backdrop-filter:blur(4px);}
        .pricing-modal{background:#111820;border:1px solid #1e2d3d;border-radius:20px;width:100%;max-width:900px;max-height:90vh;overflow-y:auto;padding:32px;}
        .pricing-header{text-align:center;margin-bottom:32px;}
        .pricing-header h2{font-size:24px;font-weight:700;color:#fff;margin-bottom:8px;}
        .pricing-header p{font-size:13px;color:#4a6072;font-family:'IBM Plex Mono',monospace;}
        .plans-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:16px;}
        .plan-card{background:#0a0e14;border:1px solid #1e2d3d;border-radius:14px;padding:20px;position:relative;transition:all .2s;cursor:pointer;}
        .plan-card:hover{transform:translateY(-2px);box-shadow:0 8px 30px rgba(0,0,0,0.4);}
        .plan-card.current{border-width:2px;}
        .plan-badge{position:absolute;top:-10px;left:50%;transform:translateX(-50%);font-size:10px;padding:3px 12px;border-radius:10px;font-family:'IBM Plex Mono',monospace;white-space:nowrap;}
        .plan-name{font-size:16px;font-weight:700;color:#fff;margin-bottom:4px;margin-top:8px;}
        .plan-price{font-size:20px;font-weight:700;margin-bottom:16px;font-family:'IBM Plex Mono',monospace;}
        .plan-features{list-style:none;display:flex;flex-direction:column;gap:7px;margin-bottom:20px;}
        .plan-features li{font-size:12px;color:#8aa0b0;display:flex;align-items:center;gap:6px;}
        .plan-features li::before{content:'✓';color:#2ed573;font-size:11px;flex-shrink:0;}
        .plan-btn{width:100%;padding:10px;border-radius:8px;border:none;cursor:pointer;font-family:'Anuphan',sans-serif;font-size:13px;font-weight:600;transition:all .15s;}
        .close-btn{display:block;margin:24px auto 0;background:transparent;border:1px solid #1e2d3d;color:#4a6072;padding:8px 24px;border-radius:8px;cursor:pointer;font-family:'Anuphan',sans-serif;font-size:13px;transition:all .15s;}
        .close-btn:hover{color:#c8d8e8;border-color:#243040;}
        .current-tag{font-size:10px;padding:2px 8px;border-radius:8px;background:rgba(46,213,115,0.1);color:#2ed573;border:1px solid rgba(46,213,115,0.2);margin-left:6px;}
        .coming-soon{font-size:10px;color:#4a6072;text-align:center;margin-top:8px;font-family:'IBM Plex Mono',monospace;}
      `}</style>
      <div className="pricing-overlay" onClick={(e) => e.target.className === "pricing-overlay" && onClose()}>
        <div className="pricing-modal">
          <div className="pricing-header">
            <h2>🏗️ เลือก Plan ที่เหมาะกับคุณ</h2>
            <p>ใช้ฟรี 1 โปรเจกต์ · อัปเกรดเพื่อปลดล็อคเพิ่มเติม</p>
          </div>
          <div className="plans-grid">
            {PLANS.map((plan) => (
              <div key={plan.id} className={`plan-card ${currentPlan === plan.id ? "current" : ""}`}
                style={{ borderColor: currentPlan === plan.id ? plan.color : undefined }}>
                {currentPlan === plan.id && (
                  <div className="plan-badge" style={{ background: plan.color + "22", color: plan.color, border: `1px solid ${plan.color}44` }}>
                    Plan ปัจจุบัน
                  </div>
                )}
                {plan.id === "unlimited" && currentPlan !== "unlimited" && (
                  <div className="plan-badge" style={{ background: "rgba(46,213,115,0.15)", color: "#2ed573", border: "1px solid rgba(46,213,115,0.3)" }}>
                    ⭐ ยอดนิยม
                  </div>
                )}
                <div className="plan-name" style={{ color: plan.color }}>{plan.name}</div>
                <div className="plan-price" style={{ color: plan.color }}>{plan.label}</div>
                <ul className="plan-features">
                  {plan.features.map((f, i) => <li key={i}>{f}</li>)}
                </ul>
                {currentPlan === plan.id ? (
                  <button className="plan-btn" style={{ background: plan.color + "22", color: plan.color, border: `1px solid ${plan.color}44` }} disabled>
                    ✓ ใช้งานอยู่
                  </button>
                ) : plan.id === "free" ? (
                  <button className="plan-btn" style={{ background: "#1e2d3d", color: "#8aa0b0" }} disabled>
                    Free
                  </button>
                ) : (
                  <>
                    <button className="plan-btn" style={{ background: plan.color, color: "#000", fontWeight: 700 }}
                      onClick={() => onSelectPlan(plan)}>
                      อัปเกรด →
                    </button>
                    <p className="coming-soon">ระบบชำระเงิน coming soon</p>
                  </>
                )}
              </div>
            ))}
          </div>
          <button className="close-btn" onClick={onClose}>ปิด</button>
        </div>
      </div>
    </>
  );
}
