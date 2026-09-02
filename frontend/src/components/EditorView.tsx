import React, { useEffect, useState } from 'react';

interface EditorViewProps {
  projectId: string;
  filePath: string | null;
}

export default function EditorView({ projectId, filePath }: EditorViewProps) {
  const [content, setContent] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!filePath) {
      setContent('');
      setError(null);
      return;
    }

    let mounted = true;
    const fetchFileContent = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(`http://localhost:8000/projects/${projectId}/files/${filePath}`);
        if (response.ok && mounted) {
          const data = await response.json();
          setContent(data.content);
        } else if (mounted) {
          setError(`Failed to load file: ${response.statusText}`);
        }
      } catch (err) {
        if (mounted) setError(`Error fetching file: ${err}`);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    fetchFileContent();
  }, [projectId, filePath]);

  if (!filePath) {
    return (
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#666', backgroundColor: '#1e1e1e' }}>
        <p>Select a file to view its contents</p>
      </div>
    );
  }

  const isJson = filePath.endsWith('.json');

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', backgroundColor: '#1e1e1e', overflow: 'hidden' }}>
      <div style={{ 
        backgroundColor: '#2d2d2d', 
        padding: '8px 15px', 
        color: '#d4d4d4',
        fontSize: '13px',
        borderBottom: '1px solid #111',
        display: 'flex',
        alignItems: 'center'
      }}>
        <span style={{ marginRight: 8 }}>📄</span> {filePath}
      </div>
      
      <div style={{ flex: 1, overflow: 'auto', padding: '15px' }}>
        {loading ? (
          <div style={{ color: '#888' }}>Loading...</div>
        ) : error ? (
          <div style={{ color: '#f48771' }}>{error}</div>
        ) : (
          <pre style={{ 
            margin: 0, 
            color: isJson ? '#ce9178' : '#9cdcfe', 
            fontFamily: 'Consolas, "Courier New", monospace',
            fontSize: '14px',
            whiteSpace: 'pre-wrap'
          }}>
            {content}
          </pre>
        )}
      </div>
    </div>
  );
}
