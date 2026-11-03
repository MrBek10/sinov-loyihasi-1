import React from 'react';
import { Shield, Moon, Sun, MapPin, Lock, LogOut, UserCheck } from 'lucide-react';
import { Mahalla, OfficerAuthUser } from '../types';

interface HeaderProps {
  selectedMahalla: Mahalla | null;
  onOpenMahallaModal: () => void;
  darkMode: boolean;
  setDarkMode: (val: boolean) => void;
  authenticatedOfficer: OfficerAuthUser | null;
  onOpenOfficerLogin: () => void;
  onOfficerLogout: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  selectedMahalla,
  onOpenMahallaModal,
  darkMode,
  setDarkMode,
  authenticatedOfficer,
  onOpenOfficerLogin,
  onOfficerLogout,
}) => {
  return (
    <header className="sticky top-0 z-30 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 transition-colors">
      <div className="max-w-4xl mx-auto px-4 py-3">
        <div className="flex items-center justify-between gap-3">
          {/* Brand mark */}
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-sky-900 text-white flex items-center justify-center shadow-sm shrink-0">
              <Shield className="w-5 h-5 text-sky-200" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-900 dark:text-white text-base tracking-tight leading-none">
                  Mening Inspektorim
                </span>
                <span className="text-[10px] font-bold uppercase tracking-wider text-sky-700 dark:text-sky-300 bg-sky-50 dark:bg-sky-950/80 px-2 py-0.5 rounded-md border border-sky-200/50 dark:border-sky-800/50">
                  {authenticatedOfficer ? 'Xizmat Kabineti' : 'Fuqarolar Portali'}
                </span>
              </div>

              {!authenticatedOfficer && (
                <button
                  type="button"
                  onClick={onOpenMahallaModal}
                  className="text-xs text-slate-500 dark:text-slate-400 hover:text-sky-600 dark:hover:text-sky-400 flex items-center gap-1 mt-1 text-left transition-colors truncate max-w-[200px] sm:max-w-xs"
                  title="Mahallani o'zgartirish"
                >
                  <MapPin className="w-3 h-3 text-sky-600 shrink-0" />
                  <span className="truncate font-medium text-slate-700 dark:text-slate-300">
                    {selectedMahalla ? selectedMahalla.name : 'Mahallani tanlang'}
                  </span>
                  <span className="text-sky-600 dark:text-sky-400 font-semibold text-[11px]">
                    [O'zgartirish]
                  </span>
                </button>
              )}
            </div>
          </div>

          {/* Right Action Controls */}
          <div className="flex items-center gap-2">
            {/* If Officer Logged In: Show Profile chip and Logout */}
            {authenticatedOfficer ? (
              <div className="flex items-center gap-2">
                <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-900/60 rounded-xl text-xs text-amber-900 dark:text-amber-200 font-semibold">
                  <UserCheck className="w-3.5 h-3.5 text-amber-600" />
                  <span className="truncate max-w-[140px]">{authenticatedOfficer.fullName}</span>
                </div>

                <button
                  type="button"
                  onClick={onOfficerLogout}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-rose-50 hover:text-rose-600 dark:bg-slate-800 dark:hover:bg-rose-950/50 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors border border-slate-200 dark:border-slate-700"
                  title="Kabinetdan chiqish"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Chiqish</span>
                </button>
              </div>
            ) : (
              /* If Citizen: Staff Login Button */
              <button
                type="button"
                onClick={onOpenOfficerLogin}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors border border-slate-200 dark:border-slate-700 shadow-2xs"
                title="Ichki ishlar xodimlari uchun tizimga kirish"
              >
                <Lock className="w-3.5 h-3.5 text-slate-500" />
                <span>Xodimlar uchun</span>
              </button>
            )}

            {/* Dark mode toggle */}
            <button
              type="button"
              onClick={() => setDarkMode(!darkMode)}
              className="w-8 h-8 rounded-xl flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              title={darkMode ? 'Kunduzgi rejim' : 'Tungi rejim'}
              aria-label="Toggle theme"
            >
              {darkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
