import React, { useEffect, useState, useRef } from 'react';
import {
  Play,
  FilePlus,
  FolderPlus,
  Save,
  Search,
  Eye,
  GitCompare,
  CheckCircle2,
  ShieldCheck,
  Terminal,
  Bot,
  Server,
  Layers,
  FileText,
  Sliders,
  Database,
} from 'lucide-react';
import { useIDEStore } from '../../store/useIDEStore';

export interface CommandItem {
  id: string;
  title: string;
  category: string;
  shortcut?: string;
  icon: React.ReactNode;
  action: () => void;
}

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenQuickOpen: () => void;
  onOpenNewFile: () => void;
  onOpenNewFolder: () => void;
}

export default function CommandPalette({
  isOpen,
  onClose,
  onOpenQuickOpen,
  onOpenNewFile,
  onOpenNewFolder,
}: CommandPaletteProps) {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const {
    triggerExecution,
    setWorkspaceMode,
    setActiveBottomTab,
    setBottomPanelOpen,
    setActiveActivity,
    toggleSidebar,
    saveCurrentTab,
    setSplitEditor,
    splitEditor,
    closeAll,
    splitOrientation,
  } = useIDEStore();

  const commands: CommandItem[] = [
    {
      id: 'seam.run_autonomous',
      title: 'SEAM: Run Autonomous Lifecycle',
      category: 'Autonomous Agents',
      shortcut: 'F5',
      icon: <Play className="w-4 h-4 text-emerald-400" />,
      action: () => triggerExecution(true),
    },
    {
      id: 'seam.show_agents',
      title: 'SEAM: Show Autonomous Agent Stages',
      category: 'Autonomous Agents',
      icon: <Bot className="w-4 h-4 text-indigo-400" />,
      action: () => {
        setActiveActivity('agents');
      },
    },
    {
      id: 'seam.task_graph',
      title: 'SEAM: Open Autonomous Architecture & Task Graph',
      category: 'Autonomous Agents',
      icon: <Layers className="w-4 h-4 text-cyan-400" />,
      action: () => setWorkspaceMode('architecture'),
    },
    {
      id: 'seam.run_tests',
      title: 'SEAM: Run Automated QA & Test Suite',
      category: 'QA / Testing',
      icon: <CheckCircle2 className="w-4 h-4 text-emerald-400" />,
      action: () => setWorkspaceMode('tests'),
    },
    {
      id: 'seam.run_security',
      title: 'SEAM: Run Security / Cyber Analysis Scan',
      category: 'Security',
      icon: <ShieldCheck className="w-4 h-4 text-amber-400" />,
      action: () => setWorkspaceMode('qa'),
    },
    {
      id: 'seam.open_preview',
      title: 'SEAM: Open Live Application Preview',
      category: 'Deployment',
      icon: <Eye className="w-4 h-4 text-sky-400" />,
      action: () => setWorkspaceMode('preview'),
    },
    {
      id: 'seam.open_deployment',
      title: 'SEAM: View Docker Deployment & Container Health',
      category: 'Deployment',
      icon: <Server className="w-4 h-4 text-blue-400" />,
      action: () => {
        setActiveBottomTab('deployment');
        setBottomPanelOpen(true);
      },
    },
    {
      id: 'seam.open_memory',
      title: 'SEAM: Inspect Shared Organizational Memory (RAG + ChromaDB)',
      category: 'Memory',
      icon: <Database className="w-4 h-4 text-violet-400" />,
      action: () => {
        setActiveBottomTab('memory');
        setBottomPanelOpen(true);
      },
    },
    {
      id: 'file.quick_open',
      title: 'File: Quick Open File...',
      category: 'File',
      shortcut: 'Ctrl+P',
      icon: <Search className="w-4 h-4 text-slate-300" />,
      action: onOpenQuickOpen,
    },
    {
      id: 'file.new_file',
      title: 'File: New File',
      category: 'File',
      icon: <FilePlus className="w-4 h-4 text-slate-300" />,
      action: onOpenNewFile,
    },
    {
      id: 'file.new_folder',
      title: 'File: New Folder',
      category: 'File',
      icon: <FolderPlus className="w-4 h-4 text-slate-300" />,
      action: onOpenNewFolder,
    },
    {
      id: 'file.save',
      title: 'File: Save Current File',
      category: 'File',
      shortcut: 'Ctrl+S',
      icon: <Save className="w-4 h-4 text-slate-300" />,
      action: () => saveCurrentTab(),
    },
    {
      id: 'view.split_editor_horizontal',
      title: 'View: Split Editor Right (Side by Side)',
      category: 'View',
      icon: <Sliders className="w-4 h-4 text-slate-300" />,
      action: () => setSplitEditor(true, 'horizontal'),
    },
    {
      id: 'view.split_editor_vertical',
      title: 'View: Split Editor Down',
      category: 'View',
      icon: <Sliders className="w-4 h-4 text-slate-300" />,
      action: () => setSplitEditor(true, 'vertical'),
    },
    {
      id: 'view.toggle_split_editor',
      title: splitEditor ? 'View: Close Split Editor Group' : 'View: Toggle Split Editor',
      category: 'View',
      icon: <Sliders className="w-4 h-4 text-slate-300" />,
      action: () => setSplitEditor(!splitEditor, splitOrientation),
    },
    {
      id: 'view.close_all_editors',
      title: 'View: Close All Editors',
      category: 'View',
      icon: <FileText className="w-4 h-4 text-slate-300" />,
      action: () => closeAll(),
    },
    {
      id: 'view.toggle_terminal',
      title: 'View: Toggle Integrated Terminal',
      category: 'Terminal',
      shortcut: 'Ctrl+`',
      icon: <Terminal className="w-4 h-4 text-slate-300" />,
      action: () => {
        setActiveBottomTab('terminal');
        setBottomPanelOpen(true);
      },
    },
    {
      id: 'view.toggle_sidebar',
      title: 'View: Toggle Primary Sidebar',
      category: 'View',
      shortcut: 'Ctrl+B',
      icon: <Sliders className="w-4 h-4 text-slate-300" />,
      action: () => toggleSidebar(),
    },
    {
      id: 'view.diff',
      title: 'View: Open Monaco Diff Editor',
      category: 'View',
      icon: <GitCompare className="w-4 h-4 text-slate-300" />,
      action: () => setWorkspaceMode('diff'),
    },
  ];

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const filtered = commands.filter(cmd =>
    cmd.title.toLowerCase().includes(query.toLowerCase()) ||
    cmd.category.toLowerCase().includes(query.toLowerCase())
  );

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => (prev + 1) % (filtered.length || 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => (prev - 1 + (filtered.length || 1)) % (filtered.length || 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filtered[selectedIndex]) {
        filtered[selectedIndex].action();
        onClose();
      }
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-16 bg-black/60 backdrop-blur-xs select-none"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl bg-panel border border-border rounded-lg shadow-2xl overflow-hidden flex flex-col"
        onClick={e => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        <div className="flex items-center px-4 py-3 border-b border-border bg-background/50">
          <span className="text-accent font-bold mr-2 text-sm">&gt;</span>
          <input
            ref={inputRef}
            type="text"
            className="flex-1 bg-transparent text-primaryText text-sm outline-none placeholder:text-secondaryText/60"
            placeholder="Type a command or search actions... (e.g. run, test, preview, split)"
            value={query}
            onChange={e => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
          />
          <span className="text-xs text-secondaryText/50 font-code px-1.5 py-0.5 rounded bg-secondary">Esc</span>
        </div>

        <div className="max-h-96 overflow-y-auto py-1">
          {filtered.length === 0 ? (
            <div className="py-8 text-center text-xs text-secondaryText">No matching commands found</div>
          ) : (
            filtered.map((cmd, idx) => {
              const isSelected = idx === selectedIndex;
              return (
                <div
                  key={cmd.id}
                  onClick={() => {
                    cmd.action();
                    onClose();
                  }}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={`flex items-center justify-between px-4 py-2.5 cursor-pointer text-xs transition-colors ${
                    isSelected ? 'bg-accent/30 text-primaryText font-medium' : 'text-secondaryText hover:bg-secondary'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="shrink-0">{cmd.icon}</span>
                    <span className="text-primaryText truncate">{cmd.title}</span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 ml-4">
                    <span className="text-[10px] text-secondaryText/70 uppercase tracking-wider">{cmd.category}</span>
                    {cmd.shortcut && (
                      <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-secondary text-secondaryText border border-border/50">
                        {cmd.shortcut}
                      </span>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
