import React, { useRef, useEffect, useState } from 'react';
import { Eraser, RotateCcw, Palette, Sparkles, X } from 'lucide-react';
import confetti from 'canvas-confetti';

interface DrawingBoardProps {
  onClose: () => void;
  peerName?: string;
  contactName?: string;
  onSendDrawing?: (dataUrl: string) => void;
}

const COLORS = [
  { name: 'Neonblå', hex: '#3B82F6' },
  { name: 'Neonlila', hex: '#8B5CF6' },
  { name: 'Neonrosa', hex: '#EC4899' },
  { name: 'Neongrön', hex: '#10B981' },
  { name: 'Gul', hex: '#EAB308' },
  { name: 'Orange', hex: '#F97316' },
  { name: 'Röd', hex: '#EF4444' },
  { name: 'Svart', hex: '#1F2937' },
];

const STAMPS = ['🔥', '💀', '👑', '🎮', '⚡', '🚀', '🍕', '⭐'];

export const DrawingBoard: React.FC<DrawingBoardProps> = ({ onClose, peerName, contactName }) => {
  const displayName = peerName || contactName || 'Kompisen';
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [selectedColor, setSelectedColor] = useState('#3B82F6');
  const [lineWidth, setLineWidth] = useState(6);
  const [isEraser, setIsEraser] = useState(false);
  const [selectedStamp, setSelectedStamp] = useState<string | null>(null);
  const isDrawingRef = useRef(false);
  const lastPos = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Fill white background initially
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }, []);

  const getCoordinates = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    let clientX = 0;
    let clientY = 0;

    if ('touches' in e) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY,
    };
  };

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const pos = getCoordinates(e);
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    if (selectedStamp) {
      ctx.font = '48px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(selectedStamp, pos.x, pos.y);
      return;
    }

    isDrawingRef.current = true;
    lastPos.current = pos;
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current || selectedStamp) return;
    const pos = getCoordinates(e);
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.beginPath();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.lineWidth = lineWidth;
    ctx.strokeStyle = isEraser ? '#FFFFFF' : selectedColor;

    if (lastPos.current) {
      ctx.moveTo(lastPos.current.x, lastPos.current.y);
      ctx.lineTo(pos.x, pos.y);
      ctx.stroke();
    }

    lastPos.current = pos;
  };

  const stopDrawing = () => {
    isDrawingRef.current = false;
    lastPos.current = null;
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  };

  const triggerSparkles = () => {
    confetti({
      particleCount: 50,
      spread: 70,
      origin: { y: 0.6 },
    });
  };

  return (
    <div
      id="drawing-board-overlay"
      className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 animate-fadeIn"
    >
      <div
        id="drawing-board-card"
        className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden border border-slate-200 flex flex-col max-h-[92vh]"
      >
        {/* Header */}
        <div className="bg-slate-900 px-5 py-4 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center text-white">
              <Palette className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black tracking-tight">Rita tillsammans 🎨</h2>
              <p className="text-xs text-slate-400 font-medium">Delad ritbräda med {displayName}</p>
            </div>
          </div>
          <button
            id="close-drawing-btn"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center transition-colors font-bold"
            title="Stäng ritbräda"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Canvas Area */}
        <div className="p-3 sm:p-4 bg-slate-100 flex-1 flex justify-center items-center overflow-hidden">
          <div className="relative border border-slate-300 rounded-2xl overflow-hidden bg-white shadow-xs touch-none">
            <canvas
              id="kid-doodle-canvas"
              ref={canvasRef}
              width={540}
              height={360}
              className="w-full max-w-[540px] aspect-[3/2] cursor-crosshair block"
              onMouseDown={startDrawing}
              onMouseMove={draw}
              onMouseUp={stopDrawing}
              onMouseLeave={stopDrawing}
              onTouchStart={startDrawing}
              onTouchMove={draw}
              onTouchEnd={stopDrawing}
            />
          </div>
        </div>

        {/* Toolbar Controls */}
        <div className="p-3 sm:p-4 bg-white border-t border-slate-100 flex flex-col gap-3">
          {/* Colors and Eraser */}
          <div className="flex items-center justify-between gap-2 overflow-x-auto pb-1">
            <div className="flex items-center gap-1.5 sm:gap-2">
              {COLORS.map((c) => (
                <button
                  key={c.hex}
                  id={`color-btn-${c.name.toLowerCase()}`}
                  onClick={() => {
                    setSelectedColor(c.hex);
                    setIsEraser(false);
                    setSelectedStamp(null);
                  }}
                  style={{ backgroundColor: c.hex }}
                  className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full border transition-transform ${
                    !isEraser && !selectedStamp && selectedColor === c.hex
                      ? 'scale-125 border-slate-900 shadow-md ring-2 ring-indigo-500'
                      : 'border-white hover:scale-110 shadow-xs'
                  }`}
                  title={c.name}
                />
              ))}
            </div>

            <div className="flex items-center gap-1.5">
              <button
                id="tool-eraser-btn"
                onClick={() => {
                  setIsEraser(true);
                  setSelectedStamp(null);
                }}
                className={`px-3 py-1.5 rounded-xl flex items-center gap-1.5 text-xs font-bold transition-all ${
                  isEraser ? 'bg-indigo-600 text-white shadow-xs' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                <Eraser className="w-3.5 h-3.5" />
                <span>Sudd</span>
              </button>

              <button
                id="clear-canvas-btn"
                onClick={clearCanvas}
                className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center gap-1.5 text-xs font-bold transition-all"
                title="Rensa allt"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Rensa</span>
              </button>

              <button
                id="sparkle-fun-btn"
                onClick={triggerSparkles}
                className="px-3 py-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-800 flex items-center gap-1.5 text-xs font-bold transition-all border border-amber-200"
                title="Skicka glitter!"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                <span>Glitter!</span>
              </button>
            </div>
          </div>

          {/* Stamps & Brush Size */}
          <div className="flex items-center justify-between gap-2 border-t border-slate-100 pt-2 text-xs">
            {/* Stamps */}
            <div className="flex items-center gap-1 overflow-x-auto">
              <span className="text-slate-400 font-bold hidden sm:inline mr-1">Märken:</span>
              {STAMPS.map((stamp) => (
                <button
                  key={stamp}
                  id={`stamp-btn-${stamp}`}
                  onClick={() => {
                    setSelectedStamp(stamp);
                    setIsEraser(false);
                  }}
                  className={`w-7 h-7 rounded-lg text-base flex items-center justify-center transition-transform ${
                    selectedStamp === stamp ? 'bg-indigo-100 scale-115 ring-2 ring-indigo-500' : 'bg-slate-50 hover:bg-slate-100'
                  }`}
                >
                  {stamp}
                </button>
              ))}
            </div>

            {/* Brush width */}
            <div className="flex items-center gap-1.5">
              <span className="text-slate-400 font-bold text-xs hidden sm:inline">Pensel:</span>
              {[3, 6, 12, 20].map((size) => (
                <button
                  key={size}
                  id={`brush-size-${size}`}
                  onClick={() => setLineWidth(size)}
                  className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs ${
                    lineWidth === size ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  <span
                    style={{ width: Math.max(3, size * 0.6), height: Math.max(3, size * 0.6) }}
                    className="bg-current rounded-full block"
                  />
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
