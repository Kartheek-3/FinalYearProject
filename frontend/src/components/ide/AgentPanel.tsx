import { useState } from 'react';
import {
  Bot,
  Check,
  Circle,
  Loader2,
  Play,
  Square,
  Sparkles,
  Layers,
  Code2,
  CheckCircle2,
  ShieldCheck,
  Package,
  Server,
} from 'lucide-react';
import { useIDEStore, TimelineEvent, StageId } from '../../store/useIDEStore';
import clsx from 'clsx';
import { motion, AnimatePresence } from 'framer-motion';

export default function AgentPanel() {
  const {
    agentStatus,
    timeline,
    projectAggregate,
    triggerExecution,
    currentStage,
    planningSections,
    currentTask,
    testResults,
    securityFindings,
    supervisorDecision,
    setWorkspaceMode
  } = useIDEStore();

  const [activeTab, setActiveTab] = useState<'stage' | 'timeline' | 'supervisor'>('stage');
  const [actionLoading, setActionLoading] = useState(false);

  const handleStartTask = async () => {
    setActionLoading(true);
    try {
      await triggerExecution(true);
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoading(false);
    }
  };

  const stages: { id: StageId; name: string; icon: React.ReactNode; desc: string }[] = [
    { id: 'analysis', name: 'ANALYSIS', icon: <Sparkles className="w-3.5 h-3.5" />, desc: 'Deconstruct requirements & tech constraints' },
    { id: 'planning', name: 'PLANNING', icon: <Layers className="w-3.5 h-3.5" />, desc: 'Generate architecture & task graph' },
    { id: 'supervisor', name: 'SUPERVISOR', icon: <Bot className="w-3.5 h-3.5" />, desc: 'Select candidate task & dispatch agent' },
    { id: 'coding', name: 'CODING', icon: <Code2 className="w-3.5 h-3.5" />, desc: 'Generate code & atomic file operations' },
    { id: 'testing', name: 'TESTING', icon: <CheckCircle2 className="w-3.5 h-3.5" />, desc: 'Automated test suite verification' },
    { id: 'security', name: 'SECURITY', icon: <ShieldCheck className="w-3.5 h-3.5" />, desc: 'Cyber analysis & secret vulnerability check' },
    { id: 'delivery', name: 'DELIVERY', icon: <Package className="w-3.5 h-3.5" />, desc: 'Package container & Dockerfile' },
    { id: 'deployment', name: 'DEPLOYMENT', icon: <Server className="w-3.5 h-3.5" />, desc: 'Container launch & health check' },
  ];

  const getStageStatus = (stageId: StageId) => {
    const stageOrder: StageId[] = ['analysis', 'planning', 'supervisor', 'coding', 'testing', 'security', 'delivery', 'deployment'];
    const currentIdx = stageOrder.indexOf(currentStage);
    const targetIdx = stageOrder.indexOf(stageId);

    if (agentStatus === 'completed') return 'completed';
    if (agentStatus === 'failed' && currentStage === stageId) return 'failed';
    if (targetIdx < currentIdx) return 'completed';
    if (targetIdx === currentIdx) return agentStatus === 'paused' ? 'paused' : 'running';
    return 'queued';
  };

  const renderTimelineIcon = (status: TimelineEvent['status']) => {
    if (status === 'active') return <Loader2 className="w-3.5 h-3.5 text-accent animate-spin" />;
    if (status === 'completed') return <Check className="w-3.5 h-3.5 text-success" />;
    if (status === 'failed') return <Square className="w-3.5 h-3.5 text-error" />;
    return <Circle className="w-3.5 h-3.5 text-secondaryText" />;
  };

  return (
    <div className="flex flex-col h-full overflow-hidden bg-panel select-none text-primaryText font-sans">
      {/* Top Header */}
      <div className="h-10 border-b border-border flex items-center justify-between px-3 shrink-0">
        <div className="flex items-center gap-2 font-medium text-xs text-primaryText">
          <Bot className="w-4 h-4 text-accent" />
          <span className="font-bold tracking-tight">ORCHESTRATOR</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className={clsx(
            "text-[10px] font-mono uppercase px-2 py-0.5 rounded font-semibold flex items-center gap-1.5",
            agentStatus === 'completed' ? "bg-success/20 text-success border border-success/30" :
            agentStatus === 'failed' ? "bg-error/20 text-error border border-error/30" :
            agentStatus === 'paused' ? "bg-warning/20 text-warning border border-warning/30" :
            "bg-accent/20 text-accent border border-accent/30"
          )}>
            {agentStatus !== 'idle' && agentStatus !== 'completed' && agentStatus !== 'disconnected' && (
              <span className="w-1.5 h-1.5 rounded-full bg-accent animate-ping" />
            )}
            {agentStatus}
          </span>
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="flex border-b border-border bg-background/50 shrink-0 text-xs">
        <button
          onClick={() => setActiveTab('stage')}
          className={clsx(
            "flex-1 py-2 text-center font-medium border-b-2 transition-colors",
            activeTab === 'stage' ? "border-accent text-accent bg-panel/60" : "border-transparent text-secondaryText hover:text-primaryText"
          )}
        >
          Stages ({stages.length})
        </button>
        <button
          onClick={() => setActiveTab('supervisor')}
          className={clsx(
            "flex-1 py-2 text-center font-medium border-b-2 transition-colors",
            activeTab === 'supervisor' ? "border-accent text-accent bg-panel/60" : "border-transparent text-secondaryText hover:text-primaryText"
          )}
        >
          Supervisor
        </button>
        <button
          onClick={() => setActiveTab('timeline')}
          className={clsx(
            "flex-1 py-2 text-center font-medium border-b-2 transition-colors",
            activeTab === 'timeline' ? "border-accent text-accent bg-panel/60" : "border-transparent text-secondaryText hover:text-primaryText"
          )}
        >
          Timeline ({timeline.length})
        </button>
      </div>

      {/* Content Body */}
      <div className="flex-1 overflow-y-auto p-3 space-y-4">
        
        {/* Project Goal Card */}
        <div className="bg-background/80 border border-border/80 rounded-lg p-3">
          <div className="text-[10px] font-bold uppercase text-secondaryText tracking-wider mb-1 flex items-center justify-between">
            <span>SPECIFICATION</span>
            <span className="font-mono text-[9px] text-accent">autonomous-sdlc</span>
          </div>
          <div className="text-xs text-primaryText leading-relaxed line-clamp-3">
            {projectAggregate?.project_input?.project_description || "Autonomous software development workspace"}
          </div>
          {projectAggregate?.project_input?.technology_stack && (
            <div className="flex flex-wrap gap-1 mt-2">
              {projectAggregate.project_input.technology_stack.map((tech) => (
                <span key={tech} className="text-[9px] font-mono bg-panel border border-border px-1.5 py-0.5 rounded text-secondaryText">
                  {tech}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* 1. STAGES TAB */}
        {activeTab === 'stage' && (
          <div className="space-y-2">
            <div className="text-[10px] font-bold uppercase tracking-wider text-secondaryText px-1 flex items-center justify-between">
              <span>AUTONOMOUS STAGES</span>
              <span className="font-mono text-[9px] text-accent">{currentStage.toUpperCase()}</span>
            </div>

            <div className="space-y-1.5">
              {stages.map((stage) => {
                const status = getStageStatus(stage.id);
                const isCurrent = currentStage === stage.id && agentStatus !== 'completed';

                return (
                  <div
                    key={stage.id}
                    className={clsx(
                      "p-2 rounded-lg border transition-all text-xs flex flex-col gap-1",
                      isCurrent
                        ? "bg-accent/10 border-accent/60 shadow-sm"
                        : status === 'completed'
                        ? "bg-background/50 border-border/60 opacity-90"
                        : "bg-background/30 border-border/40 opacity-60"
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 font-semibold">
                        <span className={clsx(
                          isCurrent ? "text-accent" : status === 'completed' ? "text-success" : "text-secondaryText"
                        )}>
                          {stage.icon}
                        </span>
                        <span className={isCurrent ? "text-primaryText font-bold" : "text-secondaryText"}>
                          {stage.name}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5 font-mono text-[10px]">
                        {status === 'completed' && <span className="text-success font-bold">✓</span>}
                        {status === 'running' && (
                          <span className="flex items-center gap-1 text-accent font-bold">
                            <Loader2 className="w-3 h-3 animate-spin" />
                            <span>ACTIVE</span>
                          </span>
                        )}
                        {status === 'paused' && <span className="text-warning font-bold">PAUSED</span>}
                        {status === 'failed' && <span className="text-error font-bold">FAILED</span>}
                        {status === 'queued' && <span className="text-secondaryText/60">○</span>}
                      </div>
                    </div>

                    <div className="text-[10px] text-secondaryText/80 pl-5 leading-snug">
                      {stage.desc}
                    </div>

                    {/* Granular Details within Active Stage */}
                    {stage.id === 'planning' && isCurrent && (
                      <div className="mt-2 pt-2 border-t border-border/50 pl-5 space-y-1">
                        <div className="text-[10px] uppercase font-bold text-secondaryText">Sections:</div>
                        <div className="grid grid-cols-2 gap-1 text-[10px] font-mono">
                          {planningSections.map((sec) => (
                            <div key={sec.id} className="flex items-center gap-1">
                              {sec.status === 'completed' ? (
                                <span className="text-success">✓</span>
                              ) : sec.status === 'running' ? (
                                <span className="text-accent animate-spin">●</span>
                              ) : (
                                <span className="text-secondaryText/60">○</span>
                              )}
                              <span className="truncate">{sec.name}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {stage.id === 'coding' && isCurrent && currentTask && (
                      <div className="mt-2 pt-2 border-t border-border/50 pl-5 space-y-1 font-mono text-[10px]">
                        <div className="text-primaryText font-bold">Task: {currentTask.id}</div>
                        {currentTask.file && <div className="text-accent truncate">File: {currentTask.file}</div>}
                      </div>
                    )}

                    {stage.id === 'testing' && (
                      <div className="mt-1 pt-1.5 border-t border-border/40 pl-5 flex items-center justify-between text-[10px] font-mono">
                        <span className="text-success">{testResults.passed} passed</span>
                        {testResults.failed > 0 && <span className="text-error">{testResults.failed} failed</span>}
                        <button
                          onClick={() => setWorkspaceMode('tests')}
                          className="text-accent hover:underline text-[9px]"
                        >
                          View Tests →
                        </button>
                      </div>
                    )}

                    {stage.id === 'security' && (
                      <div className="mt-1 pt-1.5 border-t border-border/40 pl-5 flex items-center justify-between text-[10px] font-mono">
                        <span className="text-secondaryText">Findings:</span>
                        <span className={securityFindings.critical > 0 ? "text-error font-bold" : "text-success"}>
                          {securityFindings.critical} Crit / {securityFindings.high} High
                        </span>
                        <button
                          onClick={() => setWorkspaceMode('qa')}
                          className="text-accent hover:underline text-[9px]"
                        >
                          View Security →
                        </button>
                      </div>
                    )}

                    {stage.id === 'deployment' && (
                      <div className="mt-1 pt-1.5 border-t border-border/40 pl-5 flex items-center justify-between text-[10px] font-mono">
                        <span className="text-secondaryText">Docker Port:</span>
                        <span className="text-accent font-bold">
                          {projectAggregate?.delivery_result?.metadata?.host_port || '10000'}
                        </span>
                        <button
                          onClick={() => setWorkspaceMode('preview')}
                          className="text-accent hover:underline text-[9px]"
                        >
                          Live Preview →
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* 2. SUPERVISOR TAB */}
        {activeTab === 'supervisor' && (
          <div className="space-y-3">
            <div className="text-[10px] font-bold uppercase tracking-wider text-secondaryText px-1 flex items-center justify-between">
              <span>DECISION ENGINE</span>
              <span className="font-mono text-accent">SUPERVISOR</span>
            </div>

            <div className="bg-background/80 border border-border rounded-lg p-3 space-y-2.5 text-xs">
              <div>
                <div className="text-[10px] uppercase font-bold text-secondaryText">Current Target Task</div>
                <div className="font-mono text-primaryText font-bold mt-0.5">
                  {supervisorDecision?.currentTask || currentTask?.id || 'task_initial_setup'}
                </div>
              </div>

              <div>
                <div className="text-[10px] uppercase font-bold text-secondaryText">Selected Agent</div>
                <div className="font-mono text-accent font-semibold mt-0.5 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-accent" />
                  <span>{supervisorDecision?.selectedAgent || 'Coding Agent'}</span>
                </div>
              </div>

              <div>
                <div className="text-[10px] uppercase font-bold text-secondaryText">Decision Rationale</div>
                <div className="text-secondaryText text-[11px] mt-0.5 leading-relaxed bg-secondary/30 p-2 rounded border border-border/40">
                  {supervisorDecision?.reason || 'Topological execution plan: dependencies satisfied, QA quality gate open.'}
                </div>
              </div>

              {supervisorDecision?.nextCandidates && supervisorDecision.nextCandidates.length > 0 && (
                <div>
                  <div className="text-[10px] uppercase font-bold text-secondaryText">Next Candidate Tasks</div>
                  <div className="space-y-1 mt-1">
                    {supervisorDecision.nextCandidates.map((cand, idx) => (
                      <div key={idx} className="font-mono text-[10px] text-secondaryText bg-panel px-2 py-1 rounded border border-border/50">
                        {cand}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* QA Gate & Rework Overview */}
            <div className="bg-background/80 border border-border rounded-lg p-3 space-y-2 text-xs">
              <div className="text-[10px] uppercase font-bold text-secondaryText">Quality Gate Summary</div>
              <div className="flex justify-between items-center text-xs font-mono">
                <span>Rework Cycles:</span>
                <span className="font-bold text-accent">
                  {projectAggregate?.execution_state
                    ? Object.values(projectAggregate.execution_state.tasks).reduce((sum, t) => sum + (t.rework_count || 0), 0)
                    : 0}
                </span>
              </div>
              <div className="flex justify-between items-center text-xs font-mono">
                <span>Passed Gates:</span>
                <span className="font-bold text-success">
                  {projectAggregate?.quality_gates?.filter(g => g.status === 'passed').length || 0} / {projectAggregate?.quality_gates?.length || 0}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* 3. TIMELINE TAB */}
        {activeTab === 'timeline' && (
          <div className="space-y-2">
            <div className="text-[10px] font-bold uppercase tracking-wider text-secondaryText px-1 flex items-center justify-between">
              <span>RUNTIME LOG STREAM</span>
              <span className="font-mono text-secondaryText">{timeline.length} events</span>
            </div>

            {timeline.length === 0 ? (
              <div className="p-8 text-center text-secondaryText text-xs italic">
                Waiting for runtime events...
              </div>
            ) : (
              <div className="space-y-2 relative pl-2">
                <div className="absolute left-3.5 top-2 bottom-2 w-0.5 bg-border -z-10" />
                <AnimatePresence>
                  {timeline.slice(-30).map((event: TimelineEvent) => (
                    <motion.div
                      key={event.id}
                      initial={{ opacity: 0, x: -4 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="flex gap-2 items-start text-xs relative"
                    >
                      <div className="w-3.5 h-3.5 rounded-full flex items-center justify-center shrink-0 bg-panel border mt-0.5">
                        {renderTimelineIcon(event.status)}
                      </div>
                      <div className="flex-1 min-w-0 bg-background/70 border border-border/60 p-2 rounded">
                        <div className="font-mono font-semibold text-primaryText text-[11px] truncate">
                          {event.type}
                        </div>
                        <div className="text-[10px] text-secondaryText mt-0.5 line-clamp-2">
                          {event.message}
                        </div>
                        <div className="text-[9px] text-secondaryText/60 font-mono mt-0.5">
                          {new Date(event.timestamp).toLocaleTimeString()}
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            )}
          </div>
        )}

      </div>

      {/* Action Footer */}
      {agentStatus !== 'idle' && (
        <div className="p-3 border-t border-border bg-background shrink-0 flex gap-2">
          {agentStatus === 'completed' ? (
            <button
              onClick={() => setWorkspaceMode('preview')}
              className="flex-1 bg-accent hover:bg-accent/90 text-white text-xs font-semibold py-2 px-3 rounded-lg transition-colors flex items-center justify-center gap-1.5 shadow-md shadow-accent/20"
            >
              <Server className="w-3.5 h-3.5" />
              <span>Open Live Preview</span>
            </button>
          ) : agentStatus === 'paused' || agentStatus === 'failed' ? (
            <button
              onClick={handleStartTask}
              disabled={actionLoading}
              className="flex-1 bg-warning hover:bg-warning/90 text-background font-semibold text-xs py-2 px-3 rounded-lg flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50"
            >
              <Play className="w-3.5 h-3.5" />
              <span>Resume / Retry Pipeline</span>
            </button>
          ) : (
            <div className="flex-1 flex items-center justify-center gap-2 py-1.5 text-xs text-secondaryText font-mono">
              <Loader2 className="w-3.5 h-3.5 text-accent animate-spin" />
              <span>Orchestrating {currentStage.toUpperCase()}...</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
