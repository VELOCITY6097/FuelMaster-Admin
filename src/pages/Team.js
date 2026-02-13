import React, { useState, useContext, useEffect } from 'react';
import { Edit2, Trash2, Shield, ShieldAlert, UserPlus, AlertTriangle } from 'lucide-react';
import { DataContext } from '../context/DataContext';
import { ToastContext, UIContext } from '../context/UIContext';
import { AuthContext } from '../context/AuthContext';
import { supabase } from '../supabase';
import { sendLog } from '../logs';
import { BOSS_PHONE } from '../config';

export const Team = () => {
   const { admins, settings, refresh } = useContext(DataContext);
   
   // --- STATE ---
   // Added 'discord' and updated defaults
   const [modal, setModal] = useState({ open: false, data: null });
   const [form, setForm] = useState({ id: null, name: '', phone: '', pin: '', role: 'Staff', discord: '' });
   
   // Delete Modal State
   const [deleteModal, setDeleteModal] = useState({ open: false, admin: null, reason: '' });

   const toast = useContext(ToastContext);
   const { user } = useContext(AuthContext);

   // --- OPEN ADD/EDIT MODAL ---
   const openModal = (data = null) => {
      setForm(data 
        ? { ...data } // Load existing data
        : { id: null, name: '', phone: '', pin: '', role: 'Staff', discord: '' } // Default new
      );
      setModal({ open: true, data });
   };

   // --- SAVE MEMBER (Insert or Update) ---
   const saveMember = async () => {
      // 1. Permissions Check
      if(user.role !== 'Owner') return toast("Access Denied", "error");

      // 2. Validation
      if(!form.name || !form.phone || !form.pin) return toast("Fill all required fields", "error");
      if(form.pin.length < 4) return toast("Password must be at least 4 characters", "error");

      const isNew = !form.id;
      let error = null;
      let logEvent = '';
      let logData = {};

      if (isNew) {
         // --- CREATE NEW MEMBER ---
         const { error: insertErr } = await supabase.from('admins').insert([{
             name: form.name,
             phone: form.phone,
             pin: form.pin,
             role: form.role,
             discord: form.discord
         }]);
         error = insertErr;
         
         logEvent = 'TEAM_ADD';
         logData = { 
             name: form.name, 
             role: form.role, 
             targetDiscord: form.discord, 
             user: user.name, 
             discordId: user.discord 
         };

      } else {
         // --- UPDATE EXISTING MEMBER ---
         // 1. Detect Changes for Logs
         const oldData = admins.find(a => a.id === form.id) || {};
         let changes = [];

         if (oldData.name !== form.name) changes.push(`- Name: ${oldData.name} ➝ ${form.name}`);
         
         // Role Change Logic
         if (oldData.role !== form.role) {
             if (oldData.role === 'Staff' && form.role === 'Moderator') changes.push(`+ ⬆️ PROMOTED to Moderator`);
             else if (oldData.role === 'Moderator' && form.role === 'Staff') changes.push(`- ⬇️ DEMOTED to Staff`);
             else changes.push(`~ Role: ${oldData.role} ➝ ${form.role}`);
         }
         
         if (oldData.phone !== form.phone) changes.push(`- Login ID updated`);
         if (oldData.pin !== form.pin) changes.push(`- Password/PIN updated`);
         if ((oldData.discord||'') !== form.discord) changes.push(`- Discord ID updated`);

         // 2. Perform Update
         const { error: updateErr } = await supabase.from('admins').update({
             name: form.name,
             phone: form.phone,
             pin: form.pin,
             role: form.role,
             discord: form.discord
         }).eq('id', form.id); // <--- CRITICAL: Target row by ID
         
         error = updateErr;

         logEvent = 'TEAM_UPDATED';
         logData = {
             name: form.name,
             changes: changes.length > 0 ? changes.join('\n') : "Profile details updated (No visible changes detected)",
             user: user.name,
             discordId: user.discord
         };
      }

      // 3. Handle Result
      if(error) {
         console.error("Database Error:", error);
         toast("Save Failed: " + error.message, "error"); 
      } else { 
         toast(isNew ? "Member Added" : "Profile Updated", "success"); 
         setModal({open:false, data:null});
         
         // Only log if successful
         sendLog(settings.webhook_url, logEvent, logData);
         
         refresh();
      }
   };

   // --- DELETE FLOW ---
   const initiateRemove = (admin) => {
      if(user.role !== 'Owner') return toast("Access Denied", "error");
      if(admin.phone === BOSS_PHONE) return toast("Cannot remove the Owner.", "error");
      
      setDeleteModal({ open: true, admin, reason: '' });
   };

   const confirmRemove = async () => {
       const { admin, reason } = deleteModal;
       if (!reason.trim()) return toast("Please provide a reason for removal.", "error");

       const { error } = await supabase.from('admins').delete().eq('id', admin.id); 
         
       if (error) {
           toast(error.message, "error");
       } else {
           toast("Removed Successfully", "success");
           
           sendLog(settings.webhook_url, 'TEAM_REMOVE', { 
               name: admin.name,
               targetDiscord: admin.discord,
               reason: reason,
               user: user.name,
               discordId: user.discord
           });
           
           refresh();
           setDeleteModal({ open: false, admin: null, reason: '' });
       }
   };

   return (
      <div>
         {/* HEADER */}
         <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20}}>
            <h2 style={{margin:0, display:'flex', alignItems:'center', gap:10}}>
                <Shield size={24} color="var(--primary)"/> Security Team
            </h2>
            {user.role === 'Owner' && (
                <button className="btn btn-primary" onClick={()=>openModal(null)}>
                    <UserPlus size={18} style={{marginRight:8}}/> Add Member
                </button>
            )}
         </div>

         {/* TABLE */}
         <div className="card" style={{padding:0, overflow:'hidden'}}>
            <table style={{width:'100%', borderCollapse:'collapse'}}>
               <thead style={{background:'var(--bg-body)', borderBottom:'1px solid var(--border)'}}>
                  <tr>
                      <th style={{padding:16, textAlign:'left', color:'var(--text-muted)'}}>Name</th>
                      <th style={{padding:16, textAlign:'left', color:'var(--text-muted)'}}>Login ID</th>
                      <th style={{padding:16, textAlign:'left', color:'var(--text-muted)'}}>Role</th>
                      <th style={{padding:16, textAlign:'left', color:'var(--text-muted)'}}>Discord ID</th>
                      <th style={{width:100}}></th>
                  </tr>
               </thead>
               <tbody>
                  {admins.map(a => (
                     <tr key={a.id} style={{borderBottom:'1px solid var(--border)'}}>
                        <td style={{padding:16, fontWeight:500}}>{a.name}</td>
                        <td style={{padding:16, fontFamily:'monospace'}}>{a.phone}</td>
                        <td style={{padding:16}}>
                            <span style={{
                                background: a.role==='Owner' ? '#fef3c7' : (a.role==='Moderator' ? '#e0e7ff' : '#f1f5f9'), 
                                color: a.role==='Owner' ? '#d97706' : (a.role==='Moderator' ? '#4f46e5' : '#64748b'), 
                                padding:'4px 10px', borderRadius:20, fontSize:'0.75rem', fontWeight:700,
                                border: `1px solid ${a.role==='Owner' ? '#fcd34d' : (a.role==='Moderator' ? '#c7d2fe' : '#cbd5e1')}`
                            }}>
                                {a.role.toUpperCase()}
                            </span>
                        </td>
                        <td style={{padding:16, fontSize:'0.85rem', color:'var(--text-muted)'}}>
                            {a.discord || '-'}
                        </td>
                        <td style={{padding:16, display:'flex', gap:10, justifyContent:'flex-end'}}>
                           {user.role === 'Owner' && (
                              <>
                                 <button className="btn-secondary" style={{padding:8, borderRadius:6}} onClick={()=>openModal(a)}><Edit2 size={16}/></button>
                                 {a.phone !== BOSS_PHONE && ( 
                                    <button className="btn-danger" style={{padding:8, borderRadius:6}} onClick={()=>initiateRemove(a)}><Trash2 size={16}/></button>
                                 )}
                              </>
                           )}
                        </td>
                     </tr>
                  ))}
               </tbody>
            </table>
         </div>

         {/* ADD/EDIT MODAL */}
         {modal.open && (
            <div className="modal-overlay">
               <div className="modal-box">
                  <h3>{modal.data ? 'Edit' : 'Add'} Team Member</h3>
                  <div style={{marginTop:20, display:'flex', flexDirection:'column', gap:15}}>
                     <div>
                        <label>Full Name</label>
                        <input className="app-input" value={form.name} onChange={e=>setForm({...form,name:e.target.value})} placeholder="Name" style={{marginBottom:0}}/>
                     </div>
                     <div>
                        <label>Login ID (Phone/Username)</label>
                        <input className="app-input" value={form.phone} onChange={e=>setForm({...form,phone:e.target.value})} placeholder="e.g. User ID" disabled={form.phone===BOSS_PHONE} style={{marginBottom:0}}/> 
                     </div>
                     <div>
                         <label>Secure Password / PIN</label>
                         <input 
                            className="app-input" 
                            value={form.pin} 
                            onChange={e=>setForm({...form,pin:e.target.value})} 
                            placeholder="Alphanumeric (Min 4 chars)" 
                            maxLength={16}
                            style={{marginBottom:0}}
                         />
                         <div style={{fontSize:'0.7rem', color:'var(--text-muted)', marginTop:4}}>Max 16 characters</div>
                     </div>
                     <div>
                         <label>Discord ID (Optional)</label>
                         <input className="app-input" value={form.discord} onChange={e=>setForm({...form,discord:e.target.value})} placeholder="For log tagging (e.g. 12345...)" style={{marginBottom:0}}/>
                     </div>
                     <div>
                         <label>Access Role</label>
                         <select className="app-input" value={form.role} onChange={e=>setForm({...form,role:e.target.value})} disabled={form.phone===BOSS_PHONE} style={{marginBottom:0}}>
                            <option value="Staff">Staff (Stations Only)</option>
                            <option value="Moderator">Moderator (Full Access)</option>
                         </select>
                     </div>
                  </div>
                  <div style={{display:'flex', justifyContent:'flex-end', gap:10, marginTop:25}}>
                     <button className="btn btn-secondary" onClick={()=>setModal({open:false, data:null})}>Cancel</button>
                     <button className="btn btn-primary" onClick={saveMember}>Save User</button>
                  </div>
               </div>
            </div>
         )}

         {/* DELETE CONFIRM MODAL */}
         {deleteModal.open && (
            <div className="modal-overlay" style={{zIndex:9999}}>
               <div className="modal-box" style={{maxWidth:400}}>
                  <div style={{display:'flex', alignItems:'center', gap:10, color:'#ef4444', marginBottom:10}}>
                      <AlertTriangle size={24}/>
                      <h3 style={{margin:0}}>Revoke Access?</h3>
                  </div>
                  <p style={{color:'var(--text-muted)', fontSize:'0.9rem', lineHeight:1.5}}>
                      Are you sure you want to remove <strong>{deleteModal.admin?.name}</strong>? This action cannot be undone.
                  </p>
                  
                  <label style={{marginTop:15, display:'block', fontSize:'0.8rem', fontWeight:600}}>Reason for Removal (Required)</label>
                  <input 
                      className="app-input" 
                      placeholder="e.g. Resigned, Policy Violation..." 
                      value={deleteModal.reason}
                      onChange={e=>setDeleteModal({...deleteModal, reason:e.target.value})}
                      autoFocus
                  />

                  <div style={{display:'flex', justifyContent:'flex-end', gap:10, marginTop:20}}>
                     <button className="btn btn-secondary" onClick={()=>setDeleteModal({open:false, admin:null, reason:''})}>Cancel</button>
                     <button className="btn btn-danger" onClick={confirmRemove}>Confirm Removal</button>
                  </div>
               </div>
            </div>
         )}

      </div>
   );
};