import { createContext, useContext, useCallback } from 'react'
import { useLocalStorage } from '../hooks/useLocalStorage'
import { db } from '../services/db'
import { shortId, generateNumeroVenta, generateCodigoProducto } from '../utils/formatters'

const AppContext = createContext(null)

// ── Datos semilla ────────────────────────────────────────────────────────────
const D = new Date().toISOString()
const p = (id, codigo, nombre, categoria, precio_compra, precio_venta, stock, stock_minimo, unidad = 'unidad') =>
  ({ id, codigo, nombre, categoria, precio_compra, precio_venta, stock, stock_minimo, unidad, activo: true, creado_en: D })

const PRODUCTOS_SEED = [
  // ── Herramientas Manuales ────────────────────────────────────────────────
  p('p001','HM-001','Martillo de Carpintero 16oz',       'Herramientas Manuales',  35,  65, 20, 5),
  p('p002','HM-002','Destornillador Phillips #2',         'Herramientas Manuales',  15,  28, 35, 8),
  p('p003','HM-003','Llave Inglesa Ajustable 10"',        'Herramientas Manuales',  55,  95, 15, 4),
  p('p004','HM-004','Alicate de Presión 8"',              'Herramientas Manuales',  45,  80, 18, 5),
  p('p005','HM-005','Serrucho 22"',                       'Herramientas Manuales',  65, 115, 10, 3),
  p('p006','HM-006','Cincel para Concreto 3/4"',          'Herramientas Manuales',  22,  42, 20, 5),
  p('p007','HM-007','Lima Triangular 8"',                 'Herramientas Manuales',  12,  24, 25, 6),
  p('p008','HM-008','Cinta Métrica 5m',                   'Herramientas Manuales',  20,  38, 40, 8),
  p('p009','HM-009','Nivel de Aluminio 24"',              'Herramientas Manuales',  65, 120, 12, 3),
  p('p010','HM-010','Llave Allen Set 9 piezas',           'Herramientas Manuales',  28,  52, 15, 4),

  // ── Herramientas Eléctricas ──────────────────────────────────────────────
  p('p011','HE-001','Taladro Percutor 1/2" 750W',         'Herramientas Eléctricas', 350, 580,  8, 2),
  p('p012','HE-002','Rotomartillo SDS 800W',              'Herramientas Eléctricas', 780,1250,  5, 1),
  p('p013','HE-003','Pulidora Angular 4.5" 900W',         'Herramientas Eléctricas', 280, 450, 10, 2),
  p('p014','HE-004','Sierra Circular 7.1/4" 1400W',       'Herramientas Eléctricas', 520, 850,  6, 1),
  p('p015','HE-005','Lijadora Orbital 200W',              'Herramientas Eléctricas', 280, 460,  8, 2),
  p('p016','HE-006','Atornillador Inalámbrico 12V',       'Herramientas Eléctricas', 380, 620,  7, 2),

  // ── Accesorios para Herramientas ─────────────────────────────────────────
  p('p017','AH-001','Brocas para Concreto Set 5 piezas',  'Accesorios para Herramientas',  45,  80, 25, 6),
  p('p018','AH-002','Disco de Corte 4.5" (c/u)',          'Accesorios para Herramientas',   8,  18,100,20),
  p('p019','AH-003','Lija de Agua #120',                  'Accesorios para Herramientas',   3,   7,200,30, 'unidad'),
  p('p020','AH-004','Puntas Destornillador PH2 Set 10',   'Accesorios para Herramientas',  18,  35, 40, 8),
  p('p021','AH-005','Broca HSS para Metal 6mm',           'Accesorios para Herramientas',  12,  24, 50,10),
  p('p022','AH-006','Extensión Eléctrica 10m',            'Accesorios para Herramientas',  85, 145, 12, 3),

  // ── Materiales de Construcción ───────────────────────────────────────────
  p('p023','MC-001','Cemento Gris Saco 42.5kg',           'Materiales de Construcción',  72,  98, 80,15, 'saco'),
  p('p024','MC-002','Cal Hidratada Saco 25kg',            'Materiales de Construcción',  35,  58, 40,10, 'saco'),
  p('p025','MC-003','Block de Concreto 15x20x40',         'Materiales de Construcción',   5,   9,500,50),
  p('p026','MC-004','Arena de Construcción',              'Materiales de Construcción', 120, 195, 20, 5, 'saco'),

  // ── Materiales Estructurales ─────────────────────────────────────────────
  p('p027','ME-001','Hierro Corrugado 3/8" x 6m',         'Materiales Estructurales',  38,  62, 80,15),
  p('p028','ME-002','Hierro Corrugado 1/2" x 6m',         'Materiales Estructurales',  62,  98, 60,10),
  p('p029','ME-003','Malla Electrosoldada 2x4m',          'Materiales Estructurales', 185, 295, 20, 5),
  p('p030','ME-004','Alambre de Amarre Rollo 1kg',        'Materiales Estructurales',  18,  35, 30, 8, 'rollo'),
  p('p031','ME-005','Varilla Lisa 1/4" x 6m',             'Materiales Estructurales',  22,  38, 60,12),

  // ── Materiales para Techos ───────────────────────────────────────────────
  p('p032','MT-001','Lámina Galvanizada Cal.26 3m',       'Materiales para Techos',  95, 155, 40, 8),
  p('p033','MT-002','Canaleta de PVC 3m',                 'Materiales para Techos',  45,  80, 25, 5),
  p('p034','MT-003','Tornillos para Techo c/Hule (100u)', 'Materiales para Techos',  22,  42, 30, 8, 'caja'),
  p('p035','MT-004','Perfil Metálico 2x4" 6m',            'Materiales para Techos',  95, 160, 25, 5),

  // ── Tornillería y Fijaciones ─────────────────────────────────────────────
  p('p036','TF-001','Tornillos para Madera 1.5" (100u)',  'Tornillería y Fijaciones',  12,  22, 60,12, 'caja'),
  p('p037','TF-002','Clavos 3" (libra)',                  'Tornillería y Fijaciones',   8,  15, 80,20),
  p('p038','TF-003','Clavos 4" (libra)',                  'Tornillería y Fijaciones',   9,  16, 60,15),
  p('p039','TF-004','Pernos Galvanizados 1/2" (10u)',     'Tornillería y Fijaciones',  18,  35, 40,10, 'bolsa'),
  p('p040','TF-005','Tuercas 1/2" (25u)',                 'Tornillería y Fijaciones',  10,  20, 60,12, 'bolsa'),
  p('p041','TF-006','Tarugos Plásticos #8 (50u)',         'Tornillería y Fijaciones',   8,  16, 50,10, 'bolsa'),
  p('p042','TF-007','Arandelas 1/2" (25u)',               'Tornillería y Fijaciones',   6,  14, 50,10, 'bolsa'),

  // ── Plomería ─────────────────────────────────────────────────────────────
  p('p043','PL-001','Tubo PVC 1/2" x 6m',                'Plomería',  32,  55, 30, 8),
  p('p044','PL-002','Tubo PVC 3/4" x 6m',                'Plomería',  45,  78, 25, 6),
  p('p045','PL-003','Codo PVC 1/2" 90°',                 'Plomería',   2,   5,100,20),
  p('p046','PL-004','Tee PVC 1/2"',                      'Plomería',   3,   7,100,20),
  p('p047','PL-005','Llave de Paso 1/2" HH',             'Plomería',  28,  52, 20, 5),
  p('p048','PL-006','Pegamento PVC 250ml',               'Plomería',  22,  42, 25, 6),
  p('p049','PL-007','Cinta Teflón (rollo)',               'Plomería',   4,   9, 80,15, 'rollo'),

  // ── Electricidad ─────────────────────────────────────────────────────────
  p('p050','EL-001','Cable THHN #12 Rollo 100m',         'Electricidad', 320, 520,  8, 2, 'rollo'),
  p('p051','EL-002','Cable THHN #10 Rollo 100m',         'Electricidad', 450, 720,  6, 1, 'rollo'),
  p('p052','EL-003','Breaker 1x20A',                     'Electricidad',  45,  82, 25, 5),
  p('p053','EL-004','Tomacorriente Doble Polo a Tierra', 'Electricidad',  18,  35, 40, 8),
  p('p054','EL-005','Interruptor Simple',                'Electricidad',  12,  25, 50,10),
  p('p055','EL-006','Bombilla LED 9W E27',               'Electricidad',  15,  28, 60,12),
  p('p056','EL-007','Caja Cuadrada 4"',                  'Electricidad',   8,  18, 50,10),

  // ── Pintura y Acabados ───────────────────────────────────────────────────
  p('p057','PA-001','Pintura Blanca Látex 1 galón',      'Pintura y Acabados',  80, 130, 25, 6, 'galón'),
  p('p058','PA-002','Pintura de Aceite Blanca 1L',       'Pintura y Acabados',  45,  78, 20, 5, 'litro'),
  p('p059','PA-003','Pintura Anticorrosiva 1L',          'Pintura y Acabados',  58,  98, 15, 4, 'litro'),
  p('p060','PA-004','Brocha de Cerda 3"',                'Pintura y Acabados',  18,  35, 30, 8),
  p('p061','PA-005','Rodillo para Pintura 9"',           'Pintura y Acabados',  25,  48, 25, 6),
  p('p062','PA-006','Thinner Corriente 1L',              'Pintura y Acabados',  28,  52, 30, 8, 'litro'),
  p('p063','PA-007','Espátula Metálica 4"',              'Pintura y Acabados',  12,  24, 25, 6),

  // ── Acabados de Construcción ─────────────────────────────────────────────
  p('p064','AC-001','Piso Cerámico 33x33 (caja)',        'Acabados de Construcción',  95, 155, 40, 8, 'caja'),
  p('p065','AC-002','Pegamento para Piso Saco 20kg',     'Acabados de Construcción',  48,  82, 25, 6, 'saco'),
  p('p066','AC-003','Boquilla Blanca 1kg',               'Acabados de Construcción',  18,  35, 30, 8, 'bolsa'),
  p('p067','AC-004','Yeso Construcción 1kg',             'Acabados de Construcción',  12,  22, 20, 5, 'bolsa'),

  // ── Seguridad y Cerrajería ───────────────────────────────────────────────
  p('p068','SC-001','Candado 40mm Acero',                'Seguridad y Cerrajería',  35,  62, 20, 5),
  p('p069','SC-002','Cerradura Pomo Interior',           'Seguridad y Cerrajería',  85, 145, 12, 3),
  p('p070','SC-003','Bisagras 3.5" Amarillas (par)',     'Seguridad y Cerrajería',  22,  42, 25, 6, 'par'),
  p('p071','SC-004','Pasador Metálico 4"',               'Seguridad y Cerrajería',  12,  22, 30, 8),

  // ── Seguridad Industrial ─────────────────────────────────────────────────
  p('p072','SI-001','Guantes de Trabajo Cuero',          'Seguridad Industrial',  28,  52, 30, 8, 'par'),
  p('p073','SI-002','Casco de Seguridad ANSI',           'Seguridad Industrial',  45,  82, 15, 4),
  p('p074','SI-003','Lentes de Protección',              'Seguridad Industrial',  22,  42, 25, 6),
  p('p075','SI-004','Botas Punta de Acero',              'Seguridad Industrial', 185, 295, 10, 2, 'par'),
  p('p076','SI-005','Chaleco Reflectivo',                'Seguridad Industrial',  38,  68, 20, 4),

  // ── Jardinería ───────────────────────────────────────────────────────────
  p('p077','JA-001','Machete 18" Mango Madera',         'Jardinería',  45,  80, 15, 4),
  p('p078','JA-002','Tijeras de Podar 8"',              'Jardinería',  65, 115, 10, 3),
  p('p079','JA-003','Manguera 1/2" x 15m',             'Jardinería',  85, 145, 12, 3, 'rollo'),
  p('p080','JA-004','Regadera Plástica 10L',            'Jardinería',  55,  95,  8, 2),
  p('p081','JA-005','Pala de Jardín Mango Corto',       'Jardinería',  48,  85, 12, 3),

  // ── Herramientas Agrícolas ───────────────────────────────────────────────
  p('p082','AG-001','Azadón Mediano Mango 1.5m',        'Herramientas Agrícolas',  65, 115, 15, 4),
  p('p083','AG-002','Piocha Mango 1.5m',                'Herramientas Agrícolas',  72, 125, 10, 3),
  p('p084','AG-003','Pala Cuadrada Mango Largo',        'Herramientas Agrícolas',  68, 120, 12, 3),
  p('p085','AG-004','Barreta Hexagonal 1.5m',           'Herramientas Agrícolas',  95, 165,  8, 2),

  // ── Adhesivos y Químicos ─────────────────────────────────────────────────
  p('p086','AQ-001','Silicona Transparente 280ml',      'Adhesivos y Químicos',  22,  42, 25, 6),
  p('p087','AQ-002','Pegamento Contacto 250ml',         'Adhesivos y Químicos',  28,  52, 20, 5),
  p('p088','AQ-003','Sellador de Silicona Blanco',      'Adhesivos y Químicos',  25,  48, 20, 5),
  p('p089','AQ-004','Espuma Expansiva 500ml',           'Adhesivos y Químicos',  38,  68, 15, 4),

  // ── Limpieza y Mantenimiento ─────────────────────────────────────────────
  p('p090','LM-001','Escoba de Palma',                  'Limpieza y Mantenimiento',  28,  52, 20, 5),
  p('p091','LM-002','Trapeador de Algodón',             'Limpieza y Mantenimiento',  35,  62, 15, 4),
  p('p092','LM-003','Balde Plástico 12L',               'Limpieza y Mantenimiento',  22,  42, 25, 6),
  p('p093','LM-004','Detergente Industrial 1kg',        'Limpieza y Mantenimiento',  28,  52, 20, 5, 'bolsa'),

  // ── Carpintería y Madera ─────────────────────────────────────────────────
  p('p094','CM-001','Tabla de Pino 1"x6"x8\'',         'Carpintería y Madera',  45,  80, 30, 6),
  p('p095','CM-002','Triplay 1/4" 4x8\'',              'Carpintería y Madera', 148, 245, 15, 4),
  p('p096','CM-003','MDF 9mm 4x8\'',                   'Carpintería y Madera', 185, 310, 10, 3),
  p('p097','CM-004','Barniz Brillante 1L',              'Carpintería y Madera',  55,  95, 15, 4, 'litro'),

  // ── Equipos Especiales ───────────────────────────────────────────────────
  p('p098','ES-001','Generador Gasolina 2200W',         'Equipos Especiales', 1850, 2950,  3, 1),
  p('p099','ES-002','Compresor de Aire 25L',            'Equipos Especiales', 1250, 1950,  4, 1),
  p('p100','ES-003','Hidrolavadora 1500W',              'Equipos Especiales',  980, 1650,  5, 1),

  // ── Consumibles ──────────────────────────────────────────────────────────
  p('p101','CO-001','Cinta Aislante Negra',             'Consumibles',   5,  12,100,20, 'rollo'),
  p('p102','CO-002','Cinta Teflón Extra Largo',         'Consumibles',   4,   9, 80,15, 'rollo'),
  p('p103','CO-003','Lija de Madera #80',               'Consumibles',   3,   7,150,25),
  p('p104','CO-004','Clavos Surtidos 1/2 libra',        'Consumibles',   8,  16, 80,15, 'bolsa'),
  p('p105','CO-005','Masking Tape 1" x 40m',            'Consumibles',   8,  16, 60,12, 'rollo'),
]

