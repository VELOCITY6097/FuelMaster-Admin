import React, { useState, useEffect, useContext } from 'react';
import { Megaphone, Lock, X } from 'lucide-react';
import { DataContext } from '../context/DataContext';
import { ToastContext, UIContext } from '../context/UIContext';
import { AuthContext } from '../context/AuthContext';
import { supabase } from '../supabase';
import { sendLog } from '../logs';

export const SettingsPage = () => {
   const { settings, charts, refresh } = useContext(DataContext);
   const [tab, setTab] = useState('comm');
   const [webhook, setWebhook] = useState(settings.webhook_url || '');
   const [inputs, setInputs] = useState({ density: '', chart: '' });
   const [broadcast, setBroadcast] = useState(settings.broadcast_msg || '');
   const [bType, setBType] = useState(settings.broadcast_type || 'info');

   const toast = useContext(ToastContext);
   const showConfirm = useContext(UIContext);
   const { user } = useContext(AuthContext);

   useEffect(() => { 
       setWebhook(settings.webhook_url || ''); 
       setBroadcast(settings.broadcast_msg || '');
       setBType(settings.broadcast_type || 'info');
   }, [settings]);

   const isOwner = user.role === 'Owner';
   const isModerator = user.role === 'Moderator';
   const isStaff = user.role === 'Staff';

   const saveWebhook = async () => {
      if(!isOwner) return toast("Only Owners can change the Webhook.", "error");
      await supabase.from('system_settings').upsert({id:1, webhook_url: webhook});
      toast("Webhook Updated", "success");
      sendLog(webhook, 'SETTINGS_UPDATE', { user: user.name, discordId: user.discord, changes: 'Webhook URL updated' });
   };

   const saveBroadcast = async (clear) => {
      const msg = clear ? '' : broadcast;
      const { error } = await supabase.from('system_settings').upsert({ id: 1, broadcast_msg: msg, broadcast_type: bType });
      if (error) toast(error.message, "error");
      else {
        toast(clear ? "Broadcast Cleared" : "Broadcast Sent", "success");
        sendLog(settings.webhook_url, clear ? 'BROADCAST_CLEARED' : 'BROADCAST_SENT', { user: user.name, discordId: user.discord, msg, type: bType });
      }
   };

   const toggleDowntime = () => {
     showConfirm(
       settings.downtime_active ? "Go Online?" : "Activate Maintenance Mode?", 
       "This will immediately lock/unlock all client applications.",
       async () => {
         const newState = !settings.downtime_active;
         await supabase.from('system_settings').upsert({ id: 1, downtime_active: newState });
         toast("System Status Updated", "success");
         sendLog(settings.webhook_url, 'MAINTENANCE_TOGGLE', { user: user.name, discordId: user.discord, status: newState ? "OFFLINE" : "ONLINE" });
       }
     );
   };

   const upload = async (type, text, key) => {
      if(!isOwner) return toast("Only Owners can manage Database Assets.", "error");

      try {
         let d, action;
         if(type==='density') {
            d = new Function('return '+text.replace(/const\s+densityTable\s*=\s*/,'').replace(/;\s*$/,''))();
            action = "Density Table Update";
         } else {
            const m = text.match(/(?:export\s+const\s+|const\s+)?([a-zA-Z0-9_]+)\s*=\s*(\{[\s\S]*?\})(?:;|$)/);
            if(!m) throw new Error("Invalid Format");
            d = {...charts, [m[1]]: new Function('return '+m[2])()};
            action = `Chart Update: ${m[1]}`;
         }
         await supabase.from('system_assets').upsert({key, data:d});
         toast("Uploaded Successfully", "success"); refresh();
         sendLog(settings.webhook_url, 'ASSET_UPLOAD', { key, action, user: user.name, discordId: user.discord });
      } catch(e) { toast("Error: "+e.message, "error"); }
   };

   if (isStaff) {
       return (
           <div className="card" style={{textAlign:'center', padding:40}}>
               <div style={{marginBottom:15, background:'var(--bg-body)', display:'inline-flex', padding:20, borderRadius:'50%'}}>
                   <Lock size={40} color="var(--text-muted)"/>
               </div>
               <h3>Restricted Access</h3>
               <p style={{color:'var(--text-muted)'}}>Your role (Staff) is limited to Station Management only.<br/>Please contact an Administrator to change system settings.</p>
           </div>
       );
   }

   const getBtnStyle = (type) => {
       const isActive = bType === type;
       let style = { flex:1, textAlign:'center', padding:8, borderRadius:6, cursor:'pointer', fontWeight:600, textTransform:'uppercase', fontSize:'0.75rem', border:'1px solid var(--border)', transition:'0.2s' };
       if (isActive) {
           style.border = '2px solid transparent';
           if(type === 'info') { style.background = '#dbeafe'; style.color = '#1e40af'; style.borderColor = '#93c5fd'; }
           if(type === 'warning') { style.background = '#ffedd5'; style.color = '#9a3412'; style.borderColor = '#fdba74'; }
           if(type === 'critical') { style.background = '#fee2e2'; style.color = '#991b1b'; style.borderColor = '#fca5a5'; }
       } else {
           style.background = 'transparent';
           style.color = 'var(--text-muted)';
       }
       return style;
   };

   return (
      <div>
         <div style={{display:'flex', gap:10, marginBottom:20}}>
            <button className={`btn ${tab==='comm'?'btn-primary':'btn-secondary'}`} onClick={()=>setTab('comm')}>Communication</button>
            <button className={`btn ${tab==='system'?'btn-primary':'btn-secondary'}`} onClick={()=>setTab('system')}>System Control</button>
            <button className={`btn ${tab==='assets'?'btn-primary':'btn-secondary'}`} onClick={()=>setTab('assets')}>Database Assets</button>
         </div>

         {tab === 'comm' && (
            <div style={{display:'grid', gap:24}}>
                <div className="card">
                    <h3 style={{display:'flex', alignItems:'center', gap:10}}><Megaphone size={20}/> Global Broadcast</h3>
                    <p style={{color:'var(--text-muted)', fontSize:'0.9rem'}}>Send a push notification to all active client screens.</p>
                    <textarea className="app-input" value={broadcast} onChange={e=>setBroadcast(e.target.value)} placeholder="Type a message..." style={{height:100}}/>
                    
                    <div style={{display:'flex', gap:10, marginBottom:15}}>
                        <div onClick={()=>setBType('info')} style={getBtnStyle('info')}>Info</div>
                        <div onClick={()=>setBType('warning')} style={getBtnStyle('warning')}>Warning</div>
                        <div onClick={()=>setBType('critical')} style={getBtnStyle('critical')}>Critical</div>
                    </div>
                    <div style={{display:'flex', gap:10}}>
                        <button className="btn btn-primary" style={{flex:1}} onClick={()=>saveBroadcast(false)}>Push Message</button>
                        <button className="btn btn-secondary" onClick={()=>saveBroadcast(true)}>Clear</button>
                    </div>
                </div>

                <div className="card">
                    <div style={{opacity: isModerator ? 0.5 : 1, pointerEvents: isModerator ? 'none' : 'auto'}}>
                        <h3>Discord Integration {isModerator && <span style={{fontSize:'0.7rem', color:'var(--danger)'}}>(Owner Only)</span>}</h3>
                        <div style={{display:'flex', gap:10}}>
                            <input className="app-input" value={webhook} onChange={e=>setWebhook(e.target.value)} placeholder="https://discord.com/api/webhooks/..." style={{marginBottom:0}} disabled={isModerator}/>
                            <button className="btn btn-primary" onClick={saveWebhook} disabled={isModerator}>Save URL</button>
                        </div>
                    </div>
                </div>
            </div>
         )}

         {tab === 'system' && (
             <div className="card" style={{border:settings.downtime_active?'2px solid #ef4444':'1px solid var(--border)'}}>
                 <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                    <div>
                        <h3 style={{display:'flex', alignItems:'center', gap:10, margin:0}}><Lock size={20}/> Maintenance Mode</h3>
                        <p style={{marginBottom:0, color:'var(--text-muted)'}}>Prevent stations from logging in or syncing data.</p>
                    </div>
                    <div style={{textAlign:'right'}}>
                        <div style={{fontSize:'0.8rem', fontWeight:700, textTransform:'uppercase', color:'var(--text-muted)'}}>Current Status</div>
                        <div style={{fontSize:'1.2rem', fontWeight:700, color:settings.downtime_active?'#ef4444':'#10b981'}}>{settings.downtime_active?'LOCKED':'LIVE'}</div>
                    </div>
                 </div>
                 <div style={{marginTop:20, paddingTop:20, borderTop:'1px solid var(--border)'}}>
                    <button className={`btn ${settings.downtime_active?'btn-primary':'btn-danger'}`} style={{width:'100%'}} onClick={toggleDowntime}>
                        {settings.downtime_active ? 'Unlock System (Go Online)' : 'Lock System (Maintenance Mode)'}
                    </button>
                 </div>
             </div>
         )}

         {tab === 'assets' && (
             isModerator ? (
                <div className="card" style={{textAlign:'center', padding:40}}>
                   <div style={{marginBottom:15, background:'var(--bg-body)', display:'inline-flex', padding:20, borderRadius:'50%'}}>
                       <Lock size={40} color="var(--text-muted)"/>
                   </div>
                   <h3>Protected Assets</h3>
                   <p style={{color:'var(--text-muted)'}}>Moderators cannot modify core database assets (Density/Charts).<br/>Contact the Owner for changes.</p>
                </div>
             ) : (
                <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:24}}>
                   <div className="card">
                      <h3>Density Table</h3>
                      <textarea className="app-input" value={inputs.density} onChange={e=>setInputs({...inputs,density:e.target.value})} style={{height:150, fontFamily:'monospace'}} placeholder="Paste densityTable..."/>
                      <button className="btn btn-primary" onClick={()=>upload('density',inputs.density,'density_table')}>Upload Density</button>
                   </div>
                   <div className="card">
                      <h3>Tank Charts</h3>
                      <textarea className="app-input" value={inputs.chart} onChange={e=>setInputs({...inputs,chart:e.target.value})} style={{height:150, fontFamily:'monospace'}} placeholder="export const MS_20KL = {...}"/>
                      <button className="btn btn-primary" style={{width:'100%', marginBottom:20}} onClick={()=>upload('chart',inputs.chart,'tank_charts')}>Add Chart</button>
                      <div style={{display:'flex', flexWrap:'wrap', gap:8}}>
                         {Object.keys(charts).map(k=>(
                            <div key={k} style={{background:'var(--bg-body)', padding:'6px 12px', borderRadius:20, display:'flex', alignItems:'center', gap:8, fontSize:'0.9rem', border:'1px solid var(--border)'}}>
                               {k} <button onClick={async()=>{const d={...charts}; delete d[k]; await supabase.from('system_assets').upsert({key:'tank_charts',data:d}); refresh(); toast("Deleted","success")}} style={{border:'none', background:'none', cursor:'pointer', color:'#ef4444', padding:0}}><X size={14}/></button>
                            </div>
                         ))}
                      </div>
                   </div>
                </div>
             )
         )}
      </div>
   );
};