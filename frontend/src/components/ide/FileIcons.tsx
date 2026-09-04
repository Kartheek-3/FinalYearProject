import React from 'react';
import {
  FileCode,
  FileText,
  FileJson,
  FileSpreadsheet,
  FileCode2,
  Folder,
  FolderOpen,
  Box,
  Settings,
  Terminal,
  Globe,
  Database,
  Lock,
  Layers,
  File,
} from 'lucide-react';

export function getFileIcon(filename: string, isDirectory: boolean = false, isExpanded: boolean = false): React.ReactNode {
  if (isDirectory) {
    return isExpanded ? (
      <FolderOpen className="w-4 h-4 text-accent shrink-0" />
    ) : (
      <Folder className="w-4 h-4 text-accent/80 shrink-0" />
    );
  }

  const lower = filename.toLowerCase();

  // Special named files
  if (lower === 'dockerfile' || lower.endsWith('.dockerfile')) {
    return <Box className="w-4 h-4 text-sky-400 shrink-0" />;
  }
  if (lower === 'package.json' || lower === 'package-lock.json' || lower === 'tsconfig.json') {
    return <Settings className="w-4 h-4 text-emerald-400 shrink-0" />;
  }
  if (lower.startsWith('.env')) {
    return <Lock className="w-4 h-4 text-amber-400 shrink-0" />;
  }
  if (lower.endsWith('.gitignore') || lower.endsWith('.dockerignore')) {
    return <Settings className="w-4 h-4 text-gray-400 shrink-0" />;
  }
  if (lower === 'readme.md') {
    return <FileText className="w-4 h-4 text-blue-400 shrink-0" />;
  }

  // Extensions
  const ext = lower.split('.').pop() || '';

  switch (ext) {
    case 'ts':
      return <span className="w-4 h-4 flex items-center justify-center font-bold text-[10px] text-blue-400 bg-blue-900/40 rounded shrink-0">TS</span>;
    case 'tsx':
      return <span className="w-4 h-4 flex items-center justify-center font-bold text-[10px] text-cyan-300 bg-cyan-900/40 rounded shrink-0">⚛</span>;
    case 'js':
      return <span className="w-4 h-4 flex items-center justify-center font-bold text-[10px] text-yellow-300 bg-yellow-900/40 rounded shrink-0">JS</span>;
    case 'jsx':
      return <span className="w-4 h-4 flex items-center justify-center font-bold text-[10px] text-cyan-400 bg-cyan-900/40 rounded shrink-0">⚛</span>;
    case 'py':
      return <FileCode2 className="w-4 h-4 text-amber-300 shrink-0" />;
    case 'java':
      return <FileCode className="w-4 h-4 text-orange-400 shrink-0" />;
    case 'json':
      return <FileJson className="w-4 h-4 text-yellow-400 shrink-0" />;
    case 'yaml':
    case 'yml':
      return <Layers className="w-4 h-4 text-purple-400 shrink-0" />;
    case 'md':
      return <FileText className="w-4 h-4 text-sky-300 shrink-0" />;
    case 'css':
    case 'scss':
    case 'sass':
      return <FileCode className="w-4 h-4 text-pink-400 shrink-0" />;
    case 'html':
      return <Globe className="w-4 h-4 text-orange-500 shrink-0" />;
    case 'sql':
      return <Database className="w-4 h-4 text-emerald-400 shrink-0" />;
    case 'sh':
    case 'bash':
    case 'zsh':
      return <Terminal className="w-4 h-4 text-green-400 shrink-0" />;
    case 'csv':
      return <FileSpreadsheet className="w-4 h-4 text-green-300 shrink-0" />;
    default:
      return <File className="w-4 h-4 text-secondaryText shrink-0" />;
  }
}

export function getLanguageFromPath(path: string): string {
  const lower = path.toLowerCase();
  const ext = lower.split('.').pop() || '';
  switch (ext) {
    case 'ts':
    case 'tsx':
      return 'typescript';
    case 'js':
    case 'jsx':
      return 'javascript';
    case 'py':
      return 'python';
    case 'java':
      return 'java';
    case 'json':
      return 'json';
    case 'yaml':
    case 'yml':
      return 'yaml';
    case 'md':
      return 'markdown';
    case 'css':
      return 'css';
    case 'html':
      return 'html';
    case 'sql':
      return 'sql';
    case 'sh':
      return 'shell';
    case 'dockerfile':
      return 'dockerfile';
    default:
      if (lower.endsWith('dockerfile')) return 'dockerfile';
      return 'plaintext';
  }
}
