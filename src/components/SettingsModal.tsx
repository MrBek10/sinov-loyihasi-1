import React from 'react';
import { X, Moon, Sun, Shield, Check, RefreshCw, MapPin } from 'lucide-react';
import { Mahalla } from '../types';

export type AppTheme = 'light' | 'dark';
export type AppFontFamily = 'inter' | 'sans' | 'serif';
export type AppFontSize = 'small' | 'medium' | 'large';
export type AppAccentColor = 'blue' | 'emerald' | 'slate';

export interface AppSettings {
  theme: AppTheme;
  fontFamily: AppFontFamily;
  fontSize: AppFontSize;
  accentColor: AppAccentColor;
}

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: AppSettings;
  onUpdateSettings: (newSettings: Partial<AppSettings>) => void;
  selectedMahalla: Mahalla | null;
  onChangeMahalla: () => void;
  onReset: () => void;
}

const ACCENT_COLORS: { id: AppAccentColor; name: string; hex: string; bgClass: string }[] = [
  { id: 'blue', name: 'Police Blue', hex: '#0284c7', bgClass: 'bg-sky-600' },
  { id: 'emerald', name: 'Emerald', hex: '#059669', bgClass: 'bg-emerald-600' },
  { id: 'slate', name: 'Slate', hex: '#475569', bgClass: 'bg-slate-600' },
];

const FONT_FAMILIES: { id: AppFontFamily; name: string; label: string }[] = [
  { id: 'inter', name: 'Inter (Standart)', label: 'Inter' },
  { id: 'sans', name: 'Sans-serif (Tizim)', label: 'Sans-serif' },
  { id: 'serif', name: 'Serif (Klassik)', label: 'Serif' },
];

const FONT_SIZES: { id: AppFontSize; label: string; desc: string }[] = [
  { id: 'small', label: 'Kichik', desc: '14px' },
  { id: 'medium', label: 'O\'rtacha', desc: '16px' },
  { id: 'large', label: 'Katta', desc: '18px' },
];

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  onUpdateSettings,
  selectedMahalla,
  onChangeMahalla,
  onReset,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-sm shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-sky-100 dark:bg-sky-950/80 text-sky-700 dark:text-sky-400 flex items-center justify-center font-bold">
              ⚙️
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white leading-none">
                Akkaunt Sozlamalari
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Mavzu, shrift va shaxsiy parametrlarni sozlash
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-4 sm:p-5 space-y-4 overflow-y-auto text-xs">
          {/* Active Mahalla Chip */}
          <div className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 rounded-2xl p-3 flex items-center justify-between">
            <div className="flex items-center gap-2 truncate">
              <MapPin className="w-4 h-4 text-rose-500 shrink-0" />
              <div className="min-w-0">
                <span className="text-[10px] text-slate-400 block">Tanlangan mahalla:</span>
                <span className="font-bold text-slate-800 dark:text-slate-200 truncate block">
                  {selectedMahalla ? selectedMahalla.name : 'Belgilanmagan'}
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                onClose();
                onChangeMahalla();
              }}
              className="text-xs text-sky-600 dark:text-sky-400 font-bold hover:underline shrink-0 ml-2"
            >
              O'zgartirish
            </button>
          </div>

          {/* 1. Theme: Light / Dark */}
          <div>
            <label className="block font-bold text-slate-800 dark:text-slate-200 mb-2">
              Mavzu (Theme)
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => onUpdateSettings({ theme: 'light' })}
                className={`p-2.5 rounded-2xl border text-center transition-all flex items-center justify-center gap-2 ${
                  settings.theme === 'light'
                    ? 'border-sky-500 bg-sky-50 dark:bg-sky-950/40 text-sky-800 dark:text-sky-300 font-bold ring-2 ring-sky-500/20'
                    : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 text-slate-700 dark:text-slate-300'
                }`}
              >
                <Sun className="w-4 h-4 text-amber-500" />
                <span className="text-xs">Yorug' (Light)</span>
              </button>

              <button
                type="button"
                onClick={() => onUpdateSettings({ theme: 'dark' })}
                className={`p-2.5 rounded-2xl border text-center transition-all flex items-center justify-center gap-2 ${
                  settings.theme === 'dark'
                    ? 'border-sky-500 bg-sky-50 dark:bg-sky-950/40 text-sky-800 dark:text-sky-300 font-bold ring-2 ring-sky-500/20'
                    : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 text-slate-700 dark:text-slate-300'
                }`}
              >
                <Moon className="w-4 h-4 text-indigo-400" />
                <span className="text-xs">Qorong'i (Dark)</span>
              </button>
            </div>
          </div>

          {/* 2. Font Family: Inter, Sans-serif, Serif */}
          <div>
            <label className="block font-bold text-slate-800 dark:text-slate-200 mb-2">
              Shrift turi (Font Family)
            </label>
            <div className="grid grid-cols-3 gap-2">
              {FONT_FAMILIES.map((f) => {
                const isSelected = settings.fontFamily === f.id;
                return (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => onUpdateSettings({ fontFamily: f.id })}
                    className={`p-2 rounded-xl border text-center transition-all ${
                      isSelected
                        ? 'border-sky-500 bg-sky-50 dark:bg-sky-950/40 text-sky-900 dark:text-sky-200 font-bold'
                        : 'border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    <div className="text-xs font-semibold">{f.label}</div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 3. Font Size: Kichik, O'rtacha, Katta */}
          <div>
            <label className="block font-bold text-slate-800 dark:text-slate-200 mb-2">
              Matn o'lchami (Font Size)
            </label>
            <div className="grid grid-cols-3 gap-2">
              {FONT_SIZES.map((sz) => {
                const isSelected = settings.fontSize === sz.id;
                return (
                  <button
                    key={sz.id}
                    type="button"
                    onClick={() => onUpdateSettings({ fontSize: sz.id })}
                    className={`p-2 rounded-xl border text-center transition-all ${
                      isSelected
                        ? 'border-sky-500 bg-sky-50 dark:bg-sky-950/40 text-sky-900 dark:text-sky-200 font-bold'
                        : 'border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    <div className="text-xs">{sz.label}</div>
                    <div className="text-[10px] text-slate-400">{sz.desc}</div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 4. Accent Color: Police Blue, Emerald, Slate */}
          <div>
            <label className="block font-bold text-slate-800 dark:text-slate-200 mb-2">
              Urg'u rangi (Accent Color)
            </label>
            <div className="grid grid-cols-3 gap-2">
              {ACCENT_COLORS.map((color) => {
                const isSelected = settings.accentColor === color.id;
                return (
                  <button
                    key={color.id}
                    type="button"
                    onClick={() => onUpdateSettings({ accentColor: color.id })}
                    className={`p-2 rounded-xl border flex items-center justify-center gap-1.5 transition-all ${
                      isSelected
                        ? 'border-slate-900 dark:border-white bg-slate-100 dark:bg-slate-800 font-bold'
                        : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50'
                    }`}
                  >
                    <span className={`w-3 h-3 rounded-full ${color.bgClass}`} />
                    <span className="text-slate-800 dark:text-slate-200 text-[11px]">
                      {color.name}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 flex items-center justify-between">
          <button
            type="button"
            onClick={onReset}
            className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Standart holat</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 bg-sky-700 hover:bg-sky-800 text-white font-bold text-xs rounded-xl shadow-xs transition-colors"
          >
            Saqlash va Yopish
          </button>
        </div>
      </div>
    </div>
  );
};
