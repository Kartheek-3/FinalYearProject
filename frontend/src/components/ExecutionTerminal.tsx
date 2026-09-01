import type { ProjectExecutionState, RuntimeEvent } from '../types/api';

interface Props {
  executionState?: ProjectExecutionState | null;
  liveEvents?: RuntimeEvent[];
}

export default function ExecutionTerminal({ executionState, liveEvents = [] }: Props) {
  const records = executionState?.transition_history || [];

  return (
    <div className="ide-panel flex flex-col" style={{ height: '250px', borderTop: 'none', backgroundColor: '#000' }}>
      <div className="ide-header flex-none" style={{ backgroundColor: '#1a1a1a' }}>SEAM Execution Terminal</div>
      <div className="p-4 mono flex-1 overflow-y-auto" style={{ fontSize: '12px' }}>
        <div style={{ color: 'var(--success)' }}>[SYSTEM] SEAM Initialized.</div>
        
        {records.map((rec: any, idx: number) => {
          const time = new Date(rec.occurred_at).toLocaleTimeString();
          return (
            <div key={`rec-${idx}`} style={{ marginTop: '4px' }}>
              <span style={{ color: 'var(--text-secondary)' }}>[{time}] </span>
              <span style={{ color: 'var(--accent-color)' }}>{rec.actor || 'Supervisor'}: </span>
              <span>Task </span>
              <span style={{ color: '#ce9178' }}>{rec.task_id}</span>
              <span> transitioned from </span>
              <span style={{ color: '#dcdcaa' }}>{rec.from_status}</span>
              <span> to </span>
              <span style={{ color: '#4ec9b0' }}>{rec.to_status}</span>
              <span className="text-secondary"> ({rec.reason})</span>
            </div>
          );
        })}
        
        {liveEvents.map((ev, idx) => {
          const time = new Date(ev.timestamp * 1000).toLocaleTimeString();
          return (
            <div key={`ev-${idx}`} style={{ marginTop: '4px' }}>
              <span style={{ color: 'var(--text-secondary)' }}>[{time}] </span>
              <span style={{ color: '#569cd6' }}>{ev.event_type}</span>
              <span style={{ color: 'var(--text-secondary)' }}> {JSON.stringify(ev.data)}</span>
            </div>
          );
        })}
        
        {(records.length > 0 || liveEvents.length > 0) && <div className="mt-2 text-secondary">_</div>}
      </div>
    </div>
  );
}
