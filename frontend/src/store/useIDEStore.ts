import { create, StateCreator } from 'zustand';
import { api } from '../services/api';
import type { ProjectAggregate, RuntimeEvent } from '../types/api';

export type ActivityBarItem = 'explorer' | 'search' | 'source_control' | 'agents' | 'mcp' | 'extensions' | 'settings';

export interface Tab {
  id: string;
  title: string;
  content: string;
  language: string;
  isDirty?: boolean;
}

export type AgentStatus = 
  | 'idle'
  | 'initializing'
  | 'running'
  | 'planning'
  | 'executing'
  | 'testing'
  | 'paused'
  | 'completed'
  | 'failed'
  | 'disconnected';

export interface TimelineEvent {
  id: string;
  type: string;
  status: 'pending' | 'active' | 'completed' | 'failed';
  message: string;
  timestamp: string;
  rawEvent?: RuntimeEvent;
}

export type WorkspaceMode = 'editor' | 'preview' | 'diff' | 'architecture' | 'tests' | 'qa';

export interface DiffState {
  path: string;
  original: string;
  modified: string;
  taskTitle?: string;
  reason?: string;
}

export interface FileTraceability {
  path: string;
  agent: string;
  taskId?: string;
  action: 'created' | 'updated';
  timestamp: string;
}

interface IDEState {
  // Global Project State
  projectId: string | null;
  projectAggregate: ProjectAggregate | null;
  setProjectId: (id: string | null) => void;
  fetchProject: () => Promise<void>;
  
  // Realtime Events & Execution
  liveEvents: RuntimeEvent[];
  connectWebSocket: () => void;
  disconnectWebSocket: () => void;
  triggerExecution: (force?: boolean) => Promise<void>;
  
  // Workspace Mode
  workspaceMode: WorkspaceMode;
  setWorkspaceMode: (mode: WorkspaceMode) => void;
  diffState: DiffState | null;
  setDiffState: (diff: DiffState | null) => void;
  traceabilityMap: Record<string, FileTraceability>;

  // Layout
  activeActivity: ActivityBarItem;
  sidebarOpen: boolean;
  bottomPanelOpen: boolean;
  activeBottomTab: 'terminal' | 'problems' | 'output' | 'mcp' | 'agents' | 'ports' | 'deployment';
  
  // Actions
  setActiveActivity: (item: ActivityBarItem) => void;
  toggleSidebar: () => void;
  setBottomPanelOpen: (isOpen: boolean) => void;
  setActiveBottomTab: (tab: IDEState['activeBottomTab']) => void;

  // Editor
  tabs: Tab[];
  activeTabId: string | null;
  openTab: (tab: Tab) => void;
  closeTab: (id: string) => void;
  setActiveTab: (id: string) => void;
  updateTabContent: (id: string, content: string) => void;
  saveCurrentTab: () => Promise<void>;
  saveTab: (id: string) => Promise<void>;

  // Agent State
  agentStatus: AgentStatus;
  timeline: TimelineEvent[];
  setAgentStatus: (status: AgentStatus) => void;
  addTimelineEvent: (event: TimelineEvent) => void;
  updateTimelineEvent: (id: string, updates: Partial<TimelineEvent>) => void;
}

let wsConnection: WebSocket | null = null;
let isExecuting = false;

