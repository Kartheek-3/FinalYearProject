import { useLocation, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Folder, PlusSquare, Activity, Settings } from 'lucide-react';

export default function ActivityBar() {
  const location = useLocation();
  const navigate = useNavigate();

  const navItems = [
    { path: '/', icon: <LayoutDashboard size={20} />, title: 'Dashboard' },
    { path: '/create', icon: <PlusSquare size={20} />, title: 'Create Project' },
    { path: '/health', icon: <Activity size={20} />, title: 'System Health' },
  ];

  return (
    <div className="activity-bar">
      {navItems.map(item => (
        <div 
          key={item.path}
          className={`activity-item ${location.pathname === item.path ? 'active' : ''}`}
          title={item.title}
          onClick={() => navigate(item.path)}
        >
          {item.icon}
        </div>
      ))}
      <div style={{ flex: 1 }}></div>
      <div className="activity-item" title="Settings">
        <Settings size={20} />
      </div>
    </div>
  );
}
