import React, { useEffect, useState, useRef } from 'react';
import { Search } from 'lucide-react';
import { getFileIcon } from './FileIcons';

interface QuickOpenProps {
  isOpen: boolean;
  onClose: () => void;
  files: string[];
  onSelectFile: (path: string) => void;
}

export default function QuickOpen({ isOpen, onClose, files, onSelectFile }: QuickOpenProps) {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const filtered = files
    .filter(f => f.toLowerCase().includes(query.toLowerCase()))
    .slice(0, 15);

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
        onSelectFile(filtered[selectedIndex]);
        onClose();
      }
    }
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-start justify-center pt-20 bg-black/60 backdrop-blur-xs"
      onClick={onClose}
    >
      <div 
        className="w-full max-w-xl bg-panel border border-border rounded-lg shadow-2xl overflow-hidden flex flex-col"
        onClick={e => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        <div className="flex items-center px-4 py-3 border-b border-border bg-background/50">
          <Search className="w-4 h-4 text-secondaryText mr-3 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            className="flex-1 bg-transparent text-primaryText text-sm outline-none placeholder:text-secondaryText/60"
            placeholder="Type file name to open... (e.g. app.py, main.tsx)"
            value={query}
            onChange={e => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
          />
          <span className="text-xs text-secondaryText/50 font-code px-1.5 py-0.5 rounded bg-secondary">Esc to close</span>
        </div>

        <div className="max-h-80 overflow-y-auto py-1">
          {filtered.length === 0 ? (
            <div className="py-6 text-center text-xs text-secondaryText">No matching files found</div>
          ) : (
            filtered.map((filePath, idx) => {
              const isSelected = idx === selectedIndex;
              const fileName = filePath.split('/').pop() || filePath;
              const dirPath = filePath.includes('/') ? filePath.substring(0, filePath.lastIndexOf('/')) : '';

              return (
                <div
                  key={filePath}
                  onClick={() => {
                    onSelectFile(filePath);
                    onClose();
                  }}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={`flex items-center gap-3 px-4 py-2 cursor-pointer text-sm transition-colors ${
                    isSelected ? 'bg-accent/30 text-primaryText font-medium' : 'text-secondaryText hover:bg-secondary'
                  }`}
                >
                  {getFileIcon(fileName, false, false)}
                  <span className="text-primaryText truncate">{fileName}</span>
                  {dirPath && <span className="text-xs text-secondaryText/60 truncate flex-1">{dirPath}</span>}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
