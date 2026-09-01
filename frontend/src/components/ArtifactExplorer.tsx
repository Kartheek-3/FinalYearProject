import { FileCode, FileJson, FileText, ChevronRight, ChevronDown } from 'lucide-react';
import type { ProjectAggregate } from '../types/api';
import { useState } from 'react';

interface Props {
  project: ProjectAggregate;
}

export default function ArtifactExplorer({ project }: Props) {
  const artifacts = project.generated_artifacts || [];
  const [expanded, setExpanded] = useState<Record<string, boolean>>({'root': true});

  const toggle = (folder: string) => {
    setExpanded(prev => ({ ...prev, [folder]: !prev[folder] }));
  };

  if (artifacts.length === 0) {
    return <div className="p-4 text-secondary">No artifacts generated yet.</div>;
  }

  // Create a naive flat-tree UI mapping
  // Since artifacts don't strictly have folder structures returned (just locations),
  // we will list them with file icons.

  const getIcon = (type: string) => {
    if (type.includes('code') || type.includes('python')) return <FileCode size={14} style={{ color: '#569cd6' }} />;
    if (type.includes('json') || type.includes('yaml')) return <FileJson size={14} style={{ color: '#ce9178' }} />;
    return <FileText size={14} style={{ color: '#d4d4d4' }} />;
  };

  return (
    <div className="p-4">
      <div className="tree-node" onClick={() => toggle('root')} style={{ fontWeight: 600 }}>
        {expanded['root'] ? <ChevronDown size={14} className="mr-1" /> : <ChevronRight size={14} className="mr-1" />}
        <span>{project.project_id}</span>
      </div>
      
      {expanded['root'] && artifacts.map((art: any, idx: number) => (
        <div key={idx} className="tree-node" style={{ paddingLeft: '20px' }}>
          <span className="tree-indent" />
          {getIcon(art.artifact_type)}
          <span className="ml-2" style={{ marginLeft: '6px' }}>{art.location.split('/').pop() || art.artifact_id}</span>
          <span className="text-secondary ml-2" style={{ marginLeft: '12px', fontSize: '10px' }}>[{art.producer}]</span>
        </div>
      ))}
    </div>
  );
}
