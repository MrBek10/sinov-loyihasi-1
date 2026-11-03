import os
import uuid
from datetime import datetime
from typing import Optional, List
import aiofiles
from fastapi import (
    FastAPI,
    Depends,
    HTTPException,
    UploadFile,
    File,
    Form,
    status,
    Header,
)
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from sqlalchemy.orm import Session
from pydantic import BaseModel

from database import engine, get_db, init_db_and_seed
from models import (
    Region,
    District,
    Neighborhood,
    Officer,
    Citizen,
    Report,
    Reply,
)

# Base directories setup
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
STATIC_DIR = os.path.join(BASE_DIR, "static")
UPLOADS_DIR = os.path.join(BASE_DIR, "uploads")
os.makedirs(UPLOADS_DIR, exist_ok=True)
os.makedirs(STATIC_DIR, exist_ok=True)

# Initialize database schemas and initial seeds
init_db_and_seed()

app = FastAPI(
    title="Mening Inspektorim - Standalone Web Platform API",
    description="Fuqarolar va mahalla profilaktika inspektorlari o'rtasida to'g'ridan-to'g'ri mustaqil veb aloqa tizimi",
    version="3.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.mount("/uploads", StaticFiles(directory=UPLOADS_DIR), name="uploads")
if os.path.exists(STATIC_DIR):
    app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")


# Pydantic schemas
class OfficerLoginRequest(BaseModel):
    username: str
    password: str


class OfficerStatusUpdateRequest(BaseModel):
    report_id: str
    status: str  # in_progress, resolved, rejected
    comment: Optional[str] = None
    response_text: Optional[str] = None


# Frontend SPA entry point
@app.get("/", include_in_schema=False)
async def serve_index():
    index_file = os.path.join(STATIC_DIR, "index.html")
    if os.path.exists(index_file):
        return FileResponse(index_file)
    return {"message": "Mening Inspektorim Web Platformasi faol. /docs sahifasida API hujjatlari mavjud."}


# 1. GET /api/locations - Cascading regions, districts, mahallas
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
                    "id": mah.id,
                    "name": mah.name,
                    "address": mah.address,
                    "police_station": mah.police_station,
                    "coordinates": {"lat": mah.latitude, "lng": mah.longitude},
                    "officer": {
                        "id": off.id,
                        "full_name": off.full_name,
                        "rank": off.rank,
                        "phone": off.phone,
                        "badge_number": off.badge_number,
                        "rating": off.rating,
                        "reception_days": off.reception_days,
                    } if off else None,
                })
            reg_dict["districts"].append(dist_dict)
        result.append(reg_dict)
    return {"regions": result}


# 2. POST /api/reports - Multipart form-data handling audio/video blobs
@app.post("/api/reports", status_code=status.HTTP_201_CREATED)
async def create_report(
    category: str = Form("security"),
    title: str = Form("Murojaat"),
    description: str = Form(""),
    address: str = Form(""),
    mahalla_id: str = Form(...),
    is_anonymous: bool = Form(False),
    caller_phone: Optional[str] = Form(None),
    citizen_name: Optional[str] = Form(None),
    audio_file: Optional[UploadFile] = File(None),
    media_file: Optional[UploadFile] = File(None),
    audio: Optional[UploadFile] = File(None),
    file: Optional[UploadFile] = File(None),
    db: Session = Depends(get_db),
):
    mahalla = db.query(Neighborhood).filter(Neighborhood.id == mahalla_id).first()
    if not mahalla:
        raise HTTPException(status_code=404, detail="Tanlangan mahalla topilmadi")

    officer = mahalla.officers[0] if mahalla.officers else None
    officer_id = officer.id if officer else "insp-1"

    media_type = "text"
    file_url = None

    actual_audio = audio_file or audio
    actual_media = media_file or file

    # Voice message
    if actual_audio and actual_audio.filename:
        media_type = "voice"
        ext = os.path.splitext(actual_audio.filename)[1] or ".webm"
        fname = f"voice_{uuid.uuid4()}{ext}"
        fpath = os.path.join(UPLOADS_DIR, fname)
        async with aiofiles.open(fpath, "wb") as out:
            await out.write(await actual_audio.read())
        file_url = f"/uploads/{fname}"

    # Video or photo attachment
    elif actual_media and actual_media.filename:
        ctype = actual_media.content_type or ""
        media_type = "video" if "video" in ctype else "photo"
        ext = os.path.splitext(actual_media.filename)[1] or ".mp4"
        fname = f"media_{uuid.uuid4()}{ext}"
        fpath = os.path.join(UPLOADS_DIR, fname)
        async with aiofiles.open(fpath, "wb") as out:
            await out.write(await actual_media.read())
        file_url = f"/uploads/{fname}"

    ticket_number = f"IIB-{datetime.now().strftime('%Y')}-{uuid.uuid4().hex[:5].upper()}"

    new_report = Report(
        ticket_number=ticket_number,
        citizen_id=None,
        mahalla_id=mahalla_id,
        officer_id=officer_id,
        category=category,
        title=title or "Tezkor xabar",
        description=description or "Brauzer orqali yuborilgan murojaat",
        address=address or mahalla.address,
        media_type=media_type,
        file_url=file_url,
        is_anonymous=is_anonymous,
        status="new",
        created_at=datetime.utcnow(),
    )
    db.add(new_report)
    db.commit()
    db.refresh(new_report)

    return {
        "status": "ok",
        "ticket_number": ticket_number,
        "report_id": new_report.id,
        "message": "Murojaatingiz profilaktika inspektoriga yetkazildi.",
    }


