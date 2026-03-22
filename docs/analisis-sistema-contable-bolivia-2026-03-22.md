# Analisis del Sistema Contable Boliviano

Fecha: 2026-03-22

## 1. Objetivo del analisis

Este documento resume una auditoria funcional, contable y de arquitectura del sistema actual, con enfoque en:

- Adecuacion a un ERP contable boliviano serio.
- Riesgos de auditoria y control interno.
- Brechas entre el estado actual del producto y un sistema de excelencia para Bolivia.
- Hoja de ruta para evolucionarlo tanto grafica como funcionalmente.

## 2. Conclusión ejecutiva

El sistema tiene una base prometedora como producto SaaS contable boliviano:

- Tiene buena cobertura visual de modulos clave: facturacion, compras, inventario, libro diario, libro mayor, balance general, IVA, cumplimiento, activos fijos, bancos, nomina y auditoria.
- Ya existe un nucleo transaccional en Supabase para facturas, asientos, cuentas de asiento, productos, compras y movimientos de inventario.
- El producto comunica bien la propuesta de valor de "ContaBolivia".

Pero hoy el sistema todavia no puede considerarse un sistema contable boliviano de excelencia ni uno listo para una auditoria fuerte o una operacion tributaria real.

Las principales razones son:

1. Varias integraciones criticas con el SIN estan simuladas, no implementadas.
2. Parte del sistema persiste en Supabase y otra parte en `localStorage`, lo que rompe trazabilidad, consistencia y auditabilidad.
3. Las reglas contables viven principalmente en frontend, no en controles fuertes de base de datos ni en un motor contable central.
4. Hay modulos que presentan cumplimiento normativo "aparente", pero con datos mock o actualizaciones simuladas.
5. Existen decisiones funcionales que maquillan diferencias contables en vez de exponerlas para correccion.

## 3. Hallazgos principales del codigo

### 3.1 Fortalezas actuales

- Enrutamiento modular amplio en `src/pages/Index.tsx`.
- Nucleo de asientos persistidos en Supabase mediante `src/hooks/useAsientos.ts`.
- Generacion automatica de asientos para ventas, compras, pagos, anulaciones e inventario en `src/hooks/useAsientosGenerator.ts`.
- Reportes base de balance, mayor, comprobacion e IVA en `src/hooks/useReportesContables.ts`.
- Esquema transaccional relevante en `supabase/migrations/20250825203207_7042bfc4-3b0e-433a-9044-56fb4b4e9c63.sql`.
- Buen trabajo inicial en RLS y segregacion por `user_id` en varias tablas sensibles.

### 3.2 Brechas criticas

#### A. Integracion SIN simulada

El sistema hoy no se conecta realmente con servicios del SIN.

Evidencia:

- `src/components/contable/FacturacionModule.tsx` usa `simularValidacionSIN`.
- `src/components/contable/billing/BillingData.ts` genera CUF/CUFD de forma artificial y simula aceptacion/rechazo.
- `src/components/contable/facturacion/FacturacionElectronicaModule.tsx` simula conexion, CUFD y envio al SIN.
- `src/components/contable/ConfiguracionModule.tsx` tambien maneja pruebas de conexion simuladas.

Impacto:

- No existe autorizacion real de sistemas.
- No existe ciclo real de CUIS/CUFD.
- No existe firma, recepcion oficial, anulacion oficial, contingencia ni validacion por catalogos oficiales.
- No puede sostener facturacion electronica productiva.

#### B. Persistencia mixta y reportes inconsistentes

Una parte importante del sistema opera con Supabase y otra con `localStorage`.

Evidencia:

- Supabase: `useFacturas`, `useAsientos`, `useProductosValidated`, tablas transaccionales.
- `localStorage`: modulos de cuentas por cobrar/pagar, cashflow, cumplimiento simulado, centros de costo, POS, analisis, retenciones, backup local, configuraciones y varios dashboards.

Impacto:

- Dos usuarios pueden ver verdades distintas.
- Los reportes no siempre nacen de la misma fuente.
- La auditoria no puede confiar en un universo unico de datos.
- El cierre contable puede salir distinto al operacional.

