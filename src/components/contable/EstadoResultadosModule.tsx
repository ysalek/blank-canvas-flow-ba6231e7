import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { TrendingUp, Download, Calendar, ChevronDown, ChevronRight, CalendarIcon } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useReportesContables } from '@/hooks/useReportesContables';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import * as XLSX from '@e965/xlsx';

const EstadoResultadosModule = () => {
  const [fechaInicio, setFechaInicio] = useState<Date>(new Date(new Date().getFullYear(), 0, 1));
  const [fechaFin, setFechaFin] = useState<Date>(new Date());
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});
  const [isGenerating, setIsGenerating] = useState(false);
  const { getIncomeStatementData, getTrialBalanceData } = useReportesContables();

  const generarReporte = async () => {
    setIsGenerating(true);
    // Simular proceso de generación
    await new Promise(resolve => setTimeout(resolve, 1000));
    setIsGenerating(false);
    // Forzar actualización de datos
    window.location.hash = `#${Date.now()}`;
  };

  // Obtener datos reales del sistema contable integrado con comprobantes
  const filtrosFecha = {
    fechaInicio: format(fechaInicio, 'yyyy-MM-dd'),
    fechaFin: format(fechaFin, 'yyyy-MM-dd'),
  };
  const datosReales = getIncomeStatementData(filtrosFecha);
  
  // Obtener datos del balance de comprobación para el IT
  const { details } = getTrialBalanceData(filtrosFecha);
  
  // Estructura de datos completa para el Estado de Resultados con subcategorías
  const estadoResultados = {
    ingresos: {
      ventasProductos: {
        total: datosReales.ingresos.cuentas.filter(c => c.codigo.startsWith('411')).reduce((sum, c) => sum + c.saldo, 0),
        cuentas: datosReales.ingresos.cuentas.filter(c => c.codigo.startsWith('411'))
      },
      ventasServicios: {
        total: datosReales.ingresos.cuentas.filter(c => c.codigo.startsWith('412')).reduce((sum, c) => sum + c.saldo, 0),
        cuentas: datosReales.ingresos.cuentas.filter(c => c.codigo.startsWith('412'))
      },
      otrosIngresos: {
        total: datosReales.ingresos.cuentas.filter(c => c.codigo.startsWith('413') || c.codigo.startsWith('414')).reduce((sum, c) => sum + c.saldo, 0),
        cuentas: datosReales.ingresos.cuentas.filter(c => c.codigo.startsWith('413') || c.codigo.startsWith('414'))
      },
      totalIngresos: datosReales.ingresos.total,
      todasLasCuentas: datosReales.ingresos.cuentas
    },
    costosVentas: {
      costosDirectos: {
        total: datosReales.gastos.cuentas.filter(c => c.codigo.startsWith('511')).reduce((sum, c) => sum + c.saldo, 0),
        cuentas: datosReales.gastos.cuentas.filter(c => c.codigo.startsWith('511'))
      },
      manoObraDirecta: {
        total: datosReales.gastos.cuentas.filter(c => c.codigo.startsWith('512')).reduce((sum, c) => sum + c.saldo, 0),
        cuentas: datosReales.gastos.cuentas.filter(c => c.codigo.startsWith('512'))
      },
      gastosIndirectos: {
        total: datosReales.gastos.cuentas.filter(c => c.codigo.startsWith('513')).reduce((sum, c) => sum + c.saldo, 0),
        cuentas: datosReales.gastos.cuentas.filter(c => c.codigo.startsWith('513'))
      },
      totalCostos: datosReales.gastos.cuentas.filter(c => c.codigo.startsWith('51')).reduce((sum, c) => sum + c.saldo, 0),
      todasLasCuentas: datosReales.gastos.cuentas.filter(c => c.codigo.startsWith('51'))
    },
    gastosOperativos: {
      gastosAdministrativos: {
        total: datosReales.gastos.cuentas.filter(c => c.codigo.startsWith('521')).reduce((sum, c) => sum + c.saldo, 0),
        cuentas: datosReales.gastos.cuentas.filter(c => c.codigo.startsWith('521'))
      },
      gastosVentas: {
        total: datosReales.gastos.cuentas.filter(c => c.codigo.startsWith('522')).reduce((sum, c) => sum + c.saldo, 0),
        cuentas: datosReales.gastos.cuentas.filter(c => c.codigo.startsWith('522'))
      },
      gastosGenerales: {
        total: datosReales.gastos.cuentas.filter(c => c.codigo.startsWith('523')).reduce((sum, c) => sum + c.saldo, 0),
        cuentas: datosReales.gastos.cuentas.filter(c => c.codigo.startsWith('523'))
      },
      depreciacion: {
        total: datosReales.gastos.cuentas.filter(c => c.codigo.startsWith('524')).reduce((sum, c) => sum + c.saldo, 0),
        cuentas: datosReales.gastos.cuentas.filter(c => c.codigo.startsWith('524'))
      },
      perdidasInventario: {
        total: datosReales.gastos.cuentas.filter(c => c.codigo.startsWith('53')).reduce((sum, c) => sum + c.saldo, 0),
        cuentas: datosReales.gastos.cuentas.filter(c => c.codigo.startsWith('53'))
      },
      totalGastosOperativos: datosReales.gastos.cuentas.filter(c => 
        (c.codigo.startsWith('52') && c.codigo !== '5261') || c.codigo.startsWith('53')
      ).reduce((sum, c) => sum + c.saldo, 0),
      todasLasCuentas: datosReales.gastos.cuentas.filter(c => 
        (c.codigo.startsWith('52') && c.codigo !== '5261') || c.codigo.startsWith('53')
      )
    },
    gastosPersonal: {
      sueldosSalarios: {
        total: datosReales.gastos.cuentas.filter(c => c.codigo.startsWith('611')).reduce((sum, c) => sum + c.saldo, 0),
        cuentas: datosReales.gastos.cuentas.filter(c => c.codigo.startsWith('611'))
      },
      cargasSociales: {
        total: datosReales.gastos.cuentas.filter(c => c.codigo.startsWith('612')).reduce((sum, c) => sum + c.saldo, 0),
        cuentas: datosReales.gastos.cuentas.filter(c => c.codigo.startsWith('612'))
      },
      otrosGastosPersonal: {
        total: datosReales.gastos.cuentas.filter(c => c.codigo.startsWith('61') && !c.codigo.startsWith('611') && !c.codigo.startsWith('612')).reduce((sum, c) => sum + c.saldo, 0),
        cuentas: datosReales.gastos.cuentas.filter(c => c.codigo.startsWith('61') && !c.codigo.startsWith('611') && !c.codigo.startsWith('612'))
      },
      totalGastosPersonal: datosReales.gastos.cuentas.filter(c => c.codigo.startsWith('61')).reduce((sum, c) => sum + c.saldo, 0),
      todasLasCuentas: datosReales.gastos.cuentas.filter(c => c.codigo.startsWith('61'))
    },
    impuestoTransacciones: {
      total: datosReales.gastos.cuentas.filter(c => c.codigo === '5261').reduce((sum, c) => sum + c.saldo, 0),
      cuentas: datosReales.gastos.cuentas.filter(c => c.codigo === '5261')
    },
    otrosIngresos: {
      ingresosFinancieros: {
        total: datosReales.ingresos.cuentas.filter(c => c.codigo.startsWith('421')).reduce((sum, c) => sum + c.saldo, 0),
        cuentas: datosReales.ingresos.cuentas.filter(c => c.codigo.startsWith('421'))
      },
      ingresosExtraordinarios: {
        total: datosReales.ingresos.cuentas.filter(c => c.codigo.startsWith('422')).reduce((sum, c) => sum + c.saldo, 0),
        cuentas: datosReales.ingresos.cuentas.filter(c => c.codigo.startsWith('422'))
      },
      totalOtrosIngresos: datosReales.ingresos.cuentas.filter(c => c.codigo.startsWith('42')).reduce((sum, c) => sum + c.saldo, 0),
      todasLasCuentas: datosReales.ingresos.cuentas.filter(c => c.codigo.startsWith('42'))
    },
    otrosGastos: {
      gastosFinancieros: {
        total: datosReales.gastos.cuentas.filter(c => c.codigo.startsWith('621')).reduce((sum, c) => sum + c.saldo, 0),
        cuentas: datosReales.gastos.cuentas.filter(c => c.codigo.startsWith('621'))
      },
      gastosExtraordinarios: {
        total: datosReales.gastos.cuentas.filter(c => c.codigo.startsWith('622')).reduce((sum, c) => sum + c.saldo, 0),
        cuentas: datosReales.gastos.cuentas.filter(c => c.codigo.startsWith('622'))
      },
      totalOtrosGastos: datosReales.gastos.cuentas.filter(c => c.codigo.startsWith('62')).reduce((sum, c) => sum + c.saldo, 0),
      todasLasCuentas: datosReales.gastos.cuentas.filter(c => c.codigo.startsWith('62'))
    },
    impuestos: {
      impuestoUtilidades: {
        total: datosReales.gastos.cuentas.filter(c => c.codigo.startsWith('631')).reduce((sum, c) => sum + c.saldo, 0),
        cuentas: datosReales.gastos.cuentas.filter(c => c.codigo.startsWith('631'))
      },
      otrosImpuestos: {
        total: datosReales.gastos.cuentas.filter(c => c.codigo.startsWith('632')).reduce((sum, c) => sum + c.saldo, 0),
        cuentas: datosReales.gastos.cuentas.filter(c => c.codigo.startsWith('632'))
      },
      totalImpuestos: datosReales.gastos.cuentas.filter(c => c.codigo.startsWith('63')).reduce((sum, c) => sum + c.saldo, 0),
      todasLasCuentas: datosReales.gastos.cuentas.filter(c => c.codigo.startsWith('63'))
    }
  };

   const utilidadBruta = estadoResultados.ingresos.totalIngresos - estadoResultados.costosVentas.totalCostos;
  const utilidadOperativa = utilidadBruta - estadoResultados.gastosOperativos.totalGastosOperativos - estadoResultados.gastosPersonal.totalGastosPersonal - estadoResultados.impuestoTransacciones.total;
  const utilidadAntesImpuestos = utilidadOperativa + estadoResultados.otrosIngresos.totalOtrosIngresos - estadoResultados.otrosGastos.totalOtrosGastos;
  const utilidadNeta = utilidadAntesImpuestos - estadoResultados.impuestos.totalImpuestos;

  const margenBruto = estadoResultados.ingresos.totalIngresos > 0 ? (utilidadBruta / estadoResultados.ingresos.totalIngresos) * 100 : 0;
  const margenOperativo = estadoResultados.ingresos.totalIngresos > 0 ? (utilidadOperativa / estadoResultados.ingresos.totalIngresos) * 100 : 0;
  const margenNeto = estadoResultados.ingresos.totalIngresos > 0 ? (utilidadNeta / estadoResultados.ingresos.totalIngresos) * 100 : 0;

  const toggleSection = (sectionKey: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [sectionKey]: !prev[sectionKey]
    }));
  };

  const renderMainSection = (
    sectionKey: string,
    title: string,
    total: number,
    subcategorias: any,
    todasLasCuentas: { codigo: string; nombre: string; saldo: number }[],
    percentage: string,
    isNegative: boolean = false,
    className: string = ""
  ) => {
    const isExpanded = expandedSections[sectionKey];
    const hasSubcategorias = Object.keys(subcategorias).some(key => 
      key !== 'total' && key !== 'todasLasCuentas' && Array.isArray(subcategorias[key]?.cuentas) && subcategorias[key]?.cuentas.length > 0
    );

    return (
      <>
        <Collapsible open={isExpanded} onOpenChange={() => toggleSection(sectionKey)}>
          <TableRow className={`font-bold text-lg border-t-2 ${className}`}>
            <TableCell className="flex items-center gap-2">
              {(hasSubcategorias || todasLasCuentas.length > 0) && (
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" size="sm" className="p-1 h-6 w-6">
                    {isExpanded ? (
                      <ChevronDown className="w-4 h-4" />
                    ) : (
                      <ChevronRight className="w-4 h-4" />
                    )}
                  </Button>
                </CollapsibleTrigger>
              )}
              {!hasSubcategorias && todasLasCuentas.length === 0 && <div className="w-6" />}
              <span className="font-bold">{title}</span>
            </TableCell>
            <TableCell className="text-right font-bold">
              {isNegative ? `(${total.toFixed(2)})` : total.toFixed(2)}
            </TableCell>
            <TableCell className="text-right font-bold">{percentage}</TableCell>
          </TableRow>
          
          {(hasSubcategorias || todasLasCuentas.length > 0) && (
            <CollapsibleContent asChild>
              <>
                {/* Mostrar subcategorías si existen y tienen cuentas */}
                {Object.entries(subcategorias).map(([key, subcategoria]: [string, any]) => {
                  if (key === 'total' || key === 'todasLasCuentas' || !subcategoria?.cuentas || subcategoria.cuentas.length === 0) return null;
                  
                  return renderSubcategoria(
                    `${sectionKey}_${key}`,
                    getSubcategoriaTitle(key),
                    subcategoria.total,
                    subcategoria.cuentas,
                    isNegative
                  );
                })}

                {/* Si no hay subcategorías con cuentas, mostrar todas las cuentas directamente */}
                {!hasSubcategorias && todasLasCuentas.map((cuenta) => (
                  <TableRow key={cuenta.codigo} className="bg-muted/30">
                    <TableCell className="pl-8 text-sm">
                      <span className="font-mono text-xs text-muted-foreground mr-2">{cuenta.codigo}</span>
                      {cuenta.nombre}
                    </TableCell>
                    <TableCell className="text-right text-sm">
                      {isNegative ? `(${cuenta.saldo.toFixed(2)})` : cuenta.saldo.toFixed(2)}
                    </TableCell>
                    <TableCell className="text-right text-sm text-muted-foreground">
                      {estadoResultados.ingresos.totalIngresos > 0 ? 
                        `${((cuenta.saldo / estadoResultados.ingresos.totalIngresos) * 100).toFixed(2)}%` : 
                        '0.00%'
                      }
                    </TableCell>
                  </TableRow>
                ))}
              </>
            </CollapsibleContent>
          )}
        </Collapsible>
      </>
    );
  };

  const renderSubcategoria = (
    sectionKey: string,
    title: string,
    total: number,
    cuentas: { codigo: string; nombre: string; saldo: number }[],
    isNegative: boolean = false
  ) => {
    const isExpanded = expandedSections[sectionKey];

    return (
      <>
        <Collapsible open={isExpanded} onOpenChange={() => toggleSection(sectionKey)}>
          <TableRow className="bg-muted/20 font-medium">
            <TableCell className="flex items-center gap-2 pl-4">
              {cuentas.length > 0 && (
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" size="sm" className="p-1 h-5 w-5">
                    {isExpanded ? (
                      <ChevronDown className="w-3 h-3" />
                    ) : (
                      <ChevronRight className="w-3 h-3" />
                    )}
                  </Button>
                </CollapsibleTrigger>
              )}
              {cuentas.length === 0 && <div className="w-5" />}
              <span className="text-sm font-medium">{title}</span>
            </TableCell>
            <TableCell className="text-right text-sm font-medium">
              {isNegative ? `(${total.toFixed(2)})` : total.toFixed(2)}
            </TableCell>
            <TableCell className="text-right text-sm text-muted-foreground">
              {estadoResultados.ingresos.totalIngresos > 0 ? 
                `${((total / estadoResultados.ingresos.totalIngresos) * 100).toFixed(2)}%` : 
                '0.00%'
              }
            </TableCell>
          </TableRow>
          
          {cuentas.length > 0 && (
            <CollapsibleContent asChild>
              <>
                {cuentas.map((cuenta) => (
                  <TableRow key={cuenta.codigo} className="bg-muted/30">
                    <TableCell className="pl-12 text-sm">
                      <span className="font-mono text-xs text-muted-foreground mr-2">{cuenta.codigo}</span>
                      {cuenta.nombre}
                    </TableCell>
                    <TableCell className="text-right text-sm">
                      {isNegative ? `(${cuenta.saldo.toFixed(2)})` : cuenta.saldo.toFixed(2)}
                    </TableCell>
                    <TableCell className="text-right text-sm text-muted-foreground">
                      {estadoResultados.ingresos.totalIngresos > 0 ? 
                        `${((cuenta.saldo / estadoResultados.ingresos.totalIngresos) * 100).toFixed(2)}%` : 
                        '0.00%'
                      }
                    </TableCell>
                  </TableRow>
                ))}
              </>
            </CollapsibleContent>
          )}
        </Collapsible>
      </>
    );
  };

  const getSubcategoriaTitle = (key: string): string => {
    const titles: { [key: string]: string } = {
      // Ingresos
      ventasProductos: 'Ventas de Productos',
      ventasServicios: 'Ventas de Servicios',
      otrosIngresos: 'Otros Ingresos Operacionales',
      // Costos
      costosDirectos: 'Costos Directos',
      manoObraDirecta: 'Mano de Obra Directa',
      gastosIndirectos: 'Gastos Indirectos de Fabricación',
      // Gastos Operativos
      gastosAdministrativos: 'Gastos Administrativos',
      gastosVentas: 'Gastos de Ventas',
      gastosGenerales: 'Gastos Generales',
      depreciacion: 'Depreciación y Amortización',
      perdidasInventario: 'Pérdidas y Faltantes de Inventario',
      // Gastos de Personal
      sueldosSalarios: 'Sueldos y Salarios',
      cargasSociales: 'Cargas Sociales Patronales',
      otrosGastosPersonal: 'Otros Gastos de Personal',
      // Otros
      ingresosFinancieros: 'Ingresos Financieros',
      ingresosExtraordinarios: 'Ingresos Extraordinarios',
      gastosFinancieros: 'Gastos Financieros',
      gastosExtraordinarios: 'Gastos Extraordinarios',
      impuestoUtilidades: 'Impuesto sobre Utilidades',
      otrosImpuestos: 'Otros Impuestos'
    };
    return titles[key] || key;
  };

  const exportarExcel = () => {
    const fechaInicioStr = format(fechaInicio, 'dd/MM/yyyy');
    const fechaFinStr = format(fechaFin, 'dd/MM/yyyy');
    
    const datos = [
      ['ESTADO DE RESULTADOS'],
      [`Período: ${fechaInicioStr} al ${fechaFinStr}`],
      [''],
      ['Concepto', 'Importe (Bs.)', '% de Ventas'],
      ['INGRESOS', estadoResultados.ingresos.totalIngresos.toFixed(2), '100.0%'],
      ['(-) COSTO DE VENTAS', `(${estadoResultados.costosVentas.totalCostos.toFixed(2)})`, 
       estadoResultados.ingresos.totalIngresos > 0 ? `${((estadoResultados.costosVentas.totalCostos / estadoResultados.ingresos.totalIngresos) * 100).toFixed(1)}%` : '0.0%'],
      ['UTILIDAD BRUTA', utilidadBruta.toFixed(2), `${margenBruto.toFixed(1)}%`],
       ['(-) GASTOS OPERATIVOS', `(${estadoResultados.gastosOperativos.totalGastosOperativos.toFixed(2)})`,
        estadoResultados.ingresos.totalIngresos > 0 ? `${((estadoResultados.gastosOperativos.totalGastosOperativos / estadoResultados.ingresos.totalIngresos) * 100).toFixed(1)}%` : '0.0%'],
       ['(-) IMPUESTO A LAS TRANSACCIONES', `(${estadoResultados.impuestoTransacciones.total.toFixed(2)})`,
        estadoResultados.ingresos.totalIngresos > 0 ? `${((estadoResultados.impuestoTransacciones.total / estadoResultados.ingresos.totalIngresos) * 100).toFixed(1)}%` : '0.0%'],
       ['UTILIDAD OPERATIVA', utilidadOperativa.toFixed(2), `${margenOperativo.toFixed(1)}%`],
      ['(+) OTROS INGRESOS', estadoResultados.otrosIngresos.totalOtrosIngresos.toFixed(2),
       estadoResultados.ingresos.totalIngresos > 0 ? `${((estadoResultados.otrosIngresos.totalOtrosIngresos / estadoResultados.ingresos.totalIngresos) * 100).toFixed(1)}%` : '0.0%'],
      ['(-) OTROS GASTOS', `(${estadoResultados.otrosGastos.totalOtrosGastos.toFixed(2)})`,
       estadoResultados.ingresos.totalIngresos > 0 ? `${((estadoResultados.otrosGastos.totalOtrosGastos / estadoResultados.ingresos.totalIngresos) * 100).toFixed(1)}%` : '0.0%'],
      ['UTILIDAD ANTES DE IMPUESTOS', utilidadAntesImpuestos.toFixed(2),
       estadoResultados.ingresos.totalIngresos > 0 ? `${((utilidadAntesImpuestos / estadoResultados.ingresos.totalIngresos) * 100).toFixed(1)}%` : '0.0%'],
      ['(-) IMPUESTOS', `(${estadoResultados.impuestos.totalImpuestos.toFixed(2)})`,
       estadoResultados.ingresos.totalIngresos > 0 ? `${((estadoResultados.impuestos.totalImpuestos / estadoResultados.ingresos.totalIngresos) * 100).toFixed(1)}%` : '0.0%'],
      ['UTILIDAD NETA', utilidadNeta.toFixed(2), `${margenNeto.toFixed(1)}%`]
    ];

    const ws = XLSX.utils.aoa_to_sheet(datos);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Estado de Resultados');
    XLSX.writeFile(wb, `Estado_Resultados_${format(fechaInicio, 'yyyy-MM-dd')}_${format(fechaFin, 'yyyy-MM-dd')}.xlsx`);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-6 h-6" />
              Estado de Resultados
            </div>
            <div className="flex gap-2">
              <Button 
                onClick={generarReporte}
                disabled={isGenerating}
                variant="default"
                size="sm"
                className="flex items-center gap-2"
              >
                <TrendingUp className="w-4 h-4" />
                {isGenerating ? 'Generando...' : 'Generar Reporte'}
              </Button>
              <Button 
                onClick={exportarExcel}
                variant="outline"
                size="sm"
                className="flex items-center gap-2"
              >
                <Download className="w-4 h-4" />
                Exportar Excel
              </Button>
            </div>
          </CardTitle>
          <CardDescription>
            Estado de ganancias y pérdidas por período - Cumple normativa contable boliviana
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              <Label>Desde:</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-[180px] justify-start text-left font-normal",
                      !fechaInicio && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {fechaInicio ? format(fechaInicio, "dd/MM/yyyy") : <span>Seleccionar fecha</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <CalendarComponent
                    mode="single"
                    selected={fechaInicio}
                    onSelect={(date) => date && setFechaInicio(date)}
                    initialFocus
                    className={cn("p-3 pointer-events-auto")}
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div className="flex items-center gap-2">
              <Label>Hasta:</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-[180px] justify-start text-left font-normal",
                      !fechaFin && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {fechaFin ? format(fechaFin, "dd/MM/yyyy") : <span>Seleccionar fecha</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <CalendarComponent
                    mode="single"
                    selected={fechaFin}
                    onSelect={(date) => date && setFechaFin(date)}
                    initialFocus
                    className={cn("p-3 pointer-events-auto")}
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-green-600">
                  {margenBruto.toFixed(1)}%
                </div>
                <div className="text-sm text-muted-foreground">Margen Bruto</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-blue-600">
                  {margenOperativo.toFixed(1)}%
                </div>
                <div className="text-sm text-muted-foreground">Margen Operativo</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <div className={`text-2xl font-bold ${utilidadNeta >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {margenNeto.toFixed(1)}%
                </div>
                <div className="text-sm text-muted-foreground">Margen Neto</div>
              </CardContent>
            </Card>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[300px]">Concepto</TableHead>
                <TableHead className="text-right">Importe (Bs.)</TableHead>
                <TableHead className="text-right">% de Ventas</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {/* INGRESOS */}
              {renderMainSection(
                'ingresos',
                'INGRESOS OPERACIONALES',
                estadoResultados.ingresos.totalIngresos,
                estadoResultados.ingresos,
                estadoResultados.ingresos.todasLasCuentas,
                '100.0%',
                false,
                'text-green-700 bg-green-50'
              )}

              {/* COSTO DE VENTAS */}
              {renderMainSection(
                'costosVentas',
                '(-) COSTO DE VENTAS',
                estadoResultados.costosVentas.totalCostos,
                estadoResultados.costosVentas,
                estadoResultados.costosVentas.todasLasCuentas,
                estadoResultados.ingresos.totalIngresos > 0 ? `${((estadoResultados.costosVentas.totalCostos / estadoResultados.ingresos.totalIngresos) * 100).toFixed(1)}%` : '0.0%',
                true,
                'text-red-700 bg-red-50'
              )}

              {/* UTILIDAD BRUTA */}
              <TableRow className="font-bold text-lg text-green-600 bg-green-100 border-t-2 border-b-2">
                <TableCell className="font-bold">UTILIDAD BRUTA</TableCell>
                <TableCell className="text-right font-bold">{utilidadBruta.toFixed(2)}</TableCell>
                <TableCell className="text-right font-bold">{margenBruto.toFixed(1)}%</TableCell>
              </TableRow>

              {/* GASTOS OPERATIVOS */}
              {renderMainSection(
                'gastosOperativos',
                '(-) GASTOS OPERATIVOS',
                estadoResultados.gastosOperativos.totalGastosOperativos,
                estadoResultados.gastosOperativos,
                estadoResultados.gastosOperativos.todasLasCuentas,
                estadoResultados.ingresos.totalIngresos > 0 ? `${((estadoResultados.gastosOperativos.totalGastosOperativos / estadoResultados.ingresos.totalIngresos) * 100).toFixed(1)}%` : '0.0%',
                true,
                'text-orange-700 bg-orange-50'
              )}

              {/* IMPUESTO A LAS TRANSACCIONES */}
              {renderMainSection(
                'impuestoTransacciones',
                '(-) IMPUESTO A LAS TRANSACCIONES',
                estadoResultados.impuestoTransacciones.total,
                {},
                estadoResultados.impuestoTransacciones.cuentas,
                estadoResultados.ingresos.totalIngresos > 0 ? `${((estadoResultados.impuestoTransacciones.total / estadoResultados.ingresos.totalIngresos) * 100).toFixed(1)}%` : '0.0%',
                true,
                'text-purple-700 bg-purple-50'
              )}

              {/* UTILIDAD OPERATIVA */}
              <TableRow className="font-bold text-lg text-blue-600 bg-blue-100 border-t-2 border-b-2">
                <TableCell className="font-bold">UTILIDAD OPERATIVA</TableCell>
                <TableCell className="text-right font-bold">{utilidadOperativa.toFixed(2)}</TableCell>
                <TableCell className="text-right font-bold">{margenOperativo.toFixed(1)}%</TableCell>
              </TableRow>

              {/* OTROS INGRESOS */}
              {renderMainSection(
                'otrosIngresos',
                '(+) OTROS INGRESOS',
                estadoResultados.otrosIngresos.totalOtrosIngresos,
                estadoResultados.otrosIngresos,
                estadoResultados.otrosIngresos.todasLasCuentas,
                estadoResultados.ingresos.totalIngresos > 0 ? `${((estadoResultados.otrosIngresos.totalOtrosIngresos / estadoResultados.ingresos.totalIngresos) * 100).toFixed(1)}%` : '0.0%',
                false,
                'text-teal-700 bg-teal-50'
              )}

              {/* OTROS GASTOS */}
              {renderMainSection(
                'otrosGastos',
                '(-) OTROS GASTOS',
                estadoResultados.otrosGastos.totalOtrosGastos,
                estadoResultados.otrosGastos,
                estadoResultados.otrosGastos.todasLasCuentas,
                estadoResultados.ingresos.totalIngresos > 0 ? `${((estadoResultados.otrosGastos.totalOtrosGastos / estadoResultados.ingresos.totalIngresos) * 100).toFixed(1)}%` : '0.0%',
                true,
                'text-pink-700 bg-pink-50'
              )}

              {/* UTILIDAD ANTES DE IMPUESTOS */}
              <TableRow className="font-bold text-lg text-amber-600 bg-amber-100 border-t-2 border-b-2">
                <TableCell className="font-bold">UTILIDAD ANTES DE IMPUESTOS</TableCell>
                <TableCell className="text-right font-bold">{utilidadAntesImpuestos.toFixed(2)}</TableCell>
                <TableCell className="text-right font-bold">
                  {estadoResultados.ingresos.totalIngresos > 0 ? ((utilidadAntesImpuestos / estadoResultados.ingresos.totalIngresos) * 100).toFixed(1) : '0.0'}%
                </TableCell>
              </TableRow>

              {/* IMPUESTOS */}
              {renderMainSection(
                'impuestos',
                '(-) IMPUESTOS',
                estadoResultados.impuestos.totalImpuestos,
                estadoResultados.impuestos,
                estadoResultados.impuestos.todasLasCuentas,
                estadoResultados.ingresos.totalIngresos > 0 ? `${((estadoResultados.impuestos.totalImpuestos / estadoResultados.ingresos.totalIngresos) * 100).toFixed(1)}%` : '0.0%',
                true,
                'text-red-700 bg-red-50'
              )}
            </TableBody>
            <TableFooter>
              <TableRow className={`font-bold text-xl border-t-4 ${utilidadNeta >= 0 ? 'text-green-700 bg-green-100' : 'text-red-700 bg-red-100'}`}>
                <TableCell className="font-bold">UTILIDAD NETA</TableCell>
                <TableCell className="text-right font-bold">{utilidadNeta.toFixed(2)}</TableCell>
                <TableCell className="text-right font-bold">{margenNeto.toFixed(1)}%</TableCell>
              </TableRow>
            </TableFooter>
          </Table>

          <div className="mt-6 flex justify-between items-center">
            <Badge variant={utilidadNeta >= 0 ? "default" : "destructive"} className="text-base px-4 py-2">
              {utilidadNeta >= 0 ? 'Utilidad' : 'Pérdida'}: Bs. {Math.abs(utilidadNeta).toFixed(2)}
            </Badge>
            <div className="text-sm text-muted-foreground">
              Período: {format(fechaInicio, 'dd/MM/yyyy')} al {format(fechaFin, 'dd/MM/yyyy')}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default EstadoResultadosModule;
