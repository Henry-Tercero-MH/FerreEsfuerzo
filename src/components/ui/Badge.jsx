const variants = {
  green:  'badge-green',
  red:    'badge-red',
  yellow: 'badge-yellow',
  blue:   'badge-blue',
  gray:   'badge-gray',
  orange: 'badge-orange',
}

export default function Badge({ children, variant = 'gray', className = '' }) {
  return (
    <span className={`${variants[variant] ?? 'badge-gray'} ${className}`}>
      {children}
    </span>
  )
}
