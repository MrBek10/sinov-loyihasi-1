import React, { useState, useRef, useEffect } from 'react';
import {
  Send,
  Mic,
  Square,
  Trash2,
  Play,
  Pause,
  Upload,
  Camera,
  ShieldCheck,
  AlertCircle,
  X,
  FileCheck,
  Volume2,
} from 'lucide-react';
import {
  Appeal,
  AppealCategory,
  Inspector,
  Mahalla,
  TelegramUser,
} from '../types';
import { CATEGORY_LABELS } from '../data/mockData';
import { AudioRecorder, AudioRecorderState } from '../utils/audioRecorder';
import { triggerHaptic } from '../utils/telegram';

interface AppealFormProps {
  mahalla: Mahalla;
  inspector: Inspector;
  currentUser: TelegramUser;
  onSubmit: (appeal: Appeal) => void;
  onCancel: () => void;
}

export const AppealForm: React.FC<AppealFormProps> = ({
  mahalla,
  inspector,
  currentUser,
  onSubmit,
  onCancel,
}) => {
  const [category, setCategory] = useState<AppealCategory>('security');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [address, setAddress] = useState(mahalla.address);
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [mediaFiles, setMediaFiles] = useState<{ id: string; url: string; name: string }[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  // Audio Recorder State
  const [recorderState, setRecorderState] = useState<AudioRecorderState>({
    isRecording: false,
    duration: 0,
    audioBlob: null,
    audioUrl: null,
    error: null,
  });
  const audioRecorderRef = useRef<AudioRecorder | null>(null);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    audioRecorderRef.current = new AudioRecorder((state) => {
      setRecorderState(state);
    });

    return () => {
      if (audioRecorderRef.current) {
        audioRecorderRef.current.reset();
      }
    };
  }, []);

  const handleStartRecording = async () => {
    triggerHaptic('medium');
    if (audioRecorderRef.current) {
      await audioRecorderRef.current.start();
    }
  };

  const handleStopRecording = () => {
    triggerHaptic('light');
    if (audioRecorderRef.current) {
      audioRecorderRef.current.stop();
    }
  };

  const handleDeleteAudio = () => {
    triggerHaptic('light');
    if (audioRecorderRef.current) {
      audioRecorderRef.current.reset();
    }
    setIsPlayingAudio(false);
  };

  const toggleAudioPlayback = () => {
    if (!recorderState.audioUrl) return;
    if (!audioPlayerRef.current) {
      audioPlayerRef.current = new Audio(recorderState.audioUrl);
      audioPlayerRef.current.onended = () => setIsPlayingAudio(false);
    }

    if (isPlayingAudio) {
      audioPlayerRef.current.pause();
      setIsPlayingAudio(false);
    } else {
      audioPlayerRef.current.play();
      setIsPlayingAudio(true);
    }
  };

  // Image Upload Handler
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    triggerHaptic('light');
    const newMedia: { id: string; url: string; name: string }[] = [];

    Array.from(files).forEach((file) => {
      const url = URL.createObjectURL(file);
      newMedia.push({
        id: Math.random().toString(36).substring(7),
        url,
        name: file.name,
      });
    });

    setMediaFiles((prev) => [...prev, ...newMedia].slice(0, 4));
  };

  const handleRemoveMedia = (id: string) => {
    triggerHaptic('light');
    setMediaFiles((prev) => prev.filter((item) => item.id !== id));
  };

  // Quick Photo Simulation
  const handleSimulateQuickPhoto = () => {
    triggerHaptic('light');
    const samplePhotos = [
      'https://images.unsplash.com/photo-1590674899484-d5640e854abe?w=500&auto=format&fit=crop&q=60',
      'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?w=500&auto=format&fit=crop&q=60',
    ];
    const picked = samplePhotos[mediaFiles.length % samplePhotos.length];
    setMediaFiles((prev) => [
      ...prev,
      {
        id: Math.random().toString(36).substring(7),
        url: picked,
        name: 'kamera_surati.jpg',
      },
    ]);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim() && !description.trim() && !recorderState.audioUrl) {
      setValidationError("Iltimos, murojaat matnini yozing yoki ovozli xabar qoldiring.");
      triggerHaptic('warning');
      return;
    }

    setValidationError(null);
    setIsSubmitting(true);
    triggerHaptic('medium');

    const ticketNumber = `IIB-2026-${Math.floor(1000 + Math.random() * 9000)}`;

    const newAppeal: Appeal = {
      id: `app-${Date.now()}`,
      ticketNumber,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      category,
      title: title.trim() || `${CATEGORY_LABELS[category].label} bo'yicha murojaat`,
      description: description.trim() || "Ovozli / media murojaat biriktirildi.",
      address: address.trim() || mahalla.address,
      mahallaId: mahalla.id,
      inspectorId: inspector.id,
      isAnonymous,
      citizen: isAnonymous
        ? { fullName: 'Anonim fuqaro' }
        : {
            id: currentUser.id,
            fullName: `${currentUser.first_name} ${currentUser.last_name || ''}`.trim(),
            username: currentUser.username,
            phone: currentUser.phone_number,
            photoUrl: currentUser.photo_url,
          },
      audioUrl: recorderState.audioUrl || undefined,
      audioDuration: recorderState.duration || undefined,
      mediaUrls: mediaFiles.map((m) => m.url),
      status: 'new',
      statusHistory: [
        {
          status: 'new',
          timestamp: new Date().toISOString(),
          changedBy: isAnonymous ? 'Fuqaro (Anonim)' : (currentUser.first_name || 'Fuqaro'),
        },
      ],
    };

    setTimeout(() => {
      setIsSubmitting(false);
      triggerHaptic('success');
      onSubmit(newAppeal);
    }, 400);
  };

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden">
      {/* Form Header */}
      <div className="bg-sky-50/80 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 p-4">
        <div className="flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-sky-700 dark:text-sky-300">
              Yangi Murojaat Shakli
            </span>
            <h3 className="text-base font-bold text-slate-900 dark:text-white mt-0.5">
              Profilaktika inspektoriga xabar yuborish
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Qabul qiluvchi: <span className="font-semibold text-slate-700 dark:text-slate-300">{inspector.fullName}</span> ({mahalla.name})
            </p>
          </div>
          <button
            type="button"
            onClick={onCancel}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="p-4 sm:p-5 space-y-4">
        {/* Category Picker */}
        <div>
          <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-2">
            1. Murojaat toifasini tanlang *
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {(Object.keys(CATEGORY_LABELS) as AppealCategory[]).map((catKey) => {
              const item = CATEGORY_LABELS[catKey];
              const isSelected = category === catKey;
              return (
                <button
                  key={catKey}
                  type="button"
                  onClick={() => {
                    triggerHaptic('selection');
                    setCategory(catKey);
                  }}
                  className={`p-2.5 rounded-xl border text-left transition-all flex flex-col justify-between ${
                    isSelected
                      ? 'border-sky-600 bg-sky-50 dark:bg-sky-950/40 text-sky-950 dark:text-sky-100 ring-1 ring-sky-600'
                      : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 bg-white dark:bg-slate-900/60 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  <span className="text-xs font-semibold leading-tight line-clamp-1">{item.label}</span>
                  <span className="text-[10px] text-slate-400 mt-1 line-clamp-1">{item.description}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Title */}
        <div>
          <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">
            2. Qisqacha mavzu (ixtiyoriy)
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Masalan: Tungi shovqin, noqonuniy panjara yoki yo'l belgisi..."
            className="w-full text-xs bg-slate-50 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2.5 text-slate-900 dark:text-white placeholder:text-slate-400 focus:ring-2 focus:ring-sky-500 focus:outline-none"
          />
        </div>

        {/* Description textarea */}
        <div>
          <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">
            3. Muammo tavsifi (matnli xabar)
          </label>
          <textarea
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Vaziyatni batafsil yozib bering: nima sodir bo'ldi, qachon, qanday yordam kerak..."
            className="w-full text-xs bg-slate-50 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 rounded-xl p-3 text-slate-900 dark:text-white placeholder:text-slate-400 focus:ring-2 focus:ring-sky-500 focus:outline-none"
          />
        </div>

        {/* Audio Recording Section (Web Audio API) */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
              <Volume2 className="w-3.5 h-3.5 text-sky-600" />
              <span>4. Ovozli xabar qoldirish (Web Audio)</span>
            </label>
            <span className="text-[11px] text-slate-400">To'g'ridan-to'g'ri mikrofon orqali</span>
          </div>

          <div className="p-3 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl">
            {/* If NOT recording and NO audio saved */}
            {!recorderState.isRecording && !recorderState.audioUrl && (
              <div className="flex items-center justify-between gap-3">
                <div className="text-xs text-slate-500 dark:text-slate-400">
                  Matn yozish noqulay bo'lsa, ovozli xabar orqali tushuntiring:
                </div>
                <button
                  type="button"
                  onClick={handleStartRecording}
                  className="px-3.5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-semibold flex items-center gap-2 shadow-sm transition-transform active:scale-95 shrink-0"
                >
                  <Mic className="w-4 h-4" />
                  <span>Ovoz yozish</span>
                </button>
              </div>
            )}

            {/* If CURRENTLY recording */}
            {recorderState.isRecording && (
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-3 h-3 rounded-full bg-rose-600 animate-ping" />
                  <span className="text-xs font-bold font-mono text-rose-600 dark:text-rose-400">
                    Ovoz yozilmoqda... {Math.floor(recorderState.duration / 60)}:
                    {(recorderState.duration % 60).toString().padStart(2, '0')}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleStopRecording}
                  className="px-3.5 py-2 bg-slate-900 dark:bg-slate-700 text-white rounded-xl text-xs font-semibold flex items-center gap-2 shadow-sm active:scale-95 shrink-0"
                >
                  <Square className="w-3.5 h-3.5 fill-current" />
                  <span>To'xtatish</span>
                </button>
              </div>
            )}

            {/* If audio has been recorded */}
            {recorderState.audioUrl && (
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={toggleAudioPlayback}
                    className="w-8 h-8 rounded-full bg-sky-600 text-white flex items-center justify-center shadow-sm"
                  >
                    {isPlayingAudio ? (
                      <Pause className="w-3.5 h-3.5 fill-current" />
                    ) : (
                      <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
                    )}
                  </button>
                  <div>
                    <div className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                      Ovozli xabar biriktirildi
                    </div>
                    <div className="text-[11px] text-slate-400 font-mono">
                      Davomiyligi: ~{recorderState.duration} soniya
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleDeleteAudio}
                  className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-colors"
                  title="Ovozni o'chirish"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            )}

            {recorderState.error && (
              <div className="text-xs text-rose-600 dark:text-rose-400 mt-2 font-medium">
                {recorderState.error}
              </div>
            )}
          </div>
        </div>

        {/* Media Attachments (Photos/Video) */}
        <div>
          <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1.5">
            5. Media fayllar (Rasm / Video biriktirish)
          </label>
          <div className="flex flex-wrap items-center gap-2">
            {/* File input trigger */}
            <label className="cursor-pointer px-3 py-2 border border-dashed border-slate-300 dark:border-slate-700 hover:border-sky-500 bg-slate-50 dark:bg-slate-800/80 rounded-xl text-xs font-medium text-slate-600 dark:text-slate-300 flex items-center gap-1.5 transition-colors">
              <Upload className="w-3.5 h-3.5 text-sky-600" />
              <span>Galereyadan yuklash</span>
              <input
                type="file"
                accept="image/*,video/*"
                multiple
                onChange={handleFileUpload}
                className="hidden"
              />
            </label>

            {/* Fast camera simulation button */}
            <button
              type="button"
              onClick={handleSimulateQuickPhoto}
              className="px-3 py-2 border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 rounded-xl text-xs font-medium text-slate-600 dark:text-slate-300 flex items-center gap-1.5 hover:bg-slate-100"
            >
              <Camera className="w-3.5 h-3.5 text-slate-500" />
              <span>Suratga olish</span>
            </button>
          </div>

          {/* Media previews list */}
          {mediaFiles.length > 0 && (
            <div className="flex items-center gap-2 mt-2.5 overflow-x-auto pb-1">
              {mediaFiles.map((item) => (
                <div
                  key={item.id}
                  className="relative w-16 h-16 rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700 shrink-0 group"
                >
                  <img
                    src={item.url}
                    alt={item.name}
                    className="w-full h-full object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => handleRemoveMedia(item.id)}
                    className="absolute top-1 right-1 p-0.5 bg-slate-900/80 text-white rounded-full hover:bg-rose-600 transition-colors"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Address */}
        <div>
          <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">
            6. Aniq manzil / Mo'ljal
          </label>
          <input
            type="text"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="Ko'cha, uy yoki xonadon raqami..."
            className="w-full text-xs bg-slate-50 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-white placeholder:text-slate-400 focus:ring-2 focus:ring-sky-500 focus:outline-none"
          />
        </div>

        {/* Anonymity Checkbox */}
        <div className="bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 rounded-xl p-3">
          <label className="flex items-start gap-2.5 cursor-pointer">
            <input
              type="checkbox"
              checked={isAnonymous}
              onChange={(e) => {
                triggerHaptic('selection');
                setIsAnonymous(e.target.checked);
              }}
              className="mt-0.5 rounded text-sky-600 focus:ring-sky-500 w-4 h-4"
            />
            <div>
              <div className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                <span>Anonim murojaat qilish</span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-snug">
                Shaxsiy ma'lumotlaringiz (Telegram ID, ism, profil) inspektorga yashiriladi. Faqat muammo tafsilotlari yetkaziladi.
              </p>
            </div>
          </label>
        </div>

        {/* Validation Error */}
        {validationError && (
          <div className="flex items-center gap-2 text-xs text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 p-2.5 rounded-xl border border-rose-200 dark:border-rose-900">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{validationError}</span>
          </div>
        )}

        {/* Submit Buttons */}
        <div className="pt-2 flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2.5 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
          >
            Bekor qilish
          </button>

          <button
            type="submit"
            disabled={isSubmitting}
            className="px-5 py-2.5 bg-sky-600 hover:bg-sky-700 text-white font-semibold text-xs rounded-xl shadow-md transition-all flex items-center gap-2 active:scale-95 disabled:opacity-50"
          >
            <Send className="w-4 h-4" />
            <span>{isSubmitting ? 'Yuborilmoqda...' : 'Murojaatni yuborish'}</span>
          </button>
        </div>
      </form>
    </div>
  );
};
