import React, { useEffect } from 'react';
import { Phone, PhoneOff, ShieldCheck, Music } from 'lucide-react';
import { Contact, RingtoneType } from '../types';
import { sounds } from '../utils/audioEffects';
import { AvatarDisplay } from './AvatarDisplay';

interface IncomingCallModalProps {
  contact: Contact;
  callType: 'voice';
  defaultRingtone?: RingtoneType;
  volume?: number;
  onAccept: () => void;
  onReject: () => void;
}

export const IncomingCallModal: React.FC<IncomingCallModalProps> = ({
  contact,
  callType,
  defaultRingtone = 'marimba',
  volume = 0.8,
  onAccept,
  onReject,
}) => {
  useEffect(() => {
    // Play ringtone loop using contact-specific or default ringtone
    const ringtoneToPlay = contact.ringtone || defaultRingtone;
    const stopRingtone = sounds.playRingtone(ringtoneToPlay, volume);
    return () => {
      stopRingtone();
    };
  }, [contact.ringtone, defaultRingtone, volume]);

  return (
    <div
      id="incoming-call-modal"
      className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-xl flex items-center justify-center p-4 animate-fadeIn"
    >
      <div className="bg-slate-900 border border-slate-800 w-full max-w-sm sm:max-w-md rounded-3xl p-7 text-center text-white shadow-2xl relative overflow-hidden flex flex-col items-center">
        {/* Soft background aura */}
        <div className="absolute -top-24 -left-24 w-52 h-52 bg-emerald-500/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-24 -right-24 w-52 h-52 bg-indigo-500/15 rounded-full blur-3xl" />

        {/* Top badge */}
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-800 text-emerald-400 border border-slate-700 text-xs font-bold tracking-wide uppercase mb-6">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
          Godkänd kontakt ringer
        </div>

        {/* Pulsing Avatar */}
        <div className="relative mb-5">
          <div className="absolute -inset-3 rounded-3xl bg-emerald-500/20 animate-ping" />
          <div className="absolute -inset-1 rounded-3xl bg-emerald-500/30 animate-pulse" />
          <div className="w-28 h-28 sm:w-32 sm:h-32 rounded-3xl bg-slate-800 p-1 relative z-10 shadow-2xl overflow-hidden border border-slate-700">
            <AvatarDisplay
              avatar={contact.avatar}
              name={contact.name}
              sizeClass="w-full h-full"
              textSizeClass="text-6xl"
              className="rounded-2xl bg-slate-900"
            />
          </div>
        </div>

        {/* Caller Info */}
        <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
          {contact.name}
        </h2>
        <p className="text-slate-400 font-semibold text-xs sm:text-sm mt-1">
          {contact.relation} vill prata med dig
        </p>

        {/* Action Buttons */}
        <div className="mt-8 flex items-center justify-center gap-10 w-full">
          {/* Reject */}
          <div className="flex flex-col items-center gap-2">
            <button
              id="reject-incoming-call-btn"
              onClick={onReject}
              className="w-16 h-16 sm:w-18 sm:h-18 rounded-full bg-rose-600 hover:bg-rose-500 active:scale-95 text-white flex items-center justify-center shadow-lg ring-4 ring-rose-500/20 transition-transform"
              title="Avvisa samtal"
            >
              <PhoneOff className="w-7 h-7 sm:w-8 sm:h-8" />
            </button>
            <span className="text-xs font-bold text-slate-400">Avvisa</span>
          </div>

          {/* Accept */}
          <div className="flex flex-col items-center gap-2">
            <button
              id="accept-incoming-call-btn"
              onClick={onAccept}
              className="w-16 h-16 sm:w-18 sm:h-18 rounded-full bg-emerald-500 hover:bg-emerald-600 active:scale-95 text-white flex items-center justify-center shadow-lg ring-4 ring-emerald-500/30 animate-bounce transition-transform"
              title="Svara"
            >
              <Phone className="w-7 h-7 sm:w-8 sm:h-8 fill-white" />
            </button>
            <span className="text-xs font-bold text-emerald-400">Svara</span>
          </div>
        </div>
      </div>
    </div>
  );
};
