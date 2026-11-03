import React, { useState } from 'react';
import { X, Shield, Lock, User, AlertCircle, KeyRound, Check } from 'lucide-react';
import { OfficerAuthUser } from '../types';

interface OfficerLoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (officer: OfficerAuthUser) => void;
}

const DEMO_OFFICERS: { username: string; pass: string; user: OfficerAuthUser }[] = [
  {
    username: 'karimov',
    pass: 'pass123',
    user: {
      id: 'insp-1',
      username: 'karimov',
      fullName: 'Mayor Karimov Rustam Baxtiyorovich',
      rank: 'Mayor',
      phone: '+998901234567',
      badgeNumber: 'IIB-UZ-7842',
      mahallaId: 'mah-1',
    },
  },
  {
    username: 'alimov',
    pass: 'pass123',
    user: {
      id: 'insp-2',
      username: 'alimov',
      fullName: 'Katta leytenant Alimov Jasur Otabekovich',
      rank: 'Katta leytenant',
      phone: '+998909876543',
      badgeNumber: 'IIB-UZ-9014',
      mahallaId: 'mah-2',
    },
  },
];

export const OfficerLoginModal: React.FC<OfficerLoginModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [username, setUsername] = useState('karimov');
  const [password, setPassword] = useState('pass123');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    setTimeout(() => {
      const found = DEMO_OFFICERS.find(
        (o) =>
          (o.username.toLowerCase() === username.trim().toLowerCase() ||
            o.user.phone === username.trim()) &&
          o.pass === password
      );

      setIsLoading(false);

      if (found) {
        onSuccess(found.user);
        onClose();
      } else {
        setError("Login yoki parol noto'g'ri. Iltimos, qaytadan urinib ko'ring.");
      }
    }, 400);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-sm shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-sky-900 text-white flex items-center justify-center shadow-md">
              <Shield className="w-5 h-5 text-sky-200" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white leading-tight">
                Xodimlar Uchun
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Profilaktika inspektori kabinetiga kirish
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

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs">
          {error && (
            <div className="p-3 bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900 rounded-xl text-rose-700 dark:text-rose-300 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
              Login yoki Telefon raqam
            </label>
            <div className="relative">
              <User className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                placeholder="Masalan: karimov yoki +99890..."
                className="w-full pl-9 pr-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-sky-500 font-medium"
              />
            </div>
          </div>

          <div>
            <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
              Parol
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="••••••••"
                className="w-full pl-9 pr-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-sky-500 font-medium"
              />
            </div>
          </div>

          {/* Quick autofill helper for demonstration */}
          <div className="p-2.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-800 text-[11px] text-slate-600 dark:text-slate-400 space-y-1">
            <span className="font-semibold block text-slate-700 dark:text-slate-300">
              Sinov uchun hisob:
            </span>
            <div className="flex items-center justify-between font-mono text-[10px]">
              <span>Login: <b>karimov</b></span>
              <span>Parol: <b>pass123</b></span>
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3 bg-sky-700 hover:bg-sky-800 text-white font-bold rounded-xl shadow-md transition-all active:scale-95 flex items-center justify-center gap-2"
          >
            <KeyRound className="w-4 h-4" />
            <span>{isLoading ? 'Tekshirilmoqda...' : 'Tizimga kirish ➔'}</span>
          </button>
        </form>
      </div>
    </div>
  );
};
