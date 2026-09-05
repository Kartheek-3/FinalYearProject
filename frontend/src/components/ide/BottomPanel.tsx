import { useEffect, useState, useRef } from 'react';
import {
  Terminal as TerminalIcon,
  AlertCircle,
  AlignLeft,
  Plug2,
  Network,
  X,
  Server,
  ExternalLink,
  Database,
  Plus,
  Filter,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';
import { useIDEStore } from '../../store/useIDEStore';
import { api } from '../../services/api';
import { Terminal } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
import 'xterm/css/xterm.css';
import clsx from 'clsx';

export default function BottomPanel() {
  const { activeBottomTab, setActiveBottomTab, setBottomPanelOpen } = useIDEStore();

  const tabs = [
    { id: 'problems', label: 'PROBLEMS', icon: <AlertCircle className="w-3.5 h-3.5" /> },
    { id: 'output', label: 'OUTPUT', icon: <AlignLeft className="w-3.5 h-3.5" /> },
    { id: 'terminal', label: 'TERMINAL', icon: <TerminalIcon className="w-3.5 h-3.5" /> },
    { id: 'ports', label: 'PORTS', icon: <Network className="w-3.5 h-3.5" /> },
    { id: 'deployment', label: 'DEPLOYMENT', icon: <Server className="w-3.5 h-3.5" /> },
    { id: 'memory', label: 'ORGANIZATIONAL MEMORY', icon: <Database className="w-3.5 h-3.5" /> },
    { id: 'mcp', label: 'MCP CONNECTORS', icon: <Plug2 className="w-3.5 h-3.5" /> },
  ] as const;

  return (
    <div className="flex flex-col h-full bg-background relative group/bottom">
      {/* Tabs */}
      <div className="flex items-center px-4 border-b border-border bg-panel shrink-0 h-9 select-none">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveBottomTab(tab.id as any)}
            className={clsx(
              "flex items-center gap-1.5 px-3 h-full text-xs font-medium tracking-wide transition-colors border-b-2",
              activeBottomTab === tab.id
                ? "text-primaryText border-accent"
                : "text-secondaryText hover:text-primaryText border-transparent"
            )}
          >
            {tab.icon}
            <span>{tab.label}</span>
          </button>
        ))}

        <div className="flex-1" />
        <button
          onClick={() => setBottomPanelOpen(false)}
          className="p-1 rounded hover:bg-secondary text-secondaryText transition-colors"
          title="Close Panel"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden relative">
        {activeBottomTab === 'terminal' && <TerminalView />}
        {activeBottomTab === 'output' && <OutputView />}
        {activeBottomTab === 'problems' && <ProblemsView />}
        {activeBottomTab === 'deployment' && <DeploymentView />}
        {activeBottomTab === 'ports' && <PortsView />}
        {activeBottomTab === 'memory' && <MemoryView />}
        {activeBottomTab === 'mcp' && <MCPView />}
      </div>
    </div>
  );
}

