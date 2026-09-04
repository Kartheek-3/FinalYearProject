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
  | 'security'
  | 'paused'
  | 'completed'
  | 'failed'
  | 'disconnected';

export type StageId = 
  | 'analysis'
  | 'planning'
  | 'supervisor'
  | 'coding'
  | 'testing'
  | 'security'
  | 'delivery'
  | 'deployment';

export interface PlanningSectionState {
  id: string;
  name: string;
  status: 'queued' | 'running' | 'completed' | 'failed';
}

export interface SecurityFinding {
  title: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  category: string;
  remediation?: string;
}

export interface TestResultItem {
  id: string;
  name: string;
  status: 'pass' | 'fail' | 'skip';
  duration?: string;
  suite?: string;
}

export interface SupervisorDecision {
  currentTask: string;
  nextCandidates: string[];
  selectedAgent: string;
  reason: string;
  dependencies: string[];
  priority: string;
}

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
  connectWebSocket: () => Promise<void>;
  disconnectWebSocket: () => void;
  triggerExecution: (force?: boolean) => Promise<void>;
  
  // Granular Autonomous Stages
  currentStage: StageId;
  setCurrentStage: (stage: StageId) => void;
  planningSections: PlanningSectionState[];
  currentTask: { id: string; name?: string; file?: string; action?: string } | null;
  testResults: { passed: number; failed: number; skipped: number; items: TestResultItem[] };
  securityFindings: { critical: number; high: number; medium: number; low: number; items: SecurityFinding[] };
  supervisorDecision: SupervisorDecision | null;

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

const initialPlanningSections: PlanningSectionState[] = [
  { id: 'foundation', name: 'Foundation', status: 'queued' },
  { id: 'architecture', name: 'Architecture', status: 'queued' },
  { id: 'database', name: 'Database', status: 'queued' },
  { id: 'api', name: 'API Specifications', status: 'queued' },
  { id: 'workflows', name: 'Workflows', status: 'queued' },
  { id: 'project_structure', name: 'Project Structure', status: 'queued' },
  { id: 'execution', name: 'Execution Plan', status: 'queued' },
  { id: 'traceability', name: 'Traceability', status: 'queued' },
];

