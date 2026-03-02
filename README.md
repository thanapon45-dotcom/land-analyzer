# 🏗️ Land Investment Analyzer

ระบบวิเคราะห์การลงทุนที่ดินและบ้านเดี่ยว — คำนวณต้นทุน ประมาณราคาขาย และสรุป Go/Stop

---

## 🚀 วิธีติดตั้งและรัน

### ขั้นตอนที่ 1 — ติดตั้ง Node.js
ดาวน์โหลดจาก https://nodejs.org (เลือก LTS version)

### ขั้นตอนที่ 2 — เปิด Terminal แล้วเข้า folder นี้
```bash
cd land-analyzer
```

### ขั้นตอนที่ 3 — ติดตั้ง dependencies
```bash
npm install
```

### ขั้นตอนที่ 4 — รันโปรแกรม
```bash
npm run dev
```

### ขั้นตอนที่ 5 — เปิด Browser
ไปที่ → http://localhost:5173

---

## 📁 โครงสร้างไฟล์

```
land-analyzer/
├── src/
│   ├── App.jsx         ← หน้าหลัก (แก้ไข Logic ได้ที่นี่)
│   └── main.jsx        ← Entry point (ไม่ต้องแตะ)
├── public/
│   └── favicon.svg
├── index.html
├── package.json
├── vite.config.js
└── README.md           ← ไฟล์นี้
```

---

## ⚙️ Features

- เลือกประเภทที่ดิน: เล็ก (ส่วนกลาง 10%) / ใหญ่ (ส่วนกลาง 30%)
- คำนวณ Real-time ทุก field
- Breakdown ต้นทุนทุกขั้นตอน
- เปรียบเทียบราคาขาย vs ราคาตลาด
- สรุปผล GO ✅ / STOP 🛑

---

## 🔧 คำสั่งอื่นๆ

```bash
npm run build    # Build สำหรับ Production
npm run preview  # Preview ไฟล์ที่ Build แล้ว
```

---

## 🌐 Deploy ขึ้น Internet (ฟรี)

1. สมัคร https://vercel.com
2. ลง Vercel CLI: `npm install -g vercel`
3. รัน: `vercel`
4. ได้ URL สาธารณะทันที!
"# land-analyzer" 
