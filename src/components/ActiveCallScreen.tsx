import React, { useState, useEffect } from 'react';
import {
  Mic,
  MicOff,
  PhoneOff,
  Volume2,
  VolumeX,
  ShieldCheck,
  Radio,
  UserPlus,
  Users,
  X,
  HelpCircle,
} from 'lucide-react';
import { ActiveCallState, Contact } from '../types';
import { sounds } from '../utils/audioEffects';
import { AvatarDisplay } from './AvatarDisplay';
import { AddParticipantModal } from './AddParticipantModal';

interface ActiveCallScreenProps {
  call: ActiveCallState;
  allContacts: Contact[];
  onEndCall: () => void;
  onToggleMute: () => void;
  onToggleSpeaker: () => void;
  onAddParticipant: (contact: Contact) => void;
  onRemoveParticipant?: (contactId: string) => void;
}

const CONVERSATION_PROMPTS = [
  'Skulle du hellre kunna flyga eller vara helt osynlig? 🦅👻',
  'Om du fick 10 000 V-Bucks eller Robux just nu, vad skulle du köpa? 🎮',
  'Vad är den godaste pizzan som finns? 🍕',
  'Om du fick skapa ett eget datorspel, vad skulle det handla om? 🕹️',
  'Gåta: Vad blir blötare och blötare ju mer det torkar? (Svar: Handduken!) 🛁',
  'Skulle du hellre ha en tam drake eller en enhörning som husdjur? 🐉🦄',
  'Vilket är ditt favoritämne i skolan just nu? 📚',
  'Vad är det roligaste som har hänt i veckan? 😄',
  'Skulle du hellre bara få äta glass eller bara tacos resten av livet? 🍦🌮',
];

const QUICK_REACTIONS = [
  { emoji: '🔥', label: 'Eld' },
  { emoji: '💀', label: 'Dör' },
  { emoji: '👑', label: 'Legend' },
  { emoji: '🚀', label: 'Raket' },
  { emoji: '💯', label: 'Hundra' },
  { emoji: '🎮', label: 'Gaming' },
  { emoji: '⚡', label: 'Blixt' },
  { emoji: '❤️', label: 'Hjärta' },
];

