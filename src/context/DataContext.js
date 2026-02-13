import React, { useState, useEffect, createContext } from 'react';
import { supabase } from '../supabase';
import { ReactLoader } from '../components/ui/Loader';

export const DataContext = createContext();

export const DataProvider = ({ children }) => {
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