const storeCreator: StateCreator<IDEState> = (set, get) => ({
  projectId: null,
  projectAggregate: null,
  liveEvents: [],
  
  setProjectId: (id) => set({ projectId: id, liveEvents: [], timeline: [], agentStatus: 'initializing' }),

  fetchProject: async () => {
    const id = get().projectId;
    if (!id) return;
    try {
      const data = await api.getProject(id);
      set({ projectAggregate: data });

      // Determine agent status from persisted lifecycle stage if not actively receiving newer events
      const stage = data.lifecycle?.stage;
      if (stage === 'failed') {
        set({ agentStatus: 'failed' });
      } else if (stage === 'paused') {
        set({ agentStatus: 'paused' });
      } else if (stage === 'ready_for_delivery' && data.delivery_result?.delivery_status === 'deployed') {
        set({ agentStatus: 'completed' });
      } else if (stage === 'executing' || stage === 'analyzed' || stage === 'planned' || stage === 'ready_for_execution') {
        if (get().agentStatus !== 'running' && get().agentStatus !== 'executing' && get().agentStatus !== 'testing') {
          set({ agentStatus: 'running' });
        }
      }
    } catch (err) {
      console.error('Failed to fetch project:', err);
    }
  },

  triggerExecution: async (force = false) => {
    const id = get().projectId;
    if (!id) return;
    if (isExecuting && !force) return;

    try {
      const statusRes = await api.getProjectStatus(id);
      if (statusRes.is_running) {
        set({ agentStatus: 'running' });
        return;
      }
      if (statusRes.stage === 'failed' && !force) {
        set({ agentStatus: 'failed' });
        return;
      }
      if (statusRes.stage === 'ready_for_delivery' && !force) {
        set({ agentStatus: 'completed' });
        return;
      }

      isExecuting = true;
      set({ agentStatus: 'running' });
      await api.runAutonomousProject(id);
    } catch (err) {
      console.error('Failed to trigger autonomous execution:', err);
    } finally {
      isExecuting = false;
    }
  },

  connectWebSocket: async () => {
    const id = get().projectId;
    if (!id) return;
    if (wsConnection) {
      wsConnection.close();
      wsConnection = null;
    }
    
    const wsUrl = await api.getWebSocketUrl(id);
    wsConnection = new WebSocket(wsUrl);
    
    wsConnection.onopen = () => {
      // If status was initializing or disconnected, check if we have events or should be running
      if (get().agentStatus === 'disconnected' || get().agentStatus === 'initializing') {
        set({ agentStatus: 'running' });
      }
    };

    wsConnection.onmessage = (e) => {
      try {
        const event: RuntimeEvent = JSON.parse(e.data);
        set((state) => ({ liveEvents: [...state.liveEvents, event] }));
        
        // Map raw event to timeline
        const timelineId = event.event_id || `${event.event_type}-${event.timestamp}-${Math.random().toString(36).substring(7)}`;
        const newTimelineEvent: TimelineEvent = {
          id: timelineId,
          type: event.event_type,
          status: event.event_type.includes('failed') ? 'failed' : 
                  event.event_type.includes('completed') || event.event_type.includes('healthy') ? 'completed' : 'active',
          message: event.message || (event.data?.agent ? `Agent: ${event.data.agent}` : event.data?.task_id ? `Task: ${event.data.task_id}` : `Event: ${event.event_type}`),
          timestamp: new Date(event.timestamp * 1000).toISOString(),
          rawEvent: event
        };
        
        set((state) => ({
          timeline: [...state.timeline, newTimelineEvent]
        }));

        // File traceability & auto-open logic
        if (event.event_type === 'file.created') {
          const filePath = event.data?.path;
          if (filePath && typeof filePath === 'string') {
            const isSource = !filePath.startsWith('planning/') && !filePath.startsWith('qa/') && !filePath.startsWith('runtime/');
            const agentName = event.data?.agent || (isSource ? 'Coding Agent' : 'Agent');
            const taskId = event.data?.task_id;
            
            // Record traceability
            set((state) => ({
              traceabilityMap: {
                ...state.traceabilityMap,
                [filePath]: {
                  path: filePath,
                  agent: agentName,
                  taskId,
                  action: 'created',
                  timestamp: new Date(event.timestamp * 1000).toLocaleTimeString(),
                }
              }
            }));

            // Auto-open primary application source files in Monaco
            if (isSource) {
              const currentProjId = get().projectId;
              if (currentProjId) {
                // Fetch content and open tab automatically
                api.getFileContent(currentProjId, filePath).then(data => {
                  const ext = filePath.split('.').pop() || '';
                  const langMap: Record<string, string> = {
                    ts: 'typescript',
                    tsx: 'typescript',
                    js: 'javascript',
                    jsx: 'javascript',
                    py: 'python',
                    html: 'html',
                    css: 'css',
                    json: 'json',
                    md: 'markdown',
                    dockerfile: 'dockerfile',
                  };
                  get().openTab({
                    id: filePath,
                    title: filePath.split('/').pop() || filePath,
                    content: data.content,
                    language: langMap[ext.toLowerCase()] || 'plaintext',
                  });
                  // Ensure we are in editor mode
                  if (get().workspaceMode === 'editor') {
                    set({ activeTabId: filePath });
                  }
                }).catch(err => console.error('Auto-open file error:', err));
              }
            }
          }
        }

        if (event.event_type === 'file.updated') {
          const filePath = event.data?.path;
          if (filePath && typeof filePath === 'string') {
            // Update traceability
            set((state) => ({
              traceabilityMap: {
                ...state.traceabilityMap,
                [filePath]: {
                  path: filePath,
                  agent: event.data?.agent || 'Coding Agent',
                  taskId: event.data?.task_id,
                  action: 'updated',
                  timestamp: new Date(event.timestamp * 1000).toLocaleTimeString(),
                }
              }
            }));

            // If backend emitted previous and new content, set up diff state
            if (event.data?.previous_content !== undefined && event.data?.new_content !== undefined) {
              set({
                diffState: {
                  path: filePath,
                  original: event.data.previous_content,
                  modified: event.data.new_content,
                  taskTitle: event.data?.task_id || 'Rework Task',
                  reason: event.data?.reason || 'Coding Agent update after QA verification',
                }
              });
            }

            // Refresh tab if open and not dirty
            const existingTab = get().tabs.find(t => t.id === filePath);
            if (existingTab && !existingTab.isDirty) {
              const currentProjId = get().projectId;
              if (currentProjId) {
                api.getFileContent(currentProjId, filePath).then(data => {
                  set((state) => ({
                    tabs: state.tabs.map(t => t.id === filePath ? { ...t, content: data.content } : t)
                  }));
                }).catch(console.error);
              }
            }
          }
        }

        // Determine general agent status from actual backend events
        if (event.event_type === 'runtime.completed' || event.event_type === 'docker.healthy') {
          set({ agentStatus: 'completed' });
          get().fetchProject();
        } else if (event.event_type === 'runtime.failed' || event.event_type === 'docker.failed') {
          set({ agentStatus: 'failed' });
          get().fetchProject();
        } else if (event.event_type === 'qa.failed') {
          set({ agentStatus: 'paused' });
          get().fetchProject();
        } else if (event.event_type.startsWith('qa.')) {
          set({ agentStatus: 'testing' });
        } else if (event.event_type.startsWith('planning')) {
          set({ agentStatus: 'planning' });
        } else if (event.event_type.startsWith('task.started') || event.event_type.startsWith('task.completed')) {
          set({ agentStatus: 'executing' });
        } else if (event.event_type.startsWith('agent.started')) {
          set({ agentStatus: 'running' });
        }
        
      } catch (err) {
        console.error('WS Parse error', err);
      }
    };

    wsConnection.onclose = () => {
      if (get().agentStatus !== 'completed' && get().agentStatus !== 'failed') {
        set({ agentStatus: 'disconnected' });
      }
    };
  },
  
  disconnectWebSocket: () => {
    if (wsConnection) {
      wsConnection.close();
      wsConnection = null;
    }
  },

  workspaceMode: 'editor',
  setWorkspaceMode: (mode) => set({ workspaceMode: mode }),
  diffState: null,
  setDiffState: (diff) => set({ diffState: diff }),
  traceabilityMap: {},

  activeActivity: 'explorer',
  sidebarOpen: true,
  bottomPanelOpen: true,
  activeBottomTab: 'terminal',

  setActiveActivity: (item) => set({ activeActivity: item, sidebarOpen: true }),
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
  setBottomPanelOpen: (isOpen) => set({ bottomPanelOpen: isOpen }),
  setActiveBottomTab: (tab) => set({ activeBottomTab: tab, bottomPanelOpen: true }),

  tabs: [],
  activeTabId: null,

  openTab: (tab) => set((state) => {
    if (!state.tabs.find(t => t.id === tab.id)) {
      return { tabs: [...state.tabs, tab], activeTabId: tab.id };
    }
    return { activeTabId: tab.id, tabs: state.tabs.map(t => t.id === tab.id ? tab : t) };
  }),
  closeTab: (id) => set((state) => {
    const newTabs = state.tabs.filter(t => t.id !== id);
    return {
      tabs: newTabs,
      activeTabId: state.activeTabId === id ? (newTabs[0]?.id || null) : state.activeTabId
    };
  }),
  setActiveTab: (id) => set({ activeTabId: id }),
  updateTabContent: (id, content) => set((state) => ({
    tabs: state.tabs.map(t => t.id === id ? { ...t, content, isDirty: true } : t)
  })),

  saveCurrentTab: async () => {
    const activeId = get().activeTabId;
    if (activeId) {
      await get().saveTab(activeId);
    }
  },

  saveTab: async (id: string) => {
    const projId = get().projectId;
    const tab = get().tabs.find(t => t.id === id);
    if (!projId || !tab) return;
    try {
      await api.saveFile(projId, tab.id, tab.content);
      set((state) => ({
        tabs: state.tabs.map(t => t.id === id ? { ...t, isDirty: false } : t)
      }));
    } catch (err) {
      console.error(`Failed to save file ${id}:`, err);
      throw err;
    }
  },

  agentStatus: 'initializing',
  timeline: [],
  setAgentStatus: (status) => set({ agentStatus: status }),
  addTimelineEvent: (event) => set((state) => ({ timeline: [...state.timeline, event] })),
  updateTimelineEvent: (id, updates) => set((state) => ({
    timeline: state.timeline.map(e => e.id === id ? { ...e, ...updates } : e)
  }))
});

export const useIDEStore = create<IDEState>(storeCreator);
