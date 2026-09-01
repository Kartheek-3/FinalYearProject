import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { Play } from 'lucide-react';

export default function CreateProject() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [description, setDescription] = useState('Build a simple Todo REST API using Python FastAPI...');
  const [techStack, setTechStack] = useState('Python, FastAPI, SQLite');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim() || !techStack.trim()) return;

    setLoading(true);
    setError(null);

    try {
      const stackArray = techStack.split(',').map(s => s.trim()).filter(Boolean);
      const project = await api.createProject({
        project_description: description,
        technology_stack: stackArray
      });
      
      await api.runAutonomousProject(project.project_id);
      
      navigate(`/projects/${project.project_id}`);
    } catch (err: any) {
      setError(err.message || 'Failed to start autonomous run');
      setLoading(false);
    }
  };

  return (
    <div className="p-4" style={{ maxWidth: '800px', margin: '0 auto' }}>
      <h2 className="mb-4 text-xs font-semibold text-secondary">NEW SEAM WORKSPACE</h2>
      
      <div className="ide-panel p-4">
        {error && <div className="badge badge-danger mb-4 w-full p-2">{error}</div>}
        
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="form-label">System Requirements</label>
            <textarea 
              className="form-control" 
              rows={12}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={loading}
              required
            />
          </div>

          <div className="mb-4">
            <label className="form-label">Technology Stack Config</label>
            <input 
              type="text" 
              className="form-control mono text-xs" 
              value={techStack}
              onChange={(e) => setTechStack(e.target.value)}
              disabled={loading}
              required
            />
          </div>

          <div className="flex justify-end mt-4 pt-4" style={{ borderTop: '1px solid var(--panel-border)' }}>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              <Play size={14} />
              {loading ? 'Initializing Pipeline...' : 'Create & Run Autonomous'}
            </button>
          </div>
        </form>
      </div>

      {loading && (
        <div className="loading-overlay">
          <div className="spinner"></div>
          <div className="mt-4 text-xs mono">INITIALIZING AUTONOMOUS PIPELINE...</div>
        </div>
      )}
    </div>
  );
}
