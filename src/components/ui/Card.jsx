export default function Card({ children, className = '', hover = false }) {
  return (
    <div className={`${hover ? 'card-hover' : 'card'} ${className}`}>
      {children}
    </div>
  )
}

export function StatCard({ label, value, icon: Icon, iconBg = 'bg-primary-100', iconColor = 'text-primary-600', trend }) {
  return (
    <div className="stat-card">
      <div className={`stat-icon ${iconBg}`}>
        <Icon size={22} className={iconColor} />
      </div>
      <div>
        <p className="stat-value">{value}</p>
        <p className="stat-label">{label}</p>
        {trend && (
          <p className={`text-xs font-medium mt-0.5 ${trend >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {trend >= 0 ? '+' : ''}{trend}% vs mes anterior
          </p>
        )}
      </div>
    </div>
  )
}
