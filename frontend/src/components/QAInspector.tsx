import type { ProjectAggregate } from '../types/api';

interface Props {
  project: ProjectAggregate;
}

export default function QAInspector({ project }: Props) {
  const gates = project.quality_gates || [];

  if (gates.length === 0) {
    return <div className="p-4 text-secondary">No QA evaluations have been recorded.</div>;
  }

  return (
    <div className="p-4">
      <h3 className="mb-4 text-xs font-semibold" style={{ color: 'var(--text-secondary)', textTransform: 'uppercase' }}>QA Feedback History</h3>
      
      <div className="flex-col gap-4 flex">
        {gates.map((gate: any, idx: number) => {
          let badgeCls = 'badge-success';
          if (gate.status === 'rework_required') badgeCls = 'badge-warning';
          if (gate.status === 'blocked' || gate.status === 'failed') badgeCls = 'badge-danger';

          return (
            <div key={idx} className="ide-panel p-4">
              <div className="flex justify-between items-center mb-2">
                <div className="mono font-bold">{gate.task_id}</div>
                <div className={`badge ${badgeCls}`}>{gate.status}</div>
              </div>
              <div className="text-secondary mb-2">
                {gate.reason}
              </div>
              {gate.report_index !== null && (
                <div className="text-xs">
                  <span className="text-secondary">Report Index: </span>
                  <span className="mono">{gate.report_index}</span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
