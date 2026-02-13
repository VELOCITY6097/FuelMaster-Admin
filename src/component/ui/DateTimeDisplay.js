import React, { useState, useEffect } from 'react';

export const DateTimeDisplay = () => {
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