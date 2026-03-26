/**
 * Icono de Quetzal (Q) — reemplaza el DollarSign de Lucide.
 * Acepta las mismas props: size, className
 */
export default function IconQ({ size = 24, className = '' }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      className={className}
    >
      <text
        x="12"
        y="17"
        textAnchor="middle"
        fontFamily="Arial, sans-serif"
        fontSize="16"
        fontWeight="bold"
        fill="currentColor"
      >
        Q
      </text>
    </svg>
  )
}
