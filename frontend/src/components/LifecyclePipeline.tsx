import { ProjectLifecycleStage } from '../types/api';
import type { ProjectAggregate } from '../types/api';

interface Props {
  project: ProjectAggregate;
}

const STAGES = [
  { id: ProjectLifecycleStage.ANALYZED, label: 'ANALYSIS' },
  { id: ProjectLifecycleStage.PLANNED, label: 'PLANNING' },
  { id: ProjectLifecycleStage.READY_FOR_EXECUTION, label: 'SUPERVISOR' },
  { id: ProjectLifecycleStage.EXECUTING, label: 'CODING & QA' },
  { id: ProjectLifecycleStage.READY_FOR_DELIVERY, label: 'DELIVERY' },
];

export default function LifecyclePipeline({ project }: Props) {
  const currentStage = project.lifecycle.stage;
  const getStageIndex = (stage: ProjectLifecycleStage) => STAGES.findIndex(s => s.id === stage);
  const currentIndex = getStageIndex(currentStage);

  return (
    <div className="p-4" style={{ backgroundColor: 'var(--panel-bg)', borderBottom: '1px solid var(--panel-border)' }}>
      <div className="flex items-center justify-between">
        {STAGES.map((stage, index) => {
          const isCompleted = index < currentIndex || currentStage === ProjectLifecycleStage.READY_FOR_DELIVERY;
          const isActive = index === currentIndex && currentStage !== ProjectLifecycleStage.READY_FOR_DELIVERY;
          
          
          
          return (
            <div key={stage.id} className="flex items-center flex-1">
              <div className="flex flex-col items-center gap-2">
                <div 
                  style={{
                    width: '12px', height: '12px', borderRadius: '50%',
                    backgroundColor: isActive ? 'var(--accent-color)' : isCompleted ? 'var(--success)' : 'transparent',
                    border: `2px solid ${isCompleted || isActive ? 'transparent' : 'var(--panel-border)'}`,
                    boxShadow: isActive ? '0 0 0 4px rgba(0, 122, 204, 0.2)' : 'none'
                  }}
                />
                <span style={{ fontSize: '10px', fontWeight: isActive ? 'bold' : 'normal', color: isActive ? 'var(--accent-color)' : 'var(--text-secondary)' }}>
                  {stage.label}
                </span>
              </div>
              {index < STAGES.length - 1 && (
                <div style={{ flex: 1, height: '1px', backgroundColor: isCompleted ? 'var(--success)' : 'var(--panel-border)', margin: '0 16px', alignSelf: 'flex-start', marginTop: '6px' }} />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
