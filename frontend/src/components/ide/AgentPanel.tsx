import React, { useState } from 'react';
import { Bot, Check, Circle, Loader2, Play, Square, Settings2 } from 'lucide-react';
import { useIDEStore, TimelineEvent } from '../../store/useIDEStore';
import clsx from 'clsx';
import { motion, AnimatePresence } from 'framer-motion';
import { api } from '../../services/api';

export default function AgentPanel() {
  const { agentStatus, setAgentStatus, timeline, projectId, projectAggregate, fetchProject } = useIDEStore();
  const [prompt, setPrompt] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  const handleStartTask = async () => {
    if (!projectId) return;
    setActionLoading(true);
    try {
      if (projectAggregate?.lifecycle?.stage === 'created' || projectAggregate?.lifecycle?.stage === 'failed') {
        await api.runAutonomousProject(projectId);
      } else {
        await api.runUntilBlocked(projectId, 10);
      }
      await fetchProject();
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

  const currentTask = projectAggregate?.execution_state?.current_task_id;
  
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
        
        {/* Chat / Prompt */}
        <div className="bg-secondary/30 border border-border rounded-lg p-3">
          <div className="text-xs font-semibold text-secondaryText mb-2">USER</div>
          {agentStatus === 'idle' ? (
            <textarea
              className="w-full bg-transparent border-none outline-none text-sm resize-none"
              placeholder="Ask the agent to build something..."
              rows={3}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleStartTask();
                }
              }}
            />
          ) : (
            <div className="text-sm">{prompt}</div>
          )}
        </div>

        {/* Timeline */}
        {timeline.length > 0 && (
          <div className="flex flex-col relative pl-2">
            <div className="absolute left-4 top-2 bottom-4 w-0.5 bg-border -z-10" />
            
            <AnimatePresence>
              {timeline.map((event: TimelineEvent) => (
                <motion.div
                  key={event.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex gap-3 items-start mb-4 relative"
                >
                  <div className={clsx(
                    "w-5 h-5 rounded-full flex items-center justify-center shrink-0 bg-panel border mt-0.5",
                    event.status === 'active' ? "border-accent text-accent" :
                    event.status === 'completed' ? "border-success text-success" : "border-border text-secondaryText"
                  )}>
                    {renderTimelineIcon(event.status)}
                  </div>
                  <div className="flex-1">
                    <div className={clsx(
                      "text-sm font-medium",
                      event.status === 'active' ? "text-primaryText" : "text-secondaryText"
                    )}>
                      {event.type.charAt(0).toUpperCase() + event.type.slice(1)}
                    </div>
                    <div className="text-xs text-secondaryText mt-0.5">{event.message}</div>
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
              <button 
                className="flex-1 bg-secondary hover:bg-border text-primaryText text-sm font-medium py-1.5 px-3 rounded flex items-center justify-center gap-1.5 transition-colors"
              >
                <Square className="w-4 h-4" /> Stop
              </button>
              {agentStatus === 'waiting' && (
                <button 
                  className="flex-1 bg-success hover:bg-success/90 text-white text-sm font-medium py-1.5 px-3 rounded flex items-center justify-center gap-1.5 transition-colors"
                >
                  <Play className="w-4 h-4" /> Approve
                </button>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
