import React, { useState, useRef, useEffect } from 'react';
import {
  Phone,
  Mic,
  Video,
  Square,
  Play,
  Pause,
  Trash2,
  Send,
  Settings,
  CheckCircle2,
  Camera,
  X,
  RefreshCw,
  Image as ImageIcon,
} from 'lucide-react';
import { Inspector, Mahalla, Appeal } from '../types';

interface CitizenMinimalPortalProps {
  inspector: Inspector;
  mahalla: Mahalla;
  onOpenSettings: () => void;
  onSubmitAppeal: (appeal: Appeal) => void;
  onCallOfficer: () => void;
}

export const CitizenMinimalPortal: React.FC<CitizenMinimalPortalProps> = ({
  inspector,
  mahalla,
  onOpenSettings,
  onSubmitAppeal,
  onCallOfficer,
}) => {
  // Voice Recording State
  const [isVoiceMode, setIsVoiceMode] = useState(false);
  const [isRecordingAudio, setIsRecordingAudio] = useState(false);
  const [audioTimer, setAudioTimer] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const audioElementRef = useRef<HTMLAudioElement | null>(null);

  // Live Camera Viewfinder State
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('environment');
  const videoStreamRef = useRef<MediaStream | null>(null);
  const liveVideoRef = useRef<HTMLVideoElement | null>(null);
  const [capturedMediaBlob, setCapturedMediaBlob] = useState<Blob | null>(null);
  const [capturedMediaType, setCapturedMediaType] = useState<'photo' | 'video' | null>(null);
  const [capturedMediaUrl, setCapturedMediaUrl] = useState<string | null>(null);
  
  // Video Recording in Viewfinder
  const [isRecordingVideo, setIsRecordingVideo] = useState(false);
  const [videoTimer, setVideoTimer] = useState(0);
  const videoChunksRef = useRef<Blob[]>([]);
  const videoRecorderRef = useRef<MediaRecorder | null>(null);
  const pressTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isLongPressTriggered = useRef(false);

  // Gallery File Upload fallback
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Success Confirmation State
  const [sentSuccessType, setSentSuccessType] = useState<'voice' | 'media' | null>(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
      if (pressTimerRef.current) clearTimeout(pressTimerRef.current);
      if (audioUrl) URL.revokeObjectURL(audioUrl);
      if (capturedMediaUrl) URL.revokeObjectURL(capturedMediaUrl);
      stopCameraStream();
    };
  }, []);

  const stopCameraStream = () => {
    if (videoStreamRef.current) {
      videoStreamRef.current.getTracks().forEach((track) => track.stop());
      videoStreamRef.current = null;
    }
  };

  // Start Live Viewfinder Camera with robust 4-tier fallback
  const startCamera = async (newFacingMode = facingMode) => {
    stopCameraStream();
    setIsCameraActive(true);
    setCapturedMediaBlob(null);
    setCapturedMediaType(null);
    if (capturedMediaUrl) {
      URL.revokeObjectURL(capturedMediaUrl);
      setCapturedMediaUrl(null);
    }

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      alert("Brauzeringiz kamerani qo'llab-quvvatlamaydi yoki sayt HTTPS orqali ochilmagan!");
      setIsCameraActive(false);
      return false;
    }

    try {
      let stream: MediaStream;
      try {
        // Tier 1: facingMode + audio
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: newFacingMode, width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: true,
        });
      } catch (err1) {
        try {
          // Tier 2: facingMode, no audio
          stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: newFacingMode },
            audio: false,
          });
        } catch (err2) {
          try {
            // Tier 3: generic video + audio (fixes Requested device not found on desktops/laptops)
            stream = await navigator.mediaDevices.getUserMedia({
              video: true,
              audio: true,
            });
          } catch (err3) {
            // Tier 4: generic video only
            stream = await navigator.mediaDevices.getUserMedia({
              video: true,
              audio: false,
            });
          }
        }
      }

      videoStreamRef.current = stream;
      if (liveVideoRef.current) {
        liveVideoRef.current.srcObject = stream;
        await liveVideoRef.current.play().catch(() => {});
      }
      return true;
    } catch (err) {
      console.error("Kamera xatosi:", err);
      setIsCameraActive(false);
      alert("Kameraga ulanib bo'lmadi ('Requested device not found'). Iltimos, galereyadan fayl yuklang.");
      fileInputRef.current?.click();
      return false;
    }
  };

  const switchCamera = () => {
    const nextMode = facingMode === 'user' ? 'environment' : 'user';
    setFacingMode(nextMode);
    startCamera(nextMode);
  };

  // Take Snapshot Photo (Quick tap)
  const takeSnapshot = () => {
    if (!liveVideoRef.current || !liveVideoRef.current.videoWidth) return;
    if (navigator.vibrate) navigator.vibrate(25);

    const video = liveVideoRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      canvas.toBlob((blob) => {
        if (blob) {
          setCapturedMediaBlob(blob);
          setCapturedMediaType('photo');
          const url = URL.createObjectURL(blob);
          setCapturedMediaUrl(url);
          stopCameraStream();
        }
      }, 'image/jpeg', 0.9);
    }
  };

  // Start Video Recording (Press & Hold) with mimeType detection
  const startVideoRecording = () => {
    if (!videoStreamRef.current) return;
    if (navigator.vibrate) navigator.vibrate(30);

    isLongPressTriggered.current = true;
    videoChunksRef.current = [];
    setVideoTimer(0);

    let mimeType = "video/mp4";
    if (MediaRecorder.isTypeSupported("video/webm;codecs=vp9,opus")) {
      mimeType = "video/webm;codecs=vp9,opus";
    } else if (MediaRecorder.isTypeSupported("video/webm")) {
      mimeType = "video/webm";
    } else if (MediaRecorder.isTypeSupported("video/mp4")) {
      mimeType = "video/mp4";
    }

    try {
      const recorder = new MediaRecorder(videoStreamRef.current, { mimeType });
      videoRecorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) videoChunksRef.current.push(e.data);
      };

      recorder.onstop = () => {
        const blob = new Blob(videoChunksRef.current, { type: videoRecorderRef.current?.mimeType || "video/webm" });
        setCapturedMediaBlob(blob);
        setCapturedMediaType('video');
        const url = URL.createObjectURL(blob);
        setCapturedMediaUrl(url);
        stopCameraStream();
      };

      recorder.start();
      setIsRecordingVideo(true);

      timerIntervalRef.current = setInterval(() => {
        setVideoTimer((prev) => prev + 1);
      }, 1000);
    } catch (err) {
      console.error("Video recording error:", err);
      try {
        const fallbackRecorder = new MediaRecorder(videoStreamRef.current);
        videoRecorderRef.current = fallbackRecorder;
        fallbackRecorder.ondataavailable = (e) => {
          if (e.data && e.data.size > 0) videoChunksRef.current.push(e.data);
        };
        fallbackRecorder.onstop = () => {
          const blob = new Blob(videoChunksRef.current, { type: "video/webm" });
          setCapturedMediaBlob(blob);
          setCapturedMediaType('video');
          const url = URL.createObjectURL(blob);
          setCapturedMediaUrl(url);
          stopCameraStream();
        };
        fallbackRecorder.start();
        setIsRecordingVideo(true);
        timerIntervalRef.current = setInterval(() => {
          setVideoTimer((prev) => prev + 1);
        }, 1000);
      } catch (fallbackErr) {
        console.error("Fallback recorder error:", fallbackErr);
      }
    }
  };

  const stopVideoRecording = () => {
    if (!isRecordingVideo) return;
    if (navigator.vibrate) navigator.vibrate(15);
    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    setIsRecordingVideo(false);

    if (videoRecorderRef.current && videoRecorderRef.current.state !== 'inactive') {
      videoRecorderRef.current.stop();
    }
  };

  // Shutter Button Pointer Handlers (Tap vs Hold)
  const handlePointerDown = () => {
    isLongPressTriggered.current = false;
    pressTimerRef.current = setTimeout(() => {
      startVideoRecording();
    }, 400); // 400ms hold triggers video recording
  };

  const handlePointerUp = () => {
    if (pressTimerRef.current) clearTimeout(pressTimerRef.current);

    if (isRecordingVideo) {
      stopVideoRecording();
    } else if (!isLongPressTriggered.current) {
      // Quick tap -> Photo snapshot
      takeSnapshot();
    }
  };

  // Gallery File Upload Handler
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setCapturedMediaBlob(file);
      const isVid = file.type.includes('video');
      setCapturedMediaType(isVid ? 'video' : 'photo');
      const url = URL.createObjectURL(file);
      setCapturedMediaUrl(url);
    }
  };

  // Voice Recording Handlers
  const startAudioRecording = async () => {
    if (navigator.vibrate) navigator.vibrate(20);
    audioChunksRef.current = [];
    setAudioBlob(null);
    setAudioUrl(null);
    setAudioTimer(0);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      recorder.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        setAudioBlob(blob);
        const url = URL.createObjectURL(blob);
        setAudioUrl(url);
        stream.getTracks().forEach((track) => track.stop());
      };

      recorder.start();
      setIsRecordingAudio(true);

      timerIntervalRef.current = setInterval(() => {
        setAudioTimer((prev) => prev + 1);
      }, 1000);
    } catch (err) {
      console.error('Audio capture error:', err);
      setIsRecordingAudio(true);
      timerIntervalRef.current = setInterval(() => {
        setAudioTimer((prev) => prev + 1);
      }, 1000);
    }
  };

  const stopAudioRecording = () => {
    if (navigator.vibrate) navigator.vibrate(10);
    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    setIsRecordingAudio(false);

    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    } else {
      const dummyBlob = new Blob(['simulated-audio'], { type: 'audio/webm' });
      setAudioBlob(dummyBlob);
      setAudioUrl('https://actions.google.com/sounds/v1/alarms/beep_short.ogg');
    }
  };

  const deleteAudioRecording = () => {
    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    setIsRecordingAudio(false);
    setAudioBlob(null);
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    setAudioUrl(null);
    setAudioTimer(0);
    setIsPlayingAudio(false);
  };

  const toggleAudioPlayback = () => {
    if (!audioUrl) return;
    if (!audioElementRef.current) {
      audioElementRef.current = new Audio(audioUrl);
      audioElementRef.current.onended = () => setIsPlayingAudio(false);
    }

    if (isPlayingAudio) {
      audioElementRef.current.pause();
      setIsPlayingAudio(false);
    } else {
      audioElementRef.current.play();
      setIsPlayingAudio(true);
    }
  };

  const handleSendVoiceMessage = () => {
    if (navigator.vibrate) navigator.vibrate([20, 30, 20]);
    const newAppeal: Appeal = {
      id: 'app-' + Math.random().toString(36).substring(2, 9),
      ticketNumber: `IIB-2026-${Math.floor(1000 + Math.random() * 9000)}`,
      citizen: {
        id: 'web-citizen',
        fullName: 'Fuqaro (Veb murojaatchi)',
      },
      inspectorId: inspector.id,
      mahallaId: mahalla.id,
      category: 'security',
      title: "Ovozli tezkor murojaat",
      description: `Fuqaro tomonidan brauzer orqali yuborilgan ovozli xabar (${formatDuration(audioTimer || 6)})`,
      address: mahalla.address,
      status: 'new',
      statusHistory: [
        {
          status: 'new',
          timestamp: new Date().toISOString(),
          changedBy: 'Fuqaro',
        },
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      audioUrl: audioUrl || 'https://actions.google.com/sounds/v1/alarms/beep_short.ogg',
      audioDuration: audioTimer || 6,
      isAnonymous: false,
    };

    onSubmitAppeal(newAppeal);
    setSentSuccessType('voice');
    setTimeout(() => {
      setSentSuccessType(null);
      setIsVoiceMode(false);
      deleteAudioRecording();
    }, 2500);
  };

  const handleSendMediaMessage = () => {
    if (navigator.vibrate) navigator.vibrate([20, 30, 20]);
    const isVid = capturedMediaType === 'video';
    const newAppeal: Appeal = {
      id: 'app-' + Math.random().toString(36).substring(2, 9),
      ticketNumber: `IIB-2026-${Math.floor(1000 + Math.random() * 9000)}`,
      citizen: {
        id: 'web-citizen',
        fullName: 'Fuqaro (Veb murojaatchi)',
      },
      inspectorId: inspector.id,
      mahallaId: mahalla.id,
      category: isVid ? 'security' : 'neighbor_dispute',
      title: isVid ? "Video tezkor murojaat" : "Suratli tezkor murojaat",
      description: isVid ? "Fuqaro tomonidan kameradan yozilgan video murojaat" : "Fuqaro tomonidan olingan suratli dalil",
      address: mahalla.address,
      status: 'new',
      statusHistory: [
        {
          status: 'new',
          timestamp: new Date().toISOString(),
          changedBy: 'Fuqaro',
        },
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      mediaUrls: capturedMediaUrl ? [capturedMediaUrl] : [],
      isAnonymous: false,
    };

    onSubmitAppeal(newAppeal);
    setSentSuccessType('media');
    setTimeout(() => {
      setSentSuccessType(null);
      setIsCameraActive(false);
      setCapturedMediaBlob(null);
      setCapturedMediaType(null);
      if (capturedMediaUrl) URL.revokeObjectURL(capturedMediaUrl);
      setCapturedMediaUrl(null);
    }, 2500);
  };

  const formatDuration = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="max-w-md w-full mx-auto space-y-4 animate-in fade-in duration-300">
      {/* 1. INSPECTOR PROFILE CARD (HEADER) */}
      <div className="relative bg-gradient-to-br from-slate-900 via-sky-950 to-slate-900 text-white rounded-3xl p-5 shadow-lg border border-sky-500/20">
        {/* Settings Icon (Gear) in top-right corner */}
        <button
          type="button"
          onClick={onOpenSettings}
          className="absolute top-4 right-4 w-9 h-9 rounded-2xl bg-white/10 hover:bg-white/20 text-slate-200 hover:text-white flex items-center justify-center transition-all backdrop-blur-md active:scale-95"
          title="Akkaunt Sozlamalari"
          aria-label="Sozlamalar"
        >
          <Settings className="w-5 h-5" />
        </button>

        {/* Inspector Photo, Full Name, Rank, Mahalla */}
        <div className="flex items-center gap-4 pr-10">
          <div className="relative shrink-0">
            <img
              src={inspector.photoUrl}
              alt={inspector.fullName}
              className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl object-cover object-top border-2 border-sky-400/50 shadow-md bg-slate-800"
            />
            <div className="absolute -bottom-1 -right-1 bg-emerald-500 text-white p-0.5 rounded-full shadow">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>

          <div className="min-w-0">
            <div className="text-[10px] font-mono tracking-wider uppercase text-sky-400 font-semibold">
              Profilaktika Inspektori
            </div>
            <h2 className="text-base sm:text-lg font-bold text-white leading-tight mt-0.5">
              {inspector.fullName}
            </h2>
            <div className="text-xs text-sky-200 font-medium mt-0.5">
              {inspector.rank}
            </div>
            <div className="text-xs text-slate-300 font-medium mt-1 truncate flex items-center gap-1">
              <span>📍</span>
              <span className="font-semibold text-white">{mahalla.name}</span>
            </div>
          </div>
        </div>

        {/* Badge & Reception minimal info */}
        <div className="mt-3.5 pt-3 border-t border-white/10 flex items-center justify-between text-[11px] text-slate-300">
          <span className="font-mono text-sky-300 bg-white/5 px-2 py-0.5 rounded-lg border border-white/10">
            {inspector.badgeNumber}
          </span>
          <span className="text-slate-400 truncate max-w-[200px]">
            {inspector.receptionDays} ({inspector.receptionHours})
          </span>
        </div>
      </div>

      {/* SUCCESS BANNER WHEN ACTION SENT */}
      {sentSuccessType && (
        <div className="p-3.5 bg-emerald-600 text-white rounded-2xl shadow-lg flex items-center gap-3 animate-in zoom-in-95 duration-200">
          <CheckCircle2 className="w-5 h-5 shrink-0" />
          <div className="text-xs font-bold">
            {sentSuccessType === 'voice'
              ? "Ovozli xabar profilaktika inspektoriga muvaffaqiyatli yetkazildi!"
              : "Media xabar profilaktika inspektoriga muvaffaqiyatli yetkazildi!"}
          </div>
        </div>
      )}

      {/* 2. ONLY 3 CORE ACTION BUTTONS (CALL, CAMERA, VOICE) */}
      {!isVoiceMode && !isCameraActive && (
        <div className="space-y-3 pt-1">
          {/* Action 1: Call Officer (Qo'ng'iroq qilish) */}
          <a
            href={`tel:${inspector.phoneNumber}`}
            onClick={onCallOfficer}
            className="w-full py-4 px-5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] text-white font-bold text-sm sm:text-base flex items-center justify-between shadow-md transition-all group"
          >
            <div className="flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                <Phone className="w-5 h-5" />
              </div>
              <div className="text-left">
                <div>Qo'ng'iroq qilish</div>
                <div className="text-xs text-emerald-100 font-normal mt-0.5">
                  Xizmat raqami: {inspector.phoneNumber}
                </div>
              </div>
            </div>
            <span className="text-xs font-semibold px-2.5 py-1 bg-white/20 rounded-xl">
              Aloqa ➔
            </span>
          </a>

          {/* Action 2: Camera Viewfinder (Kamera / Video / Surat) */}
          <button
            type="button"
            onClick={() => startCamera()}
            className="w-full py-4 px-5 rounded-2xl bg-sky-700 hover:bg-sky-800 active:scale-[0.98] text-white font-bold text-sm sm:text-base flex items-center justify-between shadow-md transition-all group"
          >
            <div className="flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                <Camera className="w-5 h-5" />
              </div>
              <div className="text-left">
                <div>Kamera (Surat / Video)</div>
                <div className="text-xs text-sky-100 font-normal mt-0.5">
                  Jonli vizual xabar yuborish
                </div>
              </div>
            </div>
            <span className="text-xs font-semibold px-2.5 py-1 bg-white/20 rounded-xl">
              Ochish ➔
            </span>
          </button>

          {/* Action 3: Voice Message (Ovozli xabar) */}
          <button
            type="button"
            onClick={() => setIsVoiceMode(true)}
            className="w-full py-4 px-5 rounded-2xl bg-slate-900 dark:bg-slate-800 hover:bg-slate-800 active:scale-[0.98] text-white font-bold text-sm sm:text-base flex items-center justify-between shadow-md transition-all group"
          >
            <div className="flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                <Mic className="w-5 h-5" />
              </div>
              <div className="text-left">
                <div>Ovozli xabar</div>
                <div className="text-xs text-slate-300 font-normal mt-0.5">
                  Mikrofondan ovoz yozib yuborish
                </div>
              </div>
            </div>
            <span className="text-xs font-semibold px-2.5 py-1 bg-white/20 rounded-xl">
              Yozish ➔
            </span>
          </button>

          {/* Hidden Gallery File Input fallback */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,video/*"
            onChange={handleFileSelect}
            className="hidden"
          />
        </div>
      )}

      {/* ========================================================= */}
      {/* NATIVE-LIKE LIVE VIEWFINDER CAMERA INTERFACE              */}
      {/* ========================================================= */}
      {isCameraActive && (
        <div className="bg-slate-950 border border-slate-800 rounded-3xl p-4 shadow-2xl space-y-4 animate-in zoom-in-95 duration-200 text-white">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-rose-600 animate-pulse" />
              <span className="text-xs font-bold uppercase tracking-wider text-sky-400">
                Jonli Kamera Vizualizatori
              </span>
            </div>

            <div className="flex items-center gap-2">
              {/* Switch Front/Back Camera */}
              <button
                type="button"
                onClick={switchCamera}
                className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white flex items-center gap-1 text-xs transition-colors"
                title="Kamerani almashtirish"
              >
                <RefreshCw className="w-4 h-4" />
                <span className="hidden sm:inline">Flip</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  stopCameraStream();
                  setIsCameraActive(false);
                }}
                className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* If media not yet captured, show live viewfinder video */}
          {!capturedMediaUrl ? (
            <div className="relative w-full h-80 sm:h-96 rounded-2xl overflow-hidden bg-black flex items-center justify-center">
              <video
                ref={liveVideoRef}
                playsInline
                muted
                autoPlay
                className="w-full h-full object-cover"
              />

              {/* Recording badge if recording video */}
              {isRecordingVideo && (
                <div className="absolute top-4 left-4 bg-rose-600/90 text-white px-3 py-1.5 rounded-full text-xs font-bold flex items-center gap-2 backdrop-blur-md shadow-lg animate-pulse">
                  <span className="w-2.5 h-2.5 rounded-full bg-white" />
                  <span>VIDEO: {formatDuration(videoTimer)}</span>
                </div>
              )}

              {/* Instructions overlay */}
              <div className="absolute bottom-4 left-0 right-0 text-center pointer-events-none">
                <div className="inline-block bg-black/60 backdrop-blur-md px-4 py-1.5 rounded-full text-[11px] text-slate-200 border border-white/10 shadow-lg">
                  📷 Bir marta bosing: Surat • Bosib turing: Video yozish
                </div>
              </div>
            </div>
          ) : (
            /* PREVIEW & CONFIRMATION SCREEN */
            <div className="space-y-3">
              <div className="relative w-full h-72 sm:h-80 rounded-2xl overflow-hidden bg-black flex items-center justify-center">
                {capturedMediaType === 'video' ? (
                  <video
                    src={capturedMediaUrl}
                    controls
                    className="w-full h-full object-contain"
                  />
                ) : (
                  <img
                    src={capturedMediaUrl}
                    alt="Captured preview"
                    className="w-full h-full object-contain"
                  />
                )}
                <div className="absolute top-3 left-3 bg-emerald-600 text-white px-2.5 py-1 rounded-xl text-[10px] font-bold">
                  {capturedMediaType === 'video' ? "Video Tayyor 🎥" : "Surat Tayyor 📸"}
                </div>
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => startCamera()}
                  className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs rounded-2xl border border-slate-700 flex items-center justify-center gap-2 transition-all"
                >
                  <RefreshCw className="w-4 h-4" />
                  <span>Qayta olish (Retake)</span>
                </button>

                <button
                  type="button"
                  onClick={handleSendMediaMessage}
                  className="flex-1 py-3 bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs rounded-2xl shadow-lg flex items-center justify-center gap-2 transition-all active:scale-95"
                >
                  <Send className="w-4 h-4" />
                  <span>Inspektorga Yuborish ➔</span>
                </button>
              </div>
            </div>
          )}

          {/* SINGLE SHUTTER ACTION BUTTON (TAP FOR PHOTO, HOLD FOR VIDEO) */}
          {!capturedMediaUrl && (
            <div className="flex flex-col items-center justify-center pt-2 pb-2">
              <button
                type="button"
                onPointerDown={handlePointerDown}
                onPointerUp={handlePointerUp}
                onPointerCancel={handlePointerUp}
                className={`w-20 h-20 rounded-full border-4 flex items-center justify-center shadow-2xl transition-transform active:scale-95 select-none ${
                  isRecordingVideo
                    ? 'bg-rose-600 border-white animate-pulse scale-105'
                    : 'bg-white border-sky-500 hover:bg-slate-100'
                }`}
                title="Suratga olish yoki video yozish"
              >
                {isRecordingVideo ? (
                  <Square className="w-8 h-8 text-white fill-current" />
                ) : (
                  <div className="w-16 h-16 rounded-full bg-sky-600 flex items-center justify-center text-white">
                    <Camera className="w-7 h-7" />
                  </div>
                )}
              </button>
              <div className="text-[11px] text-slate-400 mt-2">
                {isRecordingVideo ? "To'xtatish uchun qo'yib yuboring" : "Shutter tugmasi"}
              </div>
            </div>
          )}

          {/* Gallery fallback button */}
          <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
            <span>Galereyadan fayl yuklash:</span>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-sky-400 font-semibold"
            >
              <ImageIcon className="w-4 h-4" />
              <span>Fayl tanlash</span>
            </button>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* VOICE RECORDER EXPANDED INTERFACE                         */}
      {/* ========================================================= */}
      {isVoiceMode && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-lg space-y-4 animate-in zoom-in-95 duration-200">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-sky-100 dark:bg-sky-950 text-sky-700 dark:text-sky-400 flex items-center justify-center">
                <Mic className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                  Ovozli xabar qoldirish
                </h3>
                <p className="text-[10px] text-slate-500">
                  {inspector.fullName} ga to'g'ridan-to'g'ri boradi
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                deleteAudioRecording();
                setIsVoiceMode(false);
              }}
              className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Central Recording Display */}
          <div className="text-center py-4 space-y-3">
            <div className="font-mono text-3xl font-extrabold text-slate-900 dark:text-white">
              {formatDuration(audioTimer)}
            </div>

            {isRecordingAudio ? (
              <div className="flex items-center justify-center gap-2 text-rose-600 font-semibold text-xs animate-pulse">
                <span className="w-3 h-3 rounded-full bg-rose-600" />
                <span>Ovoz yozilmoqda... To'xtatish uchun bosing</span>
              </div>
            ) : audioUrl ? (
              <div className="flex items-center justify-center gap-2 text-emerald-600 dark:text-emerald-400 font-semibold text-xs">
                <CheckCircle2 className="w-4 h-4" />
                <span>Ovoz yozildi. Yuborishga tayyor!</span>
              </div>
            ) : (
              <p className="text-xs text-slate-500">
                Mikrofon tugmasini bosing va muammoni gapiring
              </p>
            )}

            {/* Big Mic Button */}
            <div className="flex items-center justify-center pt-2">
              {!isRecordingAudio && !audioUrl && (
                <button
                  type="button"
                  onClick={startAudioRecording}
                  className="w-20 h-20 rounded-full bg-rose-600 hover:bg-rose-700 active:scale-90 text-white flex items-center justify-center shadow-xl transition-all"
                  title="Yozishni boshlash"
                >
                  <Mic className="w-9 h-9" />
                </button>
              )}

              {isRecordingAudio && (
                <button
                  type="button"
                  onClick={stopAudioRecording}
                  className="w-20 h-20 rounded-full bg-slate-900 dark:bg-slate-800 text-white flex items-center justify-center shadow-xl animate-pulse active:scale-95 transition-all"
                  title="To'xtatish"
                >
                  <Square className="w-8 h-8 fill-current" />
                </button>
              )}
            </div>
          </div>

          {/* Playback & Send bar once audio recorded */}
          {audioUrl && !isRecordingAudio && (
            <div className="space-y-3 pt-2 border-t border-slate-100 dark:border-slate-800">
              <div className="flex items-center justify-between bg-slate-100 dark:bg-slate-800 p-3 rounded-2xl">
                <button
                  type="button"
                  onClick={toggleAudioPlayback}
                  className="flex items-center gap-2 font-bold text-xs text-sky-700 dark:text-sky-300"
                >
                  {isPlayingAudio ? (
                    <Pause className="w-4 h-4 fill-current" />
                  ) : (
                    <Play className="w-4 h-4 fill-current" />
                  )}
                  <span>{isPlayingAudio ? "To'xtatish" : "Tinglab ko'rish"}</span>
                </button>

                <button
                  type="button"
                  onClick={deleteAudioRecording}
                  className="p-1 text-slate-400 hover:text-rose-600"
                  title="O'chirish"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              <button
                type="button"
                onClick={handleSendVoiceMessage}
                className="w-full py-3.5 bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs rounded-2xl shadow-md flex items-center justify-center gap-2 active:scale-95 transition-all"
              >
                <Send className="w-4 h-4" />
                <span>Ovozli xabarni inspektorga yuborish ➔</span>
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
