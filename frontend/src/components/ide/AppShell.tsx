import React, { useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useIDEStore } from '../../store/useIDEStore';
import TopBar from './TopBar';
import ActivityBar from './ActivityBar';
import Sidebar from './Sidebar';
import EditorWorkspace from './EditorWorkspace';
import AgentPanel from './AgentPanel';
import BottomPanel from './BottomPanel';

export default function AppShell() {
  const { projectId } = useParams();
  const { sidebarOpen, bottomPanelOpen, setProjectId, fetchProject, connectWebSocket, disconnectWebSocket, projectAggregate, agentStatus } = useIDEStore();

  useEffect(() => {
    if (projectId) {
      setProjectId(projectId);
      fetchProject();
      connectWebSocket();
    }
    return () => {
      disconnectWebSocket();
    };
  }, [projectId]);

  return (
    <div className="flex flex-col h-screen w-screen bg-background text-primaryText overflow-hidden font-sans">
      <TopBar />
      
      <div className="flex flex-1 overflow-hidden">
        <ActivityBar />
        
        {sidebarOpen && (
          <div className="w-64 border-r border-border bg-panel flex flex-col shrink-0">
            <Sidebar />
          </div>
        )}
        
        <div className="flex flex-col flex-1 overflow-hidden">
          <div className="flex flex-1 overflow-hidden">
            <div className="flex-1 flex flex-col min-w-0">
              <EditorWorkspace />
            </div>
            
            <div className="w-80 border-l border-border bg-panel shrink-0 flex flex-col">
              <AgentPanel />
            </div>
          </div>
          
          {bottomPanelOpen && (
            <div className="h-64 border-t border-border bg-panel shrink-0">
              <BottomPanel />
            </div>
          )}
        </div>
      </div>
      
      {/* Status Bar */}
      <div className="h-6 bg-secondary text-secondaryText border-t border-border text-xs flex items-center px-3 justify-between select-none">
        <div className="flex items-center space-x-4">
          <span className="flex items-center gap-1">
            <span className="text-accent">main</span>
          </span>
          <span className="flex items-center gap-1">
            <span>{projectAggregate?.project_id || 'No Project'}</span>
          </span>
        </div>
        <div className="flex items-center space-x-4">
          <span>UTF-8</span>
          <span className="flex items-center gap-1 text-primaryText capitalize">
            <span className={`w-2 h-2 rounded-full ${agentStatus === 'idle' || agentStatus === 'completed' ? 'bg-success' : agentStatus === 'disconnected' ? 'bg-error' : 'bg-warning animate-pulse'}`}></span>
            {agentStatus.replace('_', ' ')}
          </span>
          {projectAggregate?.delivery_result?.metadata?.host_port && (
            <span>Port {projectAggregate.delivery_result.metadata.host_port}</span>
          )}
        </div>
      </div>
    </div>
  );
}
