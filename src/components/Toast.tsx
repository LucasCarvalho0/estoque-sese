import { CheckCircle, XCircle, AlertTriangle, Info, X } from 'lucide-react';
import { useApp } from '../context/AppContext';

const icons = {
  success: <CheckCircle size={18} className="text-emerald-400" />,
  error: <XCircle size={18} className="text-red-400" />,
  warning: <AlertTriangle size={18} className="text-amber-400" />,
  info: <Info size={18} className="text-blue-400" />,
};

const colors = {
  success: 'border-emerald-700 bg-emerald-950/80',
  error: 'border-red-700 bg-red-950/80',
  warning: 'border-amber-700 bg-amber-950/80',
  info: 'border-blue-700 bg-blue-950/80',
};

export function ToastContainer() {
  const { toasts } = useApp();
  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none">
      {toasts.map(t => (
        <div
          key={t.id}
          className={`flex items-center gap-3 p-3.5 rounded-xl border backdrop-blur-sm shadow-xl pointer-events-auto animate-slide-in ${colors[t.type]}`}
        >
          {icons[t.type]}
          <p className="text-sm text-slate-100 flex-1">{t.message}</p>
        </div>
      ))}
    </div>
  );
}
