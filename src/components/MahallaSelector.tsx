import React, { useState } from 'react';
import {
  MapPin,
  Navigation,
  Check,
  X,
  ChevronLeft,
  ChevronRight,
  Compass,
  Building2,
  MapPinned,
  ShieldCheck,
} from 'lucide-react';
import { REGIONS_DATA } from '../data/mockData';
import { Region, District, Mahalla } from '../types';
import { triggerHaptic } from '../utils/telegram';

interface MahallaSelectorProps {
  selectedMahalla: Mahalla;
  onSelectMahalla: (mahalla: Mahalla) => void;
  isOpen: boolean;
  onClose: () => void;
}

type WizardStep = 'region' | 'district' | 'mahalla';

export const MahallaSelector: React.FC<MahallaSelectorProps> = ({
  selectedMahalla,
  onSelectMahalla,
  isOpen,
  onClose,
}) => {
  // Step-by-step replacement wizard state
  const [step, setStep] = useState<WizardStep>('region');
  const [chosenRegion, setChosenRegion] = useState<Region>(() => {
    return REGIONS_DATA.find((r) => r.id === selectedMahalla.regionId) || REGIONS_DATA[0];
  });
  const [chosenDistrict, setChosenDistrict] = useState<District>(() => {
    const reg = REGIONS_DATA.find((r) => r.id === selectedMahalla.regionId) || REGIONS_DATA[0];
    return reg.districts.find((d) => d.id === selectedMahalla.districtId) || reg.districts[0];
  });

  const [isLocating, setIsLocating] = useState<boolean>(false);
  const [locationSuccessMsg, setLocationSuccessMsg] = useState<string | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);

  if (!isOpen) return null;

  // Handlers for step navigation
  const handleSelectRegion = (region: Region) => {
    triggerHaptic('selection');
    setChosenRegion(region);
    if (region.districts.length > 0) {
      setChosenDistrict(region.districts[0]);
    }
    setStep('district');
  };

  const handleSelectDistrict = (district: District) => {
    triggerHaptic('selection');
    setChosenDistrict(district);
    setStep('mahalla');
  };

  const handleSelectMahalla = (mahalla: Mahalla) => {
    triggerHaptic('success');
    onSelectMahalla(mahalla);
    onClose();
  };

  const handleBack = () => {
    triggerHaptic('light');
    if (step === 'mahalla') {
      setStep('district');
    } else if (step === 'district') {
      setStep('region');
    }
  };

  // GPS Auto-locate
  const handleAutoLocate = () => {
    if (!navigator.geolocation) {
      setLocationError("Qurilmangizda geolokatsiya (GPS) qo'llab-quvvatlanmaydi.");
      return;
    }

    setIsLocating(true);
    setLocationError(null);
    setLocationSuccessMsg(null);
    triggerHaptic('light');

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const userLat = position.coords.latitude;
        const userLng = position.coords.longitude;

        let closestMahalla: Mahalla | null = null;
        let minDistance = Infinity;

        REGIONS_DATA.forEach((reg) => {
          reg.districts.forEach((dist) => {
            dist.mahallas.forEach((mah) => {
              const dLat = (mah.coordinates.lat - userLat) * 111;
              const dLng = (mah.coordinates.lng - userLng) * 85;
              const distKm = Math.sqrt(dLat * dLat + dLng * dLng);
              if (distKm < minDistance) {
                minDistance = distKm;
                closestMahalla = mah;
              }
            });
          });
        });

        setIsLocating(false);

        if (closestMahalla) {
          const target = closestMahalla as Mahalla;
          setLocationSuccessMsg(
            `GPS orqali topildi: ${target.name} (~${minDistance < 1 ? Math.round(minDistance * 1000) + ' metr' : minDistance.toFixed(1) + ' km'})`
          );
          triggerHaptic('success');
          setTimeout(() => {
            onSelectMahalla(target);
            onClose();
          }, 900);
        }
      },
      () => {
        setIsLocating(false);
        setLocationError("Geolokatsiyaga ruxsat berilmadi. Iltimos, ro'yxatdan tanlang.");
        triggerHaptic('error');
      },
      { timeout: 7000, enableHighAccuracy: true }
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Top Header */}
        <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            {step !== 'region' ? (
              <button
                type="button"
                onClick={handleBack}
                className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 flex items-center justify-center transition-colors"
                title="Orqaga"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
            ) : (
              <div className="w-8 h-8 rounded-xl bg-sky-100 dark:bg-sky-950/80 text-sky-700 dark:text-sky-300 flex items-center justify-center">
                <MapPinned className="w-4 h-4" />
              </div>
            )}
            <div>
              <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white leading-tight">
                {step === 'region' && '1-qadam: Viloyat / Shaharni tanlang'}
                {step === 'district' && `2-qadam: ${chosenRegion.name} tumanlari`}
                {step === 'mahalla' && `3-qadam: ${chosenDistrict.name} mahallalari`}
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                {step === 'region' && 'Yashash hududingiz bo\'yicha birinchi bosqich'}
                {step === 'district' && 'Tumaningizni belgilang'}
                {step === 'mahalla' && 'Mahallangiz tanlangach avtomatik saqlanadi'}
              </p>
            </div>
          </div>

          <button
            onClick={() => {
              triggerHaptic('light');
              onClose();
            }}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Step Progression Indicator Bar */}
        <div className="px-5 py-2.5 bg-slate-50 dark:bg-slate-800/40 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs font-semibold">
          <div className="flex items-center gap-1.5">
            <span
              className={`px-2 py-0.5 rounded-lg text-[11px] ${
                step === 'region'
                  ? 'bg-sky-600 text-white font-bold'
                  : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
              }`}
            >
              1. Viloyat
            </span>
            <span className="text-slate-400 text-[10px]">➔</span>
            <span
              className={`px-2 py-0.5 rounded-lg text-[11px] ${
                step === 'district'
                  ? 'bg-sky-600 text-white font-bold'
                  : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
              }`}
            >
              2. Tuman
            </span>
            <span className="text-slate-400 text-[10px]">➔</span>
            <span
              className={`px-2 py-0.5 rounded-lg text-[11px] ${
                step === 'mahalla'
                  ? 'bg-sky-600 text-white font-bold'
                  : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
              }`}
            >
              3. Mahalla
            </span>
          </div>

          {step !== 'region' && (
            <button
              type="button"
              onClick={handleBack}
              className="text-xs text-sky-600 dark:text-sky-400 hover:underline flex items-center gap-0.5 font-medium"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              <span>Orqaga</span>
            </button>
          )}
        </div>

        {/* Modal Dynamic Content: Step-by-Step Replacement */}
        <div className="p-4 sm:p-5 space-y-4 overflow-y-auto flex-1">
          {/* GPS Auto-locate strip */}
          <div className="bg-sky-50 dark:bg-sky-950/40 border border-sky-100 dark:border-sky-900/40 rounded-2xl p-3">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-full bg-sky-600 text-white flex items-center justify-center shrink-0">
                  <Compass className={`w-3.5 h-3.5 ${isLocating ? 'animate-spin' : ''}`} />
                </div>
                <div>
                  <div className="text-xs font-semibold text-slate-900 dark:text-white">
                    Tezkor geolokatsiya
                  </div>
                  <div className="text-[10px] text-slate-500 dark:text-slate-400">
                    GPS orqali eng yaqin mahallani aniqlash
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={handleAutoLocate}
                disabled={isLocating}
                className="px-3 py-1.5 text-xs font-semibold text-white bg-sky-600 hover:bg-sky-700 rounded-xl shadow-xs transition-colors shrink-0 flex items-center gap-1.5 disabled:opacity-50"
              >
                <Navigation className="w-3 h-3" />
                <span>{isLocating ? 'Aniqlanmoqda...' : 'GPS bilan aniqlash'}</span>
              </button>
            </div>

            {locationSuccessMsg && (
              <div className="mt-2 text-xs text-emerald-700 dark:text-emerald-400 font-medium bg-emerald-50 dark:bg-emerald-950/40 p-2 rounded-xl border border-emerald-200 dark:border-emerald-800">
                {locationSuccessMsg}
              </div>
            )}

            {locationError && (
              <div className="mt-2 text-xs text-rose-600 dark:text-rose-400 font-medium">
                {locationError}
              </div>
            )}
          </div>

          {/* STEP 1: VILOYAT LIST (Replaces view) */}
          {step === 'region' && (
            <div className="space-y-2">
              <div className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Viloyat yoki Toshkent shahrini tanlang:
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {REGIONS_DATA.map((region) => {
                  const isCurrent = chosenRegion.id === region.id;
                  return (
                    <button
                      key={region.id}
                      type="button"
                      onClick={() => handleSelectRegion(region)}
                      className={`p-3.5 rounded-2xl border text-left transition-all flex items-center justify-between group ${
                        isCurrent
                          ? 'border-sky-500 bg-sky-50/70 dark:bg-sky-950/40 text-sky-900 dark:text-sky-200 shadow-xs'
                          : 'border-slate-200 dark:border-slate-800 hover:border-sky-300 dark:hover:border-sky-700 bg-white dark:bg-slate-800/60'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 flex items-center justify-center font-bold text-xs group-hover:bg-sky-600 group-hover:text-white transition-colors">
                          <Building2 className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="text-xs font-bold text-slate-900 dark:text-white">
                            {region.name}
                          </div>
                          <div className="text-[10px] text-slate-500 dark:text-slate-400">
                            {region.districts.length} ta tuman
                          </div>
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-sky-600 group-hover:translate-x-0.5 transition-all" />
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* STEP 2: TUMAN LIST (Replaces view) */}
          {step === 'district' && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="font-bold text-slate-700 dark:text-slate-300">
                  {chosenRegion.name} hududidagi tumanlar:
                </span>
                <span className="text-[11px] text-slate-400">
                  {chosenRegion.districts.length} ta tuman mavjud
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {chosenRegion.districts.map((district) => {
                  const isCurrent = chosenDistrict.id === district.id;
                  return (
                    <button
                      key={district.id}
                      type="button"
                      onClick={() => handleSelectDistrict(district)}
                      className={`p-3.5 rounded-2xl border text-left transition-all flex items-center justify-between group ${
                        isCurrent
                          ? 'border-sky-500 bg-sky-50/70 dark:bg-sky-950/40 text-sky-900 dark:text-sky-200 shadow-xs'
                          : 'border-slate-200 dark:border-slate-800 hover:border-sky-300 dark:hover:border-sky-700 bg-white dark:bg-slate-800/60'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 flex items-center justify-center font-bold text-xs group-hover:bg-sky-600 group-hover:text-white transition-colors">
                          <MapPin className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="text-xs font-bold text-slate-900 dark:text-white">
                            {district.name}
                          </div>
                          <div className="text-[10px] text-slate-500 dark:text-slate-400">
                            {district.mahallas.length} ta mahalla
                          </div>
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-sky-600 group-hover:translate-x-0.5 transition-all" />
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* STEP 3: MAHALLA LIST (Replaces view) */}
          {step === 'mahalla' && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="font-bold text-slate-700 dark:text-slate-300">
                  {chosenDistrict.name} mahallalari ro'yxati:
                </span>
                <span className="text-[11px] text-slate-400">
                  {chosenDistrict.mahallas.length} ta mahalla
                </span>
              </div>
              <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                {chosenDistrict.mahallas.map((mahalla) => {
                  const isSelected = selectedMahalla.id === mahalla.id;
                  return (
                    <button
                      key={mahalla.id}
                      type="button"
                      onClick={() => handleSelectMahalla(mahalla)}
                      className={`w-full text-left p-3.5 rounded-2xl border transition-all flex items-start justify-between gap-2.5 ${
                        isSelected
                          ? 'border-sky-600 bg-sky-50/80 dark:bg-sky-950/60 ring-2 ring-sky-500/20'
                          : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-slate-800/40'
                      }`}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-bold text-slate-900 dark:text-white">
                            {mahalla.name}
                          </span>
                          {isSelected && (
                            <span className="text-[10px] bg-sky-600 text-white font-semibold px-1.5 py-0.2 rounded">
                              Tanlangan
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                          {mahalla.address}
                        </div>
                        <div className="text-[10px] text-sky-700 dark:text-sky-400 mt-1 flex items-center gap-1">
                          <ShieldCheck className="w-3 h-3" />
                          <span>{mahalla.policeStation}</span>
                        </div>
                      </div>

                      {isSelected ? (
                        <div className="w-6 h-6 rounded-full bg-sky-600 text-white flex items-center justify-center shrink-0 mt-0.5 shadow-xs">
                          <Check className="w-3.5 h-3.5 stroke-[3]" />
                        </div>
                      ) : (
                        <div className="text-xs font-bold text-sky-600 dark:text-sky-400 shrink-0 self-center hover:underline">
                          Tanlash ➔
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/80 flex items-center justify-between text-xs">
          {step !== 'region' ? (
            <button
              type="button"
              onClick={handleBack}
              className="px-4 py-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 font-semibold flex items-center gap-1 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Orqaga qaytish</span>
            </button>
          ) : (
            <div className="text-[11px] text-slate-400">
              Joriy mahalla: <strong className="text-slate-700 dark:text-slate-200">{selectedMahalla.name}</strong>
            </div>
          )}

          <button
            type="button"
            onClick={() => {
              triggerHaptic('light');
              onClose();
            }}
            className="px-4 py-2 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold rounded-xl transition-colors"
          >
            Yopish
          </button>
        </div>
      </div>
    </div>
  );
};
