import React, { useState, useEffect } from 'react';
import { Shield, ChevronLeft, Bell } from 'lucide-react';
import { Header } from './components/Header';
import { CitizenMinimalPortal } from './components/CitizenMinimalPortal';
import { InspectorDashboard } from './components/InspectorDashboard';
import { OfficerLoginModal } from './components/OfficerLoginModal';
import {
  SettingsModal,
  AppSettings,
  AppTheme,
  AppFontFamily,
  AppFontSize,
  AppAccentColor,
} from './components/SettingsModal';
import { REGIONS_DATA, INSPECTORS_DATA, INITIAL_APPEALS } from './data/mockData';
import { Mahalla, Inspector, Appeal, AppealStatus, Region, District, OfficerAuthUser } from './types';

const DEFAULT_SETTINGS: AppSettings = {
  theme: 'light',
  fontFamily: 'inter',
  fontSize: 'medium',
  accentColor: 'blue',
};

export default function App() {
  // Officer Authentication State (null = citizen mode, OfficerAuthUser = staff mode)
  const [authenticatedOfficer, setAuthenticatedOfficer] = useState<OfficerAuthUser | null>(() => {
    const saved = localStorage.getItem('mening_inspektorim_officer_session');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return null;
      }
    }
    return null;
  });

  const [isOfficerLoginOpen, setIsOfficerLoginOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Settings State (Persisted in localStorage with CSS variables)
  const [settings, setSettings] = useState<AppSettings>(() => {
    const saved = localStorage.getItem('mening_inspektorim_settings');
    if (saved) {
      try {
        return { ...DEFAULT_SETTINGS, ...JSON.parse(saved) };
      } catch {
        return DEFAULT_SETTINGS;
      }
    }
    return DEFAULT_SETTINGS;
  });

  // Citizen Location State: Checks if citizen has selected a mahalla
  const [hasLocationSet, setHasLocationSet] = useState<boolean>(() => {
    return Boolean(localStorage.getItem('mening_inspektorim_mahalla_selected'));
  });

  const [selectedMahalla, setSelectedMahalla] = useState<Mahalla>(() => {
    const saved = localStorage.getItem('mening_inspektorim_mahalla');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        // fallback
      }
    }
    return REGIONS_DATA[0].districts[0].mahallas[0];
  });

  // Location Wizard Step (1: Viloyat, 2: Tuman, 3: Mahalla)
  const [wizardStep, setWizardStep] = useState<1 | 2 | 3>(1);
  const [wizardRegion, setWizardRegion] = useState<Region>(REGIONS_DATA[0]);
  const [wizardDistrict, setWizardDistrict] = useState<District>(REGIONS_DATA[0].districts[0]);

  // Appeals State (saved in localStorage)
  const [appeals, setAppeals] = useState<Appeal[]>(() => {
    const saved = localStorage.getItem('mening_inspektorim_appeals');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return INITIAL_APPEALS;
      }
    }
    return INITIAL_APPEALS;
  });

  // Save appeals
  useEffect(() => {
    localStorage.setItem('mening_inspektorim_appeals', JSON.stringify(appeals));
  }, [appeals]);

  // Save selected mahalla
  useEffect(() => {
    localStorage.setItem('mening_inspektorim_mahalla', JSON.stringify(selectedMahalla));
  }, [selectedMahalla]);

  // Save officer session
  useEffect(() => {
    if (authenticatedOfficer) {
      localStorage.setItem('mening_inspektorim_officer_session', JSON.stringify(authenticatedOfficer));
    } else {
      localStorage.removeItem('mening_inspektorim_officer_session');
    }
  }, [authenticatedOfficer]);

  // Real-time CSS Custom Properties Application
  useEffect(() => {
    localStorage.setItem('mening_inspektorim_settings', JSON.stringify(settings));
    const root = document.documentElement;

    // 1. Theme
    if (settings.theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }

    // 2. Font Size
    const sizeMap: Record<AppFontSize, string> = {
      small: '14px',
      medium: '16px',
      large: '18px',
    };
    root.style.setProperty('--base-font-size', sizeMap[settings.fontSize] || '16px');

    // 3. Font Family
    const fontMap: Record<AppFontFamily, string> = {
      inter: "'Inter', sans-serif",
      sans: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      serif: "Georgia, Cambria, 'Times New Roman', serif",
    };
    root.style.setProperty('--font-family', fontMap[settings.fontFamily] || "'Inter', sans-serif");

    // 4. Accent Color
    const colorMap: Record<AppAccentColor, { hex: string; hover: string }> = {
      blue: { hex: '#0284c7', hover: '#0369a1' },
      emerald: { hex: '#059669', hover: '#047857' },
      slate: { hex: '#475569', hover: '#334155' },
    };
    const c = colorMap[settings.accentColor] || colorMap.blue;
    root.style.setProperty('--accent-color', c.hex);
    root.style.setProperty('--accent-hover', c.hover);
  }, [settings]);

  // Toast Helper
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Active Inspector for the chosen mahalla
  const activeInspector: Inspector =
    INSPECTORS_DATA.find((i) => i.mahallaId === selectedMahalla.id) || INSPECTORS_DATA[0];

  // Location Wizard Navigation Handlers
  const handleWizardSelectRegion = (region: Region) => {
    setWizardRegion(region);
    if (region.districts.length > 0) {
      setWizardDistrict(region.districts[0]);
    }
    setWizardStep(2);
  };

  const handleWizardSelectDistrict = (district: District) => {
    setWizardDistrict(district);
    setWizardStep(3);
  };

  const handleWizardSelectMahalla = (mahalla: Mahalla) => {
    setSelectedMahalla(mahalla);
    localStorage.setItem('mening_inspektorim_mahalla_selected', 'true');
    setHasLocationSet(true);
    setWizardStep(1);
    showToast(`✅ Mahalla belgilandi: ${mahalla.name}`);
  };

  const handleWizardBack = () => {
    if (wizardStep === 3) setWizardStep(2);
    else if (wizardStep === 2) setWizardStep(1);
  };

  // Appeal Submission Handler
  const handleCreateAppeal = (newAppeal: Appeal) => {
    setAppeals((prev) => [newAppeal, ...prev]);
    showToast(`✅ Xabar yuborildi (#${newAppeal.ticketNumber})`);
  };

  // Officer Status Update Handler
  const handleUpdateStatus = (
    appealId: string,
    newStatus: AppealStatus,
    comment?: string,
    responseText?: string
  ) => {
    setAppeals((prev) =>
      prev.map((app) => {
        if (app.id !== appealId) return app;
        return {
          ...app,
          status: newStatus,
          updatedAt: new Date().toISOString(),
          statusHistory: [
            ...app.statusHistory,
            {
              status: newStatus,
              timestamp: new Date().toISOString(),
              comment: comment || undefined,
              changedBy: authenticatedOfficer ? authenticatedOfficer.fullName : 'Inspektor',
            },
          ],
          inspectorResponse: responseText
            ? {
                respondedAt: new Date().toISOString(),
                text: responseText,
                inspectorName: authenticatedOfficer ? authenticatedOfficer.fullName : 'Inspektor',
              }
            : app.inspectorResponse,
        };
      })
    );
    showToast("Holat muvaffaqiyatli yangilandi");
  };

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col font-sans transition-colors">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 max-w-sm w-[90%] bg-slate-900 dark:bg-sky-950 text-white border border-sky-500/40 px-4 py-3 rounded-2xl shadow-2xl flex items-center gap-3 animate-in fade-in slide-in-from-top-4 duration-300">
          <Bell className="w-5 h-5 text-sky-400 shrink-0" />
          <div className="text-xs font-semibold leading-tight">{toastMessage}</div>
        </div>
      )}

      {/* Header Bar */}
      <Header
        selectedMahalla={selectedMahalla}
        onOpenMahallaModal={() => {
          setWizardStep(1);
          setHasLocationSet(false);
        }}
        darkMode={settings.theme === 'dark'}
        setDarkMode={(isDark) =>
          setSettings((prev) => ({ ...prev, theme: isDark ? 'dark' : 'light' }))
        }
        authenticatedOfficer={authenticatedOfficer}
        onOpenOfficerLogin={() => setIsOfficerLoginOpen(true)}
        onOfficerLogout={() => {
          setAuthenticatedOfficer(null);
          showToast("Xizmat kabinetidan chiqildi");
        }}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-4xl w-full mx-auto px-4 py-4 sm:py-6 flex flex-col justify-center">
        {/* ========================================================= */}
        {/* VIEW 1: PROTECTED OFFICER DASHBOARD                       */}
        {/* Accessible ONLY when authenticatedOfficer !== null        */}
        {/* Citizens have ZERO access or visibility                   */}
        {/* ========================================================= */}
        {authenticatedOfficer ? (
          <InspectorDashboard
            inspector={activeInspector}
            appeals={appeals}
            onUpdateStatus={handleUpdateStatus}
          />
        ) : (
          /* ========================================================= */
          /* VIEW 2: CITIZEN FLOW                                      */
          /* No login required. Multi-step location wizard -> 3 actions */
          /* ========================================================= */
          <>
            {/* Step-by-Step Location Wizard (If Mahalla not set yet) */}
            {!hasLocationSet ? (
              <div className="max-w-md w-full mx-auto bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 sm:p-6 shadow-sm space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                  <div className="flex items-center gap-2">
                    {wizardStep > 1 && (
                      <button
                        type="button"
                        onClick={handleWizardBack}
                        className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-200 flex items-center justify-center transition-colors"
                        title="Ortga"
                      >
                        <ChevronLeft className="w-5 h-5" />
                      </button>
                    )}
                    <div>
                      <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white leading-tight">
                        {wizardStep === 1 && "1-qadam: Viloyatni tanlang"}
                        {wizardStep === 2 && `2-qadam: ${wizardRegion.name} tumanlari`}
                        {wizardStep === 3 && `3-qadam: ${wizardDistrict.name} mahallalari`}
                      </h2>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">
                        {wizardStep === 1 && "Yashash hududingiz bo'yicha birinchi bosqich"}
                        {wizardStep === 2 && "Tumaningizni ro'yxatdan tanlang"}
                        {wizardStep === 3 && "Mahallangiz tanlangach avtomatik saqlanadi"}
                      </p>
                    </div>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-sky-100 dark:bg-sky-950 text-sky-800 dark:text-sky-300">
                    {wizardStep} / 3
                  </span>
                </div>

                {/* Step replacement content */}
                {wizardStep === 1 && (
                  <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                    {REGIONS_DATA.map((reg) => (
                      <button
                        key={reg.id}
                        type="button"
                        onClick={() => handleWizardSelectRegion(reg)}
                        className="w-full p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 hover:border-sky-500 bg-white dark:bg-slate-800/60 hover:bg-sky-50/50 dark:hover:bg-sky-950/40 flex items-center justify-between text-left transition-all"
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-xl">🏛️</span>
                          <div>
                            <div className="font-bold text-xs text-slate-900 dark:text-white">
                              {reg.name}
                            </div>
                            <div className="text-[10px] text-slate-500 dark:text-slate-400">
                              {reg.districts.length} ta tuman
                            </div>
                          </div>
                        </div>
                        <span className="text-slate-400 text-xs">➔</span>
                      </button>
                    ))}
                  </div>
                )}

                {wizardStep === 2 && (
                  <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                    {wizardRegion.districts.map((dist) => (
                      <button
                        key={dist.id}
                        type="button"
                        onClick={() => handleWizardSelectDistrict(dist)}
                        className="w-full p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 hover:border-sky-500 bg-white dark:bg-slate-800/60 hover:bg-sky-50/50 dark:hover:bg-sky-950/40 flex items-center justify-between text-left transition-all"
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-xl">📍</span>
                          <div>
                            <div className="font-bold text-xs text-slate-900 dark:text-white">
                              {dist.name}
                            </div>
                            <div className="text-[10px] text-slate-500 dark:text-slate-400">
                              {dist.mahallas.length} ta mahalla
                            </div>
                          </div>
                        </div>
                        <span className="text-slate-400 text-xs">➔</span>
                      </button>
                    ))}
                  </div>
                )}

                {wizardStep === 3 && (
                  <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                    {wizardDistrict.mahallas.map((mah) => (
                      <button
                        key={mah.id}
                        type="button"
                        onClick={() => handleWizardSelectMahalla(mah)}
                        className="w-full p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 hover:border-emerald-500 bg-white dark:bg-slate-800/60 hover:bg-emerald-50/40 dark:hover:bg-emerald-950/40 flex items-center justify-between text-left transition-all"
                      >
                        <div>
                          <div className="font-bold text-xs text-slate-900 dark:text-white">
                            {mah.name}
                          </div>
                          <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                            {mah.address}
                          </div>
                          <div className="text-[10px] text-sky-700 dark:text-sky-400 font-semibold mt-1">
                            🛡️ {mah.policeStation}
                          </div>
                        </div>
                        <span className="px-2.5 py-1 bg-emerald-600 text-white rounded-xl text-[10px] font-bold shrink-0">
                          Tanlash ➔
                        </span>
                      </button>
                    ))}
                  </div>
                )}

                {wizardStep > 1 && (
                  <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex justify-start">
                    <button
                      type="button"
                      onClick={handleWizardBack}
                      className="text-xs text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 font-semibold flex items-center gap-1"
                    >
                      <ChevronLeft className="w-3.5 h-3.5" />
                      <span>Ortga</span>
                    </button>
                  </div>
                )}
              </div>
            ) : (
              /* CITIZEN MAIN SCREEN (MINIMALIST & FOCUSED: CARD + 3 CORE ACTIONS ONLY) */
              <CitizenMinimalPortal
                inspector={activeInspector}
                mahalla={selectedMahalla}
                onOpenSettings={() => setIsSettingsModalOpen(true)}
                onSubmitAppeal={handleCreateAppeal}
                onCallOfficer={() => showToast(`Qo'ng'iroq yo'naltirilmoqda...`)}
              />
            )}
          </>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 py-3 mt-8 transition-colors text-xs text-slate-500 dark:text-slate-400">
        <div className="max-w-4xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2 text-center sm:text-left">
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-sky-600" />
            <span className="font-semibold text-slate-800 dark:text-slate-200">
              Mening Inspektorim
            </span>
            <span>— O'zbekiston Respublikasi Mahalla Huquq-Tartibot Veb-Platformasi</span>
          </div>

          <div className="text-[11px] text-slate-400">
            Tezkor yordam: 102
          </div>
        </div>
      </footer>

      {/* Staff Login Modal */}
      <OfficerLoginModal
        isOpen={isOfficerLoginOpen}
        onClose={() => setIsOfficerLoginOpen(false)}
        onSuccess={(officer) => {
          setAuthenticatedOfficer(officer);
          showToast(`Xush kelibsiz, ${officer.fullName}!`);
        }}
      />

      {/* Account Settings Modal */}
      <SettingsModal
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
        settings={settings}
        onUpdateSettings={(newSettings) =>
          setSettings((prev) => ({ ...prev, ...newSettings }))
        }
        selectedMahalla={selectedMahalla}
        onChangeMahalla={() => {
          setWizardStep(1);
          setHasLocationSet(false);
        }}
        onReset={() => {
          setSettings(DEFAULT_SETTINGS);
          showToast("Sozlamalar standart holatga qaytarildi");
        }}
      />
    </div>
  );
}
