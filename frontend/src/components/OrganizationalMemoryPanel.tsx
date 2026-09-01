import { useState, useEffect } from 'react';
import { Database, Shield, Zap, Search } from 'lucide-react';
import { api } from '../services/api';

export default function OrganizationalMemoryPanel() {
  const [stats, setStats] = useState<{count: number} | null>(null);
  const [recent, setRecent] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

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
      
      <div className="flex-1 overflow-auto p-4 custom-scrollbar">
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
    </div>
  );
}