export const ActiveCallScreen: React.FC<ActiveCallScreenProps> = ({
  call,
  allContacts,
  onEndCall,
  onToggleMute,
  onToggleSpeaker,
  onAddParticipant,
  onRemoveParticipant,
}) => {
  const [showPrompts, setShowPrompts] = useState(false);
  const [showAddParticipant, setShowAddParticipant] = useState(false);
  const [floatingEmojis, setFloatingEmojis] = useState<{ id: number; emoji: string; x: number }[]>([]);
  const [currentPromptIndex, setCurrentPromptIndex] = useState(0);

  // Participants in the call (with fallback to call.contact)
  const activeParticipants =
    call.participants && call.participants.length > 0
      ? call.participants
      : [{ contact: call.contact, status: call.status === 'connected' ? 'connected' : ('calling' as const) }];

  const isMultiPerson = activeParticipants.length > 1;

  // Available contacts that can still be added
  const currentParticipantIds = activeParticipants.map((p) => p.contact.id);
  const availableToAdd = allContacts.filter((c) => !currentParticipantIds.includes(c.id));

  // Demo contact voice greetings
  useEffect(() => {
    if (call.status === 'connected') {
      const connectedBots = activeParticipants.filter(
        (p) => p.status === 'connected' && p.contact.isDemoBot
      );

      if (connectedBots.length > 0) {
        const timer = setTimeout(() => {
          const greetings = isMultiPerson
            ? [
                `Tja allihopa! Riktigt kul med gruppsamtal!`,
                `Hallå gänget! Jag hör er perfekt!`,
                `Tja! Vad spelar ni eller gör ni idag?`,
              ]
            : [
                `Tja! Kul att du ringde! Jag hör dig klockrent.`,
                `Hallå där! Vad händer just nu?`,
                `Tjena! Allt bra här, vad gör du för kul?`,
              ];
          const randomGreeting = greetings[Math.floor(Math.random() * greetings.length)];
          sounds.speakSwedish(randomGreeting);
        }, 1200);

        return () => clearTimeout(timer);
      }
    }
  }, [call.status, activeParticipants.length]);

  const triggerEmojiOnly = (emoji: string) => {
    const newId = Date.now() + Math.random();
    setFloatingEmojis((prev) => [...prev, { id: newId, emoji, x: Math.random() * 70 + 15 }]);
    setTimeout(() => {
      setFloatingEmojis((prev) => prev.filter((item) => item.id !== newId));
    }, 2200);

    // Subtle audio feedback for emojis
    if (emoji === '🔥' || emoji === '🚀') {
      sounds.playReactionSound('laser');
    } else if (emoji === '👑' || emoji === '💯') {
      sounds.playReactionSound('victory');
    } else if (emoji === '💀') {
      sounds.playReactionSound('rimshot');
    } else {
      sounds.playReactionSound('coin');
    }
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleAddParticipant = (contact: Contact) => {
    onAddParticipant(contact);
    setShowAddParticipant(false);
  };

  const nextPrompt = () => {
    setCurrentPromptIndex((prev) => (prev + 1) % CONVERSATION_PROMPTS.length);
  };

  return (
    <div
      id="active-call-modal"
      className="fixed inset-0 z-50 bg-slate-950 text-white flex flex-col justify-between overflow-hidden select-none"
    >
      {/* Ambient Pulsing Background Glows */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-indigo-500/15 rounded-full blur-3xl animate-pulse-glow" />
        <div className="absolute bottom-1/3 left-1/3 w-80 h-80 bg-pink-500/10 rounded-full blur-3xl" />
        <div className="absolute top-1/3 right-1/4 w-72 h-72 bg-emerald-500/10 rounded-full blur-3xl" />
      </div>

      {/* Floating Reaction Emojis */}
      {floatingEmojis.map((item) => (
        <div
          key={item.id}
          className="absolute text-5xl sm:text-6xl animate-float-up pointer-events-none z-40 transition-all"
          style={{ left: `${item.x}%`, bottom: '20%' }}
        >
          {item.emoji}
        </div>
      ))}

      {/* Top Header: In-call status & Duration */}
      <header className="relative z-20 p-4 sm:p-6 flex items-center justify-between gap-3 max-w-5xl mx-auto w-full">
        {/* Left info pill */}
        <div className="flex items-center gap-3 bg-slate-900/80 backdrop-blur-xl px-4 py-2.5 rounded-2xl border border-slate-800 shadow-lg">
          {isMultiPerson ? (
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center">
                <Users className="w-4 h-4" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <h2 className="font-bold text-white text-sm">Gruppsamtal</h2>
                  <span className="text-[10px] font-bold text-amber-300 bg-amber-500/20 px-2 py-0.5 rounded-full">
                    {activeParticipants.length} anslutna
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 font-medium flex items-center gap-1">
                  <Radio className="w-3 h-3 text-emerald-400 animate-pulse" />
                  <span>Kopplad röstkanal</span>
                </p>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2.5">
              <AvatarDisplay
                avatar={call.contact.avatar}
                name={call.contact.name}
                sizeClass="w-8 h-8"
                textSizeClass="text-xl"
                className="bg-slate-800 rounded-xl"
              />
              <div>
                <div className="flex items-center gap-1.5">
                  <h2 className="font-bold text-white text-sm truncate max-w-[140px] sm:max-w-none">
                    {call.contact.name}
                  </h2>
                  <span className="text-[10px] font-bold text-slate-300 bg-slate-800 px-2 py-0.5 rounded-full">
                    {call.contact.relation}
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 font-medium flex items-center gap-1">
                  <Radio className="w-3 h-3 text-emerald-400 animate-pulse" />
                  <span>Röstsamtal aktivt</span>
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Right Tools: Add Participant + Duration */}
        <div className="flex items-center gap-2">
          {availableToAdd.length > 0 && (
            <button
              id="in-call-add-participant-btn"
              onClick={() => setShowAddParticipant(true)}
              className="px-3 sm:px-4 py-2 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs sm:text-sm flex items-center gap-1.5 shadow-lg border border-indigo-500/40 active:scale-95 transition-all"
              title="Bjud in en vän till samtalet"
            >
              <UserPlus className="w-4 h-4" />
              <span className="hidden sm:inline">Bjud in vän</span>
              <span className="sm:hidden">+</span>
            </button>
          )}

          <div className="bg-slate-900/80 backdrop-blur-xl px-3.5 sm:px-4 py-2 rounded-2xl border border-slate-800 shadow flex items-center gap-2">
            <span
              className={`w-2.5 h-2.5 rounded-full ${
                call.status === 'connected' ? 'bg-emerald-400 animate-ping' : 'bg-amber-400 animate-pulse'
              }`}
            />
            <span className="font-mono font-bold text-xs sm:text-sm text-white">
              {call.status === 'calling' ? 'Ringer...' : formatDuration(call.duration)}
            </span>
          </div>
        </div>
      </header>

      {/* Main Center Area: Participants Display */}
      <main className="relative z-20 flex-1 flex flex-col items-center justify-center p-4 sm:p-6 text-center max-w-4xl mx-auto w-full">
        {/* VIEW A: SINGLE PARTICIPANT VIEW */}
        {!isMultiPerson ? (
          <div className="flex flex-col items-center justify-center">
            {/* Pulsing Avatar Halo */}
            <div className="relative flex items-center justify-center mb-6">
              {call.status === 'connected' && !call.isMuted && (
                <>
                  <div className="absolute w-56 h-56 sm:w-72 sm:h-72 rounded-full border border-emerald-500/20 animate-ping" />
                  <div className="absolute w-44 h-44 sm:w-60 sm:h-60 rounded-full bg-emerald-500/10 animate-pulse" />
                </>
              )}

              {call.status === 'calling' && (
                <div className="absolute w-48 h-48 sm:w-64 sm:h-64 rounded-full border-2 border-dashed border-indigo-400/40 animate-spin" />
              )}

              {/* Big Squircle Avatar */}
              <div className="w-36 h-36 sm:w-48 sm:h-48 rounded-3xl bg-slate-900 border-2 border-slate-800 p-2 shadow-2xl relative z-10">
                <AvatarDisplay
                  avatar={call.contact.avatar}
                  name={call.contact.name}
                  sizeClass="w-full h-full"
                  textSizeClass="text-6xl sm:text-7xl"
                  className="rounded-2xl bg-slate-900"
                />
              </div>
            </div>

            {/* Caller Name & Relation */}
            <h1 className="text-2xl sm:text-4xl font-black text-white tracking-tight">
              {call.contact.name}
            </h1>

            {call.contact.activityStatus && (
              <span className="mt-1 px-3 py-0.5 rounded-full bg-slate-800/80 text-indigo-300 text-xs font-semibold border border-slate-700/60">
                {call.contact.activityStatus}
              </span>
            )}

            <p className="text-xs sm:text-sm font-semibold text-slate-400 mt-2 flex items-center gap-1.5 justify-center">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              {call.status === 'connected' ? 'Pratar med varandra 🎙️' : `Ringer upp ${call.contact.name}...`}
            </p>
          </div>
        ) : (
          /* VIEW B: MULTI-PARTICIPANT GROUP VIEW */
          <div className="w-full flex flex-col items-center justify-center">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-5 w-full max-w-2xl justify-items-center mb-4">
              {activeParticipants.map((participant) => (
                <div
                  key={participant.contact.id}
                  id={`participant-bubble-${participant.contact.id}`}
                  className="bg-slate-900/90 border border-slate-800 hover:border-slate-700 p-3.5 sm:p-4 rounded-3xl flex flex-col items-center text-center relative shadow-xl w-full max-w-[200px] transition-all group"
                >
                  {/* Remove participant button */}
                  {onRemoveParticipant && activeParticipants.length > 2 && (
                    <button
                      onClick={() => onRemoveParticipant(participant.contact.id)}
                      className="absolute top-2 right-2 w-6 h-6 rounded-full bg-rose-950 text-rose-300 border border-rose-800 hover:bg-rose-800 hover:text-white flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                      title={`Koppla bort ${participant.contact.name}`}
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}

                  {/* Pulsing Avatar */}
                  <div className="relative mb-2.5">
                    {participant.status === 'connected' && (
                      <div className="absolute -inset-1.5 rounded-2xl bg-emerald-500/20 animate-pulse" />
                    )}
                    {participant.status === 'calling' && (
                      <div className="absolute -inset-1.5 rounded-2xl border-2 border-dashed border-amber-400 animate-spin" />
                    )}
                    <div className="w-18 h-18 sm:w-22 sm:h-22 rounded-2xl bg-slate-800 p-1 shadow-md relative z-10 overflow-hidden border border-slate-700">
                      <AvatarDisplay
                        avatar={participant.contact.avatar}
                        name={participant.contact.name}
                        sizeClass="w-full h-full"
                        textSizeClass="text-4xl sm:text-5xl"
                        className="rounded-xl bg-slate-900"
                      />
                    </div>
                  </div>

                  <span className="font-black text-white text-sm sm:text-base truncate max-w-full block">
                    {participant.contact.name}
                  </span>
                  <span className="text-[11px] font-bold text-slate-400 mt-0.5">
                    {participant.contact.relation}
                  </span>

                  {/* Connection Status Badge */}
                  <div className="mt-2.5">
                    {participant.status === 'connected' ? (
                      <span className="text-[10px] bg-emerald-950 text-emerald-300 border border-emerald-800 px-2.5 py-0.5 rounded-full font-bold flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                        Ansluten
                      </span>
                    ) : (
                      <span className="text-[10px] bg-amber-950 text-amber-300 border border-amber-800 px-2.5 py-0.5 rounded-full font-bold flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                        Ringer upp...
                      </span>
                    )}
                  </div>
                </div>
              ))}

              {/* Add More Person Button Tile in Grid */}
              {availableToAdd.length > 0 && activeParticipants.length < 6 && (
                <button
                  id="add-participant-grid-tile"
                  onClick={() => setShowAddParticipant(true)}
                  className="bg-slate-900/40 hover:bg-slate-900/80 border border-dashed border-slate-700 hover:border-slate-500 p-3 sm:p-4 rounded-3xl flex flex-col items-center justify-center text-center shadow-lg w-full max-w-[200px] min-h-[140px] text-slate-400 hover:text-slate-200 transition-all active:scale-95"
                >
                  <div className="w-12 h-12 rounded-2xl bg-slate-800 border border-slate-700 flex items-center justify-center mb-2 text-indigo-400">
                    <UserPlus className="w-6 h-6" />
                  </div>
                  <span className="text-xs font-bold text-white">Bjud in fler</span>
                  <span className="text-[10px] text-slate-400 mt-0.5">Lägg till vän</span>
                </button>
              )}
            </div>
          </div>
        )}

        {/* Live Animated Voice Bars */}
        {call.status === 'connected' && (
          <div className="flex items-center gap-1.5 sm:gap-2 mt-4 h-8 px-5 py-2 rounded-full bg-slate-900/80 border border-slate-800">
            {[40, 75, 100, 60, 90, 45, 80, 100, 65, 50, 85, 30].map((h, i) => (
              <span
                key={i}
                className="w-1 sm:w-1.5 bg-gradient-to-t from-emerald-400 to-indigo-300 rounded-full transition-all duration-150"
                style={{
                  height: call.isMuted ? '4px' : `${Math.max(6, h * (0.35 + (i % 3) * 0.22))}px`,
                  opacity: call.isMuted ? 0.3 : 0.85,
                }}
              />
            ))}
          </div>
        )}

        {/* Quick Reactions Bar (Fire, Skull, Crown, Rocket, etc.) */}
        {call.status === 'connected' && (
          <div className="flex items-center gap-1.5 sm:gap-2 mt-4 bg-slate-900/90 px-3 py-1.5 rounded-2xl border border-slate-800 shadow-md flex-wrap justify-center">
            {QUICK_REACTIONS.map((r) => (
              <button
                key={r.emoji}
                onClick={() => triggerEmojiOnly(r.emoji)}
                className="w-8 h-8 rounded-xl hover:bg-slate-800 flex items-center justify-center text-lg active:scale-125 transition-transform"
                title={r.label}
              >
                {r.emoji}
              </button>
            ))}
          </div>
        )}

        {/* In-Call Extra Tools: Icebreakers */}
        {call.status === 'connected' && (
          <div className="flex items-center gap-2.5 sm:gap-3 mt-4 flex-wrap justify-center">
            <button
              id="toggle-prompts-btn"
              onClick={() => setShowPrompts(!showPrompts)}
              className={`px-4 py-2.5 rounded-2xl font-bold text-xs sm:text-sm flex items-center gap-2 border transition-all active:scale-95 ${
                showPrompts
                  ? 'bg-emerald-500 text-white border-emerald-400 shadow-md'
                  : 'bg-slate-900/80 text-slate-200 border-slate-800 hover:bg-slate-800'
              }`}
            >
              <HelpCircle className="w-4 h-4 text-emerald-400" />
              <span>Frågor & Gåtor 🎲</span>
            </button>
          </div>
        )}
      </main>

      {/* Conversation Starters & Riddles Card */}
      {showPrompts && (
        <div className="relative z-30 max-w-md mx-auto px-4 w-full mb-2 animate-fadeIn">
          <div className="bg-slate-900/95 backdrop-blur-xl p-4 rounded-3xl border border-emerald-500/40 shadow-2xl flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                <HelpCircle className="w-3.5 h-3.5" />
                <span>Samtalsfråga / Gåta</span>
              </span>
              <button
                onClick={() => setShowPrompts(false)}
                className="text-xs font-bold text-slate-400 hover:text-white px-2 py-1"
              >
                Stäng ✕
              </button>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 text-sm font-bold text-slate-100 text-center">
              "{CONVERSATION_PROMPTS[currentPromptIndex]}"
            </div>

            <button
              onClick={nextPrompt}
              className="py-2 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-600 active:scale-95 text-white font-black text-xs flex items-center justify-center gap-1.5 transition-all shadow-sm"
            >
              <span>Ny fråga 🎲</span>
            </button>
          </div>
        </div>
      )}

      {/* Bottom Main Call Controls */}
      <footer className="relative z-20 p-4 sm:p-6 bg-slate-950/90 backdrop-blur-md border-t border-slate-800/80 flex items-center justify-center gap-6 sm:gap-10">
        {/* Mute Microphone */}
        <button
          id="toggle-mute-btn"
          onClick={onToggleMute}
          className={`w-14 h-14 sm:w-16 sm:h-16 rounded-2xl flex flex-col items-center justify-center gap-1 shadow-sm transition-all active:scale-95 ${
            call.isMuted
              ? 'bg-rose-500 text-white ring-4 ring-rose-500/20'
              : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
          }`}
          title={call.isMuted ? 'Sätt på mikrofon' : 'Stäng av mikrofon'}
        >
          {call.isMuted ? <MicOff className="w-5 h-5 sm:w-6 sm:h-6" /> : <Mic className="w-5 h-5 sm:w-6 sm:h-6" />}
          <span className="text-[10px] font-bold">{call.isMuted ? 'Tyst' : 'Mikrofon'}</span>
        </button>

        {/* Hangup Button */}
        <button
          id="hangup-call-btn"
          onClick={onEndCall}
          className="w-18 h-18 sm:w-20 sm:h-20 rounded-3xl bg-rose-600 hover:bg-rose-500 active:scale-95 text-white flex flex-col items-center justify-center gap-1 shadow-xl ring-4 ring-rose-500/30 transition-transform"
          title="Avsluta samtal"
        >
          <PhoneOff className="w-7 h-7 sm:w-8 sm:h-8" />
          <span className="text-xs font-black">Lägg på</span>
        </button>

        {/* Speaker Volume Toggle */}
        <button
          id="toggle-speaker-btn"
          onClick={onToggleSpeaker}
          className={`w-14 h-14 sm:w-16 sm:h-16 rounded-2xl flex flex-col items-center justify-center gap-1 shadow-sm transition-all active:scale-95 ${
            call.isSpeakerOn
              ? 'bg-indigo-600 text-white ring-4 ring-indigo-500/20'
              : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
          }`}
          title={call.isSpeakerOn ? 'Högtalare på' : 'Högtalare av'}
        >
          {call.isSpeakerOn ? <Volume2 className="w-5 h-5 sm:w-6 sm:h-6" /> : <VolumeX className="w-5 h-5 sm:w-6 sm:h-6" />}
          <span className="text-[10px] font-bold">{call.isSpeakerOn ? 'Högtalare' : 'Tyst'}</span>
        </button>
      </footer>

      {/* Add Participant Modal */}
      {showAddParticipant && (
        <AddParticipantModal
          availableContacts={availableToAdd}
          onAddContact={handleAddParticipant}
          onClose={() => setShowAddParticipant(false)}
        />
      )}
    </div>
  );
};
