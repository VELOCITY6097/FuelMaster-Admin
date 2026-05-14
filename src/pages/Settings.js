// import React, { useState, useEffect, useContext, useRef } from 'react'; 
// import { Megaphone, Lock, X, Database, HardDrive, DownloadCloud, UploadCloud, AlertTriangle, FileJson, Server, ShieldCheck, Eye, EyeOff, Settings } from 'lucide-react'; 
// import { DataContext } from '../context/DataContext'; 
// import { ToastContext, UIContext } from '../context/UIContext'; 
// import { AuthContext } from '../context/AuthContext'; 
// import { supabase } from '../supabase'; 
// import { sendLog } from '../logs'; 

// export const SettingsPage = () => { 
//     const { settings, charts, refresh } = useContext(DataContext); 
//     const [tab, setTab] = useState('general'); 
    
//     // Webhook State & Masking 
//     const [webhook, setWebhook] = useState(settings?.webhook_url || ''); 
//     const [isEditingWebhook, setIsEditingWebhook] = useState(false); 
    
//     const [inputs, setInputs] = useState({ density: '', chart: '' }); 
//     const [broadcast, setBroadcast] = useState(settings?.broadcast_msg || ''); 
//     const [bType, setBType] = useState(settings?.broadcast_type || 'info'); 
//     const [isProcessing, setIsProcessing] = useState(false); 
//     const fileInputRef = useRef(null); 
    
//     const toast = useContext(ToastContext); 
//     const showConfirm = useContext(UIContext); 
//     const { user } = useContext(AuthContext); 
    
//     useEffect(() => { 
//         setWebhook(settings?.webhook_url || ''); 
//         setBroadcast(settings?.broadcast_msg || ''); 
//         setBType(settings?.broadcast_type || 'info'); 
//     }, [settings]); 
    
//     const isOwner = user?.role === 'Owner'; 
//     const isModerator = user?.role === 'Moderator'; 
//     const isStaff = user?.role === 'Staff'; 

//     // --- FIX 1: Use update().eq() instead of upsert to prevent database constraint freezing ---
//     const saveWebhook = async () => { 
//         if(!isOwner) return toast("Only Owners can change the Webhook.", "error"); 
        
//         const { error } = await supabase.from('system_settings').update({ webhook_url: webhook }).eq('id', 1); 
//         if(error) return toast(error.message, "error");

//         toast("Webhook Updated", "success"); 
//         sendLog(webhook, 'SETTINGS_UPDATE', { user: user.name, discordId: user.discord, changes: 'Webhook URL updated' }); 
//         setIsEditingWebhook(false); 
//         refresh();
//     }; 
    
//     const saveBroadcast = async (clear) => { 
//         const msg = clear ? '' : broadcast; 
//         const { error } = await supabase.from('system_settings').update({ broadcast_msg: msg, broadcast_type: bType }).eq('id', 1); 
        
//         if (error) {
//             toast(error.message, "error"); 
//         } else { 
//             toast(clear ? "Broadcast Cleared" : "Broadcast Sent", "success"); 
//             sendLog(settings.webhook_url, clear ? 'BROADCAST_CLEARED' : 'BROADCAST_SENT', { user: user.name, discordId: user.discord, msg, type: bType }); 
//             refresh();
//         } 
//     }; 
    
//     // --- FIX 2: Maintenance Toggle fixed loader and immediate UI sync ---
//     const toggleDowntime = () => { 
//         showConfirm( 
//             settings.downtime_active ? "Unlock System (Go Online)?" : "Activate Maintenance Mode?", 
//             "This will immediately lock/unlock all client applications.", 
//             async () => { 
//                 try {
//                     const newState = !settings.downtime_active; 
//                     const { error } = await supabase.from('system_settings').update({ downtime_active: newState }).eq('id', 1); 
                    
//                     if (error) throw error;
                    
//                     toast("System Status Updated", "success"); 
//                     sendLog(settings.webhook_url, 'MAINTENANCE_TOGGLE', { user: user.name, discordId: user.discord, status: newState ? "OFFLINE" : "ONLINE" }); 
                    
//                     if(refresh) refresh(); // This instantly updates the UI to show LOCKED/LIVE
//                 } catch (err) {
//                     toast(err.message, "error");
//                 }
//             } 
//         ); 
//     }; 
    
//     const upload = async (type, text, key) => { 
//         if(!isOwner) return toast("Only Owners can manage Database Assets.", "error"); 
//         try { 
//             let d, action; 
//             if(type==='density') { 
//                 d = new Function('return '+text.replace(/const\s+densityTable\s*=\s*/,'').replace(/;\s*$/,''))(); 
//                 action = "Density Table Update"; 
//             } else { 
//                 const m = text.match(/(?:export\s+const\s+|const\s+)?([a-zA-Z0-9_]+)\s*=\s*(\{[\s\S]*?\})(?:;|$)/); 
//                 if(!m) throw new Error("Invalid Format"); 
//                 d = {...charts, [m[1]]: new Function('return '+m[2])()}; 
//                 action = `Chart Update: ${m[1]}`; 
//             } 
//             await supabase.from('system_assets').upsert({key, data:d}); 
//             toast("Uploaded Successfully", "success"); 
//             refresh(); 
//             sendLog(settings.webhook_url, 'ASSET_UPLOAD', { key, action, user: user.name, discordId: user.discord }); 
//         } catch(e) { toast("Error: "+e.message, "error"); } 
//     }; 

//     // --- FIX 3: Backup now sends the physical file directly to your Discord ---
//     const handleBackup = async () => { 
//         if(!isOwner) return toast("Access Denied", "error"); 
//         setIsProcessing(true); 
//         toast("Compiling system data...", "info"); 
        
