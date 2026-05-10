import { useEmpresa } from '../contexts/EmpresaContext'
import { formatCurrency } from '../utils/formatters'

// Comando ESC/p para abrir cajón en impresoras térmicas (3nstar, Epson, etc.)
// Se envía como texto en el HTML — el driver de Windows lo pasa al puerto
const CASH_DRAWER_CMD = '\x1B\x70\x00\x19\xFA'

function buildTicketHTML(venta, cliente, empresa, abrirCajon = true) {
  const fecha = new Date(venta.fecha)
  const fechaStr = fecha.toLocaleDateString('es-GT', { day: '2-digit', month: '2-digit', year: 'numeric' })
  const horaStr  = fecha.toLocaleTimeString('es-GT', { hour: '2-digit', minute: '2-digit' })

  const nombreCliente = cliente?.nombre || 'Consumidor Final'
  const nitCliente    = cliente?.nit    || 'CF'

  const linea = '--------------------------------'

  const metodosLabel = { efectivo: 'Efectivo', transferencia: 'Transferencia', credito: 'Crédito' }

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8"/>
  <title>Ticket ${venta.numero_venta}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: Arial, Helvetica, sans-serif;
      font-size: 12px;
      font-weight: 500;
      width: 72mm;
      padding: 4px 4px;
      color: #000000;
      background: #ffffff;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .center   { text-align: center; }
    .right    { text-align: right; }
    .bold     { font-weight: 700; }
    .lg       { font-size: 14px; font-weight: 700; }
    .xl       { font-size: 15px; font-weight: 700; }
    .sep      { border-top: 1px solid #000000; margin: 5px 0; }
    .sep-dash { border-top: 1px dashed #000000; margin: 4px 0; }
    .row      { display: flex; justify-content: space-between; margin-bottom: 2px; }
    .row-3    { display: flex; margin-bottom: 1px; }
    .row-3 .qty   { width: 22px; text-align: right; margin-right: 5px; font-weight: 600; }
    .row-3 .desc  { flex: 1; }
    .row-3 .price { width: 54px; text-align: right; font-weight: 600; }
    .total-row { display: flex; justify-content: space-between; font-weight: 700; font-size: 14px; }
    .sub      { font-size: 10px; font-weight: 500; padding-left: 27px; margin-bottom: 3px; }
    @media print {
      @page { margin: 0; size: 80mm auto; }
      body { width: 80mm; }
    }
  </style>
</head>
<body>
  ${abrirCajon ? `<!-- Apertura de cajón --><span style="display:none">${CASH_DRAWER_CMD}</span>` : ''}

  <div class="center bold xl">${empresa.nombre_comercial || 'FERRETERÍA'}</div>
  ${empresa.razon_social ? `<div class="center">${empresa.razon_social}</div>` : ''}
  <div class="center">NIT: ${empresa.nit || 'CF'}</div>
  ${empresa.direccion_fiscal ? `<div class="center">${empresa.direccion_fiscal}</div>` : ''}
  ${empresa.telefono ? `<div class="center">Tel: ${empresa.telefono}</div>` : ''}

  <div class="sep-dash"></div>

  <div class="row"><span class="bold">${venta.numero_venta}</span><span style="font-weight:500">${fechaStr} ${horaStr}</span></div>
  <div class="row"><span style="font-weight:600">Cliente:</span><span style="font-weight:500">${nombreCliente}</span></div>
  <div class="row"><span style="font-weight:600">NIT:</span><span style="font-weight:500">${nitCliente}</span></div>
  <div style="font-weight:500">Cajero: ${venta.usuario_nombre || '—'}</div>

  <div class="sep-dash"></div>

  <div class="row-3 bold">
    <span class="qty">Qty</span>
    <span class="desc">Descripción</span>
    <span class="price">Total</span>
  </div>
  <div class="sep"></div>

  ${venta.items.map(item => `
  <div class="row-3">
    <span class="qty">${item.cantidad}</span>
    <span class="desc">${item.nombre}</span>
    <span class="price">${formatCurrency(item.subtotal)}</span>
  </div>
  <div class="sub">${formatCurrency(item.precio_unitario)} c/u</div>
  `).join('')}

  <div class="sep-dash"></div>

  <div class="row" style="font-weight:500"><span>Subtotal</span><span>${formatCurrency(venta.subtotal)}</span></div>
  ${venta.descuento > 0 ? `<div class="row" style="font-weight:500"><span>Descuento</span><span>-${formatCurrency(venta.descuento)}</span></div>` : ''}
  <div class="sep"></div>
  <div class="total-row lg"><span>TOTAL</span><span>${formatCurrency(venta.total)}</span></div>
  <div class="row" style="margin-top:3px;font-weight:600"><span>Forma de pago:</span><span>${metodosLabel[venta.metodo_pago] || venta.metodo_pago}</span></div>
  ${venta.pago_recibido > 0 ? `
  <div class="row" style="font-weight:500"><span>Pago recibido:</span><span>${formatCurrency(venta.pago_recibido)}</span></div>
  <div class="row bold" style="font-size:13px"><span>CAMBIO:</span><span>${formatCurrency(venta.cambio || 0)}</span></div>
  ` : ''}

  <div class="sep-dash"></div>

  <div class="center bold" style="margin-top:6px">${empresa.pie_factura || 'Gracias por su compra'}</div>

  <div style="margin-top:16px"></div>

  <script>
    window.onload = function() {
      window.print();
      setTimeout(function(){ window.close(); }, 800);
    };
  </script>
</body>
</html>`
}

export function imprimirTicket(venta, cliente, empresa, abrirCajon = true) {
  const html = buildTicketHTML(venta, cliente, empresa, abrirCajon)
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' })
  const url  = URL.createObjectURL(blob)
  const win  = window.open(url, '_blank', 'width=320,height=600,toolbar=0,scrollbars=0,status=0')
  if (!win) {
    URL.revokeObjectURL(url)
    alert('El navegador bloqueó la ventana emergente. Permite popups para este sitio e intenta de nuevo.')
    return
  }
  win.addEventListener('load', () => URL.revokeObjectURL(url), { once: true })
}

// Componente botón listo para usar
export default function TicketVenta({ venta, cliente }) {
  const { empresa } = useEmpresa()

  return (
    <button
      onClick={() => imprimirTicket(venta, cliente, empresa)}
      className="inline-flex items-center gap-2 rounded-xl bg-gray-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-gray-700 transition-colors"
    >
      🖨 Imprimir ticket
    </button>
  )
}
