import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Play, Bug, LayoutPanelLeft, Settings, Bell, PanelBottom, ChevronDown, LogOut } from 'lucide-react';
import { useIDEStore } from '../../store/useIDEStore';
import { useAuth } from '../../auth/useAuth';

interface TopBarProps {
  onQuickOpen?: () => void;
}

export default function TopBar({ onQuickOpen }: TopBarProps) {
  const {
    toggleSidebar,
    sidebarOpen,
    setBottomPanelOpen,
    bottomPanelOpen,
    triggerExecution,
    agentStatus,
    workspaceMode,
    setWorkspaceMode,
  } = useIDEStore();

  return (
    <div className="h-10 bg-panel border-b border-border flex items-center justify-between px-4 select-none shrink-0">
      
      {/* Left Group */}
      <div className="flex items-center space-x-4">
        <div className="flex items-center space-x-2 text-sm font-medium text-primaryText hover:text-accent cursor-pointer transition-colors">
          <span className="text-accent">PROJECT</span>
          <span className="text-border">/</span>
          <span>AI Workspace</span>
          <ChevronDown className="w-3 h-3 text-secondaryText" />
        </div>

        {/* Center Workspace Mode Tabs */}
        <div className="flex items-center bg-background/80 rounded-lg p-0.5 border border-border/60">
          {(['editor', 'preview', 'diff', 'architecture', 'tests', 'qa'] as const).map((mode) => (
            <button
              key={mode}
              onClick={() => setWorkspaceMode(mode)}
              className={`px-2.5 py-1 text-xs font-medium rounded uppercase transition-all tracking-wide ${
                workspaceMode === mode
                  ? 'bg-accent text-white shadow-sm'
                  : 'text-secondaryText hover:text-primaryText'
              }`}
            >
              {mode}
            </button>
          ))}
        </div>
      </div>

      {/* Center Group (Search & Actions) */}
      <div className="flex items-center space-x-2 flex-1 justify-center max-w-xl">
        <div 
          onClick={onQuickOpen}
          className="flex items-center bg-background border border-border rounded-md px-3 py-1 flex-1 text-sm text-secondaryText hover:border-accent/50 transition-colors cursor-pointer group"
        >
          <Search className="w-4 h-4 mr-2 opacity-50 group-hover:opacity-100" />
          <span className="flex-1 text-center font-medium opacity-80">Quick Open Files</span>
          <div className="flex items-center gap-1 opacity-50 text-xs font-code">
            <span className="bg-panel px-1 rounded">Ctrl</span>
            <span>+</span>
            <span className="bg-panel px-1 rounded">P</span>
          </div>
        </div>
        
        <div className="flex items-center space-x-1 ml-2">
          <button 
            onClick={() => triggerExecution(true)}
            className="p-1.5 rounded hover:bg-secondary text-secondaryText hover:text-success transition-colors group" 
            title="Run Project / Resume Workflow"
          >
            <Play className="w-4 h-4" />
          </button>
          <button className="p-1.5 rounded hover:bg-secondary text-secondaryText hover:text-warning transition-colors" title="Debug">
            <Bug className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Right Group */}
      <div className="flex items-center space-x-2">
        <div className="flex items-center space-x-3 text-xs font-medium mr-4">
          <div className="flex items-center gap-1.5 bg-secondary/50 px-2 py-1 rounded border border-border/50 text-secondaryText capitalize">
            <span className={`w-2 h-2 rounded-full ${
              agentStatus === 'completed' ? 'bg-success' :
              agentStatus === 'failed' ? 'bg-error' :
              agentStatus === 'paused' ? 'bg-warning' :
              agentStatus === 'disconnected' ? 'bg-secondaryText' : 'bg-accent animate-pulse'
            }`}></span>
            {agentStatus.replace('_', ' ')}
          </div>
          <div className="flex items-center gap-1.5 bg-secondary/50 px-2 py-1 rounded border border-border/50 text-secondaryText">
            <span className="w-2 h-2 rounded-full bg-accent"></span>
            SEAM v0.1
          </div>
        </div>

        <div className="flex items-center space-x-1 border-l border-border pl-2">
          <button 
            onClick={toggleSidebar}
            className={`p-1.5 rounded transition-colors ${sidebarOpen ? 'bg-secondary text-primaryText' : 'hover:bg-secondary text-secondaryText'}`} 
            title="Toggle Sidebar"
          >
            <LayoutPanelLeft className="w-4 h-4" />
          </button>
          <button 
            onClick={() => setBottomPanelOpen(!bottomPanelOpen)}
            className={`p-1.5 rounded transition-colors ${bottomPanelOpen ? 'bg-secondary text-primaryText' : 'hover:bg-secondary text-secondaryText'}`} 
            title="Toggle Bottom Panel"
          >
            <PanelBottom className="w-4 h-4" />
          </button>
        </div>

        <div className="flex items-center space-x-1 border-l border-border pl-2">
          <button className="p-1.5 rounded hover:bg-secondary text-secondaryText transition-colors relative">
            <Bell className="w-4 h-4" />
            <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-accent"></span>
          </button>
          <button className="p-1.5 rounded hover:bg-secondary text-secondaryText transition-colors">
            <Settings className="w-4 h-4" />
          </button>
        </div>

        {/* User Profile Menu */}
        <UserMenu />
      </div>
    </div>
  );
}

function UserMenu() {
  const { user, signOut } = useAuth();
  const [open, setOpen] = React.useState(false);
  const navigate = useNavigate();
  const { disconnectWebSocket, setProjectId } = useIDEStore();

  const handleSignOut = async () => {
    disconnectWebSocket();
    setProjectId(null);
    await signOut();
    navigate('/login');
  };

  return (
    <div className="relative border-l border-border pl-2">
      <button
        onClick={() => setOpen(prev => !prev)}
        className="flex items-center gap-1.5 p-1 rounded hover:bg-secondary transition-colors"
        title="Account & User Menu"
      >
        <div className="w-6 h-6 rounded-full bg-accent/20 border border-accent/40 flex items-center justify-center text-[10px] font-bold text-accent uppercase">
          {user?.displayName ? user.displayName.charAt(0) : user?.email ? user.email.charAt(0) : 'U'}
        </div>
      </button>

      {open && (
        <div 
          onClick={(e) => e.stopPropagation()} 
          className="absolute right-0 mt-2 w-56 bg-panel border border-border rounded-lg shadow-2xl py-1 text-xs z-50 animate-in fade-in zoom-in-95 duration-100"
        >
          <div className="px-3 py-2 border-b border-border/60">
            <div className="font-semibold text-primaryText truncate">
              {user?.displayName || 'Developer Workspace'}
            </div>
            <div className="text-[11px] text-secondaryText truncate">
              {user?.email || 'authenticated'}
            </div>
          </div>

          <div className="py-1">
            <button
              onClick={() => {
                setOpen(false);
                navigate('/dashboard');
              }}
              className="w-full text-left px-3 py-1.5 hover:bg-secondary flex items-center gap-2 text-secondaryText hover:text-primaryText transition-colors"
            >
              <span>SEAM Dashboard</span>
            </button>
          </div>

          <div className="border-t border-border/60 py-1">
            <button
              onClick={handleSignOut}
              className="w-full text-left px-3 py-1.5 hover:bg-error/10 text-error flex items-center gap-2 transition-colors font-medium"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