const CLIENTES_SEED = [
  { id: 'c1',  nombre: 'Consumidor Final',              telefono: '',           email: '',                      nit: 'CF',       tipo: 'natural',   activo: true, creado_en: new Date().toISOString() },
  { id: 'c2',  nombre: 'Constructora Los Pinos S.A.',   telefono: '2345-6789',  email: 'compras@lospinos.gt',   nit: '12345678', tipo: 'empresa',   activo: true, creado_en: new Date().toISOString() },
  { id: 'c3',  nombre: 'Pedro González',                telefono: '5512-3456',  email: '',                      nit: '98765432', tipo: 'natural',   activo: true, creado_en: new Date().toISOString() },
  { id: 'c4',  nombre: 'Ferretería El Martillo',        telefono: '2234-5678',  email: 'pedidos@elmartillo.gt', nit: '87654321', tipo: 'empresa',   activo: true, creado_en: new Date().toISOString() },
  { id: 'c5',  nombre: 'Constructora Ramírez & Asoc.',  telefono: '2345-9876',  email: 'obras@ramirez.gt',      nit: '45678901', tipo: 'empresa',   activo: true, creado_en: new Date().toISOString() },
  { id: 'c6',  nombre: 'María López',                   telefono: '5678-9012',  email: 'mlopez@gmail.com',      nit: '34567890', tipo: 'natural',   activo: true, creado_en: new Date().toISOString() },
  { id: 'c7',  nombre: 'Servicios de Plomería Aqua',    telefono: '2456-7890',  email: 'info@aquaplomeria.gt',  nit: '23456789', tipo: 'empresa',   activo: true, creado_en: new Date().toISOString() },
  { id: 'c8',  nombre: 'Juan Carlos Morales',           telefono: '5890-1234',  email: 'jcmorales@gmail.com',   nit: '67890123', tipo: 'frecuente', activo: true, creado_en: new Date().toISOString() },
  { id: 'c9',  nombre: 'Inmobiliaria Vista Verde',      telefono: '2678-9012',  email: 'compras@vistaverde.gt', nit: '56789012', tipo: 'empresa',   activo: true, creado_en: new Date().toISOString() },
  { id: 'c10', nombre: 'Roberto Ajú',                   telefono: '5234-5678',  email: '',                      nit: 'CF',       tipo: 'natural',   activo: true, creado_en: new Date().toISOString() },
]

