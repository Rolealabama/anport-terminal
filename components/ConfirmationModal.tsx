
import React from 'react';

interface ConfirmationModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  confirmLabel?: string;
  confirmColor?: string;
}

const ConfirmationModal: React.FC<ConfirmationModalProps> = ({ 
  isOpen, 
  title, 
  message, 
  onConfirm, 
  onCancel,
  confirmLabel = 'Confirmar Exclusão',
  confirmColor = 'bg-red-600'
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/95 backdrop-blur-sm flex items-center justify-center z-[100] p-4 animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
        <div className="p-6 text-center">
          <div className="w-16 h-16 bg-red-900/20 rounded-full flex items-center justify-center mx-auto mb-4 text-red-500">
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          
          <h2 className="text-lg font-black text-slate-100 uppercase tracking-tighter mb-2">{title}</h2>
          <p className="text-slate-400 text-sm leading-relaxed mb-6">
            {message}
          </p>

          <div className="flex flex-col gap-2">
            <button 
              onClick={onConfirm}
              className={`w-full py-4 ${confirmColor} text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg transition-transform active:scale-95`}
            >
              {confirmLabel}
            </button>
            <button 
              onClick={onCancel}
              className="w-full py-4 text-slate-500 font-black text-[10px] uppercase tracking-widest hover:text-slate-300 transition-colors"
            >
              Cancelar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConfirmationModal;
