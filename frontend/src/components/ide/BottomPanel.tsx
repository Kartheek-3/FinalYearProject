import { useEffect, useRef } from 'react';
import { Terminal as TerminalIcon, AlertCircle, AlignLeft, Plug2, Bot, Network, X, Server, ExternalLink } from 'lucide-react';
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
    { id: 'mcp', label: 'MCP', icon: <Plug2 className="w-3.5 h-3.5" /> },
    { id: 'agents', label: 'AGENTS', icon: <Bot className="w-3.5 h-3.5" /> },
    { id: 'ports', label: 'PORTS', icon: <Network className="w-3.5 h-3.5" /> },
    { id: 'deployment', label: 'DEPLOYMENT', icon: <Server className="w-3.5 h-3.5" /> },
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
            {tab.label}
          </button>
        ))}
        
        <div className="flex-1" />
        <button 
          onClick={() => setBottomPanelOpen(false)}
          className="p-1 rounded hover:bg-secondary text-secondaryText transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden relative">
        {activeBottomTab === 'terminal' && <TerminalView />}
        {activeBottomTab === 'output' && <OutputView />}
        {activeBottomTab === 'deployment' && <DeploymentView />}
        {activeBottomTab === 'ports' && <PortsView />}
        {activeBottomTab === 'problems' && (
          <div className="p-4 flex items-center justify-center h-full text-secondaryText text-sm">
            <div className="flex flex-col items-center gap-2">
              <CheckCircle className="w-6 h-6 text-success" />
              <span>No problems have been detected in the workspace.</span>
            </div>
          </div>
        )}
        {activeBottomTab !== 'terminal' && activeBottomTab !== 'output' && activeBottomTab !== 'problems' && activeBottomTab !== 'deployment' && activeBottomTab !== 'ports' && (
          <div className="p-4 text-sm text-secondaryText font-code">
            [{activeBottomTab.toUpperCase()} ACTIVE]
          </div>
        )}
      </div>
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
        Forwarded Ports
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
        <div className="text-secondaryText italic">No forwarded ports detected yet.</div>
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

function CheckCircle(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <polyline points="22 4 12 14.01 9 11.01" />
    </svg>
  )
}

function TerminalView() {
  const terminalRef = useRef<HTMLDivElement>(null);
  const { projectId } = useIDEStore();
  const xtermRef = useRef<Terminal | null>(null);
  const wsRef = useRef<WebSocket | null>(null);

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
  }, [projectId]);

  return (
    <div className="h-full w-full p-2 pl-4 overflow-hidden" ref={terminalRef} />
  );
}

function OutputView() {
  const { liveEvents } = useIDEStore();
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [liveEvents]);

  return (
    <div className="h-full w-full p-4 overflow-y-auto font-mono text-xs text-primaryText space-y-2 select-text">
      {liveEvents.length === 0 ? (
        <div className="text-secondaryText italic">Waiting for runtime events...</div>
      ) : (
        liveEvents.map((event, idx) => (
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
  );
}
