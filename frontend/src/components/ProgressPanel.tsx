import { ProjectLifecycleStage, RuntimeEvent, ProjectExecutionState } from '../types/api';

interface ProgressPanelProps {
  lifecycleStage: ProjectLifecycleStage;
  pipelineStatus: string;
  liveEvents: RuntimeEvent[];
  executionState?: ProjectExecutionState | null;
}

const PHASES = [
  { id: 'analysis', label: 'Analysis' },
  { id: 'planning', label: 'Planning' },
  { id: 'scaffolding', label: 'Scaffolding' },
  { id: 'coding', label: 'Code Generation' },
  { id: 'qa', label: 'QA / Testing' },
  { id: 'docker', label: 'Deployment' }
];

export default function ProgressPanel({ lifecycleStage, pipelineStatus, liveEvents, executionState }: ProgressPanelProps) {
  // Infer active phase from events
  let activePhase = 'none';
  let completedPhases = new Set<string>();
  let filesCreated = 0;
  
  // Calculate real progress from execution_state
  let totalTasks = 0;
  let completedTasks = 0;
  
  if (executionState?.tasks) {
    totalTasks = Object.keys(executionState.tasks).length;
    completedTasks = Object.values(executionState.tasks).filter(t => t.status === 'COMPLETED').length;
  }

  liveEvents.forEach(event => {
    if (event.event_type === 'agent.completed' && event.data.agent === 'analysis') completedPhases.add('analysis');
    if (event.event_type === 'agent.completed' && event.data.agent === 'planning') completedPhases.add('planning');
    if (event.event_type === 'folder.created') completedPhases.add('scaffolding'); // at least started
    
    if (event.event_type.startsWith('file.')) filesCreated++;
    
    if (event.event_type === 'qa.completed') completedPhases.add('qa');
    if (event.event_type === 'docker.healthy') completedPhases.add('docker');
    if (lifecycleStage === ProjectLifecycleStage.READY_FOR_DELIVERY) completedPhases.add('coding');
    
    // Active phase
    if (event.event_type === 'agent.started' && event.data.agent === 'analysis') activePhase = 'analysis';
    if (event.event_type === 'agent.started' && event.data.agent === 'planning') activePhase = 'planning';
    if (event.event_type === 'task.started') activePhase = 'coding';
    if (event.event_type === 'qa.started') activePhase = 'qa';
    if (event.event_type === 'docker.started') activePhase = 'docker';
  });

  const progressPercentage = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
  const progressBars = Math.floor(progressPercentage / 5);
  const emptyBars = 20 - progressBars;
  
  const barString = '█'.repeat(progressBars) + '░'.repeat(emptyBars);

  return (
    <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px', color: '#ccc', fontSize: '13px', backgroundColor: '#252526', height: '100%', overflowY: 'auto' }}>
      <div style={{ textTransform: 'uppercase', fontSize: '11px', fontWeight: 'bold', color: '#aaa', letterSpacing: '0.5px' }}>
        SEAM SUPERVISOR
      </div>
      
      <div>
        <div style={{ color: '#888', fontSize: '11px' }}>STATUS:</div>
        <div style={{ color: lifecycleStage === ProjectLifecycleStage.FAILED ? '#d32f2f' : '#007acc', fontWeight: 'bold' }}>
          {lifecycleStage.replace(/_/g, ' ')}
        </div>
      </div>
      
      <div>
        <div style={{ color: '#888', fontSize: '11px' }}>CURRENT ACTIVITY:</div>
        <div style={{ color: '#d4d4d4' }}>{pipelineStatus || 'Idle'}</div>
      </div>

      <div>
        <div style={{ color: '#888', fontSize: '11px', marginBottom: '4px' }}>OVERALL PROGRESS:</div>
        <div style={{ fontFamily: 'monospace', color: '#28a745' }}>
          {barString} {progressPercentage}%
        </div>
        {totalTasks > 0 && (
          <div style={{ fontSize: '11px', color: '#888', marginTop: '2px' }}>
            {completedTasks} of {totalTasks} tasks completed
          </div>
        )}
      </div>

      <div style={{ marginTop: '8px' }}>
        <div style={{ color: '#888', fontSize: '11px', marginBottom: '8px' }}>PHASES:</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {PHASES.map((phase) => {
            let statusColor = '#555';
            let icon = '○';
            
            if (completedPhases.has(phase.id)) {
              statusColor = '#28a745';
              icon = '✓';
            } else if (activePhase === phase.id || (lifecycleStage === ProjectLifecycleStage.EXECUTING && phase.id === 'coding')) {
              statusColor = '#007acc';
              icon = '●';
            }

            return (
              <div key={phase.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', color: statusColor }}>
                <span style={{ fontSize: '14px', width: '16px', textAlign: 'center' }}>{icon}</span>
                <span style={{ fontWeight: activePhase === phase.id ? 'bold' : 'normal' }}>{phase.label}</span>
              </div>
            );
          })}
        </div>
      </div>
      
      <div style={{ marginTop: 'auto', paddingTop: '16px', borderTop: '1px solid #333' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
          <span style={{ color: '#888' }}>FILES CREATED:</span>
          <span>{filesCreated}</span>
        </div>
      </div>
    </div>
  );
}
