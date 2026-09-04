import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Play, FastForward, UploadCloud, RefreshCw } from 'lucide-react';
import { api } from '../services/api';
import { ProjectLifecycleStage } from '../types/api';
import type { ProjectAggregate, RuntimeEvent } from '../types/api';
import LifecyclePipeline from '../components/LifecyclePipeline';
import TaskManagement from '../components/TaskManagement';
import ExecutionTerminal from '../components/ExecutionTerminal';
import SupervisorPanel from '../components/SupervisorPanel';
import ArtifactExplorer from '../components/ArtifactExplorer';
import QAInspector from '../components/QAInspector';
import DeploymentPanel from '../components/DeploymentPanel';
import OrganizationalMemoryPanel from '../components/OrganizationalMemoryPanel';

type Tab = 'overview' | 'tasks' | 'artifacts' | 'qa' | 'deployment';

export default function ProjectDetails() {
  const { projectId } = useParams();
  const [project, setProject] = useState<ProjectAggregate | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  
  const [liveEvents, setLiveEvents] = useState<RuntimeEvent[]>([]);
  const [pipelineStatus, setPipelineStatus] = useState<string>('');

  const fetchProject = async () => {
    if (!projectId) return;
    try {
      const data = await api.getProject(projectId);
      setProject(data);
      setError(null);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProject();
    
    if (!projectId) return;
    let ws: WebSocket | null = null;
    let active = true;

    api.getWebSocketUrl(projectId).then(url => {
      if (!active) return;
      ws = new WebSocket(url);
      ws.onmessage = (e) => {
        try {
          const event: RuntimeEvent = JSON.parse(e.data);
          setLiveEvents(prev => [...prev, event]);
          
          if (event.event_type === 'agent.started') setPipelineStatus(`Agent running: ${event.data.agent}`);
          if (event.event_type === 'planning.section.started') setPipelineStatus(`Planning: ${event.data.section}`);
          if (event.event_type === 'qa.started') setPipelineStatus(`QA testing task: ${event.data.task_id}`);
          if (event.event_type === 'docker.started') setPipelineStatus(`Deploying container...`);
          if (event.event_type === 'runtime.completed') setPipelineStatus('');
          
          if (['agent.completed', 'task.completed', 'qa.completed', 'qa.failed', 'docker.healthy', 'runtime.completed'].includes(event.event_type)) {
            fetchProject();
          }
        } catch (err) {}
      };
    }).catch(console.error);

    return () => {
      active = false;
      if (ws) ws.close();
    };
  }, [projectId]);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (actionLoading) {
      interval = setInterval(() => {
        fetchProject();
      }, 3000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [actionLoading]);

  const runAction = async (actionFn: () => Promise<any>, loadingMsg: string) => {
    if (!projectId) return;
    setActionLoading(loadingMsg);
    try {
      await actionFn();
      await fetchProject();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) {
    return <div className="p-4 text-secondary">Loading Workspace Context...</div>;
  }

  if (error || !project) {
    return (
      <div className="p-4">
        <div className="badge badge-danger p-2">{error || 'Project context not found'}</div>
      </div>
    );
  }

  const canExecute = [ProjectLifecycleStage.READY_FOR_EXECUTION, ProjectLifecycleStage.EXECUTING].includes(project.lifecycle.stage);
  const canDeploy = project.lifecycle.stage === ProjectLifecycleStage.READY_FOR_DELIVERY;

  return (
    <div className="flex" style={{ height: '100%', overflow: 'hidden' }}>
      {/* Center Main Workspace */}
      <div className="flex-1 flex flex-col min-w-0">
        
        {/* Workspace Toolbar */}
        <div className="flex justify-between items-center px-4 py-2" style={{ borderBottom: '1px solid var(--panel-border)' }}>
          <div className="mono" style={{ fontWeight: 600 }}>{project.project_id}</div>
          <div className="flex gap-2">
            <button className="btn" onClick={fetchProject} disabled={!!actionLoading} title="Refresh Context">
              <RefreshCw size={14} />
            </button>
            <button className="btn" onClick={() => runAction(() => api.executeNextTask(projectId as string), 'Executing...')} disabled={!canExecute || !!actionLoading}>
              <Play size={14} /> Step
            </button>
            <button 
              className="btn" 
              onClick={() => {
                if (project.lifecycle.stage === ProjectLifecycleStage.CREATED || project.lifecycle.stage === ProjectLifecycleStage.FAILED) {
                  return runAction(() => api.runAutonomousProject(projectId as string), 'Starting Pipeline...');
                }
                return runAction(() => api.runUntilBlocked(projectId as string, 10), 'Running...');
              }} 
              disabled={
                !(canExecute || project.lifecycle.stage === ProjectLifecycleStage.CREATED || project.lifecycle.stage === ProjectLifecycleStage.FAILED) || !!actionLoading
              }
            >
              <FastForward size={14} /> Run
            </button>
            <button className="btn" style={{ borderColor: canDeploy ? 'var(--success)' : '' }} onClick={() => runAction(() => api.deployProject(projectId as string), 'Deploying...')} disabled={!canDeploy || !!actionLoading}>
              <UploadCloud size={14} style={{ color: canDeploy ? 'var(--success)' : 'inherit' }} /> Deploy
            </button>
          </div>
        </div>

        <LifecyclePipeline project={project} />

        <div className="workspace-tabs mt-2">
          <div className={`workspace-tab ${activeTab === 'overview' ? 'active' : ''}`} onClick={() => setActiveTab('overview')}>Overview</div>
          <div className={`workspace-tab ${activeTab === 'tasks' ? 'active' : ''}`} onClick={() => setActiveTab('tasks')}>Tasks</div>
          <div className={`workspace-tab ${activeTab === 'artifacts' ? 'active' : ''}`} onClick={() => setActiveTab('artifacts')}>Explorer</div>
          <div className={`workspace-tab ${activeTab === 'qa' ? 'active' : ''}`} onClick={() => setActiveTab('qa')}>QA / Tests</div>
          <div className={`workspace-tab ${activeTab === 'deployment' ? 'active' : ''}`} onClick={() => setActiveTab('deployment')}>Deployment</div>
        </div>

        <div className="workspace-content">
          {activeTab === 'overview' && (
            <div className="p-4" style={{ maxWidth: '800px' }}>
              <h3 className="text-xs font-bold text-secondary mb-2 uppercase">Requirements Context</h3>
              <div className="ide-panel p-4 mb-4 mono text-xs" style={{ whiteSpace: 'pre-wrap' }}>
                {project.project_input.project_description}
              </div>
              
              <h3 className="text-xs font-bold text-secondary mb-2 uppercase">Tech Stack</h3>
              <div className="flex gap-2">
                {project.project_input.technology_stack.map((t, idx) => (
                  <span key={idx} className="badge badge-outline">{t}</span>
                ))}
              </div>
            </div>
          )}
          {activeTab === 'tasks' && <TaskManagement executionState={project.execution_state || undefined} />}
          {activeTab === 'artifacts' && <ArtifactExplorer project={project} />}
          {activeTab === 'qa' && <QAInspector project={project} />}
          {activeTab === 'deployment' && <DeploymentPanel project={project} />}
        </div>

        <ExecutionTerminal executionState={project.execution_state || undefined} liveEvents={liveEvents} />
      </div>

      <SupervisorPanel executionState={project.execution_state || undefined} />
      
      <div style={{ height: '250px', borderTop: '1px solid var(--panel-border)' }}>
        <OrganizationalMemoryPanel projectId={projectId} />
      </div>

      {(actionLoading || pipelineStatus) && (
        <div className="loading-overlay">
          <div className="spinner mb-4"></div>
          <div className="mono text-xs">{pipelineStatus || actionLoading}</div>
        </div>
      )}
    </div>
  );
}
