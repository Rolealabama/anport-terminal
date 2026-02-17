import React, { useEffect, useRef } from 'react';
import { AppNotification } from '../types.ts';

interface NotificationCenterProps {
  notifications: AppNotification[];
  onClose: () => void;
  onMarkRead: () => void;
  onClear: () => void;
}

const NotificationCenter: React.FC<NotificationCenterProps> = ({ notifications, onClose, onMarkRead, onClear }) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  useEffect(() => {
    const timer = setTimeout(() => {
      onMarkRead();
    }, 1500);
    return () => clearTimeout(timer);
  }, [onMarkRead]);

  const getTimeAgo = (timestamp: number) => {
    const diff = Date.now() - timestamp;
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Agora';
    if (mins < 60) return `${mins}m atrás`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h atrás`;
    return new Date(timestamp).toLocaleDateString();
  };

  const getIcon = (type: AppNotification['type']) => {
    switch (type) {
      case 'task':
        return (
          <div className="bg-blue-900/40 p-2 rounded-lg text-blue-400">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          </div>
        );
      case 'schedule':
        return (
          <div className="bg-amber-900/40 p-2 rounded-lg text-amber-400">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        );
      case 'demand':
        return (
          <div className="bg-purple-900/40 p-2 rounded-lg text-purple-400">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </div>
        );
    }
  };

  return (
    <div 
      ref={containerRef}
      className="absolute right-0 mt-3 w-80 bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200"
    >
      <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between">
        <h3 className="text-sm font-black text-slate-100 uppercase tracking-widest">Notificações</h3>
        <button 
          onClick={onClear}
          className="text-[10px] font-black text-slate-500 hover:text-red-400 uppercase transition-colors"
        >
          Limpar
        </button>
      </div>

      <div className="max-h-96 overflow-y-auto custom-scrollbar">
        {notifications.length === 0 ? (
          <div className="py-12 flex flex-col items-center justify-center text-slate-600 px-6 text-center">
            <svg className="w-12 h-12 mb-3 opacity-20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
            </svg>
            <p className="text-xs font-medium italic">Tudo em dia! Nenhuma notificação por aqui.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-800/50">
            {notifications.map((notif) => (
              <div 
                key={notif.id} 
                className={`p-4 flex gap-4 transition-colors hover:bg-slate-800/30 ${!notif.read ? 'bg-blue-900/5' : ''}`}
              >
                {getIcon(notif.type)}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <h4 className={`text-xs font-bold truncate ${!notif.read ? 'text-slate-100' : 'text-slate-400'}`}>
                      {notif.title}
                    </h4>
                    <span className="text-[9px] text-slate-500 whitespace-nowrap">{getTimeAgo(notif.createdAt)}</span>
                  </div>
                  <p className="text-[11px] text-slate-500 leading-relaxed line-clamp-2">
                    {notif.message}
                  </p>
                </div>
                {!notif.read && (
                  <div className="w-2 h-2 rounded-full bg-blue-500 mt-1.5 flex-shrink-0"></div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
      
      {notifications.length > 0 && (
        <div className="px-5 py-3 bg-slate-800/20 border-t border-slate-800 text-center">
          <p className="text-[9px] font-bold text-slate-600 uppercase tracking-tighter">Fim das notificações recentes</p>
        </div>
      )}
    </div>
  );
};

export default NotificationCenter;