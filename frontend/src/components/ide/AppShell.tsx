import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useIDEStore } from '../../store/useIDEStore';
import TopBar from './TopBar';
import ActivityBar from './ActivityBar';
import Sidebar from './Sidebar';
import EditorWorkspace from './EditorWorkspace';
import AgentPanel from './AgentPanel';
import BottomPanel from './BottomPanel';
import QuickOpen from './QuickOpen';
import CommandPalette from './CommandPalette';
import { api } from '../../services/api';
import { getLanguageFromPath } from './FileIcons';

export default function AppShell() {
  const { projectId } = useParams();
  const {
    sidebarOpen,
    toggleSidebar,
    bottomPanelOpen,
    setProjectId,
    fetchProject,
    connectWebSocket,
    disconnectWebSocket,
    triggerExecution,
    projectAggregate,
    agentStatus,
    openTab,
    saveCurrentTab,
  } = useIDEStore();

  const [sidebarWidth, setSidebarWidth] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('seam_sidebar_width');
      return saved ? Math.max(220, Math.min(480, parseInt(saved, 10))) : 280;
    } catch {
      return 280;
    }
  });
  const [isResizing, setIsResizing] = useState(false);
  const [quickOpenOpen, setQuickOpenOpen] = useState(false);
  const [allFiles, setAllFiles] = useState<string[]>([]);

  useEffect(() => {
    if (projectId) {
      setProjectId(projectId);
      fetchProject();
      connectWebSocket();
      triggerExecution();
      api.getFiles(projectId).then(setAllFiles).catch(console.error);
    }
    return () => {
      disconnectWebSocket();
    };
  }, [projectId]);

  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);

  // Global Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl/Cmd + Shift + P: Command Palette
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'p') {
        e.preventDefault();
        setCommandPaletteOpen(prev => !prev);
      }
      // Ctrl/Cmd + P: Quick Open
      else if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.key.toLowerCase() === 'p') {
        e.preventDefault();
        if (projectId) {
          api.getFiles(projectId).then(setAllFiles).catch(console.error);
        }
        setQuickOpenOpen(prev => !prev);
      }
      // Ctrl/Cmd + Shift + F: Global Search
      else if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'f') {
        e.preventDefault();
        useIDEStore.getState().setActiveActivity('search');
      }
      // Ctrl/Cmd + `: Toggle Terminal
      else if ((e.ctrlKey || e.metaKey) && e.key === '`') {
        e.preventDefault();
        const store = useIDEStore.getState();
        store.setActiveBottomTab('terminal');
        store.setBottomPanelOpen(!store.bottomPanelOpen);
      }
      // Ctrl/Cmd + B: Toggle Explorer
      else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'b') {
        e.preventDefault();
        toggleSidebar();
      }
      // Ctrl/Cmd + S: Save file
      else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        saveCurrentTab();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [projectId, toggleSidebar, saveCurrentTab]);

  // Resizable sidebar logic
  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;
      // ActivityBar width is 48px
      const newWidth = Math.max(220, Math.min(480, e.clientX - 48));
      setSidebarWidth(newWidth);
    };

    const handleMouseUp = () => {
      if (isResizing) {
        setIsResizing(false);
        localStorage.setItem('seam_sidebar_width', sidebarWidth.toString());
      }
    };

    if (isResizing) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing, sidebarWidth]);

  const handleSelectQuickOpenFile = async (filePath: string) => {
    if (!projectId) return;
    try {
      const data = await api.getFileContent(projectId, filePath);
      openTab({
        id: filePath,
        title: filePath.split('/').pop() || filePath,
        content: data.content,
        language: getLanguageFromPath(filePath)
      });
    } catch (err) {
      console.error(`Failed to open file ${filePath}:`, err);
    }
  };

  return (
    <div className="flex flex-col h-screen w-screen bg-background text-primaryText overflow-hidden font-sans">
      <TopBar 
        onQuickOpen={() => {
          if (projectId) {
            api.getFiles(projectId).then(setAllFiles).catch(console.error);
          }
          setQuickOpenOpen(true);
        }} 
        onCommandPalette={() => setCommandPaletteOpen(true)}
      />
      
      <div className="flex flex-1 overflow-hidden">
        <ActivityBar />
        
        {sidebarOpen && (
          <div 
            style={{ width: `${sidebarWidth}px` }} 
            className="border-r border-border bg-panel flex flex-col shrink-0 relative select-none"
          >
            <Sidebar />
            {/* Resizer Handle */}
            <div
              onMouseDown={handleMouseDown}
              className="absolute top-0 right-0 w-1.5 h-full cursor-col-resize hover:bg-accent/50 transition-colors z-10"
              title="Drag to resize"
            />
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

      <QuickOpen
        isOpen={quickOpenOpen}
        onClose={() => setQuickOpenOpen(false)}
        files={allFiles}
        onSelectFile={handleSelectQuickOpenFile}
      />

      <CommandPalette
        isOpen={commandPaletteOpen}
        onClose={() => setCommandPaletteOpen(false)}
        onOpenQuickOpen={() => {
          setCommandPaletteOpen(false);
          setQuickOpenOpen(true);
        }}
        onOpenNewFile={() => {
          setCommandPaletteOpen(false);
          useIDEStore.getState().setActiveActivity('explorer');
        }}
        onOpenNewFolder={() => {
          setCommandPaletteOpen(false);
          useIDEStore.getState().setActiveActivity('explorer');
        }}
      />
      
      {/* Status Bar */}
      <div className="h-6 bg-secondary text-secondaryText border-t border-border text-[11px] flex items-center px-3 justify-between select-none font-mono">
        <div className="flex items-center space-x-3">
          <span className="flex items-center gap-1 font-semibold text-primaryText">
            <span className="text-accent font-bold">SEAM</span>
          </span>
          <span className="text-border">|</span>
          <span className="flex items-center gap-1 text-slate-300 font-sans">
            <span>main</span>
          </span>
          <span className="text-border">|</span>
          <span className="text-slate-400 font-mono truncate max-w-[140px]">
            {projectAggregate?.project_id ? `${projectAggregate.project_id.substring(0, 14)}...` : 'No Project'}
          </span>
          <span className="text-border">|</span>
          <span className="flex items-center gap-1">
            <span className="text-red-400">⊗ 0</span>
            <span className="text-amber-400">⚠ 0</span>
          </span>
        </div>

        <div className="flex items-center space-x-3">
          <span>UTF-8</span>
          <span className="text-border">|</span>
          <span className="flex items-center gap-1.5 text-primaryText capitalize font-sans font-medium">
            <span className={`w-2 h-2 rounded-full ${agentStatus === 'idle' || agentStatus === 'completed' ? 'bg-success' : agentStatus === 'disconnected' ? 'bg-error' : 'bg-warning animate-pulse'}`}></span>
            {agentStatus.replace('_', ' ')}
          </span>
          {projectAggregate?.delivery_result?.metadata?.host_port && (
            <>
              <span className="text-border">|</span>
              <span className="text-accent font-semibold">
                Port {projectAggregate.delivery_result.metadata.host_port}
              </span>
            </>
          )}
          {projectAggregate?.delivery_result?.delivery_status === 'deployed' && (
            <>
              <span className="text-border">|</span>
              <span className="text-emerald-400 font-semibold font-sans">Docker Healthy</span>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
