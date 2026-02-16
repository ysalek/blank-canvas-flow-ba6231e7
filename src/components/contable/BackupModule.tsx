
import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Download, Upload, Database, Shield, AlertTriangle, CheckCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useBackup } from "@/hooks/useBackup";
// SystemResetButton removed in SaaS cleanup

const BackupModule = () => {
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [importProgress, setImportProgress] = useState(0);
  const { toast } = useToast();
  const { crearBackup, restaurarBackup } = useBackup();

  const getAllLocalStorageData = () => {
    const data: { [key: string]: any } = {};
    const keys = [
      'facturas',
      'clientes',
      'productos',
      'asientosContables',
      'movimientosInventario',
      'proveedores',
      'compras',
      'comprobantes_integrados'
    ];

    keys.forEach(key => {
      const value = localStorage.getItem(key);
      if (value) {
        try {
          data[key] = JSON.parse(value);
        } catch (error) {
          data[key] = value;
        }
      }
    });

    return data;
  };

  const getBackupInfo = () => {
    const data = getAllLocalStorageData();
    return {
      facturas: data.facturas?.length || 0,
      clientes: data.clientes?.length || 0,
      productos: data.productos?.length || 0,
      asientos: data.asientosContables?.length || 0,
      movimientos: data.movimientosInventario?.length || 0,
      proveedores: data.proveedores?.length || 0,
      compras: data.compras?.length || 0,
      comprobantes: data.comprobantes_integrados?.length || 0
    };
  };

  const exportBackup = async () => {
    crearBackup();
  };

  const importBackup = (event: React.ChangeEvent<HTMLInputElement>) => {
    restaurarBackup(event);
  };

  const resetSystemToVirginState = () => {
    if (confirm("¿Está COMPLETAMENTE SEGURO de reiniciar el sistema? Esta acción eliminará TODOS los datos operativos (facturas, clientes, productos, asientos, inventario, etc.) pero mantendrá el Plan de Cuentas con saldos en CERO. Esta acción NO se puede deshacer.")) {
      if (confirm("CONFIRMACIÓN FINAL: Se eliminarán todos los datos operativos incluyendo TODO EL INVENTARIO y se resetearán los saldos a CERO. ¿Continuar?")) {
        console.log("🧹 Iniciando limpieza EXHAUSTIVA del sistema...");
        
        // PASO 1: ELIMINAR TODO EL localStorage COMPLETAMENTE
        console.log("🗑️ ELIMINANDO TODO EL localStorage...");
        const allKeys: string[] = [];
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key) allKeys.push(key);
        }
        
        console.log(`🗑️ Se encontraron ${allKeys.length} claves para eliminar:`, allKeys);
        localStorage.clear(); // LIMPIAR TODO
        
        console.log(`🔍 Verificación: localStorage tiene ${localStorage.length} elementos después de clear()`);

        // PASO 2: Resetear SOLO los saldos del Plan de Cuentas existente
        console.log("📊 Reseteando saldos del Plan de Cuentas a CERO...");
        const planCuentasExistente = JSON.parse(localStorage.getItem('planCuentas') || '[]');
        
        if (planCuentasExistente.length > 0) {
          const planCuentasReseteado = planCuentasExistente.map((cuenta: any) => ({
            ...cuenta,
            saldo: 0,
            totalDebe: 0,
            totalHaber: 0,
            movimientos: []
          }));
          localStorage.setItem('planCuentas', JSON.stringify(planCuentasReseteado));
          console.log(`📊 Plan de Cuentas reseteado: ${planCuentasReseteado.length} cuentas con saldos en CERO`);
        } else {
          // Si no existe plan de cuentas, crear uno básico
          const planCuentasBasico = [
            // ACTIVOS
            { codigo: "1", nombre: "ACTIVOS", tipo: "activo", nivel: 1, naturaleza: "deudora", saldo: 0, activa: true, totalDebe: 0, totalHaber: 0, movimientos: [] },
            { codigo: "11", nombre: "ACTIVO CORRIENTE", tipo: "activo", nivel: 2, padre: "1", naturaleza: "deudora", saldo: 0, activa: true, totalDebe: 0, totalHaber: 0, movimientos: [] },
            { codigo: "111", nombre: "DISPONIBLE", tipo: "activo", nivel: 3, padre: "11", naturaleza: "deudora", saldo: 0, activa: true, totalDebe: 0, totalHaber: 0, movimientos: [] },
            { codigo: "1111", nombre: "Caja General", tipo: "activo", nivel: 4, padre: "111", naturaleza: "deudora", saldo: 0, activa: true, totalDebe: 0, totalHaber: 0, movimientos: [] },
            { codigo: "1112", nombre: "Banco Nacional de Bolivia", tipo: "activo", nivel: 4, padre: "111", naturaleza: "deudora", saldo: 0, activa: true, totalDebe: 0, totalHaber: 0, movimientos: [] },
            { codigo: "1131", nombre: "Inventarios", tipo: "activo", nivel: 4, padre: "113", naturaleza: "deudora", saldo: 0, activa: true, totalDebe: 0, totalHaber: 0, movimientos: [] },
            { codigo: "1142", nombre: "IVA Crédito Fiscal", tipo: "activo", nivel: 4, padre: "114", naturaleza: "deudora", saldo: 0, activa: true, totalDebe: 0, totalHaber: 0, movimientos: [] },
            
            // PASIVOS  
            { codigo: "2", nombre: "PASIVOS", tipo: "pasivo", nivel: 1, naturaleza: "acreedora", saldo: 0, activa: true, totalDebe: 0, totalHaber: 0, movimientos: [] },
            { codigo: "21", nombre: "PASIVO CORRIENTE", tipo: "pasivo", nivel: 2, padre: "2", naturaleza: "acreedora", saldo: 0, activa: true, totalDebe: 0, totalHaber: 0, movimientos: [] },
            { codigo: "2111", nombre: "Cuentas por Pagar", tipo: "pasivo", nivel: 3, padre: "21", naturaleza: "acreedora", saldo: 0, activa: true, totalDebe: 0, totalHaber: 0, movimientos: [] },
            { codigo: "2113", nombre: "IVA por Pagar", tipo: "pasivo", nivel: 3, padre: "21", naturaleza: "acreedora", saldo: 0, activa: true, totalDebe: 0, totalHaber: 0, movimientos: [] },
            { codigo: "2131", nombre: "IVA Débito Fiscal", tipo: "pasivo", nivel: 4, padre: "213", naturaleza: "acreedora", saldo: 0, activa: true, totalDebe: 0, totalHaber: 0, movimientos: [] },
            { codigo: "2141", nombre: "IT por Pagar", tipo: "pasivo", nivel: 4, padre: "214", naturaleza: "acreedora", saldo: 0, activa: true, totalDebe: 0, totalHaber: 0, movimientos: [] },
            
            // PATRIMONIO
            { codigo: "3", nombre: "PATRIMONIO", tipo: "patrimonio", nivel: 1, naturaleza: "acreedora", saldo: 0, activa: true, totalDebe: 0, totalHaber: 0, movimientos: [] },
            { codigo: "31", nombre: "CAPITAL", tipo: "patrimonio", nivel: 2, padre: "3", naturaleza: "acreedora", saldo: 0, activa: true, totalDebe: 0, totalHaber: 0, movimientos: [] },
            { codigo: "311", nombre: "Capital Social", tipo: "patrimonio", nivel: 3, padre: "31", naturaleza: "acreedora", saldo: 0, activa: true, totalDebe: 0, totalHaber: 0, movimientos: [] },
            
            // INGRESOS
            { codigo: "4", nombre: "INGRESOS", tipo: "ingresos", nivel: 1, naturaleza: "acreedora", saldo: 0, activa: true, totalDebe: 0, totalHaber: 0, movimientos: [] },
            { codigo: "41", nombre: "INGRESOS OPERACIONALES", tipo: "ingresos", nivel: 2, padre: "4", naturaleza: "acreedora", saldo: 0, activa: true, totalDebe: 0, totalHaber: 0, movimientos: [] },
            { codigo: "411", nombre: "Ventas", tipo: "ingresos", nivel: 3, padre: "41", naturaleza: "acreedora", saldo: 0, activa: true, totalDebe: 0, totalHaber: 0, movimientos: [] },
            { codigo: "4111", nombre: "Ventas", tipo: "ingresos", nivel: 4, padre: "411", naturaleza: "acreedora", saldo: 0, activa: true, totalDebe: 0, totalHaber: 0, movimientos: [] },
            { codigo: "4191", nombre: "Otros Ingresos", tipo: "ingresos", nivel: 4, padre: "419", naturaleza: "acreedora", saldo: 0, activa: true, totalDebe: 0, totalHaber: 0, movimientos: [] },
            { codigo: "419", nombre: "OTROS INGRESOS", tipo: "ingresos", nivel: 3, padre: "41", naturaleza: "acreedora", saldo: 0, activa: true, totalDebe: 0, totalHaber: 0, movimientos: [] },
            
            // GASTOS
            { codigo: "5", nombre: "GASTOS", tipo: "gastos", nivel: 1, naturaleza: "deudora", saldo: 0, activa: true, totalDebe: 0, totalHaber: 0, movimientos: [] },
            { codigo: "51", nombre: "COSTO DE VENTAS", tipo: "gastos", nivel: 2, padre: "5", naturaleza: "deudora", saldo: 0, activa: true, totalDebe: 0, totalHaber: 0, movimientos: [] },
            { codigo: "511", nombre: "Costo de Ventas", tipo: "gastos", nivel: 3, padre: "51", naturaleza: "deudora", saldo: 0, activa: true, totalDebe: 0, totalHaber: 0, movimientos: [] },
            { codigo: "52", nombre: "GASTOS OPERACIONALES", tipo: "gastos", nivel: 2, padre: "5", naturaleza: "deudora", saldo: 0, activa: true, totalDebe: 0, totalHaber: 0, movimientos: [] },
            { codigo: "521", nombre: "Gastos Administrativos", tipo: "gastos", nivel: 3, padre: "52", naturaleza: "deudora", saldo: 0, activa: true, totalDebe: 0, totalHaber: 0, movimientos: [] }
          ];
          localStorage.setItem('planCuentas', JSON.stringify(planCuentasBasico));
          console.log("📊 Plan de Cuentas básico instalado con saldos en CERO");
        }

        // PASO 3: Instalar configuraciones básicas del sistema
        console.log("🔧 Instalando configuraciones básicas...");
        localStorage.setItem('configSin', JSON.stringify({}));
        localStorage.setItem('configuracionEmpresa', JSON.stringify({}));
        localStorage.setItem('configuracionFiscal', JSON.stringify({}));
        localStorage.setItem('configuracionSistema', JSON.stringify({}));

        // PASO 4: Instalar arrays COMPLETAMENTE VACÍOS para TODOS los datos operativos
        console.log("🏭 Instalando arrays VACÍOS para datos operativos...");
        const datosVaciosCompletos = {
          // Datos principales VACÍOS
          'productos': [],
          'clientes': [],
          'facturas': [],
          'proveedores': [],  
          'compras': [],
          'asientosContables': [],
          'comprobantes_integrados': [],
          
          // INVENTARIO - TODO VACÍO
          'movimientosInventario': [],
          'inventarioProductos': [],
          'productosInventario': [],
          'stockActual': [],
          'costoPromedioPonderado': [],
          'valorInventario': [],
          'alertasInventario': [],
          'categoriasProductos': [],
          'unidadesMedida': [],
          'registrosInventario': [],
          'historialInventario': [],
          'kardex': [],
          'inventarioMinimo': [],
          'inventarioMaximo': [],
          'puntosReorden': [],
          'proveedoresProductos': [],
          'costosProductos': [],
          'preciosProductos': [],
          'inventarioValuado': [],
          'resumenInventario': [],
          'totalInventario': [],
          'inventarioActual': [],
          'existenciasProductos': [],
          'movimientosProductos': [],
          'transaccionesInventario': [],
          'operacionesInventario': [],
          'entradaInventario': [],
          'salidaInventario': [],
          'inventarioFisico': [],
          'conteoInventario': [],
          'diferenciasInventario': [],
          'valoracionInventario': [],
          'ajustesInventario': [],
          
          // DATOS BANCARIOS Y FINANCIEROS - TODO VACÍO
          'movimientosBanco': [],
          'movimientosBancarios': [],
          'cuentasBancarias': [],
          'movimientosCaja': [],
          'conciliacionesBancarias': [],
          'estadosCuenta': [],
          'transferenciasInternas': [],
          'conciliaciones': [],
          'extractosBancarios': [],
          'saldosBanco': [],
          'extractos': [],
          'movimientosConciliados': [],
          'movimientosPendientes': [],
          
          // CUMPLIMIENTO NORMATIVO Y DECLARACIONES - TODO VACÍO
          'declaracionesTributarias': [],
          'cumplimientoNormativo': [],
          'alertasCumplimiento': [],
          'pendientesCumplimiento': [],
          'vencimientosDeclaraciones': [],
          'normativasVigentes': [],
          'requisitosCumplimiento': [],
          'alertasVencimiento': [],
          'multasIntereses': [],
          'estadoDeclaraciones': [],
          'formularios110': [],
          'formularios200': [],
          'formularios401': [],
          'formularios500': [],
          'formularios600': [],
          'formularios750': [],
          'declaracionesIVA': [],
          'declaracionesIT': [],
          'declaracionesIUE': [],
          'declaracionesRCIVA': [],
          'estadosFinancieros': [],
          'sectoresEspeciales': [],
          'declaracionIVADigital': [],
          'obligacionesTributarias': [],
          'calendarioTributario': [],
          'cumplimiento_score': 0,
          'pendientes_criticas': [],
          'monto_total_obligaciones': 0,
          'proximos_vencimientos': [],
          'historial_cumplimiento': [],
          'configuracion_sin': {},
          'normativa_vigente': [],
          'alertas_normativas': [],
          
          // USUARIOS DEL SISTEMA (MANTENER SOLO ADMIN)
          'usuarios_sistema': [
            {
              id: 1,
              usuario: "admin",
              email: "admin@sistema.com", 
              password: "C123081a!",
              nombre: "Administrador del Sistema",
              rol: "admin",
              empresa: "Sistema Contable",
              permisos: ["*"],
              activo: true,
              fechaCreacion: new Date().toISOString()
            }
          ],
          
          // ANÁLISIS Y REPORTES - TODO VACÍO
          'analisisFinanciero': [],
          'analisisRentabilidad': [],
          'ratiosFinancieros': [],
          'indicadoresFinancieros': [],
          'estadisticasVentas': [],
          'reportesGenerados': [],
          'historiaReportes': [],
          'ratios_liquidez': [],
          'ratios_endeudamiento': [],
          'ratios_rentabilidad': [],
          'ratios_actividad': [],
          'analisis_horizontal': [],
          'analisis_vertical': [],
          'tendencias_financieras': [],
          'proyecciones': [],
          'indicadores_clave': [],
          'metricas_rendimiento': [],
          'dashboard_financiero': {},
          'score_financiero': 0,
          'auditoria_datos': [],
          'verificaciones_contables': [],
          'alertas_auditoria': [],
          
          // NÓMINA Y RECURSOS HUMANOS - TODO VACÍO
          'nomina': [],
          'empleados': [],
          'planillas': [],
          'aportesPatronales': [],
          'aportesLaborales': [],
          'aguinaldos': [],
          'finiquitos': [],
          'vacaciones': [],
          'permisos': [],
          'asistencias': [],
          
          // OTROS DATOS OPERATIVOS VACÍOS
          'cuentasPorCobrar': [],
          'cuentasPorPagar': [],
          'activosFijos': [],
          'depreciacionesActivos': [],
          'centrosCosto': [],
          'presupuestos': [],
          'itemsPresupuesto': [],
          'presupuestosEjecutados': [],
          'variacionesPresupuestales': [],
          'auditoriasInternas': [],
          'registrosAuditoria': [],
          'logsSistema': [],
          'backupsRealizados': [],
          'configuracionesAvanzadas': [],
          'integracionesTerceros': [],
          'webhooks': [],
          'notificaciones': [],
          'alertas': [],
          'recordatorios': [],
          'tareas': [],
          'calendarioFiscal': [],
          'pagosRegistrados': [],
          'cobranzasRealizadas': [],
          'flujoCaja': [],
          
          // CONFIGURACIONES Y CACHE - TODO VACÍO
          'configuracion_cache': {},
          'datos_temporales': [],
          'session_data': {},
          'user_preferences': {},
          'modulos_activos': [],
          'permisos_temporales': [],
          'configuracion_reportes': {},
          'filtros_guardados': [],
          'vistas_personalizadas': [],
          'dashboards_personalizados': [],
          
          // INTEGRACIÓN Y WEBHOOKS - TODO VACÍO
          'datos_integracion': [],
          'logs_integracion': [],
          'estado_sincronizacion': {},
          'webhooks_configurados': [],
          'apis_conectadas': [],
          'tokens_acceso': {},
          
          // OTROS CACHÉS Y DATOS TEMPORALES
          'cache_reportes': {},
          'cache_calculos': {},
          'cache_dashboard': {},
          'datos_graficos': [],
          'estadisticas_uso': [],
          'logs_usuario': [],
          'historial_navegacion': [],
        };

        Object.entries(datosVaciosCompletos).forEach(([key, value]) => {
          localStorage.setItem(key, JSON.stringify(value));
          console.log(`✅ Instalado VACÍO: ${key} = []`);
        });

        // PASO 5: Marcar el sistema como completamente reiniciado
        const fechaReinicio = new Date().toISOString();
        localStorage.setItem('fechaUltimaLimpieza', fechaReinicio);
        localStorage.setItem('sistemaReinicializado', 'true');
        localStorage.setItem('estadoSistema', 'virgen');
        localStorage.setItem('datosEliminados', 'completo');
        localStorage.setItem('ultimo-backup', fechaReinicio);

        console.log("✅ LIMPIEZA COMPLETA FINALIZADA - Sistema 100% VIRGEN");
        console.log("📊 Plan de Cuentas: TODOS los saldos en CERO");
        console.log("📦 Inventario: COMPLETAMENTE VACÍO");
        console.log("🗂️ Datos operativos: COMPLETAMENTE VACÍOS");

        toast({
          title: "Sistema 100% Reiniciado",
          description: "TODOS los datos eliminados. Plan de Cuentas con saldos en CERO. Inventario completamente vacío. Sistema 100% virgen.",
        });

        setTimeout(() => {
          window.location.reload();
        }, 2000);
      }
    }
  };

  const backupInfo = getBackupInfo();

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="w-6 h-6" />
            Backup y Restauración
          </CardTitle>
          <CardDescription>
            Respalde y restaure todos los datos del sistema contable
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Alert className="mb-6">
            <Shield className="h-4 w-4" />
            <AlertDescription>
              Es recomendable realizar backups periódicos para proteger su información contable.
              Los backups incluyen facturas, clientes, productos, asientos contables y movimientos de inventario.
            </AlertDescription>
          </Alert>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Información del Sistema */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Estado Actual del Sistema</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between items-center">
                  <span>Facturas:</span>
                  <Badge variant="outline">{backupInfo.facturas}</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span>Clientes:</span>
                  <Badge variant="outline">{backupInfo.clientes}</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span>Productos:</span>
                  <Badge variant="outline">{backupInfo.productos}</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span>Asientos Contables:</span>
                  <Badge variant="outline">{backupInfo.asientos}</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span>Movimientos Inventario:</span>
                  <Badge variant="outline">{backupInfo.movimientos}</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span>Proveedores:</span>
                  <Badge variant="outline">{backupInfo.proveedores}</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span>Compras:</span>
                  <Badge variant="outline">{backupInfo.compras}</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span>Comprobantes:</span>
                  <Badge variant="outline">{backupInfo.comprobantes}</Badge>
                </div>
              </CardContent>
            </Card>

            {/* Panel de Acciones */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Acciones de Respaldo</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Exportar Backup */}
                <div className="space-y-2">
                  <Label>Exportar Backup</Label>
                  <Button 
                    onClick={exportBackup} 
                    disabled={isExporting}
                    className="w-full"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Descargar Backup
                  </Button>
                </div>

                {/* Importar Backup */}
                <div className="space-y-2">
                  <Label htmlFor="backup-file">Restaurar Backup</Label>
                  <Input
                    id="backup-file"
                    type="file"
                    accept=".json"
                    onChange={importBackup}
                    disabled={isImporting}
                  />
                </div>

                {/* Reiniciar Sistema - Removed in SaaS version */}
              </CardContent>
            </Card>
          </div>

          {/* Instrucciones */}
          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <CheckCircle className="w-5 h-5" />
                Instrucciones de Uso
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <h4 className="font-semibold mb-2">Crear Backup:</h4>
                  <ul className="text-sm space-y-1 text-muted-foreground">
                    <li>• Haga clic en "Descargar Backup"</li>
                    <li>• Se descargará un archivo JSON</li>
                    <li>• Guarde el archivo en un lugar seguro</li>
                    <li>• El backup incluye todos sus datos</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-semibold mb-2">Restaurar Backup:</h4>
                  <ul className="text-sm space-y-1 text-muted-foreground">
                    <li>• Seleccione el archivo de backup (.json)</li>
                    <li>• Los datos se restaurarán automáticamente</li>
                    <li>• Recargue la página después de restaurar</li>
                    <li>• Los datos actuales serán reemplazados</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-semibold mb-2">Reiniciar Sistema:</h4>
                  <ul className="text-sm space-y-1 text-muted-foreground">
                    <li>• Elimina TODOS los datos operativos</li>
                    <li>• Incluye inventario y movimientos</li>
                    <li>• Plan de Cuentas con saldos en CERO</li>
                    <li>• PRECAUCIÓN: No se puede deshacer</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </CardContent>
      </Card>
    </div>
  );
};

export default BackupModule;
