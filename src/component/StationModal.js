import React, { useState, useContext, useEffect } from 'react';
import { X, Trash2 } from 'lucide-react';
import { supabase } from '../supabase';
import { AuthContext } from '../context/AuthContext';
import { DataContext } from '../context/DataContext';
import { sendLog } from '../logs';

export const StationModal = ({ data, tankTypes, close, toast, settings, refresh }) => {
   const { user } = useContext(AuthContext);
   const { stations } = useContext(DataContext);
   
   // FIX 1: Deep Copy 'data' so editing form doesn't change 'stations' context/history
   const [form, setForm] = useState(() => {
       if (data.station_id) {
           return JSON.parse(JSON.stringify(data)); // Complete clone
       }
       return { name:'', location:'', theme:'bpcl', manager_user:'', manager_pass:'', tanks:[] };
   });

   const save = async () => {
      // 1. Validation
      if (!form.name || !form.manager_user || !form.manager_pass) {
          return toast("Missing Fields: Name, Username, or Password", "error");
      }

      const isNew = !form.station_id;
      const stationData = { ...form }; 
      if(isNew) stationData.station_id = "ST-" + Math.floor(Math.random() * 10000);
      
      // 2. DETAILED CHANGE LOGGING
      let changes = [];
      
      if (!isNew) {
         // Get the CLEAN original data from Context (unaffected by form edits now)
         const oldSt = stations.find(s => s.station_id === stationData.station_id) || {};
         
         // --- BASIC FIELDS ---
         if(oldSt.name !== stationData.name) changes.push(`- Name: ${oldSt.name} ➝ ${stationData.name}`);
         if((oldSt.location||'') !== stationData.location) changes.push(`- Location: ${oldSt.location||'None'} ➝ ${stationData.location||'None'}`);
         if(oldSt.theme !== stationData.theme) changes.push(`- Theme: ${oldSt.theme} ➝ ${stationData.theme}`);
         if(oldSt.manager_user !== stationData.manager_user) changes.push(`- User: ${oldSt.manager_user} ➝ ${stationData.manager_user}`);
         if(oldSt.manager_pass !== stationData.manager_pass) changes.push(`- Password: *(Changed)*`);

         // --- TANKS ANALYSIS ---
         const oldTanks = oldSt.tanks || [];
         const newTanks = stationData.tanks || [];

         if (oldTanks.length !== newTanks.length) {
             changes.push(`- Tank Count: ${oldTanks.length} ➝ ${newTanks.length}`);
         }

         const maxLen = Math.max(oldTanks.length, newTanks.length);

         for (let i = 0; i < maxLen; i++) {
             const oldT = oldTanks[i];
             const newT = newTanks[i];

             // Added
             if (!oldT && newT) {
                 changes.push(`+ Added Tank: "${newT.name}" (\`${newT.type}\`)`);
                 continue;
             }
             // Removed
             if (oldT && !newT) {
                 changes.push(`- Removed Tank: "${oldT.name}" (\`${oldT.type}\`)`);
                 continue;
             }
             // Modified
             if (oldT && newT) {
                 // Check Name Change
                 if (oldT.name !== newT.name) {
                     changes.push(`~ Tank #${i+1} Renamed: "${oldT.name}" ➝ "${newT.name}"`);
                 }
                 // Check Type/Size Change (THE FIX WORKED HERE)
                 if (oldT.type !== newT.type) {
                     const tName = oldT.name || `Tank #${i+1}`;
                     changes.push(`~ ${tName} Size: \`${oldT.type}\` ➝ \`${newT.type}\``);
                 }
             }
         }
      }

      // 3. Save to Supabase
      const { error } = await supabase.from('stations').upsert(stationData);
      
      if(error) {
         toast(error.message, "error"); 
      } else { 
         toast("Saved Successfully", "success"); 
         
         const event = isNew ? 'STATION_CREATED' : 'STATION_UPDATED';
         const changeLog = changes.length > 0 ? changes.join('\n') : 'No significant changes detected.';
         
         const logData = isNew 
            ? { name: stationData.name, id: stationData.station_id, manager: stationData.manager_user, user: user.name, discordId: user.discord }
            : { name: stationData.name, id: stationData.station_id, user: user.name, discordId: user.discord, changes: changeLog };
         
         sendLog(settings.webhook_url, event, logData);
         refresh(); 
         close(); 
      }
   };

   // FIX 2: Immutable Updates (Don't touch the original array)
   const updateTank = (index, field, value) => {
       const updatedTanks = form.tanks.map((tank, i) => {
           if (i === index) {
               return { ...tank, [field]: value }; // Create NEW object for modified tank
           }
           return tank;
       });
       setForm({ ...form, tanks: updatedTanks });
   };

   const addTank = () => { 
       setForm({...form, tanks: [...(form.tanks||[]), { name: '', type: tankTypes[0] || 'MS_15KL' }]}); 
   };

   const removeTank = (index) => {
       const updatedTanks = form.tanks.filter((_, i) => i !== index);
       setForm({...form, tanks: updatedTanks});
   };

   return (
      <div className="modal-overlay">
         <div className="modal-box">
            <div style={{display:'flex', justifyContent:'space-between', marginBottom:25}}>
                <h3>{data.station_id ? 'Edit' : 'Create'} Station</h3>
                <button onClick={close} style={{background:'none', border:'none', cursor:'pointer'}}><X/></button>
            </div>
            
            <div style={{display:'grid', gridTemplateColumns:'2fr 1fr', gap:20}}>
               <div>
                   <label>Station Name</label>
                   <input className="app-input" value={form.name} onChange={e=>setForm({...form, name:e.target.value})} placeholder="e.g. Royal Fuel"/>
               </div>
               <div>
                   <label>Brand</label>
                   <select className="app-input" value={form.theme} onChange={e=>setForm({...form, theme:e.target.value})}>
                       <option value="bpcl">BPCL</option>
                       <option value="iocl">IOCL</option>
                       <option value="hpcl">HPCL</option>
                       <option value="jio">JIO</option>
                   </select>
               </div>
            </div>

            <label>Location / Notes</label>
            <input className="app-input" value={form.location} onChange={e=>setForm({...form, location:e.target.value})} placeholder="City, Highway no..."/>
            
            <div style={{background:'var(--bg-body)', padding:20, borderRadius:12, marginBottom:25, border:'1px solid var(--border)'}}>
               <label>Manager Credentials</label>
               <div style={{display:'flex', gap:15}}>
                  <input className="app-input" placeholder="Username" value={form.manager_user} onChange={e=>setForm({...form, manager_user:e.target.value})} style={{marginBottom:0}}/>
                  <input className="app-input" placeholder="Password" value={form.manager_pass} onChange={e=>setForm({...form, manager_pass:e.target.value})} style={{marginBottom:0}}/>
               </div>
            </div>

            <label>Tank Configuration</label>
            <div style={{marginBottom:15}}>
               {(form.tanks || []).map((t, i) => (
                  <div key={i} style={{display:'flex', gap:10, marginBottom:10}}>
                     <input 
                        className="app-input" 
                        value={t.name} 
                        onChange={e => updateTank(i, 'name', e.target.value)} 
                        placeholder="Tank Name" 
                        style={{marginBottom:0}}
                     />
                     <select 
                        className="app-input" 
                        value={t.type} 
                        onChange={e => updateTank(i, 'type', e.target.value)} 
                        style={{marginBottom:0}}
                     >
                        {tankTypes.map(tt => <option key={tt} value={tt}>{tt}</option>)}
                     </select>
                     <button className="btn btn-danger" onClick={() => removeTank(i)}><Trash2 size={16}/></button>
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