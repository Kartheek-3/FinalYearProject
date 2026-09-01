import { TaskExecutionStatus } from '../types/api';
import type { ProjectExecutionState } from '../types/api';

interface Props {
  executionState?: ProjectExecutionState;
}

export default function TaskManagement({ executionState }: Props) {
  if (!executionState || !executionState.tasks) {
    return <div className="p-4 text-secondary">No tasks available in current context.</div>;
  }

  const tasks = Object.values(executionState.tasks);

  const getStatusBadge = (status: TaskExecutionStatus) => {
    switch (status) {
      case TaskExecutionStatus.COMPLETED: return 'badge-success';
      case TaskExecutionStatus.REWORK_REQUIRED: return 'badge-warning';
      case TaskExecutionStatus.FAILED: 
      case TaskExecutionStatus.BLOCKED: return 'badge-danger';
      case TaskExecutionStatus.IN_PROGRESS: 
      case TaskExecutionStatus.READY: return 'badge-info';
      default: return 'badge-outline';
    }
  };

  return (
    <div className="p-4">
      <table className="ide-table">
        <thead>
          <tr>
            <th>ID</th>
            <th>Task</th>
            <th>Status</th>
            <th>Priority</th>
            <th>Dependencies</th>
            <th>QA / Reworks</th>
          </tr>
        </thead>
        <tbody>
          {tasks.map(tState => (
            <tr key={tState.task.task_id} style={{ cursor: 'pointer' }}>
              <td className="mono" style={{ color: 'var(--accent-color)' }}>{tState.task.task_id}</td>
              <td style={{ maxWidth: '300px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {tState.task.title}
              </td>
              <td>
                <span className={`badge ${getStatusBadge(tState.status)}`}>{tState.status}</span>
              </td>
              <td className="text-xs">{tState.task.priority}</td>
              <td className="text-xs text-secondary mono">
                {tState.task.dependencies.length > 0 ? tState.task.dependencies.join(', ') : 'none'}
              </td>
              <td className="text-xs mono">
                A:{tState.attempt_count} | R:{tState.rework_count}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
