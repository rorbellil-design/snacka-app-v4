import React, { useState, useEffect, useRef } from 'react';
import { Music, Play, Square, Check, Volume2, Sparkles, X, Radio } from 'lucide-react';
import { RingtoneType } from '../types';
import { sounds, RINGTONE_OPTIONS, RingtoneOption } from '../utils/audioEffects';

interface RingtonePickerModalProps {
  currentRingtone: RingtoneType;
  volume?: number;
  onSelectRingtone: (ringtone: RingtoneType) => void;
  onUpdateVolume?: (volume: number) => void;
  onClose: () => void;
  title?: string;
  subtitle?: string;
}

export const RingtonePickerModal: React.FC<RingtonePickerModalProps> = ({
  currentRingtone,
  volume = 0.8,
  onSelectRingtone,
  onUpdateVolume,
  onClose,
  title = 'Välj Ringsignal',
  subtitle = 'Välj vilken signal som ska spelas när det ringer',
}) => {
  const [selected, setSelected] = useState<RingtoneType>(currentRingtone);
  const [playingId, setPlayingId] = useState<RingtoneType | null>(null);
  const [localVolume, setLocalVolume] = useState<number>(volume);
  const stopFnRef = useRef<(() => void) | null>(null);

  // Stop any playing sound on unmount
  useEffect(() => {
    return () => {
      if (stopFnRef.current) {
        stopFnRef.current();
        stopFnRef.current = null;
      }
    };
  }, []);

  const handleTogglePreview = (opt: RingtoneOption) => {
    if (playingId === opt.id) {
      // Stop
      if (stopFnRef.current) {
        stopFnRef.current();
        stopFnRef.current = null;
      }
      setPlayingId(null);
    } else {
      // Stop previous
      if (stopFnRef.current) {
        stopFnRef.current();
      }
      setPlayingId(opt.id);
      const stop = sounds.playRingtone(opt.id, localVolume);
      stopFnRef.current = stop;

      // Auto stop preview after 4.5 seconds if user leaves it running
      setTimeout(() => {
        if (stopFnRef.current === stop) {
          stop();
          setPlayingId(null);
        }
      }, 4500);
    }
  };

  const handleSaveAndClose = (optId: RingtoneType) => {
    if (stopFnRef.current) {
      stopFnRef.current();
      stopFnRef.current = null;
    }
    setSelected(optId);
    onSelectRingtone(optId);
  };

  const handleVolumeChange = (newVol: number) => {
    setLocalVolume(newVol);
    if (onUpdateVolume) {
      onUpdateVolume(newVol);
    }
  };

  return (
    <div
      id="ringtone-picker-modal"
      className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 sm:p-6 animate-fadeIn"
    >
      <div className="bg-slate-900 border border-slate-800 text-white w-full max-w-xl rounded-3xl p-6 sm:p-7 shadow-2xl relative overflow-hidden flex flex-col max-h-[90vh]">
        {/* Soft background aura */}
        <div className="absolute -top-24 -right-24 w-60 h-60 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-60 h-60 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Modal Header */}
        <div className="flex items-start justify-between gap-3 mb-4 pb-3 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-600/30 text-indigo-400 border border-indigo-500/30 flex items-center justify-center">
              <Music className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-black text-white flex items-center gap-2">
                <span>{title}</span>
                <Sparkles className="w-4 h-4 text-amber-400" />
              </h2>
              <p className="text-xs text-slate-400 font-medium">{subtitle}</p>
            </div>
          </div>

          <button
            onClick={() => {
              if (stopFnRef.current) stopFnRef.current();
              onClose();
            }}
            className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Volume Level Control */}
        <div className="bg-slate-950/80 p-3.5 rounded-2xl border border-slate-800 flex items-center justify-between gap-4 mb-4">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-300">
            <Volume2 className="w-4 h-4 text-indigo-400" />
            <span>Volym:</span>
          </div>
          <div className="flex items-center gap-3 flex-1 max-w-xs">
            <input
              type="range"
              min={0.1}
              max={1}
              step={0.05}
              value={localVolume}
              onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
              className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
            />
            <span className="text-xs font-mono font-bold text-indigo-300 w-9 text-right">
              {Math.round(localVolume * 100)}%
            </span>
          </div>
        </div>

        {/* Ringtone Options Grid */}
        <div className="overflow-y-auto pr-1 space-y-2.5 flex-1 max-h-[50vh]">
          {RINGTONE_OPTIONS.map((opt) => {
            const isSelected = selected === opt.id;
            const isPlaying = playingId === opt.id;

            return (
              <div
                key={opt.id}
                id={`ringtone-card-${opt.id}`}
                className={`p-3.5 rounded-2xl border transition-all flex items-center justify-between gap-3 ${
                  isSelected
                    ? 'bg-indigo-950/50 border-indigo-500/80 shadow-md ring-1 ring-indigo-500/30'
                    : 'bg-slate-950/50 border-slate-800 hover:border-slate-700'
                }`}
              >
                {/* Left info & emoji */}
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className={`w-11 h-11 rounded-2xl bg-gradient-to-tr ${opt.color} flex items-center justify-center text-xl shadow-xs shrink-0`}
                  >
                    {opt.emoji}
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-black text-sm text-white truncate">
                        {opt.name}
                      </span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                        {opt.genre}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 truncate mt-0.5">
                      {opt.description}
                    </p>
                  </div>
                </div>

                {/* Right action buttons: Preview & Select */}
                <div className="flex items-center gap-2 shrink-0">
                  {/* Preview audio button */}
                  <button
                    id={`preview-ringtone-${opt.id}`}
                    type="button"
                    onClick={() => handleTogglePreview(opt)}
                    className={`px-3 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all ${
                      isPlaying
                        ? 'bg-amber-400 text-slate-950 shadow-sm animate-pulse'
                        : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
                    }`}
                    title={isPlaying ? 'Stoppa' : 'Provlyssna'}
                  >
                    {isPlaying ? (
                      <>
                        <Square className="w-3.5 h-3.5 fill-current" />
                        <span>Stopp</span>
                      </>
                    ) : (
                      <>
                        <Play className="w-3.5 h-3.5 fill-current" />
                        <span>Lyssna</span>
                      </>
                    )}
                  </button>

                  {/* Choose button */}
                  <button
                    id={`select-ringtone-${opt.id}`}
                    type="button"
                    onClick={() => handleSaveAndClose(opt.id)}
                    className={`px-3 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all ${
                      isSelected
                        ? 'bg-emerald-500 text-white shadow-sm'
                        : 'bg-indigo-600 hover:bg-indigo-500 text-white'
                    }`}
                  >
                    {isSelected ? (
                      <>
                        <Check className="w-3.5 h-3.5 stroke-[3]" />
                        <span>Vald</span>
                      </>
                    ) : (
                      <span>Välj</span>
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Modal Footer */}
        <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between">
          <span className="text-xs text-slate-400 font-medium">
            Vald signal:{' '}
            <strong className="text-indigo-300">
              {RINGTONE_OPTIONS.find((r) => r.id === selected)?.name}
            </strong>
          </span>

          <button
            onClick={() => {
              if (stopFnRef.current) stopFnRef.current();
              onClose();
            }}
            className="px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold transition-colors"
          >
            Klar
          </button>
        </div>
      </div>
    </div>
  );
};
