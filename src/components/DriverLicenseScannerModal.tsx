import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Camera,
  X,
  Sparkles,
  Upload,
  RefreshCw,
  Flashlight,
  FlashlightOff,
  UserCheck,
  CheckCircle2,
  AlertCircle,
  ScanLine,
  CreditCard,
  Car,
} from 'lucide-react';
import { DriverLicenseData } from '../types';
import {
  SAMPLE_DRIVER_LICENSES,
  SAMPLE_ID_CARDS,
  interpretDocumentBarcode,
  looksBinary,
} from '../utils/driversLicenseParser';
import {
  decodeDocumentBarcode,
  decodeDocumentBarcodeFromImage,
  decodePdf417,
  drawToCanvas,
} from '../utils/documentBarcodeReader';

const BARCODE_UNREADABLE_HINT =
  "Licence barcode found but not fully read. Hold the card closer and steady, avoid glare, or tap Capture & Read.";

interface DriverLicenseScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDriverDetected: (driver: DriverLicenseData) => void;
  initialMode?: 'drivers_license' | 'id_card';
}

export const DriverLicenseScannerModal: React.FC<DriverLicenseScannerModalProps> = ({
  isOpen,
  onClose,
  onDriverDetected,
  initialMode = 'drivers_license',
}) => {
  const [scanMode, setScanMode] = useState<'drivers_license' | 'id_card'>(initialMode);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const isDecodingRef = useRef(false);
  const scanTimerRef = useRef<number | null>(null);

  // Sync mode when opened with new initialMode
  useEffect(() => {
    if (isOpen) {
      setScanMode(initialMode);
    }
  }, [isOpen, initialMode]);

  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isAiProcessing, setIsAiProcessing] = useState(false);
  const [isTorchOn, setIsTorchOn] = useState(false);
  const [hasTorch, setHasTorch] = useState(false);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');

  // Stop Camera safely without changing callback references
  const stopCamera = useCallback(() => {
    if (scanTimerRef.current) {
      clearTimeout(scanTimerRef.current);
      scanTimerRef.current = null;
    }
    isDecodingRef.current = false;

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => {
        try {
          t.stop();
        } catch {
          // ignore
        }
      });
      streamRef.current = null;
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    setIsTorchOn(false);
  }, []);

  // Start Camera
  const startCamera = useCallback(async () => {
    if (!isOpen) return;

    // Clean up any existing stream before starting
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => {
        try {
          t.stop();
        } catch {}
      });
      streamRef.current = null;
    }

    try {
      setErrorMessage(null);

      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: { ideal: facingMode },
          // The licence PDF417 is dense; 1080p gives ZXing enough pixels per module.
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
        audio: false,
      };

      const mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = mediaStream;
      setHasCameraPermission(true);

      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        videoRef.current.onloadedmetadata = () => {
          videoRef.current?.play().catch((err) => {
            console.warn('Video playback notice:', err);
          });
        };
      }

      // Check torch, and request continuous autofocus where supported
      const videoTrack = mediaStream.getVideoTracks()[0];
      const capabilities = videoTrack?.getCapabilities?.() as any;
      setHasTorch(!!capabilities?.torch);
      if (capabilities?.focusMode?.includes?.('continuous')) {
        videoTrack
          .applyConstraints({ advanced: [{ focusMode: 'continuous' } as any] })
          .catch(() => {});
      }
    } catch (err: any) {
      console.warn('Driver/ID camera start error:', err);
      setHasCameraPermission(false);
      setErrorMessage(
        err.name === 'NotAllowedError'
          ? 'Camera permission denied. Please allow camera permissions or upload a photo.'
          : err.message || 'Unable to access camera'
      );
    }
  }, [isOpen, facingMode]);

  useEffect(() => {
    if (isOpen) {
      startCamera();
    } else {
      stopCamera();
    }
    return () => {
      stopCamera();
    };
  }, [isOpen, startCamera, stopCamera]);

  // Toggle Torch
  const toggleTorch = async () => {
    if (!streamRef.current) return;
    const track = streamRef.current.getVideoTracks()[0];
    if (track && hasTorch) {
      try {
        const nextTorch = !isTorchOn;
        await (track as any).applyConstraints({
          advanced: [{ torch: nextTorch }],
        });
        setIsTorchOn(nextTorch);
      } catch {
        // Torch toggle failed
      }
    }
  };

  // Flip Camera
  const flipCamera = () => {
    setFacingMode((prev) => (prev === 'environment' ? 'user' : 'environment'));
  };

  // Capture Image Frame as Base64
  const captureFrame = (): string | null => {
    if (!videoRef.current) return null;
    const video = videoRef.current;
    if (video.videoWidth === 0 || video.videoHeight === 0) return null;

    const canvas = canvasRef.current || document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL('image/jpeg', 0.9);
  };

  // Process image with Gemini Vision OCR
  const processImageWithAi = async (base64Image: string) => {
    setIsAiProcessing(true);
    setErrorMessage(null);
    try {
      const res = await fetch('/api/scan-drivers-license', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageBase64: base64Image,
          scanType: scanMode,
        }),
      });

      if (!res.ok) {
        throw new Error(`Failed to analyze ${scanMode === 'id_card' ? 'ID card' : "driver's license"}`);
      }

      const json = await res.json();
      if (json.success && json.data) {
        const d = json.data;
        const isId = scanMode === 'id_card';
        const driverData: DriverLicenseData = {
          fullName:
            d.fullName ||
            `${d.initials || d.givenNames || ''} ${d.surname || ''}`.trim() ||
            (isId ? 'ID Card Holder' : 'Driver'),
          initials: d.initials,
          surname: d.surname,
          idNumber: d.idNumber || '',
          licenseNumber: isId ? d.idCardNumber || 'ID-CARD' : d.licenseNumber || 'DL-PENDING',
          idCardNumber: d.idCardNumber,
          licenseCodes: isId ? 'ID Document' : d.licenseCodes || 'Code B',
          licenseExpiryDate: isId ? undefined : d.expiryDate,
          firstIssueDate: d.firstIssueDate,
          gender: d.gender || 'M',
          dateOfBirth: d.dateOfBirth,
          countryOfIssue: d.countryOfIssue || 'South Africa',
          citizenship: d.citizenship || 'South African Citizen (RSA)',
          documentType: scanMode,
          format: 'OCR_VISION',
          confidence: d.confidence || 0.95,
        };

        stopCamera();
        onDriverDetected(driverData);
        onClose();
      } else {
        setErrorMessage(
          scanMode === 'id_card'
            ? 'Could not clearly read the ID Card. Ensure 13-digit ID and name are in view.'
            : "Could not clearly read driver's license. Please ensure license details are in view."
        );
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Error processing document image');
    } finally {
      setIsAiProcessing(false);
    }
  };

  // Barcode decoding loop: native BarcodeDetector for speed/location, ZXing for exact bytes
  useEffect(() => {
    if (!isOpen || isAiProcessing) return;

    let nativeDetector: any = null;
    if (typeof (window as any).BarcodeDetector !== 'undefined') {
      try {
        nativeDetector = new (window as any).BarcodeDetector({
          formats: ['pdf417', 'qr_code', 'code_128', 'code_39', 'data_matrix'],
        });
      } catch {
        nativeDetector = null;
      }
    }

    let active = true;
    let frameCount = 0;
    const workCanvas = document.createElement('canvas');

    const accept = (raw: string): boolean => {
      const result = interpretDocumentBarcode(raw, scanMode);
      if (result.status === 'unreadable') {
        setErrorMessage(BARCODE_UNREADABLE_HINT);
        return false;
      }
      active = false;
      stopCamera();
      onDriverDetected(result.data);
      onClose();
      return true;
    };

    const scanFrame = async () => {
      if (!active || isDecodingRef.current) return;

      const video = videoRef.current;
      if (!video || video.readyState < 2 || video.videoWidth === 0) {
        if (active) {
          scanTimerRef.current = window.setTimeout(scanFrame, 300);
        }
        return;
      }

      isDecodingRef.current = true;
      const vw = video.videoWidth;
      const vh = video.videoHeight;

      try {
        // Option 1: native BarcodeDetector. Text payloads (Smart ID, ID book) are used directly.
        // Its rawValue is UTF-8 decoded, so a binary licence PDF417 is re-read by ZXing from
        // a full-resolution crop around the detected symbol.
        if (nativeDetector) {
          try {
            const barcodes: any[] = await nativeDetector.detect(video);
            for (const detected of barcodes) {
              if (!active) return;
              const rawText: string = detected.rawValue || '';
              if (rawText && !looksBinary(rawText)) {
                if (accept(rawText)) return;
                continue;
              }
              const box = detected.boundingBox;
              if (box && box.width > 0) {
                const mx = box.width * 0.15;
                const my = box.height * 0.3;
                const crop = { x: box.x - mx, y: box.y - my, width: box.width + 2 * mx, height: box.height + 2 * my };
                if (drawToCanvas(workCanvas, video, vw, vh, 1600, crop)) {
                  const raw = decodePdf417(workCanvas);
                  if (raw && accept(raw)) return;
                }
              }
              setErrorMessage(BARCODE_UNREADABLE_HINT);
            }
          } catch {
            // fall through to ZXing
          }
        }

        // Option 2: ZXing on the full frame (no aspect distortion). Alternate between full
        // resolution (needed for the dense licence barcode) and a lighter downscale.
        if (!active) return;
        const maxSide = frameCount++ % 2 === 0 ? 1920 : 1280;
        if (drawToCanvas(workCanvas, video, vw, vh, maxSide)) {
          const raw = decodeDocumentBarcode(workCanvas);
          if (raw && active) accept(raw);
        }
      } catch (err) {
        console.warn('Scan frame error:', err);
      } finally {
        isDecodingRef.current = false;
        if (active) {
          scanTimerRef.current = window.setTimeout(scanFrame, 200);
        }
      }
    };

    scanTimerRef.current = window.setTimeout(scanFrame, 400);

    return () => {
      active = false;
      if (scanTimerRef.current) {
        clearTimeout(scanTimerRef.current);
        scanTimerRef.current = null;
      }
      isDecodingRef.current = false;
    };
  }, [isOpen, isAiProcessing, scanMode, onDriverDetected, onClose, stopCamera]);

  // Handle capture button click (triggers instant AI OCR)
  const handleSnapAi = () => {
    const frame = captureFrame();
    if (frame) {
      processStillImage(frame);
    }
  };

  // Read a still image: try the barcode locally first (exact data, works offline), then Gemini OCR.
  const processStillImage = async (base64Image: string) => {
    setIsAiProcessing(true);
    setErrorMessage(null);
    try {
      const raw = await decodeDocumentBarcodeFromImage(base64Image);
      if (raw) {
        const result = interpretDocumentBarcode(raw, scanMode);
        if (result.status === 'ok') {
          stopCamera();
          onDriverDetected(result.data);
          onClose();
          return;
        }
      }
    } catch (err) {
      console.warn('Still image barcode decode failed:', err);
    } finally {
      setIsAiProcessing(false);
    }
    await processImageWithAi(base64Image);
  };

  // Handle file upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      processStillImage(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-md">
      <div className="relative w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Top Header */}
        <div className="px-5 py-3.5 border-b border-slate-800 flex items-center justify-between bg-slate-950">
          <div className="flex items-center gap-2.5">
            <div
              className={`p-2 rounded-xl border ${
                scanMode === 'id_card'
                  ? 'bg-indigo-500/10 border-indigo-500/30 text-indigo-400'
                  : 'bg-blue-500/10 border-blue-500/30 text-blue-400'
              }`}
            >
              {scanMode === 'id_card' ? <CreditCard className="w-5 h-5" /> : <Car className="w-5 h-5" />}
            </div>
            <div>
              <h2 className="font-bold text-white text-sm sm:text-base">
                {scanMode === 'id_card' ? 'Scan ID Card / Smart ID' : "Scan Driver's License"}
              </h2>
              <p className="text-[11px] text-slate-400">
                {scanMode === 'id_card'
                  ? 'RSA Smart ID card or green barcoded ID document'
                  : 'South African driving licence card or reverse barcode'}
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              stopCamera();
              onClose();
            }}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scan Mode Segmented Switcher (Driver's License vs ID Card) */}
        <div className="px-5 py-2.5 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between gap-2">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
            Document Type:
          </span>
          <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800">
            <button
              onClick={() => {
                setScanMode('drivers_license');
                setErrorMessage(null);
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                scanMode === 'drivers_license'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Car className="w-3.5 h-3.5" />
              <span>Driver's License</span>
            </button>
            <button
              onClick={() => {
                setScanMode('id_card');
                setErrorMessage(null);
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                scanMode === 'id_card'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <CreditCard className="w-3.5 h-3.5" />
              <span>ID Card / Smart ID</span>
            </button>
          </div>
        </div>

        {/* Viewfinder Body */}
        <div className="relative flex-1 bg-black min-h-[300px] flex items-center justify-center overflow-hidden">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-cover"
          />
          <canvas ref={canvasRef} className="hidden" />

          {/* Scanner Overlay Guide (Card Shape) */}
          <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center p-6">
            <div
              className={`relative w-full max-w-xs aspect-[1.586] rounded-2xl border-2 shadow-2xl flex flex-col justify-between p-3 overflow-hidden ${
                scanMode === 'id_card'
                  ? 'border-indigo-400/90 shadow-[0_0_25px_rgba(99,102,241,0.25)] bg-indigo-500/5'
                  : 'border-blue-400/90 shadow-[0_0_25px_rgba(59,130,246,0.25)] bg-blue-500/5'
              }`}
            >
              {/* Corner brackets */}
              <div
                className={`absolute top-2 left-2 w-4 h-4 border-t-2 border-l-2 ${
                  scanMode === 'id_card' ? 'border-indigo-400' : 'border-blue-400'
                }`}
              />
              <div
                className={`absolute top-2 right-2 w-4 h-4 border-t-2 border-r-2 ${
                  scanMode === 'id_card' ? 'border-indigo-400' : 'border-blue-400'
                }`}
              />
              <div
                className={`absolute bottom-2 left-2 w-4 h-4 border-b-2 border-l-2 ${
                  scanMode === 'id_card' ? 'border-indigo-400' : 'border-blue-400'
                }`}
              />
              <div
                className={`absolute bottom-2 right-2 w-4 h-4 border-b-2 border-r-2 ${
                  scanMode === 'id_card' ? 'border-indigo-400' : 'border-blue-400'
                }`}
              />

              <div
                className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded self-start ${
                  scanMode === 'id_card'
                    ? 'text-indigo-300 bg-slate-950/80 border border-indigo-500/30'
                    : 'text-blue-300 bg-slate-950/80 border border-blue-500/30'
                }`}
              >
                {scanMode === 'id_card' ? 'Smart ID / Green Book' : "Driver's License / Barcode"}
              </div>

              <div className="text-center text-[11px] text-white/95 bg-slate-950/80 px-2.5 py-1.5 rounded-lg border border-slate-700/60 shadow">
                {scanMode === 'id_card'
                  ? 'Align Smart ID Card or Green ID Book (ID No. & Photo)'
                  : "Align Driver's License Card front or reverse barcode"}
              </div>
            </div>
          </div>

          {/* Camera Controls Overlay */}
          <div className="absolute top-3 right-3 flex items-center gap-2">
            {hasTorch && (
              <button
                onClick={toggleTorch}
                className={`p-2.5 rounded-xl backdrop-blur-md ${
                  isTorchOn ? 'bg-amber-500 text-slate-950' : 'bg-slate-900/80 text-white'
                }`}
                title="Toggle Flashlight"
              >
                {isTorchOn ? <Flashlight className="w-4 h-4" /> : <FlashlightOff className="w-4 h-4" />}
              </button>
            )}
            <button
              onClick={flipCamera}
              className="p-2.5 rounded-xl bg-slate-900/80 text-white backdrop-blur-md hover:bg-slate-800"
              title="Flip Camera"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>

          {/* Processing Loading Overlay */}
          {isAiProcessing && (
            <div className="absolute inset-0 bg-slate-950/85 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center z-20">
              <div
                className={`w-12 h-12 rounded-2xl border flex items-center justify-center mb-3 ${
                  scanMode === 'id_card'
                    ? 'bg-indigo-600/20 border-indigo-500/30 text-indigo-400'
                    : 'bg-blue-600/20 border-blue-500/30 text-blue-400'
                }`}
              >
                <RefreshCw className="w-6 h-6 animate-spin" />
              </div>
              <div className="text-sm font-bold text-white">
                {scanMode === 'id_card' ? 'Analyzing ID Card...' : "Analyzing Driver's License..."}
              </div>
              <div className="text-xs text-slate-400 mt-1">
                {scanMode === 'id_card'
                  ? 'Extracting 13-digit RSA ID, full name, DOB & citizenship'
                  : 'Extracting driver name, license codes, expiry & license number'}
              </div>
            </div>
          )}

          {/* Error Banner */}
          {errorMessage && (
            <div className="absolute bottom-3 inset-x-3 p-3 rounded-xl bg-rose-950/90 border border-rose-800 text-rose-200 text-xs flex items-center gap-2 z-20">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              <span className="flex-1">{errorMessage}</span>
            </div>
          )}
        </div>

        {/* Footer Controls & Quick Test Samples */}
        <div className="p-4 bg-slate-950 border-t border-slate-800 space-y-3">
          {/* Action Trigger Buttons */}
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={handleSnapAi}
              disabled={isAiProcessing}
              className={`py-3 px-4 rounded-xl text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg disabled:opacity-50 ${
                scanMode === 'id_card'
                  ? 'bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 shadow-indigo-900/30'
                  : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 shadow-blue-900/30'
              }`}
            >
              <Sparkles className="w-4 h-4" />
              <span>
                {scanMode === 'id_card' ? 'Capture & Read ID Card' : 'Capture & Read License'}
              </span>
            </button>

            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isAiProcessing}
              className="py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <Upload className="w-4 h-4" />
              <span>Upload Photo</span>
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileUpload}
            />
          </div>

          {/* 1-Click Fast Test Drivers / ID Cards */}
          <div className="pt-2 border-t border-slate-800/80">
            <div className="text-[11px] font-semibold text-slate-400 mb-2 flex items-center justify-between">
              <span>
                Quick Test Samples ({scanMode === 'id_card' ? 'Smart ID Cards' : "Driver's Licenses"}):
              </span>
              <span className="text-[10px] text-blue-400">1-click test</span>
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              {(scanMode === 'id_card' ? SAMPLE_ID_CARDS : SAMPLE_DRIVER_LICENSES).map((s, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    stopCamera();
                    onDriverDetected(s.data);
                    onClose();
                  }}
                  className={`p-2 text-left rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800/80 text-[11px] group transition ${
                    scanMode === 'id_card' ? 'hover:border-indigo-500/40' : 'hover:border-blue-500/40'
                  }`}
                >
                  <div className="font-semibold text-slate-200 group-hover:text-blue-400 truncate">
                    {s.data.fullName}
                  </div>
                  <div className="text-[10px] text-slate-500 truncate">
                    ID: {s.data.idNumber} · {s.category}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

