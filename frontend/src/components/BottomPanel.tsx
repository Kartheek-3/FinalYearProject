import React, { useState } from 'react';
import type { ProjectExecutionState, RuntimeEvent } from '../types/api';
import ExecutionTerminal from './ExecutionTerminal';

interface BottomPanelProps {
  executionState?: ProjectExecutionState | null;
  liveEvents?: RuntimeEvent[];
}

export default function BottomPanel({ executionState, liveEvents = [] }: BottomPanelProps) {
  const [activeTab, setActiveTab] = useState<'terminal' | 'events' | 'problems'>('terminal');

  return (
    <div className="bottom-panel" style={{ height: '250px', display: 'flex', flexDirection: 'column', backgroundColor: '#1e1e1e', borderTop: '1px solid #333' }}>
      <div className="tabs" style={{ display: 'flex', borderBottom: '1px solid #333', backgroundColor: '#252526' }}>
        <button 
          onClick={() => setActiveTab('terminal')}
          style={{ 
            padding: '8px 16px', 
            background: 'none', 
            border: 'none', 
            borderTop: activeTab === 'terminal' ? '1px solid #007acc' : '1px solid transparent',
            color: activeTab === 'terminal' ? '#fff' : '#888',
            cursor: 'pointer',
            fontSize: '12px',
            textTransform: 'uppercase'
          }}
        >
          Terminal
        </button>
        <button 
          onClick={() => setActiveTab('events')}
          style={{ 
            padding: '8px 16px', 
            background: 'none', 
            border: 'none', 
            borderTop: activeTab === 'events' ? '1px solid #007acc' : '1px solid transparent',
            color: activeTab === 'events' ? '#fff' : '#888',
            cursor: 'pointer',
            fontSize: '12px',
            textTransform: 'uppercase'
          }}
        >
          Events
        </button>
        <button 
          onClick={() => setActiveTab('problems')}
          style={{ 
            padding: '8px 16px', 
            background: 'none', 
            border: 'none', 
            borderTop: activeTab === 'problems' ? '1px solid #007acc' : '1px solid transparent',
            color: activeTab === 'problems' ? '#fff' : '#888',
            cursor: 'pointer',
            fontSize: '12px',
            textTransform: 'uppercase'
          }}
        >
          Problems
        </button>
      </div>

      <div className="tab-content" style={{ flex: 1, overflow: 'hidden' }}>
        {activeTab === 'terminal' && (
          <ExecutionTerminal executionState={executionState} liveEvents={liveEvents} />
        )}
        
        {activeTab === 'events' && (
          <div style={{ padding: 15, color: '#d4d4d4', fontSize: '13px', overflowY: 'auto', height: '100%' }}>
            {liveEvents.length === 0 && <span style={{ color: '#888' }}>No events recorded.</span>}
            {liveEvents.map((ev, idx) => (
              <div key={idx} style={{ marginBottom: 4, fontFamily: 'monospace' }}>
                <span style={{ color: '#888' }}>[{new Date(ev.timestamp * 1000).toLocaleTimeString()}]</span>{' '}
                <span style={{ color: '#569cd6' }}>{ev.event_type}</span>{' '}
                <span style={{ color: '#ce9178' }}>{JSON.stringify(ev.data)}</span>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'problems' && (
          <div style={{ padding: 15, color: '#d4d4d4', fontSize: '13px', overflowY: 'auto', height: '100%' }}>
            <span style={{ color: '#888' }}>No problems detected in workspace.</span>
          </div>
        )}
      </div>
    </div>
  );
}
