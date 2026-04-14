export default function StatCard({ title, value, icon }) {
  return (
    <div className="stat-card">
      <div className="stat-icon">{icon}</div>
      <h4>{title}</h4>
      <p>{value}</p>
    </div>
  );
}