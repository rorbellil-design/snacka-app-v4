import React, { useState } from 'react';
import {
  QrCode,
  Share2,
  Copy,
  Check,
  ShieldCheck,
  UserPlus,
  Camera,
  X,
  Lock,
  Sparkles,
} from 'lucide-react';
import { Contact, ParentSettings } from '../types';
import { AvatarDisplay } from './AvatarDisplay';
import { sounds } from '../utils/audioEffects';

interface QrContactShareModalProps {
  settings: ParentSettings;
  onAddContactWithPinVerification: (newContact: Partial<Contact>) => void;
  onClose: () => void;
}

export const QrContactShareModal: React.FC<QrContactShareModalProps> = ({
  settings,
  onAddContactWithPinVerification,
  onClose,
}) => {
  const [tab, setTab] = useState<'my_qr' | 'scan_friend'>('my_qr');
  const [copied, setCopied] = useState(false);

  // Simulated Friend scan state
  const [simulatedFriend, setSimulatedFriend] = useState<{
    name: string;
    email: string;
    avatar: string;
    relation: Contact['relation'];
  }>({
    name: 'Oliver (Kompis)',
    email: 'oliver@skolan.se',
    avatar: '👦',
    relation: 'Kompis',
  });

  const [pinRequired, setPinRequired] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState('');

  const qrPayload = JSON.stringify({
    name: settings.childName,
    email: settings.childEmail,
    avatar: settings.childAvatar,
    type: 'KOMPISRING_CONTACT',
  });

  const handleCopyLink = () => {
    navigator.clipboard.writeText(settings.childEmail);
    setCopied(true);
    sounds.playReactionSound('magic');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleStartAddFriend = () => {
    setPinRequired(true);
    setPinInput('');
    setPinError('');
  };

  const handleConfirmAddFriend = (e: React.FormEvent) => {
    e.preventDefault();
    if (pinInput === settings.pin) {
      sounds.playReactionSound('magic');
      onAddContactWithPinVerification({
        name: simulatedFriend.name,
        email: simulatedFriend.email,
        avatar: simulatedFriend.avatar,
        relation: simulatedFriend.relation,
        category: 'kompisar',
        status: 'online',
        isFavorite: false,
        isQuickDial: true,
      });
      onClose();
    } else {
      sounds.playHangupTone();
      setPinError('Fel föräldra-PIN. Föräldern måste godkänna!');
    }
  };

  return (
    <div
      id="qr-contact-share-modal"
      className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 animate-fadeIn"
    >
      <div className="bg-white w-full max-w-md rounded-3xl p-6 sm:p-7 shadow-2xl border border-slate-200 relative text-center">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center font-bold"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Tab switch */}
        <div className="flex bg-slate-100 p-1 rounded-2xl mb-5 max-w-[280px] mx-auto">
          <button
            onClick={() => {
              setTab('my_qr');
              setPinRequired(false);
            }}
            className={`flex-1 py-1.5 rounded-xl text-xs font-bold transition-all ${
              tab === 'my_qr' ? 'bg-white text-indigo-700 shadow-xs' : 'text-slate-600'
            }`}
          >
            Mitt barns QR-kod
          </button>
          <button
            onClick={() => {
              setTab('scan_friend');
              setPinRequired(false);
            }}
            className={`flex-1 py-1.5 rounded-xl text-xs font-bold transition-all ${
              tab === 'scan_friend' ? 'bg-white text-indigo-700 shadow-xs' : 'text-slate-600'
            }`}
          >
            Scanna kompis
          </button>
        </div>

        {tab === 'my_qr' ? (
          /* My QR Code */
          <div className="flex flex-col items-center gap-4 animate-fadeIn">
            <div className="flex items-center gap-2">
              <AvatarDisplay
                avatar={settings.childAvatar}
                name={settings.childName}
                sizeClass="w-12 h-12"
                textSizeClass="text-2xl"
                className="bg-indigo-50 border border-indigo-100 rounded-2xl"
              />
              <div className="text-left">
                <h3 className="font-black text-slate-900 text-base">{settings.childName}</h3>
                <span className="text-xs text-indigo-600 font-mono font-bold block">
                  {settings.childEmail}
                </span>
              </div>
            </div>

            {/* Generated Stylized QR Matrix */}
            <div className="p-4 bg-slate-50 rounded-3xl border-2 border-indigo-100 shadow-inner flex flex-col items-center">
              <div className="w-48 h-48 bg-white p-3 rounded-2xl border border-slate-200 flex items-center justify-center relative shadow-sm">
                <svg
                  viewBox="0 0 100 100"
                  className="w-full h-full text-slate-900 fill-current"
                >
                  {/* Corner blocks */}
                  <rect x="0" y="0" width="30" height="30" rx="6" />
                  <rect x="5" y="5" width="20" height="20" rx="4" fill="white" />
                  <rect x="9" y="9" width="12" height="12" rx="2" fill="currentColor" />

                  <rect x="70" y="0" width="30" height="30" rx="6" />
                  <rect x="75" y="5" width="20" height="20" rx="4" fill="white" />
                  <rect x="79" y="9" width="12" height="12" rx="2" fill="currentColor" />

                  <rect x="0" y="70" width="30" height="30" rx="6" />
                  <rect x="5" y="75" width="20" height="20" rx="4" fill="white" />
                  <rect x="9" y="79" width="12" height="12" rx="2" fill="currentColor" />

                  {/* QR Matrix Bits */}
                  <rect x="36" y="8" width="8" height="8" rx="2" />
                  <rect x="48" y="8" width="8" height="8" rx="2" />
                  <rect x="58" y="18" width="8" height="8" rx="2" />
                  <rect x="36" y="24" width="8" height="8" rx="2" />

                  <rect x="8" y="38" width="8" height="8" rx="2" />
                  <rect x="20" y="44" width="8" height="8" rx="2" />
                  <rect x="36" y="40" width="10" height="10" rx="2" />
                  <rect x="52" y="36" width="8" height="8" rx="2" />
                  <rect x="66" y="44" width="8" height="8" rx="2" />
                  <rect x="80" y="38" width="8" height="8" rx="2" />

                  <rect x="38" y="60" width="8" height="8" rx="2" />
                  <rect x="52" y="56" width="8" height="8" rx="2" />
                  <rect x="68" y="68" width="8" height="8" rx="2" />
                  <rect x="82" y="78" width="8" height="8" rx="2" />
                  <rect x="50" y="76" width="8" height="8" rx="2" />
                </svg>

                {/* Center Badge */}
                <div className="absolute inset-0 m-auto w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-md">
                  <span className="text-lg">{settings.childAvatar}</span>
                </div>
              </div>

              <span className="text-[11px] font-bold text-slate-500 mt-2">
                Låt kompisens förälder scanna denna kod
              </span>
            </div>

            {/* Copy Address Button */}
            <div className="w-full flex gap-2">
              <button
                onClick={handleCopyLink}
                className="flex-1 py-2.5 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Kopierad!' : 'Kopiera ring-adress'}</span>
              </button>
            </div>

            <div className="p-3 bg-amber-50 rounded-2xl border border-amber-200 text-amber-900 text-xs text-left flex items-start gap-2">
              <ShieldCheck className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <span>
                När kompisen scannar koden måste <strong>båda föräldrarna</strong> bekräfta med sin 6-siffriga PIN för att samtal ska tillåtas.
              </span>
            </div>
          </div>
        ) : (
          /* Scan Friend Tab */
          <div className="flex flex-col items-center gap-4 animate-fadeIn">
            {!pinRequired ? (
              <>
                <div className="w-full p-6 bg-slate-900 rounded-3xl text-white flex flex-col items-center justify-center gap-3 relative overflow-hidden">
                  <div className="w-12 h-12 rounded-2xl bg-indigo-500/30 text-indigo-300 flex items-center justify-center">
                    <Camera className="w-6 h-6 animate-pulse" />
                  </div>
                  <div>
                    <h4 className="font-black text-sm">Rikta kameran mot kompisens QR-kod</h4>
                    <p className="text-xs text-slate-400 mt-1">
                      Eller klicka nedan för att simulera en scannad kompis
                    </p>
                  </div>
                </div>

                {/* Scanned contact preview */}
                <div className="w-full bg-indigo-50 p-4 rounded-2xl border border-indigo-100 flex items-center justify-between text-left">
                  <div className="flex items-center gap-3">
                    <AvatarDisplay
                      avatar={simulatedFriend.avatar}
                      name={simulatedFriend.name}
                      sizeClass="w-12 h-12"
                      textSizeClass="text-2xl"
                      className="bg-white border border-indigo-200 rounded-2xl"
                    />
                    <div>
                      <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider block">
                        Hittad kompis:
                      </span>
                      <h4 className="font-black text-slate-900 text-sm">{simulatedFriend.name}</h4>
                      <span className="text-xs text-slate-500 font-mono">{simulatedFriend.email}</span>
                    </div>
                  </div>
                </div>

                <button
                  id="approve-scanned-friend-btn"
                  onClick={handleStartAddFriend}
                  className="w-full py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-sm flex items-center justify-center gap-2 shadow-sm"
                >
                  <Lock className="w-4 h-4" />
                  <span>Godkänn och lägg till med PIN 🔒</span>
                </button>
              </>
            ) : (
              /* PIN Verification Form */
              <form onSubmit={handleConfirmAddFriend} className="w-full flex flex-col gap-3.5 text-left animate-fadeIn">
                <div className="p-3 bg-amber-50 rounded-2xl border border-amber-200 text-amber-900 text-xs flex items-start gap-2">
                  <ShieldCheck className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <strong className="block font-bold">Föräldragodkännande krävs</strong>
                    <span>Slå in din 6-siffriga föräldra-PIN för att lägga till <strong>{simulatedFriend.name}</strong> i Astrid's kontaktlista.</span>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    6-siffrig Föräldra-PIN
                  </label>
                  <input
                    id="qr-pin-input"
                    type="password"
                    maxLength={6}
                    required
                    autoFocus
                    value={pinInput}
                    onChange={(e) => setPinInput(e.target.value)}
                    placeholder="Slå in PIN"
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-300 font-mono text-center tracking-widest text-lg font-black focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                {pinError && (
                  <p className="text-xs font-bold text-rose-600 text-center animate-shake">
                    {pinError}
                  </p>
                )}

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setPinRequired(false)}
                    className="py-2.5 px-4 rounded-xl bg-slate-100 text-slate-700 font-bold text-xs"
                  >
                    Tillbaka
                  </button>
                  <button
                    type="submit"
                    id="submit-qr-pin-btn"
                    disabled={pinInput.length !== 6}
                    className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-black text-xs shadow-xs"
                  >
                    Godkänn & Lägg till kontakt ✅
                  </button>
                </div>
              </form>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
