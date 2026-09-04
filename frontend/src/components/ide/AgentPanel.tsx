import { useState } from 'react';
import { Bot, Check, Circle, Loader2, Play, Square, Settings2 } from 'lucide-react';
import { useIDEStore, TimelineEvent } from '../../store/useIDEStore';
import clsx from 'clsx';
import { motion, AnimatePresence } from 'framer-motion';

export default function AgentPanel() {
  const { agentStatus, setAgentStatus, timeline, projectAggregate, triggerExecution } = useIDEStore();
  const [prompt, setPrompt] = useState('');
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

  const renderTimelineIcon = (status: TimelineEvent['status']) => {
    if (status === 'active') return <Loader2 className="w-4 h-4 text-accent animate-spin" />;
    if (status === 'completed') return <Check className="w-4 h-4 text-success" />;
    if (status === 'failed') return <Square className="w-4 h-4 text-error" />;
    return <Circle className="w-4 h-4 text-secondaryText" />;
  };

  
  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="h-10 border-b border-border flex items-center justify-between px-3 shrink-0">
        <div className="flex items-center gap-2 font-medium text-sm text-primaryText">
          <Bot className="w-4 h-4 text-accent" />
          <span>Agent</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-secondaryText capitalize flex items-center gap-1.5">
            {agentStatus !== 'idle' && agentStatus !== 'completed' && agentStatus !== 'disconnected' && (
              <span className="w-2 h-2 rounded-full bg-warning animate-pulse" />
            )}
            {agentStatus.replace('_', ' ')}
          </span>
          <button className="p-1 rounded hover:bg-secondary text-secondaryText transition-colors">
            <Settings2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Content area */}
      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-6">
        
        {/* Project Request / Goal */}
        <div className="bg-secondary/40 border border-border rounded-lg p-3">
          <div className="text-xs font-semibold text-secondaryText mb-1 flex items-center justify-between">
            <span>PROJECT GOAL</span>
            <span className={clsx(
              "px-1.5 py-0.5 rounded text-[10px] uppercase font-mono tracking-wider",
              agentStatus === 'completed' ? "bg-success/20 text-success" :
              agentStatus === 'failed' ? "bg-error/20 text-error" :
              agentStatus === 'paused' ? "bg-warning/20 text-warning" : "bg-accent/20 text-accent"
            )}>
              {agentStatus}
            </span>
          </div>
          <div className="text-sm text-primaryText leading-relaxed">
            {projectAggregate?.project_input?.project_description || prompt || "Autonomous software development workspace"}
          </div>
          {projectAggregate?.project_input?.technology_stack && (
            <div className="flex flex-wrap gap-1.5 mt-2">
              {projectAggregate.project_input.technology_stack.map((tech) => (
                <span key={tech} className="text-[10px] bg-panel border border-border px-1.5 py-0.5 rounded text-secondaryText">
                  {tech}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Autonomous Execution State Summary */}
        <div className="bg-panel border border-border rounded-lg p-3 space-y-2.5">
          <div className="text-[10px] uppercase font-bold text-secondaryText tracking-wider border-b border-border/60 pb-1 flex justify-between items-center">
            <span>Autonomous Orchestrator</span>
            <span className="font-mono text-accent">{projectAggregate?.lifecycle?.stage || 'executing'}</span>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="bg-secondary/30 p-2 rounded border border-border/40">
              <div className="text-[10px] text-secondaryText font-medium">Active Agent</div>
              <div className="text-primaryText font-semibold capitalize mt-0.5 flex items-center gap-1.5">
                <span className={`w-1.5 h-1.5 rounded-full ${
                  agentStatus === 'completed' ? 'bg-success' :
                  agentStatus === 'failed' ? 'bg-error' :
                  agentStatus === 'testing' ? 'bg-purple-400' :
                  'bg-accent animate-pulse'
                }`} />
                <span>
                  {agentStatus === 'planning' ? 'Planning Agent' :
                   agentStatus === 'testing' ? 'QA Agent' :
                   agentStatus === 'executing' ? 'Coding Agent' :
                   agentStatus === 'completed' ? 'Delivery Agent' :
                   'Supervisor'}
                </span>
              </div>
            </div>

            <div className="bg-secondary/30 p-2 rounded border border-border/40">
              <div className="text-[10px] text-secondaryText font-medium">QA Gate State</div>
              <div className="text-primaryText font-semibold mt-0.5">
                {projectAggregate?.quality_gates && projectAggregate.quality_gates.length > 0 ? (
                  <span className="text-success font-mono">
                    {projectAggregate.quality_gates.filter(g => g.status === 'passed').length} / {projectAggregate.quality_gates.length} Passed
                  </span>
                ) : (
                  <span className="text-secondaryText font-mono">Pending</span>
                )}
              </div>
            </div>
          </div>

          {/* Rework & Task details */}
          {projectAggregate?.execution_state && (
            <div className="bg-secondary/20 p-2 rounded border border-border/30 text-[11px] text-secondaryText flex justify-between items-center">
              <span>Rework Cycles: <strong className="text-primaryText font-mono">{
                Object.values(projectAggregate.execution_state.tasks).reduce((sum, t) => sum + (t.rework_count || 0), 0)
              }</strong></span>
              <span>Tasks: <strong className="text-primaryText font-mono">{
                Object.values(projectAggregate.execution_state.tasks).filter(t => t.status === 'completed').length
              } / {Object.keys(projectAggregate.execution_state.tasks).length}</strong></span>
            </div>
          )}
        </div>

        {/* Timeline */}
        {timeline.length > 0 && (
          <div className="flex flex-col relative pl-2">
            <div className="text-[10px] uppercase font-bold text-secondaryText tracking-wider mb-3">
              Execution Timeline ({timeline.length})
            </div>
            <div className="absolute left-4 top-6 bottom-4 w-0.5 bg-border -z-10" />
            
            <AnimatePresence>
              {timeline.map((event: TimelineEvent) => (
                <motion.div
                  key={event.id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex gap-2.5 items-start mb-3.5 relative text-xs"
                >
                  <div className={clsx(
                    "w-4 h-4 rounded-full flex items-center justify-center shrink-0 bg-panel border mt-0.5",
                    event.status === 'active' ? "border-accent text-accent" :
                    event.status === 'completed' ? "border-success text-success" : "border-border text-secondaryText"
                  )}>
                    {renderTimelineIcon(event.status)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className={clsx(
                      "font-semibold truncate",
                      event.status === 'active' ? "text-primaryText" : "text-secondaryText"
                    )}>
                      {event.type}
                    </div>
                    <div className="text-[11px] text-secondaryText/90 mt-0.5 line-clamp-2">{event.message}</div>
                    <div className="text-[9px] text-secondaryText/60 font-mono mt-0.5">{new Date(event.timestamp).toLocaleTimeString()}</div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}

      </div>

      {/* Controls */}
      {agentStatus !== 'idle' && (
        <div className="p-3 border-t border-border bg-background shrink-0 flex gap-2">
          {agentStatus === 'completed' ? (
            <button 
              onClick={() => {
                setAgentStatus('idle');
                useIDEStore.setState({ timeline: [] });
                setPrompt('');
              }}
              className="flex-1 bg-accent hover:bg-accent/90 text-white text-sm font-medium py-2 px-4 rounded transition-colors"
            >
              Start New Task
            </button>
          ) : (
            <>
              {agentStatus === 'paused' || agentStatus === 'failed' ? (
                <button 
                  onClick={handleStartTask}
                  disabled={actionLoading}
                  className="flex-1 bg-warning hover:bg-warning/90 text-background font-semibold text-sm py-1.5 px-3 rounded flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50"
                >
                  <Play className="w-4 h-4" /> Resume / Retry
                </button>
              ) : (
                <button 
                  className="flex-1 bg-secondary hover:bg-border text-primaryText text-sm font-medium py-1.5 px-3 rounded flex items-center justify-center gap-1.5 transition-colors"
                >
                  <Square className="w-4 h-4" /> Stop
                </button>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
