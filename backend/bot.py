import os
import asyncio
import logging
from typing import Optional
from aiogram import Bot, Dispatcher, types, F
from aiogram.filters import CommandStart, Command
from aiogram.types import (
    InlineKeyboardMarkup,
    InlineKeyboardButton,
    ReplyKeyboardMarkup,
    KeyboardButton,
    WebAppInfo,
    MenuButtonWebApp,
)

BOT_TOKEN = os.getenv("BOT_TOKEN", "9140724828:AAH_VOd8btfQl7yb8udpZD215VCTXQ9vCW8")
WEBAPP_URL = os.getenv("WEBAPP_URL", "https://ais-dev-xwgc46i6x3cjompwnlzi4o-785683973863.asia-northeast1.run.app")

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

bot = Bot(token=BOT_TOKEN)
dp = Dispatcher()

# Pre-whitelisted officer IDs (can also be queried from DB)
OFFICER_TELEGRAM_IDS = {999001, 999002, 999003}


# Dynamic menu button setup
async def setup_bot_menu():
    try:
        await bot.set_chat_menu_button(
            menu_button=MenuButtonWebApp(
                text="Murojaat 🌐",
                web_app=WebAppInfo(url=WEBAPP_URL),
            )
        )
    except Exception as e:
        logger.warning(f"Menyu tugmasini sozlash: {e}")


# Command: /start (Role Identification Gateway)
@dp.message(CommandStart())
async def cmd_start(message: types.Message):
    user_id = message.from_user.id
    user_name = message.from_user.first_name

    # Check if user is a police officer
    if user_id in OFFICER_TELEGRAM_IDS:
        officer_keyboard = InlineKeyboardMarkup(
            inline_keyboard=[
                [
                    InlineKeyboardButton(
                        text="👮‍♂️ Xizmat Paneli (Inspektor Dashboard)",
                        web_app=WebAppInfo(url=f"{WEBAPP_URL}?role=officer&officer_id=insp-1"),
                    )
                ]
            ]
        )
        await message.answer(
            f"Hurmatli <b>{user_name}</b> (Profilaktika inspektori)!\n\n"
            "Siz tizimga <b>Xodim / Inspektor</b> sifatida muvaffaqiyatli aniqlandingiz.\n"
            "Mahallangiz bo'yicha kelib tushgan murojaatlarni ko'rish, fuqarolarning audio/video xabarlarini "
            "eshitish va rasmiy javob berish uchun xizmat panelini oching:",
            parse_mode="HTML",
            reply_markup=officer_keyboard,
        )
        return

    # Regular Citizen Flow
    citizen_keyboard = InlineKeyboardMarkup(
        inline_keyboard=[
            [
                InlineKeyboardButton(
                    text="Murojaat yuborish 🌐",
                    web_app=WebAppInfo(url=WEBAPP_URL),
                )
            ],
            [
                InlineKeyboardButton(
                    text="📍 Mahallani tanlash",
                    web_app=WebAppInfo(url=f"{WEBAPP_URL}?step=location"),
                )
            ],
        ]
    )

    reply_keyboard = ReplyKeyboardMarkup(
        keyboard=[
            [KeyboardButton(text="🚨 Inspektorga Murojaat", web_app=WebAppInfo(url=WEBAPP_URL))],
            [KeyboardButton(text="📍 Mahalla va Hudud"), KeyboardButton(text="ℹ️ Yordam")],
        ],
        resize_keyboard=True,
    )

    await message.answer(
        f"Assalomu alaykum, <b>{user_name}</b>!\n\n"
        "<b>'Mening Inspektorim'</b> — mahalla profilaktika inspektori bilan to'g'ridan-to'g'ri "
        "aloqa o'rnatuvchi rasmiy platformaga xush kelibsiz.\n\n"
        "Platformaga birinchi bor kirayotgan bo'lsangiz, yashash mahallangizni tanlang "
        "va inspektoringizga audio, video yoki matnli murojaat yo'llang:",
        parse_mode="HTML",
        reply_markup=citizen_keyboard,
    )


# Command: /change_area
@dp.message(Command("change_area"))
@dp.message(F.text == "📍 Mahalla va Hudud")
async def cmd_change_area(message: types.Message):
    keyboard = InlineKeyboardMarkup(
        inline_keyboard=[
            [
                InlineKeyboardButton(
                    text="📍 Hududni tanlash / O'zgartirish",
                    web_app=WebAppInfo(url=f"{WEBAPP_URL}?step=location"),
                )
            ]
        ]
    )
    await message.answer(
        "Yashash joyingizni o'zgartirish yoki yaqin atrofdagi tayanch punktini "
        "GPS orqali aniqlash uchun quyidagi tugmani bosing:",
        reply_markup=keyboard,
    )


