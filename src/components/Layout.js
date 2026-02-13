import React, { useState, useContext } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Layers, LayoutDashboard, Fuel, Users, Settings, LogOut, Moon, Sun, Menu } from 'lucide-react';
import { AuthContext } from '../context/AuthContext';
import { ThemeContext } from '../context/ThemeContext';
import { DateTimeDisplay } from './ui/DateTimeDisplay';

export const Layout = ({ children }) => {
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