import React from 'react';
import { Phone, Clock, MapPin, Award, ShieldAlert, Send, Star, CheckCircle } from 'lucide-react';
import { Inspector, Mahalla } from '../types';
import { triggerHaptic } from '../utils/telegram';

interface InspectorCardProps {
  inspector: Inspector | null;
  mahalla: Mahalla;
  onStartAppeal: () => void;
  onCallInspector: () => void;
}

export const InspectorCard: React.FC<InspectorCardProps> = ({
  inspector,
  mahalla,
  onStartAppeal,
  onCallInspector,
}) => {
  if (!inspector) {
    return (
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 text-center">
        <ShieldAlert className="w-10 h-10 text-amber-500 mx-auto mb-2" />
        <h4 className="text-sm font-semibold text-slate-900 dark:text-white">
          Ushbu mahallaga inspektor tayinlanmagan
        </h4>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          Iltimos, boshqa mahallani tanlang yoki tuman IIB navbatchilik qismiga murojaat qiling (102).
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow">
      {/* Top Banner with Mahalla and Station */}
      <div className="bg-gradient-to-r from-sky-900 to-slate-900 p-4 text-white">
        <div className="flex items-center justify-between text-xs mb-1">
          <span className="font-medium text-sky-200 tracking-wide">
            BIRIKTIRILGAN PROFILAKTIKA INSPEKTORI
          </span>
          <span className="bg-white/10 text-sky-200 px-2 py-0.5 rounded text-[11px] font-mono">
            {inspector.badgeNumber}
          </span>
        </div>
        <div className="text-lg font-bold tracking-tight text-white">{mahalla.name}</div>
        <div className="text-xs text-slate-300 mt-0.5 flex items-center gap-1.5">
          <MapPin className="w-3.5 h-3.5 text-sky-300 shrink-0" />
          <span className="truncate">{mahalla.policeStation}</span>
        </div>
      </div>

      {/* Profile Section */}
      <div className="p-4 sm:p-5">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
          {/* Officer Photo */}
          <div className="relative shrink-0 mx-auto sm:mx-0">
            <img
              src={inspector.photoUrl}
              alt={inspector.fullName}
              referrerPolicy="no-referrer"
              className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl object-cover object-top border-2 border-sky-600/30 shadow-md bg-slate-100 dark:bg-slate-800"
            />
            <div className="absolute -bottom-2 -right-1 bg-emerald-500 text-white rounded-full p-1 shadow">
              <CheckCircle className="w-3.5 h-3.5" />
            </div>
          </div>

          {/* Details */}
          <div className="flex-1 w-full text-center sm:text-left">
            <div className="flex items-center justify-center sm:justify-start gap-1 text-amber-500 mb-1">
              <Star className="w-3.5 h-3.5 fill-current" />
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                {inspector.rating.toFixed(1)}
              </span>
              <span className="text-xs text-slate-400">· {inspector.resolvedCasesCount} ta hal qilingan ishlar</span>
            </div>

            <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white leading-snug">
              {inspector.fullName}
            </h3>

            <div className="text-xs font-semibold text-sky-700 dark:text-sky-400 mt-0.5 flex items-center justify-center sm:justify-start gap-1.5">
              <Award className="w-3.5 h-3.5" />
              <span>
                {inspector.rank} — {inspector.role}
              </span>
            </div>

            {/* Quick Contact & Details grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-300 text-left">
              <div className="flex items-start gap-2">
                <Clock className="w-3.5 h-3.5 text-sky-600 shrink-0 mt-0.5" />
                <div>
                  <div className="font-semibold text-slate-800 dark:text-slate-200">Qabul kunlari:</div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400">{inspector.receptionDays}</div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400">{inspector.receptionHours}</div>
                </div>
              </div>

              <div className="flex items-start gap-2">
                <MapPin className="w-3.5 h-3.5 text-sky-600 shrink-0 mt-0.5" />
                <div>
                  <div className="font-semibold text-slate-800 dark:text-slate-200">Tayanch punkti:</div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2">
                    {inspector.supportPointAddress}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons Row */}
        <div className="grid grid-cols-2 gap-3 mt-4 pt-4 border-t border-slate-100 dark:border-slate-800">
          <a
            href={`tel:${inspector.phoneNumber.replace(/[^\d+]/g, '')}`}
            onClick={() => {
              triggerHaptic('light');
              onCallInspector();
            }}
            className="h-11 px-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700/80 text-slate-800 dark:text-slate-100 font-semibold text-xs flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
          >
            <Phone className="w-4 h-4 text-emerald-600" />
            <span className="truncate">Qo'ng'iroq qilish</span>
          </a>

          <button
            type="button"
            onClick={() => {
              triggerHaptic('medium');
              onStartAppeal();
            }}
            className="h-11 px-4 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-semibold text-xs flex items-center justify-center gap-2 shadow-sm transition-all active:scale-[0.98]"
          >
            <Send className="w-4 h-4" />
            <span className="truncate">Murojaat yuborish</span>
          </button>
        </div>
      </div>
    </div>
  );
};
