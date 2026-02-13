import React, { useState, useContext } from 'react';
import { Search, MapPin, Check, Copy, Trash2 } from 'lucide-react';
import { DataContext } from '../context/DataContext';
import { ToastContext, UIContext } from '../context/UIContext';
import { AuthContext } from '../context/AuthContext';
import { StationModal } from '../components/StationModal';
import { supabase } from '../supabase';
import { sendLog } from '../logs';

export const Stations = () => {
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
        refresh();
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