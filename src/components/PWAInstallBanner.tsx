import React, { useState } from 'react';
import { Download, Smartphone, Check, X, Share } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

export const PWAInstallBanner: React.FC = () => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [isDismissed, setIsDismissed] = useState(false);
  const [showIOSGuide, setShowIOSGuide] = useState(false);
  const [installSuccess, setInstallSuccess] = useState(false);

  // If already running standalone or dismissed, hide
  if (isInstalled || isDismissed) {
    return null;
  }

  const handleInstallClick = async () => {
    const success = await install();
    if (success) {
      setInstallSuccess(true);
      setTimeout(() => setIsDismissed(true), 2500);
    }
  };

  if (!isInstallable && !isIOS) {
    return null;
  }

  return (
    <>
      <div
        id="pwa-install-banner"
        className="bg-gradient-to-r from-orange-600 via-amber-600 to-orange-700 text-white px-4 py-2.5 shadow-md flex items-center justify-between text-xs sm:text-sm font-medium transition-all"
      >
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 bg-black/20 rounded-lg">
            <Smartphone className="w-4 h-4 text-orange-200" />
          </div>
          <div>
            <span className="font-bold">Install as Android App:</span> Run full-screen with native camera OCR speed
          </div>
        </div>

        <div className="flex items-center gap-2">
          {isInstallable && (
            <button
              id="install-pwa-button"
              onClick={handleInstallClick}
              disabled={installSuccess}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white text-orange-950 font-bold rounded-lg shadow-sm hover:bg-orange-50 active:scale-95 transition"
            >
              {installSuccess ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Installed!</span>
                </>
              ) : (
                <>
                  <Download className="w-3.5 h-3.5 text-orange-700" />
                  <span>Install App</span>
                </>
              )}
            </button>
          )}

          {isIOS && (
            <button
              id="install-ios-button"
              onClick={() => setShowIOSGuide(true)}
              className="flex items-center gap-1 px-3 py-1.5 bg-white/20 hover:bg-white/30 text-white font-semibold rounded-lg transition"
            >
              <Share className="w-3.5 h-3.5" />
              <span>Add to Home</span>
            </button>
          )}

          <button
            id="dismiss-install-banner"
            onClick={() => setIsDismissed(true)}
            className="p-1 text-white/80 hover:text-white hover:bg-black/20 rounded-md transition"
            title="Dismiss"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {showIOSGuide && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm rounded-2xl bg-slate-900 border border-slate-700 p-6 shadow-2xl text-slate-100">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Smartphone className="w-5 h-5 text-orange-500" />
                Install on iPhone / iPad
              </h3>
              <button
                onClick={() => setShowIOSGuide(false)}
                className="text-slate-400 hover:text-white p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-xs text-slate-300 mb-4 leading-relaxed">
              To install this VIN scanner as a standalone app on your home screen:
            </p>
            <ol className="space-y-3 text-xs text-slate-200">
              <li className="flex items-start gap-2.5">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-orange-500/20 text-orange-400 font-bold">1</span>
                <span>Tap the Safari <strong className="text-white">Share</strong> button (box with an arrow pointing up).</span>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-orange-500/20 text-orange-400 font-bold">2</span>
                <span>Scroll down and tap <strong className="text-white">Add to Home Screen</strong>.</span>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-orange-500/20 text-orange-400 font-bold">3</span>
                <span>Tap <strong className="text-white">Add</strong> in the top right corner.</span>
              </li>
            </ol>
            <button
              onClick={() => setShowIOSGuide(false)}
              className="mt-5 w-full rounded-xl bg-orange-500 py-2.5 text-xs font-bold text-slate-950 hover:bg-orange-400 transition"
            >
              Got it
            </button>
          </div>
        </div>
      )}
    </>
  );
};
