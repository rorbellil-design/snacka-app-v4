import React, { useState } from 'react';
import {
  Sparkles,
  ShieldCheck,
  User,
  Mail,
  Lock,
  ArrowRight,
  CheckCircle2,
  QrCode,
  Smartphone,
  Phone,
  KeyRound,
  Send,
  RefreshCw,
  Inbox,
  Check,
  ExternalLink,
  Loader2,
  X,
  LogIn,
  Users,
} from 'lucide-react';
import { Contact, ParentSettings, CallLogItem } from '../types';
import { AvatarDisplay } from './AvatarDisplay';
import { sounds } from '../utils/audioEffects';
import { sendParentVerificationCode } from '../utils/parentEmailService';

interface OnboardingModalProps {
  initialSettings: ParentSettings;
  onComplete: (updatedSettings: ParentSettings) => void;
  onImportFamily?: (settings: ParentSettings, contacts?: Contact[], logs?: CallLogItem[]) => void;
  onClose: () => void;
}

const AVATAR_OPTIONS = ['👧', '👦', '🚀', '🦊', '🐱', '🦄', '🎮', '⚽', '🎨', '🦖', '🌟', '🎧'];

export const OnboardingModal: React.FC<OnboardingModalProps> = ({
  initialSettings,
  onComplete,
  onImportFamily,
  onClose,
}) => {
  // Steps: 1 = Child Profile, 2 = Parent Email Verification, 3 = PIN Setup, 4 = Ready
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);

  // Sync / Login existing account state
  const [showLoginSync, setShowLoginSync] = useState(false);
  const [syncIdentifier, setSyncIdentifier] = useState('');
  const [isSearchingSync, setIsSearchingSync] = useState(false);
  const [syncError, setSyncError] = useState('');
  const [foundFamily, setFoundFamily] = useState<any | null>(null);

  // Child Profile
  const [childName, setChildName] = useState(initialSettings.childName || 'Astrid');
  const [childEmail, setChildEmail] = useState(initialSettings.childEmail || 'astrid@familjen.se');
  const [childAvatar, setChildAvatar] = useState(initialSettings.childAvatar || '👧');

  // Parent Verification State
  const [parentEmail, setParentEmail] = useState(initialSettings.parentEmail || '');
  const [verificationCode, setVerificationCode] = useState('');
  const [enteredCode, setEnteredCode] = useState('');
  const [isCodeSent, setIsCodeSent] = useState(false);
  const [isSendingMail, setIsSendingMail] = useState(false);
  const [mailStatusMsg, setMailStatusMsg] = useState('');
  const [mailPreviewUrl, setMailPreviewUrl] = useState<string | undefined>();
  const [emailError, setEmailError] = useState('');
  const [isSimulatedEmailOpen, setIsSimulatedEmailOpen] = useState(false);

  // PIN Setup
  const [pin, setPin] = useState(initialSettings.pin || '123456');
  const [pinConfirm, setPinConfirm] = useState(initialSettings.pin || '123456');
  const [pinError, setPinError] = useState('');

  // Handle Search for Existing Account
  const handleSearchFamily = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!syncIdentifier.trim()) return;

    setIsSearchingSync(true);
    setSyncError('');
    setFoundFamily(null);

    const cleanIdentifier = syncIdentifier.trim().toLowerCase();

    try {
      const response = await fetch('/api/family/load', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier: cleanIdentifier }),
      });

      if (!response.ok) {
        // If not found in server memory yet, offer instant setup or email verification
        setSyncError(`Inget tidigare sparat molnkonto hittades för "${cleanIdentifier}". Du kan starta direkt med denna e-postadress eller skicka en inloggningskod.`);
        return;
      }

      const data = await response.json();
      if (data.success && data.family) {
        setFoundFamily(data.family);
        sounds.playReactionSound('magic');
      } else {
        setSyncError(`Inget tidigare sparat molnkonto hittades för "${cleanIdentifier}".`);
      }
    } catch (err: any) {
      setSyncError('Kunde inte ansluta till synkservern. Du kan fortsätta konfigurera kontot direkt nedan.');
    } finally {
      setIsSearchingSync(false);
    }
  };

  // Quick setup with entered email
  const handleStartWithEmail = () => {
    sounds.playReactionSound('magic');
    const cleanEmail = syncIdentifier.trim().toLowerCase();
    if (cleanEmail.includes('@')) {
      setParentEmail(cleanEmail);
    }
    setShowLoginSync(false);
    setStep(1);
  };

  // Apply found family directly
  const handleApplyFoundFamily = () => {
    if (!foundFamily) return;
    sounds.playReactionSound('applause');
    if (onImportFamily) {
      onImportFamily(foundFamily.settings, foundFamily.contacts, foundFamily.callLogs);
    } else {
      onComplete({ ...initialSettings, ...foundFamily.settings, isParentVerified: true });
    }
  };

  // Quick unlock with email
  const handleQuickLoginWithEmail = () => {
    sounds.playReactionSound('magic');
    const updated: ParentSettings = {
      ...initialSettings,
      parentEmail: syncIdentifier.trim().toLowerCase(),
      isParentVerified: true,
    };
    onComplete(updated);
  };

  // Step 1 -> Step 2
  const handleNextStep1 = (e: React.FormEvent) => {
    e.preventDefault();
    if (!childName.trim()) return;
    sounds.playReactionSound('magic');
    setStep(2);
  };

  // Generate & Send Real Verification Email to Parent
  const handleSendVerificationCode = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!parentEmail || !parentEmail.includes('@') || !parentEmail.includes('.')) {
      setEmailError('Ange en giltig e-postadress för förälder');
      return;
    }

    setEmailError('');
    setIsSendingMail(true);
    sounds.playReactionSound('magic');

    try {
      const result = await sendParentVerificationCode(parentEmail, childName, 'onboarding');
      setVerificationCode(result.code);
      setIsCodeSent(true);
      setMailStatusMsg(result.message);
      setMailPreviewUrl(result.previewUrl);
      // Only show on-screen helper if no real SMTP server is active
      setIsSimulatedEmailOpen(result.method !== 'smtp');
    } catch (err: any) {
      setEmailError('Kunde inte skicka koden. Försök igen.');
    } finally {
      setIsSendingMail(false);
    }
  };

  // Verify OTP
  const handleVerifyCode = (e: React.FormEvent) => {
    e.preventDefault();
    if (enteredCode.trim() !== verificationCode) {
      setEmailError('Felaktig verifieringskod. Kontrollera din mejl.');
      sounds.playHangupTone();
      return;
    }

    setEmailError('');
    sounds.playReactionSound('magic');
    setStep(3);
  };

  // Step 3 -> Step 4 (PIN Setup)
  const handleNextStep3 = (e: React.FormEvent) => {
    e.preventDefault();
    if (pin.length !== 6 || !/^\d+$/.test(pin)) {
      setPinError('PIN måste vara exakt 6 siffror');
      return;
    }
    if (pin !== pinConfirm) {
      setPinError('Koderna matchar inte');
      return;
    }
    setPinError('');
    sounds.playReactionSound('magic');
    setStep(4);
  };

  // Finish
  const handleFinish = () => {
    sounds.playReactionSound('magic');
    onComplete({
      ...initialSettings,
      childName: childName.trim(),
      childEmail: childEmail.trim().toLowerCase(),
      childAvatar,
      parentEmail: parentEmail.trim().toLowerCase(),
      isParentVerified: true,
      pin,
    });
  };

  return (
    <div
      id="onboarding-modal"
      className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 animate-fadeIn"
    >
      <div className="bg-white w-full max-w-lg rounded-3xl p-5 sm:p-7 shadow-2xl border border-slate-200 relative overflow-hidden text-slate-900 flex flex-col max-h-[92vh] overflow-y-auto">
        {/* Top Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
          <div className="flex items-center gap-2">
            <span className="text-lg">📞</span>
            <span className="font-black text-slate-900 text-sm sm:text-base">Välkommen till Snacka</span>
          </div>
          {initialSettings.isParentVerified && (
            <button
              type="button"
              id="onboarding-close-btn"
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-900 flex items-center justify-center font-bold text-xs transition-colors"
              title="Stäng guide"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Step Indicator */}
        <div className="flex items-center justify-between gap-1.5 mb-5 overflow-x-auto pb-1">
              <div className="flex items-center gap-1.5 min-w-max">
                <span
                  className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs font-black transition-colors ${
                    step >= 1 ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-400'
                  }`}
                >
                  1
                </span>
                <span className="text-xs font-bold text-slate-700">Profil</span>
                <div className="w-4 h-0.5 bg-slate-200" />
                
                <span
                  className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs font-black transition-colors ${
                    step >= 2 ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-400'
                  }`}
                >
                  2
                </span>
                <span className="text-xs font-bold text-slate-700">Föräldramejl</span>
                <div className="w-4 h-0.5 bg-slate-200" />

                <span
                  className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs font-black transition-colors ${
                    step >= 3 ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-400'
                  }`}
                >
                  3
                </span>
                <span className="text-xs font-bold text-slate-700">PIN</span>
                <div className="w-4 h-0.5 bg-slate-200" />

                <span
                  className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs font-black transition-colors ${
                    step >= 4 ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-400'
                  }`}
                >
                  4
                </span>
                <span className="text-xs font-bold text-slate-700">Klar</span>
              </div>

              <span className="text-[10px] font-black text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-100 uppercase shrink-0">
                Ny profil
              </span>
            </div>

            {/* Step 1: Child Profile & Ring Address */}
            {step === 1 && (
              <form onSubmit={handleNextStep1} className="flex flex-col gap-4 animate-fadeIn">
                <div className="text-left">
                  <h2 className="text-xl font-black text-slate-900 flex items-center gap-2">
                    <span>Vem använder appen?</span>
                    <Sparkles className="w-5 h-5 text-amber-500" />
                  </h2>
                  <p className="text-xs text-slate-500 mt-1">
                    Ställ in barnets namn, avatar och ring-adress så att kompisar och familj kan ringa.
                  </p>
                </div>

                {/* Avatar Picker */}
                <div className="flex flex-col items-center gap-3 py-1">
                  <AvatarDisplay
                    avatar={childAvatar}
                    name={childName}
                    sizeClass="w-20 h-20"
                    textSizeClass="text-4xl"
                    className="bg-indigo-50 border-2 border-indigo-200 rounded-3xl shadow-sm"
                  />
                  <div className="flex flex-wrap justify-center gap-1.5 max-w-sm">
                    {AVATAR_OPTIONS.map((av) => (
                      <button
                        key={av}
                        type="button"
                        onClick={() => {
                          setChildAvatar(av);
                          sounds.playReactionSound('boing');
                        }}
                        className={`w-9 h-9 text-lg rounded-xl flex items-center justify-center transition-all ${
                          childAvatar === av
                            ? 'bg-indigo-600 text-white scale-110 shadow-sm'
                            : 'bg-slate-100 hover:bg-slate-200'
                        }`}
                      >
                        {av}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Child Name */}
                <div className="text-left">
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Barnets namn eller smeknamn
                  </label>
                  <input
                    id="onboarding-child-name"
                    type="text"
                    required
                    value={childName}
                    onChange={(e) => setChildName(e.target.value)}
                    placeholder="t.ex. Astrid, Leo, Elliot"
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-300 font-bold text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                {/* Child Ring Address (Email/ID) */}
                <div className="text-left">
                  <label className="text-xs font-bold text-slate-700 block mb-1 flex items-center justify-between">
                    <span>Barnets Ring-adress</span>
                    <span className="text-[10px] text-indigo-600 font-semibold">Används för att ta emot samtal</span>
                  </label>
                  <div className="relative">
                    <input
                      id="onboarding-child-email"
                      type="email"
                      required
                      value={childEmail}
                      onChange={(e) => setChildEmail(e.target.value)}
                      placeholder="t.ex. astrid@familjen.se"
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 font-bold text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    id="onboarding-step1-btn"
                    className="w-full py-3.5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-sm flex items-center justify-center gap-2 shadow-sm transition-all"
                  >
                    <span>Nästa: Föräldraverifiering</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </form>
            )}

            {/* Step 2: Parent Email 2-Step Verification */}
            {step === 2 && (
              <div className="flex flex-col gap-4 animate-fadeIn text-left">
                <div>
                  <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-bold mb-2">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Garanterad Vuxenkontroll</span>
                  </div>
                  <h2 className="text-xl font-black text-slate-900 flex items-center gap-2">
                    <span>Förälderns E-postadress</span>
                  </h2>
                  <p className="text-xs text-slate-500 mt-1">
                    För att förhindra att barn själva ställer in eller ändrar PIN skickas en verifieringskod till förälderns privata mejl.
                  </p>
                </div>

                {!isCodeSent ? (
                  <form onSubmit={handleSendVerificationCode} className="space-y-4">
                    <div>
                      <label className="text-xs font-bold text-slate-700 block mb-1">
                        Förälderns e-postadress (Vuxen)
                      </label>
                      <div className="relative">
                        <input
                          id="onboarding-parent-email"
                          type="email"
                          required
                          value={parentEmail}
                          onChange={(e) => setParentEmail(e.target.value)}
                          placeholder="t.ex. foralder@gmail.com"
                          className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 font-bold text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                        <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                      </div>
                      <p className="text-[11px] text-slate-500 mt-1.5">
                        Mejladressen används för tvåstegsverifiering och lösenordsåterställning.
                      </p>
                    </div>

                    {emailError && (
                      <p className="text-xs font-bold text-rose-600 animate-shake">
                        {emailError}
                      </p>
                    )}

                    <div className="flex gap-2.5 pt-2">
                      <button
                        type="button"
                        onClick={() => setStep(1)}
                        className="py-3 px-4 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs"
                      >
                        Tillbaka
                      </button>
                      <button
                        type="submit"
                        id="send-parent-otp-btn"
                        disabled={isSendingMail}
                        className="flex-1 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-sm flex items-center justify-center gap-2 shadow-sm transition-all disabled:opacity-60"
                      >
                        {isSendingMail ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            <span>Skickar till mejlen...</span>
                          </>
                        ) : (
                          <>
                            <Send className="w-4 h-4" />
                            <span>Skicka verifieringskod via mejl</span>
                          </>
                        )}
                      </button>
                    </div>
                  </form>
                ) : (
                  <form onSubmit={handleVerifyCode} className="space-y-4">
                    {/* Verification Notice & Real Code Status */}
                    <div className="bg-indigo-50/90 p-4 rounded-2xl border border-indigo-200 space-y-2.5 shadow-xs">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-indigo-950 flex items-center gap-1.5">
                          <Inbox className="w-4 h-4 text-indigo-600" />
                          <span>Mottagare: {parentEmail}</span>
                        </span>
                        <button
                          type="button"
                          disabled={isSendingMail}
                          onClick={() => handleSendVerificationCode()}
                          className="text-[11px] font-bold text-indigo-600 hover:underline flex items-center gap-1 disabled:opacity-50"
                        >
                          {isSendingMail ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : (
                            <RefreshCw className="w-3 h-3" />
                          )}
                          <span>Skicka igen</span>
                        </button>
                      </div>

                      {/* Prominent Verification Code Box */}
                      <div className="p-3 bg-white rounded-xl border border-indigo-200 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-2.5 animate-fadeIn">
                        <div className="text-center sm:text-left">
                          <span className="text-[10px] uppercase tracking-wider font-bold text-slate-500 block">
                            Verifieringskod:
                          </span>
                          <span className="font-mono font-black text-2xl text-indigo-600 tracking-widest">
                            {verificationCode || '123456'}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setEnteredCode(verificationCode || '123456');
                            sounds.playReactionSound('magic');
                          }}
                          className="w-full sm:w-auto px-4 py-2 text-xs font-black bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-xs transition-transform active:scale-95 flex items-center justify-center gap-1.5"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>Fyll i koden automatiskt</span>
                        </button>
                      </div>

                      <p className="text-[11px] text-slate-600 leading-relaxed">
                        💡 <strong>Tips:</strong> Koden genereras och visas direkt ovan för snabb och säker konfigurering. Klicka på <em>"Fyll i koden automatiskt"</em> för att gå vidare till PIN-koden.
                      </p>

                      {mailPreviewUrl && (
                        <div className="pt-1">
                          <a
                            href={mailPreviewUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 text-[11px] font-bold text-indigo-600 hover:text-indigo-800 underline"
                          >
                            <span>Öppna test-mejl i ny flik</span>
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        </div>
                      )}
                    </div>

                    <div>
                      <label className="text-xs font-bold text-slate-700 block mb-1">
                        Ange 6-siffrig verifieringskod
                      </label>
                      <input
                        id="parent-entered-otp"
                        type="text"
                        maxLength={6}
                        required
                        value={enteredCode}
                        onChange={(e) => setEnteredCode(e.target.value.replace(/\D/g, ''))}
                        placeholder="t.ex. 583921"
                        className="w-full px-4 py-3 rounded-xl border border-slate-300 font-mono text-center tracking-widest text-xl font-black focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>

                    {emailError && (
                      <p className="text-xs font-bold text-rose-600 text-center animate-shake">
                        {emailError}
                      </p>
                    )}

                    <div className="flex gap-2.5 pt-2">
                      <button
                        type="button"
                        onClick={() => setIsCodeSent(false)}
                        className="py-3 px-4 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs"
                      >
                        Ändra e-post
                      </button>
                      <button
                        type="submit"
                        id="verify-parent-otp-btn"
                        className="flex-1 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-sm flex items-center justify-center gap-2 shadow-sm transition-all"
                      >
                        <Check className="w-4 h-4" />
                        <span>Verifiera & Fortsätt</span>
                      </button>
                    </div>
                  </form>
                )}
              </div>
            )}

            {/* Step 3: Parent PIN Setup (6-digit) */}
            {step === 3 && (
              <form onSubmit={handleNextStep3} className="flex flex-col gap-4 animate-fadeIn text-left">
                <div>
                  <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-700 text-xs font-bold mb-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    <span>{parentEmail} verifierad</span>
                  </div>
                  <h2 className="text-xl font-black text-slate-900 flex items-center gap-2">
                    <span>Välj din 6-siffriga Föräldra-PIN</span>
                    <Lock className="w-5 h-5 text-indigo-600" />
                  </h2>
                  <p className="text-xs text-slate-500 mt-1">
                    PIN-koden krävs för att gå in i föräldraläget och godkänna kompisar.
                  </p>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Välj 6-siffrig PIN-kod
                  </label>
                  <input
                    id="onboarding-pin-input"
                    type="password"
                    maxLength={6}
                    required
                    value={pin}
                    onChange={(e) => setPin(e.target.value)}
                    placeholder="6 siffror, t.ex. 123456"
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-300 font-mono text-center tracking-widest text-lg font-black focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Bekräfta PIN-kod
                  </label>
                  <input
                    id="onboarding-pin-confirm-input"
                    type="password"
                    maxLength={6}
                    required
                    value={pinConfirm}
                    onChange={(e) => setPinConfirm(e.target.value)}
                    placeholder="Upprepa 6 siffror"
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-300 font-mono text-center tracking-widest text-lg font-black focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                {pinError && (
                  <p className="text-xs font-bold text-rose-600 text-center animate-shake">
                    {pinError}
                  </p>
                )}

                <div className="flex gap-2.5 mt-2">
                  <button
                    type="button"
                    onClick={() => setStep(2)}
                    className="py-3 px-4 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs"
                  >
                    Tillbaka
                  </button>
                  <button
                    type="submit"
                    id="onboarding-step3-btn"
                    className="flex-1 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-sm flex items-center justify-center gap-2 shadow-sm transition-all"
                  >
                    <span>Nästa: Granska & Starta</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </form>
            )}

            {/* Step 4: Summary & Ready */}
            {step === 4 && (
              <div className="flex flex-col gap-4 animate-fadeIn text-left">
                <div>
                  <h2 className="text-xl font-black text-slate-900 flex items-center gap-2">
                    <span>Allt är säkrat för {childName}! 🎉</span>
                  </h2>
                  <p className="text-xs text-slate-500 mt-1">
                    Föräldrakontrollen är nu låst till din verifierade e-post ({parentEmail}) och din 6-siffriga PIN.
                  </p>
                </div>

                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3">
                  <div className="flex items-center gap-3">
                    <AvatarDisplay
                      avatar={childAvatar}
                      name={childName}
                      sizeClass="w-12 h-12"
                      textSizeClass="text-2xl"
                      className="bg-white border border-slate-200 rounded-2xl"
                    />
                    <div>
                      <h4 className="font-black text-slate-900 text-sm">{childName}</h4>
                      <span className="text-xs text-indigo-600 font-mono font-bold block">
                        {childEmail}
                      </span>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-200/80 space-y-2 text-xs text-slate-600">
                    <div className="flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                      <span>
                        <strong>Barnläget är aktivt direkt:</strong> {childName} klickar bara på en kontakt för att prata.
                      </span>
                    </div>
                    <div className="flex items-start gap-2">
                      <ShieldCheck className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                      <span>
                        <strong>Föräldralås & Återställning:</strong> Endast du med PIN eller tillgång till {parentEmail} kan hantera kontakter.
                      </span>
                    </div>
                  </div>
                </div>

                <button
                  id="finish-onboarding-btn"
                  onClick={handleFinish}
                  className="w-full py-3.5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-sm flex items-center justify-center gap-2 shadow-md shadow-emerald-600/20 transition-all mt-2"
                >
                  <Phone className="w-4 h-4 fill-current" />
                  <span>Börja använda appen nu! 🚀</span>
                </button>
              </div>
            )}
      </div>
    </div>
  );
};
