import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Camera,
  X,
  Sparkles,
  Upload,
  RefreshCw,
  Flashlight,
  FlashlightOff,
  Car,
  QrCode,
  CheckCircle2,
  AlertCircle,
  ScanLine,
} from 'lucide-react';
import { MultiFormatReader, BarcodeFormat, DecodeHintType, HTMLCanvasElementLuminanceSource, HybridBinarizer, BinaryBitmap } from '@zxing/library';
import { VehicleEntryData } from '../types';
import { parseLicenseDiscPayload, SAMPLE_LICENSE_DISCS } from '../utils/discParser';

interface VehicleScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onVehicleDetected: (vehicle: VehicleEntryData) => void;
}

export const VehicleScannerModal: React.FC<VehicleScannerModalProps> = ({
  isOpen,
  onClose,
  onVehicleDetected,
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const isDecodingRef = useRef(false);
  const scanTimerRef = useRef<number | null>(null);

  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isAiProcessing, setIsAiProcessing] = useState(false);
  const [isTorchOn, setIsTorchOn] = useState(false);
  const [hasTorch, setHasTorch] = useState(false);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');

  // Stop camera safely without changing callback references
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

  // Start camera
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
          width: { ideal: 1280, max: 1920 },
          height: { ideal: 720, max: 1080 },
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

      // Check torch
      const videoTrack = mediaStream.getVideoTracks()[0];
      const capabilities = videoTrack?.getCapabilities?.() as any;
      setHasTorch(!!capabilities?.torch);
    } catch (err: any) {
      console.warn('Vehicle camera start error:', err);
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

  // Toggle torch
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

  // Flip camera
  const flipCamera = () => {
    setFacingMode((prev) => (prev === 'environment' ? 'user' : 'environment'));
  };

  // Capture frame
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
      const res = await fetch('/api/scan-license-disc', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageBase64: base64Image }),
      });

      if (!res.ok) {
        throw new Error('Failed to analyze vehicle disc');
      }

      const json = await res.json();
      if (json.success && json.data) {
        const d = json.data;
        const vehicleData: VehicleEntryData = {
          licenceNumber: (d.licenceNumber || 'UNREGISTERED').toUpperCase().trim(),
          make: (d.make || 'GENERIC').toUpperCase().trim(),
          seriesName: (d.seriesName || 'VEHICLE').toUpperCase().trim(),
          colour: (d.colour || 'WHITE').toUpperCase().trim(),
          vin: d.vin ? String(d.vin).toUpperCase().trim() : undefined,
          engineNumber: d.engineNumber ? String(d.engineNumber).trim() : undefined,
          vehicleCategory: d.vehicleCategory || 'LIGHT MOTOR VEHICLE',
          expiryDate: d.expiryDate,
          expiryStatus: 'valid',
          confidence: d.confidence || 0.95,
        };

        stopCamera();
        onVehicleDetected(vehicleData);
        onClose();
      } else {
        setErrorMessage('Could not clearly read vehicle disc or QR. Please reposition or try again.');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Error scanning vehicle disc');
    } finally {
      setIsAiProcessing(false);
    }
  };

  // Barcode decoding loop using Native BarcodeDetector or ZXing
  useEffect(() => {
    if (!isOpen || isAiProcessing) return;

    let isNativeSupported = false;
    let nativeDetector: any = null;

    if (typeof (window as any).BarcodeDetector !== 'undefined') {
      try {
        nativeDetector = new (window as any).BarcodeDetector({
          formats: ['qr_code', 'pdf417', 'data_matrix', 'code_128'],
        });
        isNativeSupported = true;
      } catch {
        isNativeSupported = false;
      }
    }

    const hints = new Map();
    hints.set(DecodeHintType.POSSIBLE_FORMATS, [
      BarcodeFormat.QR_CODE,
      BarcodeFormat.PDF_417,
      BarcodeFormat.DATA_MATRIX,
      BarcodeFormat.CODE_128,
    ]);
    const reader = new MultiFormatReader();
    reader.setHints(hints);

    let active = true;

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

      try {
        // Option 1: Native BarcodeDetector
        if (isNativeSupported && nativeDetector) {
          try {
            const barcodes = await nativeDetector.detect(video);
            if (barcodes && barcodes.length > 0 && active) {
              const detected = barcodes[0];
              const rawText = detected.rawValue || detected.rawValueString || '';
              if (rawText) {
                const parsed = parseLicenseDiscPayload(rawText, 'QR_CODE');
                active = false;
                stopCamera();
                onVehicleDetected({
                  licenceNumber: parsed.licenceNumber,
                  make: parsed.make,
                  seriesName: parsed.seriesName,
                  colour: parsed.colour || 'WHITE',
                  vin: parsed.vin,
                  engineNumber: parsed.engineNumber,
                  vehicleCategory: parsed.vehicleCategory,
                  expiryDate: parsed.expiryDate,
                  expiryStatus: parsed.expiryStatus,
                  rawBarcode: rawText,
                  confidence: 0.99,
                });
                onClose();
                return;
              }
            }
          } catch {
            // fallback to ZXing
          }
        }

        // Option 2: Fallback to ZXing on canvas
        const canvas = canvasRef.current || document.createElement('canvas');
        canvas.width = Math.min(video.videoWidth, 800);
        canvas.height = Math.min(video.videoHeight, 600);
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        if (ctx) {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          try {
            const luminanceSource = new HTMLCanvasElementLuminanceSource(canvas);
            const binaryBitmap = new BinaryBitmap(new HybridBinarizer(luminanceSource));
            const result = reader.decode(binaryBitmap);

            if (result && result.getText() && active) {
              const rawText = result.getText();
              const parsed = parseLicenseDiscPayload(rawText, 'QR_CODE');
              active = false;
              stopCamera();

              onVehicleDetected({
                licenceNumber: parsed.licenceNumber,
                make: parsed.make,
                seriesName: parsed.seriesName,
                colour: parsed.colour || 'WHITE',
                vin: parsed.vin,
                engineNumber: parsed.engineNumber,
                vehicleCategory: parsed.vehicleCategory,
                expiryDate: parsed.expiryDate,
                expiryStatus: parsed.expiryStatus,
                rawBarcode: rawText,
                confidence: 0.99,
              });
              onClose();
              return;
            }
          } catch {
            // No barcode found in this frame
          }
        }
      } catch (err) {
        console.warn('Scan frame error:', err);
      } finally {
        isDecodingRef.current = false;
        if (active) {
          scanTimerRef.current = window.setTimeout(scanFrame, 280);
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
  }, [isOpen, isAiProcessing, onVehicleDetected, onClose, stopCamera]);

  const handleSnapAi = () => {
    const frame = captureFrame();
    if (frame) {
      processImageWithAi(frame);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result as string;
      processImageWithAi(base64);
    };
    reader.readAsDataURL(file);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-md">
      <div className="relative w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Top Header */}
        <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-400">
              <Car className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-bold text-white text-sm sm:text-base">Scan Vehicle QR / Disc</h2>
              <p className="text-[11px] text-slate-400">South African MVLX license disc or vehicle QR</p>
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

          {/* Scanner Overlay Guide (Circular Disc Shape) */}
          <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center p-6">
            <div className="relative w-56 sm:w-64 aspect-square rounded-full border-2 border-emerald-400/80 shadow-[0_0_20px_rgba(16,185,129,0.2)] flex flex-col items-center justify-center p-4 bg-emerald-500/5 overflow-hidden">
              <div className="w-16 h-16 rounded-full border border-emerald-400/40 flex items-center justify-center bg-slate-950/40">
                <QrCode className="w-8 h-8 text-emerald-400/90" />
              </div>

              <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-300 bg-slate-950/80 px-2 py-0.5 rounded-full mt-3">
                Align License Disc QR
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
              <div className="w-12 h-12 rounded-2xl bg-emerald-600/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mb-3">
                <RefreshCw className="w-6 h-6" />
              </div>
              <div className="text-sm font-bold text-white">Reading Vehicle Disc...</div>
              <div className="text-xs text-slate-400 mt-1">Extracting Registration, Make & Model</div>
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

        {/* Footer Controls & Quick Test Vehicles */}
        <div className="p-4 bg-slate-950 border-t border-slate-800 space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={handleSnapAi}
              disabled={isAiProcessing}
              className="py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-900/30 disabled:opacity-50"
            >
              <Sparkles className="w-4 h-4" />
              <span>Capture & Read Disc</span>
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

          {/* 1-Click Fast Test Vehicles */}
          <div className="pt-2 border-t border-slate-800/80">
            <div className="text-[11px] font-semibold text-slate-400 mb-2 flex items-center justify-between">
              <span>Quick Test Vehicles (No disc handy?):</span>
              <span className="text-[10px] text-emerald-400">1-click test</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
              {SAMPLE_LICENSE_DISCS.slice(0, 3).map((s, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    stopCamera();
                    onVehicleDetected({
                      licenceNumber: s.licenceNumber,
                      make: s.make,
                      seriesName: s.seriesName,
                      colour: s.colour || 'WHITE',
                      vin: s.vin,
                      engineNumber: s.engineNumber,
                      vehicleCategory: s.vehicleCategory,
                      expiryDate: s.expiryDate,
                      expiryStatus: s.expiryStatus,
                      confidence: 0.99,
                    });
                    onClose();
                  }}
                  className="p-2 text-left rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800/80 text-[11px] group"
                >
                  <div className="font-mono font-bold text-amber-300 text-xs truncate">
                    {s.licenceNumber}
                  </div>
                  <div className="text-[10px] text-slate-400 truncate">
                    {s.make} {s.seriesName}
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
