import { useEffect, useState } from 'react';
import { RuntimeEvent } from '../types/api';

interface FileExplorerProps {
  projectId: string;
  onFileSelect: (path: string) => void;
  selectedFile: string | null;
  liveEvents: RuntimeEvent[];
}

interface TreeNode {
  name: string;
  path: string;
  type: 'file' | 'directory';
  children: Record<string, TreeNode>;
}

export default function FileExplorer({ projectId, onFileSelect, selectedFile, liveEvents }: FileExplorerProps) {
  const [files, setFiles] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState<Set<string>>(new Set(['planning', 'src']));

  const fetchFiles = async () => {
    setLoading(true);
    try {
      const response = await fetch(`http://localhost:8000/projects/${projectId}/files`);
      if (response.ok) {
        const data = await response.json();
        setFiles(data);
      }
    } catch (err) {
      console.error("Failed to fetch files", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFiles();
  }, [projectId]);

  useEffect(() => {
    if (liveEvents.length > 0) {
      const lastEvent = liveEvents[liveEvents.length - 1];
      if (lastEvent.event_type.startsWith('file.') || lastEvent.event_type.startsWith('folder.')) {
        fetchFiles();
      }
    }
  }, [liveEvents]);

  // Build tree
  const tree: TreeNode = { name: 'root', path: '', type: 'directory', children: {} };
  
  files.forEach(path => {
    const parts = path.split('/');
    let current = tree;
    let currentPath = '';
    
    parts.forEach((part, index) => {
      // Check if it's the last part AND if it looks like a file extension, or just assume leaf is file
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
            className={`file-item ${node.type} ${selectedFile === node.path ? 'selected' : ''}`}
            onClick={() => node.type === 'directory' ? toggleExpand(node.path) : onFileSelect(node.path)}
            style={{ 
              padding: '4px 8px', 
              cursor: 'pointer', 
              display: 'flex',
              alignItems: 'center',
              backgroundColor: selectedFile === node.path ? 'rgba(0, 122, 204, 0.3)' : 'transparent',
              color: '#d4d4d4',
              fontSize: '13px'
            }}
          >
            <span style={{ marginRight: 6, display: 'inline-block', width: 12 }}>
              {node.type === 'directory' ? (isExpanded ? '▼' : '▶') : '📄'}
            </span>
            {node.name}
          </div>
        )}
        
        {isExpanded && node.type === 'directory' && (
          <div>
            {sortedKeys.map(key => renderTree(node.children[key], depth + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="file-explorer" style={{ width: '250px', borderRight: '1px solid #333', backgroundColor: '#252526', overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
      <div style={{ padding: '10px 15px', textTransform: 'uppercase', fontSize: '11px', fontWeight: 'bold', color: '#ccc', letterSpacing: '0.5px' }}>
        Project Explorer
      </div>
      
      {loading && files.length === 0 ? (
        <div style={{ padding: 15, color: '#888', fontSize: 12 }}>Loading files...</div>
      ) : files.length === 0 ? (
        <div style={{ padding: 15, color: '#888', fontSize: 12 }}>No files generated yet.</div>
      ) : (
        <div style={{ paddingTop: 5, flex: 1 }}>
          {Object.keys(tree.children).map(key => renderTree(tree.children[key]))}
        </div>
      )}
    </div>
  );
}
