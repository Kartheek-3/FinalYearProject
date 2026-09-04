import React from 'react';
import { Files, Search, GitBranch, Blocks, Bot, Plug2, Settings } from 'lucide-react';
import { useIDEStore, ActivityBarItem } from '../../store/useIDEStore';
import clsx from 'clsx';

export default function ActivityBar() {
  const { activeActivity, setActiveActivity } = useIDEStore();

  const primaryItems: { id: ActivityBarItem; icon: React.ReactNode; label: string }[] = [
    { id: 'explorer', icon: <Files className="w-6 h-6" />, label: 'Explorer' },
    { id: 'search', icon: <Search className="w-6 h-6" />, label: 'Search' },
    { id: 'source_control', icon: <GitBranch className="w-6 h-6" />, label: 'Source Control' },
    { id: 'agents', icon: <Bot className="w-6 h-6" />, label: 'Agents' },
    { id: 'mcp', icon: <Plug2 className="w-6 h-6" />, label: 'MCP Connectors' },
    { id: 'extensions', icon: <Blocks className="w-6 h-6" />, label: 'Extensions' },
  ];

  const secondaryItems: { id: ActivityBarItem; icon: React.ReactNode; label: string }[] = [
    { id: 'settings', icon: <Settings className="w-6 h-6" />, label: 'Settings' },
  ];

  const renderIcon = (item: { id: ActivityBarItem; icon: React.ReactNode; label: string }) => {
    const isActive = activeActivity === item.id;
    return (
      <button
        key={item.id}
        onClick={() => setActiveActivity(item.id)}
        className={clsx(
          "w-12 h-12 flex items-center justify-center relative transition-colors group",
          isActive ? "text-primaryText" : "text-secondaryText hover:text-primaryText"
        )}
        title={item.label}
      >
        {isActive && (
          <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-accent rounded-r-full" />
        )}
        {item.icon}
      </button>
    );
  };

  return (
    <div className="w-12 bg-background border-r border-border flex flex-col justify-between shrink-0 h-full select-none">
      <div className="flex flex-col items-center py-2 space-y-2">
        {primaryItems.map(renderIcon)}
      </div>
      <div className="flex flex-col items-center py-2 space-y-2">
        {secondaryItems.map(renderIcon)}
      </div>
    </div>
  );
}