//         try { 
//             const [stRes, adRes, ssRes, saRes, tcRes] = await Promise.all([ 
//                 supabase.from('stations').select('*'), 
//                 supabase.from('admins').select('*'), 
//                 supabase.from('system_settings').select('*'), 
//                 supabase.from('system_assets').select('*'), 
//                 supabase.from('tank_configs').select('*') 
//             ]); 
//             if (stRes.error || adRes.error || ssRes.error) throw new Error("Failed to fetch database tables."); 
            
//             const backupData = { 
//                 app: "FuelMaster", timestamp: new Date().toISOString(), version: '1.0', 
//                 data: { stations: stRes.data||[], admins: adRes.data||[], system_settings: ssRes.data||[], system_assets: saRes.data||[], tank_configs: tcRes.data||[] } 
//             }; 
            
//             const jsonString = JSON.stringify(backupData, null, 2);
//             const blob = new Blob([jsonString], { type: 'application/json' }); 
//             const fileName = `FuelMaster_Backup_${new Date().toISOString().split('T')[0]}.json`;
            
//             // 1. Download to local PC
//             const url = URL.createObjectURL(blob); 
//             const a = document.createElement('a'); 
//             a.href = url; a.download = fileName; 
//             document.body.appendChild(a); a.click(); document.body.removeChild(a); 
            
//             // 2. Send the .json File to Discord Webhook
//             if (settings.webhook_url) {
//                 const formData = new FormData();
//                 formData.append('content', `💾 **System Backup Generated & Exported by ${user.name}**`);
//                 formData.append('file', blob, fileName);
                
//                 await fetch(settings.webhook_url, { method: 'POST', body: formData })
//                     .catch(err => console.error("Discord Upload Error:", err));
//             }

//             toast("Backup downloaded & sent to Discord!", "success"); 
//             sendLog(settings.webhook_url, 'BACKUP_EXPORTED', { user: user.name, discordId: user.discord }); 
//         } catch (error) { 
//             toast(error.message, "error"); 
//         } finally { 
//             setIsProcessing(false); 
//         } 
//     }; 

//     const processRestore = async (file) => { 
//         const reader = new FileReader(); 
//         reader.onload = async (e) => { 
//             try { 
//                 setIsProcessing(true); 
//                 const json = JSON.parse(e.target.result); 
//                 if (json.app !== "FuelMaster" || !json.data) throw new Error("Invalid or corrupted backup file."); 
                
//                 const d = json.data; 
//                 toast("Restoring database... Please wait.", "info"); 
                
//                 if (d.stations?.length > 0) await supabase.from('stations').upsert(d.stations); 
//                 if (d.admins?.length > 0) await supabase.from('admins').upsert(d.admins); 
//                 if (d.system_settings?.length > 0) await supabase.from('system_settings').update(d.system_settings[0]).eq('id', 1); 
//                 if (d.system_assets?.length > 0) await supabase.from('system_assets').upsert(d.system_assets); 
//                 if (d.tank_configs?.length > 0) await supabase.from('tank_configs').upsert(d.tank_configs); 
                
//                 toast("System restored successfully! Refreshing...", "success"); 
//                 sendLog(settings.webhook_url, 'BACKUP_RESTORED', { user: user.name, discordId: user.discord }); 
//                 setTimeout(() => window.location.reload(), 2000); 
//             } catch (error) { 
//                 toast(`Restore failed: ${error.message}`, "error"); 
//             } finally { 
//                 setIsProcessing(false); 
//                 if(fileInputRef.current) fileInputRef.current.value = ''; 
//             } 
//         }; 
//         reader.readAsText(file); 
//     }; 

//     const triggerRestore = (e) => { 
//         const file = e.target.files[0]; 
//         if (!file) return; 
//         showConfirm("Confirm System Restore", "This action will overwrite current live database records. Are you absolutely sure?", () => processRestore(file)); 
//     }; 

//     if (isStaff) { 
//         return ( 
//             <div className="card" style={{textAlign:'center', padding:40, marginTop:40}}> 
//                 <div style={{marginBottom:15, background:'rgba(239, 68, 68, 0.1)', display:'inline-flex', padding:20, borderRadius:'50%'}}> 
//                     <Lock size={40} color="#ef4444"/> 
//                 </div> 
//                 <h3 style={{color:'#ef4444'}}>Restricted Access</h3> 
//                 <p style={{color:'var(--text-muted)'}}>Your role (Staff) is limited to Station Management only.<br/>Please contact an Administrator to change system settings.</p> 
//             </div> 
//         ); 
//     } 

//     const getBtnStyle = (type) => { 
//         const isActive = bType === type; 
//         let style = { flex:1, minWidth: '80px', textAlign:'center', padding:10, borderRadius:8, cursor:'pointer', fontWeight:600, textTransform:'uppercase', fontSize:'0.8rem', border:'1px solid var(--border)', transition:'all 0.2s' }; 
//         if (isActive) { 
//             style.border = '1px solid transparent'; 
//             if(type === 'info') { style.background = '#dbeafe'; style.color = '#1e40af'; style.borderColor = '#93c5fd'; } 
//             if(type === 'warning') { style.background = '#ffedd5'; style.color = '#9a3412'; style.borderColor = '#fdba74'; } 
//             if(type === 'critical') { style.background = '#fee2e2'; style.color = '#991b1b'; style.borderColor = '#fca5a5'; } 
//         } else { style.background = 'var(--bg-body)'; style.color = 'var(--text-muted)'; } 
//         return style; 
//     }; 

//     return ( 
//         <div style={{ animation: 'fadeIn 0.5s ease-in-out' }}> 
//             <div style={{ marginBottom: 35 }}> 
//                 <h1 style={{ fontSize: '1.8rem', margin: '0 0 8px 0', letterSpacing: '-0.5px' }}>System Preferences</h1> 
//                 <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.95rem' }}>Manage communication, core assets, and system states.</p> 
//             </div> 
            