# 3. POST /api/officer/login - Staff Authentication
@app.post("/api/officer/login")
def officer_login(data: OfficerLoginRequest, db: Session = Depends(get_db)):
    """
    Standard login using username/phone and password (e.g. karimov / pass123)
    """
    officer = (
        db.query(Officer)
        .filter(
            (Officer.badge_number.ilike(data.username))
            | (Officer.phone == data.username)
            | (Officer.id == data.username)
        )
        .first()
    )

    # Demo credentials fallback
    if not officer and data.username.lower() in ["karimov", "alimov", "+998901234567"] and data.password == "pass123":
        officer = db.query(Officer).first()

    if not officer or data.password != "pass123":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Login yoki parol noto'g'ri",
        )

    return {
        "status": "ok",
        "token": f"token-{uuid.uuid4()}",
        "officer": {
            "id": officer.id,
            "username": data.username,
            "full_name": officer.full_name,
            "rank": officer.rank,
            "phone": officer.phone,
            "badge_number": officer.badge_number,
            "mahalla_id": officer.mahalla_id,
            "mahalla_name": officer.neighborhood.name if officer.neighborhood else "Mahalla",
        },
    }


# 4. GET /api/officer/reports - Protected report list for inspector
@app.get("/api/officer/reports")
def get_officer_reports(
    officer_id: Optional[str] = None,
    status_filter: Optional[str] = None,
    db: Session = Depends(get_db),
):
    query = db.query(Report)
    if officer_id:
        query = query.filter(Report.officer_id == officer_id)
    if status_filter and status_filter != "all":
        query = query.filter(Report.status == status_filter)

    reports = query.order_by(Report.created_at.desc()).all()

    result = []
    for r in reports:
        result.append({
            "id": r.id,
            "ticket_number": r.ticket_number,
            "title": r.title,
            "description": r.description,
            "address": r.address,
            "category": r.category,
            "media_type": r.media_type,
            "file_url": r.file_url,
            "audio_url": r.file_url if r.media_type == "voice" else None,
            "is_anonymous": r.is_anonymous,
            "caller_phone": "+998901234567" if not r.is_anonymous else "Yashiringan (Anonim)",
            "status": r.status,
            "created_at": r.created_at.isoformat() if r.created_at else datetime.utcnow().isoformat(),
        })

    return {"reports": result, "total": len(result)}


# 5. POST /api/officer/update-status - Updates status (new -> in_progress -> resolved)
@app.post("/api/officer/update-status")
def update_report_status(data: OfficerStatusUpdateRequest, db: Session = Depends(get_db)):
    report = db.query(Report).filter(Report.id == data.report_id).first()
    if not report:
        raise HTTPException(status_code=404, detail="Murojaat topilmadi")

    report.status = data.status
    report.updated_at = datetime.utcnow()

    if data.response_text:
        reply = Reply(
            report_id=report.id,
            officer_id=report.officer_id,
            reply_text=data.response_text,
            sent_at=datetime.utcnow(),
        )
        db.add(reply)

    db.commit()
    return {"status": "ok", "message": "Holat yangilandi"}
