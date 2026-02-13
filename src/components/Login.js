import React, { useState, useEffect } from 'react';
import { Layers, ArrowRight, Eye, EyeOff } from 'lucide-react';
import { supabase } from '../supabase';
import { sendLog } from '../logs';

export const Login = ({ onLogin }) => {
   const [creds, setCreds] = useState({phone:'', pin:''});
   const [remember, setRemember] = useState(false);
   const [err, setErr] = useState('');
   const [showPass, setShowPass] = useState(false);
   const [loading, setLoading] = useState(false);
   
   useEffect(() => {
       const savedPhone = localStorage.getItem('fm_saved_phone');
       const savedPin = localStorage.getItem('fm_saved_pin');
       if (savedPhone && savedPin) {
           setCreds({ phone: savedPhone, pin: savedPin });
           setRemember(true);
       }
   }, []);

   const submit = async (e) => {
      e.preventDefault(); setErr(''); setLoading(true);
      const { data } = await supabase.from('admins').select('*').eq('phone',creds.phone).eq('pin',creds.pin).single();
      if(data) {
         if (remember) {
             localStorage.setItem('fm_saved_phone', creds.phone);
             localStorage.setItem('fm_saved_pin', creds.pin);
         } else {
             localStorage.removeItem('fm_saved_phone');
             localStorage.removeItem('fm_saved_pin');
         }

         const { data: set } = await supabase.from('system_settings').select('webhook_url').eq('id', 1).single();
         if(set) sendLog(set.webhook_url, 'LOGIN', { name: data.name, role: data.role, user: data.name, discordId: data.discord });
         onLogin(data); 
      } else {
         setErr("Invalid Credentials");
      }
      setLoading(false);
   };

   return (
      <div className="login-wrapper">
         <div className="login-card">
            <div style={{marginBottom:30, display:'flex', flexDirection:'column', alignItems:'center'}}>
               <div style={{display:'flex', alignItems:'center', gap:15, marginBottom:10}}>
                  <Layers size={48} color="white" />
                  <div style={{lineHeight:1}}>
                     <span style={{fontSize:'2.2rem', fontWeight:800, color:'white'}}>FM</span>
                     <span style={{fontSize:'2.2rem', fontWeight:700, color:'var(--primary)'}}>ADMIN</span>
                  </div>
               </div>
               <p style={{color:'#94a3b8', margin:0, fontSize:'0.9rem'}}>Secure Access Gateway</p>
            </div>
            
            <form onSubmit={submit} style={{display:'flex', flexDirection:'column', gap:15}}>
               <div style={{textAlign:'left'}}>
                  <label style={{color:'#94a3b8', fontSize:'0.75rem', fontWeight:600, marginBottom:5, display:'block', textTransform:'uppercase'}}>Admin ID</label>
                  <input type="text" value={creds.phone} onChange={e=>setCreds({...creds,phone:e.target.value})} placeholder="e.g. 9875345863" required />
               </div>
               
               <div style={{textAlign:'left', position:'relative'}}>
                  <label style={{color:'#94a3b8', fontSize:'0.75rem', fontWeight:600, marginBottom:5, display:'block', textTransform:'uppercase'}}>Secure Pin</label>
                  <div style={{position:'relative'}}>
                    <input type={showPass?"text":"password"} value={creds.pin} onChange={e=>setCreds({...creds,pin:e.target.value})} placeholder="••••" required style={{paddingRight:45}}/>
                    <button type="button" onClick={()=>setShowPass(!showPass)} style={{position:'absolute', right:12, top:'50%', transform:'translateY(-50%)', background:'none', border:'none', color:'#94a3b8', cursor:'pointer'}}>
                        {showPass ? <Eye size={20}/> : <EyeOff size={20}/>}
                    </button>
                  </div>
               </div>

               <div style={{display:'flex', alignItems:'center', gap:8, marginTop:5}}>
                   <input 
                    type="checkbox" 
                    id="chkRemember" 
                    checked={remember} 
                    onChange={e=>setRemember(e.target.checked)} 
                    style={{width:'auto', margin:0}}
                   />
                   <label htmlFor="chkRemember" style={{color:'#cbd5e1', fontSize:'0.9rem', cursor:'pointer'}}>Remember Me</label>
               </div>

               {err && <div style={{color:'#ef4444', marginBottom:10, fontSize:'0.9rem', textAlign:'left', background:'rgba(239,68,68,0.1)', padding:10, borderRadius:8}}>{err}</div>}

               <button className="login-btn" disabled={loading} style={{marginTop:10}}>
                  {loading ? 'Verifying...' : <>Authenticate <ArrowRight size={18}/></>}
               </button>
            </form>
            <p style={{fontSize:'0.75rem', color:'#64748b', marginTop:'2rem', opacity:0.7}}>System v3.0 | Secured Connection</p>
         </div>
      </div>
   );
};