// ── Helpers de seed ──────────────────────────────────────────────────────────
const it = (pid, cod, nom, precio, cant) => ({
  producto_id: pid, nombre: nom, codigo: cod,
  precio_unitario: precio, cantidad: cant,
  subtotal: Math.round(precio * cant * 100) / 100,
})
const vt = (id, num, fecha, cid, mpago, items, estado = 'completada', pedido = null) => {
  const subtotal = Math.round(items.reduce((s, i) => s + i.subtotal, 0) * 100) / 100
  const impuesto = Math.round(subtotal * 0.12 * 100) / 100
  return {
    id, numero_venta: `VTA-${String(num).padStart(6, '0')}`,
    fecha, estado, cliente_id: cid, metodo_pago: mpago,
    items, subtotal, descuento: 0, impuesto, total: subtotal + impuesto, notas: '',
    ...(pedido ? { es_pedido: true, estado_despacho: pedido.estado, direccion_entrega: pedido.dir, notas_despacho: pedido.notas || '' } : {}),
  }
}
const mt = (id, pid, tipo, cant, motivo, ref, fecha) => ({ id, producto_id: pid, tipo, cantidad: cant, motivo, referencia: ref, fecha })

const VENTAS_SEED = [
  // ── Febrero 2026 ─────────────────────────────────────────────────────────────
  vt('vs01',  1, '2026-02-03T09:15:00.000Z', 'c1', 'efectivo',
    [it('p001','HM-001','Martillo de Carpintero 16oz',65,2), it('p008','HM-008','Cinta Métrica 5m',38,1), it('p037','TF-002','Clavos 3" (libra)',15,2)]),

  vt('vs02',  2, '2026-02-05T14:30:00.000Z', 'c3', 'tarjeta',
    [it('p011','HE-001','Taladro Percutor 1/2" 750W',580,1), it('p017','AH-001','Brocas para Concreto Set 5 piezas',80,1), it('p018','AH-002','Disco de Corte 4.5" (c/u)',18,4)]),

  vt('vs03',  3, '2026-02-07T10:00:00.000Z', 'c1', 'efectivo',
    [it('p023','MC-001','Cemento Gris Saco 42.5kg',98,5), it('p037','TF-002','Clavos 3" (libra)',15,3), it('p030','ME-004','Alambre de Amarre Rollo 1kg',35,2)]),

  vt('vs04',  4, '2026-02-10T11:45:00.000Z', 'c2', 'transferencia',
    [it('p027','ME-001','Hierro Corrugado 3/8" x 6m',62,20), it('p028','ME-002','Hierro Corrugado 1/2" x 6m',98,10), it('p029','ME-003','Malla Electrosoldada 2x4m',295,5), it('p030','ME-004','Alambre de Amarre Rollo 1kg',35,10)],
    'completada', { estado: 'entregado', dir: '3a Calle 5-48 Zona 1, Guatemala City', notas: 'Entregar en bodega principal' }),

  vt('vs05',  5, '2026-02-10T14:00:00.000Z', 'c1', 'efectivo',
    [it('p094','CM-001','Tabla de Pino 1"x6"x8\'',80,2), it('p095','CM-002','Triplay 1/4" 4x8\'',245,1), it('p097','CM-004','Barniz Brillante 1L',95,1)]),

  vt('vs06',  6, '2026-02-12T08:30:00.000Z', 'c1', 'efectivo',
    [it('p057','PA-001','Pintura Blanca Látex 1 galón',130,2), it('p060','PA-004','Brocha de Cerda 3"',35,1), it('p061','PA-005','Rodillo para Pintura 9"',48,1)]),

  vt('vs07',  7, '2026-02-14T16:00:00.000Z', 'c8', 'efectivo',
    [it('p043','PL-001','Tubo PVC 1/2" x 6m',55,3), it('p045','PL-003','Codo PVC 1/2" 90°',5,5), it('p046','PL-004','Tee PVC 1/2"',7,3), it('p047','PL-005','Llave de Paso 1/2" HH',52,2), it('p048','PL-006','Pegamento PVC 250ml',42,1), it('p049','PL-007','Cinta Teflón (rollo)',9,2)]),

  vt('vs08',  8, '2026-02-17T09:30:00.000Z', 'c7', 'transferencia',
    [it('p044','PL-002','Tubo PVC 3/4" x 6m',78,5), it('p045','PL-003','Codo PVC 1/2" 90°',5,10), it('p046','PL-004','Tee PVC 1/2"',7,5), it('p047','PL-005','Llave de Paso 1/2" HH',52,3), it('p048','PL-006','Pegamento PVC 250ml',42,2), it('p049','PL-007','Cinta Teflón (rollo)',9,5)]),

  vt('vs09',  9, '2026-02-17T15:00:00.000Z', 'c1', 'efectivo',
    [it('p063','PA-007','Espátula Metálica 4"',24,1), it('p057','PA-001','Pintura Blanca Látex 1 galón',130,1), it('p060','PA-004','Brocha de Cerda 3"',35,1), it('p062','PA-006','Thinner Corriente 1L',52,1)]),

  vt('vs10', 10, '2026-02-19T11:00:00.000Z', 'c1', 'efectivo',
    [it('p037','TF-002','Clavos 3" (libra)',15,3), it('p038','TF-003','Clavos 4" (libra)',16,2), it('p001','HM-001','Martillo de Carpintero 16oz',65,1), it('p041','TF-006','Tarugos Plásticos #8 (50u)',16,2)]),

  vt('vs11', 11, '2026-02-21T09:00:00.000Z', 'c1', 'efectivo',
    [it('p073','SI-002','Casco de Seguridad ANSI',82,1), it('p072','SI-001','Guantes de Trabajo Cuero',52,1), it('p074','SI-003','Lentes de Protección',42,1), it('p076','SI-005','Chaleco Reflectivo',68,1)]),

  vt('vs12', 12, '2026-02-21T14:15:00.000Z', 'c5', 'credito',
    [it('p023','MC-001','Cemento Gris Saco 42.5kg',98,30), it('p025','MC-003','Block de Concreto 15x20x40',9,20), it('p027','ME-001','Hierro Corrugado 3/8" x 6m',62,10), it('p028','ME-002','Hierro Corrugado 1/2" x 6m',98,5)],
    'completada', { estado: 'entregado', dir: 'Km 18.5 Carretera al Atlántico, Zona Industrial', notas: 'Avisar con 1 día de anticipación' }),

  vt('vs13', 13, '2026-02-24T10:30:00.000Z', 'c1', 'tarjeta',
    [it('p052','EL-003','Breaker 1x20A',82,2), it('p053','EL-004','Tomacorriente Doble Polo a Tierra',35,4), it('p054','EL-005','Interruptor Simple',25,3), it('p050','EL-001','Cable THHN #12 Rollo 100m',520,1)]),

  vt('vs14', 14, '2026-02-26T13:00:00.000Z', 'c6', 'tarjeta',
    [it('p013','HE-003','Pulidora Angular 4.5" 900W',450,1), it('p018','AH-002','Disco de Corte 4.5" (c/u)',18,5), it('p022','AH-006','Extensión Eléctrica 10m',145,1)]),

  vt('vs15', 15, '2026-02-28T08:00:00.000Z', 'c2', 'transferencia',
    [it('p035','MT-004','Perfil Metálico 2x4" 6m',160,10), it('p032','MT-001','Lámina Galvanizada Cal.26 3m',155,20), it('p034','MT-003','Tornillos para Techo c/Hule (100u)',42,10)],
    'completada', { estado: 'entregado', dir: '5a Avenida 12-34 Zona 9, Guatemala', notas: 'Entregar en obra' }),

  vt('vs16', 16, '2026-02-28T15:30:00.000Z', 'c1', 'efectivo',
    [it('p069','SC-002','Cerradura Pomo Interior',145,1), it('p070','SC-003','Bisagras 3.5" Amarillas (par)',42,2), it('p068','SC-001','Candado 40mm Acero',62,1)]),

  // ── Marzo 2026 ───────────────────────────────────────────────────────────────
  vt('vs17', 17, '2026-03-03T09:00:00.000Z', 'c2', 'transferencia',
    [it('p032','MT-001','Lámina Galvanizada Cal.26 3m',155,15), it('p035','MT-004','Perfil Metálico 2x4" 6m',160,10), it('p034','MT-003','Tornillos para Techo c/Hule (100u)',42,5), it('p033','MT-002','Canaleta de PVC 3m',80,3)],
    'completada', { estado: 'en_preparacion', dir: 'Colonia El Maestro Calle 3 Lote 15, Villa Nueva', notas: '' }),

  vt('vs18', 18, '2026-03-03T10:30:00.000Z', 'c1', 'efectivo',
    [it('p086','AQ-001','Silicona Transparente 280ml',42,1), it('p088','AQ-003','Sellador de Silicona Blanco',48,1), it('p089','AQ-004','Espuma Expansiva 500ml',68,1)]),

  vt('vs19', 19, '2026-03-05T11:30:00.000Z', 'c1', 'efectivo',
    [it('p002','HM-002','Destornillador Phillips #2',28,1), it('p008','HM-008','Cinta Métrica 5m',38,1), it('p009','HM-009','Nivel de Aluminio 24"',120,1), it('p036','TF-001','Tornillos para Madera 1.5" (100u)',22,2)]),

  vt('vs20', 20, '2026-03-07T08:45:00.000Z', 'c9', 'transferencia',
    [it('p064','AC-001','Piso Cerámico 33x33 (caja)',155,5), it('p065','AC-002','Pegamento para Piso Saco 20kg',82,3), it('p066','AC-003','Boquilla Blanca 1kg',35,2)]),

  vt('vs21', 21, '2026-03-07T11:00:00.000Z', 'c1', 'efectivo',
    [it('p077','JA-001','Machete 18" Mango Madera',80,1), it('p078','JA-002','Tijeras de Podar 8"',115,1), it('p079','JA-003','Manguera 1/2" x 15m',145,1)]),

  vt('vs22', 22, '2026-03-10T10:00:00.000Z', 'c8', 'efectivo',
    [it('p055','EL-006','Bombilla LED 9W E27',28,3), it('p056','EL-007','Caja Cuadrada 4"',18,2), it('p054','EL-005','Interruptor Simple',25,1), it('p053','EL-004','Tomacorriente Doble Polo a Tierra',35,2)]),

  vt('vs23', 23, '2026-03-12T09:00:00.000Z', 'c4', 'transferencia',
    [it('p011','HE-001','Taladro Percutor 1/2" 750W',580,3), it('p017','AH-001','Brocas para Concreto Set 5 piezas',80,3), it('p013','HE-003','Pulidora Angular 4.5" 900W',450,2), it('p015','HE-005','Lijadora Orbital 200W',460,2)]),

  vt('vs24', 24, '2026-03-12T14:00:00.000Z', 'c1', 'efectivo',
    [it('p090','LM-001','Escoba de Palma',52,1), it('p091','LM-002','Trapeador de Algodón',62,1), it('p092','LM-003','Balde Plástico 12L',42,2), it('p093','LM-004','Detergente Industrial 1kg',52,1)]),

  vt('vs25', 25, '2026-03-14T09:30:00.000Z', 'c3', 'tarjeta',
    [it('p014','HE-004','Sierra Circular 7.1/4" 1400W',850,1), it('p018','AH-002','Disco de Corte 4.5" (c/u)',18,5), it('p019','AH-003','Lija de Agua #120',7,3)]),

  vt('vs26', 26, '2026-03-14T11:00:00.000Z', 'c1', 'efectivo',
    [it('p036','TF-001','Tornillos para Madera 1.5" (100u)',22,5), it('p037','TF-002','Clavos 3" (libra)',15,3), it('p039','TF-004','Pernos Galvanizados 1/2" (10u)',35,2), it('p042','TF-007','Arandelas 1/2" (25u)',14,5)]),

  vt('vs27', 27, '2026-03-17T11:00:00.000Z', 'c1', 'efectivo',
    [it('p023','MC-001','Cemento Gris Saco 42.5kg',98,10), it('p030','ME-004','Alambre de Amarre Rollo 1kg',35,5), it('p025','MC-003','Block de Concreto 15x20x40',9,100)]),

  vt('vs28', 28, '2026-03-17T14:00:00.000Z', 'c7', 'transferencia',
    [it('p044','PL-002','Tubo PVC 3/4" x 6m',78,3), it('p045','PL-003','Codo PVC 1/2" 90°',5,6), it('p047','PL-005','Llave de Paso 1/2" HH',52,2), it('p048','PL-006','Pegamento PVC 250ml',42,2)]),

  vt('vs29', 29, '2026-03-19T15:00:00.000Z', 'c4', 'transferencia',
    [it('p001','HM-001','Martillo de Carpintero 16oz',65,5), it('p002','HM-002','Destornillador Phillips #2',28,5), it('p008','HM-008','Cinta Métrica 5m',38,5), it('p009','HM-009','Nivel de Aluminio 24"',120,3), it('p010','HM-010','Llave Allen Set 9 piezas',52,5)]),

  vt('vs30', 30, '2026-03-19T16:00:00.000Z', 'c9', 'transferencia',
    [it('p064','AC-001','Piso Cerámico 33x33 (caja)',155,10), it('p065','AC-002','Pegamento para Piso Saco 20kg',82,5), it('p066','AC-003','Boquilla Blanca 1kg',35,3), it('p067','AC-004','Yeso Construcción 1kg',22,2)],
    'completada', { estado: 'entregado', dir: 'Residencial Montecarlo Blvd. Principal Casa 12, Mixco', notas: 'Llamar antes de entregar' }),

  vt('vs31', 31, '2026-03-21T08:30:00.000Z', 'c1', 'efectivo',
    [it('p072','SI-001','Guantes de Trabajo Cuero',52,2), it('p073','SI-002','Casco de Seguridad ANSI',82,1), it('p074','SI-003','Lentes de Protección',42,1)]),

  vt('vs32', 32, '2026-03-21T14:15:00.000Z', 'c5', 'credito',
    [it('p023','MC-001','Cemento Gris Saco 42.5kg',98,50), it('p025','MC-003','Block de Concreto 15x20x40',9,200), it('p027','ME-001','Hierro Corrugado 3/8" x 6m',62,20), it('p028','ME-002','Hierro Corrugado 1/2" x 6m',98,10), it('p032','MT-001','Lámina Galvanizada Cal.26 3m',155,10)],
    'completada', { estado: 'listo', dir: 'Aldea El Progreso km 32 Carretera a Escuintla', notas: 'Confirmar antes del despacho' }),

  vt('vs33', 33, '2026-03-21T11:00:00.000Z', 'c1', 'efectivo',
    [it('p099','ES-002','Compresor de Aire 25L',1950,1)],
    'cancelada'),

  vt('vs34', 34, '2026-03-24T10:15:00.000Z', 'c6', 'tarjeta',
    [it('p057','PA-001','Pintura Blanca Látex 1 galón',130,3), it('p059','PA-003','Pintura Anticorrosiva 1L',98,1), it('p060','PA-004','Brocha de Cerda 3"',35,2), it('p061','PA-005','Rodillo para Pintura 9"',48,1), it('p062','PA-006','Thinner Corriente 1L',52,1)]),

  vt('vs35', 35, '2026-03-24T11:30:00.000Z', 'c1', 'efectivo',
    [it('p037','TF-002','Clavos 3" (libra)',15,5), it('p038','TF-003','Clavos 4" (libra)',16,3), it('p036','TF-001','Tornillos para Madera 1.5" (100u)',22,2)]),

  vt('vs36', 36, '2026-03-24T14:00:00.000Z', 'c10','efectivo',
    [it('p082','AG-001','Azadón Mediano Mango 1.5m',115,1), it('p083','AG-002','Piocha Mango 1.5m',125,1), it('p084','AG-003','Pala Cuadrada Mango Largo',120,1)]),

  vt('vs37', 37, '2026-03-24T16:00:00.000Z', 'c3', 'tarjeta',
    [it('p016','HE-006','Atornillador Inalámbrico 12V',620,1), it('p020','AH-004','Puntas Destornillador PH2 Set 10',35,2)]),

  // ── Hoy (2026-03-26) ─────────────────────────────────────────────────────────
  vt('vs38', 38, '2026-03-26T09:00:00.000Z', 'c1', 'efectivo',
    [it('p001','HM-001','Martillo de Carpintero 16oz',65,1), it('p002','HM-002','Destornillador Phillips #2',28,2), it('p008','HM-008','Cinta Métrica 5m',38,1)]),

  vt('vs39', 39, '2026-03-26T10:30:00.000Z', 'c8', 'efectivo',
    [it('p043','PL-001','Tubo PVC 1/2" x 6m',55,4), it('p045','PL-003','Codo PVC 1/2" 90°',5,8), it('p046','PL-004','Tee PVC 1/2"',7,4), it('p048','PL-006','Pegamento PVC 250ml',42,1), it('p049','PL-007','Cinta Teflón (rollo)',9,3)]),

  vt('vs40', 40, '2026-03-26T11:00:00.000Z', 'c1', 'tarjeta',
    [it('p055','EL-006','Bombilla LED 9W E27',28,2), it('p052','EL-003','Breaker 1x20A',82,1), it('p053','EL-004','Tomacorriente Doble Polo a Tierra',35,2)]),

  vt('vs41', 41, '2026-03-26T14:00:00.000Z', 'c5', 'credito',
    [it('p023','MC-001','Cemento Gris Saco 42.5kg',98,20), it('p025','MC-003','Block de Concreto 15x20x40',9,100)],
    'completada', { estado: 'pendiente', dir: 'Colonia Primavera Lote 8, San Miguel Petapa', notas: 'Entregar el lunes por la mañana' }),
]

