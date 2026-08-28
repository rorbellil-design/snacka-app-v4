import React, { useState, useEffect } from 'react';
import { Download, Smartphone, Laptop, Check, X, HelpCircle, Share, PlusSquare, Image as ImageIcon, Sparkles } from 'lucide-react';
import { downloadAppIcon } from '../utils/iconDownloader';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

export const InstallPwaModal: React.FC<{ isOpen: boolean; onClose: () => void }> = ({
  isOpen,
  onClose,
}) => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isAndroid, setIsAndroid] = useState(false);
  const [isDesktop, setIsDesktop] = useState(false);

  useEffect(() => {
    // Detect OS / Platform
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIosDevice = /iphone|ipad|ipod/.test(userAgent);
    const isAndroidDevice = /android/.test(userAgent);
    setIsIOS(isIosDevice);
    setIsAndroid(isAndroidDevice);
    setIsDesktop(!isIosDevice && !isAndroidDevice);

    // Detect if already installed (standalone mode)
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true;
    setIsInstalled(isStandalone);

    // Listen for PWA install event
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    window.addEventListener('appinstalled', () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
    });

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  if (!isOpen) return null;

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      if (choice.outcome === 'accepted') {
        setIsInstalled(true);
        onClose();
      }
      setDeferredPrompt(null);
    }
  };

  const isIframe = window.self !== window.top;
  const standaloneAppUrl = 'https://ais-pre-4ghodl75xgdxyx4dqpnksn-837737986472.europe-west2.run.app';

  return (
    <div
      id="install-pwa-modal"
      className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 animate-fadeIn"
    >
      <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-3xl p-5 sm:p-7 shadow-2xl border border-slate-200 dark:border-slate-800 relative text-slate-900 dark:text-slate-100 flex flex-col max-h-[92vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-xs">
              <Download className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-black text-slate-900 dark:text-white text-base">
                Installera Snacka som App
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Få appikon på hemskärmen & helskärmsläge
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 hover:text-slate-900 dark:hover:text-white flex items-center justify-center font-bold text-xs transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Iframe Warning if inside AI Studio editor */}
        {isIframe && (
          <div className="mb-4 p-3.5 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-2xl text-xs text-amber-900 dark:text-amber-200 space-y-2">
            <p className="font-bold flex items-center gap-1.5">
              <span>⚠️ Webbläsaren blockerar installation inuti förhandsgranskningen</span>
            </p>
            <p>
              För att knappen "Installera" ska synas i Chrome måste du öppna den riktiga länken i en separat flik:
            </p>
            <a
              href={standaloneAppUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center justify-center w-full py-2 px-3 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl text-xs transition-colors"
            >
              Öppna appen i ny separat flik ↗️
            </a>
          </div>
        )}

        {/* Direct Install button if browser triggered prompt */}
        {deferredPrompt && (
          <div className="mb-4 p-4 bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-200 dark:border-indigo-800 rounded-2xl text-center space-y-3">
            <span className="text-xs font-bold text-indigo-900 dark:text-indigo-200 block">
              Din webbläsare är redo för direktinstallation!
            </span>
            <button
              type="button"
              id="pwa-direct-install-btn"
              onClick={handleInstallClick}
              className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-sm rounded-xl shadow-md flex items-center justify-center gap-2 active:scale-95 transition-all"
            >
              <Download className="w-4 h-4" />
              <span>Installera Snacka nu 🚀</span>
            </button>
          </div>
        )}

        {/* Step by Step Guide for different platforms */}
        <div className="space-y-4">
          <div className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
            Så installerar du på din enhet:
          </div>

          {/* Android Chrome */}
          <div className={`p-4 rounded-2xl border ${isAndroid ? 'bg-indigo-50/50 dark:bg-indigo-950/30 border-indigo-300 dark:border-indigo-700 ring-2 ring-indigo-500/20' : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700'} space-y-2`}>
            <div className="flex items-center gap-2">
              <Smartphone className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              <span className="text-xs font-black text-slate-900 dark:text-white">
                Android (Google Chrome / Samsung Internet)
              </span>
              {isAndroid && <span className="text-[10px] bg-indigo-600 text-white px-2 py-0.5 rounded-full font-bold">Din enhet</span>}
            </div>
            <ol className="text-xs text-slate-600 dark:text-slate-300 space-y-1.5 list-decimal list-inside pl-1">
              <li>Öppna appen i Chrome på telefonen.</li>
              <li>Tryck på menyn (de **tre prickarna ⋮** uppe till höger).</li>
              <li>Tryck på **"Installera app"** eller **"Lägg till på startskärmen"**.</li>
              <li>Klart! Snacka visas nu som en vanlig app på barnets skärm.</li>
            </ol>
          </div>

          {/* Computer / Desktop (Chrome & Edge) */}
          <div className={`p-4 rounded-2xl border ${isDesktop ? 'bg-indigo-50/50 dark:bg-indigo-950/30 border-indigo-300 dark:border-indigo-700 ring-2 ring-indigo-500/20' : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700'} space-y-2`}>
            <div className="flex items-center gap-2">
              <Laptop className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              <span className="text-xs font-black text-slate-900 dark:text-white">
                Dator (Google Chrome & Microsoft Edge)
              </span>
              {isDesktop && <span className="text-[10px] bg-indigo-600 text-white px-2 py-0.5 rounded-full font-bold">Din enhet</span>}
            </div>
            <ol className="text-xs text-slate-600 dark:text-slate-300 space-y-1.5 list-decimal list-inside pl-1">
              <li>
                Titta i webbläsarens **adressfält** längst upp till höger (där webbadressen står).
              </li>
              <li>
                Klicka på ikonen med **en liten skärm och pil ner ⬇️** (eller datorikonen med ett plus).
              </li>
              <li>
                Välj **"Installera Snacka"**.
              </li>
              <li>
                *I Chrome-menyn:* Du kan även trycka på **⋮ (menyn)** &gt; **Spara och dela** &gt; **"Installera sida som app"**.
              </li>
            </ol>
          </div>

          {/* iPhone / iPad */}
          <div className={`p-4 rounded-2xl border ${isIOS ? 'bg-indigo-50/50 dark:bg-indigo-950/30 border-indigo-300 dark:border-indigo-700 ring-2 ring-indigo-500/20' : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700'} space-y-2`}>
            <div className="flex items-center gap-2">
              <Share className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              <span className="text-xs font-black text-slate-900 dark:text-white">
                iPhone / iPad (Safari)
              </span>
              {isIOS && <span className="text-[10px] bg-indigo-600 text-white px-2 py-0.5 rounded-full font-bold">Din enhet</span>}
            </div>
            <ol className="text-xs text-slate-600 dark:text-slate-300 space-y-1.5 list-decimal list-inside pl-1">
              <li>Öppna i webbläsaren **Safari**.</li>
              <li>Tryck på **Dela-knappen** (fyrkanten med en pil upp ⬆️ längst ner).</li>
              <li>Rulla ner och välj **"Lägg till på hemskärmen" 📲**.</li>
            </ol>
          </div>
          {/* PWABuilder & APK Icon Helper */}
          <div className="p-4 rounded-2xl bg-violet-50 dark:bg-violet-950/40 border border-violet-200 dark:border-violet-800/60 space-y-3">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-violet-600 dark:text-violet-400" />
              <span className="text-xs font-black text-slate-900 dark:text-white">
                Ska du bygga en APK i PWABuilder?
              </span>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-300">
              Ladda ner den officiella Snacka-ikonen (512x512 PNG) direkt till din dator och ladda upp den i PWABuilder under <strong>Options &gt; Upload Icon</strong>.
            </p>
            <div className="flex items-center gap-3 pt-1">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-indigo-600 to-purple-500 flex items-center justify-center text-white text-xl shadow-sm shrink-0 font-bold border border-white/20">
                💬
              </div>
              <button
                type="button"
                id="download-icon-512-btn"
                onClick={() => downloadAppIcon(512, 'snacka-app-icon-512.png')}
                className="flex-1 py-2.5 px-3 bg-violet-600 hover:bg-violet-700 active:scale-95 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-2 transition-all shadow-xs"
              >
                <Download className="w-4 h-4" />
                <span>Ladda ner App-ikon (512x512 PNG)</span>
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="pt-4 mt-4 border-t border-slate-100 dark:border-slate-800 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 bg-slate-900 dark:bg-slate-700 text-white font-bold text-xs rounded-xl hover:bg-slate-800"
          >
            Stäng
          </button>
        </div>
      </div>
    </div>
  );
};
