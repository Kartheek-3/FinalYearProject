import React from 'react';
import { Search, Play, Bug, LayoutPanelLeft, Settings, Bell, PanelBottom, ChevronDown } from 'lucide-react';
import { useIDEStore } from '../../store/useIDEStore';

export default function TopBar() {
  const { toggleSidebar, sidebarOpen, setBottomPanelOpen, bottomPanelOpen } = useIDEStore();

  return (
    <div className="h-10 bg-panel border-b border-border flex items-center justify-between px-4 select-none shrink-0">
      
      {/* Left Group */}
      <div className="flex items-center space-x-6">
        <div className="flex items-center space-x-2 text-sm font-medium text-primaryText hover:text-accent cursor-pointer transition-colors">
          <span className="text-accent">PROJECT</span>
          <span className="text-border">/</span>
          <span>AI Workspace</span>
          <ChevronDown className="w-3 h-3 text-secondaryText" />
        </div>
      </div>

      {/* Center Group (Search & Actions) */}
      <div className="flex items-center space-x-2 flex-1 justify-center max-w-xl">
        <div className="flex items-center bg-background border border-border rounded-md px-3 py-1 flex-1 text-sm text-secondaryText hover:border-accent/50 transition-colors cursor-text group">
          <Search className="w-4 h-4 mr-2 opacity-50 group-hover:opacity-100" />
          <span className="flex-1 text-center font-medium opacity-80">AI Workspace</span>
          <div className="flex items-center gap-1 opacity-50 text-xs font-code">
            <span className="bg-panel px-1 rounded">Ctrl</span>
            <span>+</span>
            <span className="bg-panel px-1 rounded">P</span>
          </div>
        </div>
        
        <div className="flex items-center space-x-1 ml-2">
          <button className="p-1.5 rounded hover:bg-secondary text-secondaryText hover:text-success transition-colors group" title="Run Project">
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
          <div className="flex items-center gap-1.5 bg-secondary/50 px-2 py-1 rounded border border-border/50 text-secondaryText">
            <span className="w-2 h-2 rounded-full bg-success"></span>
            Agent Ready
          </div>
          <div className="flex items-center gap-1.5 bg-secondary/50 px-2 py-1 rounded border border-border/50 text-secondaryText">
            <span className="w-2 h-2 rounded-full bg-accent"></span>
            MCP 4
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
      </div>
    </div>
  );
}
