import React, { useState } from 'react';
import { 
  BookOpen, 
  Layers, 
  Cpu, 
  Binary, 
  FileCheck, 
  Table as TableIcon,
  Sparkles,
  ExternalLink
} from 'lucide-react';

export default function SimulinkArchitectureGuide() {
  const [activeTab, setActiveTab] = useState('DIAGRAM'); // DIAGRAM | KMAP | FSM | ALU | MEMORY

  return (
    <div className="space-y-6 animate-fade-in max-w-5xl mx-auto">
      {/* Header */}
      <div className="bg-slate-900/90 border border-slate-800 p-6 rounded-3xl shadow-xl space-y-2">
        <div className="flex items-center space-x-2 text-teal-400 text-xs font-mono font-bold uppercase tracking-wider">
          <BookOpen className="h-4 w-4" />
          <span>Digital System Design Micro-Project Course 25DC205</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold text-white font-['Chakra_Petch']">
          Simulink & Stateflow Hardware Architecture Guide
        </h1>
        <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
          Comprehensive engineering documentation covering Sections A–F, 3-Variable K-Map Minimization, 10-State Algorithmic Stateflow Controller, ALU Arithmetic paths, and 16-bit PIPO Sequential Balance Memory.
        </p>

        {/* Tab Switcher */}
        <div className="flex items-center gap-2 pt-3 border-t border-slate-800 overflow-x-auto">
          {[
            { id: 'DIAGRAM', label: 'Circuit Schematics' },
            { id: 'KMAP', label: 'Truth Table & K-Map' },
            { id: 'FSM', label: '10-State Controller' },
            { id: 'ALU', label: 'ALU 74HC283 / 85' },
            { id: 'MEMORY', label: 'Sequential Memory (1/z)' },
            { id: 'CO', label: 'Curriculum Outcomes' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-mono font-bold whitespace-nowrap transition-all ${
                activeTab === tab.id
                  ? 'bg-teal-500 text-slate-950 shadow-md shadow-teal-500/20'
                  : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab: Circuit Schematics */}
      {activeTab === 'DIAGRAM' && (
        <div className="space-y-6">
          <div className="bg-slate-900/90 border border-slate-800 p-6 rounded-3xl shadow-xl space-y-4">
            <h3 className="text-base font-bold text-white font-['Chakra_Petch'] flex items-center space-x-2">
              <Layers className="h-4 w-4 text-teal-400" />
              <span>High-Level Modular Architecture (Simulink Model)</span>
            </h3>
            <p className="text-xs text-slate-300 leading-relaxed">
              Clean left-to-right signal flow separating user inputs, verification, control logic, arithmetic processing, sequential memory updates, and user displays.
            </p>

            <div className="rounded-2xl overflow-hidden border border-slate-800 bg-white/5 p-4 flex items-center justify-center">
              <img 
                src="/assets/ppt_image7.png" 
                alt="High-Level Modular Architecture" 
                className="max-h-80 w-auto object-contain rounded-lg shadow-md"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs font-mono pt-2">
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                <span className="text-teal-400 font-bold block mb-1">Section A: Inputs & Vault</span>
                <span className="text-slate-400">Card ID (uint32), PIN Entry (uint32), Amount (uint16), Opcode (00/01/10/11).</span>
              </div>
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                <span className="text-teal-400 font-bold block mb-1">Section B & C: Controller</span>
                <span className="text-slate-400">Dual 32-bit equality comparators and 10-state Stateflow FSM machine.</span>
              </div>
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                <span className="text-teal-400 font-bold block mb-1">Section D, E, F: ALU & Memory</span>
                <span className="text-slate-400">Magnitude comparator, 4-bit adders/subtractors, Unit Delay 1/z register, and display lamps.</span>
              </div>
            </div>
          </div>

          {/* Original Verification Circuit Image */}
          <div className="bg-slate-900/90 border border-slate-800 p-6 rounded-3xl shadow-xl space-y-4">
            <h3 className="text-base font-bold text-white font-['Chakra_Petch']">
              Combinational Verification Subsystem (Section B)
            </h3>
            <div className="rounded-2xl overflow-hidden border border-slate-800 bg-white/5 p-4 flex items-center justify-center">
              <img 
                src="/assets/ppt_image8.png" 
                alt="Verification Circuit" 
                className="max-h-56 w-auto object-contain rounded-lg shadow-md"
              />
            </div>
            <p className="text-xs text-slate-300 font-mono text-center">
              Boolean Equation: <strong className="text-teal-400">AUTH_SUCCESS = PIN_VALID (A) · CARD_VALID (B)</strong>
            </p>
          </div>
        </div>
      )}

      {/* Tab: Truth Table & K-Map */}
      {activeTab === 'KMAP' && (
        <div className="bg-slate-900/90 border border-slate-800 p-6 rounded-3xl shadow-xl space-y-5">
          <div className="flex items-center space-x-2 text-teal-400 text-xs font-mono font-bold uppercase">
            <TableIcon className="h-4 w-4" />
            <span>Boolean Minimization & Verification Truth Table</span>
          </div>

          <h3 className="text-xl font-bold text-white font-['Chakra_Petch']">
            3-Variable Karnaugh Map Optimization
          </h3>
          <p className="text-xs text-slate-300 leading-relaxed">
            The multi-stage authorization gate considers three fundamental system variables:
            PIN Match (A), Card Identification (B), and Sufficient Balance (C). Approval (Y) is granted exclusively when all conditions are satisfied.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Truth Table */}
            <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-950 p-4">
              <span className="text-xs font-mono font-bold text-teal-400 block mb-2">
                8-Minterm Truth Table
              </span>
              <table className="w-full text-left text-xs font-mono">
                <thead>
                  <tr className="text-slate-400 border-b border-slate-800">
                    <th className="py-1 px-2">Minterm</th>
                    <th className="py-1 px-2">PIN (A)</th>
                    <th className="py-1 px-2">Card (B)</th>
                    <th className="py-1 px-2">Bal (C)</th>
                    <th className="py-1 px-2 text-right">Approval (Y)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-850">
                  {[
                    { m: 'm0', a: 0, b: 0, c: 0, y: 0 },
                    { m: 'm1', a: 0, b: 0, c: 1, y: 0 },
                    { m: 'm2', a: 0, b: 1, c: 0, y: 0 },
                    { m: 'm3', a: 0, b: 1, c: 1, y: 0 },
                    { m: 'm4', a: 1, b: 0, c: 0, y: 0 },
                    { m: 'm5', a: 1, b: 0, c: 1, y: 0 },
                    { m: 'm6', a: 1, b: 1, c: 0, y: 0 },
                    { m: 'm7', a: 1, b: 1, c: 1, y: 1 },
                  ].map(row => (
                    <tr key={row.m} className={row.y ? "bg-teal-500/10 font-bold" : ""}>
                      <td className="py-1 px-2 text-slate-500">{row.m}</td>
                      <td className="py-1 px-2 text-white">{row.a}</td>
                      <td className="py-1 px-2 text-white">{row.b}</td>
                      <td className="py-1 px-2 text-white">{row.c}</td>
                      <td className={`py-1 px-2 text-right ${row.y ? "text-emerald-400" : "text-slate-500"}`}>
                        {row.y}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* K-Map Matrix */}
            <div className="bg-slate-950 p-5 rounded-2xl border border-slate-800 space-y-4">
              <span className="text-xs font-mono font-bold text-teal-400 block">
                3-Variable Karnaugh Map Grid (A \ BC)
              </span>

              <div className="grid grid-cols-5 text-center text-xs font-mono gap-1">
                <div className="p-2 text-slate-500 font-bold">A \ BC</div>
                <div className="p-2 text-slate-400">00</div>
                <div className="p-2 text-slate-400">01</div>
                <div className="p-2 text-slate-400">11</div>
                <div className="p-2 text-slate-400">10</div>

                <div className="p-2 text-slate-400 font-bold">0</div>
                <div className="p-2 bg-slate-900 rounded border border-slate-800 text-slate-500">0</div>
                <div className="p-2 bg-slate-900 rounded border border-slate-800 text-slate-500">0</div>
                <div className="p-2 bg-slate-900 rounded border border-slate-800 text-slate-500">0</div>
                <div className="p-2 bg-slate-900 rounded border border-slate-800 text-slate-500">0</div>

                <div className="p-2 text-slate-400 font-bold">1</div>
                <div className="p-2 bg-slate-900 rounded border border-slate-800 text-slate-500">0</div>
                <div className="p-2 bg-slate-900 rounded border border-slate-800 text-slate-500">0</div>
                <div className="p-2 bg-teal-500/20 text-teal-300 font-black rounded border-2 border-teal-400 shadow-lg shadow-teal-500/20 scale-105">
                  1 (m7)
                </div>
                <div className="p-2 bg-slate-900 rounded border border-slate-800 text-slate-500">0</div>
              </div>

              <div className="p-3 bg-slate-900 rounded-xl border border-slate-800 space-y-1 text-xs font-mono">
                <div className="text-slate-400">Canonical SOP: <strong className="text-white">Y = Σ m(7)</strong></div>
                <div className="text-emerald-400 font-bold">Minimized Boolean Equation: Y = A · B · C</div>
                <div className="text-slate-500 text-[10px]">Rejection signal is generated via inverter: Ȳ = (A · B · C)'</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab: FSM Controller */}
      {activeTab === 'FSM' && (
        <div className="bg-slate-900/90 border border-slate-800 p-6 rounded-3xl shadow-xl space-y-4">
          <h3 className="text-xl font-bold text-white font-['Chakra_Petch']">
            Stateflow Finite State Machine (FSM) Controller
          </h3>
          <p className="text-xs text-slate-300 leading-relaxed">
            Central processing algorithmic controller dictating system state progressions, operational handshaking, ALU branching, and memory write-enables.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-xs font-mono">
            {[
              { id: 'S0', name: 'S_IDLE', desc: 'Wait for card insert & transaction start trigger.' },
              { id: 'S1', name: 'S_VERIFY', desc: 'Evaluate card ID and PIN equality comparators.' },
              { id: 'S2', name: 'S_SELECT', desc: 'Decode user transaction choice opcode (00/01/10/11).' },
              { id: 'S3', name: 'S_WITHDRAW', desc: 'Check daily limit & magnitude comparator (A >= B).' },
              { id: 'S4', name: 'S_DEPOSIT', desc: 'ALU Adder execution & 16-bit capacity check.' },
              { id: 'S5', name: 'S_BALANCE', desc: 'Direct read routing without memory modification.' },
              { id: 'S6', name: 'S_TRANSFER', desc: 'Validate recipient card ID and route atomic transfer.' },
              { id: 'S7', name: 'S_INTEREST', desc: 'Compute pro-rated incentive interest bonus.' },
              { id: 'S8', name: 'S_UPDATE', desc: 'Assert REGISTER_WRITE = 1 to latch new balance in memory.' },
              { id: 'S9', name: 'S_OUTPUT', desc: 'Illuminate green approval lamp and strobe receipt.' },
              { id: 'S10', name: 'S_REJECT', desc: 'Illuminate red rejection lamp and output reject code.' },
              { id: 'S11', name: 'S_END', desc: 'Release bus handshakes and return to S0-IDLE.' }
            ].map(st => (
              <div key={st.id} className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-teal-400">{st.id}</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-850 text-slate-400">{st.name}</span>
                </div>
                <p className="text-slate-400 text-[11px] leading-relaxed">{st.desc}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab: ALU 74HC283 / 85 */}
      {activeTab === 'ALU' && (
        <div className="bg-slate-900/90 border border-slate-800 p-6 rounded-3xl shadow-xl space-y-4">
          <h3 className="text-xl font-bold text-white font-['Chakra_Petch']">
            Transaction Processing Unit (ALU Architecture)
          </h3>
          <p className="text-xs text-slate-300 leading-relaxed">
            Constructed using foundational TTL digital ICs: 74HC283 4-bit Binary Full Adders and 74HC85 4-bit Magnitude Comparators.
          </p>

          <div className="rounded-2xl overflow-hidden border border-slate-800 bg-white/5 p-4 flex items-center justify-center">
            <img 
              src="/assets/image8.png" 
              alt="ALU Circuit Schematic" 
              className="max-h-72 w-auto object-contain rounded-lg shadow-md"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono">
            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
              <span className="font-bold text-teal-400 uppercase block">Path 1 (00): Withdrawal Subtraction</span>
              <p className="text-slate-400 text-[11px]">
                Uses 74HC85 Magnitude Comparator to enforce <strong>B_current ≥ M</strong>. If satisfied, 2's complement subtraction calculates:
              </p>
              <div className="text-emerald-400 font-bold bg-slate-900 p-2 rounded-lg">
                B_new = B_current - M &nbsp;&nbsp;(e.g. ₹5,000 - ₹2,000 = ₹3,000)
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
              <span className="font-bold text-teal-400 uppercase block">Path 2 (01): Deposit Addition</span>
              <p className="text-slate-400 text-[11px]">
                Uses 74HC283 Full Adder cascade to accumulate deposit amounts while verifying 16-bit range:
              </p>
              <div className="text-teal-400 font-bold bg-slate-900 p-2 rounded-lg">
                B_new = B_current + M &nbsp;&nbsp;(e.g. ₹5,000 + ₹2,000 = ₹7,000)
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab: Sequential Balance Memory */}
      {activeTab === 'MEMORY' && (
        <div className="bg-slate-900/90 border border-slate-800 p-6 rounded-3xl shadow-xl space-y-4">
          <h3 className="text-xl font-bold text-white font-['Chakra_Petch']">
            Sequential Balance Memory Subsystem (Unit Delay 1/z)
          </h3>
          <p className="text-xs text-slate-300 leading-relaxed">
            Preserves financial data across discrete simulation cycles. Hardware-equivalent to 16 Parallel-In-Parallel-Out (PIPO) D Flip-Flops triggered on clock edge.
          </p>

          <div className="rounded-2xl overflow-hidden border border-slate-800 bg-white/5 p-4 flex items-center justify-center">
            <img 
              src="/assets/ppt_image10.png" 
              alt="Sequential Memory Architecture" 
              className="max-h-56 w-auto object-contain rounded-lg shadow-md"
            />
          </div>

          <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-2 font-mono text-xs">
            <span className="text-teal-400 font-bold block">State Transfer Equation:</span>
            <div className="text-white text-sm bg-slate-900 p-3 rounded-xl border border-slate-850">
              Q_next = B_new &nbsp;&nbsp;when REGISTER_WRITE = 1<br/>
              Q_next = Q_current &nbsp;&nbsp;when REGISTER_WRITE = 0
            </div>
            <p className="text-slate-400 text-[11px]">
              Initial condition configured to ₹5,000 (uint16). Sample time = 1.0 second. Feedback loop guarantees data persistence between transactions.
            </p>
          </div>
        </div>
      )}

      {/* Tab: Curriculum Outcomes */}
      {activeTab === 'CO' && (
        <div className="bg-slate-900/90 border border-slate-800 p-6 rounded-3xl shadow-xl space-y-4">
          <h3 className="text-xl font-bold text-white font-['Chakra_Petch']">
            Curriculum Mapping & Course Outcomes (CO) Attainment
          </h3>

          <div className="space-y-3 font-mono text-xs">
            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-1">
              <span className="text-teal-400 font-bold block">CO2: Combinational Circuits & ALU Implementation</span>
              <p className="text-slate-400 text-[11px]">
                Attainment: Verified PIN and Card ID using 32-bit equality comparators and AND logic gates. Evaluated ALU arithmetic using 74HC283 Adders, Subtractors, and Magnitude Comparators (A ≥ B).
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-1">
              <span className="text-teal-400 font-bold block">CO3: Shift Registers, Counters & State Controllers</span>
              <p className="text-slate-400 text-[11px]">
                Attainment: Modeled sequential state transfers using a 10-state Stateflow Finite State Machine (FSM) controller and clocked timing sequences for handshake verification.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-1">
              <span className="text-teal-400 font-bold block">CO4: Memory Devices & Sequential Registers</span>
              <p className="text-slate-400 text-[11px]">
                Attainment: Constructed a 16-bit Parallel-In-Parallel-Out (PIPO) balance memory register using a discrete Unit Delay block paired with feedback multiplexing for data persistence.
              </p>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

