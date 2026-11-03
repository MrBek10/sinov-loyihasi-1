# Mening Inspektorim - Mahalla Profilaktika Tizimi (Ultra-Clean Telegram Mini App & Backend)

Fuqarolar va hududiy profilaktika inspektorlari o'rtasida to'g'ridan-to'g'ri aloqa o'rnatuvchi, qat'iy rollarga ajratilgan Telegram Mini App (TMA), FastAPI REST backend va `aiogram 3.x` Telegram boti.

---

## 🏛️ Tizim Arxitekturasi va Foydalanuvchi Yo'laklari

### 1. Rolni aniqlash va Kirish Yo'lagi (Role Gateway)
- `Telegram.WebApp.initDataUnsafe` orqali foydalanuvchining Telegram ID si olinadi.
- Inspektorlar bazasida tekshiriladi:
  - **Inspektor:** Himoyalangan Inspektor Boshqaruv Paneliga yo'naltiriladi.
  - **Fuqaro:** 
    - Agar yashash mahallasi belgilanmagan bo'lsa: **Bosqichma-bosqich Tanlash Ustasi (Location Wizard)** ochiladi.
    - Agar yashash mahallasi saqlangan bo'lsa: **Fuqaro Asosiy Minimalist Ekrani** ochiladi.
- Fuqarolarda inspektor panellari yoki vositalariga mutlaqo kirish imkoniyati va ko'rinishi bo'lmaydi (Zero visibility / Strict Access Control).

### 2. Bosqichma-bosqich Yashash Joyini Tanlash (Multi-Step Location Wizard)
- Ekran ortiqcha chalkashliksiz bitta oynada navbatma-navbat almashadi:
  - **1-bosqich:** Viloyat / Shahar tanlanadi.
  - **2-bosqich:** Ro'yxat o'rniga mos **Tuman / Shaharlar** chiqadi va "← Ortga" tugmasi paydo bo'ladi.
  - **3-bosqich:** Ro'yxat o'rniga mos **Mahallalar** chiqadi.
  - Mahalla tanlangach tanlov darhol `localStorage` va bazaga saqlanadi hamda fuqaroning asosiy portaliga o'tadi.

### 3. Fuqaroning Asosiy Ekrani (Strictly Minimalist)
Fuqaro interfeysida ortiqcha matnli lentalar, status jadvallari yoki formalar mavjud emas. Faqatgina:
1. **Inspektor Profil Kartasi (Header):**
   - Inspektor fotosurati / avatari
   - F.I.Sh. va xizmat unvoni
   - Biriktirilgan mahalla nomi
   - Yuqori burchakda Akkaunt Sozlamalarini ochuvchi tishli g'ildirakcha (⚙️).
2. **Faqat 3 ta Asosiy Harakat Tugmasi:**
   - 📞 **Qo'ng'iroq qilish (Call Officer):** To'g'ridan-to'g'ri `tel:+998...` xizmat telefoniga qo'ng'iroq.
   - 🎙 **Ovozli xabar (Voice Message):** Web Audio / MediaRecorder API orqali jonli sekundomer bilan ovoz yozish va inspektorga yuborish.
   - 🎥 **Video xabar (Video Message):** Kameradan qisqa video yozish / yuklash va yuborish.

### 4. Akkaunt Sozlamalari Modali (Akkaunt & Dizayn Sozlamalari)
- **Mavzu (Theme):** Light / Dark / Night mode (Tungi patrul).
- **Shrift turi (Font Family):** Inter, Sans-serif, Serif.
- **Matn o'lchami (Font Size):** Kichik (14px), O'rtacha (16px), Katta (18px).
- **Urg'u rangi (Theme Accent):** Police Blue (`#0284c7`), Emerald (`#059669`), Slate (`#475569`).
- Barchasi CSS custom properties orqali real vaqtda qo'llanadi va `localStorage`da saqlanadi.

### 5. Inspektor Boshqaruv Paneli (Protected Officer Dashboard)
- Inspektorlar uchun alohida himoyalangan oyna:
  - Kelib tushgan audio xabarlarni to'g'ridan-to'g'ri tinglash (pleyer).
  - Yuborilgan videolarni tomosha qilish.
  - Fuqaroning aloqa raqamini ko'rish va to'g'ridan-to'g'ri qayta qo'ng'iroq qilish / javob yo'llash.

---

## 📁 Fayllar Strukturasi

```
backend/
├── main.py              # FastAPI server (Auth, Location, Multipart fayllar, static routing)
├── bot.py               # aiogram 3.x Telegram boti (/start, /change_area, WebAppInfo)
├── models.py            # SQLAlchemy modellari (Region, District, Neighborhood, Officer, Citizen, Report, Reply)
├── database.py          # SQLite / PostgreSQL drayveri va dastlabki seed ma'lumotlari
├── requirements.txt     # Python paketlari (fastapi, uvicorn, aiogram, sqlalchemy, python-multipart)
├── static/
│   ├── index.html       # Standalone TMA mijoz interfeysi (Minimalist Card + 3 Actions + Settings)
│   └── app.js           # TMA mijoz logikasi, MediaRecorder audio/video, dinamik mavzular
└── uploads/             # Ovozli va video xabarlar saqlanadigan xavfsiz katalog
```

---

## 🚀 Ishga Tushirish Qo'llanmasi

### 1. Kutubxonalarni o'rnatish
```bash
pip install -r requirements.txt
```

### 2. Muhit o'zgaruvchilari
```bash
export BOT_TOKEN="9140724828:AAH_VOd8btfQl7yb8udpZD215VCTXQ9vCW8"
export APP_URL="https://your-domain.com"
```

### 3. FastAPI Serverini ishga tushirish
```bash
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```
- TMA Fuqaro interfeysi: `http://localhost:8000/`
- API hujjatlari: `http://localhost:8000/docs`

### 4. Telegram Botni ishga tushirish
```bash
python bot.py
```

---

## 📡 REST API Endpointlari

| Metod | Endpoint | Tavsif |
|---|---|---|
| `POST` | `/api/auth` | Telegram foydalanuvchisini tekshirish va rolini aniqlash (`officer` yoki `citizen`) |
| `POST` | `/api/citizen/location` | Tanlangan mahallani saqlash va profilaktika inspektorini biriktirish |
| `GET` | `/api/locations` | Viloyat -> Tuman -> Mahalla ierarxik daraxti |
| `POST` | `/api/reports` | 3 ta harakatdan kelgan ovozli, video yoki tezkor xabarlarni qabul qilish |
| `GET` | `/api/officer/reports` | Faqat inspektorga tegishli murojaatlarni audio/video fayllari bilan qaytarish |
| `POST` | `/api/officer/reply` | Murojaatga rasmiy javob yo'llash va fuqaro botiga xabarnoma yuborish |
