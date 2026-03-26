import { useRef } from 'react'
import { X, Printer } from 'lucide-react'
import { useEmpresa } from '../contexts/EmpresaContext'
import { formatDate, formatCurrency } from '../utils/formatters'
import { ESTADOS_DESPACHO } from '../utils/constants'
import Button from './ui/Button'

export default function BoletaDespacho({ pedido, cliente, onClose }) {
  const { empresa } = useEmpresa()
  const boletaRef = useRef(null)

  const imprimir = () => {
    const contenido = boletaRef.current.innerHTML
    const ventana = window.open('', '_blank', 'width=800,height=600')
    ventana.document.write(`
      <!DOCTYPE html>
      <html lang="es">
      <head>
        <meta charset="UTF-8" />
        <title>Boleta de Despacho — ${pedido.numero_venta}</title>
        <style>
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body { font-family: Arial, sans-serif; font-size: 12px; color: #111; padding: 24px; }
          .encabezado { text-align: center; border-bottom: 2px solid #111; padding-bottom: 12px; margin-bottom: 16px; }
          .encabezado h1 { font-size: 18px; font-weight: bold; }
          .encabezado p { font-size: 11px; color: #444; }
          .titulo-boleta { font-size: 14px; font-weight: bold; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 16px; }
          .seccion { margin-bottom: 16px; }
          .seccion h3 { font-size: 10px; font-weight: bold; text-transform: uppercase; color: #666; letter-spacing: 0.5px; border-bottom: 1px solid #ddd; padding-bottom: 4px; margin-bottom: 8px; }
          .fila { display: flex; justify-content: space-between; margin-bottom: 4px; }
          .fila span:first-child { color: #555; }
          table { width: 100%; border-collapse: collapse; margin-top: 8px; }
          th { background: #f3f4f6; font-size: 10px; font-weight: bold; text-transform: uppercase; padding: 6px 8px; text-align: left; border: 1px solid #e5e7eb; }
          td { padding: 8px; border: 1px solid #e5e7eb; vertical-align: top; }
          .check { width: 20px; text-align: center; }
          .firma { display: flex; gap: 32px; margin-top: 32px; }
          .firma-linea { flex: 1; }
          .firma-linea .linea { border-top: 1px solid #111; margin-top: 40px; padding-top: 4px; font-size: 10px; text-align: center; color: #666; }
          .badge { display: inline-block; padding: 2px 8px; border-radius: 9999px; font-size: 10px; font-weight: bold; background: #fef9c3; color: #713f12; }
          .pie { margin-top: 24px; text-align: center; font-size: 10px; color: #9ca3af; border-top: 1px solid #e5e7eb; padding-top: 8px; }
        </style>
      </head>
      <body>${contenido}</body>
      </html>
    `)
    ventana.document.close()
    ventana.focus()
    setTimeout(() => { ventana.print(); ventana.close() }, 300)
  }

  const estado = ESTADOS_DESPACHO[pedido.estado_despacho]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        {/* Toolbar */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900">Boleta de Despacho</h2>
          <div className="flex gap-2">
            <Button variant="primary" icon={Printer} onClick={imprimir}>Imprimir</Button>
            <button onClick={onClose} className="btn-icon btn-ghost text-gray-400"><X size={18} /></button>
          </div>
        </div>

        {/* Contenido imprimible */}
        <div className="overflow-y-auto p-6">
          <div ref={boletaRef}>
            {/* Encabezado empresa */}
            <div className="encabezado text-center border-b-2 border-gray-900 pb-3 mb-4">
              <h1 className="text-lg font-bold text-gray-900">{empresa?.nombre_comercial || 'Ferretería El Esfuerzo'}</h1>
              {empresa?.direccion_fiscal && <p className="text-xs text-gray-500">{empresa.direccion_fiscal}</p>}
              {empresa?.telefono && <p className="text-xs text-gray-500">Tel: {empresa.telefono}</p>}
              {empresa?.nit && <p className="text-xs text-gray-500">NIT: {empresa.nit}</p>}
            </div>

            <p className="titulo-boleta text-xs font-bold uppercase tracking-widest text-center mb-4 text-gray-700">
              Boleta de Despacho
            </p>

            {/* Datos del pedido */}
            <div className="seccion grid grid-cols-2 gap-x-6 gap-y-1 text-sm mb-4">
              <div>
                <p className="text-xs font-bold uppercase text-gray-400 mb-1">Pedido</p>
                <p className="font-mono font-semibold">{pedido.numero_venta}</p>
              </div>
              <div>
                <p className="text-xs font-bold uppercase text-gray-400 mb-1">Fecha</p>
                <p>{formatDate(pedido.fecha)}</p>
              </div>
              <div>
                <p className="text-xs font-bold uppercase text-gray-400 mb-1">Estado</p>
                <p className="font-medium">{estado?.label}</p>
              </div>
              <div>
                <p className="text-xs font-bold uppercase text-gray-400 mb-1">Método de pago</p>
                <p className="capitalize">{pedido.metodo_pago}</p>
              </div>
            </div>

            {/* Datos del cliente */}
            <div className="seccion mb-4">
              <h3 className="text-xs font-bold uppercase text-gray-400 border-b border-gray-200 pb-1 mb-2">Cliente</h3>
              <p className="font-semibold text-sm">{cliente?.nombre ?? 'Consumidor Final'}</p>
              {cliente?.telefono && <p className="text-xs text-gray-500">Tel: {cliente.telefono}</p>}
              {cliente?.nit && <p className="text-xs text-gray-500">NIT: {cliente.nit}</p>}
            </div>

            {/* Dirección de entrega */}
            <div className="seccion mb-4 rounded-lg bg-gray-50 border border-gray-200 px-3 py-2">
              <p className="text-xs font-bold uppercase text-gray-400 mb-1">Dirección de entrega</p>
              <p className="text-sm font-medium">{pedido.direccion_entrega}</p>
            </div>

            {/* Productos a reunir */}
            <div className="seccion mb-4">
              <h3 className="text-xs font-bold uppercase text-gray-400 border-b border-gray-200 pb-1 mb-2">
                Productos a preparar
              </h3>
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="check border border-gray-200 p-2 text-center text-xs">✓</th>
                    <th className="border border-gray-200 p-2 text-left text-xs">Producto</th>
                    <th className="border border-gray-200 p-2 text-center text-xs">Cant.</th>
                    <th className="border border-gray-200 p-2 text-right text-xs">Subtotal</th>
                  </tr>
                </thead>
                <tbody>
                  {pedido.items.map((item, i) => (
                    <tr key={i}>
                      <td className="border border-gray-200 p-2 text-center text-gray-300">□</td>
                      <td className="border border-gray-200 p-2">
                        <p className="font-medium">{item.nombre}</p>
                        {item.codigo && <p className="text-xs text-gray-400">{item.codigo}</p>}
                      </td>
                      <td className="border border-gray-200 p-2 text-center font-bold">{item.cantidad}</td>
                      <td className="border border-gray-200 p-2 text-right">{formatCurrency(item.subtotal)}</td>
                    </tr>
                  ))}
                  <tr className="bg-gray-50 font-bold">
                    <td colSpan={3} className="border border-gray-200 p-2 text-right text-xs uppercase">Total</td>
                    <td className="border border-gray-200 p-2 text-right">{formatCurrency(pedido.total)}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Notas */}
            {pedido.notas && (
              <div className="seccion mb-4">
                <p className="text-xs font-bold uppercase text-gray-400 mb-1">Notas</p>
                <p className="text-sm text-gray-700 rounded bg-yellow-50 border border-yellow-200 px-3 py-2">{pedido.notas}</p>
              </div>
            )}

            {/* Firmas */}
            <div className="firma flex gap-8 mt-8">
              <div className="flex-1">
                <div className="mt-10 border-t border-gray-800 pt-1 text-center text-xs text-gray-500">
                  Preparado por
                </div>
              </div>
              <div className="flex-1">
                <div className="mt-10 border-t border-gray-800 pt-1 text-center text-xs text-gray-500">
                  Recibido por
                </div>
              </div>
            </div>

            <p className="pie mt-6 text-center text-xs text-gray-400 border-t border-gray-100 pt-3">
              Ferretería El Esfuerzo — Generado el {formatDate(new Date().toISOString())}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