# Command: /report
@dp.message(Command("report"))
async def cmd_report(message: types.Message):
    keyboard = InlineKeyboardMarkup(
        inline_keyboard=[
            [
                InlineKeyboardButton(
                    text="✍️ Yangi murojaat shakli",
                    web_app=WebAppInfo(url=f"{WEBAPP_URL}?step=citizen"),
                )
            ]
        ]
    )
    await message.answer(
        "Profilaktika inspektoriga xabar, audio yoki surat jo'natish uchun shaklni oching:",
        reply_markup=keyboard,
    )


# Command: /admin (Officer Dashboard direct command)
@dp.message(Command("admin"))
async def cmd_admin(message: types.Message):
    keyboard = InlineKeyboardMarkup(
        inline_keyboard=[
            [
                InlineKeyboardButton(
                    text="📋 Inspektor Dashboardini ochish",
                    web_app=WebAppInfo(url=f"{WEBAPP_URL}?role=officer"),
                )
            ]
        ]
    )
    await message.answer(
        "👮‍♂️ <b>Profilaktika inspektorlari uchun xizmat maydoni:</b>\n\n"
        "Murojaatlarni ko'rish va fuqarolarga javob berish uchun dashboardni oching:",
        parse_mode="HTML",
        reply_markup=keyboard,
    )


# WebApp sendData listener
@dp.message(F.web_app_data)
async def handle_webapp_data(message: types.Message):
    data_str = message.web_app_data.data
    await message.answer(
        f"✅ <b>Murojaatingiz tizimga qabul qilindi!</b>\n\n"
        f"Murojaat kodi: <code>{data_str}</code>\n\n"
        "Profilaktika inspektori zudlik bilan holatni ko'rib chiqadi.",
        parse_mode="HTML",
    )


# Notification Helper: Dispatch message to Officer
async def notify_officer_new_report(
    officer_chat_id: int,
    ticket_number: str,
    mahalla_name: str,
    category: str,
    title: str,
    description: str,
    address: str,
    is_anonymous: bool,
    citizen_name: Optional[str] = None,
    citizen_phone: Optional[str] = None,
    audio_url: Optional[str] = None,
):
    sender = "🔒 Anonim fuqaro" if is_anonymous else f"{citizen_name} ({citizen_phone or 'telefon ko\'rsatilmagan'})"
    text = (
        f"🚨 <b>YANGI MUROJAAT KELIB TUSHDI!</b>\n\n"
        f"📋 <b>Chipta raqami:</b> <code>#{ticket_number}</code>\n"
        f"📍 <b>Mahalla:</b> {mahalla_name}\n"
        f"🏷 <b>Toifa:</b> {category}\n"
        f"👤 <b>Yuboruvchi:</b> {sender}\n"
        f"🏠 <b>Aniq manzil:</b> {address}\n\n"
        f"📌 <b>Mavzu:</b> {title}\n"
        f"💬 <b>Tavsif:</b>\n<i>{description}</i>\n"
    )

    if audio_url:
        text += f"\n🎙 <b>Ilova:</b> Ovozli xabar biriktirilgan (Admin panelda eshiting)"

    admin_keyboard = InlineKeyboardMarkup(
        inline_keyboard=[
            [
                InlineKeyboardButton(
                    text="📋 Ko'rish va Javob berish",
                    web_app=WebAppInfo(url=f"{WEBAPP_URL}?role=officer&ticket={ticket_number}"),
                )
            ]
        ]
    )

    await bot.send_message(
        chat_id=officer_chat_id,
        text=text,
        parse_mode="HTML",
        reply_markup=admin_keyboard,
    )


# Notification Helper: Dispatch message back to Citizen
async def notify_citizen_status_update(
    citizen_chat_id: int,
    ticket_number: str,
    new_status: str,
    officer_name: str,
    reply_text: str,
):
    status_icon = "✅" if new_status == "Hal qilindi" else "🔄" if new_status == "Jarayonda" else "❌"
    text = (
        f"🔔 <b>Hurmatli fuqaro!</b>\n\n"
        f"Sizning <code>#{ticket_number}</code> raqamli murojaatingiz holati yangilandi:\n\n"
        f"{status_icon} <b>Holat:</b> {new_status}\n"
        f"👮‍♂️ <b>Ijrochi:</b> {officer_name}\n\n"
        f"💬 <b>Inspektor rasmiy munosabati:</b>\n"
        f"<i>\"{reply_text}\"</i>\n\n"
        f"Xavfsizlik va osoyishtalikka qo'shgan hissangiz uchun rahmat!"
    )

    await bot.send_message(
        chat_id=citizen_chat_id,
        text=text,
        parse_mode="HTML",
    )


async def main():
    await setup_bot_menu()
    logger.info("Mening Inspektorim Telegram boti (aiogram 3) ishga tushdi!")
    await dp.start_polling(bot)


if __name__ == "__main__":
    asyncio.run(main())
