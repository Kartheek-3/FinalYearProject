import React from 'react';
import { useIDEStore } from '../../store/useIDEStore';
import { X } from 'lucide-react';
import clsx from 'clsx';
import Editor from '@monaco-editor/react';

export default function EditorWorkspace() {
  const { tabs, activeTabId, setActiveTab, closeTab, updateTabContent } = useIDEStore();
  const activeTab = tabs.find(t => t.id === activeTabId);

  return (
    <div className="flex flex-col h-full bg-background overflow-hidden">
      {/* Tabs */}
      <div className="flex bg-panel border-b border-border overflow-x-auto select-none shrink-0 scrollbar-hide">
        {tabs.map(tab => (
          <div
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={clsx(
              "flex items-center gap-2 px-3 py-2 border-r border-border text-sm min-w-[120px] max-w-[200px] cursor-pointer group",
              activeTabId === tab.id 
                ? "bg-background text-primaryText border-t-2 border-t-accent" 
                : "bg-panel text-secondaryText hover:bg-secondary border-t-2 border-t-transparent"
            )}
          >
            <span className="truncate flex-1">{tab.title}</span>
            {tab.isDirty && <div className="w-2 h-2 rounded-full bg-primaryText opacity-50" />}
            <button 
              onClick={(e) => {
                e.stopPropagation();
                closeTab(tab.id);
              }}
              className={clsx(
                "p-0.5 rounded-md hover:bg-border/50",
                (!tab.isDirty && activeTabId !== tab.id) ? "opacity-0 group-hover:opacity-100" : ""
              )}
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>

      {/* Editor Content */}
      <div className="flex-1 overflow-hidden relative">
        {activeTab ? (
          <Editor
            height="100%"
            language={activeTab.language}
            theme="vs-dark"
            value={activeTab.content}
            onChange={(val) => {
              if (val !== undefined) updateTabContent(activeTab.id, val);
            }}
            options={{
              minimap: { enabled: false },
              fontSize: 13,
              fontFamily: "'JetBrains Mono', monospace",
              lineHeight: 22,
              padding: { top: 16 },
              scrollBeyondLastLine: false,
              smoothScrolling: true,
              cursorBlinking: "smooth",
              cursorSmoothCaretAnimation: "on",
              formatOnPaste: true,
            }}
          />
        ) : (
          <div className="flex items-center justify-center h-full text-secondaryText">
            <div className="text-center">
              <div className="text-4xl mb-4">✦</div>
              <h2 className="text-lg font-medium text-primaryText">AI Agent-First IDE</h2>
              <p className="mt-2 text-sm opacity-80">Select a file to start coding</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
