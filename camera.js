/**
 * camera.js - Robust camera, photo capture, and hold-to-record video system
 */
document.addEventListener("DOMContentLoaded", () => {
  let mediaStream = null;
  let mediaRecorder = null;
  let recordedChunks = [];
  let isRecording = false;
  let currentFacingMode = "environment";
  let pressTimer = null;
  let isLongPress = false;

  const openCameraBtn = document.getElementById("openCameraBtn");
  const cameraModal = document.getElementById("cameraModal");
  const closeCameraBtn = document.getElementById("closeCameraBtn");
  const flipBtn = document.getElementById("flipBtn");
  const photoBtn = document.getElementById("photoBtn");
  const videoBtn = document.getElementById("videoBtn");
  const liveVideo = document.getElementById("liveVideo");
  const photoCanvas = document.getElementById("photoCanvas");
  const recBadge = document.getElementById("recBadge");
  const previewModal = document.getElementById("previewModal");
  const previewBox = document.getElementById("previewBox");
  const retakeBtn = document.getElementById("retakeBtn");
  const sendBtn = document.getElementById("sendBtn");

  // 1. Check permissions and protocol support
  function checkMediaSupport() {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      if (!document.getElementById("permissionAlertBanner")) {
        const banner = document.createElement("div");
        banner.id = "permissionAlertBanner";
        banner.className = "fixed top-0 left-0 right-0 z-50 bg-rose-600 text-white text-center py-2 px-4 text-xs font-bold";
        banner.textContent = "Diqqat: Brauzeringiz kamerani qo'llab-quvvatlamaydi yoki sayt xavfsiz (HTTPS) emas!";
        document.body.prepend(banner);
      }
      return false;
    }
    return true;
  }

  // 2. Start Camera with robust audio fallback & secure teardown
  async function startCamera() {
    if (!checkMediaSupport()) return;
    stopCamera();

    if (cameraModal) cameraModal.classList.remove("hidden");

    try {
      // Tier 1: facingMode + audio
      mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: currentFacingMode, width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: true
      });
    } catch (err1) {
      try {
        // Tier 2: facingMode, no audio
        mediaStream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: currentFacingMode },
          audio: false
        });
      } catch (err2) {
        try {
          // Tier 3: generic video + audio
          mediaStream = await navigator.mediaDevices.getUserMedia({
            video: true,
            audio: true
          });
        } catch (err3) {
          try {
            // Tier 4: generic video only
            mediaStream = await navigator.mediaDevices.getUserMedia({
              video: true,
              audio: false
            });
          } catch (err4) {
            console.error("Kamera xatosi:", err4);
            alert("Kameraga ulanib bo'lmadi! Brauzer sozlamalarida ruxsat berilganini tekshiring.");
            if (cameraModal) cameraModal.classList.add("hidden");
            return;
          }
        }
      }
    }

    if (liveVideo && mediaStream) {
      liveVideo.srcObject = mediaStream;
      await liveVideo.play().catch(() => {});
    }
  }

  // 3. Secure Stream Teardown
  function stopCamera() {
    if (mediaStream) {
      mediaStream.getTracks().forEach((track) => track.stop());
      mediaStream = null;
    }
    if (liveVideo) {
      liveVideo.srcObject = null;
    }
  }

  // 4. Take Snapshot (Quick tap)
  function takePhoto() {
    if (!liveVideo || !liveVideo.videoWidth || !photoCanvas) return;

    photoCanvas.width = liveVideo.videoWidth;
    photoCanvas.height = liveVideo.videoHeight;
    const ctx = photoCanvas.getContext("2d");
    ctx.drawImage(liveVideo, 0, 0, photoCanvas.width, photoCanvas.height);

    photoCanvas.toBlob((blob) => {
      if (blob) {
        const imageUrl = URL.createObjectURL(blob);
        showPreview(imageUrl, 'photo', blob);
      }
    }, "image/jpeg", 0.9);

    stopCamera();
    if (cameraModal) cameraModal.classList.add("hidden");
  }

  // 5. Video Recording (Hold-to-record via pointerdown / pointerup)
  function startVideoRecording() {
    if (!mediaStream || isRecording) return;
    recordedChunks = [];

    let mimeType = "video/webm;codecs=vp9";
    if (MediaRecorder.isTypeSupported("video/webm;codecs=vp9")) {
      mimeType = "video/webm;codecs=vp9";
    } else if (MediaRecorder.isTypeSupported("video/webm")) {
      mimeType = "video/webm";
    } else if (MediaRecorder.isTypeSupported("video/mp4")) {
      mimeType = "video/mp4";
    }

    try {
      mediaRecorder = new MediaRecorder(mediaStream, { mimeType });
    } catch (e) {
      try {
        mediaRecorder = new MediaRecorder(mediaStream);
      } catch (err) {
        console.error("MediaRecorder yaratish xatosi:", err);
        return;
      }
    }

    mediaRecorder.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) {
        recordedChunks.push(e.data);
      }
    };

    mediaRecorder.onstop = () => {
      const videoBlob = new Blob(recordedChunks, { type: mediaRecorder.mimeType || "video/webm" });
      const videoUrl = URL.createObjectURL(videoBlob);
      showPreview(videoUrl, 'video', videoBlob);
    };

    mediaRecorder.start();
    isRecording = true;
    if (videoBtn) videoBtn.classList.add("bg-rose-600", "animate-pulse", "scale-105");
    if (recBadge) recBadge.classList.remove("hidden");
  }

  function stopVideoRecording() {
    if (!mediaRecorder || !isRecording) return;
    mediaRecorder.stop();
    isRecording = false;
    if (videoBtn) videoBtn.classList.remove("bg-rose-600", "animate-pulse", "scale-105");
    if (recBadge) recBadge.classList.add("hidden");
    stopCamera();
    if (cameraModal) cameraModal.classList.add("hidden");
  }

  // 6. Preview Modal Handling
  function showPreview(url, type, blob) {
    if (previewBox) {
      previewBox.innerHTML = '';
      if (type === 'photo') {
        const img = document.createElement('img');
        img.src = url;
        img.className = "w-full h-full object-cover rounded-2xl";
        previewBox.appendChild(img);
      } else {
        const vid = document.createElement('video');
        vid.src = url;
        vid.controls = true;
        vid.className = "w-full h-full object-cover rounded-2xl";
        previewBox.appendChild(vid);
      }
    }
    if (previewModal) previewModal.classList.remove("hidden");
  }

  // 7. Event Listeners Attachment on DOMContentLoaded
  if (openCameraBtn) openCameraBtn.addEventListener("click", startCamera);
  if (closeCameraBtn) closeCameraBtn.addEventListener("click", () => {
    stopCamera();
    if (cameraModal) cameraModal.classList.add("hidden");
  });
  if (flipBtn) flipBtn.addEventListener("click", async () => {
    currentFacingMode = currentFacingMode === "environment" ? "user" : "environment";
    await startCamera();
  });

  if (photoBtn) photoBtn.addEventListener("click", takePhoto);

  // Hold-to-record video handling on videoBtn (or shutter)
  if (videoBtn) {
    videoBtn.addEventListener("pointerdown", (e) => {
      e.preventDefault();
      isLongPress = false;
      pressTimer = setTimeout(() => {
        isLongPress = true;
        startVideoRecording();
      }, 400); // 400ms hold triggers video recording
    });

    videoBtn.addEventListener("pointerup", (e) => {
      e.preventDefault();
      if (pressTimer) clearTimeout(pressTimer);
      if (isRecording) {
        stopVideoRecording();
      } else if (!isLongPress) {
        // Quick tap on video button also records or takes photo
        startVideoRecording();
        setTimeout(() => stopVideoRecording(), 3000); // 3s quick video
      }
    });

    videoBtn.addEventListener("pointercancel", (e) => {
      e.preventDefault();
      if (pressTimer) clearTimeout(pressTimer);
      if (isRecording) stopVideoRecording();
    });
  }

  if (retakeBtn) retakeBtn.addEventListener("click", () => {
    if (previewModal) previewModal.classList.add("hidden");
    startCamera();
  });

  if (sendBtn) sendBtn.addEventListener("click", () => {
    alert("Media xabar muvaffaqiyatli yuborildi!");
    if (previewModal) previewModal.classList.add("hidden");
  });
});
