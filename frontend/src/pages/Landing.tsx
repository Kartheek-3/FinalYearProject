import { useNavigate } from 'react-router-dom';
import {
  Bot,
  Sparkles,
  ArrowRight,
  Database,
  FileCode,
} from 'lucide-react';
import { motion } from 'framer-motion';

export default function Landing() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen w-screen bg-[#07090E] text-[#F5F7FA] font-sans selection:bg-indigo-500 selection:text-white overflow-x-hidden">
      {/* Top Navigation */}
      <nav className="h-16 border-b border-[#1E2638] bg-[#0B0F17]/80 backdrop-blur-md fixed top-0 w-full z-50 px-6 md:px-12 flex items-center justify-between">
        <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate('/')}>
          <div className="w-8 h-8 rounded-lg bg-indigo-500/20 border border-indigo-500/40 flex items-center justify-center text-indigo-400">
            <Bot className="w-5 h-5" />
          </div>
          <span className="font-bold text-lg tracking-tight">SEAM</span>
          <span className="text-[10px] font-mono uppercase bg-indigo-950/60 text-indigo-400 border border-indigo-800/40 px-2 py-0.5 rounded font-semibold">
            Autonomous IDE
          </span>
        </div>

        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/login')}
            className="text-xs font-semibold text-slate-300 hover:text-white px-3 py-1.5 transition-colors"
          >
            Sign In
          </button>
          <button
            onClick={() => navigate('/signup')}
            className="text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-lg transition-all shadow-md shadow-indigo-600/30 flex items-center gap-1.5"
          >
            <span>Get Started</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </nav>

      {/* HERO SECTION */}
      <section className="pt-32 pb-20 px-6 md:px-12 max-w-7xl mx-auto flex flex-col items-center text-center relative">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] bg-indigo-600/10 rounded-full blur-[120px] pointer-events-none" />

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#131B29] border border-[#232F42] text-xs text-slate-300 mb-6 shadow-inner"
        >
          <Sparkles className="w-4 h-4 text-indigo-400" />
          <span>Self-Evolving Autonomous Multi-Agent Framework</span>
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="text-4xl md:text-6xl lg:text-7xl font-extrabold tracking-tight text-white max-w-4xl leading-[1.1]"
        >
          Build Software. Autonomously.
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="mt-6 text-base md:text-lg text-slate-400 max-w-2xl leading-relaxed"
        >
          Describe your idea. SEAM analyzes requirements, designs the architecture, generates code, tests it, performs security analysis, fixes failures, and deploys the application.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="mt-8 flex flex-col sm:flex-row items-center gap-4"
        >
          <button
            onClick={() => navigate('/dashboard')}
            className="w-full sm:w-auto px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm rounded-xl transition-all shadow-xl shadow-indigo-600/25 flex items-center justify-center gap-2"
          >
            <span>Start Building</span>
            <ArrowRight className="w-4 h-4" />
          </button>
          <a
            href="#architecture"
            className="w-full sm:w-auto px-6 py-3 bg-[#131B29] hover:bg-[#1A2538] border border-[#223046] text-slate-300 font-semibold text-sm rounded-xl transition-all flex items-center justify-center gap-2"
          >
            <span>Explore Architecture</span>
          </a>
        </motion.div>

        {/* Animated Miniature SEAM IDE Visual */}
        <motion.div
          initial={{ opacity: 0, y: 32 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.4 }}
          className="mt-14 w-full max-w-5xl bg-[#0E131F] border border-[#202B3D] rounded-2xl shadow-2xl overflow-hidden text-left"
        >
          {/* Mock IDE Window Header */}
          <div className="h-9 bg-[#141A29] border-b border-[#202B3D] px-4 flex items-center justify-between select-none">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500/80" />
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500/80" />
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/80" />
              <span className="ml-2 font-mono text-[11px] text-slate-400">SEAM IDE — expense-tracker [Python + Docker]</span>
            </div>
            <div className="flex items-center gap-2 font-mono text-[10px] text-emerald-400 bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-800/40">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span>LIVE ORCHESTRATION</span>
            </div>
          </div>

          {/* Miniature 3-Panel Layout */}
          <div className="grid grid-cols-12 h-80 font-mono text-xs">
            {/* Left: Explorer & Stage Pipeline */}
            <div className="col-span-3 border-r border-[#202B3D] bg-[#0A0E18] p-3 flex flex-col justify-between">
              <div>
                <div className="text-[10px] uppercase font-bold text-slate-500 mb-2">Autonomous Pipeline</div>
                <div className="space-y-1 text-[11px]">
                  <div className="text-emerald-400 flex items-center gap-1.5 font-semibold">
                    <span>✓</span> <span>1. Analysis</span>
                  </div>
                  <div className="text-emerald-400 flex items-center gap-1.5 font-semibold">
                    <span>✓</span> <span>2. Planning</span>
                  </div>
                  <div className="text-emerald-400 flex items-center gap-1.5 font-semibold">
                    <span>✓</span> <span>3. Supervisor</span>
                  </div>
                  <div className="text-indigo-400 flex items-center gap-1.5 font-semibold bg-indigo-950/30 p-1 rounded">
                    <span className="animate-spin">●</span> <span>4. Coding Agent</span>
                  </div>
                  <div className="text-slate-400 flex items-center gap-1.5">
                    <span>○</span> <span>5. QA & Test Suite</span>
                  </div>
                  <div className="text-slate-500 flex items-center gap-1.5">
                    <span>○</span> <span>6. Security Scan</span>
                  </div>
                  <div className="text-slate-500 flex items-center gap-1.5">
                    <span>○</span> <span>7. Delivery & Docker</span>
                  </div>
                </div>
              </div>

              <div className="border-t border-[#202B3D] pt-2 text-[10px] text-slate-500">
                <span>RAG Memory: Active</span>
              </div>
            </div>

            {/* Center: Editor & Live Code Generation */}
            <div className="col-span-6 bg-[#0B0F19] p-4 flex flex-col justify-between overflow-hidden">
              <div>
                <div className="flex items-center gap-2 border-b border-[#202B3D] pb-2 mb-3 text-[11px] text-slate-400">
                  <FileCode className="w-3.5 h-3.5 text-indigo-400" />
                  <span className="text-slate-200">app/api/endpoints.py</span>
                  <span className="text-[9px] bg-indigo-950 text-indigo-400 px-1.5 rounded">Generated</span>
                </div>
                <pre className="text-[10px] text-slate-300 font-mono leading-relaxed overflow-hidden">
                  <span className="text-indigo-400">from</span> fastapi <span className="text-indigo-400">import</span> APIRouter, Depends, HTTPException{'\n'}
                  <span className="text-indigo-400">from</span> pydantic <span className="text-indigo-400">import</span> BaseModel{'\n\n'}
                  router = APIRouter(prefix=<span className="text-emerald-400">"/expenses"</span>){'\n\n'}
                  <span className="text-indigo-400">@router.post</span>(<span className="text-emerald-400">"/"</span>, status_code=201){'\n'}
                  <span className="text-indigo-400">async def</span> <span className="text-amber-300">create_expense</span>(payload: ExpenseInput):{'\n'}
                  {'    '}record = <span className="text-indigo-400">await</span> service.save_expense(payload){'\n'}
                  {'    '}<span className="text-indigo-400">return</span> record
                </pre>
              </div>

              <div className="bg-[#121826] border border-[#202B3D] rounded p-2 text-[10px] flex items-center justify-between text-slate-400">
                <span className="text-indigo-300">Coding Agent generated 142 lines</span>
                <span className="text-emerald-400 font-bold">100% Quality Gate</span>
              </div>
            </div>

            {/* Right: Real Terminal & Deployment */}
            <div className="col-span-3 border-l border-[#202B3D] bg-[#090D17] p-3 flex flex-col justify-between">
              <div>
                <div className="text-[10px] uppercase font-bold text-slate-500 mb-2">Live Terminal</div>
                <div className="space-y-1 text-[10px] text-slate-400 font-mono">
                  <div className="text-indigo-400">$ pytest tests/ -v</div>
                  <div className="text-emerald-400">✓ test_create_expense PASSED</div>
                  <div className="text-emerald-400">✓ test_monthly_total PASSED</div>
                  <div className="text-indigo-400 mt-2">$ docker run -p 10000:8000</div>
                  <div className="text-slate-300">Container started: [healthy]</div>
                </div>
              </div>

              <div className="bg-[#101726] p-2 rounded border border-[#202B3D] text-[10px]">
                <div className="text-slate-400">Live URL:</div>
                <div className="text-indigo-400 truncate mt-0.5">http://localhost:10000/</div>
              </div>
            </div>
          </div>
        </motion.div>
      </section>

      {/* SECTION A: AUTONOMOUS SDLC */}
      <section className="py-20 px-6 md:px-12 max-w-7xl mx-auto border-t border-[#192233]">
        <div className="text-center max-w-3xl mx-auto mb-14">
          <h2 className="text-xs uppercase tracking-widest text-indigo-400 font-bold mb-2">End-to-End Execution</h2>
          <p className="text-2xl md:text-3xl font-bold text-white tracking-tight">The Autonomous Software Lifecycle</p>
          <p className="mt-3 text-sm text-slate-400 leading-relaxed">
            Every step is managed deterministically through supervised multi-agent coordination.
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { step: '01', title: 'Analyze', desc: 'Deconstruct requirements into functional specifications & tech stack.' },
            { step: '02', title: 'Plan', desc: 'Generate component diagrams, schemas, and topological task graphs.' },
            { step: '03', title: 'Build', desc: 'Coding Agent writes atomic source files in a sandboxed workspace.' },
            { step: '04', title: 'Test', desc: 'Real automated test execution with assertions & code coverage.' },
            { step: '05', title: 'Secure', desc: 'Vulnerability scan, secret leakage detection, and dependency audit.' },
            { step: '06', title: 'Fix (Rework)', desc: 'Autonomous loop: QA failure triggers targeted coding rework.' },
            { step: '07', title: 'Deploy', desc: 'Synthesizes Dockerfile, compiles image, binds dynamic port, probes health.' },
            { step: '08', title: 'Learn', desc: 'Stores successful design patterns and lessons in organizational memory.' }
          ].map((item) => (
            <div key={item.step} className="bg-[#0D121F] border border-[#1F293D] rounded-xl p-5 hover:border-indigo-500/50 transition-colors">
              <div className="text-xs font-mono font-bold text-indigo-400 mb-2">{item.step}</div>
              <h3 className="text-base font-bold text-white mb-1.5">{item.title}</h3>
              <p className="text-xs text-slate-400 leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* SECTION B: SIX-AGENT ARCHITECTURE */}
      <section id="architecture" className="py-20 px-6 md:px-12 max-w-7xl mx-auto border-t border-[#192233]">
        <div className="text-center max-w-3xl mx-auto mb-14">
          <h2 className="text-xs uppercase tracking-widest text-indigo-400 font-bold mb-2">Specialized Roles</h2>
          <p className="text-2xl md:text-3xl font-bold text-white tracking-tight">Dedicated Multi-Agent Intelligence</p>
          <p className="mt-3 text-sm text-slate-400 leading-relaxed">
            Six focused autonomous agents governed by a centralized supervisor orchestrator.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            {
              name: 'Analysis Agent',
              role: 'Domain & Technical Specification',
              desc: 'Parses requirements, evaluates architectural constraints, checks feasibility, and establishes foundational parameters.'
            },
            {
              name: 'Planning Agent',
              role: 'Decomposition & Task Graphs',
              desc: 'Decomposes software projects into architectural modules, database schemas, API contracts, and dependency-ordered tasks.'
            },
            {
              name: 'Supervisor',
              role: 'Orchestration Brain',
              desc: 'Selects candidate tasks, resolves dependencies, monitors QA gate verdicts, and routes rework cycles.'
            },
            {
              name: 'Coding Agent',
              role: 'Code Synthesis & Implementation',
              desc: 'Implements production source files, writes tests, updates dependencies, and applies atomic rework patches.'
            },
            {
              name: 'QA Agent',
              role: 'Verification & Quality Gates',
              desc: 'Executes automated tests, performs static code review, scans cyber vulnerabilities, and enforces quality gates.'
            },
            {
              name: 'Delivery Agent',
              role: 'Containerization & Deployment',
              desc: 'Generates container specifications, orchestrates Docker image compilation, and executes health probes.'
            }
          ].map((agent, i) => (
            <div key={i} className="bg-[#0D121F] border border-[#1F293D] rounded-xl p-6 relative group hover:border-indigo-500/40 transition-colors">
              <div className="w-8 h-8 rounded-lg bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center text-indigo-400 mb-4">
                <Bot className="w-4 h-4" />
              </div>
              <h3 className="text-base font-bold text-white">{agent.name}</h3>
              <div className="text-xs font-mono text-indigo-400 mt-0.5 mb-2">{agent.role}</div>
              <p className="text-xs text-slate-400 leading-relaxed">{agent.desc}</p>
            </div>
          ))}
        </div>

        {/* Note on RAG Shared Infrastructure */}
        <div className="mt-8 bg-[#111827] border border-[#232F42] rounded-xl p-5 flex items-center gap-4 text-xs text-slate-300">
          <Database className="w-5 h-5 text-indigo-400 shrink-0" />
          <div>
            <strong className="text-white">Shared Infrastructure:</strong> RAG + ChromaDB vector store serves as
            organizational memory across all projects, not an isolated agent. It provides validated architectural patterns
            while discarding low-confidence data and sensitive secrets.
          </div>
        </div>
      </section>

      {/* SECTION C: REWORK & QA VISUALIZATION */}
      <section className="py-20 px-6 md:px-12 max-w-7xl mx-auto border-t border-[#192233]">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div>
            <h2 className="text-xs uppercase tracking-widest text-indigo-400 font-bold mb-2">Autonomous Correction</h2>
            <p className="text-2xl md:text-3xl font-bold text-white tracking-tight">Adaptive Orchestration & Rework Loops</p>
            <p className="mt-4 text-sm text-slate-400 leading-relaxed">
              When tests fail or code quality issues emerge, SEAM does not crash or require human intervention.
              The QA Agent flags the defect, the Supervisor dispatches a targeted rework cycle, and the Coding Agent produces a diff patch until quality gates pass.
            </p>

            <div className="mt-6 space-y-3 font-mono text-xs">
              <div className="p-3 rounded-lg bg-red-950/20 border border-red-800/40 text-red-300 flex items-center gap-2">
                <span>⚠</span>
                <span>QA Finding: Missing monthly calculation test case</span>
              </div>
              <div className="p-3 rounded-lg bg-amber-950/20 border border-amber-800/40 text-amber-300 flex items-center gap-2">
                <span>↳</span>
                <span>Supervisor: Rework task assigned to Coding Agent</span>
              </div>
              <div className="p-3 rounded-lg bg-indigo-950/20 border border-indigo-800/40 text-indigo-300 flex items-center gap-2">
                <span>↳</span>
                <span>Coding: Patched calculator.py with sum_by_month()</span>
              </div>
              <div className="p-3 rounded-lg bg-emerald-950/20 border border-emerald-800/40 text-emerald-300 flex items-center gap-2">
                <span>✓</span>
                <span>QA Retest: Quality Gate PASSED (0 defects)</span>
              </div>
            </div>
          </div>

          <div className="bg-[#0B0F19] border border-[#1E283D] rounded-2xl p-6 shadow-xl text-xs font-mono">
            <div className="text-slate-400 uppercase tracking-wider text-[11px] mb-3 font-sans font-bold flex items-center justify-between">
              <span>Rework Diff Inspection</span>
              <span className="text-emerald-400">calculator.py</span>
            </div>
            <div className="bg-[#070A12] p-4 rounded-lg border border-[#1A2336] text-[11px] leading-relaxed space-y-1 overflow-x-auto">
              <div className="text-slate-500">  def get_total_expenses(expenses):</div>
              <div className="text-slate-500">      return sum(e.amount for e in expenses)</div>
              <div className="text-red-400 bg-red-950/30 px-1 rounded">-     # Missing monthly grouping breakdown</div>
              <div className="text-emerald-400 bg-emerald-950/30 px-1 rounded">+ def get_monthly_total(expenses, year, month):</div>
              <div className="text-emerald-400 bg-emerald-950/30 px-1 rounded">+     return sum(e.amount for e in expenses if e.date.month == month and e.date.year == year)</div>
            </div>
          </div>
        </div>
      </section>

      {/* FOOTER CALL TO ACTION */}
      <footer className="py-16 px-6 md:px-12 border-t border-[#192233] bg-[#080B13] text-center">
        <h2 className="text-2xl font-bold text-white mb-3">Ready to build autonomously?</h2>
        <p className="text-sm text-slate-400 max-w-xl mx-auto mb-6">
          Deploy your first multi-agent workspace with full analysis, planning, coding, QA, and Docker delivery.
        </p>
        <button
          onClick={() => navigate('/signup')}
          className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm rounded-xl transition-all shadow-lg shadow-indigo-600/30"
        >
          Launch SEAM Workspace
        </button>
        <div className="mt-8 text-xs text-slate-500 font-mono">
          SEAM — Self-Evolving Autonomous Multi-Agent Framework
        </div>
      </footer>
    </div>
  );
}
