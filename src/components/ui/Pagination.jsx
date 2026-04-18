import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react'

export default function Pagination({ total, pagina, porPagina, onCambiar, opcionesPorPagina = [10, 25, 50, 100], onCambiarPorPagina }) {
  const totalPaginas = Math.ceil(total / porPagina)
  if (total === 0) return null

  const inicio = (pagina - 1) * porPagina + 1
  const fin = Math.min(pagina * porPagina, total)

  // Genera los números de página a mostrar (máx 5 visibles)
  const paginas = () => {
    if (totalPaginas <= 5) return Array.from({ length: totalPaginas }, (_, i) => i + 1)
    if (pagina <= 3) return [1, 2, 3, 4, 5]
    if (pagina >= totalPaginas - 2) return [totalPaginas - 4, totalPaginas - 3, totalPaginas - 2, totalPaginas - 1, totalPaginas]
    return [pagina - 2, pagina - 1, pagina, pagina + 1, pagina + 2]
  }

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between px-1 py-2">
      {/* Info + filas por página */}
      <div className="flex items-center gap-3 text-sm text-gray-500">
        <span>Mostrando {inicio}–{fin} de {total} registros</span>
        {onCambiarPorPagina && (
          <div className="flex items-center gap-1.5">
            <span className="text-xs">Filas:</span>
            <select
              value={porPagina}
              onChange={e => { onCambiarPorPagina(Number(e.target.value)); onCambiar(1) }}
              className="text-xs border border-gray-200 rounded-md px-1.5 py-1 bg-white focus:outline-none focus:ring-1 focus:ring-primary-500"
            >
              {opcionesPorPagina.map(n => <option key={n} value={n}>{n}</option>)}
            </select>
          </div>
        )}
      </div>

      {/* Botones de navegación */}
      <div className="flex items-center gap-1">
        <button
          onClick={() => onCambiar(1)}
          disabled={pagina === 1}
          className="p-1.5 rounded-md text-gray-400 hover:text-gray-700 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed"
          title="Primera página"
        >
          <ChevronsLeft size={15} />
        </button>
        <button
          onClick={() => onCambiar(pagina - 1)}
          disabled={pagina === 1}
          className="p-1.5 rounded-md text-gray-400 hover:text-gray-700 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed"
          title="Anterior"
        >
          <ChevronLeft size={15} />
        </button>

        {paginas().map(n => (
          <button
            key={n}
            onClick={() => onCambiar(n)}
            className={`min-w-[32px] h-8 px-2 rounded-md text-sm font-medium transition-colors
              ${n === pagina
                ? 'bg-primary-600 text-white'
                : 'text-gray-600 hover:bg-gray-100'}`}
          >
            {n}
          </button>
        ))}

        <button
          onClick={() => onCambiar(pagina + 1)}
          disabled={pagina === totalPaginas}
          className="p-1.5 rounded-md text-gray-400 hover:text-gray-700 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed"
          title="Siguiente"
        >
          <ChevronRight size={15} />
        </button>
        <button
          onClick={() => onCambiar(totalPaginas)}
          disabled={pagina === totalPaginas}
          className="p-1.5 rounded-md text-gray-400 hover:text-gray-700 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed"
          title="Última página"
        >
          <ChevronsRight size={15} />
        </button>
      </div>
    </div>
  )
}
