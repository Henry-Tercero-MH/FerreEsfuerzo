export default function Button({
  children, variant = 'primary', size = '', className = '',
  loading = false, icon: Icon, ...props
}) {
  const variants = {
    primary:   'btn-primary',
    secondary: 'btn-secondary',
    danger:    'btn-danger',
    success:   'btn-success',
    ghost:     'btn-ghost',
  }
  const sizes = { sm: 'btn-sm', lg: 'btn-lg', '': '' }

  return (
    <button
      className={`${variants[variant]} ${sizes[size]} ${className}`}
      disabled={loading || props.disabled}
      {...props}
    >
      {loading
        ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
        : Icon && <Icon size={16} />
      }
      {children}
    </button>
  )
}

export function IconButton({ icon: Icon, tooltip, className = '', ...props }) {
  return (
    <button title={tooltip} className={`btn-icon btn-ghost ${className}`} {...props}>
      <Icon size={16} />
    </button>
  )
}
