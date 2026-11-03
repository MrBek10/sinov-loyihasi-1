import React, { useState, useMemo } from 'react';
import {
  Clock,
  CheckCircle2,
  AlertCircle,
  Volume2,
  Image as ImageIcon,
  ChevronRight,
  ShieldAlert,
  MessageSquare,
  Play,
  Pause,
  Filter,
  Calendar,
  X,
  RotateCcw,
} from 'lucide-react';
import { Appeal, AppealCategory, AppealStatus } from '../types';
import { CATEGORY_LABELS } from '../data/mockData';
import { triggerHaptic } from '../utils/telegram';

interface CitizenAppealsProps {
  appeals: Appeal[];
  onSelectAppeal?: (appeal: Appeal) => void;
  onNewAppealClick: () => void;
}

type DateRangeFilter = 'all' | 'today' | 'week' | 'month';

export const CitizenAppeals: React.FC<CitizenAppealsProps> = ({
  appeals,
  onNewAppealClick,
}) => {
  const [selectedAppeal, setSelectedAppeal] = useState<Appeal | null>(null);
  const [playingAudioId, setPlayingAudioId] = useState<string | null>(null);
  const audioInstanceRef = React.useRef<HTMLAudioElement | null>(null);

  // New Filters State: Category and Date Range
  const [categoryFilter, setCategoryFilter] = useState<'all' | AppealCategory>('all');
  const [dateFilter, setDateFilter] = useState<DateRangeFilter>('all');

  const getStatusBadge = (status: AppealStatus) => {
    switch (status) {
      case 'new':
        return (
          <span className="text-xs font-semibold text-amber-600 dark:text-amber-400 flex items-center gap-1">
            <Clock className="w-3.5 h-3.5" />
            <span>Yangi (ko'rib chiqilmoqda)</span>
          </span>
        );
      case 'in_progress':
        return (
          <span className="text-xs font-semibold text-sky-600 dark:text-sky-400 flex items-center gap-1">
            <AlertCircle className="w-3.5 h-3.5" />
            <span>Jarayonda (o'rganilmoqda)</span>
          </span>
        );
      case 'resolved':
        return (
          <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Bajarildi (ijrosi ta'minlandi)</span>
          </span>
        );
      case 'rejected':
        return (
          <span className="text-xs font-semibold text-rose-600 dark:text-rose-400 flex items-center gap-1">
            <ShieldAlert className="w-3.5 h-3.5" />
            <span>Rad etildi / Asossiz</span>
          </span>
        );
    }
  };

  const handleTogglePlayAudio = (url: string, id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    triggerHaptic('light');

    if (playingAudioId === id) {
      if (audioInstanceRef.current) {
        audioInstanceRef.current.pause();
      }
      setPlayingAudioId(null);
      return;
    }

    if (audioInstanceRef.current) {
      audioInstanceRef.current.pause();
    }

    const audio = new Audio(url);
    audioInstanceRef.current = audio;
    audio.onended = () => setPlayingAudioId(null);
    audio.play();
    setPlayingAudioId(id);
  };

  // Filtered appeals computation based on category and date range
  const filteredAppeals = useMemo(() => {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const sevenDaysAgo = now.getTime() - 7 * 24 * 60 * 60 * 1000;
    const thirtyDaysAgo = now.getTime() - 30 * 24 * 60 * 60 * 1000;

    return appeals.filter((appeal) => {
      // 1. Category filter
      if (categoryFilter !== 'all' && appeal.category !== categoryFilter) {
        return false;
      }

      // 2. Date range filter
      if (dateFilter !== 'all') {
        const appealTime = new Date(appeal.createdAt).getTime();
        if (dateFilter === 'today' && appealTime < startOfToday) {
          return false;
        }
        if (dateFilter === 'week' && appealTime < sevenDaysAgo) {
          return false;
        }
        if (dateFilter === 'month' && appealTime < thirtyDaysAgo) {
          return false;
        }
      }

      return true;
    });
  }, [appeals, categoryFilter, dateFilter]);

  const hasActiveFilters = categoryFilter !== 'all' || dateFilter !== 'all';

  const resetFilters = () => {
    triggerHaptic('selection');
    setCategoryFilter('all');
    setDateFilter('all');
  };

  return (
    <div className="space-y-4">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-base font-bold text-slate-900 dark:text-white">
            Mening Murojaatlarim
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Profilaktika inspektoriga yuborilgan xabarlaringiz tarixi va javoblari
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            triggerHaptic('selection');
            onNewAppealClick();
          }}
          className="px-3.5 py-1.5 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-xs font-semibold transition-all shadow-sm active:scale-95 flex items-center gap-1.5 shrink-0"
        >
          <span>+ Yangi murojaat</span>
        </button>
      </div>

      {/* FILTER BAR: Date Range & Category Selectors */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-3.5 shadow-sm space-y-3">
        {/* Date Range Tabs */}
        <div>
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mb-1.5">
            <span className="font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5 text-xs">
              <Calendar className="w-3.5 h-3.5 text-sky-600" />
              <span>Sana bo'yicha filter:</span>
            </span>

            {hasActiveFilters && (
              <button
                type="button"
                onClick={resetFilters}
                className="text-[11px] text-rose-600 dark:text-rose-400 hover:underline flex items-center gap-1 font-medium"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Filtrlarni tozalash</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-1 overflow-x-auto no-scrollbar text-xs">
            {(
              [
                { id: 'all', label: 'Barcha vaqt' },
                { id: 'today', label: 'Bugun' },
                { id: 'week', label: "So'nggi 7 kun" },
                { id: 'month', label: 'Shu oy (30 kun)' },
              ] as { id: DateRangeFilter; label: string }[]
            ).map((item) => {
              const isActive = dateFilter === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    triggerHaptic('selection');
                    setDateFilter(item.id);
                  }}
                  className={`px-3 py-1.5 rounded-lg font-medium transition-colors whitespace-nowrap shrink-0 text-xs ${
                    isActive
                      ? 'bg-slate-900 dark:bg-sky-600 text-white shadow-xs font-semibold'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-slate-900'
                  }`}
                >
                  {item.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Category Horizontal Pills */}
        <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
          <div className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
            <Filter className="w-3.5 h-3.5 text-sky-600" />
            <span>Toifa bo'yicha filter:</span>
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1 text-xs">
            <button
              type="button"
              onClick={() => {
                triggerHaptic('selection');
                setCategoryFilter('all');
              }}
              className={`px-3 py-1 rounded-lg font-medium transition-colors whitespace-nowrap shrink-0 text-[11px] ${
                categoryFilter === 'all'
                  ? 'bg-sky-600 text-white font-semibold shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-slate-900'
              }`}
            >
              Barcha toifalar ({appeals.length})
            </button>

            {(Object.keys(CATEGORY_LABELS) as AppealCategory[]).map((catKey) => {
              const cat = CATEGORY_LABELS[catKey];
              const countInCat = appeals.filter((a) => a.category === catKey).length;
              const isSelected = categoryFilter === catKey;

              return (
                <button
                  key={catKey}
                  type="button"
                  onClick={() => {
                    triggerHaptic('selection');
                    setCategoryFilter(catKey);
                  }}
                  className={`px-3 py-1 rounded-lg font-medium transition-colors whitespace-nowrap shrink-0 text-[11px] flex items-center gap-1 ${
                    isSelected
                      ? 'bg-sky-600 text-white font-semibold shadow-xs'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-slate-900'
                  }`}
                >
                  <span>{cat.label}</span>
                  {countInCat > 0 && (
                    <span className={`text-[10px] font-mono px-1 rounded ${isSelected ? 'bg-white/20 text-white' : 'text-slate-400'}`}>
                      {countInCat}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Filter Results Summary Counter */}
        <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
          <span>Topilgan natijalar: <strong className="text-slate-700 dark:text-slate-200">{filteredAppeals.length} ta</strong></span>
          {hasActiveFilters && (
            <span className="text-sky-600 dark:text-sky-400">Filtrlangan</span>
          )}
        </div>
      </div>

      {/* Appeals List */}
      {filteredAppeals.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-8 text-center space-y-3">
          <MessageSquare className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto" />
          <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-200">
            {hasActiveFilters ? "Tanlangan filtrlar bo'yicha murojaat topilmadi" : "Hozircha murojaatlar yo'q"}
          </h4>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xs mx-auto">
            {hasActiveFilters
              ? "Boshqa toifa yoki sana oralig'ini tanlab ko'ring yoki filtrlarni tozalang."
              : "Mahallangizdagi muammo bo'yicha profilaktika inspektoriga xabar qoldiring."}
          </p>

          {hasActiveFilters ? (
            <button
              type="button"
              onClick={resetFilters}
              className="px-4 py-2 bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-200 text-xs font-semibold rounded-xl hover:bg-slate-300"
            >
              Filtrlarni bekor qilish
            </button>
          ) : (
            <button
              type="button"
              onClick={onNewAppealClick}
              className="px-4 py-2 bg-sky-600 text-white text-xs font-semibold rounded-xl hover:bg-sky-700"
            >
              Birinchi murojaatni yuborish
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {filteredAppeals.map((appeal) => {
            const categoryInfo = CATEGORY_LABELS[appeal.category] || CATEGORY_LABELS.security;
            const formattedDate = new Date(appeal.createdAt).toLocaleDateString('uz-UZ', {
              day: 'numeric',
              month: 'short',
              hour: '2-digit',
              minute: '2-digit',
            });

            return (
              <div
                key={appeal.id}
                onClick={() => {
                  triggerHaptic('light');
                  setSelectedAppeal(appeal);
                }}
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-sky-300 dark:hover:border-sky-800 rounded-2xl p-4 transition-all cursor-pointer shadow-sm relative group"
              >
                {/* Top unboxed metadata line */}
                <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mb-2">
                  <div className="flex items-center gap-1.5 font-mono text-[11px] font-semibold text-sky-700 dark:text-sky-300">
                    <span>{appeal.ticketNumber}</span>
                    <span aria-hidden="true">·</span>
                    <span>{formattedDate}</span>
                  </div>

                  <div>{getStatusBadge(appeal.status)}</div>
                </div>

                {/* Appeal Title & Excerpt */}
                <h4 className="text-sm font-bold text-slate-900 dark:text-white leading-snug group-hover:text-sky-600 dark:group-hover:text-sky-400 transition-colors">
                  {appeal.title}
                </h4>

                <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 line-clamp-2">
                  {appeal.description}
                </p>

                {/* Footer Badges & Audio indicator */}
                <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-500">
                  <div className="flex items-center gap-2">
                    <span className="text-slate-700 dark:text-slate-300 font-medium">
                      {categoryInfo.label}
                    </span>

                    {appeal.audioUrl && (
                      <span className="flex items-center gap-1 text-rose-600 dark:text-rose-400 font-medium">
                        <Volume2 className="w-3.5 h-3.5" />
                        <span>Ovozli</span>
                      </span>
                    )}

                    {appeal.mediaUrls && appeal.mediaUrls.length > 0 && (
                      <span className="flex items-center gap-1 text-sky-600 dark:text-sky-400 font-medium">
                        <ImageIcon className="w-3.5 h-3.5" />
                        <span>{appeal.mediaUrls.length} rasm</span>
                      </span>
                    )}

                    {appeal.isAnonymous && (
                      <span className="text-slate-400 dark:text-slate-500 font-medium">
                        (Anonim)
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-1 text-sky-600 dark:text-sky-400 font-semibold group-hover:translate-x-0.5 transition-transform">
                    <span>Batafsil</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </div>
                </div>

                {/* Inspector Response preview if exists */}
                {appeal.inspectorResponse && (
                  <div className="mt-2.5 bg-sky-50 dark:bg-sky-950/40 border border-sky-100 dark:border-sky-900/40 rounded-xl p-2.5 text-xs">
                    <div className="flex items-center justify-between font-semibold text-sky-900 dark:text-sky-200 text-[11px] mb-0.5">
                      <span>👮‍♂️ Inspektor javobi ({appeal.inspectorResponse.inspectorName}):</span>
                    </div>
                    <p className="text-slate-700 dark:text-slate-300 line-clamp-2 text-[11px]">
                      {appeal.inspectorResponse.text}
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Appeal Details Modal */}
      {selectedAppeal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">
            {/* Modal Top */}
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-mono text-sky-600 font-bold">
                  {selectedAppeal.ticketNumber}
                </span>
                <h3 className="text-base font-bold text-slate-900 dark:text-white leading-tight">
                  {selectedAppeal.title}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedAppeal(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Scroll Content */}
            <div className="p-4 overflow-y-auto space-y-4 text-xs">
              {/* Status Banner */}
              <div className="bg-slate-50 dark:bg-slate-800/60 p-3 rounded-xl border border-slate-200 dark:border-slate-700 flex items-center justify-between">
                <div>
                  <div className="text-[10px] uppercase font-bold text-slate-400">Holat</div>
                  <div>{getStatusBadge(selectedAppeal.status)}</div>
                </div>
                <div className="text-right">
                  <div className="text-[10px] uppercase font-bold text-slate-400">Yuborilgan vaqt</div>
                  <div className="text-slate-700 dark:text-slate-300 font-mono text-[11px]">
                    {new Date(selectedAppeal.createdAt).toLocaleString('uz-UZ')}
                  </div>
                </div>
              </div>

              {/* Description */}
              <div>
                <div className="text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Murojaat matni:
                </div>
                <p className="text-slate-800 dark:text-slate-200 leading-relaxed bg-slate-50 dark:bg-slate-800/40 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
                  {selectedAppeal.description}
                </p>
              </div>

              {/* Address */}
              <div>
                <div className="text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-0.5">
                  Manzil:
                </div>
                <div className="text-slate-600 dark:text-slate-400">
                  {selectedAppeal.address}
                </div>
              </div>

              {/* Audio playback if present */}
              {selectedAppeal.audioUrl && (
                <div className="bg-rose-50/70 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 p-3 rounded-xl flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={(e) =>
                        handleTogglePlayAudio(selectedAppeal.audioUrl!, selectedAppeal.id, e)
                      }
                      className="w-8 h-8 rounded-full bg-rose-600 text-white flex items-center justify-center shadow-sm"
                    >
                      {playingAudioId === selectedAppeal.id ? (
                        <Pause className="w-3.5 h-3.5 fill-current" />
                      ) : (
                        <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
                      )}
                    </button>
                    <div>
                      <div className="font-bold text-slate-900 dark:text-white">
                        Ovozli xabar tinglash
                      </div>
                      <div className="text-[10px] text-slate-500">
                        Davomiyligi: ~{selectedAppeal.audioDuration || 15} soniya
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Media gallery */}
              {selectedAppeal.mediaUrls && selectedAppeal.mediaUrls.length > 0 && (
                <div>
                  <div className="text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    Biriktirilgan fotosuratlar:
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {selectedAppeal.mediaUrls.map((url, idx) => (
                      <img
                        key={idx}
                        src={url}
                        alt="Biriktirilgan surat"
                        className="w-full h-32 object-cover rounded-xl border border-slate-200 dark:border-slate-700"
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Official Inspector Response */}
              {selectedAppeal.inspectorResponse && (
                <div className="bg-sky-50 dark:bg-sky-950/50 border border-sky-200 dark:border-sky-900 p-3.5 rounded-xl space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-sky-900 dark:text-sky-200">
                      👮‍♂️ Profilaktika inspektorining rasmiy javobi:
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">
                      {new Date(selectedAppeal.inspectorResponse.respondedAt).toLocaleDateString('uz-UZ')}
                    </span>
                  </div>
                  <p className="text-slate-800 dark:text-slate-200 leading-relaxed text-[11px]">
                    {selectedAppeal.inspectorResponse.text}
                  </p>
                  <div className="text-[10px] text-sky-700 dark:text-sky-300 font-medium">
                    Ijrochi: {selectedAppeal.inspectorResponse.inspectorName}
                  </div>
                </div>
              )}
            </div>

            {/* Modal Bottom */}
            <div className="p-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedAppeal(null)}
                className="px-4 py-2 bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl font-semibold text-xs hover:bg-slate-300 transition-colors"
              >
                Yopish
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
