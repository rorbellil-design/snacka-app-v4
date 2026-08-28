import React, { useState, useEffect } from 'react';
import { Bell, BellRing, BellOff, CheckCircle2, Smartphone, ShieldCheck, Sparkles, X, ExternalLink, AlertTriangle } from 'lucide-react';
import { notificationService, NotificationPermissionStatus } from '../utils/notificationService';
import { Contact } from '../types';

interface NotificationSetupModalProps {
  onClose: () => void;
  onSimulateDelayedCall?: (contact: Contact, delaySecs: number) => void;
  onStartDelayedTestCall?: (delaySecs: number, contact?: Contact) => void;
  contacts: Contact[];
}

export const NotificationSetupModal: React.FC<NotificationSetupModalProps> = ({
  onClose,
  onSimulateDelayedCall,
  onStartDelayedTestCall,
  contacts,
}) => {
  const [status, setStatus] = useState<NotificationPermissionStatus>(() =>
    notificationService.getPermission()
  );
  const [testSent, setTestSent] = useState(false);
  const isIframe = notificationService.isInsideIframe();

  useEffect(() => {
    setStatus(notificationService.getPermission());
  }, []);

  const handleRequestPermission = async () => {
    const granted = await notificationService.requestPermission();
    setStatus(granted ? 'granted' : 'denied');
  };

  const handleSendInstantTest = async () => {
    const success = await notificationService.sendTestNotification();
    if (success) {
      setTestSent(true);
      setStatus('granted');
      setTimeout(() => setTestSent(false), 3000);
    } else {
      setStatus(notificationService.getPermission());
    }
  };

  const handleOpenStandalone = () => {
    try {
      window.open(window.location.href, '_blank');
    } catch {}
  };

  const handleTriggerTest = (delaySecs: number = 5) => {
    const testContact = contacts[0];
    if (onStartDelayedTestCall) {
      onStartDelayedTestCall(delaySecs, testContact);
      onClose();
    } else if (onSimulateDelayedCall && testContact) {
      onSimulateDelayedCall(testContact, delaySecs);
      onClose();
    }
  };

  return (
    <div
      id="notification-setup-modal"
      className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 sm:p-6 animate-fadeIn"
    >
      <div className="bg-slate-900 border border-slate-800 text-white w-full max-w-lg rounded-3xl p-6 sm:p-7 shadow-2xl relative overflow-hidden flex flex-col">
        {/* Ambient glow */}
        <div className="absolute -top-24 -right-24 w-60 h-60 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-60 h-60 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Header */}
        <div className="flex items-start justify-between gap-3 mb-5 pb-3 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center">
              <BellRing className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-black text-white flex items-center gap-2">
                <span>Ringsignal i bakgrunden</span>
                <Sparkles className="w-4 h-4 text-amber-400" />
              </h2>
              <p className="text-xs text-slate-400 font-medium">
                Gör så att telefonen ringer även när appen ligger i bakgrunden
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* If inside iframe, show important note */}
        {isIframe && (
          <div className="mb-4 bg-amber-950/40 border border-amber-500/40 rounded-2xl p-4 flex items-center justify-between gap-3 text-amber-200">
            <div className="flex items-center gap-2.5 text-xs">
              <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />
              <div>
                <span className="font-bold block text-white">
                  Förhandsgranskning i redigeraren
                </span>
                <span className="text-[11px] text-amber-200">
                  Webbläsare blockerar notiser inuti förhandsgranskningsrutan. Öppna i en egen flik för att aktivera notiser.
                </span>
              </div>
            </div>
            <button
              onClick={handleOpenStandalone}
              className="px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs shrink-0 flex items-center gap-1 shadow-sm"
            >
              <span>Öppna i ny flik</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Current Permission Status Banner */}
        <div className="mb-5">
          {status === 'granted' ? (
            <div className="bg-emerald-950/40 border border-emerald-500/40 rounded-2xl p-4 flex items-center justify-between gap-3 text-emerald-300">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                <div className="text-xs">
                  <span className="font-black block text-emerald-200">
                    Notiser & Bakgrundssignal är aktiverat!
                  </span>
                  <span>
                    Appen har tillåtelse att visa notiser när samtal kommer in.
                  </span>
                </div>
              </div>

              <button
                onClick={handleSendInstantTest}
                className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shrink-0 shadow-sm flex items-center gap-1"
              >
                <Bell className="w-3.5 h-3.5" />
                <span>{testSent ? 'Skickad! 🎉' : 'Testa notis'}</span>
              </button>
            </div>
          ) : status === 'denied' ? (
            <div className="bg-rose-950/40 border border-rose-500/40 rounded-2xl p-4 flex items-center gap-3 text-rose-300">
              <BellOff className="w-5 h-5 text-rose-400 shrink-0" />
              <div className="text-xs">
                <span className="font-black block text-rose-200">
                  Notiser är blockerade i webbläsaren
                </span>
                <span>
                  Klicka på lås-ikonen eller inställningar uppe i adressfältet i din webbläsare och tillåt Notiser för denna sida.
                </span>
              </div>
            </div>
          ) : (
            <div className="bg-indigo-950/40 border border-indigo-500/40 rounded-2xl p-4 flex items-center justify-between gap-3 text-indigo-200">
              <div className="flex items-center gap-3 text-xs">
                <Bell className="w-5 h-5 text-indigo-400 shrink-0" />
                <div>
                  <span className="font-black block text-white">
                    Aktivera notiser för inkommande samtal
                  </span>
                  <span>Tryck nedan för att ge appen tillstånd att ringa i bakgrunden.</span>
                </div>
              </div>
              <button
                onClick={handleRequestPermission}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shrink-0 shadow-sm flex items-center gap-1.5"
              >
                <span>Slå på 🔔</span>
              </button>
            </div>
          )}
        </div>

        {/* How Background Calls Work: 3 Easy Steps */}
        <div className="bg-slate-950/60 rounded-2xl p-4 border border-slate-800 mb-5 space-y-3">
          <h4 className="text-xs font-black uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
            <Smartphone className="w-3.5 h-3.5 text-indigo-400" />
            <span>Så fungerar det på mobil & dator:</span>
          </h4>

          <div className="space-y-2.5 text-xs text-slate-300">
            <div className="flex items-start gap-2.5">
              <span className="w-5 h-5 rounded-full bg-slate-800 text-indigo-300 font-black text-[11px] flex items-center justify-center shrink-0">
                1
              </span>
              <p>
                <strong>Ha fliken öppen i bakgrunden:</strong> Om appen ligger i bakgrunden spelas ringsignalen och en klickbar notis med den som ringer dyker upp direkt.
              </p>
            </div>

            <div className="flex items-start gap-2.5">
              <span className="w-5 h-5 rounded-full bg-slate-800 text-indigo-300 font-black text-[11px] flex items-center justify-center shrink-0">
                2
              </span>
              <p>
                <strong>Installera på hemskärmen (PWA):</strong> På iPhone (Safari &rarr; Dela &rarr; Lägg till på hemskärmen) eller Android sparas appen som en riktig app med vibrationer och snabbåtkomst.
              </p>
            </div>

            <div className="flex items-start gap-2.5">
              <span className="w-5 h-5 rounded-full bg-slate-800 text-indigo-300 font-black text-[11px] flex items-center justify-center shrink-0">
                3
              </span>
              <p>
                <strong>Vibrationssignal:</strong> På mobiler aktiveras telefonens vibrationsmönster i takt med melodin.
              </p>
            </div>
          </div>
        </div>

        {/* Interactive Delay Test Feature */}
        <div className="bg-slate-800/60 p-4 rounded-2xl border border-slate-700/60 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <span className="text-xs font-black text-white block">
              Testa bakgrundssamtal & notis
            </span>
            <span className="text-[11px] text-slate-400">
              Startar en nedräkning så att du hinner minimera appen eller låsa skärmen.
            </span>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => handleTriggerTest(5)}
              className="px-3.5 py-2 rounded-xl text-xs font-black bg-emerald-500 hover:bg-emerald-400 text-white shadow-sm flex items-center gap-1.5 transition-all active:scale-95"
            >
              <BellRing className="w-3.5 h-3.5" />
              <span>Ring om 5s</span>
            </button>

            <button
              onClick={() => handleTriggerTest(10)}
              className="px-3 py-2 rounded-xl text-xs font-black bg-slate-700 hover:bg-slate-600 text-slate-200 shadow-sm flex items-center gap-1 transition-all active:scale-95"
            >
              <span>10s</span>
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-5 pt-3 border-t border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold transition-colors"
          >
            Stäng
          </button>
        </div>
      </div>
    </div>
  );
};
