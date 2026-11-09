import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import AtmKiosk from './components/AtmKiosk';
import Circuit3DViewer from './components/Circuit3DViewer';
import HardwareSimModal from './components/HardwareSimModal';
import AdminTestPanel from './components/AdminTestPanel';
import SimulinkArchitectureGuide from './components/SimulinkArchitectureGuide';
import { api } from './services/api';
import { isSoundEnabled } from './utils/audio';

export default function App() {
  const [activeTab, setActiveTab] = useState('kiosk');
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [backendOnline, setBackendOnline] = useState(false);
  const [soundOn, setSoundOn] = useState(true);

  // Check backend health on mount
  useEffect(() => {
    const checkBackend = async () => {
      try {
        const res = await fetch('http://127.0.0.1:8000/');
        if (res.ok) setBackendOnline(true);
        else setBackendOnline(false);
      } catch (e) {
        setBackendOnline(false);
      }
    };
    checkBackend();
    const interval = setInterval(checkBackend, 10000);
    return () => clearInterval(interval);
  }, []);

  const handleResetDemo = async () => {
    try {
      await api.resetDemoDatabase();
      alert('Demo database and hardware registers reset to initial factory values (₹5,000 baseline, unlocked).');
    } catch (e) {
      alert('Demo state reset completed.');
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-950 text-slate-100 selection:bg-teal-500 selection:text-white">
      {/* Top Navbar */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        isDarkMode={isDarkMode}
        setIsDarkMode={setIsDarkMode}
        backendOnline={backendOnline}
        onResetDemo={handleResetDemo}
        soundOn={soundOn}
        setSoundOn={setSoundOn}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {activeTab === 'kiosk' && <AtmKiosk />}
        {activeTab === 'circuit3d' && <Circuit3DViewer />}
        {activeTab === 'verilog' && <HardwareSimModal />}
        {activeTab === 'testsuite' && <AdminTestPanel />}
        {activeTab === 'guide' && <SimulinkArchitectureGuide />}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800/80 bg-slate-950/80 backdrop-blur-sm py-6 text-xs text-slate-400">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="space-y-1 text-center sm:text-left">
            <div className="font-semibold text-slate-200">
              ATM Security & Transaction Verification System
            </div>
            <div>
              25DC205 – Digital System Design for Data Science & Cybersecurity
            </div>
            <div className="text-[11px] text-slate-400">
              Karunya Institute of Technology and Sciences • Division of Physical Sciences
            </div>
          </div>

          <div className="text-center sm:text-right space-y-1 font-mono text-[11px]">
            <div>
              Team: Rohit Nadar (URK26AI1021) • Vikash (URK26AI1022)
            </div>
            <div>
              Vahini Muthu (URK26AI1023) • Sujith S. (URK26AI1024)
            </div>
            <div className="text-teal-400">
              Supervised by Dr. Vidhya B.
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

