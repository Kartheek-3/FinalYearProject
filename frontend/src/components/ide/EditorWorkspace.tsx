import { useState, useEffect } from 'react';
import { useIDEStore, Tab } from '../../store/useIDEStore';
import {
  X,
  Sparkles,
  ExternalLink,
  RefreshCw,
  GitCompare,
  Layers,
  CheckCircle2,
  XCircle,
  Server,
  Clock,
  Pin,
  Columns,
  Rows,
  ChevronRight,
  ShieldCheck,
  Copy,
} from 'lucide-react';
import clsx from 'clsx';
import Editor, { DiffEditor } from '@monaco-editor/react';

interface TabContextMenuState {
  x: number;
  y: number;
  tabId: string;
}

export default function EditorWorkspace() {
  const {
    tabs,
    activeTabId,
    setActiveTab,
    closeTab,
    closeOthers,
    closeToRight,
    closeAll,
    togglePinTab,
    reorderTabs,
    updateTabContent,
    workspaceMode,
    diffState,
    traceabilityMap,
    projectAggregate,
    splitEditor,
    splitOrientation,
    secondaryTabId,
    setSplitEditor,
    testResults,
    securityFindings,
  } = useIDEStore();

  const [previewRefreshKey, setPreviewRefreshKey] = useState(0);
  const [tabContextMenu, setTabContextMenu] = useState<TabContextMenuState | null>(null);
  const [draggedTabIndex, setDraggedTabIndex] = useState<number | null>(null);

  // Close tab context menu on window click
  useEffect(() => {
    const handleClick = () => setTabContextMenu(null);
    window.addEventListener('click', handleClick);
    return () => window.removeEventListener('click', handleClick);
  }, []);

  const activeTab = tabs.find((t: Tab) => t.id === activeTabId);
  const secondaryTab = tabs.find((t: Tab) => t.id === secondaryTabId) || (tabs.length > 1 ? tabs.find(t => t.id !== activeTabId) : null);
  const activeTraceability = activeTabId ? traceabilityMap[activeTabId] : null;

  // Resolve deployment URL from delivery_result
  const deliveryResult = projectAggregate?.delivery_result;
  const deploymentUrl = deliveryResult?.project_url
    ? String(deliveryResult.project_url)
    : deliveryResult?.metadata?.host_port
    ? `http://localhost:${deliveryResult.metadata.host_port}/`
    : null;

  // Resolve architecture from planning artifact
  const architecture = (projectAggregate?.planning_artifact?.result as any)?.architecture;
  const tasks = projectAggregate?.execution_state?.tasks ? Object.values(projectAggregate.execution_state.tasks) : [];

  // Breadcrumbs computation
  const breadcrumbParts = activeTab ? activeTab.id.split('/') : [];

  const handleTabContextMenu = (e: React.MouseEvent, tabId: string) => {
    e.preventDefault();
    e.stopPropagation();
    setTabContextMenu({ x: e.clientX, y: e.clientY, tabId });
  };

  const renderTabsBar = () => (
    <div className="flex items-center bg-panel border-b border-border overflow-x-auto shrink-0 scrollbar-hide select-none">
      {tabs.map((tab: Tab, idx: number) => {
        const isSelected = activeTabId === tab.id;
        return (
          <div
            key={tab.id}
            draggable
            onDragStart={() => setDraggedTabIndex(idx)}
            onDragOver={(e) => e.preventDefault()}
            onDrop={() => {
              if (draggedTabIndex !== null && draggedTabIndex !== idx) {
                reorderTabs(draggedTabIndex, idx);
                setDraggedTabIndex(null);
              }
            }}
            onClick={() => setActiveTab(tab.id)}
            onContextMenu={(e) => handleTabContextMenu(e, tab.id)}
            className={clsx(
              "flex items-center gap-2 px-3 py-2 border-r border-border text-xs min-w-[120px] max-w-[220px] cursor-pointer group transition-colors relative",
              isSelected
                ? "bg-background text-primaryText border-t-2 border-t-accent font-medium"
                : "bg-panel text-secondaryText hover:bg-secondary border-t-2 border-t-transparent"
            )}
          >
            {tab.isPinned && <Pin className="w-3 h-3 text-accent shrink-0 -rotate-45" />}
            <span className="truncate flex-1 font-mono">{tab.title}</span>
            {tab.isDirty && <div className="w-1.5 h-1.5 rounded-full bg-primaryText opacity-80" />}
            <button
              onClick={(e) => {
                e.stopPropagation();
                closeTab(tab.id);
              }}
              className={clsx(
                "p-0.5 rounded-md hover:bg-border/50",
                (!tab.isDirty && !isSelected) ? "opacity-0 group-hover:opacity-100" : ""
              )}
              title="Close (Ctrl+W)"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        );
      })}

      {tabs.length === 0 && (
        <div className="px-3 py-2 text-xs text-secondaryText italic font-sans">
          No files open in editor
        </div>
      )}

      <div className="flex-1" />

      {/* Split Editor Toggle Action */}
      {tabs.length > 0 && (
        <div className="flex items-center px-2 gap-1 border-l border-border/60">
          <button
            onClick={() => setSplitEditor(!splitEditor, 'horizontal')}
            className={clsx(
              "p-1 rounded text-secondaryText hover:text-primaryText transition-colors",
              splitEditor && splitOrientation === 'horizontal' ? "bg-secondary text-primaryText" : ""
            )}
            title={splitEditor ? "Close Split Group" : "Split Editor Right"}
          >
            <Columns className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setSplitEditor(!splitEditor, 'vertical')}
            className={clsx(
              "p-1 rounded text-secondaryText hover:text-primaryText transition-colors",
              splitEditor && splitOrientation === 'vertical' ? "bg-secondary text-primaryText" : ""
            )}
            title="Split Editor Down"
          >
            <Rows className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );

  const renderBreadcrumbs = () => {
    if (!activeTab || breadcrumbParts.length === 0) return null;
    return (
      <div className="h-6 bg-background border-b border-border/60 px-4 flex items-center text-[11px] text-secondaryText font-mono shrink-0 select-none overflow-x-auto">
        <span className="text-slate-400 font-semibold">{projectAggregate?.project_id ? `seam://${projectAggregate.project_id.substring(0, 10)}` : 'workspace'}</span>
        {breadcrumbParts.map((part, index) => (
          <div key={index} className="flex items-center">
            <ChevronRight className="w-3 h-3 mx-1 opacity-40 shrink-0" />
            <span className={clsx(
              "truncate hover:text-primaryText cursor-pointer transition-colors",
              index === breadcrumbParts.length - 1 ? "text-primaryText font-medium" : ""
            )}>
              {part}
            </span>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full bg-background overflow-hidden select-none relative">
      {/* 1. Tabs Bar when in editor mode */}
      {workspaceMode === 'editor' && renderTabsBar()}

      {/* 2. Breadcrumbs Bar */}
      {workspaceMode === 'editor' && renderBreadcrumbs()}

      {/* 3. Traceability Banner (when Coding Agent modified file) */}
      {workspaceMode === 'editor' && activeTraceability && (
        <div className="bg-secondary/40 border-b border-border/60 px-4 py-1.5 flex items-center justify-between text-xs text-secondaryText shrink-0">
          <div className="flex items-center gap-2">
            <Sparkles className="w-3.5 h-3.5 text-accent" />
            <span className="font-semibold text-primaryText">{activeTraceability.agent}</span>
            <span>•</span>
            <span>Task: <code className="text-primaryText font-mono">{activeTraceability.taskId || 'initial generation'}</code></span>
            <span>•</span>
            <span className="capitalize">{activeTraceability.action}</span>
          </div>
          <div className="flex items-center gap-1.5 text-[11px] opacity-75">
            <Clock className="w-3 h-3" />
            <span>{activeTraceability.timestamp}</span>
          </div>
        </div>
      )}

      {/* 4. Workspace View Body */}
      <div className="flex-1 overflow-hidden relative">
        {/* MODE: EDITOR (with optional Split Editor) */}
        {workspaceMode === 'editor' && (
          <div className={clsx(
            "h-full w-full",
            splitEditor ? (splitOrientation === 'horizontal' ? "flex flex-row" : "flex flex-col") : ""
          )}>
            {/* Primary Group */}
            <div className={clsx("h-full min-w-0 min-h-0", splitEditor ? "flex-1 border-r border-border" : "w-full")}>
              {activeTab ? (
                <Editor
                  height="100%"
                  language={activeTab.language}
                  theme="vs-dark"
                  value={activeTab.content}
                  onChange={(val) => {
                    if (val !== undefined) updateTabContent(activeTab.id, val);
                  }}
                  options={{
                    minimap: { enabled: true },
                    fontSize: 13,
                    fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
                    lineHeight: 22,
                    padding: { top: 16 },
                    scrollBeyondLastLine: false,
                    smoothScrolling: true,
                    cursorBlinking: "smooth",
                    cursorSmoothCaretAnimation: "on",
                    formatOnPaste: true,
                  }}
                />
              ) : (
                <div className="flex items-center justify-center h-full text-secondaryText">
                  <div className="text-center p-8">
                    <div className="text-4xl mb-4 text-accent">✦</div>
                    <h2 className="text-lg font-medium text-primaryText">AI Autonomous Workspace</h2>
                    <p className="mt-2 text-sm opacity-80 max-w-sm">
                      Select a file in the Project Explorer or press <span className="text-accent font-mono">Ctrl+P</span> to quick open files.
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Secondary Split Group */}
            {splitEditor && (
              <div className="h-full min-w-0 min-h-0 flex-1 flex flex-col bg-background">
                <div className="h-8 border-b border-border bg-panel px-3 flex items-center justify-between text-xs shrink-0 font-mono text-secondaryText">
                  <span>{secondaryTab?.title || 'Split Group'}</span>
                  <button
                    onClick={() => setSplitEditor(false)}
                    className="p-1 rounded hover:bg-secondary text-secondaryText hover:text-primaryText"
                    title="Close Split Editor"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
                <div className="flex-1 overflow-hidden">
                  {secondaryTab ? (
                    <Editor
                      height="100%"
                      language={secondaryTab.language}
                      theme="vs-dark"
                      value={secondaryTab.content}
                      onChange={(val) => {
                        if (val !== undefined) updateTabContent(secondaryTab.id, val);
                      }}
                      options={{
                        minimap: { enabled: false },
                        fontSize: 13,
                        fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
                        lineHeight: 22,
                        padding: { top: 16 },
                        scrollBeyondLastLine: false,
                      }}
                    />
                  ) : (
                    <div className="flex items-center justify-center h-full text-secondaryText text-xs italic">
                      Select another tab to view side-by-side
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* MODE: PREVIEW */}
        {workspaceMode === 'preview' && (
          <div className="h-full w-full flex flex-col bg-background select-text">
            <div className="h-10 border-b border-border bg-panel px-4 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2 text-xs">
                <span className="font-semibold text-primaryText">APPLICATION PREVIEW</span>
                {deploymentUrl && (
                  <span className="px-2 py-0.5 rounded bg-success/20 text-success border border-success/30 font-mono text-[11px]">
                    LIVE
                  </span>
                )}
              </div>
              <div className="flex items-center gap-3">
                {deploymentUrl ? (
                  <>
                    <span className="text-xs font-mono text-secondaryText select-all bg-secondary/50 px-2 py-1 rounded border border-border">
                      {deploymentUrl}
                    </span>
                    <button
                      onClick={() => setPreviewRefreshKey(k => k + 1)}
                      className="p-1 rounded hover:bg-secondary text-secondaryText hover:text-primaryText"
                      title="Reload Preview"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                    </button>
                    <a
                      href={deploymentUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 px-2.5 py-1 text-xs bg-accent text-white rounded hover:bg-accent/90 transition-colors"
                    >
                      <span>Open External</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </>
                ) : (
                  <span className="text-xs text-secondaryText italic">
                    Waiting for Docker container deployment...
                  </span>
                )}
              </div>
            </div>

            <div className="flex-1 overflow-hidden relative">
              {deploymentUrl ? (
                <iframe
                  key={previewRefreshKey}
                  src={deploymentUrl}
                  className="w-full h-full border-0 bg-white"
                  title="App Live Preview"
                  sandbox="allow-scripts allow-same-origin allow-forms"
                />
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-secondaryText p-8">
                  <Server className="w-12 h-12 text-border mb-4 animate-pulse" />
                  <div className="text-sm font-medium text-primaryText">No Active Deployment</div>
                  <p className="text-xs max-w-sm text-center mt-2 opacity-80">
                    The Delivery Agent will compile the Dockerfile, build the image, and start the container on an allocated port.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* MODE: DIFF */}
        {workspaceMode === 'diff' && (
          <div className="h-full w-full flex flex-col bg-background">
            <div className="h-10 border-b border-border bg-panel px-4 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2 text-xs">
                <GitCompare className="w-4 h-4 text-accent" />
                <span className="font-semibold text-primaryText">AUTONOMOUS REWORK DIFF INSPECTOR</span>
                {diffState?.path && (
                  <span className="font-mono text-secondaryText">({diffState.path})</span>
                )}
              </div>
              {diffState?.reason && (
                <span className="text-xs text-warning/90 font-mono">
                  Remediation: {diffState.reason}
                </span>
              )}
            </div>
            <div className="flex-1 overflow-hidden">
              <DiffEditor
                height="100%"
                language="python"
                theme="vs-dark"
                original={diffState?.original || '# Original file version before autonomous QA rework'}
                modified={diffState?.modified || '# Remediated file version generated by Coding Agent'}
                options={{
                  fontSize: 13,
                  fontFamily: "'JetBrains Mono', monospace",
                  lineHeight: 22,
                  readOnly: true,
                }}
              />
            </div>
          </div>
        )}

        {/* MODE: ARCHITECTURE */}
        {workspaceMode === 'architecture' && (
          <div className="h-full w-full p-6 overflow-y-auto font-sans text-xs space-y-6 select-text">
            <div className="border-b border-border/80 pb-4">
              <h2 className="text-base font-semibold text-primaryText flex items-center gap-2">
                <Layers className="w-5 h-5 text-accent" />
                <span>Autonomous Task Graph & Architectural Blueprint</span>
              </h2>
              <p className="text-secondaryText text-xs mt-1">
                Decomposed by Planning & Design Agent; orchestrated dynamically by Supervisor.
              </p>
            </div>

            {/* Visual Task Graph */}
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-secondaryText mb-3">
                Supervisor Work Graph
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {tasks.length > 0 ? (
                  tasks.map((task: any) => (
                    <div
                      key={task.task_id}
                      className={clsx(
                        "p-3 rounded-lg border flex flex-col justify-between transition-all",
                        task.status === 'completed' ? "bg-emerald-950/20 border-emerald-800/40" :
                        task.status === 'in_progress' ? "bg-indigo-950/30 border-indigo-700/60 shadow-md" :
                        task.status === 'rework_required' ? "bg-amber-950/20 border-amber-800/40" :
                        "bg-panel border-border"
                      )}
                    >
                      <div>
                        <div className="flex items-center justify-between text-[11px] mb-1">
                          <span className="font-mono text-secondaryText">{task.task_id}</span>
                          <span className={clsx(
                            "px-1.5 py-0.5 rounded text-[10px] font-mono uppercase font-semibold",
                            task.status === 'completed' ? "bg-emerald-900/60 text-emerald-300" :
                            task.status === 'in_progress' ? "bg-indigo-900/60 text-indigo-300 animate-pulse" :
                            task.status === 'rework_required' ? "bg-amber-900/60 text-amber-300" :
                            "bg-secondary text-secondaryText"
                          )}>
                            {task.status}
                          </span>
                        </div>
                        <div className="font-medium text-primaryText mt-1">{task.title || task.name || task.task_id}</div>
                        {task.description && (
                          <div className="text-secondaryText text-[11px] mt-1 line-clamp-2">{task.description}</div>
                        )}
                      </div>
                      <div className="mt-3 pt-2 border-t border-border/50 text-[10px] text-secondaryText/80 flex items-center justify-between font-mono">
                        <span>Attempts: {task.attempt_count || 1}</span>
                        <span>Rework: {task.rework_count || 0}</span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="col-span-3 text-secondaryText italic p-4 bg-panel rounded border border-border">
                    Autonomous planning state will populate once requirements analysis finishes.
                  </div>
                )}
              </div>
            </div>

            {/* Architecture Details */}
            {architecture && (
              <div className="bg-panel border border-border rounded-lg p-4 space-y-3">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-secondaryText">
                  System Architecture Patterns
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-secondaryText text-[11px]">Primary Pattern:</span>
                    <div className="text-primaryText font-medium mt-0.5">{architecture.pattern || 'Modular Microservice'}</div>
                  </div>
                  <div>
                    <span className="text-secondaryText text-[11px]">Data Storage:</span>
                    <div className="text-primaryText font-medium mt-0.5">{architecture.database || 'SQLite / Relational'}</div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* MODE: TESTS */}
        {workspaceMode === 'tests' && (
          <div className="h-full w-full p-6 overflow-y-auto font-sans text-xs space-y-4 select-text">
            <div className="border-b border-border/80 pb-4 flex items-center justify-between">
              <div>
                <h2 className="text-base font-semibold text-primaryText flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                  <span>Automated QA & Test Suite Verification</span>
                </h2>
                <p className="text-secondaryText text-xs mt-1">
                  Executes unit, functional, integration, and regression tests autonomously.
                </p>
              </div>
              <div className="flex items-center gap-3 text-xs font-mono">
                <span className="px-2.5 py-1 rounded bg-emerald-950/60 text-emerald-300 border border-emerald-800/40">
                  Passed: {testResults.passed}
                </span>
                <span className="px-2.5 py-1 rounded bg-red-950/60 text-red-300 border border-red-800/40">
                  Failed: {testResults.failed}
                </span>
                <span className="px-2.5 py-1 rounded bg-secondary text-secondaryText border border-border">
                  Skipped: {testResults.skipped}
                </span>
              </div>
            </div>

            <div className="space-y-2">
              {testResults.items.length === 0 ? (
                <div className="p-8 text-center text-secondaryText italic bg-panel rounded border border-border">
                  No tests executed yet. Test cases will run during the autonomous QA stage.
                </div>
              ) : (
                testResults.items.map(t => (
                  <div key={t.id} className="flex items-center justify-between p-3 rounded bg-panel border border-border">
                    <div className="flex items-center gap-2.5">
                      {t.status === 'pass' ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      ) : (
                        <XCircle className="w-4 h-4 text-red-400" />
                      )}
                      <div>
                        <div className="font-mono text-primaryText font-medium">{t.name}</div>
                        <div className="text-[11px] text-secondaryText">{t.suite || 'Backend Automated Suite'}</div>
                      </div>
                    </div>
                    <div className="font-mono text-[11px] text-secondaryText">
                      {t.duration || '12ms'}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* MODE: QA / SECURITY */}
        {workspaceMode === 'qa' && (
          <div className="h-full w-full p-6 overflow-y-auto font-sans text-xs space-y-4 select-text">
            <div className="border-b border-border/80 pb-4 flex items-center justify-between">
              <div>
                <h2 className="text-base font-semibold text-primaryText flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-amber-400" />
                  <span>Cyber Security & Code Quality Gate</span>
                </h2>
                <p className="text-secondaryText text-xs mt-1">
                  Dependency safety, secret leakage, OWASP standards, and requirement adherence.
                </p>
              </div>
              <div className="flex items-center gap-2 text-xs font-mono">
                <span className="px-2 py-0.5 rounded bg-red-950/60 text-red-300 border border-red-800/40">
                  Critical: {securityFindings.critical}
                </span>
                <span className="px-2 py-0.5 rounded bg-orange-950/60 text-orange-300 border border-orange-800/40">
                  High: {securityFindings.high}
                </span>
                <span className="px-2 py-0.5 rounded bg-amber-950/60 text-amber-300 border border-amber-800/40">
                  Medium: {securityFindings.medium}
                </span>
              </div>
            </div>

            <div className="space-y-2">
              {securityFindings.items.length === 0 ? (
                <div className="p-8 text-center text-secondaryText italic bg-panel rounded border border-border">
                  No security vulnerabilities detected. Code passed automated static analysis and dependency check.
                </div>
              ) : (
                securityFindings.items.map((sec, idx) => (
                  <div key={idx} className="p-3 rounded bg-panel border border-border space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-primaryText">{sec.title}</span>
                      <span className={clsx(
                        "px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase",
                        sec.severity === 'critical' ? "bg-red-900/60 text-red-200" :
                        sec.severity === 'high' ? "bg-orange-900/60 text-orange-200" :
                        "bg-amber-900/60 text-amber-200"
                      )}>
                        {sec.severity}
                      </span>
                    </div>
                    <div className="text-secondaryText text-[11px]">
                      Category: {sec.category}
                    </div>
                    {sec.remediation && (
                      <div className="text-emerald-400 text-[11px] font-mono bg-emerald-950/20 p-2 rounded border border-emerald-900/30">
                        Remediation: {sec.remediation}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>

      {/* Tab Context Menu */}
      {tabContextMenu && (
        <div
          onClick={(e) => e.stopPropagation()}
          style={{ top: tabContextMenu.y, left: tabContextMenu.x }}
          className="fixed z-50 w-48 bg-panel border border-border rounded-md shadow-2xl py-1 text-xs select-none"
        >
          <button
            onClick={() => {
              closeTab(tabContextMenu.tabId);
              setTabContextMenu(null);
            }}
            className="w-full text-left px-3 py-1.5 hover:bg-secondary flex items-center justify-between text-secondaryText hover:text-primaryText"
          >
            <span>Close</span>
            <span className="font-mono text-[10px] text-secondaryText/60">Ctrl+W</span>
          </button>
          <button
            onClick={() => {
              closeOthers(tabContextMenu.tabId);
              setTabContextMenu(null);
            }}
            className="w-full text-left px-3 py-1.5 hover:bg-secondary text-secondaryText hover:text-primaryText"
          >
            Close Others
          </button>
          <button
            onClick={() => {
              closeToRight(tabContextMenu.tabId);
              setTabContextMenu(null);
            }}
            className="w-full text-left px-3 py-1.5 hover:bg-secondary text-secondaryText hover:text-primaryText"
          >
            Close to the Right
          </button>
          <button
            onClick={() => {
              closeAll();
              setTabContextMenu(null);
            }}
            className="w-full text-left px-3 py-1.5 hover:bg-secondary text-secondaryText hover:text-primaryText"
          >
            Close All
          </button>
          <div className="border-t border-border my-1" />
          <button
            onClick={() => {
              togglePinTab(tabContextMenu.tabId);
              setTabContextMenu(null);
            }}
            className="w-full text-left px-3 py-1.5 hover:bg-secondary flex items-center gap-2 text-secondaryText hover:text-primaryText"
          >
            <Pin className="w-3.5 h-3.5" />
            <span>Pin / Unpin Tab</span>
          </button>
          <button
            onClick={() => {
              navigator.clipboard?.writeText(tabContextMenu.tabId);
              setTabContextMenu(null);
            }}
            className="w-full text-left px-3 py-1.5 hover:bg-secondary flex items-center gap-2 text-secondaryText hover:text-primaryText"
          >
            <Copy className="w-3.5 h-3.5" />
            <span>Copy Relative Path</span>
          </button>
        </div>
      )}
    </div>
  );
}
