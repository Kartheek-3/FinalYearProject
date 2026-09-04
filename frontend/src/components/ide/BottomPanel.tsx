import React, { useEffect, useRef } from 'react';
import { Terminal as TerminalIcon, AlertCircle, AlignLeft, Plug2, Bot, Network, X } from 'lucide-react';
import { useIDEStore } from '../../store/useIDEStore';
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
        {activeBottomTab === 'problems' && (
          <div className="p-4 flex items-center justify-center h-full text-secondaryText text-sm">
            <div className="flex flex-col items-center gap-2">
              <CheckCircle className="w-6 h-6 text-success" />
              <span>No problems have been detected in the workspace.</span>
            </div>
          </div>
        )}
        {activeBottomTab !== 'terminal' && activeBottomTab !== 'problems' && (
          <div className="p-4 text-sm text-secondaryText font-code">
            [{activeBottomTab.toUpperCase()} CONTENT]
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
  const { liveEvents } = useIDEStore();
  const xtermRef = useRef<Terminal | null>(null);
  const processedEvents = useRef(new Set<string>());

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

    term.writeln('\x1b[1;36m$ SEAM IDE Terminal Initialized\x1b[0m\r\n');

    const handleResize = () => fitAddon.fit();
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      term.dispose();
      xtermRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (xtermRef.current && liveEvents.length > 0) {
      const term = xtermRef.current;
      liveEvents.forEach(event => {
        const id = event.event_id || `${event.event_type}-${event.timestamp}`;
        if (!processedEvents.current.has(id)) {
          processedEvents.current.add(id);
          
          const time = new Date().toLocaleTimeString();
          let color = '\x1b[0m';
          if (event.event_type.includes('error') || event.event_type.includes('failed')) color = '\x1b[31m';
          else if (event.event_type.includes('success') || event.event_type.includes('healthy')) color = '\x1b[32m';
          else if (event.event_type.includes('started')) color = '\x1b[34m';
          
          term.writeln(`\x1b[90m[${time}]\x1b[0m ${color}[${event.event_type}]\x1b[0m`);
          
          if (event.data) {
            try {
              const dataStr = typeof event.data === 'string' ? event.data : JSON.stringify(event.data, null, 2);
              dataStr.split('\n').forEach(line => {
                term.writeln(`  \x1b[37m${line}\x1b[0m`);
              });
            } catch (e) {}
          }
          
          if (event.message) {
             term.writeln(`  \x1b[36m> ${event.message}\x1b[0m`);
          }
          term.writeln('');
        }
      });
    }
  }, [liveEvents]);

  return (
    <div className="h-full w-full p-2 pl-4 overflow-hidden" ref={terminalRef} />
  );
}
