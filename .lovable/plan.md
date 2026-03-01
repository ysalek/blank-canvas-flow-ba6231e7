
# Correcciones de Normativa Boliviana - Registros de Ventas, Compras e Impuestos

## Resumen

Tras revisar la normativa del SIN (Servicio de Impuestos Nacionales) y comparar con el sistema actual, se identificaron **7 problemas** que afectan el cumplimiento tributario. Los cambios abarcan el Libro de Compras y Ventas, los asientos contables, la compensacion mensual del IVA y la generacion del IT en compras.

---

## Problemas Detectados

### 1. Libro de Ventas: Debito Fiscal calculado incorrectamente
- **Archivo**: `LibroComprasVentasModule.tsx` (linea 43)
- **Problema**: El debito fiscal se calcula como `f.total * 0.13`, lo que da un 13% extra sobre el total que YA incluye IVA. Segun normativa SIN, el debito fiscal = `Importe Base para DF * 13%`, donde la base = `total / 1.13`
- **Ejemplo**: Factura de Bs 1,130. Actual: DF = 146.90 (incorrecto). Correcto: DF = 130.00
- **Solucion**: Cambiar a `(f.total / 1.13) * 0.13` o equivalentemente `f.total - (f.total / 1.13)`

### 2. Libro de Ventas: Subtotal incorrecto
- **Archivo**: `LibroComprasVentasModule.tsx` (linea 42)
- **Problema**: El campo `subtotal` usa `f.subtotal || f.total`, pero segun el formato SIN, el Subtotal del Libro de Ventas debe ser el Importe Total menos ICE, IEHD, IPJ, Tasas, Exentos, Tasa Cero. Para ventas estandar sin esos conceptos, Subtotal = Importe Total (esto esta parcialmente correcto pero necesita ser explicito)
- **Solucion**: Definir `subtotal: f.total` (igual al importe total para ventas estandar) y calcular `importeBaseDF: f.total` (sin descuentos ni gift cards) y `debitoFiscal: f.total * 13 / 113`

### 3. Libro de Ventas: Faltan columnas obligatorias del SIN
- **Archivo**: `LibroComprasVentasModule.tsx`
- **Problema**: El formato SIAT exige 24 columnas para Ventas Estandar. Faltan: Complemento (col 7), IEHD (col 11), IPJ (col 12), Tasas (col 13), Otros no sujetos al IVA (col 14), Exportaciones/Exentas (col 15), Ventas Tasa Cero (col 16), Descuentos/Bonificaciones (col 18), Gift Card (col 19), Importe Base DF (col 20), Estado (col 22), Tipo Venta (col 24)
- **Solucion**: Agregar las columnas faltantes en la tabla y en la exportacion TXT

### 4. Libro de Compras: No esta implementado
- **Archivo**: `LibroComprasVentasModule.tsx` (linea 77)
- **Problema**: El Libro de Compras esta vacio (`const contenido = ''`). Segun el SIN requiere 23 columnas incluyendo: NIT Proveedor, Razon Social, Codigo Autorizacion, Numero Factura, DUI/DIM, Fecha, Importe Total, ICE, IEHD, IPJ, Tasas, Otros no sujetos, Exentos, Tasa Cero, Subtotal, Descuentos, Gift Card, Importe Base CF, Credito Fiscal, Tipo Compra, Codigo Control
- **Solucion**: Conectar con el modulo de compras (`useFacturas` o compras de Supabase) y generar la tabla y exportacion TXT completa

### 5. Asiento de Venta: Falta el asiento de Costo de Ventas
- **Archivo**: `useAsientosGenerator.ts` - `generarAsientoVenta`
- **Problema**: Al registrar una venta, solo se genera el asiento de ingreso (Cuentas por Cobrar / Ventas / IVA DF) y el IT, pero NO se genera automaticamente el asiento de Costo de Ventas que descarga inventario. Segun normativa boliviana, toda venta de mercaderia debe registrar simultaneamente el reconocimiento del costo
- **Solucion**: Agregar generacion automatica del asiento de costo de ventas (Debito: 5111 Costo de Ventas, Credito: 1131 Inventarios) por cada producto vendido, usando el costo promedio ponderado

### 6. Compensacion mensual IVA: No existe
- **Problema**: No hay funcion para generar el asiento de compensacion mensual del IVA (Debito Fiscal vs Credito Fiscal) que es obligatorio segun Art. 7, 8 y 9 de la Ley 843. Al cierre de cada mes se debe:
  - Si DF > CF: Debitar IVA Debito Fiscal (2113), Acreditar IVA Credito Fiscal (1142), Acreditar IVA por Pagar (2113) por la diferencia
  - Si CF > DF: El saldo a favor se arrastra al siguiente periodo con actualizacion UFV
- **Solucion**: Agregar funcion `generarAsientoCompensacionIVA` en `useAsientosGenerator.ts` y un boton en el modulo de Declaracion IVA para generar este asiento

### 7. Datos iniciales de factura: IVA calculado incorrectamente
- **Archivo**: `BillingData.ts` (linea 119)
- **Problema**: La factura de ejemplo tiene `subtotal: 4200`, `iva: 546`, `total: 4746`. Esto implica que el IVA se calcula SOBRE el subtotal (4200 * 0.13 = 546), sumandolo al precio. Pero en Bolivia el IVA esta INCLUIDO en el precio. El total deberia ser 4200, con IVA = 4200/1.13*0.13 = 483.19
- **Solucion**: Corregir los datos de ejemplo para reflejar que en Bolivia los precios ya incluyen IVA

---

## Detalle Tecnico de Cambios

### Archivo 1: `src/components/contable/libros/LibroComprasVentasModule.tsx`
- Corregir calculo de debito fiscal en ventas: `debitoFiscal: Number(((f.total / 1.13) * 0.13).toFixed(2))`
- Agregar columnas faltantes del formato SIN (Complemento, IEHD, IPJ, Tasas, Otros no sujetos, Exportaciones/Exentas, Tasa Cero, Descuentos, Gift Card, Importe Base DF, Estado, Tipo Venta)
- Implementar Libro de Compras conectando con datos de compras de Supabase
- Actualizar exportacion TXT con las 24 columnas de ventas y 23 de compras
- Agregar campo Estado (V=Valida, A=Anulada) en la tabla de ventas

### Archivo 2: `src/hooks/useAsientosGenerator.ts`
- En `generarAsientoVenta`: agregar generacion del asiento de Costo de Ventas automatico (5111/1131) recorriendo items de la factura
- Agregar nueva funcion `generarAsientoCompensacionIVA(periodo)` para el cierre mensual

### Archivo 3: `src/components/contable/billing/BillingData.ts`
- Corregir datos de factura de ejemplo: total = subtotal (precio con IVA incluido), iva = total - total/1.13

### Archivo 4: `src/components/contable/DeclaracionIVA.tsx`
- Agregar boton para generar asiento contable de compensacion IVA del periodo

---

## Orden de Implementacion

1. Corregir calculo de Debito Fiscal en Libro de Ventas (critico - afecta declaraciones)
2. Agregar columnas SIN faltantes en Libro de Ventas
3. Implementar Libro de Compras funcional
4. Agregar asiento de Costo de Ventas automatico en ventas
5. Implementar compensacion mensual IVA
6. Corregir datos de ejemplo en BillingData
