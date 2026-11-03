import React, { useState } from 'react';
import {
  CheckCircle2,
  Clock,
  AlertCircle,
  XCircle,
  Volume2,
  Image as ImageIcon,
  Send,
  Phone,
  User,
  Shield,
  Filter,
  Check,
  TrendingUp,
  MessageSquare,
  Play,
  Pause,
} from 'lucide-react';
import { Appeal, AppealStatus, Inspector } from '../types';
import { CATEGORY_LABELS } from '../data/mockData';
import { triggerHaptic } from '../utils/telegram';

interface InspectorDashboardProps {
  inspector: Inspector;
  appeals: Appeal[];
  onUpdateStatus: (
    appealId: string,
    newStatus: AppealStatus,
    comment?: string,
    responseText?: string
  ) => void;
}

export const InspectorDashboard: React.FC<InspectorDashboardProps> = ({
  inspector,
  appeals,
  onUpdateStatus,
}) => {
  const [statusFilter, setStatusFilter] = useState<'all' | AppealStatus>('all');
  const [activeAppeal, setActiveAppeal] = useState<Appeal | null>(null);
  const [replyText, setReplyText] = useState('');
  const [statusComment, setStatusComment] = useState('');
  const [selectedNextStatus, setSelectedNextStatus] = useState<AppealStatus>('in_progress');
  const [playingAudioId, setPlayingAudioId] = useState<string | null>(null);
  const audioRef = React.useRef<HTMLAudioElement | null>(null);

  // Filter appeals for this inspector
  const filteredAppeals = appeals.filter((app) => {
    if (statusFilter === 'all') return true;
    return app.status === statusFilter;
  });

  // Calculate statistics
  const total = appeals.length;
  const newCount = appeals.filter((a) => a.status === 'new').length;
  const inProgressCount = appeals.filter((a) => a.status === 'in_progress').length;
  const resolvedCount = appeals.filter((a) => a.status === 'resolved').length;
  const resolutionRate = total > 0 ? Math.round((resolvedCount / total) * 100) : 100;

  const handleOpenActionModal = (appeal: Appeal) => {
    triggerHaptic('light');
    setActiveAppeal(appeal);
    setSelectedNextStatus(appeal.status === 'new' ? 'in_progress' : 'resolved');
    setReplyText(appeal.inspectorResponse?.text || '');
    setStatusComment('');
  };

  const handleApplyUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeAppeal) return;

    triggerHaptic('success');
    onUpdateStatus(activeAppeal.id, selectedNextStatus, statusComment, replyText);
    setActiveAppeal(null);
  };

  const handleToggleAudio = (url: string, id: string) => {
    triggerHaptic('light');
    if (playingAudioId === id) {
      if (audioRef.current) audioRef.current.pause();
      setPlayingAudioId(null);
      return;
    }

    if (audioRef.current) audioRef.current.pause();
    const a = new Audio(url);
    audioRef.current = a;
    a.onended = () => setPlayingAudioId(null);
    a.play();
    setPlayingAudioId(id);
  };

  return (
    <div className="space-y-4">
      {/* Officer Header Card */}
      <div className="bg-gradient-to-r from-slate-900 via-sky-950 to-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 text-white shadow-sm">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <img
              src={inspector.photoUrl}
              alt={inspector.fullName}
              referrerPolicy="no-referrer"
              className="w-14 h-14 rounded-xl object-cover object-top border-2 border-sky-400/40 shadow-sm"
            />
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-base text-white">{inspector.fullName}</span>
                <span className="text-[10px] bg-sky-500/20 text-sky-300 font-mono px-2 py-0.5 rounded border border-sky-400/30">
                  {inspector.rank}
                </span>
              </div>
              <div className="text-xs text-slate-300 mt-0.5">
                {inspector.supportPointNumber}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs">
            <span className="text-slate-300">Xizmat aloqasi:</span>
            <span className="font-mono font-semibold text-sky-300">{inspector.phoneNumber}</span>
          </div>
        </div>

        {/* 4-KPI Metric Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mt-4 pt-4 border-t border-slate-800 text-xs">
          <div className="bg-white/5 rounded-xl p-2.5">
            <div className="text-slate-400 text-[11px]">Jami murojaatlar</div>
            <div className="text-xl font-bold font-mono text-white mt-0.5">{total}</div>
          </div>

          <div className="bg-white/5 rounded-xl p-2.5">
            <div className="text-amber-400 text-[11px]">Yangi kelganlar</div>
            <div className="text-xl font-bold font-mono text-amber-300 mt-0.5">{newCount}</div>
          </div>

          <div className="bg-white/5 rounded-xl p-2.5">
            <div className="text-sky-400 text-[11px]">Jarayonda</div>
            <div className="text-xl font-bold font-mono text-sky-300 mt-0.5">{inProgressCount}</div>
          </div>

          <div className="bg-white/5 rounded-xl p-2.5">
            <div className="text-emerald-400 text-[11px]">Hal qilinganlik</div>
            <div className="text-xl font-bold font-mono text-emerald-300 mt-0.5 flex items-center gap-1">
              <span>{resolutionRate}%</span>
              <TrendingUp className="w-3.5 h-3.5" />
            </div>
          </div>
        </div>
      </div>

      {/* Filter Tabs (Functional segmented controls) */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1 p-1 bg-slate-200/80 dark:bg-slate-800/80 rounded-xl text-xs overflow-x-auto no-scrollbar">
          <button
            type="button"
            onClick={() => {
              triggerHaptic('selection');
              setStatusFilter('all');
            }}
            className={`px-3 py-1.5 font-medium rounded-lg transition-colors whitespace-nowrap shrink-0 ${
              statusFilter === 'all'
                ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
            }`}
          >
            Barchasi ({total})
          </button>

          <button
            type="button"
            onClick={() => {
              triggerHaptic('selection');
              setStatusFilter('new');
            }}
            className={`px-3 py-1.5 font-medium rounded-lg transition-colors whitespace-nowrap shrink-0 flex items-center gap-1 ${
              statusFilter === 'new'
                ? 'bg-white dark:bg-slate-700 text-amber-600 dark:text-amber-400 shadow-sm'
                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
            }`}
          >
            <span>Yangi</span>
            {newCount > 0 && (
              <span className="w-4 h-4 rounded-full bg-amber-500 text-white text-[10px] font-bold flex items-center justify-center">
                {newCount}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => {
              triggerHaptic('selection');
              setStatusFilter('in_progress');
            }}
            className={`px-3 py-1.5 font-medium rounded-lg transition-colors whitespace-nowrap shrink-0 ${
              statusFilter === 'in_progress'
                ? 'bg-white dark:bg-slate-700 text-sky-600 dark:text-sky-400 shadow-sm'
                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
            }`}
          >
            Jarayonda ({inProgressCount})
          </button>

          <button
            type="button"
            onClick={() => {
              triggerHaptic('selection');
              setStatusFilter('resolved');
            }}
            className={`px-3 py-1.5 font-medium rounded-lg transition-colors whitespace-nowrap shrink-0 ${
              statusFilter === 'resolved'
                ? 'bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-400 shadow-sm'
                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
            }`}
          >
            Bajarildi ({resolvedCount})
          </button>
        </div>

        <span className="text-xs text-slate-400 hidden sm:inline">
          {filteredAppeals.length} ta xabar
        </span>
      </div>

      {/* Appeals Stream */}
      {filteredAppeals.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-8 text-center">
          <MessageSquare className="w-9 h-9 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
          <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-200">
            Ushbu toifada murojaat yo'q
          </h4>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Yangi xabarlar kelib tushganda avtomatik ravishda ushbu ro'yxatda paydo bo'ladi.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredAppeals.map((appeal) => {
            const cat = CATEGORY_LABELS[appeal.category] || CATEGORY_LABELS.security;
            const timeString = new Date(appeal.createdAt).toLocaleString('uz-UZ', {
              day: 'numeric',
              month: 'short',
              hour: '2-digit',
              minute: '2-digit',
            });

            return (
              <div
                key={appeal.id}
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm hover:border-slate-300 dark:hover:border-slate-700 transition-all space-y-3"
              >
                {/* Top unboxed metadata line */}
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 font-mono text-[11px]">
                    <span className="font-bold text-sky-700 dark:text-sky-300">{appeal.ticketNumber}</span>
                    <span aria-hidden="true">·</span>
                    <span>{timeString}</span>
                    <span aria-hidden="true">·</span>
                    <span className="font-sans font-medium text-slate-700 dark:text-slate-300">
                      {cat.label}
                    </span>
                  </div>

                  <div>
                    {appeal.status === 'new' && (
                      <span className="text-xs font-semibold text-amber-600 dark:text-amber-400 flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" />
                        <span>Yangi</span>
                      </span>
                    )}
                    {appeal.status === 'in_progress' && (
                      <span className="text-xs font-semibold text-sky-600 dark:text-sky-400 flex items-center gap-1">
                        <AlertCircle className="w-3.5 h-3.5" />
                        <span>Jarayonda</span>
                      </span>
                    )}
                    {appeal.status === 'resolved' && (
                      <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Bajarildi</span>
                      </span>
                    )}
                    {appeal.status === 'rejected' && (
                      <span className="text-xs font-semibold text-rose-600 dark:text-rose-400 flex items-center gap-1">
                        <XCircle className="w-3.5 h-3.5" />
                        <span>Rad etildi</span>
                      </span>
                    )}
                  </div>
                </div>

                {/* Citizen Info & Title */}
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white leading-snug">
                      {appeal.title}
                    </h4>
                    <p className="text-xs text-slate-700 dark:text-slate-300 mt-1 leading-relaxed">
                      {appeal.description}
                    </p>
                  </div>
                </div>

                {/* Citizen Information Row */}
                <div className="bg-slate-50 dark:bg-slate-800/50 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 flex items-center justify-center font-bold text-xs shrink-0">
                      {appeal.isAnonymous ? '?' : <User className="w-4 h-4" />}
                    </div>
                    <div>
                      <div className="font-semibold text-slate-900 dark:text-white">
                        {appeal.isAnonymous ? 'Anonim fuqaro' : appeal.citizen.fullName}
                      </div>
                      <div className="text-[11px] text-slate-500">
                        Manzil: {appeal.address}
                      </div>
                    </div>
                  </div>

                  {!appeal.isAnonymous && appeal.citizen.phone && (
                    <a
                      href={`tel:${appeal.citizen.phone.replace(/[^\d+]/g, '')}`}
                      className="px-2.5 py-1 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-emerald-600 dark:text-emerald-400 rounded-lg text-xs font-medium flex items-center gap-1 hover:bg-slate-50"
                      title="Fuqaro bilan bog'lanish"
                    >
                      <Phone className="w-3 h-3" />
                      <span>{appeal.citizen.phone}</span>
                    </a>
                  )}
                </div>

                {/* Audio voice message player for inspector */}
                {appeal.audioUrl && (
                  <div className="bg-rose-50/60 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 p-2.5 rounded-xl flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleToggleAudio(appeal.audioUrl!, appeal.id)}
                        className="w-7 h-7 rounded-full bg-rose-600 text-white flex items-center justify-center shadow-sm"
                      >
                        {playingAudioId === appeal.id ? (
                          <Pause className="w-3 h-3 fill-current" />
                        ) : (
                          <Play className="w-3 h-3 fill-current ml-0.5" />
                        )}
                      </button>
                      <div className="text-xs font-semibold text-slate-900 dark:text-white">
                        Fuqaro ovozli xabari ({appeal.audioDuration || 15}s)
                      </div>
                    </div>
                    <span className="text-[11px] text-rose-600 dark:text-rose-400 font-mono">
                      Web Audio
                    </span>
                  </div>
                )}

                {/* Media attachments */}
                {appeal.mediaUrls && appeal.mediaUrls.length > 0 && (
                  <div className="flex items-center gap-2 overflow-x-auto pb-1">
                    {appeal.mediaUrls.map((url, idx) => (
                      <img
                        key={idx}
                        src={url}
                        alt="Fuqaro ilovasi"
                        className="w-16 h-16 rounded-lg object-cover border border-slate-200 dark:border-slate-700"
                      />
                    ))}
                  </div>
                )}

                {/* Inspector Response block if already replied */}
                {appeal.inspectorResponse && (
                  <div className="bg-sky-50/70 dark:bg-sky-950/40 border border-sky-100 dark:border-sky-900/40 p-2.5 rounded-xl text-xs space-y-1">
                    <div className="font-semibold text-sky-900 dark:text-sky-200">
                      Yuborilgan javob xati:
                    </div>
                    <p className="text-slate-700 dark:text-slate-300 text-[11px]">
                      {appeal.inspectorResponse.text}
                    </p>
                  </div>
                )}

                {/* Action button */}
                <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex justify-end">
                  <button
                    type="button"
                    onClick={() => handleOpenActionModal(appeal)}
                    className="px-4 py-2 bg-slate-900 dark:bg-sky-600 hover:bg-slate-800 dark:hover:bg-sky-700 text-white rounded-xl text-xs font-semibold shadow-sm transition-transform active:scale-95 flex items-center gap-1.5"
                  >
                    <span>Statusni o'zgartirish / Javob yozish</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Inspector Update Modal */}
      {activeAppeal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-mono text-sky-600 font-bold">
                  {activeAppeal.ticketNumber}
                </span>
                <h3 className="text-base font-bold text-slate-900 dark:text-white leading-tight">
                  Murojaatni qayta ishlash
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setActiveAppeal(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleApplyUpdate} className="p-4 overflow-y-auto space-y-4 text-xs">
              {/* Select Next Status */}
              <div>
                <label className="block font-bold text-slate-800 dark:text-slate-200 mb-1.5">
                  Murojaatning yangi holatini belgilang:
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      triggerHaptic('selection');
                      setSelectedNextStatus('in_progress');
                    }}
                    className={`p-2.5 rounded-xl border text-center transition-all ${
                      selectedNextStatus === 'in_progress'
                        ? 'border-sky-600 bg-sky-50 dark:bg-sky-950/40 text-sky-900 dark:text-sky-100 font-bold ring-1 ring-sky-600'
                        : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    Jarayonda
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      triggerHaptic('selection');
                      setSelectedNextStatus('resolved');
                    }}
                    className={`p-2.5 rounded-xl border text-center transition-all ${
                      selectedNextStatus === 'resolved'
                        ? 'border-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-100 font-bold ring-1 ring-emerald-600'
                        : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    Bajarildi
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      triggerHaptic('selection');
                      setSelectedNextStatus('rejected');
                    }}
                    className={`p-2.5 rounded-xl border text-center transition-all ${
                      selectedNextStatus === 'rejected'
                        ? 'border-rose-600 bg-rose-50 dark:bg-rose-950/40 text-rose-900 dark:text-rose-100 font-bold ring-1 ring-rose-600'
                        : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    Rad etildi
                  </button>
                </div>
              </div>

              {/* Status Change Comment */}
              <div>
                <label className="block font-bold text-slate-800 dark:text-slate-200 mb-1">
                  Holat o'zgarishi sababi / Ichki izoh:
                </label>
                <input
                  type="text"
                  value={statusComment}
                  onChange={(e) => setStatusComment(e.target.value)}
                  placeholder="Masalan: Hududga xodim biriktirildi va suhbat o'tkazildi."
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 text-slate-900 dark:text-white focus:ring-2 focus:ring-sky-500 focus:outline-none"
                />
              </div>

              {/* Official Response for Citizen */}
              <div>
                <label className="block font-bold text-slate-800 dark:text-slate-200 mb-1">
                  Fuqaroga yuboriladigan rasmiy javob xati:
                </label>
                <textarea
                  rows={4}
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  placeholder="Hurmatli fuqaro! Murojaatingiz o'rganib chiqildi..."
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl p-3 text-slate-900 dark:text-white focus:ring-2 focus:ring-sky-500 focus:outline-none"
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  Ushbu javob fuqaroning Telegram botiga xabarnoma sifatida darhol yetkaziladi.
                </p>
              </div>

              {/* Modal Buttons */}
              <div className="pt-2 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setActiveAppeal(null)}
                  className="px-4 py-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl font-semibold"
                >
                  Bekor qilish
                </button>

                <button
                  type="submit"
                  className="px-5 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-xl font-semibold shadow transition-all active:scale-95"
                >
                  Tasdiqlash va saqlash
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
