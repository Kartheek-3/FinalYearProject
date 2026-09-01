import type { ProjectExecutionState } from '../types/api';
import { Target, Activity, Settings } from 'lucide-react';

interface Props {
  executionState?: ProjectExecutionState;
}

export default function SupervisorPanel({ executionState }: Props) {
  return (
    <div className="supervisor-panel">
      <div className="ide-header flex items-center justify-between">
        <span>SEAM SUPERVISOR</span>
        <Settings size={12} />
      </div>
      
      <div className="p-4" style={{ flex: 1, overflowY: 'auto' }}>
        <div className="mb-4">
          <div className="flex items-center gap-2 mb-2 text-xs" style={{ color: 'var(--accent-color)' }}>
            <Activity size={14} />
            <span style={{ fontWeight: 600 }}>CURRENT STATE</span>
          </div>
          <div className="ide-panel p-2">
            {executionState ? (
              <>
                <div className="flex justify-between mb-1">
                  <span className="text-secondary">Iteration:</span>
                  <span>{executionState.iteration}</span>
                </div>
                <div className="flex justify-between mb-1">
                  <span className="text-secondary">Tasks Active:</span>
                  <span>{Object.values(executionState.tasks).filter(t => t.status === 'in_progress').length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-secondary">Reworks:</span>
                  <span className="badge badge-warning">{Object.values(executionState.tasks).reduce((acc, t) => acc + t.rework_count, 0)}</span>
                </div>
              </>
            ) : (
              <div className="text-secondary text-xs">Waiting for execution...</div>
            )}
          </div>
        </div>

        <div className="mb-4">
          <div className="flex items-center gap-2 mb-2 text-xs" style={{ color: 'var(--accent-color)' }}>
            <Target size={14} />
            <span style={{ fontWeight: 600 }}>LAST DECISION</span>
          </div>
          <div className="ide-panel p-2">
            {executionState && executionState.transition_history.length > 0 ? (
              <div className="text-xs">
                <div className="text-secondary mb-1">Trigger:</div>
                <div className="mono mb-2">{executionState.transition_history[executionState.transition_history.length - 1].reason}</div>
              </div>
            ) : (
              <div className="text-secondary text-xs">No decisions recorded yet.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
