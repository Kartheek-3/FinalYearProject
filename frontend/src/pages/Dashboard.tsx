import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/useAuth';
import { api } from '../services/api';
import type { ProjectAggregate } from '../types/api';
import {
  Bot,
  Plus,
  Loader2,
  FolderCode,
  Calendar,
  ArrowRight,
  LogOut,
  Sparkles,
  Server,
  ChevronRight,
  CheckCircle2,
} from 'lucide-react';
import { motion } from 'framer-motion';

export default function Dashboard() {
  const { user, signOut, isConfigured } = useAuth();
  const [projects, setProjects] = useState<ProjectAggregate[]>([]);
  const [loadingProjects, setLoadingProjects] = useState<boolean>(true);
  const [description, setDescription] = useState('');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const navigate = useNavigate();

  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    setLoadingProjects(true);
    try {
      const data = await api.listProjects();
      // Sort newest first
      data.sort((a, b) => {
        const tA = new Date(a.lifecycle?.created_at || 0).getTime();
        const tB = new Date(b.lifecycle?.created_at || 0).getTime();
        return tB - tA;
      });
      setProjects(data);
    } catch (err) {
      console.error('Failed to load projects:', err);
    } finally {
      setLoadingProjects(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim()) return;

    setError(null);
    setCreating(true);
    try {
      const proj = await api.createProject({
        project_description: description.trim(),
        technology_stack: ['Python', 'FastAPI', 'HTML', 'CSS', 'JavaScript'],
      });
      navigate(`/projects/${proj.project_id}`);
    } catch (err: any) {
      console.error('Failed to create project:', err);
      setError(err?.message || 'Failed to create workspace project.');
    } finally {
      setCreating(false);
    }
  };

  const handleSignOut = async () => {
    try {
      const { useIDEStore } = await import('../store/useIDEStore');
      useIDEStore.getState().disconnectWebSocket();
      useIDEStore.getState().setProjectId(null);
    } catch {
      // Ignore if store not loaded
    }
    await signOut();
    navigate('/login');
  };

  return (
    <div className="min-h-screen w-screen bg-background text-primaryText font-sans select-none flex flex-col">
      {/* Top Navbar */}
      <header className="h-14 border-b border-border bg-panel/80 backdrop-blur px-6 flex items-center justify-between shrink-0 sticky top-0 z-20">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-accent/20 border border-accent/40 flex items-center justify-center text-accent">
            <Bot className="w-5 h-5" />
          </div>
          <div className="flex items-center gap-2">
            <span className="font-bold text-base tracking-tight">SEAM</span>
            <span className="text-[10px] font-mono uppercase text-accent font-semibold px-1.5 py-0.5 rounded bg-accent/15 border border-accent/30">
              IDE Workspace
            </span>
          </div>
        </div>

        {/* User Profile Bar */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-accent/20 border border-accent/40 flex items-center justify-center text-xs font-semibold text-accent uppercase">
              {user?.displayName ? user.displayName.charAt(0) : user?.email ? user.email.charAt(0) : 'U'}
            </div>
            <div className="hidden sm:block text-left text-xs">
              <div className="font-medium text-primaryText truncate max-w-[160px]">
                {user?.displayName || 'Developer'}
              </div>
              <div className="text-[11px] text-secondaryText truncate max-w-[160px]">
                {user?.email || 'authenticated'}
              </div>
            </div>
          </div>

          {isConfigured && (
            <button
              onClick={handleSignOut}
              className="p-1.5 rounded-lg hover:bg-secondary text-secondaryText hover:text-primaryText transition-colors flex items-center gap-1.5 text-xs font-medium"
              title="Sign Out"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden md:inline">Sign Out</span>
            </button>
          )}
        </div>
      </header>

      {/* Main Content Dashboard */}
      <main className="flex-1 max-w-6xl w-full mx-auto p-6 md:p-10 space-y-10">
        {/* Welcome Banner */}
        <div className="relative overflow-hidden bg-panel border border-border/80 rounded-2xl p-8 shadow-xl">
          <div className="absolute top-0 right-0 w-96 h-96 bg-accent/5 rounded-full blur-3xl pointer-events-none" />
          <div className="relative z-10 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-secondary/80 border border-border text-xs text-secondaryText mb-3">
              <Sparkles className="w-3.5 h-3.5 text-accent" />
              <span>Autonomous Development Engine Ready</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-primaryText">
              Welcome to SEAM, {user?.displayName ? user.displayName.split(' ')[0] : 'Developer'}
            </h1>
            <p className="mt-2 text-sm text-secondaryText leading-relaxed">
              Describe the application you want to build. SEAM will autonomously orchestrate analysis, planning, code generation, testing, and Docker deployment.
            </p>
          </div>
        </div>

        {/* Project Creation & Recent Projects Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Create Project Form */}
          <div className="lg:col-span-1 bg-panel border border-border/80 rounded-xl p-6 shadow-md h-fit">
            <h2 className="text-base font-bold text-primaryText flex items-center gap-2 mb-1">
              <Plus className="w-4 h-4 text-accent" />
              <span>Create New Project</span>
            </h2>
            <p className="text-xs text-secondaryText mb-4">
              Enter requirement prompt to launch autonomous generation.
            </p>

            {error && (
              <div className="mb-4 p-3 rounded-lg bg-error/10 border border-error/30 text-error text-xs">
                {error}
              </div>
            )}

            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-secondaryText uppercase tracking-wider mb-2">
                  Application Description
                </label>
                <textarea
                  required
                  rows={4}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="e.g. Build an expense tracker web application using Python, FastAPI, HTML, CSS and JavaScript."
                  className="w-full bg-background border border-border rounded-lg p-3 text-xs text-primaryText placeholder:text-secondaryText/50 resize-none focus:border-accent focus:outline-none transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-secondaryText uppercase tracking-wider mb-2">
                  Target Tech Stack
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {['Python', 'FastAPI', 'HTML', 'CSS', 'JavaScript', 'Docker'].map((tech) => (
                    <span key={tech} className="text-[11px] font-mono px-2 py-0.5 rounded bg-secondary text-secondaryText border border-border/60">
                      {tech}
                    </span>
                  ))}
                </div>
              </div>

              <button
                type="submit"
                disabled={creating || !description.trim()}
                className="w-full bg-accent hover:bg-accent/90 disabled:opacity-50 text-white font-semibold py-2.5 px-4 rounded-lg flex items-center justify-center gap-2 text-xs transition-all shadow-md shadow-accent/20"
              >
                {creating ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Provisioning Workspace...</span>
                  </>
                ) : (
                  <>
                    <span>Launch Autonomous IDE</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Existing Projects List */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-primaryText flex items-center gap-2">
                <FolderCode className="w-4 h-4 text-accent" />
                <span>Existing Workspaces ({projects.length})</span>
              </h2>
              <button
                onClick={fetchProjects}
                className="text-xs text-secondaryText hover:text-primaryText transition-colors"
              >
                Refresh
              </button>
            </div>

            {loadingProjects ? (
              <div className="flex flex-col items-center justify-center py-16 bg-panel border border-border/60 rounded-xl text-secondaryText">
                <Loader2 className="w-6 h-6 animate-spin text-accent mb-2" />
                <span className="text-xs font-mono">Loading workspaces...</span>
              </div>
            ) : projects.length === 0 ? (
              <div className="py-16 px-4 text-center bg-panel border border-border/60 rounded-xl text-secondaryText">
                <FolderCode className="w-12 h-12 mx-auto mb-3 opacity-30 text-accent" />
                <h3 className="text-sm font-semibold text-primaryText">No projects created yet</h3>
                <p className="text-xs text-secondaryText mt-1 max-w-sm mx-auto">
                  Use the form on the left to submit your first software specification.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {projects.map((proj) => {
                  const stage = proj.lifecycle?.stage || 'created';
                  const isDeployed = proj.delivery_result?.delivery_status === 'deployed';
                  const hostPort = proj.delivery_result?.metadata?.host_port;
                  const formattedDate = proj.lifecycle?.created_at
                    ? new Date(proj.lifecycle.created_at).toLocaleDateString()
                    : 'Recent';

                  return (
                    <motion.div
                      key={proj.project_id}
                      whileHover={{ scale: 1.005 }}
                      onClick={() => navigate(`/projects/${proj.project_id}`)}
                      className="bg-panel hover:bg-secondary/40 border border-border/80 hover:border-accent/40 rounded-xl p-4 transition-all cursor-pointer shadow-sm group"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="space-y-1.5 flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs font-bold text-accent">
                              {proj.project_id}
                            </span>
                            <span className={`text-[10px] font-mono uppercase px-2 py-0.5 rounded font-semibold ${
                              stage === 'failed' ? 'bg-error/20 text-error border border-error/30' :
                              isDeployed ? 'bg-success/20 text-success border border-success/30' :
                              'bg-accent/20 text-accent border border-accent/30'
                            }`}>
                              {stage}
                            </span>
                            {isDeployed && hostPort && (
                              <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-800/40 flex items-center gap-1">
                                <Server className="w-3 h-3" /> Port {hostPort}
                              </span>
                            )}
                          </div>

                          <p className="text-xs text-primaryText line-clamp-2 leading-relaxed">
                            {proj.project_input?.project_description || 'Autonomous Project Workspace'}
                          </p>

                          <div className="flex items-center gap-4 text-[11px] text-secondaryText pt-1">
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              <span>{formattedDate}</span>
                            </span>
                            {proj.execution_state && (
                              <span className="flex items-center gap-1">
                                <CheckCircle2 className="w-3 h-3 text-success" />
                                <span>
                                  {Object.values(proj.execution_state.tasks).filter(t => t.status === 'completed').length} Tasks Completed
                                </span>
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="p-2 rounded-lg bg-secondary/50 group-hover:bg-accent group-hover:text-white transition-colors text-secondaryText shrink-0 self-center">
                          <ChevronRight className="w-4 h-4" />
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
