import React, { useState, useRef, useEffect } from 'react';
import {
  X,
  Play,
  Pause,
  Phone,
  Volume2,
  Trash2,
  CheckCheck,
  Check,
} from 'lucide-react';
import { VoiceMessage, Contact } from '../types';
import { AvatarDisplay } from './AvatarDisplay';
import { sounds } from '../utils/audioEffects';

interface VoiceInboxModalProps {
  voiceMessages: VoiceMessage[];
  contacts: Contact[];
  onStartCall: (contact: Contact, type: 'voice') => void;
  onMarkVoiceMessageListened: (id: string) => void;
  onMarkAllVoiceMessagesListened?: () => void;
  onDeleteVoiceMessage?: (id: string) => void;
  onClose: () => void;
}

export const VoiceInboxModal: React.FC<VoiceInboxModalProps> = ({
  voiceMessages,
  contacts,
  onStartCall,
  onMarkVoiceMessageListened,
  onMarkAllVoiceMessagesListened,
  onDeleteVoiceMessage,
  onClose,
}) => {
  const [playingId, setPlayingId] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  const handleTogglePlay = (msg: VoiceMessage) => {
    if (playingId === msg.id) {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      setPlayingId(null);
      return;
    }

    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }

    // Immediately mark as listened so no unread badge or banner remains
    if (!msg.listened) {
      onMarkVoiceMessageListened(msg.id);
    }

    const audioSrc = msg.audioBase64 || msg.audioBlobUrl;
    if (audioSrc) {
      const audio = new Audio(audioSrc);
      audioRef.current = audio;
      setPlayingId(msg.id);

      audio.onended = () => {
        setPlayingId(null);
        audioRef.current = null;
      };
      audio.onerror = () => {
        setPlayingId(null);
        audioRef.current = null;
        sounds.playReactionSound('coin');
      };
      audio.play().catch((err) => {
        console.warn('Playback error:', err);
        setPlayingId(null);
      });
    } else {
      setPlayingId(msg.id);
      sounds.playReactionSound('coin');
      setTimeout(() => setPlayingId(null), 2500);
    }
  };

  // Only show messages received by the user from contacts
  const incomingMessages = voiceMessages.filter((msg) => msg.sender === 'contact');
  const unreadMessages = incomingMessages.filter((msg) => !msg.listened);

  const getContactForMessage = (msg: VoiceMessage): Contact | undefined => {
    return contacts.find(
      (c) =>
        c.id === msg.contactId ||
        (msg.senderEmail && c.email.toLowerCase() === msg.senderEmail.toLowerCase())
    );
  };

  const formatTimestamp = (ts: number): string => {
    const d = new Date(ts);
    const now = new Date();
    const isToday = d.toDateString() === now.toDateString();
    const timeStr = d.toLocaleTimeString('sv-SE', { hour: '2-digit', minute: '2-digit' });
    if (isToday) {
      return `Idag ${timeStr}`;
    }
    return `${d.toLocaleDateString('sv-SE', { month: 'short', day: 'numeric' })} ${timeStr}`;
  };

  return (
    <div
      id="voice-inbox-modal"
      className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn"
    >
      <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-3xl p-5 sm:p-7 border border-slate-200 dark:border-slate-800 shadow-2xl relative flex flex-col max-h-[90vh] text-slate-900 dark:text-white">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-indigo-500 to-amber-400 flex items-center justify-center text-white text-lg shadow-sm">
              🎙️
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white">
                  Röstbrevlåda
                </h2>
                {unreadMessages.length > 0 ? (
                  <span className="text-xs font-black bg-rose-500 text-white px-2.5 py-0.5 rounded-full animate-pulse">
                    {unreadMessages.length} nytt
                  </span>
                ) : incomingMessages.length > 0 ? (
                  <span className="text-xs font-bold bg-emerald-100 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300 px-2 py-0.5 rounded-full flex items-center gap-1">
                    <Check className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                    Alla lyssnade
                  </span>
                ) : null}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {unreadMessages.length > 0
                  ? 'Du har nya röstmemos att lyssna på'
                  : 'Inga nya meddelanden att lyssna på'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {unreadMessages.length > 0 && onMarkAllVoiceMessagesListened && (
              <button
                id="mark-all-listened-btn"
                onClick={onMarkAllVoiceMessagesListened}
                className="px-2.5 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold flex items-center gap-1 transition-all"
                title="Markera alla som lyssnade"
              >
                <CheckCheck className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                <span className="hidden sm:inline">Markera alla</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 flex items-center justify-center font-bold"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Message List */}
        <div className="flex-1 overflow-y-auto py-3 space-y-3 min-h-[220px] max-h-[55vh] pr-1">
          {incomingMessages.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-8 text-center text-slate-400 dark:text-slate-500">
              <span className="text-4xl mb-2">🎈</span>
              <p className="font-bold text-sm text-slate-700 dark:text-slate-300">
                Inga mottagna röstmemos
              </p>
              <p className="text-xs mt-1 text-slate-400">
                När någon pratar in ett memo till dig dyker det upp här!
              </p>
            </div>
          ) : (
            incomingMessages.map((msg) => {
              const matchedContact = getContactForMessage(msg);
              const isPlaying = playingId === msg.id;

              return (
                <div
                  key={msg.id}
                  id={`voice-msg-card-${msg.id}`}
                  className={`p-3.5 sm:p-4 rounded-2xl border transition-all flex items-center justify-between gap-3 ${
                    !msg.listened
                      ? 'bg-amber-50/70 dark:bg-amber-950/30 border-amber-300 dark:border-amber-700/70 shadow-xs'
                      : 'bg-slate-50 dark:bg-slate-800/50 border-slate-200/80 dark:border-slate-800/80'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <AvatarDisplay
                      avatar={msg.senderAvatar || matchedContact?.avatar || '🎙️'}
                      name={msg.contactName}
                      sizeClass="w-11 h-11"
                      textSizeClass="text-2xl"
                      className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 shrink-0"
                    />

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-black text-sm text-slate-900 dark:text-white truncate">
                          {msg.contactName || matchedContact?.name || 'Kompis'}
                        </span>
                        {!msg.listened ? (
                          <span className="text-[10px] font-black px-1.5 py-0.2 rounded-full bg-rose-500 text-white flex items-center gap-1 shrink-0">
                            <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                            Nytt
                          </span>
                        ) : (
                          <span className="text-[10px] text-slate-400 dark:text-slate-400 flex items-center gap-1 shrink-0">
                            <Check className="w-3 h-3 text-emerald-500" />
                            Lyssnat
                          </span>
                        )}
                        <span className="text-[10px] text-slate-400 shrink-0 hidden sm:inline">
                          {formatTimestamp(msg.timestamp)}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-xs font-bold text-slate-600 dark:text-slate-300">
                          🎙️ {msg.durationSeconds} sek
                        </span>
                        {isPlaying && (
                          <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1 animate-pulse">
                            <Volume2 className="w-3.5 h-3.5" /> Spelar...
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Play, Call Back & Delete Actions */}
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      id={`play-inbox-btn-${msg.id}`}
                      onClick={() => handleTogglePlay(msg)}
                      className={`px-3.5 py-2 rounded-xl text-xs font-black flex items-center gap-1.5 shadow-sm active:scale-95 transition-all ${
                        isPlaying
                          ? 'bg-rose-500 hover:bg-rose-600 text-white'
                          : !msg.listened
                          ? 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-500/25'
                          : 'bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-100'
                      }`}
                    >
                      {isPlaying ? (
                        <>
                          <Pause className="w-3.5 h-3.5 fill-current" />
                          <span>Pausa</span>
                        </>
                      ) : (
                        <>
                          <Play className="w-3.5 h-3.5 fill-current" />
                          <span>{!msg.listened ? 'Lyssna' : 'Spela igen'}</span>
                        </>
                      )}
                    </button>

                    {matchedContact && (
                      <button
                        id={`call-back-btn-${msg.id}`}
                        onClick={() => {
                          onClose();
                          onStartCall(matchedContact, 'voice');
                        }}
                        className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500 hover:text-white flex items-center justify-center transition-colors shadow-2xs"
                        title={`Ring ${matchedContact.name}`}
                      >
                        <Phone className="w-3.5 h-3.5 fill-current" />
                      </button>
                    )}

                    {onDeleteVoiceMessage && (
                      <button
                        id={`delete-voicemsg-btn-${msg.id}`}
                        onClick={() => onDeleteVoiceMessage(msg.id)}
                        className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-rose-100 dark:hover:bg-rose-950/60 hover:text-rose-600 text-slate-400 flex items-center justify-center transition-colors"
                        title="Ta bort memo"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
