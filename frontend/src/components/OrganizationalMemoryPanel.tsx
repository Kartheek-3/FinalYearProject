import { useState, useEffect } from 'react';
import { Database, Shield, Zap, Search, Activity } from 'lucide-react';
import { api } from '../services/api';

export default function OrganizationalMemoryPanel({ projectId }: { projectId?: string }) {
  const [stats, setStats] = useState<{count: number} | null>(null);
  const [recent, setRecent] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [liveEvents, setLiveEvents] = useState<any[]>([]);

  useEffect(() => {
    let mounted = true;
    
    async function fetchMemory() {
      try {
        const [statsData, recentData] = await Promise.all([
          api.getMemoryStats(),
          api.getRecentMemory()
        ]);
        if (mounted) {
          setStats(statsData);
          setRecent(recentData);
        }
      } catch (err) {
        console.error("Failed to fetch memory:", err);
      } finally {
        if (mounted) setLoading(false);
      }
    }
    
    fetchMemory();
    const interval = setInterval(fetchMemory, 10000);
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    if (!projectId) return;
    const ws = new WebSocket(api.getWebSocketUrl(projectId));
    ws.onmessage = (e) => {
      try {
        const event = JSON.parse(e.data);
        if (event.event_type.startsWith('memory.')) {
          setLiveEvents(prev => [event, ...prev].slice(0, 50));
        }
      } catch (err) {}
    };
    return () => ws.close();
  }, [projectId]);

  return (
    <div className="ide-panel flex-1 flex flex-col overflow-hidden">
      <div className="panel-header">
        <div className="flex items-center gap-2">
          <Database size={14} className="text-primary" />
          <span className="font-semibold text-xs tracking-wider">ORGANIZATIONAL MEMORY</span>
        </div>
        <div className="flex gap-2">
          {stats && (
            <span className="badge badge-primary">{stats.count} Records</span>
          )}
        </div>
      </div>
      
      <div className="flex flex-1 overflow-hidden">
        <div className="flex-1 overflow-auto p-4 custom-scrollbar border-r border-[var(--panel-border)]">
          <h3 className="text-[10px] uppercase font-bold text-secondary mb-3">Long-Term Storage</h3>
          {loading && !stats ? (
            <div className="flex items-center justify-center h-full">
              <div className="spinner" />
            </div>
          ) : recent.length === 0 ? (
            <div className="text-secondary text-xs p-4 text-center border-dashed border border-gray-700 rounded">
              No long-term memory recorded yet.
            </div>
          ) : (
            <div className="space-y-4">
              {recent.map((rec, i) => (
                <div key={i} className="code-block text-xs group relative">
                  <div className="flex justify-between items-start mb-2">
                    <div className="font-semibold text-primary">{rec.metadata?.title || 'Unknown Record'}</div>
                    <div className="badge">{rec.metadata?.memory_type || 'KNOWLEDGE'}</div>
                  </div>
                  <div className="text-secondary mb-2 mono text-[10px]">
                    Domain: {rec.metadata?.domain} | Source: {rec.metadata?.source_project_id?.substring(0, 12)}
                  </div>
                  <div className="whitespace-pre-wrap">{rec.document}</div>
                </div>
              ))}
            </div>
          )}
        </div>
        
        {projectId && (
          <div className="w-1/3 overflow-auto p-4 custom-scrollbar bg-[var(--bg-secondary)]">
            <h3 className="text-[10px] uppercase font-bold text-secondary mb-3 flex items-center gap-2">
              <Activity size={12} className="text-success" />
              Live Retrieval Activity
            </h3>
            {liveEvents.length === 0 ? (
              <div className="text-secondary text-xs p-4 text-center">
                Waiting for agent memory retrieval...
              </div>
            ) : (
              <div className="space-y-2">
                {liveEvents.map((evt, i) => (
                  <div key={i} className="text-xs p-2 rounded bg-[var(--bg-primary)] border border-[var(--panel-border)]">
                    <div className="font-semibold text-[var(--accent-color)] mono text-[10px] mb-1">
                      {new Date(evt.timestamp * 1000).toLocaleTimeString()}
                    </div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="badge">{evt.data.agent?.toUpperCase()}</span>
                      <span className="text-secondary">{evt.event_type}</span>
                    </div>
                    {evt.data.result_count !== undefined && (
                      <div className="text-[10px] text-success">Retrieved {evt.data.result_count} snippets</div>
                    )}
                    {evt.data.error && (
                      <div className="text-[10px] text-danger">{evt.data.error}</div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
