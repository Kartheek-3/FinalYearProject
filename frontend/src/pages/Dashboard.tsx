import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search } from 'lucide-react';

export default function Dashboard() {
  const navigate = useNavigate();
  const [projectId, setProjectId] = useState('');

  return (
    <div className="p-4" style={{ maxWidth: '800px', margin: '0 auto', marginTop: '10vh' }}>
      <div style={{ textAlign: 'center', marginBottom: '40px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: 300, letterSpacing: '0.1em' }}>SEAM <span style={{ color: 'var(--accent-color)', fontWeight: 600 }}>CONTROL PLANE</span></h1>
        <p className="text-secondary mt-2">AI Software Engineering Manager Workspace</p>
      </div>

      <div className="ide-panel p-4">
        <h2 className="mb-4 text-xs font-semibold text-secondary">OPEN PROJECT DIRECTORY</h2>
        <div className="flex gap-2">
          <div className="flex-1" style={{ position: 'relative' }}>
            <Search size={14} style={{ position: 'absolute', left: '10px', top: '10px', color: 'var(--text-secondary)' }} />
            <input 
              type="text" 
              className="form-control mono"
              style={{ paddingLeft: '32px' }}
              placeholder="Enter Project ID (e.g. proj_12345)" 
              value={projectId}
              onChange={e => setProjectId(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && projectId && navigate(`/projects/${projectId}`)}
            />
          </div>
          <button 
            className="btn btn-primary"
            disabled={!projectId}
            onClick={() => navigate(`/projects/${projectId}`)}
          >
            Open Workspace
          </button>
        </div>
        <div className="mt-4 text-xs text-secondary">
          Tip: You can find existing Project IDs in the backend console output, or create a new project from the Activity Bar.
        </div>
      </div>
    </div>
  );
}
