import React, { useState } from 'react';
import { UIContext } from '../../context/UIContext';

export const ModalProvider = ({ children }) => {
  const [modal, setModal] = useState({ open: false, title: '', msg: '', onConfirm: () => {} });
  const showConfirm = (title, msg, onConfirm) => { setModal({ open: true, title, msg, onConfirm }); };
  const handleConfirm = () => { modal.onConfirm(); setModal({ ...modal, open: false }); };

  return (
    <UIContext.Provider value={showConfirm}>
      {children}
      {modal.open && (
        <div className="modal-overlay">
          <div className="modal-box">
            <h3 style={{marginTop:0, fontSize:'1.2rem', color:'var(--text-main)'}}>{modal.title}</h3>
            <p style={{color:'var(--text-muted)', lineHeight:1.5}}>{modal.msg}</p>
            <div style={{display:'flex', justifyContent:'flex-end', gap:12, marginTop:24}}>
              <button className="btn btn-secondary" onClick={() => setModal({ ...modal, open: false })}>Cancel</button>
              <button className="btn btn-danger" onClick={handleConfirm}>Confirm Action</button>
            </div>
          </div>
        </div>
      )}
    </UIContext.Provider>
  );
};