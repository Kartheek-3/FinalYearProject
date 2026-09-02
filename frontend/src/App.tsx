import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import CreateProject from './pages/CreateProject';
import ProjectWorkspace from './pages/ProjectWorkspace';
import SystemHealth from './pages/SystemHealth';
import ActivityBar from './components/ActivityBar';
import Sidebar from './components/Sidebar';
import TopBar from './components/TopBar';
import StatusBar from './components/StatusBar';

function AppLayout() {
  const location = useLocation();
  const isProjectWorkspace = location.pathname.startsWith('/projects/');

  if (isProjectWorkspace) {
    return (
      <div className="ide-container" style={{ display: 'flex', height: '100vh', width: '100vw' }}>
        <ActivityBar />
        <main style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
          <Routes>
            <Route path="/projects/:projectId" element={<ProjectWorkspace />} />
          </Routes>
        </main>
      </div>
    );
  }

  return (
    <div className="ide-container">
      <TopBar />
      <ActivityBar />
      <Sidebar />
      <main className="main-workspace">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/create" element={<CreateProject />} />
          <Route path="/health" element={<SystemHealth />} />
        </Routes>
      </main>
      <StatusBar />
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppLayout />
    </BrowserRouter>
  );
}
