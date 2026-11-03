import React, { useState } from 'react';
import {
  Send,
  Bot,
  User,
  Shield,
  Smartphone,
  ExternalLink,
  RefreshCw,
  CheckCircle,
  Bell,
  Sparkles,
} from 'lucide-react';
import { Appeal, Inspector, TelegramUser } from '../types';
import { triggerHaptic } from '../utils/telegram';

interface TelegramBotSimulatorProps {
  currentUser: TelegramUser;
  inspector: Inspector;
  recentAppeals: Appeal[];
  onOpenMiniApp: () => void;
}

interface SimulatedMessage {
  id: string;
  sender: 'bot' | 'user' | 'system';
  target: 'citizen' | 'inspector';
  text: string;
  timestamp: string;
  hasButton?: boolean;
  buttonLabel?: string;
}

export const TelegramBotSimulator: React.FC<TelegramBotSimulatorProps> = ({
  currentUser,
  inspector,
  recentAppeals,
  onOpenMiniApp,
}) => {
  const [activeChat, setActiveChat] = useState<'citizen_bot' | 'inspector_bot'>('citizen_bot');
  const [inputMessage, setInputMessage] = useState('');

  const [messages, setMessages] = useState<SimulatedMessage[]>([
    {
      id: 'm-1',
      sender: 'user',
      target: 'citizen',
      text: '/start',
      timestamp: 'Bugun, 09:30',
    },
    {
      id: 'm-2',
      sender: 'bot',
      target: 'citizen',
      text: `Assalomu alaykum, ${currentUser.first_name}!\n\n"Mening Inspektorim" mahalla huquq-tartibot Telegram Mini App tizimiga xush kelibsiz.\n\nSiz bu platforma orqali o'z mahallangiz profilaktika inspektorini bilishingiz, to'g'ridan-to'g'ri bog'lanishingiz hamda matnli, audio yoki foto murojaat yuborishingiz mumkin.`,
      timestamp: 'Bugun, 09:30',
      hasButton: true,
      buttonLabel: '👮‍♂️ Mening Inspektorim (Mini App)',
    },
    {
      id: 'm-3',
      sender: 'bot',
      target: 'inspector',
      text: `🚨 YANGI MUROJAAT KELIB TUSHDI!\n\n📋 Raqam: #IIB-2026-0418\n📍 Mahalla: Bog'ishamol mahallasi\n👤 Fuqaro: Sanjarbek Abdullayev (+998 90 987-65-43)\n🏷 Toifa: Tungi shovqin va osoyishtalik\n\n💬 Tavsif: "Ko'p qavatli uyimiz oldidagi avtoturargohda soat 23:30 dan keyin begona avtomobillar to'planib, baland musiqa qo'yib aholi tinchini buzmoqda..."\n\nIltimos, Mini App orqali murojaatni qabul qiling.`,
      timestamp: 'Bugun, 14:35',
      hasButton: true,
      buttonLabel: '📋 Murojaatni ko\'rish',
    },
  ]);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputMessage.trim()) return;

    triggerHaptic('light');
    const userMsg: SimulatedMessage = {
      id: `usr-${Date.now()}`,
      sender: 'user',
      target: activeChat === 'citizen_bot' ? 'citizen' : 'inspector',
      text: inputMessage.trim(),
      timestamp: new Date().toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputMessage('');

    // Simulate intelligent bot reply
    setTimeout(() => {
      triggerHaptic('success');
      let botResponse = '';
      if (userMsg.text === '/start') {
        botResponse = `Xush kelibsiz! Quyidagi tugma orqali profilingiz va mahallangiz inspektorini ko'rishingiz mumkin.`;
      } else if (userMsg.text.toLowerCase().includes('inspektor')) {
        botResponse = `Sizning mahallangiz profilaktika inspektori:\n👮‍♂️ ${inspector.fullName}\n📞 Xizmat telefoni: ${inspector.phoneNumber}\n📍 Tayanch punkti: ${inspector.supportPointNumber}`;
      } else {
        botResponse = `Xabaringiz qabul qilindi. Rasmiy murojaat qoldirish yoki statusni tekshirish uchun "Mening Inspektorim" Mini App platformasini oching.`;
      }

      const botMsg: SimulatedMessage = {
        id: `bot-${Date.now()}`,
        sender: 'bot',
        target: activeChat === 'citizen_bot' ? 'citizen' : 'inspector',
        text: botResponse,
        timestamp: new Date().toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' }),
        hasButton: true,
        buttonLabel: '👮‍♂️ Mening Inspektorim (Mini App)',
      };
      setMessages((prev) => [...prev, botMsg]);
    }, 600);
  };

  const currentChatMessages = messages.filter((m) =>
    activeChat === 'citizen_bot' ? m.target === 'citizen' : m.target === 'inspector'
  );

  return (
    <div className="space-y-4">
      {/* Header Info */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Bot className="w-5 h-5 text-sky-600" />
            <span>Telegram Bot Integratsiyasi Simulyatori</span>
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Foydalanuvchi va inspektor Telegram botida bildirishnomalar qanday ko'rinishini jonli sinab ko'ring
          </p>
        </div>

        {/* Chat Switcher */}
        <div className="flex items-center gap-1 p-1 bg-slate-200/80 dark:bg-slate-800 rounded-xl text-xs">
          <button
            type="button"
            onClick={() => {
              triggerHaptic('selection');
              setActiveChat('citizen_bot');
            }}
            className={`px-3 py-1.5 font-semibold rounded-lg transition-colors flex items-center gap-1.5 ${
              activeChat === 'citizen_bot'
                ? 'bg-white dark:bg-slate-700 text-sky-700 dark:text-sky-300 shadow-sm'
                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
            }`}
          >
            <User className="w-3.5 h-3.5" />
            <span>Fuqaro Telegrami</span>
          </button>

          <button
            type="button"
            onClick={() => {
              triggerHaptic('selection');
              setActiveChat('inspector_bot');
            }}
            className={`px-3 py-1.5 font-semibold rounded-lg transition-colors flex items-center gap-1.5 ${
              activeChat === 'inspector_bot'
                ? 'bg-white dark:bg-slate-700 text-sky-700 dark:text-sky-300 shadow-sm'
                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
            }`}
          >
            <Shield className="w-3.5 h-3.5" />
            <span>Inspektor Telegrami</span>
          </button>
        </div>
      </div>

      {/* Telegram Chat Frame (Mobile Mockup style) */}
      <div className="max-w-2xl mx-auto bg-slate-900 border border-slate-700 rounded-3xl overflow-hidden shadow-2xl">
        {/* Telegram Chat Header Bar */}
        <div className="bg-[#242f3d] px-4 py-3 flex items-center justify-between text-white border-b border-slate-700/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-sky-600 text-white flex items-center justify-center font-bold">
              {activeChat === 'citizen_bot' ? '👮‍♂️' : '⚡'}
            </div>
            <div>
              <div className="font-bold text-sm text-white">
                {activeChat === 'citizen_bot'
                  ? 'Mening Inspektorim | Rasmiy Bot'
                  : 'IIB Profilaktika Xizmati Bildirishnomalari'}
              </div>
              <div className="text-[11px] text-sky-400">bot · online</div>
            </div>
          </div>

          <div className="flex items-center gap-1.5 text-xs text-slate-300">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            <span>Ulangan</span>
          </div>
        </div>

        {/* Telegram Chat Messages Container */}
        <div className="bg-[#0e1621] p-4 space-y-3 min-h-[360px] max-h-[460px] overflow-y-auto">
          {currentChatMessages.map((msg) => {
            const isUser = msg.sender === 'user';
            return (
              <div
                key={msg.id}
                className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} animate-in fade-in`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl p-3 text-xs leading-relaxed whitespace-pre-wrap ${
                    isUser
                      ? 'bg-[#2b5278] text-white rounded-br-none'
                      : 'bg-[#182533] text-slate-100 rounded-bl-none border border-slate-700/50'
                  }`}
                >
                  {msg.text}

                  {/* Telegram WebApp Inline Button */}
                  {msg.hasButton && (
                    <div className="mt-2.5 pt-2 border-t border-white/10">
                      <button
                        type="button"
                        onClick={() => {
                          triggerHaptic('medium');
                          onOpenMiniApp();
                        }}
                        className="w-full py-2 px-3 bg-sky-600 hover:bg-sky-500 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-2 shadow transition-all active:scale-95"
                      >
                        <Smartphone className="w-3.5 h-3.5" />
                        <span>{msg.buttonLabel}</span>
                      </button>
                    </div>
                  )}

                  <div className="text-[9px] text-right text-slate-400 mt-1">{msg.timestamp}</div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Telegram Message Input Bar */}
        <form
          onSubmit={handleSendMessage}
          className="bg-[#17212b] p-2.5 border-t border-slate-800 flex items-center gap-2"
        >
          <input
            type="text"
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            placeholder="Buyruq yoki xabar yozing (/start, inspektor...)"
            className="flex-1 bg-[#242f3d] border border-transparent rounded-xl px-3 py-2 text-xs text-white placeholder:text-slate-400 focus:outline-none focus:border-sky-500"
          />
          <button
            type="submit"
            className="w-9 h-9 rounded-xl bg-sky-600 hover:bg-sky-500 text-white flex items-center justify-center transition-transform active:scale-90"
            title="Xabar yuborish"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>

      {/* Simulator Help Hints */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
        <div className="bg-sky-50 dark:bg-sky-950/40 border border-sky-100 dark:border-sky-900/40 p-3 rounded-xl">
          <div className="font-bold text-sky-900 dark:text-sky-200 mb-1">
            💡 Bot orqali Mini App qanday ishga tushiriladi?
          </div>
          <p className="text-slate-600 dark:text-slate-300 text-[11px] leading-relaxed">
            Telegram botida WebApp ochish uchun InlineKeyboardButton(web_app=WebAppInfo(url="...")) ishlatiladi.
            Mini App ochilganda foydalanuvchi ma'lumotlari (Telegram ID, ism, rasm) avtomatik Telegram WebApp SDK orqali uzatiladi.
          </p>
        </div>

        <div className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-100 dark:border-emerald-900/40 p-3 rounded-xl">
          <div className="font-bold text-emerald-900 dark:text-emerald-200 mb-1">
            ⚡ Inspektorga bildirishnoma borish mexanizmi:
          </div>
          <p className="text-slate-600 dark:text-slate-300 text-[11px] leading-relaxed">
            Fuqaro Mini App orqali murojaat yuborganda backend darhol Telegram Bot API `sendMessage` yoki `sendVoice` metodi orqali biriktirilgan inspektorning Telegram chatiga to'liq ma'lumotni yetkazadi.
          </p>
        </div>
      </div>
    </div>
  );
};
