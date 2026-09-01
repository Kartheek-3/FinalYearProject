import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import CreateProject from './pages/CreateProject';
import ProjectDetails from './pages/ProjectDetails';
import SystemHealth from './pages/SystemHealth';
import ActivityBar from './components/ActivityBar';
import Sidebar from './components/Sidebar';
import TopBar from './components/TopBar';
import StatusBar from './components/StatusBar';

export default function App() {
  return (
    <BrowserRouter>
      <div className="ide-container">
        <TopBar />
        <ActivityBar />
        <Sidebar />
        
        <main className="main-workspace">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/create" element={<CreateProject />} />
            <Route path="/projects/:projectId" element={<ProjectDetails />} />
            <Route path="/health" element={<SystemHealth />} />
          </Routes>
        </main>
        
        <StatusBar />
      </div>
    </BrowserRouter>
  );
}
