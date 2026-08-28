import React, { useState, useRef, useEffect } from 'react';
import { Mic, Square, Play, Pause, Send, X, Volume2, RotateCcw } from 'lucide-react';
import { Contact, VoiceMessage } from '../types';
import { sounds } from '../utils/audioEffects';
import { AvatarDisplay } from './AvatarDisplay';

interface VoiceMessageModalProps {
  contact: Contact;
  onClose: () => void;
  onSendVoiceMessage: (msg: VoiceMessage) => void;
}

export const VoiceMessageModal: React.FC<VoiceMessageModalProps> = ({
  contact,
  onClose,
  onSendVoiceMessage,
}) => {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [hasRecorded, setHasRecorded] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [audioBase64, setAudioBase64] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (audioUrl && audioUrl.startsWith('blob:')) URL.revokeObjectURL(audioUrl);
    };
  }, [audioUrl]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      let mimeType = '';
      if (typeof MediaRecorder !== 'undefined' && typeof MediaRecorder.isTypeSupported === 'function') {
        if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
          mimeType = 'audio/webm;codecs=opus';
        } else if (MediaRecorder.isTypeSupported('audio/mp4')) {
          mimeType = 'audio/mp4';
        } else if (MediaRecorder.isTypeSupported('audio/ogg')) {
          mimeType = 'audio/ogg';
        } else if (MediaRecorder.isTypeSupported('audio/webm')) {
          mimeType = 'audio/webm';
        }
      }

      const options = mimeType ? { mimeType } : undefined;
      const mediaRecorder = new MediaRecorder(stream, options);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = () => {
        const finalMime = mimeType || 'audio/webm';
        const blob = new Blob(chunksRef.current, { type: finalMime });
        
        // Convert to Base64 so it can be sent over WebRTC data channel and saved in localStorage
        const reader = new FileReader();
        reader.onloadend = () => {
          const b64 = reader.result as string;
          setAudioBase64(b64);
          setAudioUrl(b64);
        };
        reader.readAsDataURL(blob);

        setHasRecorded(true);
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingSeconds(0);
      sounds.playReactionSound('boing');

      timerRef.current = window.setInterval(() => {
        setRecordingSeconds((s) => s + 1);
      }, 1000);
    } catch (err) {
      console.warn('Microphone access issue in voice memo:', err);
      // Fallback simulation if mic is blocked
      setIsRecording(true);
      setRecordingSeconds(0);
      timerRef.current = window.setInterval(() => {
        setRecordingSeconds((s) => s + 1);
      }, 1000);
    }
  };

  const stopRecording = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    setIsRecording(false);
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try {
        mediaRecorderRef.current.stop();
      } catch (e) {
        setHasRecorded(true);
      }
    } else {
      setHasRecorded(true);
    }
    sounds.playReactionSound('magic');
  };

  const togglePlayback = () => {
    const playSrc = audioBase64 || audioUrl;
    if (!audioRef.current && playSrc) {
      audioRef.current = new Audio(playSrc);
      audioRef.current.onended = () => setIsPlaying(false);
    }

    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
        setIsPlaying(false);
      } else {
        audioRef.current.play().catch((e) => console.log('Audio play error:', e));
        setIsPlaying(true);
      }
    } else {
      setIsPlaying(true);
      sounds.playReactionSound('coin');
      setTimeout(() => setIsPlaying(false), 2000);
    }
  };

  const handleSend = () => {
    const newMsg: VoiceMessage = {
      id: 'vm-' + Date.now(),
      contactId: contact.id,
      contactName: contact.name,
      sender: 'child',
      timestamp: Date.now(),
      durationSeconds: Math.max(1, recordingSeconds),
      audioBlobUrl: audioBase64 || audioUrl || undefined,
      audioBase64: audioBase64 || undefined,
      listened: false,
    };
    onSendVoiceMessage(newMsg);
    sounds.playReactionSound('victory');
    onClose();
  };

  return (
    <div
      id="voice-message-modal"
      className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn"
    >
      <div className="bg-white dark:bg-slate-900 w-full max-w-sm rounded-3xl p-6 sm:p-7 text-center border border-slate-200 dark:border-slate-800 shadow-2xl relative flex flex-col items-center text-slate-900 dark:text-white">
        {/* Close */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 flex items-center justify-center font-bold"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Contact info */}
        <AvatarDisplay
          avatar={contact.avatar}
          name={contact.name}
          sizeClass="w-16 h-16"
          textSizeClass="text-3xl"
          className="rounded-2xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 mb-2 shadow-xs"
        />
        <h3 className="text-xl font-black text-slate-900 dark:text-white">
          Prata med {contact.name}
        </h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
          Skicka ett snabbt röstmeddelande
        </p>

        {/* Big Record Button & State */}
        <div className="my-6 flex flex-col items-center">
          {!hasRecorded ? (
            <div className="flex flex-col items-center gap-3">
              <button
                id="record-audio-btn"
                onClick={isRecording ? stopRecording : startRecording}
                className={`w-22 h-22 rounded-3xl flex flex-col items-center justify-center shadow-lg transition-all active:scale-95 ${
                  isRecording
                    ? 'bg-rose-500 text-white ring-4 ring-rose-500/30 animate-pulse'
                    : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-500/25 ring-4 ring-indigo-100 dark:ring-indigo-950'
                }`}
              >
                {isRecording ? (
                  <Square className="w-8 h-8 fill-white" />
                ) : (
                  <Mic className="w-8 h-8" />
                )}
              </button>
              <span className="text-xs font-bold text-slate-600 dark:text-slate-300">
                {isRecording
                  ? `Spelar in... 00:${recordingSeconds.toString().padStart(2, '0')}`
                  : 'Tryck för att tala in'}
              </span>
            </div>
          ) : (
            /* Recorded review state */
            <div className="flex flex-col items-center gap-3 w-full">
              <div className="flex items-center gap-3 bg-slate-50 dark:bg-slate-800/80 p-3 rounded-2xl border border-slate-200 dark:border-slate-700 w-full justify-between">
                <div className="flex items-center gap-3">
                  <button
                    onClick={togglePlayback}
                    className="w-10 h-10 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white flex items-center justify-center shadow-xs"
                  >
                    {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 fill-white" />}
                  </button>
                  <div className="text-left">
                    <span className="text-xs font-bold text-slate-900 dark:text-white block">Ditt röstmeddelande</span>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                      {recordingSeconds} sekunder
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => {
                    setHasRecorded(false);
                    setAudioUrl(null);
                    setRecordingSeconds(0);
                  }}
                  className="w-8 h-8 rounded-lg bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-500 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white flex items-center justify-center shadow-2xs"
                  title="Spela in på nytt"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-2.5 w-full mt-1">
          <button
            onClick={onClose}
            className="py-3 rounded-2xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs sm:text-sm transition-colors"
          >
            Avbryt
          </button>
          <button
            id="send-audio-message-btn"
            disabled={!hasRecorded}
            onClick={handleSend}
            className={`py-3 rounded-2xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-sm transition-all ${
              hasRecorded
                ? 'bg-emerald-500 hover:bg-emerald-600 text-white active:scale-97 shadow-emerald-500/20'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-600 cursor-not-allowed'
            }`}
          >
            <Send className="w-4 h-4" />
            <span>Skicka</span>
          </button>
        </div>
      </div>
    </div>
  );
};
