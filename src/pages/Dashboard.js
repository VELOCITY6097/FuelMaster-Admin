import React, { useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { Fuel, Users, Activity } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { DataContext } from '../context/DataContext';

export const Dashboard = () => {
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