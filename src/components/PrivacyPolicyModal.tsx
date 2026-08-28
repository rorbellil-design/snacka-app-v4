import React from 'react';
import { ShieldCheck, Lock, EyeOff, Trash2, HeartHandshake, X } from 'lucide-react';

interface PrivacyPolicyModalProps {
  onClose: () => void;
}

export const PrivacyPolicyModal: React.FC<PrivacyPolicyModalProps> = ({ onClose }) => {
  return (
    <div
      id="privacy-policy-modal"
      className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 animate-fadeIn overflow-y-auto"
    >
      <div className="bg-slate-900 border border-slate-800 text-slate-100 w-full max-w-xl rounded-3xl p-6 sm:p-8 shadow-2xl relative my-8 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-black text-white">Integritetspolicy & Barnsäkerhet</h2>
              <p className="text-xs text-slate-400">Google Play Families & COPPA/GDPR-K efterlevnad</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Body Content */}
        <div className="overflow-y-auto space-y-4 py-4 text-xs sm:text-sm text-slate-300 leading-relaxed pr-2">
          <div className="p-3.5 rounded-2xl bg-emerald-950/40 border border-emerald-800/40 text-emerald-300 flex items-start gap-3">
            <HeartHandshake className="w-5 h-5 shrink-0 text-emerald-400 mt-0.5" />
            <div>
              <strong className="block text-emerald-200 font-bold mb-0.5">Vårt säkerhetslöfte till familjer</strong>
              Snacka är skapad för barn. Vi samlar inte in, säljer inte och delar aldrig barns personuppgifter eller röstdata med tredje part.
            </div>
          </div>

          <div className="space-y-1">
            <h3 className="font-bold text-white flex items-center gap-2">
              <Lock className="w-4 h-4 text-indigo-400" />
              1. Slutet nätverk & Godkända kontakter (White-listing)
            </h3>
            <p className="text-slate-400 text-xs">
              Barnet kan endast ta emot samtal och ringa till de kontakter som föräldern uttryckligen har lagt till eller godkänt via det PIN-skyddade föräldraläget. Inga okända personer kan söka upp eller kontakta barnet.
            </p>
          </div>

          <div className="space-y-1">
            <h3 className="font-bold text-white flex items-center gap-2">
              <EyeOff className="w-4 h-4 text-indigo-400" />
              2. Ingen reklam, ingen beteendespårning
            </h3>
            <p className="text-slate-400 text-xs">
              Appen innehåller <strong>ingen tredjepartsreklam</strong>, inga spårningscookies och inga kommersiella SDK:er. All appaktivitet och kontaktlista lagras lokalt i enheten eller synkas krypterat enbart för röstanslutning.
            </p>
          </div>

          <div className="space-y-1">
            <h3 className="font-bold text-white flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-indigo-400" />
              3. Behörigheter och användning av Mikrofon
            </h3>
            <p className="text-slate-400 text-xs">
              Mikrofonbehörighet begärs endast för att möjliggöra realtids röstsamtal och röstmemo till barnets godkända kontakter. Ljud spelas aldrig in i bakgrunden utan barnets eller förälderns aktiva val.
            </p>
          </div>

          <div className="space-y-1">
            <h3 className="font-bold text-white flex items-center gap-2">
              <Trash2 className="w-4 h-4 text-rose-400" />
              4. Full kontroll och radering av data
            </h3>
            <p className="text-slate-400 text-xs">
              Som förälder har du fullständig kontroll över all lagrad information. Du kan när som helst exportera dina inställningar, redigera kontakter eller radera all sparad data direkt inifrån Föräldraläget.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="pt-4 border-t border-slate-800 flex justify-end shrink-0">
          <button
            onClick={onClose}
            className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl text-xs sm:text-sm font-bold shadow-xs transition-all active:scale-95"
          >
            Stäng & förstått
          </button>
        </div>
      </div>
    </div>
  );
};