#### C. Motor contable demasiado dependiente del frontend

La partida doble se valida en frontend, pero la base de datos no muestra un motor contable duro que imponga:

- integridad de asiento,
- bloqueo por periodos,
- secuencias oficiales,
- reversas controladas,
- inmutabilidad de asientos registrados,
- trazabilidad de origen por modulo.

Impacto:

- Un asiento puede nacer correctamente pero luego ser modificado sin una politica contable fuerte.
- El backend no protege lo suficiente contra errores funcionales o manipulacion posterior.

#### D. Edicion de asientos con riesgo funcional

`src/components/contable/LibroDiario.tsx` usa `guardarAsiento(asientoEditando)` al "editar", pero `guardarAsiento` inserta un asiento nuevo en lugar de actualizar el existente.

Impacto:

- Riesgo de duplicar asientos.
- Riesgo de romper numeracion y trazabilidad.
- Riesgo de alterar reportes sin dejar una reversion formal.

#### E. Inventario maquillado en balance general

`src/hooks/useReportesContables.ts` calcula el inventario fisico y el contable y luego usa el mayor de ambos (`Math.max`).

Impacto:

- Oculta diferencias entre kardex y contabilidad.
- En auditoria, lo correcto es exponer la diferencia y obligar conciliacion, no absorberla silenciosamente.
- Puede presentar un balance "mejorado" en vez de un balance fiel.

#### F. Cumplimiento normativo con componentes mock

Aunque existe `src/services/normativaService.ts`, tambien hay modulos que crean o sincronizan normativas simuladas.

Evidencia:

- `src/components/contable/cumplimiento/CumplimientoNormativo2025.tsx` hace una "actualizacion" simulada y registra normativas ficticias.

Impacto:

- El modulo de cumplimiento no es una fuente juridica confiable.
- Puede inducir decisiones tributarias equivocadas si se toma como oficial.

#### G. Reglas tributarias duras y poco versionadas

Hay varias tasas y logicas fijas embebidas en el codigo:

- IVA 13%
- IT 3%
- IUE 25%
- RC-IVA 13%

Evidencia:

- `src/hooks/useAsientosGenerator.ts`
- `src/components/contable/billing/BillingData.ts`
- `src/utils/planCuentasBoliviano2025.ts`
- `src/services/normativaService.ts`

Impacto:

- Falta vigencia por fecha.
- Falta segmentacion por regimen, actividad, exencion, exportador, tasa cero u obligaciones personalizadas.
- El sistema necesita una capa de parametrizacion tributaria versionada.

#### H. Calendario tributario insuficiente

El sistema aun no refleja con rigor:

- vencimientos segun ultimo digito de NIT,
- cierre fiscal por actividad economica,
- obligaciones recurrentes personalizadas por RNC,
- diferencias entre obligaciones mensuales, anuales, informativas y sectoriales.

## 4. Contraste con Bolivia real

Con informacion oficial revisada hoy, un sistema boliviano de excelencia debe al menos contemplar lo siguiente:

### 4.1 Libros contables obligatorios

El Codigo de Comercio boliviano exige, como base, los libros Diario, Mayor e Inventarios y Balances, y exige que las operaciones se registren dia por dia, con cuentas deudoras y acreedoras, glosa clara y documentos de respaldo.

Relevancia para el sistema:

- El sistema debe manejar trazabilidad completa por asiento.
- No debe "editar" asientos registrados como si fueran registros administrativos comunes.
- Debe existir politica de anulacion, reversa y reemision.

### 4.2 RNC y obligaciones tributarias personalizadas

El RNC y SIAT en Linea hoy son el centro de asignacion y cumplimiento de obligaciones tributarias.

Relevancia para el sistema:

- El ERP no debe manejar un solo calendario tributario generico.
- Debe parametrizar obligaciones por tipo de contribuyente, actividad economica y cierre fiscal.

### 4.3 Declaraciones juradas por SIAT en Linea

Las DDJJ electronicas y las obligaciones recurrentes deben modelarse con sus formularios reales y sus validaciones por periodo.

Relevancia para el sistema:

