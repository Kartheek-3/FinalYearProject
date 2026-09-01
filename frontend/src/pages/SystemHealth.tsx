import { useEffect, useState } from 'react';
import { api } from '../services/api';
import { Terminal, Database, Cpu, HardDrive } from 'lucide-react';

export default function SystemHealth() {
  const [health, setHealth] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.health()
      .then(data => setHealth(data))
      .catch(err => setError(err.message));
  }, []);

  return (
    <div className="p-4" style={{ maxWidth: '600px', margin: '0 auto' }}>
      <h2 className="mb-4 text-xs font-semibold text-secondary">DIAGNOSTICS PANEL</h2>
      
      <div className="flex-col gap-4 flex">
        
        {/* Backend Node */}
        <div className="ide-panel p-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Terminal size={24} style={{ color: 'var(--accent-color)' }} />
            <div>
              <div className="font-bold">SEAM Controller (FastAPI)</div>
              <div className="text-xs text-secondary mono">http://localhost:8000</div>
            </div>
          </div>
          <div>
            {!health && !error ? <span className="text-secondary text-xs">Pinging...</span> : 
              error ? <span className="badge badge-danger">Offline</span> : 
              <span className="badge badge-success">Connected</span>
            }
          </div>
        </div>

        {/* LLM Node */}
        <div className="ide-panel p-4 flex items-center justify-between opacity-70">
          <div className="flex items-center gap-4">
            <Cpu size={24} style={{ color: 'var(--warning)' }} />
            <div>
              <div className="font-bold">LLM Engine (Ollama)</div>
              <div className="text-xs text-secondary mono">http://localhost:11434</div>
            </div>
          </div>
          <div>
            <span className="badge badge-outline">Unverified by API</span>
          </div>
        </div>

        {/* Docker Node */}
        <div className="ide-panel p-4 flex items-center justify-between opacity-70">
          <div className="flex items-center gap-4">
            <HardDrive size={24} style={{ color: '#0db7ed' }} />
            <div>
              <div className="font-bold">Docker Engine</div>
              <div className="text-xs text-secondary mono">Local Socket</div>
            </div>
          </div>
          <div>
             <span className="badge badge-outline">Unverified by API</span>
          </div>
        </div>

      </div>
    </div>
  );
}
