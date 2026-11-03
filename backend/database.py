import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from models import Base, Region, District, Neighborhood, Officer, Report

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./mahalla_inspectors.db")
connect_args = {"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {}

engine = create_engine(DATABASE_URL, connect_args=connect_args)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db_and_seed():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()

    if db.query(Region).first() is not None:
        db.close()
        return

    # 1. Regions
    r_tashkent = Region(id="toshkent-sh", name="Toshkent shahri")
    r_samarkand = Region(id="samarqand-vil", name="Samarqand viloyati")
    r_fergana = Region(id="fargona-vil", name="Farg'ona viloyati")
    db.add_all([r_tashkent, r_samarkand, r_fergana])
    db.commit()

    # 2. Districts
    d_yunusobod = District(id="yunusobod", region_id="toshkent-sh", name="Yunusobod tumani")
    d_chilonzor = District(id="chilonzor", region_id="toshkent-sh", name="Chilonzor tumani")
    d_mirzo = District(id="mirzo-ulugbek", region_id="toshkent-sh", name="Mirzo Ulug'bek tumani")
    d_sam_city = District(id="samarqand-sh", region_id="samarqand-vil", name="Samarqand shahri")
    db.add_all([d_yunusobod, d_chilonzor, d_mirzo, d_sam_city])
    db.commit()

    # 3. Neighborhoods (Mahallas)
    m1 = Neighborhood(
        id="m-bogishamol",
        district_id="yunusobod",
        name="Bog'ishamol mahallasi",
        address="Amir Temur shoh ko'chasi, 108-uy",
        police_station="12-sonli Ichki Ishlar Organlari Tayanch Punkti",
        latitude=41.3485,
        longitude=69.2885,
    )
    m2 = Neighborhood(
        id="m-shahriston",
        district_id="yunusobod",
        name="Shahriston mahallasi",
        address="Shahriston ko'chasi, 45-uy",
        police_station="14-sonli Ichki Ishlar Organlari Tayanch Punkti",
        latitude=41.3542,
        longitude=69.2831,
    )
    m3 = Neighborhood(
        id="m-oqtepa",
        district_id="chilonzor",
        name="Oqtepa mahallasi",
        address="Muqimiy ko'chasi, 94-uy",
        police_station="24-sonli Ichki Ishlar Organlari Tayanch Punkti",
        latitude=41.2854,
        longitude=69.2215,
    )
    m4 = Neighborhood(
        id="m-mustaqillik",
        district_id="mirzo-ulugbek",
        name="Mustaqillik mahallasi",
        address="Buyuk Ipak Yo'li, 156-uy",
        police_station="7-sonli Ichki Ishlar Organlari Tayanch Punkti",
        latitude=41.3255,
        longitude=69.3341,
    )
    db.add_all([m1, m2, m3, m4])
    db.commit()

    # 4. Officers (Whitelisted Telegram IDs for officer authentication)
    off1 = Officer(
        id="insp-1",
        mahalla_id="m-bogishamol",
        telegram_id=999001,  # Whitelisted Officer Telegram ID
        full_name="Mayor Karimov Rustam Baxtiyorovich",
        rank="IIB Mayori",
        phone="+998 (90) 123-45-67",
        badge_number="IIB-UZ-7842",
        photo_url="/static/images/inspector_rustam.jpg",
        support_point_address="Toshkent sh., Yunusobod t., Amir Temur shoh ko'chasi, 108-uy",
        reception_days="Dushanba, Chorshanba, Shanba (09:00 - 18:00)",
        rating=4.9,
        resolved_count=142,
        is_active=True,
    )
    off2 = Officer(
        id="insp-2",
        mahalla_id="m-oqtepa",
        telegram_id=999002,  # Whitelisted Officer Telegram ID
        full_name="Kapitan Alimov Jasur Qodirovich",
        rank="IIB Kapitani",
        phone="+998 (93) 456-78-90",
        badge_number="IIB-UZ-6190",
        photo_url="/static/images/inspector_jasur.jpg",
        support_point_address="Toshkent sh., Chilonzor t., Muqimiy ko'chasi, 94-uy",
        reception_days="Seshanba, Payshanba, Shanba (09:00 - 18:00)",
        rating=4.8,
        resolved_count=118,
        is_active=True,
    )
    off3 = Officer(
        id="insp-3",
        mahalla_id="m-mustaqillik",
        telegram_id=999003,  # Whitelisted Officer Telegram ID
        full_name="Katta leytenant Umarova Saodat Mansurovna",
        rank="Katta leytenant",
        phone="+998 (97) 321-09-87",
        badge_number="IIB-UZ-8901",
        photo_url="/static/images/inspector_saodat.jpg",
        support_point_address="Toshkent sh., Mirzo Ulug'bek t., Buyuk Ipak Yo'li, 156-uy",
        reception_days="Dushanba - Juma (09:00 - 17:30)",
        rating=5.0,
        resolved_count=96,
        is_active=True,
    )
    db.add_all([off1, off2, off3])
    db.commit()

    # 5. Initial Reports
    rep1 = Report(
        ticket_number="IIB-2026-0418",
        citizen_id=None,
        mahalla_id="m-bogishamol",
        officer_id="insp-1",
        category="night_noise",
        title="Tungi vaqtda avtoturargohda baland musiqa va shovqin",
        description="Ko'p qavatli uyimiz oldidagi avtoturargohda soat 23:30 dan keyin begona avtomobillar to'planib, baland musiqa qo'yib aholi tinchini buzmoqda.",
        address="Amir Temur shoh ko'chasi, 108-uy 3-kirish yo'lagi",
        media_type="text",
        is_anonymous=False,
        status="in_progress",
    )
    rep2 = Report(
        ticket_number="IIB-2026-0419",
        citizen_id=None,
        mahalla_id="m-bogishamol",
        officer_id="insp-1",
        category="traffic",
        title="Maktab oldidagi piyodalar o'tish joyida tezlikni cheklovchi belgi zarur",
        description="Mahallamizdagi 51-maktab oldidagi yo'lda mashinalar juda katta tezlikda harakatlanmoqda. Bolalar xavfsizligi uchun sun'iy notekislik o'rnatishda yordam so'raymiz.",
        address="Shahriston ko'chasi, 51-maktab ro'parasi",
        media_type="text",
        is_anonymous=False,
        status="resolved",
    )
    rep3 = Report(
        ticket_number="IIB-2026-0420",
        citizen_id=None,
        mahalla_id="m-bogishamol",
        officer_id="insp-1",
        category="neighbor_dispute",
        title="Noqonuniy panjara va umumiy yo'lakni to'sib qo'yish",
        description="Qo'shnimiz umumiy piyodalar yo'lagiga ruxsatsiz temir to'siq o'rnatib olgan, yong'in va tez yordam kirishiga xalal bermoqda.",
        address="Bog'ishamol 4-tor ko'chasi, 19-uy",
        media_type="text",
        is_anonymous=True,
        status="new",
    )
    db.add_all([rep1, rep2, rep3])
    db.commit()
    db.close()
