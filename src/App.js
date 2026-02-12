import React, { useState, useEffect, createContext, useContext } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation, Navigate, useNavigate } from 'react-router-dom';
import { createClient } from '@supabase/supabase-js';
import { 
  LayoutDashboard, Fuel, Users, Settings, LogOut, Menu, X,
  Search, Plus, Trash2, Edit2, Activity, Layers, Megaphone, 
  Lock, Copy, AlertTriangle, CheckCircle, Info,
  Moon, Sun, MapPin, Eye, EyeOff, ArrowRight, Check
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { sendLog } from './logs'; 

// --- CONFIG ---
const SUPABASE_URL = 'https://hmfuxypluzozbwoleqnn.supabase.co';
const SUPABASE_KEY = 'sb_publishable_mP-3LuhOE7uXLOV5t4IrBg_WWvUUmmb';
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const BOSS_PHONE = "9875345863"; 

// --- CONTEXTS ---
const AuthContext = createContext();
const ToastContext = createContext();
const ThemeContext = createContext();
const UIContext = createContext();
const DataContext = createContext(); 

// --- HELPER COMPONENTS ---

const ReactLoader = ({ text }) => (
  <div className="loader-overlay">
    <div style={{width:80, height:80, position:'relative', display:'flex', alignItems:'center', justifyContent:'center'}}>
       <svg className="react-logo" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
          <ellipse cx="50" cy="50" rx="40" ry="10" stroke="var(--primary)" strokeWidth="6" transform="rotate(0 50 50)"/>
          <ellipse cx="50" cy="50" rx="40" ry="10" stroke="var(--primary)" strokeWidth="6" transform="rotate(60 50 50)"/>
          <ellipse cx="50" cy="50" rx="40" ry="10" stroke="var(--primary)" strokeWidth="6" transform="rotate(120 50 50)"/>
       </svg>
    </div>
    <h3 style={{marginTop:20, color:'var(--text-muted)', fontWeight:600}}>{text || 'Loading...'}</h3>
  </div>
);

const DateTimeDisplay = () => {
  const [date, setDate] = useState(new Date());
  useEffect(() => { const timer = setInterval(() => setDate(new Date()), 1000); return () => clearInterval(timer); }, []);
  return (
    <div style={{textAlign:'right', lineHeight:1.2}}>
      <div style={{fontSize:'0.7rem', fontWeight:800, color:'var(--primary)', textTransform:'uppercase', letterSpacing:1}}>
        {date.toLocaleDateString(undefined, { weekday: 'long' })}
      </div>
      <div style={{fontSize:'0.9rem', fontWeight:600, color:'var(--text-main)'}}>
        {date.toLocaleDateString(undefined, { month:'short', day:'numeric' })} • {date.toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}
      </div>
    </div>
  );
};

const ToastProvider = ({ children }) => {
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

const ModalProvider = ({ children }) => {
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

// --- REALTIME DATA PROVIDER ---
const DataProvider = ({ children }) => {
  const [data, setData] = useState({ stations: [], admins: [], settings: {}, charts: {}, tankTypes: [] });
  const [loading, setLoading] = useState(true);

  const fetchAll = async () => {
    const { data: st } = await supabase.from('stations').select('*').order('created_at', { ascending: false });
    const { data: ad } = await supabase.from('admins').select('*');
    const { data: se } = await supabase.from('system_settings').select('*').eq('id', 1).single();
    const { data: as } = await supabase.from('system_assets').select('data').eq('key', 'tank_charts').single();
    const { data: tt } = await supabase.from('tank_configs').select('type_name');
    
    setData({
      stations: st || [],
      admins: ad || [],
      settings: se || {},
      charts: as?.data || {},
      tankTypes: tt ? tt.map(t => t.type_name) : ['MS_15KL', 'HSD_20KL']
    });
    setLoading(false);
  };

  useEffect(() => {
    fetchAll();
    // Subscribing to changes for automatic updates
    const sub1 = supabase.channel('realtime:stations').on('postgres_changes', { event: '*', schema: 'public', table: 'stations' }, fetchAll).subscribe();
    const sub2 = supabase.channel('realtime:admins').on('postgres_changes', { event: '*', schema: 'public', table: 'admins' }, fetchAll).subscribe();
    const sub3 = supabase.channel('realtime:settings').on('postgres_changes', { event: '*', schema: 'public', table: 'system_settings' }, fetchAll).subscribe();
    
    return () => { 
        supabase.removeChannel(sub1); 
        supabase.removeChannel(sub2); 
        supabase.removeChannel(sub3); 
    };
  }, []);

  if (loading) return <ReactLoader text="Connecting to Core..." />;
  return <DataContext.Provider value={{ ...data, refresh: fetchAll }}>{children}</DataContext.Provider>;
};

// --- LAYOUT ---
const Layout = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user, logout } = useContext(AuthContext);
  const { isDark, toggleTheme } = useContext(ThemeContext);
  const location = useLocation();

  return (
    <div className="app-container">
      {sidebarOpen && <div style={{position:'fixed', inset:0, background:'rgba(0,0,0,0.5)', zIndex:40}} onClick={()=>setSidebarOpen(false)}/>}
      
      <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="brand">
           <Layers size={28} color="var(--primary)"/> <span>FM ADMIN</span>
        </div>
        <div className="nav-links">
          <Link to="/" className={`nav-item ${location.pathname==='/'?'active':''}`} onClick={()=>setSidebarOpen(false)}><LayoutDashboard size={18}/> Overview</Link>
          <Link to="/stations" className={`nav-item ${location.pathname==='/stations'?'active':''}`} onClick={()=>setSidebarOpen(false)}><Fuel size={18}/> Stations</Link>
          <Link to="/team" className={`nav-item ${location.pathname==='/team'?'active':''}`} onClick={()=>setSidebarOpen(false)}><Users size={18}/> Staff & Security</Link>
          <Link to="/settings" className={`nav-item ${location.pathname==='/settings'?'active':''}`} onClick={()=>setSidebarOpen(false)}><Settings size={18}/> Settings</Link>
        </div>
        <div className="user-panel">
          <div style={{flex:1, display:'flex', gap:10, alignItems:'center'}}>
             <div style={{width:32, height:32, background:'var(--primary)', borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:'bold', fontSize:'0.8rem', color:'white'}}>
               {user?.name?.substring(0,2).toUpperCase()}
             </div>
             <div><div style={{fontWeight:600}}>{user?.name}</div><div style={{fontSize:'0.75rem', opacity:0.7}}>{user?.role}</div></div>
          </div>
          <button onClick={toggleTheme} style={{background:'none', border:'none', color:'var(--text-muted)', cursor:'pointer'}}>{isDark ? <Sun size={18}/> : <Moon size={18}/>}</button>
          <button onClick={logout} className="btn-danger" style={{padding:6, borderRadius:6, cursor:'pointer'}}><LogOut size={16}/></button>
        </div>
      </aside>

      <div className="main-content">
        <div className="top-bar">
           <div style={{display:'flex', alignItems:'center', gap:15}}>
              <button style={{background:'none', border:'none'}} onClick={()=>setSidebarOpen(true)} className="mobile-only">{window.innerWidth < 768 && <Menu size={24} color="var(--text-main)"/>}</button>
              <h2 style={{fontSize:'1.25rem', fontWeight:800, margin:0}}>
                {location.pathname==='/' ? 'Dashboard' : location.pathname.substring(1).charAt(0).toUpperCase() + location.pathname.slice(2)}
              </h2>
           </div>
           <DateTimeDisplay />
        </div>
        <div className="content-scroll">
           {children}
        </div>
      </div>
    </div>
  );
};

// --- PAGES ---

const Dashboard = () => {
  const { stations, admins, settings } = useContext(DataContext);
  const navigate = useNavigate();
  
  return (
    <div>
      <div style={{display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(240px, 1fr))', gap:24, marginBottom:30}}>
         <div className="card" style={{display:'flex', alignItems:'center', gap:20, cursor:'pointer'}} onClick={()=>navigate('/stations')}>
            <div style={{padding:16, background:'rgba(59, 130, 246, 0.1)', borderRadius:12, color:'#3b82f6'}}><Fuel size={32}/></div>
            <div><div style={{fontSize:'0.8rem', fontWeight:700, color:'var(--text-muted)', textTransform:'uppercase'}}>Stations</div><div style={{fontSize:'2rem', fontWeight:700}}>{stations.length}</div></div>
         </div>
         <div className="card" style={{display:'flex', alignItems:'center', gap:20, cursor:'pointer'}} onClick={()=>navigate('/team')}>
            <div style={{padding:16, background:'rgba(245, 158, 11, 0.1)', borderRadius:12, color:'#f59e0b'}}><Users size={32}/></div>
            <div><div style={{fontSize:'0.8rem', fontWeight:700, color:'var(--text-muted)', textTransform:'uppercase'}}>Staff</div><div style={{fontSize:'2rem', fontWeight:700}}>{admins.length}</div></div>
         </div>
         <div className="card" style={{display:'flex', alignItems:'center', gap:20}}>
            <div style={{padding:16, background:!settings.downtime_active?'rgba(16, 185, 129, 0.1)':'rgba(239, 68, 68, 0.1)', borderRadius:12, color:!settings.downtime_active?'#10b981':'#ef4444'}}><Activity size={32}/></div>
            <div><div style={{fontSize:'0.8rem', fontWeight:700, color:'var(--text-muted)', textTransform:'uppercase'}}>System</div><div style={{fontSize:'2rem', fontWeight:700, color:!settings.downtime_active?'#10b981':'#ef4444'}}>{!settings.downtime_active?'Online':'Offline'}</div></div>
         </div>
      </div>

      <div style={{display:'grid', gridTemplateColumns:'1fr', gap:24}}>
          <div className="card">
              <h3 style={{marginTop:0}}>Live Activity (7 Days)</h3>
              <ResponsiveContainer width="100%" height={250}>
                <AreaChart data={[{n:'Mon',v:20},{n:'Tue',v:45},{n:'Wed',v:30},{n:'Thu',v:60},{n:'Fri',v:45},{n:'Sat',v:80},{n:'Sun',v:50}]}>
                    <defs>
                        <linearGradient id="colorV" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="var(--primary)" stopOpacity={0}/>
                        </linearGradient>
                    </defs>
                    <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false}/>
                    <XAxis dataKey="n" stroke="var(--text-muted)" fontSize={12} tickLine={false} axisLine={false}/>
                    <YAxis stroke="var(--text-muted)" fontSize={12} tickLine={false} axisLine={false}/>
                    <Tooltip contentStyle={{background:'var(--bg-card)', borderColor:'var(--border)', color:'var(--text-main)', borderRadius:8}}/>
                    <Area type="monotone" dataKey="v" stroke="var(--primary)" strokeWidth={3} fillOpacity={1} fill="url(#colorV)" />
                </AreaChart>
              </ResponsiveContainer>
          </div>
      </div>
    </div>
  );
};

const Stations = () => {
  const { stations, tankTypes, settings, refresh } = useContext(DataContext);
  const [filter, setFilter] = useState({ search: '', brand: 'all', sort: 'new' });
  const [modal, setModal] = useState(null);
  const [copiedId, setCopiedId] = useState(null); 
  const toast = useContext(ToastContext);
  const showConfirm = useContext(UIContext);
  const { user } = useContext(AuthContext);

  const deleteSt = (id) => {
     if(user.role === 'Staff') return toast("Access Denied", "error");
     showConfirm("Delete Station?", "This will permanently remove the station.", async () => {
        await supabase.from('stations').delete().eq('station_id', id);
        toast("Station Removed", "success");
        sendLog(settings.webhook_url, 'STATION_DELETED', { id, user: user.name, discordId: user.discord });
        refresh(); // Force immediate update
     });
  };

  const copyId = async (id) => {
    try {
      await navigator.clipboard.writeText(id);
      setCopiedId(id);
      toast("Station ID Copied", "success");
      setTimeout(() => setCopiedId(null), 2000);
    } catch (err) {
      toast("Copy failed: Browser restricted", "error");
    }
  };

  const filtered = stations
    .filter(s => (filter.brand === 'all' || s.theme === filter.brand) && (s.name.toLowerCase().includes(filter.search.toLowerCase()) || s.station_id.includes(filter.search)))
    .sort((a,b) => filter.sort === 'new' ? new Date(b.created_at) - new Date(a.created_at) : new Date(a.created_at) - new Date(b.created_at));

  return (
    <div>
      <div className="card" style={{display:'flex', gap:15, flexWrap:'wrap', alignItems:'center', padding:16}}>
         <div style={{flex:2, position:'relative', minWidth:200}}>
            <Search size={18} style={{position:'absolute', left:12, top:13, color:'var(--text-muted)'}}/>
            <input className="app-input" placeholder="Search stations..." value={filter.search} onChange={e=>setFilter({...filter, search:e.target.value})} style={{paddingLeft:38, marginBottom:0}}/>
         </div>
         <select className="app-input" value={filter.brand} onChange={e=>setFilter({...filter, brand:e.target.value})} style={{width:150, marginBottom:0}}><option value="all">All Brands</option><option value="bpcl">BPCL</option><option value="iocl">IOCL</option><option value="hpcl">HPCL</option><option value="jio">Jio-bp</option></select>
         <select className="app-input" value={filter.sort} onChange={e=>setFilter({...filter, sort:e.target.value})} style={{width:150, marginBottom:0}}><option value="new">Newest First</option><option value="old">Oldest First</option></select>
         <button className="btn btn-primary" onClick={()=>setModal({ tanks: [] })}>+ New Station</button>
      </div>

      <div style={{display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(320px, 1fr))', gap:24}}>
         {filtered.map(s => (
            <div key={s.station_id} className={`card station-card theme-${s.theme}`}>
               <div style={{display:'flex', justifyContent:'space-between', marginBottom:12}}>
                  <div>
                     <h3 style={{margin:0, fontSize:'1.1rem'}}>{s.name}</h3>
                     <span style={{fontSize:'0.75rem', fontWeight:700, color:'var(--text-muted)', textTransform:'uppercase'}}>{s.theme}</span>
                  </div>
                  
                  <div 
                    onClick={() => copyId(s.station_id)}
                    style={{
                        background:'var(--bg-body)', padding:'6px 10px', borderRadius:6, fontSize:'0.8rem', 
                        height:'fit-content', cursor:'pointer', display:'flex', alignItems:'center', gap:6,
                        border:'1px solid var(--border)', transition:'all 0.2s'
                    }}
                    title="Click to copy ID"
                  >
                     <span style={{fontFamily:'monospace', fontWeight:600}}>{s.station_id}</span>
                     {copiedId === s.station_id ? <Check size={14} color="var(--success)"/> : <Copy size={14} color="var(--text-muted)"/>}
                  </div>
               </div>

               <div style={{background:'var(--bg-body)', padding:12, borderRadius:8, marginBottom:16, border:'1px solid var(--border)'}}>
                  <div style={{display:'flex', alignItems:'center', gap:8, color:'var(--text-main)', fontSize:'0.9rem', marginBottom:10, fontWeight:500}}>
                     <MapPin size={16} color="var(--primary)"/> {s.location || 'No Location'}
                  </div>
                  <div style={{fontSize:'0.8rem', color:'var(--text-muted)'}}>
                     {s.tanks?.length > 0 ? `${s.tanks.length} Tanks Configured` : 'No tanks connected'}
                  </div>
               </div>
               <div style={{display:'flex', gap:10}}>
                  <button className="btn btn-secondary" style={{flex:1}} onClick={()=>setModal(s)}>Edit Configuration</button>
                  {user.role !== 'Staff' && <button className="btn btn-danger" onClick={()=>deleteSt(s.station_id)}><Trash2 size={16}/></button>}
               </div>
            </div>
         ))}
      </div>
      {modal && <StationModal data={modal} tankTypes={tankTypes} close={()=>setModal(null)} toast={toast} settings={settings} refresh={refresh} />}
    </div>
  );
};

const StationModal = ({ data, tankTypes, close, toast, settings, refresh }) => {
   const { user } = useContext(AuthContext);
   const { stations } = useContext(DataContext);
   const [form, setForm] = useState(data.station_id ? data : { name:'', location:'', theme:'bpcl', manager_user:'', manager_pass:'', tanks:[] });

   const save = async () => {
      // VALIDATION
      if (!form.name || !form.manager_user || !form.manager_pass) {
          return toast("Missing Fields: Name, Username, or Password", "error");
      }

      const isNew = !form.station_id;
      const p = {...form}; 
      if(isNew) p.station_id = `ST-${Math.floor(Math.random()*9999)}`;
      
      let changes = [];
      if (!isNew) {
         const old = stations.find(s => s.station_id === p.station_id) || {};
         if (old.name !== p.name) changes.push(`- Name: ${old.name} -> ${p.name}`);
         if (old.manager_pass !== p.manager_pass) changes.push(`- Password changed`);
         if (JSON.stringify(old.tanks) !== JSON.stringify(p.tanks)) changes.push(`- Tanks updated (${old.tanks?.length || 0} -> ${p.tanks?.length || 0})`);
      }

      const { error } = await supabase.from('stations').upsert(p);
      if(error) toast(error.message, "error"); 
      else { 
         toast("Saved Successfully", "success"); 
         const event = isNew ? 'STATION_CREATED' : 'STATION_UPDATED';
         const logData = isNew 
            ? { name: p.name, id: p.station_id, manager: p.manager_user, user: user.name, discordId: user.discord }
            : { name: p.name, id: p.station_id, user: user.name, discordId: user.discord, changes: changes.join('\n') || 'Minor updates' };
         sendLog(settings.webhook_url, event, logData);
         refresh(); // Force immediate update
         close(); 
      }
   };

   const addTank = () => { const current = form.tanks || []; setForm({...form, tanks: [...current, { name: '', type: tankTypes[0] || 'MS_15KL' }]}); };

   return (
      <div className="modal-overlay">
         <div className="modal-box">
            <div style={{display:'flex', justifyContent:'space-between', marginBottom:25}}><h3>{data.station_id?'Edit':'Create'} Station</h3><button onClick={close} style={{background:'none', border:'none', cursor:'pointer'}}><X/></button></div>
            <div style={{display:'grid', gridTemplateColumns:'2fr 1fr', gap:20}}>
               <div><label>Station Name</label><input className="app-input" value={form.name} onChange={e=>setForm({...form,name:e.target.value})} placeholder="e.g. Royal Fuel"/></div>
               <div><label>Brand</label><select className="app-input" value={form.theme} onChange={e=>setForm({...form,theme:e.target.value})}><option value="bpcl">BPCL</option><option value="iocl">IOCL</option><option value="hpcl">HPCL</option><option value="jio">JIO</option></select></div>
            </div>
            <label>Location / Notes</label><input className="app-input" value={form.location} onChange={e=>setForm({...form,location:e.target.value})} placeholder="City, Highway no..."/>
            <div style={{background:'var(--bg-body)', padding:20, borderRadius:12, marginBottom:25, border:'1px solid var(--border)'}}>
               <label>Manager Credentials</label>
               <div style={{display:'flex', gap:15}}>
                  <input className="app-input" placeholder="Username" value={form.manager_user} onChange={e=>setForm({...form,manager_user:e.target.value})} style={{marginBottom:0}}/>
                  <input className="app-input" placeholder="Password" value={form.manager_pass} onChange={e=>setForm({...form,manager_pass:e.target.value})} style={{marginBottom:0}}/>
               </div>
            </div>
            <label>Tank Configuration</label>
            <div style={{marginBottom:15}}>
               {(form.tanks || []).map((t, i) => (
                  <div key={i} style={{display:'flex', gap:10, marginBottom:10}}>
                     <input className="app-input" value={t.name} onChange={e=>{const n=[...form.tanks];n[i].name=e.target.value;setForm({...form,tanks:n})}} placeholder="Tank Name" style={{marginBottom:0}}/>
                     <select className="app-input" value={t.type} onChange={e=>{const n=[...form.tanks];n[i].type=e.target.value;setForm({...form,tanks:n})}} style={{marginBottom:0}}>
                        {tankTypes.map(tt => <option key={tt} value={tt}>{tt}</option>)}
                     </select>
                     <button className="btn btn-danger" onClick={()=>{const n=form.tanks.filter((_,x)=>x!==i);setForm({...form,tanks:n})}}><Trash2 size={16}/></button>
                  </div>
               ))}
               <button className="btn btn-secondary" style={{width:'100%', borderStyle:'dashed', borderColor:'var(--primary)', color:'var(--primary)'}} onClick={addTank}>+ Add Tank</button>
            </div>
            <div style={{display:'flex', justifyContent:'flex-end', gap:10}}>
               <button className="btn btn-secondary" onClick={close}>Cancel</button>
               <button className="btn btn-primary" onClick={save}>Save Changes</button>
            </div>
         </div>
      </div>
   );
};

const SettingsPage = () => {
   const { settings, charts, refresh } = useContext(DataContext);
   const [tab, setTab] = useState('comm'); // Default to Communication
   const [webhook, setWebhook] = useState(settings.webhook_url || '');
   const [inputs, setInputs] = useState({ density: '', chart: '' });
   const [broadcast, setBroadcast] = useState(settings.broadcast_msg || '');
   const [bType, setBType] = useState(settings.broadcast_type || 'info');

   const toast = useContext(ToastContext);
   const showConfirm = useContext(UIContext);
   const { user } = useContext(AuthContext);

   // Sync remote state
   useEffect(() => { 
       setWebhook(settings.webhook_url || ''); 
       setBroadcast(settings.broadcast_msg || '');
       setBType(settings.broadcast_type || 'info');
   }, [settings]);

   // Permissions Check
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
      // Only Owner can upload assets
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

   // Staff View: Simplified
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

   // Colors for Broadcast Buttons
   const getBtnStyle = (type) => {
       const isActive = bType === type;
       let style = { flex:1, textAlign:'center', padding:8, borderRadius:6, cursor:'pointer', fontWeight:600, textTransform:'uppercase', fontSize:'0.75rem', border:'1px solid var(--border)', transition:'0.2s' };
       
       if (isActive) {
           style.border = '2px solid transparent';
           if(type === 'info') { style.background = '#dbeafe'; style.color = '#1e40af'; style.borderColor = '#93c5fd'; } // Blue
           if(type === 'warning') { style.background = '#ffedd5'; style.color = '#9a3412'; style.borderColor = '#fdba74'; } // Orange
           if(type === 'critical') { style.background = '#fee2e2'; style.color = '#991b1b'; style.borderColor = '#fca5a5'; } // Red
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
             // HIDE CONTENT FOR MODERATORS
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

const Team = () => {
   const { admins, settings, refresh } = useContext(DataContext);
   const [modal, setModal] = useState({ open: false, data: null });
   const [form, setForm] = useState({ name: '', phone: '', pin: '', role: 'Staff' });
   const toast = useContext(ToastContext);
   const showConfirm = useContext(UIContext);
   const { user } = useContext(AuthContext);

   const openModal = (data = null) => {
      setForm(data ? data : { name: '', phone: '', pin: '', role: 'Staff' });
      setModal({ open: true, data });
   };

   const saveMember = async () => {
      if(user.role !== 'Owner') return toast("Access Denied", "error");
      if(!form.name || !form.phone || !form.pin) return toast("Fill all fields", "error");
      const { error } = await supabase.from('admins').upsert(form);
      if(error) toast(error.message, "error"); 
      else { 
         toast("Member Saved", "success"); 
         setModal({open:false, data:null});
         sendLog(settings.webhook_url, 'TEAM_ADD', { name: form.name, role: form.role, user: user.name, discordId: user.discord });
         refresh(); // Force immediate update
      }
   };

   const removeMember = (admin) => {
      if(user.role !== 'Owner') return toast("Access Denied", "error");
      if(admin.phone === BOSS_PHONE) return toast("Cannot remove the Owner.", "error");
      showConfirm("Revoke Access?", `Remove ${admin.name}?`, async () => {
         await supabase.from('admins').delete().eq('id', admin.id); 
         toast("Removed", "success");
         sendLog(settings.webhook_url, 'TEAM_REMOVE', { user: user.name, discordId: user.discord });
         refresh(); // Force immediate update
      });
   };

   return (
      <div>
         <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20}}>
            <h2 style={{margin:0}}>Security Team</h2>
            {user.role === 'Owner' && <button className="btn btn-primary" onClick={()=>openModal(null)}>+ Add Member</button>}
         </div>
         <div className="card" style={{padding:0, overflow:'hidden'}}>
            <table style={{width:'100%', borderCollapse:'collapse'}}>
               <thead style={{background:'var(--bg-body)', borderBottom:'1px solid var(--border)'}}>
                  <tr><th style={{padding:16, textAlign:'left', color:'var(--text-muted)'}}>Name</th><th style={{padding:16, textAlign:'left', color:'var(--text-muted)'}}>Phone ID</th><th style={{padding:16, textAlign:'left', color:'var(--text-muted)'}}>Role</th><th style={{width:100}}></th></tr>
               </thead>
               <tbody>
                  {admins.map(a => (
                     <tr key={a.id} style={{borderBottom:'1px solid var(--border)'}}>
                        <td style={{padding:16, fontWeight:500}}>{a.name}</td>
                        <td style={{padding:16}}>{a.phone}</td>
                        <td style={{padding:16}}><span style={{background:a.role==='Owner'?'rgba(245, 158, 11, 0.1)':'rgba(99, 102, 241, 0.1)', color:a.role==='Owner'?'#f59e0b':'#6366f1', padding:'4px 8px', borderRadius:4, fontSize:'0.8rem', fontWeight:700}}>{a.role}</span></td>
                        <td style={{padding:16, display:'flex', gap:10}}>
                           {user.role === 'Owner' && (
                              <>
                                 <button className="btn-secondary" style={{padding:6, borderRadius:4}} onClick={()=>openModal(a)}><Edit2 size={16}/></button>
                                 {a.phone !== BOSS_PHONE && ( 
                                    <button className="btn-danger" style={{padding:6, borderRadius:4}} onClick={()=>removeMember(a)}><Trash2 size={16}/></button>
                                 )}
                              </>
                           )}
                        </td>
                     </tr>
                  ))}
               </tbody>
            </table>
         </div>
         {modal.open && (
            <div className="modal-overlay">
               <div className="modal-box">
                  <h3>{modal.data ? 'Edit' : 'Add'} Team Member</h3>
                  <div style={{marginTop:20}}>
                     <label>Full Name</label>
                     <input className="app-input" value={form.name} onChange={e=>setForm({...form,name:e.target.value})} placeholder="Name"/>
                     <label>Login ID (Alphanumeric)</label>
                     <input className="app-input" value={form.phone} onChange={e=>setForm({...form,phone:e.target.value})} placeholder="e.g. BOSS, 9876543210, ADMIN_1" disabled={form.phone===BOSS_PHONE}/> 
                     <label>PIN Code</label>
                     <input className="app-input" value={form.pin} onChange={e=>setForm({...form,pin:e.target.value})} placeholder="4-6 Digits"/>
                     <label>Role</label>
                     <select className="app-input" value={form.role} onChange={e=>setForm({...form,role:e.target.value})} disabled={form.phone===BOSS_PHONE}>
                        <option>Staff</option><option>Moderator</option>
                     </select>
                  </div>
                  <div style={{display:'flex', justifyContent:'flex-end', gap:10, marginTop:20}}>
                     <button className="btn btn-secondary" onClick={()=>setModal({open:false, data:null})}>Cancel</button>
                     <button className="btn btn-primary" onClick={saveMember}>Save User</button>
                  </div>
               </div>
            </div>
         )}
      </div>
   );
};

const Login = ({ onLogin }) => {
   const [creds, setCreds] = useState({phone:'', pin:''});
   const [remember, setRemember] = useState(false);
   const [err, setErr] = useState('');
   const [showPass, setShowPass] = useState(false);
   const [loading, setLoading] = useState(false);
   
   // Load saved credentials on mount
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

export default function App() {
  const [user, setUser] = useState(null);
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
     const s = localStorage.getItem('fm_user'); if(s) setUser(JSON.parse(s));
     const d = localStorage.getItem('fm_dark'); if(d === 'true') { setIsDark(true); document.body.classList.add('dark'); }
  }, []);

  const toggleTheme = () => {
     const n = !isDark; setIsDark(n);
     if(n) document.body.classList.add('dark'); else document.body.classList.remove('dark');
     localStorage.setItem('fm_dark', n);
  };

  return (
    <ThemeContext.Provider value={{ isDark, toggleTheme }}>
      <AuthContext.Provider value={{ user, logout: () => { setUser(null); localStorage.removeItem('fm_user'); } }}>
        <ModalProvider>
          <Router>
            <ToastProvider>
              {!user ? <Login onLogin={(u) => { setUser(u); localStorage.setItem('fm_user', JSON.stringify(u)); }} /> : (
                <DataProvider>
                  <Layout>
                    <Routes>
                      <Route path="/" element={<Dashboard />} />
                      <Route path="/stations" element={<Stations />} />
                      <Route path="/team" element={<Team />} />
                      <Route path="/settings" element={<SettingsPage />} />
                      <Route path="*" element={<Navigate to="/" />} />
                    </Routes>
                  </Layout>
                </DataProvider>
              )}
            </ToastProvider>
          </Router>
        </ModalProvider>
      </AuthContext.Provider>
    </ThemeContext.Provider>
  );
}