//             <div style={{display:'flex', flexWrap:'nowrap', gap:10, marginBottom:30, overflowX: 'auto', paddingBottom: 10, WebkitOverflowScrolling: 'touch'}}> 
//                 <button className={`btn ${tab==='general'?'btn-primary':'btn-secondary'}`} style={{display:'flex', gap:8, whiteSpace: 'nowrap', flexShrink: 0}} onClick={()=>setTab('general')}><Settings size={18}/> General System</button> 
//                 <button className={`btn ${tab==='assets'?'btn-primary':'btn-secondary'}`} style={{display:'flex', gap:8, whiteSpace: 'nowrap', flexShrink: 0}} onClick={()=>setTab('assets')}><Database size={18}/> Protected Assets</button> 
//                 <button className={`btn ${tab==='data'?'btn-primary':'btn-secondary'}`} style={{display:'flex', gap:8, whiteSpace: 'nowrap', flexShrink: 0}} onClick={()=>setTab('data')}><HardDrive size={18}/> Data Backup</button> 
//             </div> 

//             {/* MERGED TAB: GENERAL SYSTEM */} 
//             {tab === 'general' && ( 
//                 <div style={{display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(min(100%, 320px), 1fr))', gap:24}}> 
                    
//                     {/* Maintenance Mode Card */} 
//                     <div className="card" style={{border:settings.downtime_active?'2px solid #ef4444':'1px solid var(--border)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between'}}> 
//                         <div> 
//                             <div style={{display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap: 15, marginBottom: 20}}> 
//                                 <div> 
//                                     <h3 style={{display:'flex', alignItems:'center', gap:10, margin:0}}><Lock size={20} color={settings.downtime_active ? '#ef4444' : 'var(--text-main)'}/> Maintenance Mode</h3> 
//                                     <p style={{margin:'5px 0 0 0', color:'var(--text-muted)', fontSize: '0.85rem'}}>Prevent stations from logging in or syncing data.</p> 
//                                 </div> 
//                                 <div style={{textAlign: 'right', background: 'var(--bg-body)', padding: '8px 16px', borderRadius: 8}}> 
//                                     <div style={{fontSize:'1.1rem', fontWeight:800, color:settings.downtime_active?'#ef4444':'#10b981'}}>{settings.downtime_active?'LOCKED':'LIVE'}</div> 
//                                 </div> 
//                             </div> 
//                         </div> 
//                         <div style={{paddingTop:20, borderTop:'1px solid var(--border)'}}> 
//                             <button className={`btn ${settings.downtime_active?'btn-primary':'btn-danger'}`} style={{width:'100%', boxSizing: 'border-box', padding: '14px'}} onClick={toggleDowntime}> 
//                                 {settings.downtime_active ? 'Unlock System (Go Online)' : 'Lock System (Activate Maintenance)'} 
//                             </button> 
//                         </div> 
//                     </div> 

//                     {/* Discord Integration Card */} 
//                     <div className="card" style={{display: 'flex', flexDirection: 'column', justifyContent: 'space-between'}}> 
//                         <div style={{opacity: isModerator ? 0.5 : 1, pointerEvents: isModerator ? 'none' : 'auto'}}> 
//                             <h3 style={{marginTop:0}}>System Logs {isModerator && <span style={{fontSize:'0.7rem', color:'var(--danger)'}}>(Owner Only)</span>}</h3> 
//                             <p style={{color:'var(--text-muted)', fontSize:'0.85rem', marginBottom:20}}>Configure the secure Discord Webhook for activity tracking.</p> 
//                             <div style={{position: 'relative', marginBottom: 20}}> 
//                                 <input className="app-input" type="text" value={isEditingWebhook ? webhook : (webhook ? '••••••••••••••••••••••••••••••••••••' : '')} onChange={e=>setWebhook(e.target.value)} onFocus={() => setIsEditingWebhook(true)} onBlur={() => setTimeout(() => setIsEditingWebhook(false), 200)} placeholder="https://discord.com/api/webhooks/..." style={{marginBottom:0, width: '100%', boxSizing: 'border-box', paddingRight: 40, fontFamily: isEditingWebhook ? 'inherit' : 'monospace'}} disabled={isModerator} /> 
//                                 <div onClick={() => setIsEditingWebhook(!isEditingWebhook)} style={{position: 'absolute', right: 12, top: 12, cursor: 'pointer', color: 'var(--text-muted)'}} > 
//                                     {isEditingWebhook ? <EyeOff size={18}/> : <Eye size={18}/>} 
//                                 </div> 
//                             </div> 
//                         </div> 
//                         <div style={{paddingTop:20, borderTop:'1px solid var(--border)'}}> 
//                             <button className="btn btn-primary" style={{width: '100%', padding: '14px'}} onClick={saveWebhook} disabled={isModerator}>Save Secure URL</button> 
//                         </div> 
//                     </div> 

//                     {/* Global Broadcast Card */} 
//                     <div className="card" style={{gridColumn: '1 / -1'}}> 
//                         <h3 style={{display:'flex', alignItems:'center', gap:10, marginTop:0}}><Megaphone size={20} color="var(--primary)"/> Global Broadcast</h3> 
//                         <p style={{color:'var(--text-muted)', fontSize:'0.85rem', marginBottom:20}}>Send a push notification to all active client screens across the network.</p> 
//                         <textarea className="app-input" value={broadcast} onChange={e=>setBroadcast(e.target.value)} placeholder="Type your broadcast message here..." style={{height:100, width: '100%', boxSizing: 'border-box'}}/> 
//                         <div style={{display:'flex', flexWrap: 'wrap', gap:10, marginBottom:20}}> 
//                             <div onClick={()=>setBType('info')} style={getBtnStyle('info')}>Info</div> 
//                             <div onClick={()=>setBType('warning')} style={getBtnStyle('warning')}>Warning</div> 
//                             <div onClick={()=>setBType('critical')} style={getBtnStyle('critical')}>Critical</div> 
//                         </div> 
//                         <div style={{display:'flex', flexWrap: 'wrap', gap:10}}> 
//                             <button className="btn btn-primary" style={{flex:1, minWidth: '150px'}} onClick={()=>saveBroadcast(false)}>Push Message</button> 
//                             <button className="btn btn-secondary" style={{flex:1, minWidth: '150px'}} onClick={()=>saveBroadcast(true)}>Clear Active Broadcast</button> 
//                         </div> 
//                     </div> 
//                 </div> 
//             )} 

