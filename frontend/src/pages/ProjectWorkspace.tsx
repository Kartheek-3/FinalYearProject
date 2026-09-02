import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Play, FastForward, UploadCloud, RefreshCw } from 'lucide-react';
import { api } from '../services/api';
import { ProjectLifecycleStage } from '../types/api';
import type { ProjectAggregate, RuntimeEvent } from '../types/api';

import FileExplorer from '../components/FileExplorer';
import EditorView from '../components/EditorView';
import SupervisorPanel from '../components/SupervisorPanel';
import BottomPanel from '../components/BottomPanel';
import OrganizationalMemoryPanel from '../components/OrganizationalMemoryPanel';

export default function ProjectWorkspace() {
  const { projectId } = useParams();
  const [project, setProject] = useState<ProjectAggregate | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  
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
    const ws = new WebSocket(api.getWebSocketUrl(projectId));
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
    return () => ws.close();
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
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', width: '100vw', overflow: 'hidden' }}>
      
      {/* Top Toolbar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 16px', backgroundColor: '#333', color: '#fff', borderBottom: '1px solid #111' }}>
        <div style={{ fontWeight: 'bold', fontFamily: 'monospace' }}>SEAM Workspace: {project.project_id}</div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button className="btn" onClick={fetchProject} disabled={!!actionLoading} title="Refresh Context">
            <RefreshCw size={14} /> Refresh
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
            style={{ backgroundColor: '#007acc', color: '#fff', border: 'none' }}
          >
            <FastForward size={14} /> Run Autonomous
          </button>
          <button 
            className="btn" 
            style={{ backgroundColor: canDeploy ? '#28a745' : 'transparent', color: canDeploy ? '#fff' : '#888', border: canDeploy ? 'none' : '1px solid #555' }} 
            onClick={() => runAction(() => api.deployProject(projectId as string), 'Deploying...')} 
            disabled={!canDeploy || !!actionLoading}
          >
            <UploadCloud size={14} /> Deploy
          </button>
        </div>
      </div>

      {/* Main Layout */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        
        {/* Left: Explorer */}
        <FileExplorer projectId={projectId as string} onFileSelect={setSelectedFile} selectedFile={selectedFile} />

        {/* Center: Editor */}
        <EditorView projectId={projectId as string} filePath={selectedFile} />

        {/* Right: Supervisor Panel */}
        <div style={{ width: '300px', display: 'flex', flexDirection: 'column', borderLeft: '1px solid #333' }}>
          <SupervisorPanel executionState={project.execution_state || undefined} />
          <div style={{ height: '300px', borderTop: '1px solid #333' }}>
             <OrganizationalMemoryPanel projectId={projectId} />
          </div>
        </div>

      </div>

      {/* Bottom: Terminal & Events */}
      <BottomPanel executionState={project.execution_state || undefined} liveEvents={liveEvents} />

      {(actionLoading || pipelineStatus) && (
        <div className="loading-overlay" style={{ position: 'absolute', bottom: 10, right: 10, backgroundColor: 'rgba(0,0,0,0.8)', padding: '10px 20px', borderRadius: 4, color: '#fff', fontSize: '12px', zIndex: 1000 }}>
          <div className="spinner mb-2" style={{ display: 'inline-block', width: 12, height: 12, border: '2px solid #007acc', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
          <span style={{ marginLeft: 10, fontFamily: 'monospace' }}>{pipelineStatus || actionLoading}</span>
        </div>
      )}
    </div>
  );
}
