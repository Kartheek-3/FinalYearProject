import { useLocation } from 'react-router-dom';
import { ChevronRight, FolderClosed } from 'lucide-react';

export default function Sidebar() {
  const location = useLocation();

  return (
    <div className="ide-sidebar">
      <div className="ide-header">Explorer</div>
      <div className="sidebar-content">
        <div className="sidebar-nav-item">
          <ChevronRight size={14} />
          <FolderClosed size={14} />
          <span>SEAM Workspace</span>
        </div>
        {/* Placeholder for future explorer items based on active project */}
        {location.pathname.startsWith('/projects/') && (
          <>
            <div className="sidebar-nav-item" style={{ paddingLeft: '28px' }}>
              <span className="text-secondary text-xs">Current Project context active</span>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