- Formularios como IVA, IT, IUE y RC-IVA no deben ser solo "pantallas de ayuda".
- Deben derivar de datos cerrados y conciliados.

### 4.4 Facturacion en linea

La facturacion en linea no puede tratarse como un simulador. Debe operar con:

- catalogos oficiales,
- puntos de venta y sucursales reales,
- CUIS/CUFD,
- contingencias,
- estados oficiales,
- trazabilidad de eventos,
- recepcion y anulacion formal.

### 4.5 Registro auxiliar de ventas y compras

El SIAT publica estructuras concretas para registros auxiliares y servicios de registro de compras/ventas.

Relevancia para el sistema:

- El Libro Compras/Ventas debe construirse segun estructura oficial y no solo como tabla interna.
- Debe existir exportacion, validacion y conciliacion con facturacion.

## 5. Como deberia funcionar un sistema contable boliviano de excelencia

## 5.1 Principios rectores

1. Una sola fuente de verdad.
2. Partida doble inmutable una vez registrada.
3. Todo movimiento operativo debe tener origen, evidencia y efecto contable trazable.
4. Cumplimiento tributario parametrico y versionado.
5. Cierres contables y fiscales formales.
6. Auditoria completa: quien hizo que, cuando, desde que modulo y con que documento.

## 5.2 Arquitectura funcional objetivo

### Capa 1. Maestro empresarial

- Empresa y sucursales.
- Actividad economica principal y secundarias.
- Cierre fiscal asignado.
- Regimen tributario.
- Configuracion monetaria, UFV y tipo de cambio.
- Puntos de venta, dosificaciones y autorizaciones del SIN.

### Capa 2. Motor transaccional

- Ventas.
- Compras.
- Caja y bancos.
- Inventario.
- Activos fijos.
- Nomina.
- Cuentas por cobrar.
- Cuentas por pagar.
- Anticipos, retenciones, notas de credito/debito.

### Capa 3. Motor contable

- Plan de cuentas parametrico.
- Reglas de asiento por tipo de transaccion.
- Asientos automáticos y manuales.
- Numeracion unica.
- Periodos abiertos/cerrados.
- Reversiones formales.
- Trazabilidad de documento origen.

### Capa 4. Motor tributario boliviano

- Calendario segun NIT.
- Formularios y anexos aplicables.
- Control de IVA debito y credito.
- IT.
- IUE segun cierre fiscal.
- RC-IVA.
- Bancarizacion.
- Validaciones por actividad, exenciones y tasa cero.
- Registro de compras y ventas con estructura SIAT.

### Capa 5. Capa de auditoria y control interno

- Bitacora de eventos.
- Historial de cambios.
- Segregacion de funciones.
- Bloqueo de periodos.
- Evidencia documental.
- Alertas por descuadre, stock negativo, duplicidad, anulaciones, cambios tributarios y vencimientos.

## 6. Prioridades de desarrollo recomendadas

### Fase 1. Saneamiento funcional y contable

Objetivo: dejar de mezclar demo y produccion.

- Unificar fuentes de datos en Supabase.
- Retirar dependencias operativas de `localStorage`.
- Corregir edicion de asientos para que no inserte duplicados.
- Prohibir modificacion libre de asientos registrados.
- Exponer diferencias contable vs fisico de inventario en vez de absorberlas.
- Crear catalogo central de impuestos, formularios, periodos y cierres fiscales.

### Fase 2. Motor contable serio

Objetivo: que el sistema sea auditable.

- Crear reglas de asiento por tipo de documento.
- Agregar `source_type`, `source_id`, `periodo`, `estado_cierre` y `reversion_de` en asientos.
- Implementar cierres mensuales y anuales.
- Implementar secuencia formal de comprobantes y asientos.
- Crear conciliaciones entre factura, asiento, movimiento de inventario y cobranza.

### Fase 3. Motor tributario boliviano real

Objetivo: pasar de "cumplimiento narrado" a "cumplimiento operativo".

- Parametrizar obligaciones por actividad economica y tipo de contribuyente.
- Implementar calendario por terminacion NIT.
- Mejorar Formulario 200 con estructura trazable a registros auxiliares.
- Modelar IUE por cierre fiscal asignado, no como tarea generica fija.
- Modelar RC-IVA y retenciones con sus soportes.
- Incorporar bancarizacion y medios de pago.