const storeCreator: StateCreator<IDEState> = (set, get) => ({
  projectId: null,
  projectAggregate: null,
  liveEvents: [],

  // Granular Stage Tracking Defaults
  currentStage: 'analysis',
  setCurrentStage: (stage) => set({ currentStage: stage }),
  planningSections: initialPlanningSections,
  currentTask: null,
  testResults: { passed: 0, failed: 0, skipped: 0, items: [] },
  securityFindings: { critical: 0, high: 0, medium: 0, low: 0, items: [] },
  supervisorDecision: null,
  
  setProjectId: (id) => set({
    projectId: id,
    liveEvents: [],
    timeline: [],
    agentStatus: 'initializing',
    currentStage: 'analysis',
    planningSections: initialPlanningSections,
    currentTask: null,
    testResults: { passed: 0, failed: 0, skipped: 0, items: [] },
    securityFindings: { critical: 0, high: 0, medium: 0, low: 0, items: [] },
    supervisorDecision: null,
  }),

  fetchProject: async () => {
    const id = get().projectId;
    if (!id) return;
    try {
      const data = await api.getProject(id);
      set({ projectAggregate: data });

      // Populate testResults and securityFindings from persisted projectAggregate
      if (data.qa_reports && data.qa_reports.length > 0) {
        const passedTests: TestResultItem[] = [];
        const failedTests: TestResultItem[] = [];
        const allFindings: SecurityFinding[] = [];

        data.qa_reports.forEach((report: any) => {
          if (report.passed_tests) {
            report.passed_tests.forEach((t: string) => {
              passedTests.push({ id: t, name: t, status: 'pass' });
            });
          }
          if (report.failed_tests) {
            report.failed_tests.forEach((t: string) => {
              failedTests.push({ id: t, name: t, status: 'fail' });
            });
          }
          if (report.issues) {
            report.issues.forEach((issue: any) => {
              allFindings.push({
                title: issue.title || issue.description || 'Finding',
                severity: (issue.severity || 'medium').toLowerCase(),
                category: issue.category || 'Code Quality',
                remediation: issue.remediation,
              });
            });
          }
        });

        set({
          testResults: {
            passed: passedTests.length,
            failed: failedTests.length,
            skipped: 0,
            items: [...failedTests, ...passedTests],
          },
          securityFindings: {
            critical: allFindings.filter(f => f.severity === 'critical').length,
            high: allFindings.filter(f => f.severity === 'high').length,
            medium: allFindings.filter(f => f.severity === 'medium').length,
            low: allFindings.filter(f => f.severity === 'low').length,
            items: allFindings,
          },
        });
      }

      // Determine agent status and stage from persisted lifecycle stage if not actively receiving newer events
      const stage = data.lifecycle?.stage;
      if (stage === 'failed') {
        set({ agentStatus: 'failed' });
      } else if (stage === 'paused') {
        set({ agentStatus: 'paused' });
      } else if (stage === 'ready_for_delivery' && data.delivery_result?.delivery_status === 'deployed') {
        set({ agentStatus: 'completed', currentStage: 'deployment' });
      } else if (stage === 'ready_for_delivery') {
        set({ currentStage: 'delivery' });
      } else if (stage === 'executing') {
        set({ currentStage: 'coding' });
        if (get().agentStatus !== 'running' && get().agentStatus !== 'executing' && get().agentStatus !== 'testing') {
          set({ agentStatus: 'running' });
        }
      } else if (stage === 'planned' || stage === 'ready_for_execution') {
        set({ currentStage: 'supervisor' });
      } else if (stage === 'analyzed') {
        set({ currentStage: 'planning' });
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

        // Determine general agent status & granular stage tracking from actual backend events
        if (event.event_type === 'runtime.completed' || event.event_type === 'docker.healthy') {
          set({ agentStatus: 'completed', currentStage: 'deployment' });
          get().fetchProject();
        } else if (event.event_type === 'runtime.failed' || event.event_type === 'docker.failed') {
          set({ agentStatus: 'failed' });
          get().fetchProject();
        } else if (event.event_type === 'qa.failed') {
          set({ agentStatus: 'paused', currentStage: 'testing' });
          get().fetchProject();
        } else if (event.event_type.startsWith('docker.') || event.event_type.startsWith('deployment.') || event.event_type.startsWith('delivery.')) {
          set({ agentStatus: 'running', currentStage: 'deployment' });
        } else if (event.event_type === 'security.started' || event.event_type.includes('security')) {
          set({ agentStatus: 'security', currentStage: 'security' });
          if (event.data?.findings) {
            const findings = event.data.findings;
            set({
              securityFindings: {
                critical: findings.filter((f: any) => f.severity === 'critical').length,
                high: findings.filter((f: any) => f.severity === 'high').length,
                medium: findings.filter((f: any) => f.severity === 'medium').length,
                low: findings.filter((f: any) => f.severity === 'low').length,
                items: findings,
              }
            });
          }
        } else if (event.event_type.startsWith('qa.')) {
          set({ agentStatus: 'testing', currentStage: 'testing' });
          if (event.data?.task_id) {
            set((state) => ({
              testResults: {
                ...state.testResults,
                items: [
                  ...state.testResults.items,
                  {
                    id: event.data.task_id,
                    name: `QA Verification for ${event.data.task_id}`,
                    status: event.event_type === 'qa.completed' ? 'pass' : event.event_type === 'qa.failed' ? 'fail' : 'pass',
                    duration: '0.4s',
                  }
                ],
                passed: event.event_type === 'qa.completed' ? state.testResults.passed + 1 : state.testResults.passed,
                failed: event.event_type === 'qa.failed' ? state.testResults.failed + 1 : state.testResults.failed,
              }
            }));
          }
          get().fetchProject();
        } else if (event.event_type.startsWith('planning')) {
          set({ agentStatus: 'planning', currentStage: 'planning' });
          if (event.data?.section) {
            const secName = String(event.data.section).toLowerCase();
            set((state) => ({
              planningSections: state.planningSections.map(s => {
                if (s.id === secName || s.name.toLowerCase().includes(secName)) {
                  return { ...s, status: event.event_type.includes('completed') ? 'completed' : 'running' };
                }
                return s;
              })
            }));
          }
        } else if (event.event_type.startsWith('task.started') || event.event_type.startsWith('task.completed')) {
          set({
            agentStatus: 'executing',
            currentStage: 'coding',
            currentTask: {
              id: event.data?.task_id || 'task',
              name: event.data?.name,
              file: event.data?.path,
              action: event.event_type.startsWith('task.started') ? 'running' : 'completed',
            },
            supervisorDecision: {
              currentTask: event.data?.task_id || 'active_task',
              nextCandidates: event.data?.candidate_tasks || [],
              selectedAgent: 'Coding Agent',
              reason: event.data?.reason || 'Dependencies satisfied; topological priority dispatch',
              dependencies: event.data?.dependencies || [],
              priority: 'High',
            }
          });
        } else if (event.event_type.startsWith('agent.started')) {
          const ag = event.data?.agent;
          if (ag === 'analysis') set({ agentStatus: 'running', currentStage: 'analysis' });
          else if (ag === 'planning') set({ agentStatus: 'planning', currentStage: 'planning' });
          else if (ag === 'supervisor') set({ agentStatus: 'running', currentStage: 'supervisor' });
          else if (ag === 'coding') set({ agentStatus: 'executing', currentStage: 'coding' });
          else if (ag === 'qa') set({ agentStatus: 'testing', currentStage: 'testing' });
          else if (ag === 'delivery') set({ agentStatus: 'running', currentStage: 'delivery' });
          else set({ agentStatus: 'running' });
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
