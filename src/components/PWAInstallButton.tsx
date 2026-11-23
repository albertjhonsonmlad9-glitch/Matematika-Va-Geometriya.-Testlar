import React, {useState} from 'react';
import {Download, Share, Smartphone, X} from 'lucide-react';
import {usePWAInstall} from '../hooks/usePWAInstall';

export const PWAInstallButton: React.FC = () => {
  const {isInstallable, isInstalled, isIOS, install} = usePWAInstall();
  const [showGuide, setShowGuide] = useState(false);

  if (isInstalled) {
    return null;
  }

  if (isInstallable) {
    return (
      <button
        type="button"
        onClick={() => void install()}
        className="inline-flex items-center gap-2 min-h-[44px] px-4 py-2 rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 active:scale-[0.98] transition-all whitespace-nowrap shrink-0 cursor-pointer"
      >
        <Download className="w-4 h-4 shrink-0" />
        <span>Ilovani oʻrnatish</span>
      </button>
    );
  }

  if (isIOS) {
    return (
      <>
        <button
          type="button"
          onClick={() => setShowGuide(true)}
          className="inline-flex items-center gap-2 min-h-[44px] px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
        >
          <Share className="w-4 h-4 shrink-0 text-indigo-600 dark:text-indigo-400" />
          <span>iOS ga oʻrnatish</span>
        </button>

        {showGuide && (
          <div
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-950/50 backdrop-blur-sm p-4"
            role="dialog"
            aria-modal="true"
            aria-labelledby="ios-install-title"
          >
            <div className="w-full max-w-sm rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 shadow-2xl">
              <div className="flex items-center justify-between gap-4 mb-3">
                <h3 id="ios-install-title" className="text-lg font-bold text-slate-900 dark:text-white">
                  iPhone / iPad ga oʻrnatish
                </h3>
                <button
                  type="button"
                  onClick={() => setShowGuide(false)}
                  aria-label="Yopish"
                  className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <ol className="space-y-3 text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                <li>1. Safari pastki panelidagi <strong>Ulashish (Share)</strong> tugmasini bosing.</li>
                <li>2. Roʻyxatdan <strong>Bosh ekranga qoʻshish (Add to Home Screen)</strong> bandini tanlang.</li>
                <li>3. Oʻng yuqoridagi <strong>Qoʻshish</strong> tugmasini tasdiqlang.</li>
              </ol>
              <button
                type="button"
                onClick={() => setShowGuide(false)}
                className="mt-5 w-full min-h-[44px] rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 transition-colors cursor-pointer"
              >
                Tushunarli
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  // Desktop / fallback cross-platform install guide trigger
  return (
    <>
      <button
        type="button"
        onClick={() => setShowGuide(true)}
        className="inline-flex items-center gap-2 min-h-[44px] px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
      >
        <Smartphone className="w-4 h-4 shrink-0 text-indigo-600 dark:text-indigo-400" />
        <span>iOS va Android ilova</span>
      </button>

      {showGuide && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-950/50 backdrop-blur-sm p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="cross-install-title"
        >
          <div className="w-full max-w-md rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 shadow-2xl">
            <div className="flex items-center justify-between gap-4 mb-3">
              <h3 id="cross-install-title" className="text-lg font-bold text-slate-900 dark:text-white">
                iOS va Android qurilmalarga oʻrnatish
              </h3>
              <button
                type="button"
                onClick={() => setShowGuide(false)}
                aria-label="Yopish"
                className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-4 text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
              <div>
                <p className="font-semibold text-slate-900 dark:text-white">Android (Chrome)</p>
                <p className="mt-1">Brauzer menyusidan <strong>Ilovani oʻrnatish</strong> yoki <strong>Bosh ekranga qoʻshish</strong> tugmasini tanlang.</p>
              </div>
              <div>
                <p className="font-semibold text-slate-900 dark:text-white">iOS (iPhone / iPad Safari)</p>
                <p className="mt-1">Safari panelidan <strong>Ulashish</strong> tugmasini bosing va <strong>Bosh ekranga qoʻshish</strong> ni tanlang.</p>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Oʻrnatilgan ilova oflayn rejimda ham ishlaydi va internetga ulanganda natijalarni bulut bilan avtomatik sinxronlaydi.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowGuide(false)}
              className="mt-5 w-full min-h-[44px] rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 transition-colors cursor-pointer"
            >
              Yopish
            </button>
          </div>
        </div>
      )}
    </>
  );
};
