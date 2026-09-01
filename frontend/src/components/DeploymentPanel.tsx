import type { ProjectAggregate } from '../types/api';
import { Server, ExternalLink } from 'lucide-react';

interface Props {
  project: ProjectAggregate;
}

export default function DeploymentPanel({ project }: Props) {
  const delivery = project.delivery_result;

  if (!delivery) {
    return (
      <div className="p-4 flex flex-col items-center justify-center text-secondary" style={{ height: '300px' }}>
        <Server size={48} className="mb-4 opacity-50" />
        <div>Project has not been deployed yet.</div>
        <div className="text-xs mt-2">Advance the pipeline to DELIVERY stage.</div>
      </div>
    );
  }

  return (
    <div className="p-4">
      <div className="ide-panel p-4" style={{ maxWidth: '600px', margin: '0 auto' }}>
        <h3 className="mb-4 border-b border-[var(--panel-border)] pb-2 text-xs font-bold text-[var(--accent-color)]">
          DOCKER DEPLOYMENT
        </h3>
        
        <div className="flex justify-between mb-2 pb-2" style={{ borderBottom: '1px solid var(--panel-border)' }}>
          <span className="text-secondary">Status:</span>
          <span className={`badge ${delivery.success ? 'badge-success' : 'badge-danger'}`}>
            {delivery.success ? 'DEPLOYED' : 'FAILED'}
          </span>
        </div>
        
        <div className="flex justify-between mb-2 pb-2" style={{ borderBottom: '1px solid var(--panel-border)' }}>
          <span className="text-secondary">Service Reference:</span>
          <span className="mono">{delivery.service_references?.[0] || 'N/A'}</span>
        </div>

        <div className="flex justify-between mb-4 pb-2" style={{ borderBottom: '1px solid var(--panel-border)' }}>
          <span className="text-secondary">Endpoint:</span>
          {delivery.project_url ? (
            <a href={delivery.project_url} target="_blank" rel="noreferrer" className="flex items-center gap-1 mono">
              {delivery.project_url} <ExternalLink size={12} />
            </a>
          ) : (
            <span className="mono">N/A</span>
          )}
        </div>

        {delivery.message && (
          <div className="mt-4 p-2 bg-[var(--bg-color)] border border-[var(--panel-border)] rounded text-xs text-secondary mono">
            {delivery.message}
          </div>
        )}
      </div>
    </div>
  );
}