//             {/* TAB: DATABASE ASSETS */} 
//             {tab === 'assets' && ( 
//                 isModerator ? ( 
//                     <div className="card" style={{textAlign:'center', padding:40}}> 
//                         <div style={{marginBottom:15, background:'var(--bg-body)', display:'inline-flex', padding:20, borderRadius:'50%'}}> 
//                             <ShieldCheck size={40} color="var(--text-muted)"/> 
//                         </div> 
//                         <h3>Protected Assets</h3> 
//                         <p style={{color:'var(--text-muted)'}}>Moderators cannot modify core database assets.<br/>Contact the Owner for changes.</p> 
//                     </div> 
//                 ) : ( 
//                     <div style={{display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(min(100%, 320px), 1fr))', gap:24}}> 
//                         <div className="card"> 
//                             <h3 style={{marginTop:0}}>Density Table</h3> 
//                             <p style={{color:'var(--text-muted)', fontSize:'0.85rem', marginBottom: 15}}>Update the core density calculation parameters.</p> 
//                             <textarea className="app-input" value={inputs.density} onChange={e=>setInputs({...inputs,density:e.target.value})} style={{height:150, fontFamily:'monospace', width: '100%', boxSizing: 'border-box'}} placeholder="Paste densityTable array here..."/> 
//                             <button className="btn btn-primary" style={{width:'100%', boxSizing: 'border-box'}} onClick={()=>upload('density',inputs.density,'density_table')}>Upload Density File</button> 
//                         </div> 
//                         <div className="card"> 
//                             <h3 style={{marginTop:0}}>Tank Charts</h3> 
//                             <p style={{color:'var(--text-muted)', fontSize:'0.85rem', marginBottom: 15}}>Add or remove mathematical strapping charts.</p> 
//                             <textarea className="app-input" value={inputs.chart} onChange={e=>setInputs({...inputs,chart:e.target.value})} style={{height:150, fontFamily:'monospace', width: '100%', boxSizing: 'border-box'}} placeholder="export const MS_20KL = {...}"/> 
//                             <button className="btn btn-primary" style={{width:'100%', marginBottom:20, boxSizing: 'border-box'}} onClick={()=>upload('chart',inputs.chart,'tank_charts')}>Add Chart Configuration</button> 
//                             <h4 style={{fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: 10, marginTop:0}}>Active Charts</h4> 
//                             <div style={{display:'flex', flexWrap:'wrap', gap:8}}> 
//                                 {Object.keys(charts).map(k=>( 
//                                     <div key={k} style={{background:'var(--bg-body)', padding:'6px 12px', borderRadius:20, display:'flex', alignItems:'center', gap:8, fontSize:'0.85rem', fontWeight: 600, border:'1px solid var(--border)'}}> 
//                                         {k} 
//                                         <button onClick={async()=>{const d={...charts}; delete d[k]; await supabase.from('system_assets').upsert({key:'tank_charts',data:d}); refresh(); toast("Deleted","success")}} style={{border:'none', background:'none', cursor:'pointer', color:'#ef4444', padding:0, display:'flex'}}><X size={14}/></button> 
//                                     </div> 
//                                 ))} 
//                             </div> 
//                         </div> 
//                     </div> 
//                 ) 
//             )} 

//             {/* TAB: DATA BACKUP */} 
//             {tab === 'data' && ( 
//                 isOwner ? ( 
//                     <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 320px), 1fr))', gap: 24 }}> 
//                         <div className="card" style={{ padding: 0, overflow: 'hidden' }}> 
//                             <div style={{ padding: '20px 24px', background: 'rgba(59, 130, 246, 0.05)', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 12 }}> 
//                                 <div style={{ padding: 8, background: 'rgba(59, 130, 246, 0.1)', borderRadius: 8, color: '#3b82f6' }}><DownloadCloud size={20}/></div> 
//                                 <div><h3 style={{ margin: 0, fontSize: '1.1rem' }}>Export System State</h3><div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Generate a .json snapshot</div></div> 
//                             </div> 
//                             <div style={{ padding: '24px' }}> 
//                                 <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: 25, lineHeight: 1.5 }}>Download a complete copy of all configured stations, authorized personnel, and global system settings. Save this file securely.</p> 
//                                 <button className="btn btn-primary" onClick={handleBackup} disabled={isProcessing} style={{ width: '100%', boxSizing: 'border-box', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 10, padding: 14 }}> 
//                                     <FileJson size={18}/> {isProcessing ? "Compiling Data..." : "Download Full Backup"} 
//                                 </button> 
//                             </div> 
//                         </div> 
                        
