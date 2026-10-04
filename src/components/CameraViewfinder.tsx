/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  Camera,
  Flashlight,
  FlashlightOff,
  RefreshCw,
  Sparkles,
  Upload,
  Keyboard,
  Info,
  CheckCircle2,
  AlertTriangle,
  Volume2,
  VolumeX,
  QrCode,
  Disc,
} from 'lucide-react';
import {
  MultiFormatReader,
  BarcodeFormat,
  DecodeHintType,
  HTMLCanvasElementLuminanceSource,
  HybridBinarizer,
  BinaryBitmap,
} from '@zxing/library';
import confetti from 'canvas-confetti';
import { LicenseDiscData } from '../types';
import { parseLicenseDiscPayload, SAMPLE_LICENSE_DISCS, isSouthAfricanPlateFormat } from '../utils/discParser';

interface CameraViewfinderProps {
  onDiscDetected: (disc: LicenseDiscData) => void;
  onOpenManualEntry: () => void;
  onOpenGuide: () => void;
  isProcessing: boolean;
}

export const CameraViewfinder: React.FC<CameraViewfinderProps> = ({
  onDiscDetected,
  onOpenManualEntry,
  onOpenGuide,
  isProcessing,
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [stream, setStream] = useState<MediaStream | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isTorchOn, setIsTorchOn] = useState(false);
  const [hasTorch, setHasTorch] = useState(false);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [isAiScanning, setIsAiScanning] = useState(false);
  const [scanStatus, setScanStatus] = useState<string>('Align license disc QR code in the circle');
  const [soundEnabled, setSoundEnabled] = useState(true);

  const hintsRef = useRef<Map<any, any>>(new Map());
  const zxingReaderRef = useRef<MultiFormatReader | null>(null);
  const isDecodingRef = useRef(false);
  const scanLoopRef = useRef<number | null>(null);

  // Stop camera safely without changing callback references
  const stopCamera = useCallback(() => {
    if (scanLoopRef.current) {
      clearTimeout(scanLoopRef.current);
      scanLoopRef.current = null;
    }
    isDecodingRef.current = false;

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => {
        try {
          track.stop();
        } catch {
          // ignore
        }
      });
      streamRef.current = null;
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    setStream(null);
    setIsTorchOn(false);
  }, []);

  // Helper to decode barcode from HTML5 canvas
  const decodeCanvasZXing = (
    canvas: HTMLCanvasElement,
    reader: MultiFormatReader,
    hints: Map<any, any>
  ): { text: string; format: string } | null => {
    try {
      const luminanceSource = new HTMLCanvasElementLuminanceSource(canvas);
      const binaryBitmap = new BinaryBitmap(new HybridBinarizer(luminanceSource));
      const result = reader.decode(binaryBitmap, hints);
      if (result && result.getText()) {
        const format = result.getBarcodeFormat() ? String(result.getBarcodeFormat()) : 'QR_CODE';
        return { text: result.getText(), format };
      }
    } catch {
      // Normal when no code is present in frame
    }
    return null;
  };

  // Play audio chime on detection
  const playBeep = useCallback(() => {
    if (!soundEnabled) return;
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(1320, ctx.currentTime + 0.12);
      gain.gain.setValueAtTime(0.18, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.18);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.2);
    } catch {
      // Audio might be restricted by browser policy
    }
  }, [soundEnabled]);

  // Trigger haptic vibration on mobile
  const triggerHaptic = () => {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      try {
        navigator.vibrate([60, 40, 80]);
      } catch {
        // Ignore
      }
    }
  };

  // Celebrate successful scan
  const triggerConfetti = () => {
    try {
      confetti({
        particleCount: 35,
        spread: 55,
        origin: { y: 0.6 },
        colors: ['#10b981', '#f59e0b', '#3b82f6', '#ec4899'],
      });
    } catch {
      // Ignore
    }
  };

  // Initialize camera stream
  const startCamera = useCallback(async () => {
    stopCamera();
    try {
      setErrorMessage(null);

      const constraints: MediaStreamConstraints = {
        audio: false,
        video: {
          facingMode: { ideal: facingMode },
          width: { ideal: 1280, max: 1920 },
          height: { ideal: 720, max: 1080 },
        },
      };

      const newStream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = newStream;
      setStream(newStream);
      setHasCameraPermission(true);

      if (videoRef.current) {
        videoRef.current.srcObject = newStream;
        videoRef.current.onloadedmetadata = () => {
          videoRef.current?.play().catch((err) => {
            console.warn('Camera play warning:', err);
          });
        };
      }

      // Check if torch/flashlight is supported
      const track = newStream.getVideoTracks()[0];
      if (track) {
        const capabilities = track.getCapabilities ? (track.getCapabilities() as any) : {};
        setHasTorch(!!capabilities.torch);
      }
    } catch (err: any) {
      console.warn('Camera access error:', err);
      setHasCameraPermission(false);
      setErrorMessage(
        err.name === 'NotAllowedError'
          ? 'Camera permission was denied. Please allow camera access or use photo upload / manual entry.'
          : 'Could not start camera. Check if another app is using it, or upload a photo.'
      );
    }
  }, [facingMode, stopCamera]);

  // Toggle flashlight
  const toggleTorch = async () => {
    const curStream = streamRef.current;
    if (!curStream || !hasTorch) return;
    try {
      const track = curStream.getVideoTracks()[0];
      if (track && (track as any).applyConstraints) {
        const nextState = !isTorchOn;
        await (track as any).applyConstraints({
          advanced: [{ torch: nextState }],
        });
        setIsTorchOn(nextState);
      }
    } catch (err) {
      console.warn('Torch toggle failed:', err);
    }
  };

  // Flip camera between front/back
  const flipCamera = () => {
    setFacingMode((prev) => (prev === 'environment' ? 'user' : 'environment'));
  };

  // Setup ZXing MultiFormatReader
  useEffect(() => {
    const hints = new Map();
    hints.set(DecodeHintType.POSSIBLE_FORMATS, [
      BarcodeFormat.QR_CODE,
      BarcodeFormat.PDF_417,
      BarcodeFormat.DATA_MATRIX,
      BarcodeFormat.AZTEC,
      BarcodeFormat.CODE_128,
      BarcodeFormat.CODE_39,
    ]);
    hintsRef.current = hints;
    zxingReaderRef.current = new MultiFormatReader();
  }, []);

  // Handle successful detection
  const handleDecodedString = useCallback(
    (rawText: string, format: string) => {
      if (!rawText || isDecodingRef.current) return;
      isDecodingRef.current = true;

      playBeep();
      triggerHaptic();
      triggerConfetti();

      const parsedDisc = parseLicenseDiscPayload(rawText, format);
      onDiscDetected(parsedDisc);

      setTimeout(() => {
        isDecodingRef.current = false;
      }, 1000);
    },
    [onDiscDetected, playBeep]
  );

  // Live decoding loop using Native BarcodeDetector or ZXing on canvas
  useEffect(() => {
    if (!hasCameraPermission || !stream) return;

    let isNativeSupported = false;
    let nativeDetector: any = null;

    if (typeof (window as any).BarcodeDetector !== 'undefined') {
      try {
        nativeDetector = new (window as any).BarcodeDetector({
          formats: ['qr_code', 'pdf417', 'data_matrix', 'aztec', 'code_128'],
        });
        isNativeSupported = true;
      } catch {
        isNativeSupported = false;
      }
    }

    let active = true;

    const scanFrame = async () => {
      if (!active) return;

      const video = videoRef.current;
      const canvas = canvasRef.current;

      if (
        video &&
        video.readyState >= 2 &&
        !isDecodingRef.current &&
        !isProcessing &&
        !isAiScanning
      ) {
        // Strategy A: Native BarcodeDetector (Hardware-accelerated)
        if (isNativeSupported && nativeDetector) {
          try {
            const barcodes = await nativeDetector.detect(video);
            if (barcodes && barcodes.length > 0 && active) {
              const detected = barcodes[0];
              const val = detected.rawValue || detected.rawValueString || '';
              if (val) {
                const formatName = (detected.format || 'QR_CODE').toUpperCase();
                handleDecodedString(val, formatName);
                return;
              }
            }
          } catch {
            // Fall through to canvas zxing
          }
        }

        // Strategy B: ZXing on central canvas crop (optimized for circular disc)
        if (canvas && zxingReaderRef.current) {
          const ctx = canvas.getContext('2d', { willReadFrequently: true });
          if (ctx) {
            const vw = video.videoWidth || 1280;
            const vh = video.videoHeight || 720;
            canvas.width = 640;
            canvas.height = 640;

            // Crop central square region (matching circular disc target)
            const minDim = Math.min(vw, vh);
            const sx = (vw - minDim) / 2;
            const sy = (vh - minDim) / 2;

            ctx.drawImage(video, sx, sy, minDim, minDim, 0, 0, 640, 640);

            const decoded = decodeCanvasZXing(canvas, zxingReaderRef.current, hintsRef.current);
            if (decoded && decoded.text && active) {
              handleDecodedString(decoded.text, decoded.format);
              return;
            }
          }
        }
      }

      if (active) {
        scanLoopRef.current = window.setTimeout(scanFrame, 280);
      }
    };

    scanLoopRef.current = window.setTimeout(scanFrame, 400);

    return () => {
      active = false;
      if (scanLoopRef.current) {
        clearTimeout(scanLoopRef.current);
      }
    };
  }, [hasCameraPermission, stream, isProcessing, isAiScanning, handleDecodedString]);

  // Mount camera on startup
  useEffect(() => {
    startCamera();
    return () => {
      stopCamera();
    };
  }, [startCamera, stopCamera]);

  // High-Resolution Snapshot AI Scan
  const captureSnapshotForAi = async () => {
    if (!videoRef.current) return;
    setIsAiScanning(true);
    setScanStatus('Reading license disc text & barcode with AI...');

    try {
      const video = videoRef.current;
      const snapCanvas = document.createElement('canvas');
      snapCanvas.width = video.videoWidth || 1280;
      snapCanvas.height = video.videoHeight || 720;
      const ctx = snapCanvas.getContext('2d');
      if (!ctx) throw new Error('Could not create canvas context');

      ctx.drawImage(video, 0, 0, snapCanvas.width, snapCanvas.height);
      const base64 = snapCanvas.toDataURL('image/jpeg', 0.9);

      // Attempt 1: In-browser ZXing on full resolution snapshot
      if (zxingReaderRef.current) {
        const result = decodeCanvasZXing(snapCanvas, zxingReaderRef.current, hintsRef.current);
        if (result && result.text) {
          handleDecodedString(result.text, result.format);
          setIsAiScanning(false);
          return;
        }
      }

      // Attempt 2: Server-side Gemini AI Vision Disc Extractor
      const resp = await fetch('/api/scan-license-disc', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageBase64: base64 }),
      });

      const json = await resp.json();
      if (json.success && json.data) {
        playBeep();
        triggerHaptic();
        triggerConfetti();

        const rawLic = json.data.licenceNumber || 'UNREGISTERED';
        let rawEng = json.data.engineNumber || undefined;
        if (rawEng && (rawEng === rawLic || isSouthAfricanPlateFormat(rawEng))) {
          rawEng = undefined;
        }

        const disc: LicenseDiscData = {
          id: `disc-${Date.now()}`,
          licenceNumber: rawLic,
          vehicleRegisterNumber: json.data.vehicleRegisterNumber || undefined,
          controlNumber: json.data.controlNumber || undefined,
          vin: json.data.vin || 'UNKNOWN_VIN',
          engineNumber: rawEng,
          make: (json.data.make || 'VEHICLE').toUpperCase(),
          seriesName: (json.data.seriesName || 'STANDARD MODEL').toUpperCase(),
          colour: json.data.colour ? json.data.colour.toUpperCase() : undefined,
          vehicleCategory: json.data.vehicleCategory || 'LIGHT MOTOR VEHICLE',
          tare: json.data.tare || undefined,
          gvm: json.data.gvm || undefined,
          expiryDate: json.data.expiryDate || undefined,
          expiryStatus: 'valid',
          rawBarcode: json.data.rawBarcode || 'AI_VISION_DISC_SCAN',
          barcodeFormat: 'AI_VISION',
          scanTimestamp: Date.now(),
          isSouthAfricanMvl: true,
          confidence: json.data.confidence || 0.95,
        };

        onDiscDetected(disc);
        setIsAiScanning(false);
        return;
      }

      setScanStatus('Could not clearly read disc. Ensure good lighting or test a sample disc.');
    } catch (err) {
      console.error('Snapshot AI scan error:', err);
      setScanStatus('AI scan failed. Please check connection or enter manually.');
    } finally {
      setIsAiScanning(false);
    }
  };

  // Handle Photo Upload
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsAiScanning(true);
    setScanStatus('Analyzing uploaded disc photo...');

    const reader = new FileReader();
    reader.onload = async (event) => {
      const base64 = event.target?.result as string;
      if (!base64) {
        setIsAiScanning(false);
        return;
      }

      const img = new Image();
      img.onload = async () => {
        // Step 1: Client ZXing on image
        const uploadCanvas = document.createElement('canvas');
        uploadCanvas.width = img.width;
        uploadCanvas.height = img.height;
        const uctx = uploadCanvas.getContext('2d');
        if (uctx && zxingReaderRef.current) {
          uctx.drawImage(img, 0, 0);
          const res = decodeCanvasZXing(uploadCanvas, zxingReaderRef.current, hintsRef.current);
          if (res && res.text) {
            handleDecodedString(res.text, res.format);
            setIsAiScanning(false);
            return;
          }
        }

        // Step 2: Gemini AI Vision endpoint
        try {
          const resp = await fetch('/api/scan-license-disc', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ imageBase64: base64 }),
          });
          const json = await resp.json();
          if (json.success && json.data) {
            playBeep();
            triggerHaptic();
            triggerConfetti();

            const rawLic = json.data.licenceNumber || 'UNREGISTERED';
            let rawEng = json.data.engineNumber || undefined;
            if (rawEng && (rawEng === rawLic || isSouthAfricanPlateFormat(rawEng))) {
              rawEng = undefined;
            }

            const disc: LicenseDiscData = {
              id: `disc-${Date.now()}`,
              licenceNumber: rawLic,
              vehicleRegisterNumber: json.data.vehicleRegisterNumber || undefined,
              controlNumber: json.data.controlNumber || undefined,
              vin: json.data.vin || 'UNKNOWN_VIN',
              engineNumber: rawEng,
              make: (json.data.make || 'VEHICLE').toUpperCase(),
              seriesName: (json.data.seriesName || 'STANDARD MODEL').toUpperCase(),
              colour: json.data.colour ? json.data.colour.toUpperCase() : undefined,
              vehicleCategory: json.data.vehicleCategory || 'LIGHT MOTOR VEHICLE',
              tare: json.data.tare || undefined,
              gvm: json.data.gvm || undefined,
              expiryDate: json.data.expiryDate || undefined,
              expiryStatus: 'valid',
              rawBarcode: json.data.rawBarcode || 'UPLOADED_PHOTO_SCAN',
              barcodeFormat: 'AI_VISION',
              scanTimestamp: Date.now(),
              isSouthAfricanMvl: true,
              confidence: json.data.confidence || 0.95,
            };

            onDiscDetected(disc);
            setIsAiScanning(false);
            return;
          }
        } catch {
          // Fallback
        }

        setScanStatus('Could not detect license disc in photo. Try another picture.');
        setIsAiScanning(false);
      };
      img.src = base64;
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="w-full flex flex-col gap-3.5">
      {/* HIDDEN OFF-SCREEN CANVAS FOR ZXING DECODE */}
      <canvas ref={canvasRef} className="hidden" />

      {/* HIDDEN FILE INPUT */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFileUpload}
        className="hidden"
      />

      {/* VIEWFINDER MAIN CARD */}
      <div className="relative w-full aspect-[4/3] sm:aspect-[16/10] max-h-[500px] bg-slate-950 rounded-3xl overflow-hidden border border-slate-800 shadow-2xl flex items-center justify-center">
        {/* HTML5 VIDEO FEED */}
        <video
          ref={videoRef}
          playsInline
          muted
          autoPlay
          className="absolute inset-0 w-full h-full object-cover"
        />

        {/* DARK AMBIENT GRADIENT OVERLAY */}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-slate-950/60 pointer-events-none" />

        {/* CIRCULAR LICENSE DISC TARGET OVERLAY */}
        <div className="relative z-10 w-64 sm:w-72 h-64 sm:h-72 rounded-full border-2 border-dashed border-emerald-400/70 pointer-events-none flex items-center justify-center shadow-[0_0_40px_rgba(16,185,129,0.15)]">
          {/* Outer alignment ring */}
          <div className="absolute inset-2 rounded-full border border-emerald-500/30" />

          {/* Center 2D Barcode / QR Target Box */}
          <div className="w-44 h-16 rounded-xl border-2 border-emerald-400 bg-emerald-500/10 backdrop-blur-[1px] relative flex items-center justify-center">
            {/* Corner brackets */}
            <div className="absolute -top-1.5 -left-1.5 w-3 h-3 border-t-2 border-l-2 border-emerald-300" />
            <div className="absolute -top-1.5 -right-1.5 w-3 h-3 border-t-2 border-r-2 border-emerald-300" />
            <div className="absolute -bottom-1.5 -left-1.5 w-3 h-3 border-b-2 border-l-2 border-emerald-300" />
            <div className="absolute -bottom-1.5 -right-1.5 w-3 h-3 border-b-2 border-r-2 border-emerald-300" />

            <div className="flex items-center gap-1.5 text-[10px] font-mono font-bold text-emerald-300 uppercase tracking-wider">
              <QrCode className="w-3.5 h-3.5" />
              <span>QR / Barcode Zone</span>
            </div>
          </div>

          {/* Top Badge on Circular Reticle */}
          <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-3 py-0.5 bg-slate-900/90 border border-emerald-500/50 rounded-full text-[10px] font-mono tracking-wider text-emerald-400 uppercase font-bold shadow-md flex items-center gap-1">
            <Disc className="w-3 h-3" />
            <span>Windscreen Disc Target</span>
          </div>
        </div>

        {/* TOP STATUS PILL ON CAMERA */}
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 px-3.5 py-1.5 rounded-full bg-slate-900/85 backdrop-blur-md border border-slate-700/80 text-xs text-slate-200 font-medium flex items-center gap-2 shadow-lg max-w-[90%] truncate">
          {isAiScanning ? (
            <>
              <RefreshCw className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-emerald-300 font-semibold">{scanStatus}</span>
            </>
          ) : (
            <>
              <div className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_6px_#10b981]" />
              <span>{scanStatus}</span>
            </>
          )}
        </div>

        {/* FLOATING CAMERA CONTROL TOOLBAR */}
        <div className="absolute bottom-4 inset-x-4 z-20 flex items-center justify-between pointer-events-auto">
          {/* Sound & Flashlight Controls */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setSoundEnabled((prev) => !prev)}
              className="p-2.5 rounded-2xl bg-slate-900/85 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700/80 backdrop-blur-md shadow"
              title={soundEnabled ? 'Mute sound' : 'Unmute sound'}
            >
              {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4 text-slate-500" />}
            </button>

            {hasTorch && (
              <button
                onClick={toggleTorch}
                className={`p-2.5 rounded-2xl backdrop-blur-md border shadow ${
                  isTorchOn
                    ? 'bg-amber-500 text-slate-950 border-amber-400'
                    : 'bg-slate-900/85 text-slate-300 hover:text-white border-slate-700/80'
                }`}
                title="Toggle torch flashlight"
              >
                {isTorchOn ? <Flashlight className="w-4 h-4" /> : <FlashlightOff className="w-4 h-4" />}
              </button>
            )}

            <button
              onClick={flipCamera}
              className="p-2.5 rounded-2xl bg-slate-900/85 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700/80 backdrop-blur-md shadow"
              title="Switch camera"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>

          {/* AI Snapshot Shutter Button */}
          <button
            onClick={captureSnapshotForAi}
            disabled={isAiScanning || isProcessing}
            className="group px-4 py-2.5 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs flex items-center gap-2 shadow-lg shadow-emerald-600/30 border border-emerald-400/40 disabled:opacity-50"
            title="Force deep AI recognition snapshot"
          >
            <Sparkles className="w-4 h-4 text-emerald-200" />
            <span className="hidden sm:inline">AI Read Disc</span>
          </button>

          {/* Upload Photo & Manual Input */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="p-2.5 rounded-2xl bg-slate-900/85 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700/80 backdrop-blur-md shadow"
              title="Upload photo of license disc"
            >
              <Upload className="w-4 h-4" />
            </button>

            <button
              onClick={onOpenManualEntry}
              className="p-2.5 rounded-2xl bg-slate-900/85 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700/80 backdrop-blur-md transition shadow active:scale-95"
              title="Manual disc entry"
            >
              <Keyboard className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* ERROR / PERMISSION DENIED OVERLAY */}
        {hasCameraPermission === false && (
          <div className="absolute inset-0 z-30 bg-slate-950/95 backdrop-blur-md p-6 flex flex-col items-center justify-center text-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/20 text-rose-400 border border-rose-500/40 flex items-center justify-center">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-white">Camera Access Required</h3>
            <p className="text-xs text-slate-400 max-w-sm">
              {errorMessage || 'Please allow camera access in your browser settings to scan vehicle license disc QR codes directly.'}
            </p>
            <div className="flex items-center gap-2.5 mt-2">
              <button
                onClick={startCamera}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs transition"
              >
                Retry Camera
              </button>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs border border-slate-700 transition"
              >
                Upload Photo
              </button>
            </div>
          </div>
        )}
      </div>

      {/* QUICK SAMPLE DISCS TEST SELECTOR */}
      <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-md">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-400 uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
            <span>Test With Sample SA License Discs</span>
          </div>
          <span className="text-[10px] text-slate-400 font-mono">1-Click Test</span>
        </div>

        <p className="text-[11px] text-slate-400 mb-2.5">
          Select an authentic vehicle license disc to test the scanner and preview the decoded results immediately:
        </p>

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
          {SAMPLE_LICENSE_DISCS.map((sample) => (
            <button
              key={sample.id}
              onClick={() => {
                playBeep();
                triggerHaptic();
                triggerConfetti();
                onDiscDetected(sample);
              }}
              className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-750 text-left border border-slate-700/60 hover:border-emerald-500/50 transition active:scale-95 group"
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-[11px] font-mono font-bold text-white group-hover:text-emerald-300">
                  {sample.licenceNumber}
                </span>
                <span
                  className={`w-2 h-2 rounded-full ${
                    sample.expiryStatus === 'valid'
                      ? 'bg-emerald-400'
                      : sample.expiryStatus === 'expiring_soon'
                      ? 'bg-amber-400'
                      : 'bg-rose-400'
                  }`}
                  title={sample.expiryStatus}
                />
              </div>
              <div className="text-[10px] text-slate-300 font-medium truncate">
                {sample.make}
              </div>
              <div className="text-[9px] text-slate-400 truncate">
                {sample.seriesName}
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
