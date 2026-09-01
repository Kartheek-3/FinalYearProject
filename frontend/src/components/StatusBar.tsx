import { CheckCircle2, Server } from 'lucide-react';
import { useState, useEffect } from 'react';
import { api } from '../services/api';

export default function StatusBar() {
  const [healthOk, setHealthOk] = useState(false);

  useEffect(() => {
    const checkHealth = () => {
      api.health()
        .then(() => setHealthOk(true))
        .catch(() => setHealthOk(false));
    };
    
    checkHealth();
    const interval = setInterval(checkHealth, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="status-bar">
      <div className="status-item">
        <Server size={14} />
        <span>SEAM Controller</span>
      </div>
      <div className="status-item">
        <CheckCircle2 size={14} />
        <span>Backend: {healthOk ? 'Connected' : 'Offline'}</span>
      </div>
    </div>
  );
}
