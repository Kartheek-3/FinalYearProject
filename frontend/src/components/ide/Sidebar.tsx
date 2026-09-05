import React, { useState, useEffect, useMemo } from 'react';
import { useIDEStore } from '../../store/useIDEStore';
import {
  ChevronRight,
  ChevronDown,
  FilePlus,
  FolderPlus,
  RefreshCw,
  Search,
  SlidersHorizontal,
  Star,
  Clock,
  Trash2,
  Edit2,
  Copy,
  ExternalLink,
  X,
  Sparkles,
  AlertCircle,
  GitBranch,
} from 'lucide-react';
import { api } from '../../services/api';
import { getFileIcon, getLanguageFromPath } from './FileIcons';
import clsx from 'clsx';

interface TreeNode {
  name: string;
  path: string;
  type: 'file' | 'directory';
  children: Record<string, TreeNode>;
}

interface ContextMenuState {
  x: number;
  y: number;
  targetPath: string;
  isFolder: boolean;
}

interface ModalPrompt {
  type: 'new_file' | 'new_folder' | 'rename' | 'delete';
  targetPath: string;
  isFolder?: boolean;
}

export default function Sidebar() {
  const { activeActivity, projectId, openTab, activeTabId, liveEvents, projectAggregate, closeTab } = useIDEStore();
  const [files, setFiles] = useState<string[]>([]);
  const [expanded, setExpanded] = useState<Set<string>>(new Set(['']));
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [pinnedFiles, setPinnedFiles] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem(`seam_pinned_${projectId}`);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });
  const [recentFiles, setRecentFiles] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem(`seam_recent_${projectId}`);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  // Inline rename / new item prompt state
  const [modalPrompt, setModalPrompt] = useState<ModalPrompt | null>(null);
  const [promptValue, setPromptValue] = useState('');
  const [promptError, setPromptError] = useState<string | null>(null);

  // Context Menu state
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);

  // Recently created / generated animation map (path -> timestamp)
  const [generatingFiles, setGeneratingFiles] = useState<Set<string>>(new Set());
  const [newlyCreatedFiles, setNewlyCreatedFiles] = useState<Set<string>>(new Set());

  // Drag & drop state
  const [draggedPath, setDraggedPath] = useState<string | null>(null);

  const fetchFiles = async () => {
    if (!projectId) return;
    setIsRefreshing(true);
    try {
      const data = await api.getFiles(projectId);
      setFiles(data);
    } catch (err) {
      console.error('Failed to fetch files:', err);
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchFiles();
  }, [projectId]);

  // Real-time synchronization on WebSocket events
  useEffect(() => {
    if (liveEvents.length > 0) {
      const lastEvent = liveEvents[liveEvents.length - 1];
      const type = lastEvent.event_type;

      if (type === 'task.started') {
        // Tag generating state
        const taskId = lastEvent.data?.task_id;
        if (taskId) {
          setGeneratingFiles(prev => new Set(prev).add(taskId));
        }
      }

      if (type === 'file.created') {
        const filePath = lastEvent.data?.path;
        if (filePath) {
          setNewlyCreatedFiles(prev => {
            const next = new Set(prev);
            next.add(filePath);
            return next;
          });
          // Auto-expand parent folders
          const parts = filePath.split('/');
          if (parts.length > 1) {
            setExpanded(prev => {
              const next = new Set(prev);
              let currentPath = '';
              for (let i = 0; i < parts.length - 1; i++) {
                currentPath = currentPath ? `${currentPath}/${parts[i]}` : parts[i];
                next.add(currentPath);
              }
              return next;
            });
          }
          setTimeout(() => {
            setNewlyCreatedFiles(prev => {
              const next = new Set(prev);
              next.delete(filePath);
              return next;
            });
          }, 3500);
        }
      }

      if (
        type.startsWith('task.') ||
        type.startsWith('agent.') ||
        type.startsWith('file.') ||
        type.startsWith('folder.') ||
        type.startsWith('docker.') ||
        type.startsWith('delivery.') ||
        type.startsWith('runtime.')
      ) {
        fetchFiles();
      }
    }
  }, [liveEvents]);

  // Save pinned and recent files to localStorage
  useEffect(() => {
    if (projectId) {
      localStorage.setItem(`seam_pinned_${projectId}`, JSON.stringify(pinnedFiles));
    }
  }, [pinnedFiles, projectId]);

  useEffect(() => {
    if (projectId) {
      localStorage.setItem(`seam_recent_${projectId}`, JSON.stringify(recentFiles));
    }
  }, [recentFiles, projectId]);

  // If no tab is open and files are available, open standard entrypoint
  useEffect(() => {
    if (files.length > 0 && useIDEStore.getState().tabs.length === 0) {
      const preferred =
        files.find(f => f === 'app.py' || f === 'main.py' || f === 'index.html') ||
        files.find(f => f.endsWith('app.py') || f.endsWith('main.py')) ||
        files.find(f => !f.startsWith('runtime/')) ||
        files[0];
      if (preferred) {
        handleFileClick(preferred);
      }
    }
  }, [files]);

  // Close context menu on outside click
  useEffect(() => {
    const handleClick = () => setContextMenu(null);
    window.addEventListener('click', handleClick);
    return () => window.removeEventListener('click', handleClick);
  }, []);

  const handleFileClick = async (path: string) => {
    if (!projectId) return;
    try {
      const data = await api.getFileContent(projectId, path);
      openTab({
        id: path,
        title: path.split('/').pop() || path,
        content: data.content,
        language: getLanguageFromPath(path)
      });
      // Add to recent files
      setRecentFiles(prev => [path, ...prev.filter(p => p !== path)].slice(0, 10));
    } catch (err) {
      console.error(`Failed to open file ${path}:`, err);
    }
  };

  const togglePin = (path: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setPinnedFiles(prev => 
      prev.includes(path) ? prev.filter(p => p !== path) : [...prev, path]
    );
  };

  // Build recursive tree from files list
  const tree: TreeNode = useMemo(() => {
    const root: TreeNode = { name: 'root', path: '', type: 'directory', children: {} };
    files.forEach(path => {
      const parts = path.split('/');
      let current = root;
      let currentPath = '';

      parts.forEach((part, index) => {
        const isFile = index === parts.length - 1;
        currentPath = currentPath ? `${currentPath}/${part}` : part;

        if (!current.children[part]) {
          current.children[part] = {
            name: part,
            path: currentPath,
            type: isFile ? 'file' : 'directory',
            children: {}
          };
        }
        current = current.children[part];
      });
    });
    return root;
  }, [files]);

  const toggleExpand = (path: string) => {
    setExpanded(prev => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
  };

  const collapseAll = () => {
    setExpanded(new Set(['']));
  };

  const handleContextMenu = (e: React.MouseEvent, path: string, isFolder: boolean) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({
      x: Math.min(e.clientX, window.innerWidth - 200),
      y: Math.min(e.clientY, window.innerHeight - 250),
      targetPath: path,
      isFolder
    });
  };

  const openPrompt = (type: ModalPrompt['type'], targetPath: string, isFolder: boolean = false) => {
    setContextMenu(null);
    setPromptError(null);
    setModalPrompt({ type, targetPath, isFolder });
    if (type === 'rename') {
      const currentName = targetPath.split('/').pop() || '';
      setPromptValue(currentName);
    } else {
      setPromptValue('');
    }
  };

  const executePrompt = async () => {
    if (!projectId || !modalPrompt) return;
    const { type, targetPath } = modalPrompt;
    const val = promptValue.trim();

    if (!val && type !== 'delete') {
      setPromptError('Name cannot be empty');
      return;
    }

    try {
      if (type === 'new_file') {
        const fullPath = targetPath ? `${targetPath}/${val}` : val;
        await api.createFile(projectId, fullPath, '');
        await fetchFiles();
        handleFileClick(fullPath);
      } else if (type === 'new_folder') {
        const fullPath = targetPath ? `${targetPath}/${val}` : val;
        await api.createFolder(projectId, fullPath);
        await fetchFiles();
        setExpanded(prev => new Set(prev).add(fullPath));
      } else if (type === 'rename') {
        const parent = targetPath.includes('/') ? targetPath.substring(0, targetPath.lastIndexOf('/')) : '';
        const newPath = parent ? `${parent}/${val}` : val;
        await api.renameItem(projectId, targetPath, newPath);
        // If tab was open, update tab
        const openTabs = useIDEStore.getState().tabs;
        const matchingTab = openTabs.find(t => t.id === targetPath);
        if (matchingTab) {
          closeTab(targetPath);
          handleFileClick(newPath);
        }
        await fetchFiles();
      } else if (type === 'delete') {
        await api.deleteItem(projectId, targetPath);
        closeTab(targetPath);
        await fetchFiles();
      }
      setModalPrompt(null);
    } catch (err: any) {
      setPromptError(err.message || 'Operation failed');
    }
  };

  // Drag and Drop move support
  const handleDragStart = (e: React.DragEvent, path: string) => {
    e.stopPropagation();
    setDraggedPath(path);
  };

  const handleDrop = async (e: React.DragEvent, destFolderPath: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (!draggedPath || !projectId) return;

    if (draggedPath === destFolderPath || destFolderPath.startsWith(draggedPath + '/')) {
      return; // Cannot drop into itself or parent
    }

    const itemName = draggedPath.split('/').pop() || '';
    const newPath = destFolderPath ? `${destFolderPath}/${itemName}` : itemName;

    try {
      await api.renameItem(projectId, draggedPath, newPath);
      await fetchFiles();
      setExpanded(prev => new Set(prev).add(destFolderPath));
    } catch (err) {
      console.error('Drag and drop move failed:', err);
    } finally {
      setDraggedPath(null);
    }
  };

  // Render tree nodes recursively
  const renderTree = (node: TreeNode, depth: number = 0): React.ReactNode => {
    const isExpanded = expanded.has(node.path);
    const isRoot = node.path === '';
    const isGenerating = generatingFiles.has(node.name);
    const isNewlyCreated = newlyCreatedFiles.has(node.path);
    const isActive = activeTabId === node.path;
    const isPinned = pinnedFiles.includes(node.path);

    // Search query filtering
    if (searchQuery && node.type === 'file') {
      if (!node.path.toLowerCase().includes(searchQuery.toLowerCase())) {
        return null;
      }
    }

    const sortedKeys = Object.keys(node.children).sort((a, b) => {
      const nodeA = node.children[a];
      const nodeB = node.children[b];
      if (nodeA.type === nodeB.type) return a.localeCompare(b);
      return nodeA.type === 'directory' ? -1 : 1;
    });

    return (
      <div key={node.path || 'root'} style={{ marginLeft: depth > 0 ? 10 : 0 }}>
        {!isRoot && (
          <div
            draggable
            onDragStart={e => handleDragStart(e, node.path)}
            onDragOver={e => node.type === 'directory' ? e.preventDefault() : undefined}
            onDrop={e => node.type === 'directory' ? handleDrop(e, node.path) : undefined}
            onContextMenu={e => handleContextMenu(e, node.path, node.type === 'directory')}
            onClick={() => node.type === 'directory' ? toggleExpand(node.path) : handleFileClick(node.path)}
            className={`flex items-center gap-1.5 py-1 px-2 rounded cursor-pointer text-sm group select-none transition-colors relative ${
              isActive 
                ? 'bg-accent/20 text-primaryText font-medium border-l-2 border-accent' 
                : isNewlyCreated 
                  ? 'bg-emerald-950/40 text-emerald-300 animate-pulse'
                  : 'hover:bg-secondary text-secondaryText hover:text-primaryText'
            }`}
          >
            {node.type === 'directory' ? (
              <>
                <span className="text-secondaryText/70 group-hover:text-primaryText">
                  {isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                </span>
                {getFileIcon(node.name, true, isExpanded)}
              </>
            ) : (
              <>
                <span className="w-3.5 h-3.5 shrink-0" />
                {getFileIcon(node.name, false, false)}
              </>
            )}

            <span className="truncate flex-1 font-mono text-xs">{node.name}</span>

            {/* Category tag for files */}
            {node.type === 'file' && (
              <span className={`text-[9px] uppercase px-1 py-0.2 rounded font-sans tracking-wide shrink-0 ${
                node.path.startsWith('planning/') ? 'text-purple-400 bg-purple-950/40' :
                node.path.startsWith('qa/') ? 'text-amber-400 bg-amber-950/40' :
                node.path.startsWith('runtime/') ? 'text-slate-400 bg-slate-800/40' :
                node.name === 'Dockerfile' || node.name.includes('config') || node.name.endsWith('.json') ? 'text-cyan-400 bg-cyan-950/40' :
                'text-emerald-400 bg-emerald-950/40'
              }`}>
                {node.path.startsWith('planning/') ? 'plan' :
                 node.path.startsWith('qa/') ? 'qa' :
                 node.path.startsWith('runtime/') ? 'runtime' :
                 node.name === 'Dockerfile' ? 'deploy' :
                 node.name.includes('config') || node.name.endsWith('.json') ? 'config' : 'src'}
              </span>
            )}

            {/* Status indicators */}
            {isGenerating && (
              <span className="flex items-center gap-1 text-[10px] text-amber-400 font-sans px-1 rounded bg-amber-950/50">
                <Sparkles className="w-2.5 h-2.5 animate-spin" /> generating
              </span>
            )}
            {isNewlyCreated && (
              <span className="text-[10px] text-emerald-400 font-sans px-1 rounded bg-emerald-950/60">
                new
              </span>
            )}

            {/* Pin star */}
            {node.type === 'file' && (
              <button
                onClick={e => togglePin(node.path, e)}
                className={`p-0.5 rounded opacity-0 group-hover:opacity-100 hover:text-yellow-400 transition-opacity ${
                  isPinned ? 'opacity-100 text-yellow-400' : 'text-secondaryText'
                }`}
                title={isPinned ? 'Unpin file' : 'Pin file'}
              >
                <Star className="w-3 h-3 fill-current" />
              </button>
            )}
          </div>
        )}

        {(isExpanded || isRoot || searchQuery !== '') && node.type === 'directory' && (
          <div>
            {sortedKeys.map(key => renderTree(node.children[key], depth + (isRoot ? 0 : 1)))}
          </div>
        )}
      </div>
    );
  };

  const renderExplorer = () => (
    <div className="flex flex-col h-full bg-panel text-primaryText select-none">
      {/* Explorer Action Bar Header */}
      <div className="px-3 py-2 border-b border-border/60 flex items-center justify-between">
        <span className="text-[11px] font-semibold tracking-wider text-secondaryText uppercase">
          Explorer
        </span>
        <div className="flex items-center space-x-1">
          <button
            onClick={() => openPrompt('new_file', '')}
            className="p-1 rounded hover:bg-secondary text-secondaryText hover:text-primaryText transition-colors"
            title="New File"
          >
            <FilePlus className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => openPrompt('new_folder', '')}
            className="p-1 rounded hover:bg-secondary text-secondaryText hover:text-primaryText transition-colors"
            title="New Folder"
          >
            <FolderPlus className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={fetchFiles}
            className={`p-1 rounded hover:bg-secondary text-secondaryText hover:text-primaryText transition-colors ${isRefreshing ? 'animate-spin' : ''}`}
            title="Refresh Explorer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={collapseAll}
            className="p-1 rounded hover:bg-secondary text-secondaryText hover:text-primaryText transition-colors"
            title="Collapse All"
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setIsSearching(!isSearching)}
            className={`p-1 rounded hover:bg-secondary transition-colors ${isSearching ? 'text-accent bg-secondary' : 'text-secondaryText hover:text-primaryText'}`}
            title="Filter Files"
          >
            <Search className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Optional Search Filter Bar */}
      {isSearching && (
        <div className="p-2 border-b border-border/40 bg-background/30 flex items-center gap-2">
          <Search className="w-3.5 h-3.5 text-secondaryText shrink-0" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Filter files..."
            className="w-full bg-transparent text-xs text-primaryText outline-none placeholder:text-secondaryText/60"
            autoFocus
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} className="text-secondaryText hover:text-primaryText">
              <X className="w-3 h-3" />
            </button>
          )}
        </div>
      )}

      {/* Project Root Banner */}
      <div className="px-3 py-1.5 bg-secondary/30 border-b border-border/40 flex items-center justify-between text-xs text-secondaryText">
        <span className="font-semibold text-primaryText truncate">
          {projectAggregate?.project_id || 'WORKSPACE'}
        </span>
        <span className="text-[10px] text-accent font-code">{files.length} files</span>
      </div>

      {/* Pinned Files Section */}
      {pinnedFiles.length > 0 && !searchQuery && (
        <div className="border-b border-border/40 pb-1">
          <div className="px-3 py-1 text-[10px] font-semibold text-secondaryText/80 flex items-center gap-1 uppercase tracking-wider">
            <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" /> Pinned
          </div>
          <div className="px-2">
            {pinnedFiles.map(pin => {
              const fileName = pin.split('/').pop() || pin;
              return (
                <div
                  key={pin}
                  onClick={() => handleFileClick(pin)}
                  className={`flex items-center gap-2 py-1 px-2 rounded cursor-pointer text-xs group ${
                    activeTabId === pin ? 'bg-accent/20 text-primaryText font-medium' : 'text-secondaryText hover:bg-secondary hover:text-primaryText'
                  }`}
                >
                  {getFileIcon(fileName, false, false)}
                  <span className="truncate flex-1 font-mono">{fileName}</span>
                  <button
                    onClick={e => togglePin(pin, e)}
                    className="opacity-0 group-hover:opacity-100 text-secondaryText hover:text-red-400"
                    title="Unpin"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* File Tree Area */}
      <div className="flex-1 overflow-y-auto px-2 py-1.5 scrollbar-hide">
        {files.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-6 text-center text-xs text-secondaryText/70 space-y-2">
            <AlertCircle className="w-6 h-6 text-secondaryText/40" />
            <p>No source files yet</p>
            <p className="text-[10px] opacity-70">Waiting for Coding Agent...</p>
          </div>
        ) : (
          renderTree(tree)
        )}
      </div>

      {/* Recent Files Section */}
      {recentFiles.length > 0 && !searchQuery && (
        <div className="border-t border-border/40 max-h-32 overflow-y-auto shrink-0 bg-background/20">
          <div className="px-3 py-1 text-[10px] font-semibold text-secondaryText/80 flex items-center gap-1 uppercase tracking-wider">
            <Clock className="w-3 h-3" /> Recent
          </div>
          <div className="px-2 pb-1">
            {recentFiles.slice(0, 4).map(rec => {
              const fileName = rec.split('/').pop() || rec;
              return (
                <div
                  key={rec}
                  onClick={() => handleFileClick(rec)}
                  className="flex items-center gap-2 py-0.5 px-2 rounded cursor-pointer text-xs text-secondaryText hover:bg-secondary hover:text-primaryText"
                >
                  {getFileIcon(fileName, false, false)}
                  <span className="truncate font-mono">{fileName}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Context Menu Modal / Overlay */}
      {contextMenu && (
        <div
          style={{ top: contextMenu.y, left: contextMenu.x }}
          className="fixed z-50 w-48 bg-panel border border-border shadow-2xl rounded-md py-1 text-xs text-primaryText"
          onClick={e => e.stopPropagation()}
        >
          {contextMenu.isFolder ? (
            <>
              <button
                onClick={() => openPrompt('new_file', contextMenu.targetPath)}
                className="w-full text-left px-3 py-1.5 hover:bg-secondary flex items-center gap-2"
              >
                <FilePlus className="w-3.5 h-3.5 text-accent" /> New File...
              </button>
              <button
                onClick={() => openPrompt('new_folder', contextMenu.targetPath)}
                className="w-full text-left px-3 py-1.5 hover:bg-secondary flex items-center gap-2"
              >
                <FolderPlus className="w-3.5 h-3.5 text-accent" /> New Folder...
              </button>
              <div className="h-px bg-border my-1" />
              <button
                onClick={() => openPrompt('rename', contextMenu.targetPath, true)}
                className="w-full text-left px-3 py-1.5 hover:bg-secondary flex items-center gap-2"
              >
                <Edit2 className="w-3.5 h-3.5" /> Rename...
              </button>
              <button
                onClick={() => openPrompt('delete', contextMenu.targetPath, true)}
                className="w-full text-left px-3 py-1.5 hover:bg-red-950/50 text-red-400 flex items-center gap-2"
              >
                <Trash2 className="w-3.5 h-3.5" /> Delete Folder
              </button>
              <div className="h-px bg-border my-1" />
              <button
                onClick={() => {
                  navigator.clipboard.writeText(contextMenu.targetPath);
                  setContextMenu(null);
                }}
                className="w-full text-left px-3 py-1.5 hover:bg-secondary flex items-center gap-2 text-secondaryText"
              >
                <Copy className="w-3.5 h-3.5" /> Copy Path
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => {
                  handleFileClick(contextMenu.targetPath);
                  setContextMenu(null);
                }}
                className="w-full text-left px-3 py-1.5 hover:bg-secondary flex items-center gap-2"
              >
                <ExternalLink className="w-3.5 h-3.5" /> Open
              </button>
              <button
                onClick={() => openPrompt('rename', contextMenu.targetPath, false)}
                className="w-full text-left px-3 py-1.5 hover:bg-secondary flex items-center gap-2"
              >
                <Edit2 className="w-3.5 h-3.5" /> Rename...
              </button>
              <button
                onClick={() => openPrompt('delete', contextMenu.targetPath, false)}
                className="w-full text-left px-3 py-1.5 hover:bg-red-950/50 text-red-400 flex items-center gap-2"
              >
                <Trash2 className="w-3.5 h-3.5" /> Delete File
              </button>
              <div className="h-px bg-border my-1" />
              <button
                onClick={() => {
                  navigator.clipboard.writeText(contextMenu.targetPath);
                  setContextMenu(null);
                }}
                className="w-full text-left px-3 py-1.5 hover:bg-secondary flex items-center gap-2 text-secondaryText"
              >
                <Copy className="w-3.5 h-3.5" /> Copy Path
              </button>
            </>
          )}
        </div>
      )}

      {/* Operation Prompt Modal (Create / Rename / Delete Confirmation) */}
      {modalPrompt && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4"
          onClick={() => setModalPrompt(null)}
        >
          <div 
            className="w-full max-w-sm bg-panel border border-border rounded-lg shadow-2xl p-4 flex flex-col space-y-3"
            onClick={e => e.stopPropagation()}
          >
            <h3 className="text-sm font-semibold text-primaryText capitalize">
              {modalPrompt.type === 'new_file' && 'Create New File'}
              {modalPrompt.type === 'new_folder' && 'Create New Folder'}
              {modalPrompt.type === 'rename' && `Rename ${modalPrompt.isFolder ? 'Folder' : 'File'}`}
              {modalPrompt.type === 'delete' && `Delete ${modalPrompt.isFolder ? 'Folder' : 'File'}`}
            </h3>

            {modalPrompt.type === 'delete' ? (
              <p className="text-xs text-secondaryText leading-relaxed">
                Are you sure you want to permanently delete{' '}
                <span className="font-mono text-primaryText font-medium">{modalPrompt.targetPath}</span>?
                {modalPrompt.isFolder && ' This will recursively delete all contents inside.'}
              </p>
            ) : (
              <div>
                <input
                  type="text"
                  value={promptValue}
                  onChange={e => {
                    setPromptValue(e.target.value);
                    setPromptError(null);
                  }}
                  onKeyDown={e => {
                    if (e.key === 'Enter') executePrompt();
                    if (e.key === 'Escape') setModalPrompt(null);
                  }}
                  placeholder={modalPrompt.type === 'new_file' ? 'filename.ts' : 'folder_name'}
                  className="w-full bg-background border border-border rounded px-3 py-1.5 text-xs text-primaryText outline-none focus:border-accent"
                  autoFocus
                />
                {modalPrompt.targetPath && (
                  <span className="text-[10px] text-secondaryText/70 mt-1 block">
                    Inside: <span className="font-mono">{modalPrompt.targetPath}</span>
                  </span>
                )}
              </div>
            )}

            {promptError && (
              <div className="text-xs text-red-400">{promptError}</div>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setModalPrompt(null)}
                className="px-3 py-1 rounded bg-secondary text-secondaryText hover:text-primaryText text-xs"
              >
                Cancel
              </button>
              <button
                onClick={executePrompt}
                className={`px-3 py-1 rounded text-xs text-white font-medium ${
                  modalPrompt.type === 'delete' ? 'bg-red-600 hover:bg-red-700' : 'bg-accent hover:bg-accent/80'
                }`}
              >
                {modalPrompt.type === 'delete' ? 'Delete' : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  const [globalSearchTerm, setGlobalSearchTerm] = useState('');
  const [globalSearchResults, setGlobalSearchResults] = useState<Array<{ path: string; line_number: number; line_content: string }>>([]);
  const [isGlobalSearching, setIsGlobalSearching] = useState(false);
  const [caseSensitiveSearch, setCaseSensitiveSearch] = useState(false);

  const handleGlobalSearch = async (term: string) => {
    setGlobalSearchTerm(term);
    if (!term || !projectId) {
      setGlobalSearchResults([]);
      return;
    }
    setIsGlobalSearching(true);
    try {
      const results = await api.searchFiles(projectId, term, caseSensitiveSearch);
      setGlobalSearchResults(results);
    } catch {
      setGlobalSearchResults([]);
    } finally {
      setIsGlobalSearching(false);
    }
  };

  const renderSearch = () => (
    <div className="flex flex-col h-full overflow-hidden text-xs">
      <div className="p-3 border-b border-border bg-panel">
        <div className="font-semibold text-primaryText uppercase tracking-wider mb-2 text-[11px]">Search in Workspace</div>
        <div className="flex items-center bg-background border border-border rounded px-2.5 py-1.5 focus-within:border-accent">
          <Search className="w-3.5 h-3.5 text-secondaryText mr-2 shrink-0" />
          <input
            type="text"
            className="bg-transparent text-primaryText text-xs outline-none flex-1 placeholder:text-secondaryText/60"
            placeholder="Search text in project..."
            value={globalSearchTerm}
            onChange={(e) => handleGlobalSearch(e.target.value)}
          />
          <button
            onClick={() => {
              setCaseSensitiveSearch(!caseSensitiveSearch);
              handleGlobalSearch(globalSearchTerm);
            }}
            className={clsx(
              "text-[10px] px-1 rounded font-mono transition-colors",
              caseSensitiveSearch ? "bg-accent text-white" : "text-secondaryText hover:text-primaryText"
            )}
            title="Match Case"
          >
            Aa
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-2">
        {isGlobalSearching ? (
          <div className="p-4 text-center text-secondaryText italic">Searching workspace files...</div>
        ) : globalSearchResults.length === 0 ? (
          <div className="p-4 text-center text-secondaryText italic">
            {globalSearchTerm ? 'No search results found' : 'Type a query to search all project files'}
          </div>
        ) : (
          <div className="space-y-1">
            <div className="text-[10px] text-secondaryText/80 font-mono px-2 mb-1">
              {globalSearchResults.length} result{globalSearchResults.length > 1 ? 's' : ''}
            </div>
            {globalSearchResults.map((res, idx) => (
              <div
                key={idx}
                onClick={() => handleFileClick(res.path)}
                className="p-2 rounded hover:bg-secondary cursor-pointer transition-colors border border-transparent hover:border-border/60"
              >
                <div className="flex items-center justify-between text-[11px] mb-0.5">
                  <span className="font-mono text-accent truncate">{res.path}</span>
                  <span className="text-[10px] text-secondaryText font-mono">L{res.line_number}</span>
                </div>
                <div className="font-mono text-[11px] text-slate-300 truncate bg-background/60 px-1.5 py-0.5 rounded">
                  {res.line_content}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );

  const renderSourceControl = () => {
    const generatedSourceFiles = files.filter(f => !f.startsWith('runtime/') && !f.startsWith('planning/'));
    return (
      <div className="flex flex-col h-full p-3 text-xs overflow-y-auto">
        <div className="flex items-center justify-between mb-2">
          <div className="font-semibold text-primaryText uppercase tracking-wider text-[11px] flex items-center gap-1.5">
            <GitBranch className="w-3.5 h-3.5 text-accent" />
            <span>Source Control</span>
          </div>
          <span className="text-[10px] bg-secondary text-secondaryText px-1.5 py-0.5 rounded font-mono">
            {generatedSourceFiles.length} files
          </span>
        </div>

        <div className="text-secondaryText text-[11px] mb-3">
          Local git tracking inside project sandbox (<span className="font-mono text-primaryText">main</span>)
        </div>

        <div className="text-[10px] uppercase font-semibold text-secondaryText/80 mb-1">Generated / Modified Files</div>
        <div className="space-y-1">
          {generatedSourceFiles.map(filePath => (
            <div
              key={filePath}
              onClick={() => handleFileClick(filePath)}
              className="flex items-center justify-between px-2 py-1.5 rounded hover:bg-secondary cursor-pointer text-[11px]"
            >
              <span className="font-mono text-primaryText truncate">{filePath}</span>
              <span className="font-mono text-emerald-400 text-[10px] bg-emerald-950/60 px-1.5 rounded">
                GEN
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderAgents = () => (
    <div className="flex flex-col h-full p-4 text-xs text-secondaryText space-y-4 overflow-y-auto">
      <div>
        <div className="font-semibold text-primaryText uppercase tracking-wider mb-1">Autonomous Agent Fleet</div>
        <p className="opacity-80">Six specialized agents collaborating over versioned contracts.</p>
      </div>

      <div className="space-y-2">
        <div className="p-2.5 rounded bg-panel border border-border">
          <div className="font-semibold text-primaryText">Analysis Agent</div>
          <div className="text-[11px] text-secondaryText mt-0.5">Requirements parsing and specification.</div>
        </div>
        <div className="p-2.5 rounded bg-panel border border-border">
          <div className="font-semibold text-primaryText">Planning & Design Agent</div>
          <div className="text-[11px] text-secondaryText mt-0.5">Architecture blueprints, database schema, task graph.</div>
        </div>
        <div className="p-2.5 rounded bg-panel border border-border">
          <div className="font-semibold text-primaryText">Supervisor Engine</div>
          <div className="text-[11px] text-secondaryText mt-0.5">Adaptive orchestration brain and task dispatcher.</div>
        </div>
        <div className="p-2.5 rounded bg-panel border border-border">
          <div className="font-semibold text-primaryText">Coding Agent</div>
          <div className="text-[11px] text-secondaryText mt-0.5">AST-validated atomic code generation.</div>
        </div>
        <div className="p-2.5 rounded bg-panel border border-border">
          <div className="font-semibold text-primaryText">QA Agent</div>
          <div className="text-[11px] text-secondaryText mt-0.5">Automated test runners and static security analysis.</div>
        </div>
        <div className="p-2.5 rounded bg-panel border border-border">
          <div className="font-semibold text-primaryText">Delivery Agent</div>
          <div className="text-[11px] text-secondaryText mt-0.5">Dockerfile packaging and Docker container deployment.</div>
        </div>
      </div>
    </div>
  );

  const renderMCP = () => (
    <div className="flex flex-col h-full p-4 text-xs text-secondaryText space-y-3 overflow-y-auto">
      <div>
        <div className="font-semibold text-primaryText uppercase tracking-wider mb-1">MCP Tooling</div>
        <p className="opacity-80">Model Context Protocol connectors active for local workspace operations.</p>
      </div>
      <div className="p-2.5 rounded bg-panel border border-border">
        <div className="font-semibold text-primaryText">Filesystem Tool</div>
        <div className="text-[11px] text-emerald-400 mt-0.5">Active • Read / Write / List</div>
      </div>
      <div className="p-2.5 rounded bg-panel border border-border">
        <div className="font-semibold text-primaryText">Docker Deployment Tool</div>
        <div className="text-[11px] text-emerald-400 mt-0.5">Active • Build / Run / Health</div>
      </div>
    </div>
  );

  const renderSettings = () => (
    <div className="flex flex-col h-full p-4 text-xs text-secondaryText space-y-4 overflow-y-auto">
      <div>
        <div className="font-semibold text-primaryText uppercase tracking-wider mb-1">Workspace Settings</div>
        <p className="opacity-80">Editor, Terminal, and Autonomy preferences.</p>
      </div>
      <div className="space-y-3">
        <div className="p-2.5 rounded bg-panel border border-border">
          <div className="font-semibold text-primaryText">Minimap</div>
          <div className="text-[11px] text-secondaryText mt-0.5">Enabled for primary editor window.</div>
        </div>
        <div className="p-2.5 rounded bg-panel border border-border">
          <div className="font-semibold text-primaryText">Format on Save</div>
          <div className="text-[11px] text-secondaryText mt-0.5">Enabled (Ctrl+S).</div>
        </div>
        <div className="p-2.5 rounded bg-panel border border-border">
          <div className="font-semibold text-primaryText">Sandboxed Terminal Shell</div>
          <div className="text-[11px] text-secondaryText mt-0.5">Subprocess PTY scoped to project folder.</div>
        </div>
      </div>
    </div>
  );

  const renderExtensions = () => (
    <div className="flex flex-col h-full p-4 text-xs text-secondaryText space-y-3 overflow-y-auto">
      <div>
        <div className="font-semibold text-primaryText uppercase tracking-wider mb-1">Installed Capabilities</div>
        <p className="opacity-80">SEAM Native multi-agent software engineering bundle.</p>
      </div>
      <div className="p-2.5 rounded bg-panel border border-border">
        <div className="font-semibold text-primaryText">Monaco Code Editor</div>
        <div className="text-[11px] text-secondaryText mt-0.5">Syntax highlighting, diffs, breadcrumbs.</div>
      </div>
      <div className="p-2.5 rounded bg-panel border border-border">
        <div className="font-semibold text-primaryText">XTerm.js Terminal</div>
        <div className="text-[11px] text-secondaryText mt-0.5">Bidirectional interactive shell runtime.</div>
      </div>
      <div className="p-2.5 rounded bg-panel border border-border">
        <div className="font-semibold text-primaryText">ChromaDB RAG Memory</div>
        <div className="text-[11px] text-secondaryText mt-0.5">Shared organizational cross-project intelligence.</div>
      </div>
    </div>
  );

  const contentMap: Record<string, () => React.ReactNode> = {
    explorer: renderExplorer,
    search: renderSearch,
    source_control: renderSourceControl,
    agents: renderAgents,
    mcp: renderMCP,
    settings: renderSettings,
    extensions: renderExtensions,
  };

  const renderContent = contentMap[activeActivity] || renderExplorer;

  return (
    <div className="flex-1 overflow-hidden h-full flex flex-col">
      {renderContent()}
    </div>
  );
}
