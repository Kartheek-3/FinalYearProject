import React, { useEffect, useState } from 'react';
import { useIDEStore } from '../../store/useIDEStore';
import { ChevronRight, ChevronDown, FileCode, Folder, FolderOpen } from 'lucide-react';
import { api } from '../../services/api';

interface TreeNode {
  name: string;
  path: string;
  type: 'file' | 'directory';
  children: Record<string, TreeNode>;
}

export default function Sidebar() {
  const { activeActivity, projectId, openTab, liveEvents } = useIDEStore();
  const [files, setFiles] = useState<string[]>([]);
  const [expanded, setExpanded] = useState<Set<string>>(new Set(['']));

  const fetchFiles = async () => {
    if (!projectId) return;
    try {
      const data = await api.getFiles(projectId);
      setFiles(data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchFiles();
  }, [projectId]);

  useEffect(() => {
    if (liveEvents.length > 0) {
      const lastEvent = liveEvents[liveEvents.length - 1];
      if (lastEvent.event_type.startsWith('task.completed') || lastEvent.event_type.startsWith('agent.completed')) {
        fetchFiles();
      }
    }
  }, [liveEvents]);

  const handleFileClick = async (path: string) => {
    if (!projectId) return;
    try {
      const data = await api.getFileContent(projectId, path);
      openTab({
        id: path,
        title: path.split('/').pop() || path,
        content: data.content,
        language: path.endsWith('.py') ? 'python' : path.endsWith('.ts') ? 'typescript' : path.endsWith('.tsx') ? 'typescript' : path.endsWith('.md') ? 'markdown' : 'plaintext'
      });
    } catch (err) {
      console.error(err);
    }
  };

  const tree: TreeNode = { name: 'root', path: '', type: 'directory', children: {} };
  
  files.forEach(path => {
    const parts = path.split('/');
    let current = tree;
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

  const toggleExpand = (path: string) => {
    setExpanded(prev => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
  };

  const renderTree = (node: TreeNode, depth: number = 0) => {
    const isExpanded = expanded.has(node.path);
    const sortedKeys = Object.keys(node.children).sort((a, b) => {
      const nodeA = node.children[a];
      const nodeB = node.children[b];
      if (nodeA.type === nodeB.type) return a.localeCompare(b);
      return nodeA.type === 'directory' ? -1 : 1;
    });

    return (
      <div key={node.path} style={{ marginLeft: depth > 0 ? 12 : 0 }}>
        {node.path !== '' && (
          <div 
            className="flex items-center gap-1.5 py-1 px-2 hover:bg-secondary rounded cursor-pointer text-sm group"
            onClick={() => node.type === 'directory' ? toggleExpand(node.path) : handleFileClick(node.path)}
          >
            {node.type === 'directory' ? (
              <>
                {isExpanded ? <ChevronDown className="w-4 h-4 text-secondaryText" /> : <ChevronRight className="w-4 h-4 text-secondaryText" />}
                <FolderOpen className="w-4 h-4 text-accent" />
              </>
            ) : (
              <>
                <FileCode className="w-4 h-4 text-secondaryText group-hover:text-primaryText" />
              </>
            )}
            <span className={node.type === 'file' ? 'text-secondaryText group-hover:text-primaryText' : 'text-primaryText'}>{node.name}</span>
          </div>
        )}
        
        {(isExpanded || node.path === '') && node.type === 'directory' && (
          <div>
            {sortedKeys.map(key => renderTree(node.children[key], depth + (node.path === '' ? 0 : 1)))}
          </div>
        )}
      </div>
    );
  };

  const renderExplorer = () => (
    <div className="flex flex-col h-full">
      <div className="px-4 py-2 text-xs font-semibold tracking-wider text-secondaryText uppercase">
        Explorer
      </div>
      <div className="flex-1 overflow-y-auto px-2">
        {files.length === 0 ? (
          <div className="text-xs text-secondaryText p-2 text-center opacity-70">No files generated yet.</div>
        ) : (
          renderTree(tree)
        )}
      </div>
    </div>
  );

  const renderAgents = () => (
    <div className="flex flex-col h-full">
      <div className="px-4 py-2 text-xs font-semibold tracking-wider text-secondaryText uppercase">
        Agents
      </div>
      <div className="p-4 text-sm text-secondaryText text-center">
        Agent manager view goes here.
      </div>
    </div>
  );

  const renderMCP = () => (
    <div className="flex flex-col h-full">
      <div className="px-4 py-2 text-xs font-semibold tracking-wider text-secondaryText uppercase">
        MCP Connectors
      </div>
      <div className="p-4 text-sm text-secondaryText text-center">
        MCP Servers view goes here.
      </div>
    </div>
  );

  const contentMap: Record<string, () => React.ReactNode> = {
    explorer: renderExplorer,
    agents: renderAgents,
    mcp: renderMCP,
  };

  const renderContent = contentMap[activeActivity] || (() => (
    <div className="p-4 text-sm text-secondaryText text-center">
      Content for {activeActivity}
    </div>
  ));

  return (
    <div className="flex-1 overflow-hidden">
      {renderContent()}
    </div>
  );
}
