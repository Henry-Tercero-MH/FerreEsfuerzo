import { formatCurrency, formatDate } from '../utils/formatters'

export function imprimirCotizacion(cot, empresa) {
  const estadosLabel = {
    VIGENTE: 'Vigente', PEDIDO: 'Pedido', CONVERTIDA: 'Convertida',
    VENCIDA: 'Vencida', CANCELADA: 'Cancelada',
  }
  const estadoLabel = estadosLabel[cot.estado] || cot.estado || 'Vigente'
  const nombreEmpresa = empresa?.nombre_comercial || 'Ferretería El Esfuerzo'
  const ventana = window.open('', '_blank', 'width=800,height=600')
  if (!ventana) {
    alert('El navegador bloqueó la ventana emergente. Permite popups para este sitio e intenta de nuevo.')
    return
  }
  ventana.document.write(`<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <title>Cotización ${cot.numero_cotizacion}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: Arial, sans-serif; font-size: 13px; color: #111; padding: 32px; }
    .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 28px; }
    .empresa h1 { font-size: 22px; font-weight: 700; color: #1d4ed8; }
    .empresa p { color: #555; font-size: 12px; }
    .cot-info { text-align: right; }
    .cot-info .num { font-size: 18px; font-weight: 700; color: #111; }
    .cot-info p { font-size: 12px; color: #555; margin-top: 2px; }
    .badge { display: inline-block; padding: 2px 10px; border-radius: 20px; font-size: 11px; font-weight: 600; background: #dbeafe; color: #1d4ed8; }
    .divider { border: none; border-top: 1px solid #e5e7eb; margin: 16px 0; }
    .section-title { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; color: #6b7280; margin-bottom: 8px; }
    .info-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 12px; margin-bottom: 24px; }
    .info-grid div p:first-child { font-size: 11px; color: #9ca3af; margin-bottom: 2px; }
    .info-grid div p:last-child { font-weight: 600; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
    thead { background: #f3f4f6; }
    th { padding: 8px 10px; text-align: left; font-size: 11px; color: #6b7280; font-weight: 600; }
    th:not(:first-child) { text-align: right; }
    td { padding: 8px 10px; border-top: 1px solid #f3f4f6; font-size: 13px; }
    td:not(:first-child) { text-align: right; }
    .totales { margin-left: auto; width: 260px; background: #f9fafb; border-radius: 8px; padding: 14px 16px; }
    .totales .row { display: flex; justify-content: space-between; font-size: 13px; color: #555; padding: 3px 0; }
    .totales .total-row { display: flex; justify-content: space-between; font-size: 15px; font-weight: 700; color: #111; border-top: 1px solid #e5e7eb; margin-top: 8px; padding-top: 8px; }
    .descuento { color: #ef4444; }
    .notas-box { background: #f9fafb; border-radius: 8px; padding: 12px 14px; font-size: 12px; color: #555; }
    .footer { margin-top: 40px; text-align: center; font-size: 11px; color: #9ca3af; }
    @media print { body { padding: 16px; } }
  </style>
</head>
<body>
  <div class="header">
    <div class="empresa">
      <h1>${nombreEmpresa}</h1>
      ${empresa?.razon_social ? `<p>${empresa.razon_social}</p>` : ''}
      ${empresa?.nit ? `<p>NIT: ${empresa.nit}</p>` : ''}
      ${empresa?.telefono ? `<p>Tel: ${empresa.telefono}</p>` : ''}
    </div>
    <div class="cot-info">
      <p class="num">${cot.numero_cotizacion}</p>
      <p>Fecha: ${formatDate(cot.fecha)}</p>
      ${cot.fecha_vencimiento ? `<p>Vence: ${formatDate(cot.fecha_vencimiento)}</p>` : ''}
      <p style="margin-top:6px"><span class="badge">${estadoLabel}</span></p>
    </div>
  </div>
  <hr class="divider"/>
  <div class="info-grid">
    <div><p>Cliente</p><p>${cot.cliente_nombre || 'Sin cliente'}</p></div>
    <div><p>Fecha emisión</p><p>${formatDate(cot.fecha)}</p></div>
    <div><p>Vencimiento</p><p>${cot.fecha_vencimiento ? formatDate(cot.fecha_vencimiento) : '—'}</p></div>
  </div>
  <p class="section-title">Productos</p>
  <table>
    <thead>
      <tr>
        <th>Descripción</th>
        <th>Cantidad</th>
        <th>Precio unitario</th>
        <th>Subtotal</th>
      </tr>
    </thead>
    <tbody>
      ${(cot.items || []).map(item => `
      <tr>
        <td>${item.nombre}</td>
        <td>${item.cantidad}</td>
        <td>${formatCurrency(item.precio_unitario)}</td>
        <td>${formatCurrency(item.subtotal)}</td>
      </tr>`).join('')}
    </tbody>
  </table>
  <div class="totales">
    <div class="row"><span>Subtotal</span><span>${formatCurrency(cot.subtotal)}</span></div>
    ${(cot.descuento || 0) > 0 ? `<div class="row descuento"><span>Descuento</span><span>-${formatCurrency(cot.descuento)}</span></div>` : ''}
    <div class="total-row"><span>Total</span><span>${formatCurrency(cot.total)}</span></div>
  </div>
  ${cot.notas ? `<div style="margin-top:20px"><p class="section-title">Notas</p><div class="notas-box">${cot.notas}</div></div>` : ''}
  <div class="footer">
    <p>${nombreEmpresa} &mdash; ${formatDate(new Date().toISOString())}</p>
    <p>Este documento es una cotización y no constituye una factura.</p>
  </div>
  <script>window.onload=function(){window.print();setTimeout(function(){window.close()},800)}</script>
</body>
</html>`)
  ventana.document.close()
  ventana.focus()
}