const MOVIMIENTOS_SEED = [
  // ── Compras a proveedores ─────────────────────────────────────────────────────
  mt('ms01','p023','entrada',100,'compra proveedor','OC-001','2026-02-01T08:00:00.000Z'),
  mt('ms02','p027','entrada',100,'compra proveedor','OC-001','2026-02-01T08:00:00.000Z'),
  mt('ms03','p028','entrada', 80,'compra proveedor','OC-001','2026-02-01T08:00:00.000Z'),
  mt('ms04','p032','entrada', 60,'compra proveedor','OC-002','2026-02-08T08:00:00.000Z'),
  mt('ms05','p035','entrada', 40,'compra proveedor','OC-002','2026-02-08T08:00:00.000Z'),
  mt('ms06','p057','entrada', 30,'compra proveedor','OC-002','2026-02-08T08:00:00.000Z'),
  mt('ms07','p050','entrada', 10,'compra proveedor','OC-003','2026-02-15T08:00:00.000Z'),
  mt('ms08','p043','entrada', 40,'compra proveedor','OC-003','2026-02-15T08:00:00.000Z'),
  mt('ms09','p011','entrada',  5,'compra proveedor','OC-004','2026-03-01T08:00:00.000Z'),
  mt('ms10','p023','entrada',150,'compra proveedor','OC-005','2026-03-08T08:00:00.000Z'),
  mt('ms11','p025','entrada',800,'compra proveedor','OC-005','2026-03-08T08:00:00.000Z'),
  mt('ms12','p064','entrada', 60,'compra proveedor','OC-006','2026-03-15T08:00:00.000Z'),
  mt('ms13','p032','entrada', 50,'compra proveedor','OC-006','2026-03-15T08:00:00.000Z'),
  mt('ms14','p001','entrada', 30,'compra proveedor','OC-007','2026-03-20T08:00:00.000Z'),
  mt('ms15','p018','entrada',200,'compra proveedor','OC-007','2026-03-20T08:00:00.000Z'),
  mt('ms16','p037','entrada', 50,'compra proveedor','OC-008','2026-03-22T08:00:00.000Z'),
  // ── Ajustes de inventario ─────────────────────────────────────────────────────
  mt('ms17','p025','salida',  30,'merma / daño en bodega','AJUSTE-001','2026-03-10T08:00:00.000Z'),
  mt('ms18','p023','salida',   5,'muestra para cliente',  'MUESTRA-001','2026-03-05T08:00:00.000Z'),
]

