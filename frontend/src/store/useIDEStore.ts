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

export type AgentStatus = 'idle' | 'thinking' | 'planning' | 'executing' | 'waiting' | 'testing' | 'verifying' | 'completed' | 'failed' | 'disconnected';

export interface TimelineEvent {
  id: string;
  type: string;
  status: 'pending' | 'active' | 'completed' | 'failed';
  message: string;
  timestamp: string;
  rawEvent?: RuntimeEvent;
}

interface IDEState {
  // Global Project State
  projectId: string | null;
  projectAggregate: ProjectAggregate | null;
  setProjectId: (id: string | null) => void;
  fetchProject: () => Promise<void>;
  
  // Realtime Events
  liveEvents: RuntimeEvent[];
  connectWebSocket: () => void;
  disconnectWebSocket: () => void;
  
  // Layout
  activeActivity: ActivityBarItem;
  sidebarOpen: boolean;
  bottomPanelOpen: boolean;
  activeBottomTab: 'terminal' | 'problems' | 'output' | 'mcp' | 'agents' | 'ports';
  
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

  // Agent State
  agentStatus: AgentStatus;
  timeline: TimelineEvent[];
  setAgentStatus: (status: AgentStatus) => void;
  addTimelineEvent: (event: TimelineEvent) => void;
  updateTimelineEvent: (id: string, updates: Partial<TimelineEvent>) => void;
}

let wsConnection: WebSocket | null = null;

const storeCreator: StateCreator<IDEState> = (set, get) => ({
  projectId: null,
  projectAggregate: null,
  liveEvents: [],
  
  setProjectId: (id) => set({ projectId: id, liveEvents: [], timeline: [] }),

  
  fetchProject: async () => {
    const id = get().projectId;
    if (!id) return;
    try {
      const data = await api.getProject(id);
      set({ projectAggregate: data });
    } catch (err) {
      console.error('Failed to fetch project:', err);
    }
  },

  connectWebSocket: () => {
    const id = get().projectId;
    if (!id) return;
    if (wsConnection) {
      wsConnection.close();
    }
    
    wsConnection = new WebSocket(api.getWebSocketUrl(id));
    
    wsConnection.onopen = () => {
      set({ agentStatus: 'idle' });
    };

    wsConnection.onmessage = (e) => {
      try {
        const event: RuntimeEvent = JSON.parse(e.data);
        set((state) => ({ liveEvents: [...state.liveEvents, event] }));
        
        // Map raw event to timeline
        const timelineId = event.event_id || Math.random().toString(36).substring(7);
        const newTimelineEvent: TimelineEvent = {
          id: timelineId,
          type: event.event_type,
          status: event.event_type.includes('failed') ? 'failed' : 
                  event.event_type.includes('completed') || event.event_type.includes('healthy') ? 'completed' : 'active',
          message: event.message || `Event: ${event.event_type}`,
          timestamp: new Date().toISOString(),
          rawEvent: event
        };
        
        set((state) => {
          // simple deduping based on event_type + timestamp could go here
          return { timeline: [...state.timeline, newTimelineEvent] };
        });

        // Determine general agent status
        if (event.event_type.startsWith('agent.started') || event.event_type.startsWith('task.started')) {
          set({ agentStatus: 'executing' });
        } else if (event.event_type.startsWith('planning')) {
          set({ agentStatus: 'planning' });
        } else if (event.event_type.startsWith('qa.')) {
          set({ agentStatus: 'testing' });
        } else if (event.event_type === 'runtime.completed' || event.event_type === 'deployment.completed') {
          set({ agentStatus: 'completed' });
          get().fetchProject(); // Refresh full state
        }
        
      } catch (err) {
        console.error('WS Parse error', err);
      }
    };

    wsConnection.onclose = () => {
      set({ agentStatus: 'disconnected' });
    };
  },
  
  disconnectWebSocket: () => {
    if (wsConnection) {
      wsConnection.close();
      wsConnection = null;
    }
  },

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

  agentStatus: 'idle',
  timeline: [],
  setAgentStatus: (status) => set({ agentStatus: status }),
  addTimelineEvent: (event) => set((state) => ({ timeline: [...state.timeline, event] })),
  updateTimelineEvent: (id, updates) => set((state) => ({
    timeline: state.timeline.map(e => e.id === id ? { ...e, ...updates } : e)
  }))
});

export const useIDEStore = create<IDEState>(storeCreator);
