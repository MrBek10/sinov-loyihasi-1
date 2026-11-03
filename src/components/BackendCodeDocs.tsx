import React, { useState } from 'react';
import { Copy, Check, Terminal, Database, FileCode, Layers, ShieldCheck, Server, Bot, Layout, BookOpen } from 'lucide-react';
import { triggerHaptic } from '../utils/telegram';

export const BackendCodeDocs: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'fastapi' | 'bot' | 'models' | 'sql' | 'readme'>('fastapi');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const APP_URL = typeof window !== 'undefined' ? window.location.origin : 'https://ais-dev-xwgc46i6x3cjompwnlzi4o-785683973863.asia-northeast1.run.app';
  const USER_BOT_TOKEN = "9140724828:AAH_VOd8btfQl7yb8udpZD215VCTXQ9vCW8";

  const handleCopy = (key: string, code: string) => {
    navigator.clipboard.writeText(code);
    triggerHaptic('success');
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const fastApiCode = `# backend/main.py
import os
import uuid
from datetime import datetime
from typing import Optional
import aiofiles
from fastapi import FastAPI, Depends, HTTPException, UploadFile, File, Form, status
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from pydantic import BaseModel

from database import engine, get_db, init_db_and_seed
from models import Region, District, Neighborhood, Officer, Citizen, Report, Reply
from bot import notify_officer_new_report, notify_citizen_status_update

init_db_and_seed()

app = FastAPI(title="Mening Inspektorim API", version="1.0.0")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_credentials=True, allow_methods=["*"], allow_headers=["*"])

app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")
app.mount("/static", StaticFiles(directory="static"), name="static")

@app.get("/")
async def serve_index():
    return FileResponse("static/index.html")

@app.get("/admin")
async def serve_admin():
    return FileResponse("static/admin.html")

# 1. GET /api/locations
@app.get("/api/locations")
def get_locations(db: Session = Depends(get_db)):
    regions = db.query(Region).all()
    result = []
    for reg in regions:
        reg_dict = {"id": reg.id, "name": reg.name, "districts": []}
        for dist in reg.districts:
            dist_dict = {"id": dist.id, "name": dist.name, "mahallas": []}
            for mah in dist.neighborhoods:
                off = mah.officers[0] if mah.officers else None
                dist_dict["mahallas"].append({
                    "id": mah.id, "name": mah.name, "address": mah.address,
                    "police_station": mah.police_station,
                    "coordinates": {"lat": mah.latitude, "lng": mah.longitude},
                    "officer": {"id": off.id, "full_name": off.full_name, "rank": off.rank, "phone": off.phone} if off else None
                })
            reg_dict["districts"].append(dist_dict)
        result.append(reg_dict)
    return result

# 2. POST /api/reports (multipart/form-data for audio/video/image)
@app.post("/api/reports", status_code=201)
async def create_report(
    category: str = Form(...),
    title: str = Form(...),
    description: str = Form(...),
    address: str = Form(...),
    mahalla_id: str = Form(...),
    is_anonymous: bool = Form(False),
    citizen_telegram_id: Optional[int] = Form(None),
    citizen_full_name: Optional[str] = Form(None),
    citizen_phone: Optional[str] = Form(None),
    audio: Optional[UploadFile] = File(None),
    media: Optional[UploadFile] = File(None),
    db: Session = Depends(get_db)
):
    mahalla = db.query(Neighborhood).filter(Neighborhood.id == mahalla_id).first()
    officer = mahalla.officers[0] if mahalla and mahalla.officers else None
    officer_id = officer.id if officer else "insp-1"

    audio_url = None
    if audio and audio.filename:
        filename = f"audio_{uuid.uuid4()}.webm"
        async with aiofiles.open(f"uploads/{filename}", "wb") as f:
            await f.write(await audio.read())
        audio_url = f"/uploads/{filename}"

    media_url = None
    if media and media.filename:
        filename = f"media_{uuid.uuid4()}_{media.filename}"
        async with aiofiles.open(f"uploads/{filename}", "wb") as f:
            await f.write(await media.read())
        media_url = f"/uploads/{filename}"

    ticket_number = f"IIB-2026-{uuid.uuid4().hex[:4].upper()}"
    new_report = Report(
        ticket_number=ticket_number, citizen_id=citizen_telegram_id if not is_anonymous else None,
        mahalla_id=mahalla_id, officer_id=officer_id, category=category,
        title=title, description=description, address=address,
        audio_url=audio_url, media_url=media_url, is_anonymous=is_anonymous, status="Yangi"
    )
    db.add(new_report)
    db.commit()

    if officer and officer.telegram_id:
        await notify_officer_new_report(
            officer_chat_id=officer.telegram_id, ticket_number=ticket_number,
            mahalla_name=mahalla.name, category=category, title=title,
            description=description, address=address, is_anonymous=is_anonymous,
            citizen_name=citizen_full_name, audio_url=audio_url
        )

    return {"status": "success", "ticket_number": ticket_number, "report_id": new_report.id}

# 3. GET /api/admin/reports
@app.get("/api/admin/reports")
def get_admin_reports(status_filter: Optional[str] = None, db: Session = Depends(get_db)):
    q = db.query(Report)
    if status_filter and status_filter != "all":
        q = q.filter(Report.status == status_filter)
    reports = q.order_by(Report.created_at.desc()).all()
    return [{
        "id": r.id, "ticket_number": r.ticket_number, "category": r.category,
        "title": r.title, "description": r.description, "address": r.address,
        "audio_url": r.audio_url, "media_url": r.media_url, "is_anonymous": r.is_anonymous,
        "status": r.status, "created_at": r.created_at.isoformat(),
        "citizen": {"full_name": r.citizen.full_name, "phone": r.citizen.phone_number} if r.citizen and not r.is_anonymous else None
    } for r in reports]

# 4. POST /api/admin/reply
class ReplyRequest(BaseModel):
    report_id: str
    officer_id: str
    reply_text: str
    new_status: str = "Hal qilindi"

@app.post("/api/admin/reply")
async def reply_report(data: ReplyRequest, db: Session = Depends(get_db)):
    report = db.query(Report).filter(Report.id == data.report_id).first()
    report.status = data.new_status
    db.add(Reply(report_id=report.id, officer_id=data.officer_id, reply_text=data.reply_text))
    db.commit()

    if report.citizen_id and not report.is_anonymous:
        await notify_citizen_status_update(
            citizen_chat_id=report.citizen_id, ticket_number=report.ticket_number,
            new_status=report.status, officer_name="Mayor Karimov R. B.", reply_text=data.reply_text
        )
    return {"status": "success", "new_status": report.status}`;

  const botCode = `# backend/bot.py (aiogram 3.x)
import os, asyncio, logging
from aiogram import Bot, Dispatcher, types, F
from aiogram.filters import CommandStart, Command
from aiogram.types import InlineKeyboardMarkup, InlineKeyboardButton, ReplyKeyboardMarkup, KeyboardButton, WebAppInfo, MenuButtonWebApp

BOT_TOKEN = os.getenv("BOT_TOKEN", "${USER_BOT_TOKEN}")
WEBAPP_URL = os.getenv("WEBAPP_URL", "${APP_URL}")

logging.basicConfig(level=logging.INFO)
bot = Bot(token=BOT_TOKEN)
dp = Dispatcher()

async def setup_menu():
    await bot.set_chat_menu_button(menu_button=MenuButtonWebApp(text="Murojaat 🌐", web_app=WebAppInfo(url=WEBAPP_URL)))

@dp.message(CommandStart())
async def cmd_start(message: types.Message):
    markup = InlineKeyboardMarkup(inline_keyboard=[
        [InlineKeyboardButton(text="Murojaat yuborish 🌐", web_app=WebAppInfo(url=WEBAPP_URL))],
        [InlineKeyboardButton(text="👮‍♂️ Inspektorlar ro'yxati", web_app=WebAppInfo(url=f"{WEBAPP_URL}?tab=citizen"))]
    ])
    await message.answer(
        f"Assalomu alaykum, <b>{message.from_user.first_name}</b>!\n\n"
        "'Mening Inspektorim' mahalla profilaktika tizimiga xush kelibsiz.\n"
        "Matnli, audio yoki fotosuratli murojaat yo'llash uchun tugmani bosing:",
        parse_mode="HTML", reply_markup=markup
    )

@dp.message(Command("change_area"))
async def cmd_change_area(message: types.Message):
    await message.answer(
        "Mahallangizni o'zgartirish:",
        reply_markup=InlineKeyboardMarkup(inline_keyboard=[
            [InlineKeyboardButton(text="📍 Hududni tanlash", web_app=WebAppInfo(url=f"{WEBAPP_URL}?action=select_mahalla"))]
        ])
    )

@dp.message(Command("report"))
async def cmd_report(message: types.Message):
    await message.answer(
        "Murojaat shakli:",
        reply_markup=InlineKeyboardMarkup(inline_keyboard=[
            [InlineKeyboardButton(text="✍️ Yangi murojaat", web_app=WebAppInfo(url=f"{WEBAPP_URL}?view=form"))]
        ])
    )

@dp.message(Command("admin"))
async def cmd_admin(message: types.Message):
    await message.answer(
        "👮‍♂️ Inspektor boshqaruv paneli:",
        reply_markup=InlineKeyboardMarkup(inline_keyboard=[
            [InlineKeyboardButton(text="📋 Dashboardni ochish", web_app=WebAppInfo(url=f"{WEBAPP_URL}/admin"))]
        ])
    )

async def notify_officer_new_report(officer_chat_id, ticket_number, mahalla_name, category, title, description, address, is_anonymous, citizen_name, audio_url):
    sender = "🔒 Anonim fuqaro" if is_anonymous else f"{citizen_name}"
    text = (f"🚨 <b>YANGI MUROJAAT!</b>\n\n📋 <b>Chipta:</b> <code>#{ticket_number}</code>\n"
            f"📍 <b>Mahalla:</b> {mahalla_name}\n🏷 <b>Toifa:</b> {category}\n👤 <b>Fuqaro:</b> {sender}\n"
            f"🏠 <b>Manzil:</b> {address}\n📌 <b>Mavzu:</b> {title}\n💬 <b>Tavsif:</b> {description}")
    await bot.send_message(chat_id=officer_chat_id, text=text, parse_mode="HTML",
        reply_markup=InlineKeyboardMarkup(inline_keyboard=[
            [InlineKeyboardButton(text="📋 Ko'rish va Javob berish", web_app=WebAppInfo(url=f"{WEBAPP_URL}/admin?ticket={ticket_number}"))]
        ])
    )

async def notify_citizen_status_update(citizen_chat_id, ticket_number, new_status, officer_name, reply_text):
    text = (f"🔔 <b>Murojaat holati yangilandi!</b>\n\n📋 <b>Chipta:</b> <code>#{ticket_number}</code>\n"
            f"📌 <b>Holat:</b> {new_status}\n👮‍♂️ <b>Ijrochi:</b> {officer_name}\n\n"
            f"💬 <b>Inspektor javobi:</b>\n<i>\"{reply_text}\"</i>")
    await bot.send_message(chat_id=citizen_chat_id, text=text, parse_mode="HTML")

async def main():
    await setup_menu()
    await dp.start_polling(bot)

if __name__ == "__main__":
    asyncio.run(main())`;

  const modelsCode = `# backend/models.py (SQLAlchemy 2.0 ORM)
import uuid
from datetime import datetime
from sqlalchemy import Column, String, Text, Integer, Float, Boolean, DateTime, ForeignKey
from sqlalchemy.orm import relationship, declarative_base

Base = declarative_base()

class Region(Base):
    __tablename__ = "regions"
    id = Column(String(50), primary_key=True)
    name = Column(String(100), nullable=False)
    districts = relationship("District", back_populates="region")

class District(Base):
    __tablename__ = "districts"
    id = Column(String(50), primary_key=True)
    region_id = Column(String(50), ForeignKey("regions.id"), nullable=False)
    name = Column(String(100), nullable=False)
    region = relationship("Region", back_populates="districts")
    neighborhoods = relationship("Neighborhood", back_populates="district")

class Neighborhood(Base):
    __tablename__ = "neighborhoods"
    id = Column(String(50), primary_key=True)
    district_id = Column(String(50), ForeignKey("districts.id"), nullable=False)
    name = Column(String(150), nullable=False)
    address = Column(Text, nullable=False)
    police_station = Column(String(255), nullable=False)
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    district = relationship("District", back_populates="neighborhoods")
    officers = relationship("Officer", back_populates="neighborhood")
    reports = relationship("Report", back_populates="neighborhood")

class Officer(Base):
    __tablename__ = "officers"
    id = Column(String(50), primary_key=True)
    mahalla_id = Column(String(50), ForeignKey("neighborhoods.id"), nullable=False)
    telegram_id = Column(Integer, unique=True, nullable=True)
    full_name = Column(String(150), nullable=False)
    rank = Column(String(100), nullable=False)
    phone = Column(String(30), nullable=False)
    badge_number = Column(String(50), unique=True, nullable=False)
    photo_url = Column(Text, nullable=True)
    support_point_address = Column(Text, nullable=False)
    reception_days = Column(String(255), nullable=False)
    rating = Column(Float, default=4.9)
    resolved_count = Column(Integer, default=0)
    neighborhood = relationship("Neighborhood", back_populates="officers")
    reports = relationship("Report", back_populates="officer")

class Citizen(Base):
    __tablename__ = "citizens"
    telegram_id = Column(Integer, primary_key=True)
    full_name = Column(String(150), nullable=False)
    username = Column(String(100), nullable=True)
    phone_number = Column(String(30), nullable=True)
    selected_mahalla_id = Column(String(50), ForeignKey("neighborhoods.id"), nullable=True)
    reports = relationship("Report", back_populates="citizen")

class Report(Base):
    __tablename__ = "reports"
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    ticket_number = Column(String(50), unique=True, nullable=False)
    citizen_id = Column(Integer, ForeignKey("citizens.telegram_id"), nullable=True)
    mahalla_id = Column(String(50), ForeignKey("neighborhoods.id"), nullable=False)
    officer_id = Column(String(50), ForeignKey("officers.id"), nullable=False)
    category = Column(String(50), nullable=False)
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=False)
    address = Column(Text, nullable=False)
    report_type = Column(String(20), default="text")
    audio_url = Column(Text, nullable=True)
    media_url = Column(Text, nullable=True)
    is_anonymous = Column(Boolean, default=False)
    status = Column(String(20), default="Yangi")
    created_at = Column(DateTime, default=datetime.utcnow)
    citizen = relationship("Citizen", back_populates="reports")
    neighborhood = relationship("Neighborhood", back_populates="reports")
    officer = relationship("Officer", back_populates="reports")
    replies = relationship("Reply", back_populates="report")

class Reply(Base):
    __tablename__ = "replies"
    id = Column(Integer, primary_key=True, autoincrement=True)
    report_id = Column(String(36), ForeignKey("reports.id"), nullable=False)
    officer_id = Column(String(50), ForeignKey("officers.id"), nullable=False)
    reply_text = Column(Text, nullable=False)
    sent_at = Column(DateTime, default=datetime.utcnow)
    report = relationship("Report", back_populates="replies")`;

  const sqlCode = `-- database_schema.sql (PostgreSQL / SQLite)
CREATE TABLE regions (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(100) NOT NULL
);

CREATE TABLE districts (
    id VARCHAR(50) PRIMARY KEY,
    region_id VARCHAR(50) REFERENCES regions(id),
    name VARCHAR(100) NOT NULL
);

CREATE TABLE neighborhoods (
    id VARCHAR(50) PRIMARY KEY,
    district_id VARCHAR(50) REFERENCES districts(id),
    name VARCHAR(150) NOT NULL,
    address TEXT NOT NULL,
    police_station VARCHAR(255) NOT NULL,
    latitude DECIMAL(10, 7) NOT NULL,
    longitude DECIMAL(10, 7) NOT NULL
);

CREATE TABLE officers (
    id VARCHAR(50) PRIMARY KEY,
    mahalla_id VARCHAR(50) REFERENCES neighborhoods(id),
    telegram_id BIGINT UNIQUE,
    full_name VARCHAR(150) NOT NULL,
    rank VARCHAR(100) NOT NULL,
    phone VARCHAR(30) NOT NULL,
    badge_number VARCHAR(50) UNIQUE NOT NULL,
    support_point_address TEXT NOT NULL,
    reception_days VARCHAR(255) NOT NULL,
    rating DECIMAL(3, 2) DEFAULT 5.0,
    resolved_count INTEGER DEFAULT 0
);

CREATE TABLE citizens (
    telegram_id BIGINT PRIMARY KEY,
    full_name VARCHAR(150) NOT NULL,
    username VARCHAR(100),
    phone_number VARCHAR(30),
    selected_mahalla_id VARCHAR(50) REFERENCES neighborhoods(id)
);

CREATE TABLE reports (
    id UUID PRIMARY KEY,
    ticket_number VARCHAR(50) UNIQUE NOT NULL,
    citizen_id BIGINT REFERENCES citizens(telegram_id),
    mahalla_id VARCHAR(50) REFERENCES neighborhoods(id),
    officer_id VARCHAR(50) REFERENCES officers(id),
    category VARCHAR(50) NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    address TEXT NOT NULL,
    report_type VARCHAR(20) DEFAULT 'text',
    audio_url TEXT,
    media_url TEXT,
    is_anonymous BOOLEAN DEFAULT FALSE,
    status VARCHAR(20) DEFAULT 'Yangi',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE replies (
    id SERIAL PRIMARY KEY,
    report_id UUID REFERENCES reports(id) ON DELETE CASCADE,
    officer_id VARCHAR(50) REFERENCES officers(id),
    reply_text TEXT NOT NULL,
    sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);`;

  const readmeCode = `# Mening Inspektorim - Ishga Tushirish Qo'llanmasi

1. Kutubxonalarni o'rnatish:
   pip install fastapi uvicorn aiogram sqlalchemy aiofiles python-multipart

2. FastAPI serverini ishga tushirish (Port 8000):
   uvicorn main:app --host 0.0.0.0 --port 8000 --reload

3. Alohida oynada Telegram botni ishga tushirish:
   python bot.py

4. Swagger API hujjatlari:
   http://localhost:8000/docs

5. Frontend WebApp manzillari:
   - Fuqaro Mini App: http://localhost:8000/
   - Inspektor Dashboard: http://localhost:8000/admin`;

  return (
    <div className="space-y-4">
      {/* Top Banner with configured Bot Token & WebApp URL */}
      <div className="bg-gradient-to-r from-slate-900 via-sky-950 to-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 text-white shadow-sm">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
              <h3 className="text-base font-bold text-white">
                Backend & Telegram Bot Arxitekturasi (FastAPI + aiogram 3.x)
              </h3>
            </div>
            <p className="text-xs text-slate-300 mt-1">
              Barcha talab qilingan backend fayllari <code>/backend</code> katalogida yaratilgan va ishlab turibdi.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[11px] font-mono bg-sky-500/20 text-sky-300 px-2.5 py-1 rounded-lg border border-sky-400/30">
              Token: 9140724828:...
            </span>
          </div>
        </div>

        {/* Quick parameters grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 mt-3 pt-3 border-t border-slate-800 text-xs">
          <div className="bg-white/5 rounded-xl p-2.5">
            <div className="text-slate-400 text-[11px]">Sizning Telegram Bot Tokeningiz:</div>
            <code className="font-mono text-sky-300 font-semibold break-all text-[11px]">
              {USER_BOT_TOKEN}
            </code>
          </div>

          <div className="bg-white/5 rounded-xl p-2.5">
            <div className="text-slate-400 text-[11px]">TMA WebApp URL:</div>
            <code className="font-mono text-emerald-300 font-semibold break-all text-[11px]">
              {APP_URL}
            </code>
          </div>
        </div>
      </div>

      {/* Code Browser Tabs */}
      <div className="flex items-center justify-between gap-2 overflow-x-auto pb-1">
        <div className="flex items-center gap-1 p-1 bg-slate-200/80 dark:bg-slate-800 rounded-xl text-xs overflow-x-auto no-scrollbar">
          <button
            type="button"
            onClick={() => { triggerHaptic('selection'); setActiveTab('fastapi'); }}
            className={`px-3 py-1.5 font-semibold rounded-lg transition-colors flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'fastapi' ? 'bg-white dark:bg-slate-700 text-sky-700 dark:text-sky-300 shadow-sm' : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
            }`}
          >
            <Server className="w-3.5 h-3.5" />
            <span>main.py (FastAPI)</span>
          </button>

          <button
            type="button"
            onClick={() => { triggerHaptic('selection'); setActiveTab('bot'); }}
            className={`px-3 py-1.5 font-semibold rounded-lg transition-colors flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'bot' ? 'bg-white dark:bg-slate-700 text-sky-700 dark:text-sky-300 shadow-sm' : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
            }`}
          >
            <Bot className="w-3.5 h-3.5" />
            <span>bot.py (aiogram 3)</span>
          </button>

          <button
            type="button"
            onClick={() => { triggerHaptic('selection'); setActiveTab('models'); }}
            className={`px-3 py-1.5 font-semibold rounded-lg transition-colors flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'models' ? 'bg-white dark:bg-slate-700 text-sky-700 dark:text-sky-300 shadow-sm' : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>models.py (ORM)</span>
          </button>

          <button
            type="button"
            onClick={() => { triggerHaptic('selection'); setActiveTab('sql'); }}
            className={`px-3 py-1.5 font-semibold rounded-lg transition-colors flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'sql' ? 'bg-white dark:bg-slate-700 text-sky-700 dark:text-sky-300 shadow-sm' : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
            }`}
          >
            <Database className="w-3.5 h-3.5" />
            <span>schema.sql</span>
          </button>

          <button
            type="button"
            onClick={() => { triggerHaptic('selection'); setActiveTab('readme'); }}
            className={`px-3 py-1.5 font-semibold rounded-lg transition-colors flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'readme' ? 'bg-white dark:bg-slate-700 text-sky-700 dark:text-sky-300 shadow-sm' : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>README.md</span>
          </button>
        </div>

        <span className="text-[11px] text-slate-400 font-mono hidden sm:inline">
          backend/
        </span>
      </div>

      {/* Code Editor Window */}
      <div className="bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="bg-slate-900/95 px-4 py-2.5 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500/80" />
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500/80" />
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/80" />
            <span className="text-xs font-mono text-slate-400 ml-2">
              {activeTab === 'fastapi' && 'backend/main.py'}
              {activeTab === 'bot' && 'backend/bot.py'}
              {activeTab === 'models' && 'backend/models.py'}
              {activeTab === 'sql' && 'backend/database_schema.sql'}
              {activeTab === 'readme' && 'backend/README.md'}
            </span>
          </div>

          <button
            type="button"
            onClick={() => {
              const codeMap = {
                fastapi: fastApiCode,
                bot: botCode,
                models: modelsCode,
                sql: sqlCode,
                readme: readmeCode,
              };
              handleCopy(activeTab, codeMap[activeTab]);
            }}
            className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium rounded-lg flex items-center gap-1.5 transition-colors border border-slate-700"
          >
            {copiedKey === activeTab ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-emerald-400">Nusxalandi!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>Nusxa olish</span>
              </>
            )}
          </button>
        </div>

        <div className="p-4 max-h-[520px] overflow-y-auto font-mono text-xs text-sky-100/90 leading-relaxed">
          <pre className="whitespace-pre">
            {activeTab === 'fastapi' && fastApiCode}
            {activeTab === 'bot' && botCode}
            {activeTab === 'models' && modelsCode}
            {activeTab === 'sql' && sqlCode}
            {activeTab === 'readme' && readmeCode}
          </pre>
        </div>
      </div>

      {/* Deliverables Overview Checklist */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 text-xs space-y-3">
        <h4 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-sky-600" />
          <span>Talab qilingan barcha deliverable'lar holati</span>
        </h4>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-slate-600 dark:text-slate-300">
          <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-100 dark:border-slate-800">
            <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
              <span>✅ 1. Frontend TMA</span>
            </div>
            <div className="text-[11px] text-slate-500 mt-1">
              <code>backend/static/index.html</code> va <code>app.js</code>: Web Audio mikrofon yozuvchisi, GPS va Telegram WebApp SDK.
            </div>
          </div>

          <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-100 dark:border-slate-800">
            <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
              <span>✅ 2. Admin Dashboard</span>
            </div>
            <div className="text-[11px] text-slate-500 mt-1">
              <code>backend/static/admin.html</code>: Audio player, holat pipeline'i (Yangi/Jarayonda/Hal qilindi), va javob berish modali.
            </div>
          </div>

          <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-100 dark:border-slate-800">
            <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
              <span>✅ 3. FastAPI & aiogram 3</span>
            </div>
            <div className="text-[11px] text-slate-500 mt-1">
              <code>backend/main.py</code> va <code>bot.py</code>: REST API, multipart yuklash, SQLite/PostgreSQL va xabarnomalar.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
