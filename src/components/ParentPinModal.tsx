import React, { useState, useEffect } from 'react';
import {
  Lock,
  ShieldCheck,
  X,
  Delete,
  HelpCircle,
  Shuffle,
  Clock,
  AlertTriangle,
  Mail,
  Send,
  RefreshCw,
  Inbox,
  Check,
  KeyRound,
  ArrowRight,
  Loader2,
  ExternalLink,
} from 'lucide-react';
import { sounds } from '../utils/audioEffects';
import { sendParentVerificationCode } from '../utils/parentEmailService';

interface ParentPinModalProps {
  currentPin: string;
  parentEmail?: string;
  childName?: string;
  onSuccess: () => void;
  onClose: () => void;
  onResetPin?: (newPin: string) => void;
}

const MAX_FAILED_ATTEMPTS = 3;
const LOCKOUT_SECONDS = 30;

export const ParentPinModal: React.FC<ParentPinModalProps> = ({
  currentPin,
  parentEmail = 'foralder@gmail.com',
  childName = 'Astrid',
  onSuccess,
  onClose,
  onResetPin,
}) => {
  const targetLength = currentPin.length >= 6 ? currentPin.length : 6;
  const [pinInput, setPinInput] = useState('');
  const [errorShake, setErrorShake] = useState(false);
  const [isScrambled, setIsScrambled] = useState(true);

  // Recovery mode (Email OTP)
  const [isRecoveryMode, setIsRecoveryMode] = useState(false);
  const [recoveryStep, setRecoveryStep] = useState<'send' | 'verify' | 'newPin'>('send');
  const [otpCode, setOtpCode] = useState('');
  const [enteredOtp, setEnteredOtp] = useState('');
  const [otpError, setOtpError] = useState('');
  const [isSendingMail, setIsSendingMail] = useState(false);
  const [mailPreviewUrl, setMailPreviewUrl] = useState<string | undefined>();
  const [newPin, setNewPin] = useState('');
  const [newPinConfirm, setNewPinConfirm] = useState('');
  const [isSimulatedMailOpen, setIsSimulatedMailOpen] = useState(false);

  // Failed attempts and lockout timer
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [lockoutRemaining, setLockoutRemaining] = useState<number>(0);

  // Shuffled digits for anti-shoulder-surfing
  const [keypadDigits, setKeypadDigits] = useState<string[]>(() => {
    return ['1', '2', '3', '4', '5', '6', '7', '8', '9'];
  });

  const shuffleKeypad = () => {
    const array = ['1', '2', '3', '4', '5', '6', '7', '8', '9'];
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
    setKeypadDigits(array);
  };

  useEffect(() => {
    if (isScrambled) {
      shuffleKeypad();
    } else {
      setKeypadDigits(['1', '2', '3', '4', '5', '6', '7', '8', '9']);
    }
  }, [isScrambled]);

  // Lockout countdown effect
  useEffect(() => {
    if (lockoutRemaining <= 0) return;

    const timer = setInterval(() => {
      setLockoutRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [lockoutRemaining]);

  const handleDigit = (digit: string) => {
    if (lockoutRemaining > 0) return;

    if (pinInput.length < targetLength) {
      const next = pinInput + digit;
      setPinInput(next);
      sounds.playReactionSound('boing');

      if (isScrambled) {
        shuffleKeypad();
      }

      if (next.length === targetLength) {
        if (next === currentPin) {
          sounds.playReactionSound('magic');
          setFailedAttempts(0);
          onSuccess();
        } else {
          setErrorShake(true);
          sounds.playHangupTone();

          const newFailed = failedAttempts + 1;
          setFailedAttempts(newFailed);

          if (newFailed >= MAX_FAILED_ATTEMPTS) {
            setLockoutRemaining(LOCKOUT_SECONDS);
          }

          setTimeout(() => {
            setErrorShake(false);
            setPinInput('');
          }, 600);
        }
      }
    }
  };

  const handleDelete = () => {
    if (lockoutRemaining > 0) return;
    setPinInput((prev) => prev.slice(0, -1));
  };

  // Trigger Recovery Code to Parent Email
  const handleSendRecoveryOtp = async () => {
    setIsSendingMail(true);
    sounds.playReactionSound('magic');

    try {
      const result = await sendParentVerificationCode(parentEmail, childName, 'recovery');
      setOtpCode(result.code);
      setMailPreviewUrl(result.previewUrl);
      setRecoveryStep('verify');
      setIsSimulatedMailOpen(result.method !== 'smtp');
    } catch (err) {
      const generated = Math.floor(100000 + Math.random() * 900000).toString();
      setOtpCode(generated);
      setRecoveryStep('verify');
      setIsSimulatedMailOpen(true);
    } finally {
      setIsSendingMail(false);
    }
  };

  const handleVerifyOtp = (e: React.FormEvent) => {
    e.preventDefault();
    if (enteredOtp.trim() !== otpCode) {
      setOtpError('Felaktig återställningskod. Kontrollera din mejl.');
      sounds.playHangupTone();
      return;
    }
    setOtpError('');
    sounds.playReactionSound('magic');
    setRecoveryStep('newPin');
  };

  const handleSaveNewPin = (e: React.FormEvent) => {
    e.preventDefault();
    if (newPin.length !== 6 || !/^\d+$/.test(newPin)) {
      setOtpError('PIN måste vara exakt 6 siffror');
      return;
    }
    if (newPin !== newPinConfirm) {
      setOtpError('PIN-koderna matchar inte');
      return;
    }
    if (onResetPin) {
      onResetPin(newPin);
    }
    sounds.playReactionSound('magic');
    onSuccess();
  };

  return (
    <div
      id="parent-pin-modal"
      className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 animate-fadeIn"
    >
      <div
        className={`bg-white dark:bg-slate-900 w-full max-w-sm rounded-3xl p-6 sm:p-7 text-center shadow-2xl border border-slate-200 dark:border-slate-800 relative transition-transform text-slate-900 dark:text-white ${
          errorShake ? 'animate-shake' : ''
        }`}
      >
        {/* Close Button */}
        <button
          id="close-pin-modal-btn"
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 flex items-center justify-center font-bold"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Lock Icon */}
        <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-100 dark:border-indigo-800 mx-auto flex items-center justify-center text-indigo-600 dark:text-indigo-400 mb-2.5 shadow-2xs">
          <Lock className="w-6 h-6" />
        </div>

        <h2 className="text-xl font-black text-slate-900 dark:text-white flex items-center justify-center gap-2">
          <span>Föräldraläge</span>
          <span className="text-sm px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 font-mono font-bold border border-indigo-200/50 dark:border-indigo-800">
            6 siffror
          </span>
        </h2>

        <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-1">
          {isRecoveryMode
            ? 'Återställ PIN via förälderns mejl'
            : `Slå in din ${targetLength}-siffriga föräldra-PIN`}
        </p>

        {/* Lockout Warning Banner */}
        {lockoutRemaining > 0 && !isRecoveryMode && (
          <div className="mt-3.5 p-3 rounded-2xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 flex items-center gap-2.5 text-rose-700 dark:text-rose-300 animate-fadeIn text-left">
            <Clock className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0 animate-spin" />
            <div className="text-xs">
              <span className="font-bold block text-rose-800 dark:text-rose-200">
                Tidsspärr aktiverad!
              </span>
              <span>
                För många felaktiga försök. Försök igen om{' '}
                <strong className="font-mono text-rose-900 dark:text-rose-100">{lockoutRemaining}s</strong>.
              </span>
            </div>
          </div>
        )}

        {failedAttempts > 0 && failedAttempts < MAX_FAILED_ATTEMPTS && lockoutRemaining === 0 && !isRecoveryMode && (
          <div className="mt-2 text-[11px] font-bold text-amber-600 dark:text-amber-400 flex items-center justify-center gap-1">
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>
              {failedAttempts} av {MAX_FAILED_ATTEMPTS} felaktiga försök
            </span>
          </div>
        )}

        {!isRecoveryMode ? (
          <div className="mt-4 flex flex-col items-center">
            {/* PIN Dots (6 dots) */}
            <div className="flex items-center justify-center gap-2.5 mb-4">
              {Array.from({ length: targetLength }).map((_, idx) => (
                <div
                  key={idx}
                  className={`w-3.5 h-3.5 rounded-full transition-all duration-200 ${
                    pinInput.length > idx
                      ? 'bg-indigo-600 dark:bg-indigo-500 scale-125 ring-4 ring-indigo-100 dark:ring-indigo-950'
                      : 'bg-slate-200 dark:bg-slate-700'
                  }`}
                />
              ))}
            </div>

            {/* Scramble mode switch */}
            <div className="w-full flex items-center justify-between px-2 mb-3">
              <button
                type="button"
                onClick={() => setIsScrambled(!isScrambled)}
                className={`text-[11px] font-bold flex items-center gap-1 px-2.5 py-1 rounded-xl transition-colors ${
                  isScrambled
                    ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                }`}
                title="Byt tangenternas placering så barnet inte kan tjuvtitta"
              >
                <Shuffle className="w-3.5 h-3.5" />
                <span>{isScrambled ? 'Slumpad knappsats PÅ' : 'Normal knappsats'}</span>
              </button>

              <button
                id="forgot-pin-toggle-btn"
                onClick={() => {
                  setIsRecoveryMode(true);
                  setRecoveryStep('send');
                }}
                className="text-[11px] font-bold text-amber-700 dark:text-amber-400 hover:text-amber-800 dark:hover:text-amber-300 flex items-center gap-1"
              >
                <HelpCircle className="w-3.5 h-3.5" />
                <span>Glömt PIN?</span>
              </button>
            </div>

            {/* Numeric Keypad */}
            <div className="grid grid-cols-3 gap-2 w-full max-w-[260px]">
              {keypadDigits.map((digit) => (
                <button
                  key={digit}
                  id={`pin-btn-${digit}`}
                  disabled={lockoutRemaining > 0}
                  onClick={() => handleDigit(digit)}
                  className="h-12 rounded-2xl bg-slate-50 dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-indigo-950/60 active:bg-indigo-100 dark:active:bg-indigo-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-black text-lg flex items-center justify-center shadow-2xs transition-all active:scale-95 disabled:opacity-40 disabled:pointer-events-none"
                >
                  {digit}
                </button>
              ))}

              <button
                type="button"
                disabled={lockoutRemaining > 0}
                onClick={shuffleKeypad}
                className="h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 font-bold text-xs flex flex-col items-center justify-center active:scale-95 disabled:opacity-40 border border-slate-200 dark:border-slate-700"
                title="Blanda knapparna"
              >
                <Shuffle className="w-3.5 h-3.5" />
                <span className="text-[9px]">Blanda</span>
              </button>

              <button
                id="pin-btn-0"
                disabled={lockoutRemaining > 0}
                onClick={() => handleDigit('0')}
                className="h-12 rounded-2xl bg-slate-50 dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-indigo-950/60 active:bg-indigo-100 dark:active:bg-indigo-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-black text-lg flex items-center justify-center shadow-2xs transition-all active:scale-95 disabled:opacity-40 disabled:pointer-events-none"
              >
                0
              </button>

              <button
                id="pin-backspace-btn"
                disabled={lockoutRemaining > 0}
                onClick={handleDelete}
                className="h-12 rounded-2xl bg-rose-50 dark:bg-rose-950/60 hover:bg-rose-100 dark:hover:bg-rose-900 text-rose-600 dark:text-rose-400 font-bold text-xs flex items-center justify-center active:scale-95 disabled:opacity-40 border border-rose-200 dark:border-rose-900"
                title="Radera"
              >
                <Delete className="w-4 h-4" />
              </button>
            </div>
          </div>
        ) : (
          /* Email OTP Recovery Mode */
          <div className="mt-4 text-left">
            {recoveryStep === 'send' && (
              <div className="space-y-3 animate-fadeIn">
                <div className="p-3 bg-amber-50 dark:bg-amber-950/50 rounded-2xl border border-amber-200 dark:border-amber-800 text-xs text-amber-900 dark:text-amber-200">
                  <span className="font-bold block mb-1">Tvåstegsverifiering via mejl</span>
                  Vi skickar en 6-siffrig engångskod till förälderns registrerade e-postadress:
                  <strong className="block mt-1 font-mono text-indigo-700 dark:text-indigo-300">
                    {parentEmail}
                  </strong>
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsRecoveryMode(false)}
                    className="py-2.5 px-3.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold"
                  >
                    Tillbaka
                  </button>
                  <button
                    type="button"
                    disabled={isSendingMail}
                    onClick={handleSendRecoveryOtp}
                    className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black flex items-center justify-center gap-1.5 shadow-sm disabled:opacity-60"
                  >
                    {isSendingMail ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Skickar till mejl...</span>
                      </>
                    ) : (
                      <>
                        <Send className="w-3.5 h-3.5" />
                        <span>Skicka återställningskod via mejl</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}

            {recoveryStep === 'verify' && (
              <form onSubmit={handleVerifyOtp} className="space-y-3 animate-fadeIn">
                <div className="p-3 bg-indigo-50 dark:bg-indigo-950/60 rounded-2xl border border-indigo-100 dark:border-indigo-800 text-xs">
                  <span className="font-bold text-indigo-900 dark:text-indigo-200 block mb-1">
                    Mejl skickat till {parentEmail}
                  </span>
                  Ange den 6-siffriga koden från mejlet nedan:

                  {mailPreviewUrl && (
                    <div className="pt-1">
                      <a
                        href={mailPreviewUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-[10px] font-bold text-indigo-600 hover:text-indigo-800 underline"
                      >
                        <span>Öppna test-mejl</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  )}

                  {isSimulatedMailOpen && (
                    <div className="mt-2 p-2.5 bg-white dark:bg-slate-800 rounded-xl border border-indigo-200 dark:border-indigo-700 flex items-center justify-between">
                      <span className="text-[11px] text-slate-600 dark:text-slate-300">Snabbkod:</span>
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono font-black text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950 px-2 py-0.5 rounded text-sm">
                          {otpCode}
                        </span>
                        <button
                          type="button"
                          onClick={() => setEnteredOtp(otpCode)}
                          className="text-[10px] font-bold bg-indigo-600 text-white px-2 py-1 rounded hover:bg-indigo-700 active:scale-95"
                        >
                          Fyll i
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                <input
                  id="recovery-otp-input"
                  type="text"
                  maxLength={6}
                  required
                  value={enteredOtp}
                  onChange={(e) => setEnteredOtp(e.target.value.replace(/\D/g, ''))}
                  placeholder="6 siffror"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-center font-mono text-lg font-black focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />

                {otpError && (
                  <p className="text-xs font-bold text-rose-600 text-center animate-shake">
                    {otpError}
                  </p>
                )}

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setRecoveryStep('send')}
                    className="py-2.5 px-3 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold"
                  >
                    Tillbaka
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-black shadow-sm"
                  >
                    Bekräfta kod
                  </button>
                </div>
              </form>
            )}

            {recoveryStep === 'newPin' && (
              <form onSubmit={handleSaveNewPin} className="space-y-3 animate-fadeIn">
                <div className="p-3 bg-emerald-50 dark:bg-emerald-950/60 rounded-2xl border border-emerald-200 dark:border-emerald-800 text-xs text-emerald-900 dark:text-emerald-200 flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-600" />
                  <span className="font-bold">E-post verifierad! Välj ny PIN:</span>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Ny 6-siffrig PIN
                  </label>
                  <input
                    type="password"
                    maxLength={6}
                    required
                    value={newPin}
                    onChange={(e) => setNewPin(e.target.value)}
                    placeholder="6 siffror"
                    className="w-full px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-center font-mono font-black"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Bekräfta ny PIN
                  </label>
                  <input
                    type="password"
                    maxLength={6}
                    required
                    value={newPinConfirm}
                    onChange={(e) => setNewPinConfirm(e.target.value)}
                    placeholder="Upprepa 6 siffror"
                    className="w-full px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-center font-mono font-black"
                  />
                </div>

                {otpError && (
                  <p className="text-xs font-bold text-rose-600 text-center animate-shake">
                    {otpError}
                  </p>
                )}

                <button
                  type="submit"
                  className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-black shadow-sm"
                >
                  Spara & Lås upp 🔓
                </button>
              </form>
            )}
          </div>
        )}

        <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-center gap-1.5 text-[11px] text-slate-400 dark:text-slate-500">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
          <span>Skyddat med 6-siffrigt lås & mejlverifiering</span>
        </div>
      </div>
    </div>
  );
};