//                         <div className="card" style={{ padding: 0, overflow: 'hidden', border: '1px solid rgba(239, 68, 68, 0.2)' }}> 
//                             <div style={{ padding: '20px 24px', background: 'rgba(239, 68, 68, 0.05)', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 12 }}> 
//                                 <div style={{ padding: 8, background: 'rgba(239, 68, 68, 0.1)', borderRadius: 8, color: '#ef4444' }}><UploadCloud size={20}/></div> 
//                                 <div><h3 style={{ margin: 0, fontSize: '1.1rem', color: '#ef4444' }}>Restore System State</h3><div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Upload a previously saved snapshot</div></div> 
//                             </div> 
//                             <div style={{ padding: '24px' }}> 
//                                 <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, background: 'rgba(239, 68, 68, 0.05)', padding: '12px 16px', borderRadius: 8, marginBottom: 20 }}> 
//                                     <AlertTriangle size={18} color="#ef4444" style={{ flexShrink: 0, marginTop: 2 }}/> 
//                                     <span style={{ fontSize: '0.8rem', color: '#ef4444', lineHeight: 1.4 }}><strong>Warning:</strong> Overwrites live data. Ensure this is a valid FuelMaster backup.</span> 
//                                 </div> 
//                                 <input type="file" accept=".json" ref={fileInputRef} style={{ display: 'none' }} onChange={triggerRestore} /> 
//                                 <button className="btn btn-secondary" onClick={() => fileInputRef.current.click()} disabled={isProcessing} style={{ width: '100%', boxSizing: 'border-box', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 10, padding: 14, borderColor: '#ef4444', color: '#ef4444', background: 'transparent' }}> 
//                                     <Server size={18}/> Select Backup File 
//                                 </button> 
//                             </div> 
//                         </div> 
//                     </div> 
//                 ) : ( 
//                     <div className="card" style={{textAlign:'center', padding:40}}> 
//                         <div style={{marginBottom:15, background:'var(--bg-body)', display:'inline-flex', padding:20, borderRadius:'50%'}}> 
//                             <ShieldCheck size={40} color="var(--text-muted)"/> 
//                         </div> 
//                         <h3>Protected Zone</h3> 
//                         <p style={{color:'var(--text-muted)'}}>Only Owners can export and restore system backups.</p> 
//                     </div> 
//                 ) 
//             )} 
//         </div> 
//     ); 
// };

import React, { useState, useEffect, useContext, useRef } from 'react';
import { Megaphone, Lock, X, Database, HardDrive, DownloadCloud, UploadCloud, AlertTriangle, FileJson, Server, ShieldCheck, Eye, EyeOff, Settings } from 'lucide-react';
import { DataContext } from '../context/DataContext';
import { ToastContext, UIContext } from '../context/UIContext';
import { AuthContext } from '../context/AuthContext';
import { supabase } from '../supabase';
import { sendLog } from '../logs';

