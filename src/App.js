import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';

// Contexts
import { ThemeContext } from './context/ThemeContext';
import { AuthContext } from './context/AuthContext';
import { DataProvider } from './context/DataContext';

// UI Providers
import { ModalProvider } from './components/ui/Modal';
import { ToastProvider } from './components/ui/Toast';

// Components & Pages
import { Layout } from './components/Layout';
import { Login } from './components/Login';
import { Dashboard } from './pages/Dashboard';
import { Stations } from './pages/Stations';
import { SettingsPage } from './pages/Settings';
import { Team } from './pages/Team';

// CSS Imports (Keep your existing CSS files as they are)
import './App.css';
import './index.css';

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
              {!user ? (
                <Login onLogin={(u) => { setUser(u); localStorage.setItem('fm_user', JSON.stringify(u)); }} />
              ) : (
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