### Fase 4. Integracion SIN real

Objetivo: facturacion electronica productiva.

- Sustituir simulaciones por adaptador real SIN.
- Gestionar CUIS, CUFD, catalogos, puntos de venta, eventos significativos y contingencia.
- Guardar payloads, respuestas, codigos de recepcion y estados oficiales.
- Generar representacion grafica y XML oficial.

### Fase 5. Excelencia grafica y UX

Objetivo: que el sistema se vea y se sienta premium sin sacrificar rigor.

- Dashboard por rol: gerente, contador, auxiliar, auditor, ventas, tesoreria.
- Estados de salud contable reales: descuadres, periodos abiertos, documentos sin asiento, compras sin credito valido, ventas sin cobro, diferencias de inventario.
- Vistas de cierre mensual con checklist.
- Centro de alertas normativas basado en configuracion real, no en mock.
- Drill-down desde estados financieros hasta asiento y documento fuente.

## 7. Riesgos que debemos corregir primero

Riesgo alto:

- Facturacion "SIN" simulada presentada como si fuera operativa.
- Mezcla de Supabase y `localStorage`.
- Inventario contable maquillado en balance.
- Posible duplicacion de asientos al editar.

Riesgo medio:

- Parametros tributarios hardcodeados.
- Cumplimiento normativo con datos ficticios.
- Modulos analiticos basados en fuentes no consistentes.

Riesgo bajo:

- Textos, etiquetas y claims comerciales mas fuertes que la capacidad real del sistema.

## 8. Recomendacion de trabajo inmediato

Recomiendo que la siguiente iteracion la enfoquemos en este orden:

1. Congelar simulaciones criticas en la UX con etiquetas claras de "demo" donde corresponda.
2. Unificar datos operativos y reportes en Supabase.
3. Corregir asiento, inventario y balance para que el nucleo contable sea confiable.
4. Rediseñar la capa de cumplimiento tributario boliviano con parametrizacion real.
5. Recién despues avanzar fuerte en integracion SIN y refinamiento grafico premium.

## 9. Decisión de producto sugerida

Hay dos caminos posibles:

- Camino A: convertir este producto en un simulador / MVP comercial para demostracion.
- Camino B: convertirlo en un ERP contable boliviano serio para produccion y auditoria.

Mi recomendacion es seguir el Camino B, pero con disciplina de capas:

- primero verdad contable,
- luego verdad tributaria,
- luego automatizacion SIN,
- luego excelencia visual.

## 10. Fuentes oficiales y de referencia revisadas

- SIAT Info - Tipos de Obligaciones: https://siatinfo.impuestos.gob.bo/index.php/obligaciones-tributarias/tipos-de-obligaciones
- SIAT Info - Facturacion: https://siatinfo.impuestos.gob.bo/index.php/impuesto-asunto/facturacion
- SIAT Info - Registro Auxiliar de Ventas: https://siatinfo.impuestos.gob.bo/index.php/registro-auxiliar-de-ventas
- SIAT Info - Habilitar Registro de Compras: https://siatinfo.impuestos.gob.bo/index.php/registro-de-compras-y-ventas/registro-de-compras-serv/introduccion-registro
- SIAT Info - Sucursales y puntos de venta: https://siatinfo.impuestos.gob.bo/index.php/facturacion-en-linea/requerimientos/sucursales-y-puntos-de-venta
- SIAT Info - Modificacion RNC Persona Juridica: https://siatinfo.impuestos.gob.bo/index.php/modificaciones-en-el-rnc/datos-complementarios-persona-juridica
- Lexivox - Codigo de Comercio de Bolivia: https://www.lexivox.org/norms/BO-COD-DL14379.html

## 11. Nota profesional

Este analisis sirve como base de arquitectura y control. Para salida a produccion, cualquier modulo tributario o laboral sensible debe ser validado en conjunto con:

- un contador tributario boliviano,
- un auditor de sistemas,
- y, cuando aplique, el criterio operativo vigente del SIN para el sector del cliente.
