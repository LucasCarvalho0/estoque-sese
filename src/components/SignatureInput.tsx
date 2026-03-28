import { useRef, useEffect, useState, useCallback } from 'react';
import { PenLine, Trash2, Check } from 'lucide-react';

interface Props {
  label?: string;
  value: string;
  onChange: (val: string) => void;
  required?: boolean;
}

export function SignatureInput({ label = 'Assinatura Digital', value, onChange, required }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const lastPos = useRef<{ x: number; y: number } | null>(null);
  const [hasSig, setHasSig] = useState(!!value);

  // Draw existing signature image back if provided
  useEffect(() => {
    if (value && canvasRef.current) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      const img = new Image();
      img.onload = () => ctx.drawImage(img, 0, 0);
      img.src = value;
    }
  }, []);

  function getPos(e: React.MouseEvent | React.TouchEvent) {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    if ('touches' in e) {
      const t = e.touches[0];
      return { x: (t.clientX - rect.left) * scaleX, y: (t.clientY - rect.top) * scaleY };
    }
    return { x: (e.clientX - rect.left) * scaleX, y: (e.clientY - rect.top) * scaleY };
  }

  function startDraw(e: React.MouseEvent | React.TouchEvent) {
    e.preventDefault();
    drawing.current = true;
    lastPos.current = getPos(e);
    const ctx = canvasRef.current?.getContext('2d');
    if (ctx) {
      ctx.beginPath();
      ctx.moveTo(lastPos.current.x, lastPos.current.y);
    }
  }

  function draw(e: React.MouseEvent | React.TouchEvent) {
    e.preventDefault();
    if (!drawing.current || !canvasRef.current) return;
    const ctx = canvasRef.current.getContext('2d');
    if (!ctx) return;
    const pos = getPos(e);
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
    lastPos.current = pos;
  }

  const stopDraw = useCallback(() => {
    if (!drawing.current) return;
    drawing.current = false;
    lastPos.current = null;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dataUrl = canvas.toDataURL('image/png');
    setHasSig(true);
    onChange(dataUrl);
  }, [onChange]);

  function clear() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx?.clearRect(0, 0, canvas.width, canvas.height);
    setHasSig(false);
    onChange('');
  }

  return (
    <div>
      {label && (
        <label className="label">
          <PenLine size={13} className="inline mr-1 text-gold-400" />
          {label}
          {required && <span className="text-red-400 ml-0.5">*</span>}
        </label>
      )}

      <div className="relative border-2 border-dashed border-dark-600 rounded-xl overflow-hidden bg-dark-900 touch-none"
           style={{ cursor: 'crosshair' }}>
        <canvas
          ref={canvasRef}
          width={600}
          height={160}
          className="w-full h-40"
          onMouseDown={startDraw}
          onMouseMove={draw}
          onMouseUp={stopDraw}
          onMouseLeave={stopDraw}
          onTouchStart={startDraw}
          onTouchMove={draw}
          onTouchEnd={stopDraw}
        />
        {!hasSig && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <p className="text-slate-600 text-sm italic select-none">
              ✍️ Assine aqui com o dedo ou mouse
            </p>
          </div>
        )}
        {/* Guide line */}
        <div className="absolute bottom-8 left-8 right-8 border-b border-dark-600/60 pointer-events-none" />
      </div>

      <div className="flex items-center justify-between mt-2">
        <div className="flex items-center gap-1.5">
          {hasSig && (
            <span className="flex items-center gap-1 text-xs text-emerald-400">
              <Check size={12} /> Assinatura registrada
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={clear}
          className="flex items-center gap-1 text-xs text-slate-500 hover:text-red-400 transition-colors py-1 px-2"
        >
          <Trash2 size={12} /> Limpar
        </button>
      </div>
    </div>
  );
}
