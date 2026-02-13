import React from 'react';

export const ReactLoader = ({ text }) => (
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