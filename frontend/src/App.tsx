import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, useNavigate } from 'react-router-dom';
import AppShell from './components/ide/AppShell';
import { api } from './services/api';
import { Bot, Plus, Loader2 } from 'lucide-react';

function Dashboard() {
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleCreate = async () => {
    if (!description) return;
    setLoading(true);
    try {
      const proj = await api.createProject({
        project_description: description,
        technology_stack: ['Python', 'HTML', 'CSS', 'JavaScript'],
      });
      navigate(`/projects/${proj.project_id}`);
    } catch (err) {
      console.error(err);
      alert('Failed to create project');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center h-screen w-screen bg-background text-primaryText font-sans">
      <div className="w-full max-w-lg bg-panel border border-border rounded-lg p-6 shadow-2xl">
        <div className="flex items-center gap-3 mb-6">
          <Bot className="w-8 h-8 text-accent" />
          <h2 className="text-xl font-bold">SEAM Agent-First IDE</h2>
        </div>
        <div className="space-y-4">
          <div>
            <label className="block text-sm text-secondaryText mb-2">Project Request</label>
            <textarea
              className="w-full bg-background border border-border rounded p-3 text-sm resize-none focus:border-accent focus:outline-none"
              rows={4}
              placeholder="e.g., Build a simple calculator web application using Python."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          <button
            onClick={handleCreate}
            disabled={loading || !description}
            className="w-full bg-accent hover:bg-accent/90 disabled:opacity-50 text-white font-medium py-2 px-4 rounded flex items-center justify-center gap-2 transition-colors"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            Create Workspace
          </button>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/projects/:projectId" element={<AppShell />} />
        <Route path="/" element={<Dashboard />} />
      </Routes>
    </BrowserRouter>
  );
}


