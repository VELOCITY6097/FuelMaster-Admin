import React, { useState } from 'react';
import { CheckCircle, AlertTriangle, Info } from 'lucide-react';
import { ToastContext } from '../../context/UIContext';

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);
  const showToast = (msg, type='info') => {
    const id = Date.now();
    setToasts(p => [...p, { id, msg, type }]);
    setTimeout(() => setToasts(p => p.filter(t => t.id !== id)), 3000);
  };
  return (
    <ToastContext.Provider value={showToast}>
      {children}
      <div style={{position:'fixed', bottom:30, right:30, zIndex:9999, display:'flex', flexDirection:'column', gap:10}}>
        {toasts.map(t => (
          <div key={t.id} style={{background:'var(--bg-card)', color:'var(--text-main)', padding:'14px 20px', borderRadius:10, display:'flex', alignItems:'center', gap:12, boxShadow:'0 10px 30px rgba(0,0,0,0.3)', animation:'slideUp 0.3s', minWidth:300, border:'1px solid var(--border)'}}>
            {t.type === 'success' ? <CheckCircle size={20} color="#10b981"/> : t.type === 'error' ? <AlertTriangle size={20} color="#ef4444"/> : <Info size={20} color="#3b82f6"/>}
            <span style={{fontWeight:500}}>{t.msg}</span>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};