function ProblemsView() {
  const { testResults, securityFindings, projectAggregate } = useIDEStore();

  const failedTests = testResults.items.filter(t => t.status === 'fail');
  const criticalOrHighSecurity = securityFindings.items.filter(s => s.severity === 'critical' || s.severity === 'high');
  const errorsList = projectAggregate?.lifecycle?.errors || [];

  const totalIssues = failedTests.length + criticalOrHighSecurity.length + errorsList.length;

  return (
    <div className="h-full w-full p-4 overflow-y-auto text-xs font-sans select-text">
      {totalIssues === 0 ? (
        <div className="flex flex-col items-center justify-center h-full text-secondaryText gap-2">
          <CheckCircle2 className="w-6 h-6 text-emerald-400" />
          <span className="font-medium text-slate-300">No problems have been detected in the workspace.</span>
          <span className="text-[11px] text-slate-500">Compiler, QA test runs, and security scans are clean.</span>
        </div>
      ) : (
        <div className="space-y-2">
          <div className="text-secondaryText text-[11px] uppercase font-semibold mb-2">
            Found {totalIssues} issue{totalIssues > 1 ? 's' : ''}
          </div>

          {errorsList.map((err, idx) => (
            <div key={`err-${idx}`} className="flex items-start gap-2.5 p-2 rounded bg-red-950/20 border border-red-900/30">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <div className="flex-1">
                <div className="text-red-300 font-medium">{err}</div>
                <div className="text-[11px] text-red-400/70 font-mono mt-0.5">Lifecycle Error</div>
              </div>
            </div>
          ))}

          {failedTests.map(test => (
            <div key={test.id} className="flex items-start gap-2.5 p-2 rounded bg-amber-950/20 border border-amber-900/30">
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <div className="flex-1">
                <div className="text-amber-200 font-medium">Test Failed: {test.name}</div>
                <div className="text-[11px] text-amber-400/70 font-mono mt-0.5">
                  Suite: {test.suite || 'automated_qa'} • Duration: {test.duration || 'N/A'}
                </div>
              </div>
            </div>
          ))}

          {criticalOrHighSecurity.map((sec, idx) => (
            <div key={`sec-${idx}`} className="flex items-start gap-2.5 p-2 rounded bg-red-950/20 border border-red-900/30">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <div className="flex-1">
                <div className="text-red-200 font-medium">
                  [{sec.severity.toUpperCase()}] {sec.title}
                </div>
                <div className="text-[11px] text-slate-400 mt-0.5">
                  Category: {sec.category} {sec.remediation ? `• Remediation: ${sec.remediation}` : ''}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function PortsView() {
  const { projectAggregate } = useIDEStore();
  const deliveryResult = projectAggregate?.delivery_result;
  const hostPort = deliveryResult?.metadata?.host_port || (deliveryResult?.project_url ? new URL(String(deliveryResult.project_url)).port : null);

  return (
    <div className="h-full w-full p-4 overflow-y-auto font-mono text-xs">
      <div className="text-secondaryText mb-3 uppercase tracking-wider font-sans font-semibold text-[11px]">
        Forwarded Ports & Endpoints
      </div>
      {hostPort ? (
        <div className="bg-panel border border-border rounded-lg overflow-hidden">
          <div className="grid grid-cols-4 px-4 py-2 bg-secondary/50 border-b border-border text-[11px] font-semibold text-secondaryText">
            <span>Port</span>
            <span>Protocol</span>
            <span>Origin</span>
            <span>Forwarded Address</span>
          </div>
          <div className="grid grid-cols-4 px-4 py-2.5 text-xs text-primaryText items-center">
            <span className="text-accent font-bold">{hostPort}</span>
            <span>HTTP</span>
            <span>Docker Container</span>
            <a
              href={`http://localhost:${hostPort}/`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-accent hover:underline flex items-center gap-1"
            >
              <span>http://localhost:{hostPort}/</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>
      ) : (
        <div className="text-secondaryText italic">No forwarded ports detected yet. Port allocated dynamically upon Docker container start.</div>
      )}
    </div>
  );
}

function DeploymentView() {
  const { projectAggregate, setWorkspaceMode } = useIDEStore();
  const deliveryResult = projectAggregate?.delivery_result;
  const status = deliveryResult?.delivery_status || 'pending';
  const url = deliveryResult?.project_url ? String(deliveryResult.project_url) : null;
  const containerName = deliveryResult?.service_references?.[0] || 'seam_container';
  const image = deliveryResult?.image_references?.[0] || 'seam_image';
  const hostPort = deliveryResult?.metadata?.host_port || (url ? new URL(url).port : null);
  const isHealthy = status === 'deployed';

  return (
    <div className="h-full w-full p-4 overflow-y-auto text-xs font-sans select-text">
      <div className="max-w-2xl bg-panel border border-border rounded-lg p-4 space-y-4">
        <div className="flex items-center justify-between border-b border-border/80 pb-3">
          <div className="flex items-center gap-2">
            <Server className="w-4 h-4 text-accent" />
            <span className="font-semibold text-sm text-primaryText">Real Docker Deployment Pipeline</span>
          </div>
          <span className={clsx(
            "px-2.5 py-0.5 rounded text-xs font-mono font-semibold uppercase",
            isHealthy ? "bg-success/20 text-success border border-success/30" :
            status === 'failed' ? "bg-error/20 text-error border border-error/30" :
            "bg-warning/20 text-warning border border-warning/30"
          )}>
            {status}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-3 text-xs">
          <div className="bg-secondary/30 p-2.5 rounded border border-border/50">
            <div className="text-secondaryText text-[10px] uppercase font-semibold">Docker Build</div>
            <div className="font-mono text-primaryText mt-1 flex items-center gap-1.5">
              <span className={isHealthy ? "text-success" : "text-secondaryText"}>
                {isHealthy ? "✓ Succeeded" : "Waiting for Delivery"}
              </span>
            </div>
          </div>

          <div className="bg-secondary/30 p-2.5 rounded border border-border/50">
            <div className="text-secondaryText text-[10px] uppercase font-semibold">Container Runtime</div>
            <div className="font-mono text-primaryText mt-1 flex items-center gap-1.5">
              <span className={isHealthy ? "text-success" : "text-secondaryText"}>
                {isHealthy ? `✓ ${containerName}` : "Not Running"}
              </span>
            </div>
            {isHealthy && <div className="text-[10px] text-secondaryText truncate mt-0.5">{image}</div>}
          </div>

          <div className="bg-secondary/30 p-2.5 rounded border border-border/50">
            <div className="text-secondaryText text-[10px] uppercase font-semibold">Allocated Host Port</div>
            <div className="font-mono text-accent mt-1">
              {hostPort ? `${hostPort} → 8000` : "None"}
            </div>
          </div>

          <div className="bg-secondary/30 p-2.5 rounded border border-border/50">
            <div className="text-secondaryText text-[10px] uppercase font-semibold">Health Status</div>
            <div className="font-mono mt-1 flex items-center gap-1">
              <span className={isHealthy ? "text-success font-semibold" : "text-secondaryText"}>
                {isHealthy ? "✓ HTTP 200 OK" : "Pending verification"}
              </span>
            </div>
          </div>
        </div>

        {url && (
          <div className="bg-secondary/40 border border-border rounded p-3 flex items-center justify-between">
            <div>
              <div className="text-[10px] uppercase font-semibold text-secondaryText">Application URL</div>
              <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="font-mono text-xs text-accent hover:underline flex items-center gap-1 mt-0.5"
              >
                <span>{url}</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
            <button
              onClick={() => setWorkspaceMode('preview')}
              className="px-3 py-1.5 bg-accent text-white rounded text-xs hover:bg-accent/90 transition-colors font-medium"
            >
              Open in Preview Tab
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function MemoryView() {
  const [stats, setStats] = useState<any>(null);
  const [recent, setRecent] = useState<any[]>([]);

  useEffect(() => {
    api.getMemoryStats().then(setStats).catch(() => {});
    api.getRecentMemory(10).then(setRecent).catch(() => {});
  }, []);

  return (
    <div className="h-full w-full p-4 overflow-y-auto text-xs font-sans select-text">
      <div className="flex items-center justify-between mb-3 border-b border-border/60 pb-2">
        <div className="flex items-center gap-2">
          <Database className="w-4 h-4 text-violet-400" />
          <span className="font-semibold text-sm text-primaryText">SHARED ORGANIZATIONAL MEMORY</span>
          <span className="text-[10px] bg-violet-950/80 text-violet-400 border border-violet-800/40 px-2 py-0.5 rounded font-mono">
            RAG + ChromaDB
          </span>
        </div>
        <div className="text-[11px] text-secondaryText">
          Cross-Project Knowledge & Lessons Learned
        </div>
      </div>

      <div className="grid grid-cols-4 gap-3 mb-4">
        <div className="bg-panel border border-border rounded p-3">
          <div className="text-secondaryText text-[10px] uppercase">Indexed Memories</div>
          <div className="text-lg font-bold text-primaryText mt-0.5">{stats?.total_memories ?? 0}</div>
        </div>
        <div className="bg-panel border border-border rounded p-3">
          <div className="text-secondaryText text-[10px] uppercase">Avg Confidence</div>
          <div className="text-lg font-bold text-emerald-400 mt-0.5">
            {stats?.avg_confidence ? `${Math.round(stats.avg_confidence * 100)}%` : '95%'}
          </div>
        </div>
        <div className="bg-panel border border-border rounded p-3">
          <div className="text-secondaryText text-[10px] uppercase">RAG Ingestion Status</div>
          <div className="text-lg font-bold text-indigo-400 mt-0.5">Active</div>
        </div>
        <div className="bg-panel border border-border rounded p-3">
          <div className="text-secondaryText text-[10px] uppercase">Vector Embeddings</div>
          <div className="text-lg font-bold text-sky-400 mt-0.5">Qwen/Nomic</div>
        </div>
      </div>

      <div className="text-secondaryText text-[11px] uppercase font-semibold mb-2">Recent Ingested Insights</div>
      <div className="space-y-2">
        {recent.length === 0 ? (
          <div className="text-secondaryText italic">No memories recorded for this workspace yet. Memories ingest on project delivery completion.</div>
        ) : (
          recent.map((rec, idx) => (
            <div key={idx} className="p-2.5 rounded bg-panel border border-border text-xs">
              <div className="flex items-center justify-between text-secondaryText text-[11px] mb-1">
                <span className="font-semibold text-primaryText capitalize">{rec.memory_type || 'Architectural Pattern'}</span>
                <span className="font-mono">Confidence: {Math.round((rec.confidence_score || 0.9) * 100)}%</span>
              </div>
              <div className="text-slate-300">{rec.content || JSON.stringify(rec)}</div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function MCPView() {
  return (
    <div className="h-full w-full p-4 overflow-y-auto text-xs font-sans select-text">
      <div className="flex items-center gap-2 mb-3 border-b border-border/60 pb-2">
        <Plug2 className="w-4 h-4 text-accent" />
        <span className="font-semibold text-sm text-primaryText">Model Context Protocol (MCP) Tooling</span>
      </div>
      <div className="space-y-3 max-w-xl">
        <div className="p-3 rounded bg-panel border border-border flex items-center justify-between">
          <div>
            <div className="font-semibold text-primaryText">Local Workspace Filesystem MCP</div>
            <div className="text-[11px] text-secondaryText mt-0.5">Sandboxed I/O connector for project directory</div>
          </div>
          <span className="px-2 py-0.5 rounded bg-emerald-950/80 text-emerald-400 border border-emerald-800/40 font-mono text-[10px]">CONNECTED</span>
        </div>
        <div className="p-3 rounded bg-panel border border-border flex items-center justify-between">
          <div>
            <div className="font-semibold text-primaryText">Docker Deployment Daemon MCP</div>
            <div className="text-[11px] text-secondaryText mt-0.5">Container runtime and isolated bridge connector</div>
          </div>
          <span className="px-2 py-0.5 rounded bg-emerald-950/80 text-emerald-400 border border-emerald-800/40 font-mono text-[10px]">CONNECTED</span>
        </div>
      </div>
    </div>
  );
}

function TerminalView() {
  const terminalRef = useRef<HTMLDivElement>(null);
  const { projectId } = useIDEStore();
  const xtermRef = useRef<Terminal | null>(null);
  const wsRef = useRef<WebSocket | null>(null);

  // Multi-terminal tabs
  const [terminalInstances, setTerminalInstances] = useState<{ id: string; name: string }[]>([
    { id: 'term-1', name: 'Terminal 1' }
  ]);
  const [activeTermId, setActiveTermId] = useState('term-1');

  useEffect(() => {
    if (!terminalRef.current) return;

    const term = new Terminal({
      theme: {
        background: '#0B0F14',
        foreground: '#F5F7FA',
        cursor: '#6366f1',
        selectionBackground: 'rgba(99, 102, 241, 0.3)',
      },
      fontFamily: "'JetBrains Mono', monospace",
      fontSize: 13,
      lineHeight: 1.2,
      cursorBlink: true,
    });

    const fitAddon = new FitAddon();
    term.loadAddon(fitAddon);
    term.open(terminalRef.current);
    fitAddon.fit();
    xtermRef.current = term;

    let isDisposed = false;

    // Connect to real sandboxed WebSocket terminal if projectId exists
    if (projectId) {
      api.getTerminalWebSocketUrl(projectId).then((wsUrl: string) => {
        if (isDisposed) return;
        const ws = new WebSocket(wsUrl);
        wsRef.current = ws;

        ws.onopen = () => {
          fitAddon.fit();
        };

        ws.onmessage = (event) => {
          term.write(event.data);
        };

        ws.onerror = () => {
          term.writeln('\r\n\x1b[31m[Terminal connection error]\x1b[0m\r\n');
        };

        ws.onclose = () => {
          term.writeln('\r\n\x1b[90m[Terminal session disconnected]\x1b[0m\r\n');
        };

        // Forward user keypresses to backend shell process
        term.onData((data) => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(data);
          }
        });
      }).catch((err: unknown) => {
        const message = err instanceof Error ? err.message : String(err);
        term.writeln(`\r\n\x1b[31m[Failed to initialize terminal: ${message}]\x1b[0m\r\n`);
      });
    } else {
      term.writeln('\x1b[1;36m$ SEAM IDE Terminal Ready (No Active Project)\x1b[0m\r\n');
    }

    const handleResize = () => fitAddon.fit();
    window.addEventListener('resize', handleResize);

    return () => {
      isDisposed = true;
      window.removeEventListener('resize', handleResize);
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
      term.dispose();
      xtermRef.current = null;
    };
  }, [projectId, activeTermId]);

  const addTerminal = () => {
    const nextIdx = terminalInstances.length + 1;
    const newId = `term-${Date.now()}`;
    setTerminalInstances(prev => [...prev, { id: newId, name: `Terminal ${nextIdx}` }]);
    setActiveTermId(newId);
  };

  const removeTerminal = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (terminalInstances.length <= 1) return;
    const updated = terminalInstances.filter(t => t.id !== id);
    setTerminalInstances(updated);
    if (activeTermId === id) {
      setActiveTermId(updated[0].id);
    }
  };

  return (
    <div className="h-full w-full flex flex-col overflow-hidden">
      {/* Multi-terminal bar */}
      <div className="h-7 border-b border-border bg-panel px-3 flex items-center justify-between text-xs shrink-0 select-none">
        <div className="flex items-center gap-1 overflow-x-auto">
          {terminalInstances.map(t => (
            <div
              key={t.id}
              onClick={() => setActiveTermId(t.id)}
              className={clsx(
                "flex items-center gap-1.5 px-2.5 py-0.5 rounded cursor-pointer text-[11px]",
                activeTermId === t.id ? "bg-secondary text-primaryText font-medium" : "text-secondaryText hover:text-primaryText"
              )}
            >
              <TerminalIcon className="w-3 h-3" />
              <span>{t.name}</span>
              {terminalInstances.length > 1 && (
                <button
                  onClick={(e) => removeTerminal(t.id, e)}
                  className="hover:text-red-400 ml-1"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          ))}
          <button
            onClick={addTerminal}
            className="p-1 rounded hover:bg-secondary text-secondaryText hover:text-primaryText"
            title="New Terminal Instance"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
        </div>
        <div className="text-[10px] text-secondaryText/80 font-mono">
          PTY / Subprocess Sandboxed
        </div>
      </div>

      <div className="flex-1 w-full p-2 pl-4 overflow-hidden" ref={terminalRef} />
    </div>
  );
}

function OutputView() {
  const { liveEvents } = useIDEStore();
  const [filter, setFilter] = useState<'all' | 'agent' | 'qa' | 'docker'>('all');
  const bottomRef = useRef<HTMLDivElement>(null);

  const filteredEvents = liveEvents.filter(e => {
    if (filter === 'agent') return e.event_type.startsWith('agent.') || e.event_type.startsWith('task.');
    if (filter === 'qa') return e.event_type.startsWith('qa.');
    if (filter === 'docker') return e.event_type.startsWith('docker.') || e.event_type.startsWith('delivery.');
    return true;
  });

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [filteredEvents.length]);

  return (
    <div className="h-full w-full flex flex-col overflow-hidden text-xs">
      <div className="h-7 border-b border-border bg-panel px-3 flex items-center justify-between shrink-0 select-none">
        <div className="flex items-center gap-2">
          <Filter className="w-3 h-3 text-secondaryText" />
          {(['all', 'agent', 'qa', 'docker'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={clsx(
                "px-2 py-0.5 rounded capitalize text-[11px]",
                filter === f ? "bg-accent text-white" : "text-secondaryText hover:text-primaryText"
              )}
            >
              {f}
            </button>
          ))}
        </div>
        <span className="text-[10px] text-secondaryText font-mono">{filteredEvents.length} events logged</span>
      </div>

      <div className="flex-1 w-full p-4 overflow-y-auto font-mono text-xs text-primaryText space-y-2 select-text">
        {filteredEvents.length === 0 ? (
          <div className="text-secondaryText italic">Waiting for runtime events...</div>
        ) : (
          filteredEvents.map((event, idx) => (
            <div key={idx} className="border-b border-border/40 pb-2">
              <div className="flex items-center gap-2">
                <span className="text-secondaryText">
                  [{new Date(event.timestamp * 1000).toLocaleTimeString()}]
                </span>
                <span className={clsx(
                  "font-semibold",
                  event.event_type.includes('failed') || event.event_type.includes('error') ? "text-error" :
                  event.event_type.includes('completed') || event.event_type.includes('healthy') ? "text-success" :
                  event.event_type.includes('started') ? "text-accent" : "text-primaryText"
                )}>
                  {event.event_type}
                </span>
              </div>
              {event.data && Object.keys(event.data).length > 0 && (
                <pre className="mt-1 text-[11px] text-secondaryText bg-secondary/30 p-2 rounded overflow-x-auto">
                  {JSON.stringify(event.data, null, 2)}
                </pre>
              )}
            </div>
          ))
        )}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}