export const SettingsPage = () => {
  const { settings, charts, refresh } = useContext(DataContext);
  const [tab, setTab] = useState('general');

  // Webhook State & Masking
  const [webhook, setWebhook] = useState(settings?.webhook_url || '');
  const [isEditingWebhook, setIsEditingWebhook] = useState(false);
  const [inputs, setInputs] = useState({ density: '', chart: '' });

  const [broadcast, setBroadcast] = useState(settings?.broadcast_msg || '');
  const [bType, setBType] = useState(settings?.broadcast_type || 'info');
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef(null);

  const toast = useContext(ToastContext);
  const showConfirm = useContext(UIContext);
  const { user } = useContext(AuthContext);

  useEffect(() => {
    setWebhook(settings?.webhook_url || '');
    setBroadcast(settings?.broadcast_msg || '');
    setBType(settings?.broadcast_type || 'info');
  }, [settings]);

  const isOwner = user?.role === 'Owner';
  const isModerator = user?.role === 'Moderator';
  const isStaff = user?.role === 'Staff';

  const saveWebhook = async () => {
    if(!isOwner) return toast("Only Owners can change the Webhook.", "error");
    const { error } = await supabase.from('system_settings').update({ webhook_url: webhook }).eq('id', 1);
    if(error) return toast(error.message, "error");
    
    toast("Webhook Updated", "success");
    sendLog(webhook, 'SETTINGS_UPDATE', { user: user.name, discordId: user.discord, changes: 'Webhook URL updated' });
    setIsEditingWebhook(false);
    refresh();
  };

  const saveBroadcast = async (clear) => {
    const msg = clear ? '' : broadcast;
    const { error } = await supabase.from('system_settings').update({ broadcast_msg: msg, broadcast_type: bType }).eq('id', 1);
    if (error) {
      toast(error.message, "error");
    } else {
      toast(clear ? "Broadcast Cleared" : "Broadcast Sent", "success");
      sendLog(settings.webhook_url, clear ? 'BROADCAST_CLEARED' : 'BROADCAST_SENT', { user: user.name, discordId: user.discord, msg, type: bType });
      refresh();
    }
  };

  const toggleDowntime = () => {
    showConfirm(
      settings.downtime_active ? "Unlock System (Go Online)?" : "Activate Maintenance Mode?",
      "This will immediately lock/unlock all client applications.",
      async () => {
        try {
          const newState = !settings.downtime_active;
          const { error } = await supabase.from('system_settings').update({ downtime_active: newState }).eq('id', 1);
          if (error) throw error;
          
          toast("System Status Updated", "success");
          sendLog(settings.webhook_url, 'MAINTENANCE_TOGGLE', { user: user.name, discordId: user.discord, status: newState ? "OFFLINE" : "ONLINE" });
          if(refresh) refresh();
        } catch (err) {
          toast(err.message, "error");
        }
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
      toast("Uploaded Successfully", "success");
      refresh();
      sendLog(settings.webhook_url, 'ASSET_UPLOAD', { key, action, user: user.name, discordId: user.discord });
    } catch(e) {
      toast("Error: "+e.message, "error");
    }
  };

  const handleBackup = async () => {
    if(!isOwner) return toast("Access Denied", "error");
    setIsProcessing(true);
    toast("Compiling system data...", "info");

    try {
      const [stRes, adRes, ssRes, saRes, tcRes] = await Promise.all([
        supabase.from('stations').select('*'),
        supabase.from('admins').select('*'),
        supabase.from('system_settings').select('*'),
        supabase.from('system_assets').select('*'),
        supabase.from('tank_configs').select('*')
      ]);

      if (stRes.error || adRes.error || ssRes.error) throw new Error("Failed to fetch database tables.");

      const backupData = {
        app: "FuelMaster",
        timestamp: new Date().toISOString(),
        version: '1.0',
        data: {
          stations: stRes.data||[],
          admins: adRes.data||[],
          system_settings: ssRes.data||[],
          system_assets: saRes.data||[],
          tank_configs: tcRes.data||[]
        }
      };

      const jsonString = JSON.stringify(backupData, null, 2);
      const blob = new Blob([jsonString], { type: 'application/json' });
      const fileName = `FuelMaster_Backup_${new Date().toISOString().split('T')[0]}.json`;

      // 1. Download to local PC
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);

      // 2. Send the .json File & Embed together to Discord Webhook
      if (settings.webhook_url) {
        const formData = new FormData();
        
        // Attach the file
        formData.append('files[0]', blob, fileName);
        
        // Attach the embed as the payload (Replaces plain text and separate sendLog call)
        const embedPayload = {
          embeds: [{
            title: "📦 💾 CRITICAL SYSTEM BACKUP EXPORTED",
            color: 5763719, // Success Green
            description: "A complete structural snapshot of the FuelMaster database was successfully generated and downloaded.",
            fields: [
              { name: "👤 Exported By", value: user.discord ? `<@${user.discord}>` : `**${user.name}**`, inline: true },
              { name: "📊 File Size", value: `\`${(blob.size / 1024).toFixed(2)} KB\``, inline: true },
              { name: "🛡️ Security Notice", value: "This backup contains sensitive database information. Ensure it is stored securely.", inline: false }
            ],
            footer: { text: "💻 Session: FuelMaster Admin Interface" },
            timestamp: new Date().toISOString()
          }]
        };
        formData.append('payload_json', JSON.stringify(embedPayload));

        await fetch(settings.webhook_url, { method: 'POST', body: formData })
          .catch(err => console.error("Discord Upload Error:", err));
      }

      toast("Backup downloaded & sent to Discord!", "success");
    } catch (error) {
      toast(error.message, "error");
    } finally {
      setIsProcessing(false);
    }
  };

  const processRestore = async (file) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        setIsProcessing(true);
        const json = JSON.parse(e.target.result);
        if (json.app !== "FuelMaster" || !json.data) throw new Error("Invalid or corrupted backup file.");
        
        const d = json.data;
        toast("Restoring database... Please wait.", "info");

        if (d.stations?.length > 0) await supabase.from('stations').upsert(d.stations);
        if (d.admins?.length > 0) await supabase.from('admins').upsert(d.admins);
        if (d.system_settings?.length > 0) await supabase.from('system_settings').update(d.system_settings[0]).eq('id', 1);
        if (d.system_assets?.length > 0) await supabase.from('system_assets').upsert(d.system_assets);
        if (d.tank_configs?.length > 0) await supabase.from('tank_configs').upsert(d.tank_configs);

        toast("System restored successfully! Refreshing...", "success");
        sendLog(settings.webhook_url, 'BACKUP_RESTORED', { user: user.name, discordId: user.discord });
        setTimeout(() => window.location.reload(), 2000);
      } catch (error) {
        toast(`Restore failed: ${error.message}`, "error");
      } finally {
        setIsProcessing(false);
        if(fileInputRef.current) fileInputRef.current.value = '';
      }
    };
    reader.readAsText(file);
  };

  const triggerRestore = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    showConfirm("Confirm System Restore", "This action will overwrite current live database records. Are you absolutely sure?", () => processRestore(file));
  };

  if (isStaff) {
    return (
      <div className="card" style={{textAlign:'center', padding:40, marginTop:40}}>
        <div style={{marginBottom:15, background:'rgba(239, 68, 68, 0.1)', display:'inline-flex', padding:20, borderRadius:'50%'}}>
          <Lock size={40} color="#ef4444"/>
        </div>
        <h3 style={{color:'#ef4444'}}>Restricted Access</h3>
        <p style={{color:'var(--text-muted)'}}>Your role (Staff) is limited to Station Management only.<br/>Please contact an Administrator to change system settings.</p>
      </div>
    );
  }

  const getBtnStyle = (type) => {
    const isActive = bType === type;
    let style = {
      flex:1, minWidth: '80px', textAlign:'center', padding:10, borderRadius:8, cursor:'pointer', fontWeight:600, textTransform:'uppercase', fontSize:'0.8rem', border:'1px solid var(--border)', transition:'all 0.2s'
    };
    if (isActive) {
      style.border = '1px solid transparent';
      if(type === 'info') { style.background = '#dbeafe'; style.color = '#1e40af'; style.borderColor = '#93c5fd'; }
      if(type === 'warning') { style.background = '#ffedd5'; style.color = '#9a3412'; style.borderColor = '#fdba74'; }
      if(type === 'critical') { style.background = '#fee2e2'; style.color = '#991b1b'; style.borderColor = '#fca5a5'; }
    } else {
      style.background = 'var(--bg-body)';
      style.color = 'var(--text-muted)';
    }
    return style;
  };

  return (
    <div style={{ animation: 'fadeIn 0.5s ease-in-out' }}>
      <div style={{ marginBottom: 35 }}>
        <h1 style={{ fontSize: '1.8rem', margin: '0 0 8px 0', letterSpacing: '-0.5px' }}>System Preferences</h1>
        <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.95rem' }}>Manage communication, core assets, and system states.</p>
      </div>

      <div style={{display:'flex', flexWrap:'nowrap', gap:10, marginBottom:30, overflowX: 'auto', paddingBottom: 10, WebkitOverflowScrolling: 'touch'}}>
        <button className={`btn ${tab==='general'?'btn-primary':'btn-secondary'}`} style={{display:'flex', gap:8, whiteSpace: 'nowrap', flexShrink: 0}} onClick={()=>setTab('general')}><Settings size={18}/> General System</button>
        <button className={`btn ${tab==='assets'?'btn-primary':'btn-secondary'}`} style={{display:'flex', gap:8, whiteSpace: 'nowrap', flexShrink: 0}} onClick={()=>setTab('assets')}><Database size={18}/> Protected Assets</button>
        <button className={`btn ${tab==='data'?'btn-primary':'btn-secondary'}`} style={{display:'flex', gap:8, whiteSpace: 'nowrap', flexShrink: 0}} onClick={()=>setTab('data')}><HardDrive size={18}/> Data Backup</button>
      </div>

      {/* MERGED TAB: GENERAL SYSTEM */}
      {tab === 'general' && (
        <div style={{display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(min(100%, 320px), 1fr))', gap:24}}>
          {/* Maintenance Mode Card */}
          <div className="card" style={{border:settings.downtime_active?'2px solid #ef4444':'1px solid var(--border)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between'}}>
            <div>
              <div style={{display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap: 15, marginBottom: 20}}>
                <div>
                  <h3 style={{display:'flex', alignItems:'center', gap:10, margin:0}}><Lock size={20} color={settings.downtime_active ? '#ef4444' : 'var(--text-main)'}/> Maintenance Mode</h3>
                  <p style={{margin:'5px 0 0 0', color:'var(--text-muted)', fontSize: '0.85rem'}}>Prevent stations from logging in or syncing data.</p>
                </div>
                <div style={{textAlign: 'right', background: 'var(--bg-body)', padding: '8px 16px', borderRadius: 8}}>
                  <div style={{fontSize:'1.1rem', fontWeight:800, color:settings.downtime_active?'#ef4444':'#10b981'}}>{settings.downtime_active?'LOCKED':'LIVE'}</div>
                </div>
              </div>
            </div>
            <div style={{paddingTop:20, borderTop:'1px solid var(--border)'}}>
              <button className={`btn ${settings.downtime_active?'btn-primary':'btn-danger'}`} style={{width:'100%', boxSizing: 'border-box', padding: '14px'}} onClick={toggleDowntime}>
                {settings.downtime_active ? 'Unlock System (Go Online)' : 'Lock System (Activate Maintenance)'}
              </button>
            </div>
          </div>

          {/* Discord Integration Card */}
          <div className="card" style={{display: 'flex', flexDirection: 'column', justifyContent: 'space-between'}}>
            <div style={{opacity: isModerator ? 0.5 : 1, pointerEvents: isModerator ? 'none' : 'auto'}}>
              <h3 style={{marginTop:0}}>System Logs {isModerator && <span style={{fontSize:'0.7rem', color:'var(--danger)'}}>(Owner Only)</span>}</h3>
              <p style={{color:'var(--text-muted)', fontSize:'0.85rem', marginBottom:20}}>Configure the secure Discord Webhook for activity tracking.</p>
              <div style={{position: 'relative', marginBottom: 20}}>
                <input className="app-input" type="text" value={isEditingWebhook ? webhook : (webhook ? '••••••••••••••••••••••••••••••••••••' : '')} onChange={e=>setWebhook(e.target.value)} onFocus={() => setIsEditingWebhook(true)} onBlur={() => setTimeout(() => setIsEditingWebhook(false), 200)} placeholder="https://discord.com/api/webhooks/..." style={{marginBottom:0, width: '100%', boxSizing: 'border-box', paddingRight: 40, fontFamily: isEditingWebhook ? 'inherit' : 'monospace'}} disabled={isModerator} />
                <div onClick={() => setIsEditingWebhook(!isEditingWebhook)} style={{position: 'absolute', right: 12, top: 12, cursor: 'pointer', color: 'var(--text-muted)'}} >
                  {isEditingWebhook ? <EyeOff size={18}/> : <Eye size={18}/>}
                </div>
              </div>
            </div>
            <div style={{paddingTop:20, borderTop:'1px solid var(--border)'}}>
              <button className="btn btn-primary" style={{width: '100%', padding: '14px'}} onClick={saveWebhook} disabled={isModerator}>Save Secure URL</button>
            </div>
          </div>

          {/* Global Broadcast Card */}
          <div className="card" style={{gridColumn: '1 / -1'}}>
            <h3 style={{display:'flex', alignItems:'center', gap:10, marginTop:0}}><Megaphone size={20} color="var(--primary)"/> Global Broadcast</h3>
            <p style={{color:'var(--text-muted)', fontSize:'0.85rem', marginBottom:20}}>Send a push notification to all active client screens across the network.</p>
            <textarea className="app-input" value={broadcast} onChange={e=>setBroadcast(e.target.value)} placeholder="Type your broadcast message here..." style={{height:100, width: '100%', boxSizing: 'border-box'}}/>
            <div style={{display:'flex', flexWrap: 'wrap', gap:10, marginBottom:20}}>
              <div onClick={()=>setBType('info')} style={getBtnStyle('info')}>Info</div>
              <div onClick={()=>setBType('warning')} style={getBtnStyle('warning')}>Warning</div>
              <div onClick={()=>setBType('critical')} style={getBtnStyle('critical')}>Critical</div>
            </div>
            <div style={{display:'flex', flexWrap: 'wrap', gap:10}}>
              <button className="btn btn-primary" style={{flex:1, minWidth: '150px'}} onClick={()=>saveBroadcast(false)}>Push Message</button>
              <button className="btn btn-secondary" style={{flex:1, minWidth: '150px'}} onClick={()=>saveBroadcast(true)}>Clear Active Broadcast</button>
            </div>
          </div>
        </div>
      )}

      {/* TAB: DATABASE ASSETS */}
      {tab === 'assets' && (
        isModerator ? (
          <div className="card" style={{textAlign:'center', padding:40}}>
            <div style={{marginBottom:15, background:'var(--bg-body)', display:'inline-flex', padding:20, borderRadius:'50%'}}>
              <ShieldCheck size={40} color="var(--text-muted)"/>
            </div>
            <h3>Protected Assets</h3>
            <p style={{color:'var(--text-muted)'}}>Moderators cannot modify core database assets.<br/>Contact the Owner for changes.</p>
          </div>
        ) : (
          <div style={{display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(min(100%, 320px), 1fr))', gap:24}}>
            <div className="card">
              <h3 style={{marginTop:0}}>Density Table</h3>
              <p style={{color:'var(--text-muted)', fontSize:'0.85rem', marginBottom: 15}}>Update the core density calculation parameters.</p>
              <textarea className="app-input" value={inputs.density} onChange={e=>setInputs({...inputs,density:e.target.value})} style={{height:150, fontFamily:'monospace', width: '100%', boxSizing: 'border-box'}} placeholder="Paste densityTable array here..."/>
              <button className="btn btn-primary" style={{width:'100%', boxSizing: 'border-box'}} onClick={()=>upload('density',inputs.density,'density_table')}>Upload Density File</button>
            </div>
            <div className="card">
              <h3 style={{marginTop:0}}>Tank Charts</h3>
              <p style={{color:'var(--text-muted)', fontSize:'0.85rem', marginBottom: 15}}>Add or remove mathematical strapping charts.</p>
              <textarea className="app-input" value={inputs.chart} onChange={e=>setInputs({...inputs,chart:e.target.value})} style={{height:150, fontFamily:'monospace', width: '100%', boxSizing: 'border-box'}} placeholder="export const MS_20KL = {...}"/>
              <button className="btn btn-primary" style={{width:'100%', marginBottom:20, boxSizing: 'border-box'}} onClick={()=>upload('chart',inputs.chart,'tank_charts')}>Add Chart Configuration</button>
              <h4 style={{fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: 10, marginTop:0}}>Active Charts</h4>
              <div style={{display:'flex', flexWrap:'wrap', gap:8}}>
                {Object.keys(charts).map(k=>(
                  <div key={k} style={{background:'var(--bg-body)', padding:'6px 12px', borderRadius:20, display:'flex', alignItems:'center', gap:8, fontSize:'0.85rem', fontWeight: 600, border:'1px solid var(--border)'}}>
                    {k}
                    <button onClick={async()=>{const d={...charts}; delete d[k]; await supabase.from('system_assets').upsert({key:'tank_charts',data:d}); refresh(); toast("Deleted","success")}} style={{border:'none', background:'none', cursor:'pointer', color:'#ef4444', padding:0, display:'flex'}}><X size={14}/></button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )
      )}

      {/* TAB: DATA BACKUP */}
      {tab === 'data' && (
        isOwner ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 320px), 1fr))', gap: 24 }}>
            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
              <div style={{ padding: '20px 24px', background: 'rgba(59, 130, 246, 0.05)', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ padding: 8, background: 'rgba(59, 130, 246, 0.1)', borderRadius: 8, color: '#3b82f6' }}><DownloadCloud size={20}/></div>
                <div><h3 style={{ margin: 0, fontSize: '1.1rem' }}>Export System State</h3><div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Generate a .json snapshot</div></div>
              </div>
              <div style={{ padding: '24px' }}>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: 25, lineHeight: 1.5 }}>Download a complete copy of all configured stations, authorized personnel, and global system settings. Save this file securely.</p>
                <button className="btn btn-primary" onClick={handleBackup} disabled={isProcessing} style={{ width: '100%', boxSizing: 'border-box', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 10, padding: 14 }}>
                  <FileJson size={18}/> {isProcessing ? "Compiling Data..." : "Download Full Backup"}
                </button>
              </div>
            </div>

            <div className="card" style={{ padding: 0, overflow: 'hidden', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
              <div style={{ padding: '20px 24px', background: 'rgba(239, 68, 68, 0.05)', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ padding: 8, background: 'rgba(239, 68, 68, 0.1)', borderRadius: 8, color: '#ef4444' }}><UploadCloud size={20}/></div>
                <div><h3 style={{ margin: 0, fontSize: '1.1rem', color: '#ef4444' }}>Restore System State</h3><div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Upload a previously saved snapshot</div></div>
              </div>
              <div style={{ padding: '24px' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, background: 'rgba(239, 68, 68, 0.05)', padding: '12px 16px', borderRadius: 8, marginBottom: 20 }}>
                  <AlertTriangle size={18} color="#ef4444" style={{ flexShrink: 0, marginTop: 2 }}/>
                  <span style={{ fontSize: '0.8rem', color: '#ef4444', lineHeight: 1.4 }}><strong>Warning:</strong> Overwrites live data. Ensure this is a valid FuelMaster backup.</span>
                </div>
                <input type="file" accept=".json" ref={fileInputRef} style={{ display: 'none' }} onChange={triggerRestore} />
                <button className="btn btn-secondary" onClick={() => fileInputRef.current.click()} disabled={isProcessing} style={{ width: '100%', boxSizing: 'border-box', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 10, padding: 14, borderColor: '#ef4444', color: '#ef4444', background: 'transparent' }}>
                  <Server size={18}/> Select Backup File
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="card" style={{textAlign:'center', padding:40}}>
            <div style={{marginBottom:15, background:'var(--bg-body)', display:'inline-flex', padding:20, borderRadius:'50%'}}>
              <ShieldCheck size={40} color="var(--text-muted)"/>
            </div>
            <h3>Protected Zone</h3>
            <p style={{color:'var(--text-muted)'}}>Only Owners can export and restore system backups.</p>
          </div>
        )
      )}
    </div>
  );
};