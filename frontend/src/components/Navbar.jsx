import React from 'react';
import { 
  ShieldCheck, 
  Cpu, 
  Box, 
  CheckCircle2, 
  BookOpen, 
  Volume2, 
  VolumeX, 
  Sun, 
  Moon, 
  RotateCcw,
  Activity
} from 'lucide-react';
import { isSoundEnabled, toggleSound, playKeyBeep } from '../utils/audio';

export default function Navbar({ 
  activeTab, 
  setActiveTab, 
  isDarkMode, 
  setIsDarkMode, 
  backendOnline, 
  onResetDemo,
  soundOn,
  setSoundOn
}) {
  const handleSoundToggle = () => {
    const next = toggleSound();
    setSoundOn(next);
    if (next) playKeyBeep(1400, 0.08);
  };

  const navItems = [
    { id: 'kiosk', label: 'ATM Terminal', icon: ShieldCheck, badge: 'Main UI' },
    { id: 'circuit3d', label: '3D Circuit Explorer', icon: Box, badge: 'Three.js' },
    { id: 'verilog', label: 'Hardware Sim', icon: Cpu, badge: 'atm_bank.v' },
    { id: 'testsuite', label: 'FR-01..12 Suite', icon: CheckCircle2, badge: '100% Pass' },
    { id: 'guide', label: 'Simulink Guide', icon: BookOpen, badge: 'Sections A-F' },
  ];

  return (
    <header className="sticky top-0 z-50 backdrop-blur-md bg-slate-900/90 dark:bg-slate-950/90 border-b border-slate-800 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          
          {/* Brand Logo & Course Details */}
          <div className="flex items-center space-x-3 cursor-pointer" onClick={() => setActiveTab('kiosk')}>
            <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-teal-500 to-cyan-400 flex items-center justify-center shadow-lg shadow-teal-500/20">
              <ShieldCheck className="h-6 w-6 text-slate-950 stroke-[2.2]" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-bold text-base sm:text-lg tracking-tight text-white font-['Chakra_Petch']">
                  ATM SECURITY & VERIFICATION
                </span>
                <span className="hidden md:inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-teal-500/10 text-teal-400 border border-teal-500/30">
                  DSD 25DC205
                </span>
              </div>
              <p className="text-xs text-slate-400 hidden sm:block">
                Karunya University • Rohit Nadar, Vikash, Vahini, Sujith • Supervisor: Dr. Vidhya B.
              </p>
            </div>
          </div>

          {/* Nav Tabs */}
          <nav className="hidden lg:flex items-center space-x-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    playKeyBeep(1000, 0.04);
                    setActiveTab(item.id);
                  }}
                  className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                    isActive
                      ? 'bg-teal-500/20 text-teal-300 border border-teal-500/40 shadow-sm shadow-teal-500/10'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                  }`}
                >
                  <Icon className={`h-4 w-4 ${isActive ? 'text-teal-400' : 'text-slate-400'}`} />
                  <span>{item.label}</span>
                  {item.badge && (
                    <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                      isActive ? 'bg-teal-400/20 text-teal-300' : 'bg-slate-800 text-slate-500'
                    }`}>
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          {/* Right Action Tools: Backend Status, Audio, Theme, Reset */}
          <div className="flex items-center space-x-2 sm:space-x-3">
            {/* Backend status pill */}
            <div 
              title={backendOnline ? "FastAPI Backend is Online" : "FastAPI Backend Offline (Using Browser Engine)"}
              className={`flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${
                backendOnline 
                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' 
                  : 'bg-amber-500/10 text-amber-400 border-amber-500/30'
              }`}
            >
              <span className={`h-2 w-2 rounded-full ${backendOnline ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
              <span className="hidden sm:inline">{backendOnline ? 'Backend Online' : 'Local Fallback'}</span>
            </div>

            {/* Sound toggle */}
            <button
              onClick={handleSoundToggle}
              title={soundOn ? "Sound Effects ON (Click to Mute)" : "Sound Effects MUTED (Click to Enable)"}
              className="p-2 rounded-lg bg-slate-800/80 hover:bg-slate-750 text-slate-300 hover:text-teal-400 border border-slate-700/60 transition-colors"
            >
              {soundOn ? <Volume2 className="h-4 w-4 text-teal-400" /> : <VolumeX className="h-4 w-4 text-slate-500" />}
            </button>

            {/* Reset Demo button */}
            <button
              onClick={() => {
                playKeyBeep(800, 0.05);
                onResetDemo();
              }}
              title="Reset Demo State to Initial Factory State (₹5,000 baseline, unlocked)"
              className="hidden sm:flex items-center space-x-1.5 px-2.5 py-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-750 text-slate-300 hover:text-white border border-slate-700/60 text-xs font-medium transition-colors"
            >
              <RotateCcw className="h-3.5 w-3.5 text-slate-400" />
              <span>Reset State</span>
            </button>
          </div>
        </div>

        {/* Mobile Navigation bar */}
        <div className="lg:hidden flex items-center justify-around py-2 border-t border-slate-800/80 overflow-x-auto space-x-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  playKeyBeep(1000, 0.04);
                  setActiveTab(item.id);
                }}
                className={`flex flex-col items-center py-1 px-2 rounded text-[11px] font-medium whitespace-nowrap ${
                  isActive ? 'text-teal-400' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Icon className="h-4 w-4 mb-0.5" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>

      </div>
    </header>
  );
}

