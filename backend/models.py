import uuid
from datetime import datetime
from sqlalchemy import (
    Column,
    String,
    Text,
    Integer,
    Float,
    Boolean,
    DateTime,
    ForeignKey,
)
from sqlalchemy.orm import relationship, declarative_base

Base = declarative_base()


class Region(Base):
    __tablename__ = "regions"

    id = Column(String(50), primary_key=True)
    name = Column(String(100), nullable=False)

    districts = relationship("District", back_populates="region", cascade="all, delete-orphan")


class District(Base):
    __tablename__ = "districts"

    id = Column(String(50), primary_key=True)
    region_id = Column(String(50), ForeignKey("regions.id"), nullable=False)
    name = Column(String(100), nullable=False)

    region = relationship("Region", back_populates="districts")
    neighborhoods = relationship("Neighborhood", back_populates="district", cascade="all, delete-orphan")


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
    citizens = relationship("Citizen", back_populates="neighborhood")
    reports = relationship("Report", back_populates="neighborhood")


class Officer(Base):
    __tablename__ = "officers"

    id = Column(String(50), primary_key=True)
    full_name = Column(String(150), nullable=False)
    rank = Column(String(100), nullable=False)  # Mayor, Kapitan, Katta leytenant
    phone = Column(String(30), nullable=False)
    telegram_id = Column(Integer, unique=True, nullable=True)  # Whitelisted Telegram ID
    mahalla_id = Column(String(50), ForeignKey("neighborhoods.id"), nullable=False)
    badge_number = Column(String(50), unique=True, nullable=False)
    photo_url = Column(Text, nullable=True)
    support_point_address = Column(Text, nullable=False)
    reception_days = Column(String(255), nullable=False)
    rating = Column(Float, default=4.9)
    resolved_count = Column(Integer, default=0)
    is_active = Column(Boolean, default=True)

    neighborhood = relationship("Neighborhood", back_populates="officers")
    reports = relationship("Report", back_populates="officer")
    replies = relationship("Reply", back_populates="officer")


class Citizen(Base):
    __tablename__ = "citizens"

    telegram_id = Column(Integer, primary_key=True)
    full_name = Column(String(150), nullable=False)
    username = Column(String(100), nullable=True)
    phone = Column(String(30), nullable=True)
    mahalla_id = Column(String(50), ForeignKey("neighborhoods.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    neighborhood = relationship("Neighborhood", back_populates="citizens")
    reports = relationship("Report", back_populates="citizen")


class Report(Base):
    __tablename__ = "reports"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    ticket_number = Column(String(50), unique=True, nullable=False)
    citizen_id = Column(Integer, ForeignKey("citizens.telegram_id"), nullable=True)
    mahalla_id = Column(String(50), ForeignKey("neighborhoods.id"), nullable=False)
    officer_id = Column(String(50), ForeignKey("officers.id"), nullable=False)
    media_type = Column(String(20), default="text")  # voice, video, text, photo
    file_url = Column(Text, nullable=True)
    description = Column(Text, nullable=False)
    address = Column(Text, nullable=False)
    category = Column(String(50), default="security")
    title = Column(String(255), nullable=False)
    is_anonymous = Column(Boolean, default=False)
    status = Column(String(20), default="new")  # new, in_progress, resolved, rejected
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    citizen = relationship("Citizen", back_populates="reports")
    neighborhood = relationship("Neighborhood", back_populates="reports")
    officer = relationship("Officer", back_populates="reports")
    replies = relationship("Reply", back_populates="report", cascade="all, delete-orphan")


class Reply(Base):
    __tablename__ = "replies"

    id = Column(Integer, primary_key=True, autoincrement=True)
    report_id = Column(String(36), ForeignKey("reports.id"), nullable=False)
    officer_id = Column(String(50), ForeignKey("officers.id"), nullable=False)
    reply_text = Column(Text, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    report = relationship("Report", back_populates="replies")
    officer = relationship("Officer", back_populates="replies")
