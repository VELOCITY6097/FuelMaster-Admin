import React, { useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { Fuel, Users, ShieldCheck, AlertCircle, ArrowRight, MapPin, Clock, Server, CheckCircle2 } from 'lucide-react';
import { DataContext } from '../context/DataContext';

export const Dashboard = () => {
  const { stations, admins, settings } = useContext(DataContext);
  const navigate = useNavigate();

  const isOnline = !settings.downtime_active;

  // --- REAL DATA CALCULATIONS ---
  const totalStations = stations.length;
  const activeStations = stations.filter(s => (s.subscription_status || 'active') === 'active').length;
  
  const brands = [
      { name: 'BPCL', key: 'bpcl', color: '#f59e0b' },
      { name: 'IOCL', key: 'iocl', color: '#3b82f6' },
      { name: 'HPCL', key: 'hpcl', color: '#ef4444' },
      { name: 'Jio-bp', key: 'jio', color: '#10b981' }
  ];

  // Get the 4 most recently added stations
  const recentStations = [...stations]
      .sort((a,b) => new Date(b.created_at) - new Date(a.created_at))
      .slice(0, 4);

  return (
    <div style={{ animation: 'fadeIn 0.5s ease-in-out' }}>
      
      {/* Dashboard Header */}
      <div style={{ marginBottom: 35 }}>
         <h1 style={{ fontSize: '1.8rem', margin: '0 0 8px 0', letterSpacing: '-0.5px' }}>Command Center</h1>
         <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.95rem' }}>
            Live overview of the FuelMaster core infrastructure.
         </p>
      </div>

      {/* Top Stat Cards Grid */}
      <div style={{display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(280px, 1fr))', gap:24, marginBottom:35}}>
        
        {/* Stations Card */}
        <div className="card stat-card" style={{display:'flex', flexDirection:'column', gap:15, cursor:'pointer', position: 'relative'}} onClick={()=>navigate('/stations')}>
           <div style={{display:'flex', justifyContent:'space-between', alignItems:'flex-start'}}>
              <div style={{padding:14, background:'rgba(59, 130, 246, 0.12)', borderRadius:12, color:'#3b82f6'}}>
                 <Fuel size={28}/>
              </div>
              <div style={{display:'flex', alignItems:'center', gap:4, color:'#10b981', fontSize:'0.85rem', fontWeight:600, background:'rgba(16, 185, 129, 0.1)', padding:'4px 10px', borderRadius:20}}>
                 <CheckCircle2 size={14}/> {activeStations} Active
              </div>
           </div>
           <div>
              <div style={{fontSize:'2.2rem', fontWeight:800, lineHeight:1}}>{totalStations}</div>
              <div style={{fontSize:'0.85rem', fontWeight:600, color:'var(--text-muted)', textTransform:'uppercase', marginTop:8, letterSpacing:'0.5px'}}>Total Stations</div>
           </div>
           <ArrowRight size={18} color="var(--text-muted)" style={{position: 'absolute', right: 20, bottom: 20, opacity: 0.5}} />
        </div>

        {/* Staff Card */}
        <div className="card stat-card" style={{display:'flex', flexDirection:'column', gap:15, cursor:'pointer', position: 'relative'}} onClick={()=>navigate('/team')}>
           <div style={{display:'flex', justifyContent:'space-between', alignItems:'flex-start'}}>
              <div style={{padding:14, background:'rgba(245, 158, 11, 0.12)', borderRadius:12, color:'#f59e0b'}}>
                 <Users size={28}/>
              </div>
           </div>
           <div>
              <div style={{fontSize:'2.2rem', fontWeight:800, lineHeight:1}}>{admins.length}</div>
              <div style={{fontSize:'0.85rem', fontWeight:600, color:'var(--text-muted)', textTransform:'uppercase', marginTop:8, letterSpacing:'0.5px'}}>Authorized Staff</div>
           </div>
           <ArrowRight size={18} color="var(--text-muted)" style={{position: 'absolute', right: 20, bottom: 20, opacity: 0.5}} />
        </div>

        {/* System Status Card */}
        <div className="card" style={{display:'flex', flexDirection:'column', gap:15, border: isOnline ? '1px solid rgba(16, 185, 129, 0.2)' : '1px solid rgba(239, 68, 68, 0.2)'}}>
           <div style={{display:'flex', justifyContent:'space-between', alignItems:'flex-start'}}>
              <div style={{padding:14, background: isOnline ? 'rgba(16, 185, 129, 0.12)' : 'rgba(239, 68, 68, 0.12)', borderRadius:12, color: isOnline ? '#10b981' : '#ef4444'}}>
                 {isOnline ? <ShieldCheck size={28}/> : <AlertCircle size={28}/>}
              </div>
              <span className="pulse-dot" style={{
                  height: 10, width: 10, borderRadius: '50%', backgroundColor: isOnline ? '#10b981' : '#ef4444', 
                  boxShadow: isOnline ? '0 0 10px #10b981' : '0 0 10px #ef4444', marginTop: 10, marginRight: 5
              }}></span>
           </div>
           <div>
              <div style={{fontSize:'2.2rem', fontWeight:800, lineHeight:1, color: isOnline ? '#10b981' : '#ef4444'}}>
                 {isOnline ? 'Operational' : 'Offline'}
              </div>
              <div style={{fontSize:'0.85rem', fontWeight:600, color:'var(--text-muted)', textTransform:'uppercase', marginTop:8, letterSpacing:'0.5px'}}>
                 Core Database Status
              </div>
           </div>
        </div>

      </div>

      {/* Main Content Grid: 2 Columns for Modern Layout */}
      <div style={{display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(400px, 1fr))', gap:24}}>
        
        {/* Network Distribution (Progress Bars) */}
        <div className="card" style={{ padding: '24px 30px' }}>
           <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 25 }}>
              <Server size={20} color="var(--primary)"/>
              <h3 style={{ margin: 0, fontSize: '1.1rem' }}>Network Distribution</h3>
           </div>

           <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              {brands.map(brand => {
                 const count = stations.filter(s => s.theme === brand.key).length;
                 const percent = totalStations > 0 ? Math.round((count / totalStations) * 100) : 0;
                 
                 return (
                    <div key={brand.key}>
                       <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: '0.9rem', fontWeight: 600 }}>
                          <span>{brand.name}</span>
                          <span style={{ color: 'var(--text-muted)' }}>{count} ({percent}%)</span>
                       </div>
                       <div style={{ width: '100%', height: 8, background: 'var(--bg-body)', borderRadius: 4, overflow: 'hidden' }}>
                          <div style={{ width: `${percent}%`, height: '100%', background: brand.color, borderRadius: 4, transition: 'width 1s ease-out' }}></div>
                       </div>
                    </div>
                 )
              })}
              {totalStations === 0 && <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem', textAlign: 'center', padding: '20px 0' }}>No stations configured yet.</div>}
           </div>
        </div>

        {/* Recent Deployments List */}
        <div className="card" style={{ padding: '24px 30px' }}>
           <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 25 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                 <Clock size={20} color="var(--primary)"/>
                 <h3 style={{ margin: 0, fontSize: '1.1rem' }}>Recent Deployments</h3>
              </div>
              <button 
                 onClick={() => navigate('/stations')} 
                 style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600 }}
              >
                 View All
              </button>
           </div>

           <div style={{ display: 'flex', flexDirection: 'column', gap: 15 }}>
              {recentStations.length > 0 ? recentStations.map(station => (
                 <div key={station.station_id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', background: 'var(--bg-body)', borderRadius: 8, border: '1px solid var(--border)' }}>
                    <div>
                       <div style={{ fontWeight: 700, fontSize: '0.95rem', marginBottom: 4 }}>{station.name}</div>
                       <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                          <MapPin size={12}/> {station.location || 'Location Not Set'}
                       </div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 5 }}>
                       <span style={{ fontSize: '0.7rem', fontWeight: 800, padding: '2px 8px', borderRadius: 12, textTransform: 'uppercase', background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6' }}>
                          {station.theme}
                       </span>
                       <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontFamily: 'monospace' }}>
                          {station.station_id}
                       </span>
                    </div>
                 </div>
              )) : (
                 <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem', textAlign: 'center', padding: '20px 0' }}>
                    No recent activity.
                 </div>
              )}
           </div>
        </div>

      </div>
    </div>
  );
};