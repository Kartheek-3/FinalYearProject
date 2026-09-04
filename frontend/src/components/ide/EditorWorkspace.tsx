import { useState } from 'react';
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
  ShieldAlert,
  Server,
  Clock,
  ArrowRight
} from 'lucide-react';
import clsx from 'clsx';
import Editor, { DiffEditor } from '@monaco-editor/react';

export default function EditorWorkspace() {
  const {
    tabs,
    activeTabId,
    setActiveTab,
    closeTab,
    updateTabContent,
    workspaceMode,
    diffState,
    setDiffState,
    traceabilityMap,
    projectAggregate,
  } = useIDEStore();

  const [previewRefreshKey, setPreviewRefreshKey] = useState(0);

  const activeTab = tabs.find((t: Tab) => t.id === activeTabId);
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

  // Resolve QA reports
  const qaReports = projectAggregate?.qa_reports || [];
  const qualityGates = projectAggregate?.quality_gates || [];

  return (
    <div className="flex flex-col h-full bg-background overflow-hidden select-none">
      {/* Workspace Tabs (when in EDITOR mode) */}
      {workspaceMode === 'editor' && (
        <div className="flex items-center bg-panel border-b border-border overflow-x-auto shrink-0 scrollbar-hide">
          {tabs.map((tab: Tab) => (
            <div
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={clsx(
                "flex items-center gap-2 px-3 py-2 border-r border-border text-xs min-w-[120px] max-w-[220px] cursor-pointer group transition-colors",
                activeTabId === tab.id
                  ? "bg-background text-primaryText border-t-2 border-t-accent font-medium"
                  : "bg-panel text-secondaryText hover:bg-secondary border-t-2 border-t-transparent"
              )}
            >
              <span className="truncate flex-1 font-mono">{tab.title}</span>
              {tab.isDirty && <div className="w-1.5 h-1.5 rounded-full bg-primaryText opacity-80" />}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  closeTab(tab.id);
                }}
                className={clsx(
                  "p-0.5 rounded-md hover:bg-border/50",
                  (!tab.isDirty && activeTabId !== tab.id) ? "opacity-0 group-hover:opacity-100" : ""
                )}
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
          {tabs.length === 0 && (
            <div className="px-3 py-2 text-xs text-secondaryText italic font-sans">
              No files open in editor
            </div>
          )}
        </div>
      )}

      {/* Traceability Banner (when in EDITOR mode and active file has traceability) */}
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

      {/* Workspace Body depending on WorkspaceMode */}
      <div className="flex-1 overflow-hidden relative">
        {/* 1. EDITOR MODE */}
        {workspaceMode === 'editor' && (
          <div className="h-full w-full">
            {activeTab ? (
              <Editor
                height="100%"
                language={activeTab.language}
                theme="vs-dark"
                value={activeTab.content}
                onChange={(val: string | undefined) => {
                  if (val !== undefined) updateTabContent(activeTab.id, val);
                }}
                options={{
                  minimap: { enabled: false },
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
                    Select a file in the Project Explorer or wait for the Coding Agent to generate application code.
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* 2. PREVIEW MODE */}
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
                  title="Application Preview"
                  className="w-full h-full border-0 bg-white"
                />
              ) : (
                <div className="flex items-center justify-center h-full text-secondaryText">
                  <div className="text-center p-8 max-w-md">
                    <Server className="w-12 h-12 text-secondaryText/50 mx-auto mb-3 animate-pulse" />
                    <h3 className="text-base font-medium text-primaryText mb-1">
                      Container Deployment in Progress
                    </h3>
                    <p className="text-xs text-secondaryText leading-relaxed">
                      Once the Delivery Agent creates the Dockerfile and starts the container, your live application will automatically be embedded here.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* 3. DIFF MODE */}
        {workspaceMode === 'diff' && (
          <div className="h-full w-full flex flex-col bg-background">
            <div className="h-10 border-b border-border bg-panel px-4 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2 text-xs">
                <GitCompare className="w-4 h-4 text-accent" />
                <span className="font-semibold text-primaryText">AGENT CODE DIFF</span>
                {diffState && (
                  <span className="text-secondaryText font-mono text-xs">
                    ({diffState.path})
                  </span>
                )}
              </div>
              {diffState && (
                <div className="flex items-center gap-3 text-xs">
                  <span className="text-secondaryText italic">
                    {diffState.reason || 'Code modified during rework'}
                  </span>
                  <button
                    onClick={() => setDiffState(null)}
                    className="p-1 rounded hover:bg-secondary text-secondaryText"
                    title="Close Diff"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>

            <div className="flex-1 overflow-hidden">
              {diffState ? (
                <DiffEditor
                  height="100%"
                  language={activeTab?.language || 'python'}
                  theme="vs-dark"
                  original={diffState.original}
                  modified={diffState.modified}
                  options={{
                    readOnly: true,
                    renderSideBySide: true,
                    minimap: { enabled: false },
                    fontSize: 13,
                    fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
                  }}
                />
              ) : (
                <div className="flex items-center justify-center h-full text-secondaryText">
                  <div className="text-center p-8">
                    <GitCompare className="w-10 h-10 mx-auto mb-3 opacity-40" />
                    <h3 className="text-sm font-medium text-primaryText">No Active Diff</h3>
                    <p className="mt-1 text-xs opacity-75">
                      When the Coding Agent reworks or updates existing files after QA reviews, diffs appear here automatically.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* 4. ARCHITECTURE MODE */}
        {workspaceMode === 'architecture' && (
          <div className="h-full w-full overflow-y-auto p-6 bg-background text-primaryText select-text">
            <div className="max-w-4xl mx-auto space-y-6">
              <div className="border-b border-border/80 pb-4">
                <h2 className="text-lg font-semibold flex items-center gap-2">
                  <Layers className="w-5 h-5 text-accent" />
                  <span>Autonomous Architecture Design</span>
                </h2>
                <p className="text-xs text-secondaryText mt-1">
                  Generated by Planning Agent from user requirements.
                </p>
              </div>

              {architecture ? (
                <div className="space-y-6">
                  {/* Style & Pattern */}
                  <div className="bg-panel border border-border rounded-lg p-4">
                    <div className="text-xs font-semibold text-secondaryText uppercase tracking-wider mb-2">
                      Architectural Style
                    </div>
                    <div className="text-sm font-mono text-accent bg-secondary/40 p-2.5 rounded border border-border/60">
                      {architecture.style || 'Modular Component Architecture'}
                    </div>
                  </div>

                  {/* Components */}
                  {architecture.components && architecture.components.length > 0 && (
                    <div className="bg-panel border border-border rounded-lg p-4">
                      <div className="text-xs font-semibold text-secondaryText uppercase tracking-wider mb-3">
                        Planned Components ({architecture.components.length})
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {architecture.components.map((comp: any, i: number) => (
                          <div key={i} className="p-3 bg-secondary/30 rounded border border-border/50 text-xs">
                            <div className="font-semibold text-primaryText mb-1 flex items-center gap-1.5">
                              <span className="w-2 h-2 rounded-full bg-accent" />
                              <span>{comp.name}</span>
                            </div>
                            <p className="text-secondaryText text-[11px] leading-relaxed mb-2">
                              {comp.description}
                            </p>
                            {comp.responsibilities && (
                              <div className="text-[10px] text-secondaryText/80 space-y-1 border-t border-border/40 pt-1.5">
                                {comp.responsibilities.map((r: string, idx: number) => (
                                  <div key={idx} className="flex items-center gap-1">
                                    <ArrowRight className="w-2.5 h-2.5 text-accent shrink-0" />
                                    <span className="truncate">{r}</span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Data Models */}
                  {architecture.data_models && architecture.data_models.length > 0 && (
                    <div className="bg-panel border border-border rounded-lg p-4">
                      <div className="text-xs font-semibold text-secondaryText uppercase tracking-wider mb-3">
                        Data Entities & Schema
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {architecture.data_models.map((model: any, idx: number) => (
                          <div key={idx} className="p-3 bg-secondary/30 rounded border border-border/50 text-xs font-mono">
                            <div className="font-bold text-accent mb-2">{model.name}</div>
                            {model.fields && (
                              <div className="space-y-1 text-[11px] text-secondaryText">
                                {Object.entries(model.fields).map(([k, v]: [string, any]) => (
                                  <div key={k} className="flex justify-between border-b border-border/30 pb-0.5">
                                    <span className="text-primaryText">{k}</span>
                                    <span className="text-secondaryText/70">{String(v)}</span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-8 text-center text-secondaryText">
                  <Layers className="w-8 h-8 mx-auto mb-2 opacity-40" />
                  <span>Architecture artifact has not been produced by Planning Agent yet.</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* 5. TESTS MODE */}
        {workspaceMode === 'tests' && (
          <div className="h-full w-full overflow-y-auto p-6 bg-background text-primaryText select-text">
            <div className="max-w-4xl mx-auto space-y-6">
              <div className="border-b border-border/80 pb-4 flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-success" />
                    <span>Automated QA & Test Execution</span>
                  </h2>
                  <p className="text-xs text-secondaryText mt-1">
                    Results from real QA Agent verification and automated testing suites.
                  </p>
                </div>
                <div className="flex items-center gap-3 text-xs">
                  <span className="px-2 py-1 rounded bg-success/20 text-success border border-success/30 font-medium">
                    {qualityGates.filter(g => g.status === 'passed').length} Passed
                  </span>
                  <span className="px-2 py-1 rounded bg-error/20 text-error border border-error/30 font-medium">
                    {qualityGates.filter(g => g.status === 'rework_required' || g.status === 'blocked').length} Failed
                  </span>
                </div>
              </div>

              {qaReports.length > 0 ? (
                <div className="space-y-4">
                  {qaReports.map((report: any, idx: number) => (
                    <div key={idx} className="bg-panel border border-border rounded-lg p-4 space-y-3">
                      <div className="flex items-center justify-between border-b border-border/60 pb-2">
                        <div className="flex items-center gap-2">
                          {report.verdict === 'pass' ? (
                            <CheckCircle2 className="w-4 h-4 text-success" />
                          ) : (
                            <XCircle className="w-4 h-4 text-error" />
                          )}
                          <span className="text-xs font-mono font-bold text-primaryText">
                            Task: {report.task_id}
                          </span>
                        </div>
                        <span className={clsx(
                          "px-2 py-0.5 rounded text-[11px] font-mono font-semibold uppercase",
                          report.verdict === 'pass' ? "bg-success/20 text-success" : "bg-error/20 text-error"
                        )}>
                          {report.verdict}
                        </span>
                      </div>

                      <div className="text-xs text-secondaryText leading-relaxed">
                        {report.summary}
                      </div>

                      {/* Passed Tests */}
                      {report.passed_tests && report.passed_tests.length > 0 && (
                        <div className="space-y-1">
                          <div className="text-[11px] font-semibold text-secondaryText uppercase tracking-wider">
                            Verified Tests ({report.passed_tests.length})
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-1.5">
                            {report.passed_tests.map((t: string, tidx: number) => (
                              <div key={tidx} className="flex items-center gap-1.5 text-xs text-success bg-success/5 p-1.5 rounded border border-success/10">
                                <CheckCircle2 className="w-3 h-3 shrink-0" />
                                <span className="font-mono text-[11px] truncate">{t}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Failed Tests */}
                      {report.failed_tests && report.failed_tests.length > 0 && (
                        <div className="space-y-1">
                          <div className="text-[11px] font-semibold text-error uppercase tracking-wider">
                            Failed Tests ({report.failed_tests.length})
                          </div>
                          <div className="grid grid-cols-1 gap-1.5">
                            {report.failed_tests.map((t: string, tidx: number) => (
                              <div key={tidx} className="flex items-center gap-1.5 text-xs text-error bg-error/5 p-1.5 rounded border border-error/10">
                                <XCircle className="w-3 h-3 shrink-0" />
                                <span className="font-mono text-[11px]">{t}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-8 text-center text-secondaryText">
                  <CheckCircle2 className="w-8 h-8 mx-auto mb-2 opacity-40" />
                  <span>No QA test reports recorded yet. Tests run automatically after Coding tasks.</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* 6. QA MODE (Findings & Remediation) */}
        {workspaceMode === 'qa' && (
          <div className="h-full w-full overflow-y-auto p-6 bg-background text-primaryText select-text">
            <div className="max-w-4xl mx-auto space-y-6">
              <div className="border-b border-border/80 pb-4">
                <h2 className="text-lg font-semibold flex items-center gap-2">
                  <ShieldAlert className="w-5 h-5 text-amber-400" />
                  <span>QA Findings & Security Review</span>
                </h2>
                <p className="text-xs text-secondaryText mt-1">
                  Code review issues, security findings, and remediation feedback sent to the Supervisor.
                </p>
              </div>

              {qaReports.some(r => r.issues && r.issues.length > 0) ? (
                <div className="space-y-4">
                  {qaReports.map((report: any, idx: number) => {
                    if (!report.issues || report.issues.length === 0) return null;
                    return (
                      <div key={idx} className="bg-panel border border-border rounded-lg p-4 space-y-3">
                        <div className="text-xs font-mono font-bold text-primaryText flex items-center gap-2">
                          <span className="text-accent">Task:</span> {report.task_id}
                        </div>
                        <div className="space-y-2">
                          {report.issues.map((issue: any, iidx: number) => (
                            <div key={iidx} className="p-3 bg-secondary/40 rounded border border-border/60 text-xs space-y-1">
                              <div className="flex items-center justify-between">
                                <span className="font-semibold text-primaryText">{issue.title || issue.description}</span>
                                <span className={clsx(
                                  "text-[10px] font-mono px-1.5 py-0.5 rounded uppercase font-semibold",
                                  issue.severity === 'critical' ? 'bg-error/30 text-error' :
                                  issue.severity === 'high' ? 'bg-orange-950/40 text-orange-400' :
                                  'bg-amber-950/40 text-amber-400'
                                )}>
                                  {issue.severity || 'issue'}
                                </span>
                              </div>
                              {issue.remediation && (
                                <div className="text-secondaryText text-[11px] pt-1">
                                  <span className="text-accent font-medium">Remediation:</span> {issue.remediation}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="p-8 text-center text-secondaryText">
                  <ShieldAlert className="w-8 h-8 mx-auto mb-2 opacity-40 text-success" />
                  <span className="text-sm font-medium text-primaryText block">No Blocking Issues Found</span>
                  <span className="text-xs opacity-75 mt-1 block">
                    All quality gate evaluations passed standards with zero critical security or code flaws.
                  </span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
