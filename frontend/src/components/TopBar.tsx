export default function TopBar() {
  return (
    <div className="top-bar">
      <div className="flex items-center gap-2">
        <span style={{ fontWeight: 600, color: 'var(--accent-color)' }}>SEAM</span>
        <span className="text-secondary text-xs">AI SOFTWARE ENGINEERING MANAGER</span>
      </div>
      <div className="top-bar-actions">
        {/* Global actions could go here */}
      </div>
    </div>
  );
}