// ── Provider ─────────────────────────────────────────────────────────────────
export function AppProvider({ children }) {
  const [productos, setProductos]           = useLocalStorage('ferreapp_productos', PRODUCTOS_SEED)
  const [ventas, setVentas]                 = useLocalStorage('ferreapp_ventas', VENTAS_SEED)
  const [clientes, setClientes]             = useLocalStorage('ferreapp_clientes', CLIENTES_SEED)
  const [movimientos, setMovimientos]       = useLocalStorage('ferreapp_movimientos', MOVIMIENTOS_SEED)

  // ── PRODUCTOS ──────────────────────────────────────────────────────────────
  const agregarProducto = useCallback((data) => {
    const nuevo = {
      ...data,
      id: `p-${shortId()}`,
      codigo: data.codigo || generateCodigoProducto(),
      activo: true,
      creado_en: new Date().toISOString(),
    }
    setProductos(prev => [...prev, nuevo])
    db.insert('productos', nuevo)
    return nuevo
  }, [setProductos])

  const editarProducto = useCallback((id, data) => {
    const cambios = { ...data, actualizado_en: new Date().toISOString() }
    setProductos(prev => prev.map(p => p.id === id ? { ...p, ...cambios } : p))
    db.update('productos', id, cambios)
  }, [setProductos])

  const eliminarProducto = useCallback((id) => {
    setProductos(prev => prev.map(p => p.id === id ? { ...p, activo: false } : p))
    db.remove('productos', id)
  }, [setProductos])

  const ajustarStock = useCallback((productoId, cantidad, tipo, motivo = '', referencia = '') => {
    setProductos(prev => prev.map(p => {
      if (p.id !== productoId) return p
      const delta = tipo === 'entrada' ? cantidad : -cantidad
      const actualizado = { ...p, stock: Math.max(0, p.stock + delta) }
      db.update('productos', productoId, { stock: actualizado.stock })
      return actualizado
    }))
    const mov = {
      id: `mov-${shortId()}`,
      producto_id: productoId,
      tipo,
      cantidad,
      motivo,
      referencia,
      fecha: new Date().toISOString(),
    }
    setMovimientos(prev => [mov, ...prev])
    db.insert('movimientos', mov)
  }, [setProductos, setMovimientos])

  // ── VENTAS ─────────────────────────────────────────────────────────────────
  const crearVenta = useCallback((data) => {
    const numero = generateNumeroVenta(ventas.length + 1)
    const esPedido = !!data.es_pedido
    const nueva = {
      ...data,
      id: `v-${shortId()}`,
      numero_venta: numero,
      fecha: new Date().toISOString(),
      estado: 'completada',
      // campos de despacho — solo presentes si es pedido
      ...(esPedido && {
        es_pedido: true,
        estado_despacho: 'pendiente',
        direccion_entrega: data.direccion_entrega || '',
        notas_despacho: data.notas_despacho || '',
      }),
    }
    setVentas(prev => [nueva, ...prev])
    db.insert('ventas', nueva)
    nueva.items.forEach(item => {
      ajustarStock(item.producto_id, item.cantidad, 'salida', esPedido ? 'pedido' : 'venta', numero)
    })
    return nueva
  }, [ventas.length, setVentas, ajustarStock])

  const cancelarVenta = useCallback((id) => {
    const venta = ventas.find(v => v.id === id)
    if (!venta || venta.estado === 'cancelada') return
    setVentas(prev => prev.map(v => v.id === id ? { ...v, estado: 'cancelada' } : v))
    db.update('ventas', id, { estado: 'cancelada' })
    venta.items.forEach(item => {
      ajustarStock(item.producto_id, item.cantidad, 'entrada', 'cancelacion', venta.numero_venta)
    })
  }, [ventas, setVentas, ajustarStock])

  const actualizarDespacho = useCallback((id, updates) => {
    setVentas(prev => prev.map(v => v.id === id ? { ...v, ...updates } : v))
    db.update('ventas', id, updates)
  }, [setVentas])

  // ── CLIENTES ───────────────────────────────────────────────────────────────
  const agregarCliente = useCallback((data) => {
    const nuevo = {
      ...data,
      id: `c-${shortId()}`,
      activo: true,
      creado_en: new Date().toISOString(),
    }
    setClientes(prev => [...prev, nuevo])
    db.insert('clientes', nuevo)
    return nuevo
  }, [setClientes])

  const editarCliente = useCallback((id, data) => {
    setClientes(prev => prev.map(c => c.id === id ? { ...c, ...data } : c))
    db.update('clientes', id, data)
  }, [setClientes])

  const eliminarCliente = useCallback((id) => {
    if (id === 'c1') return // CF no se elimina
    setClientes(prev => prev.map(c => c.id === id ? { ...c, activo: false } : c))
    db.remove('clientes', id)
  }, [setClientes])

  // ── Stats ──────────────────────────────────────────────────────────────────
  const productosActivos    = productos.filter(p => p.activo)
  const productosStockBajo  = productosActivos.filter(p => p.stock <= p.stock_minimo)
  const clientesActivos     = clientes.filter(c => c.activo)
  const ventasCompletadas   = ventas.filter(v => v.estado === 'completada')
  const totalVentasHoy      = (() => {
    const hoy = new Date().toDateString()
    return ventasCompletadas
      .filter(v => new Date(v.fecha).toDateString() === hoy)
      .reduce((acc, v) => acc + v.total, 0)
  })()

  return (
    <AppContext.Provider value={{
      // Data
      productos: productosActivos,
      ventas,
      clientes: clientesActivos,
      movimientos,
      // Acciones productos
      agregarProducto, editarProducto, eliminarProducto, ajustarStock,
      // Acciones ventas
      crearVenta, cancelarVenta, actualizarDespacho,
      // Acciones clientes
      agregarCliente, editarCliente, eliminarCliente,
      // Stats
      productosStockBajo,
      totalVentasHoy,
      totalProductos: productosActivos.length,
      totalClientes: clientesActivos.length,
      totalVentas: ventasCompletadas.length,
    }}>
      {children}
    </AppContext.Provider>
  )
}

export function useApp() {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp debe usarse dentro de <AppProvider>')
  return ctx
}
