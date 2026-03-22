import React, { useCallback, useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { BookOpenCheck, Calendar, Filter, Download, Search } from 'lucide-react';
import { useAsientos } from '@/hooks/useAsientos';
import { useSupabasePlanCuentas } from '@/hooks/useSupabasePlanCuentas';
import { AsientoContable } from './diary/DiaryData';
import { EnhancedHeader, EnhancedMetricCard, MetricGrid } from './dashboard/EnhancedLayout';

interface MovimientoCuenta {
  fecha: string;
  numeroAsiento: string;
  concepto: string;
  referencia: string;
  debe: number;
  haber: number;
  saldo: number;
}

interface CuentaMayor {
  codigo: string;
  nombre: string;
  movimientos: MovimientoCuenta[];
  saldoInicial: number;
  saldoFinal: number;
  totalDebe: number;
  totalHaber: number;
}

const LibroMayor = () => {
  const [fechaInicio, setFechaInicio] = useState(new Date(new Date().getFullYear(), 0, 1).toISOString().slice(0, 10));
  const [fechaFin, setFechaFin] = useState(new Date().toISOString().slice(0, 10));
  const [cuentaSeleccionada, setCuentaSeleccionada] = useState<string>('all');
  const [busquedaCuenta, setBusquedaCuenta] = useState('');
  const [cuentasMayor, setCuentasMayor] = useState<CuentaMayor[]>([]);
  const [cuentasDisponibles, setCuentasDisponibles] = useState<{codigo: string, nombre: string}[]>([]);
  
  const { getAsientos, asientos, loading } = useAsientos();
  const { planCuentas: planCuentasSupabase, loading: loadingPlan } = useSupabasePlanCuentas();

  const generarLibroMayor = useCallback(() => {
    const asientos = getAsientos();
    const planCuentas = planCuentasSupabase;
    
    // Filtrar asientos por fecha
    const asientosFiltrados = asientos.filter(asiento => {
      const fechaAsiento = new Date(asiento.fecha);
      const fechaInicioObj = new Date(fechaInicio);
      const fechaFinObj = new Date(fechaFin);
      return fechaAsiento >= fechaInicioObj && fechaAsiento <= fechaFinObj && asiento.estado === 'registrado';
    });

    // Obtener saldos iniciales (antes del período)
    const asientosAnteriores = asientos.filter(asiento => {
      const fechaAsiento = new Date(asiento.fecha);
      const fechaInicioObj = new Date(fechaInicio);
      return fechaAsiento < fechaInicioObj && asiento.estado === 'registrado';
    });

    // Calcular saldos iniciales por cuenta
    const saldosIniciales = new Map<string, number>();
    asientosAnteriores.forEach(asiento => {
      asiento.cuentas.forEach(cuenta => {
        const saldoActual = saldosIniciales.get(cuenta.codigo) || 0;
        saldosIniciales.set(cuenta.codigo, saldoActual + cuenta.debe - cuenta.haber);
      });
    });

    // Agrupar por cuenta
    const cuentasMap = new Map<string, MovimientoCuenta[]>();
    const cuentasInfo = new Map<string, string>();

    // Llenar información de cuentas desde el plan de cuentas
    planCuentas.forEach((cuenta) => {
      cuentasInfo.set(cuenta.codigo, cuenta.nombre);
    });

    asientosFiltrados.forEach(asiento => {
      asiento.cuentas.forEach(cuenta => {
        const key = cuenta.codigo;
        cuentasInfo.set(key, cuenta.nombre);
        
        if (!cuentasMap.has(key)) {
          cuentasMap.set(key, []);
        }

        const movimiento: MovimientoCuenta = {
          fecha: asiento.fecha,
          numeroAsiento: asiento.numero,
          concepto: asiento.concepto,
          referencia: asiento.referencia,
          debe: cuenta.debe,
          haber: cuenta.haber,
          saldo: 0 // Se calculará después
        };

        cuentasMap.get(key)!.push(movimiento);
      });
    });

    // Crear cuentas mayor con saldos calculados
    const cuentasMayorData: CuentaMayor[] = [];
    
    cuentasMap.forEach((movimientos, codigo) => {
      // Ordenar movimientos por fecha y número de asiento
      movimientos.sort((a, b) => {
        const fechaDiff = new Date(a.fecha).getTime() - new Date(b.fecha).getTime();
        if (fechaDiff !== 0) return fechaDiff;
        return a.numeroAsiento.localeCompare(b.numeroAsiento);
      });
      
      const saldoInicial = saldosIniciales.get(codigo) || 0;
      let saldoAcumulado = saldoInicial;
      let totalDebe = 0;
      let totalHaber = 0;

      // Calcular saldos acumulados
      const movimientosConSaldo = movimientos.map(movimiento => {
        totalDebe += movimiento.debe;
        totalHaber += movimiento.haber;
        saldoAcumulado += movimiento.debe - movimiento.haber;
        
        return {
          ...movimiento,
          saldo: saldoAcumulado
        };
      });

      const cuentaMayor: CuentaMayor = {
        codigo,
        nombre: cuentasInfo.get(codigo) || 'Cuenta Desconocida',
        movimientos: movimientosConSaldo,
        saldoInicial,
        saldoFinal: saldoAcumulado,
        totalDebe,
        totalHaber
      };

      cuentasMayorData.push(cuentaMayor);
    });

    // Incluir cuentas con saldo inicial pero sin movimientos en el período
    saldosIniciales.forEach((saldo, codigo) => {
      if (!cuentasMap.has(codigo) && Math.abs(saldo) > 0.01) {
        const cuentaMayor: CuentaMayor = {
          codigo,
          nombre: cuentasInfo.get(codigo) || 'Cuenta Desconocida',
          movimientos: [],
          saldoInicial: saldo,
          saldoFinal: saldo,
          totalDebe: 0,
          totalHaber: 0
        };
        cuentasMayorData.push(cuentaMayor);
      }
    });

    // Ordenar por código de cuenta
    cuentasMayorData.sort((a, b) => a.codigo.localeCompare(b.codigo));
    
    setCuentasMayor(cuentasMayorData);
    
    // Combinar cuentas con movimientos + todas las del plan de cuentas
    const todasLasCuentas = new Map<string, string>();
    planCuentasSupabase.forEach(c => todasLasCuentas.set(c.codigo, c.nombre));
    cuentasMayorData.forEach(c => todasLasCuentas.set(c.codigo, c.nombre));

    const cuentasUnicas = Array.from(todasLasCuentas.entries())
      .map(([codigo, nombre]) => ({ codigo, nombre }))
      .sort((a, b) => a.codigo.localeCompare(b.codigo));
    setCuentasDisponibles(cuentasUnicas);
  }, [fechaFin, fechaInicio, getAsientos, planCuentasSupabase]);

  useEffect(() => {
    generarLibroMayor();
  }, [asientos, generarLibroMayor]);

  const filtrarCuentas = () => {
    let cuentasFiltradas = cuentasMayor;

    if (cuentaSeleccionada && cuentaSeleccionada !== 'all') {
      cuentasFiltradas = cuentasFiltradas.filter(cuenta => cuenta.codigo === cuentaSeleccionada);
    }

    if (busquedaCuenta) {
      cuentasFiltradas = cuentasFiltradas.filter(cuenta => 
        cuenta.codigo.toLowerCase().includes(busquedaCuenta.toLowerCase()) ||
        cuenta.nombre.toLowerCase().includes(busquedaCuenta.toLowerCase())
      );
    }

    return cuentasFiltradas;
  };

  const exportarLibroMayor = () => {
    const cuentasFiltradas = filtrarCuentas();
    
    let contenido = `LIBRO MAYOR\nPeríodo: ${fechaInicio} al ${fechaFin}\n\n`;
    
    cuentasFiltradas.forEach(cuenta => {
      contenido += `CUENTA: ${cuenta.codigo} - ${cuenta.nombre}\n`;
      contenido += `Saldo Final: ${cuenta.saldoFinal.toFixed(2)} Bs.\n`;
      contenido += `Total Debe: ${cuenta.totalDebe.toFixed(2)} Bs. | Total Haber: ${cuenta.totalHaber.toFixed(2)} Bs.\n\n`;
      
      contenido += `Fecha\tAsiento\tConcepto\tDebe\tHaber\tSaldo\n`;
      cuenta.movimientos.forEach(mov => {
        contenido += `${mov.fecha}\t${mov.numeroAsiento}\t${mov.concepto}\t${mov.debe.toFixed(2)}\t${mov.haber.toFixed(2)}\t${mov.saldo.toFixed(2)}\n`;
      });
      
      contenido += `\n${'='.repeat(80)}\n\n`;
    });

    const blob = new Blob([contenido], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `libro_mayor_${fechaInicio}_${fechaFin}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const cuentasFiltradas = filtrarCuentas();
  const totalDebe = cuentasFiltradas.reduce((sum, cuenta) => sum + cuenta.totalDebe, 0);
  const totalHaber = cuentasFiltradas.reduce((sum, cuenta) => sum + cuenta.totalHaber, 0);
  const cuentasConMovimiento = cuentasFiltradas.filter((cuenta) => cuenta.movimientos.length > 0).length;

  return (
    <div className="page-shell space-y-6 pb-12">
      <EnhancedHeader
        title="Libro mayor"
        subtitle="Consulta el detalle por cuenta contable con saldos iniciales, movimientos y cierre del periodo."
        badge={{
          text: `${cuentasFiltradas.length} cuentas`,
          variant: 'secondary'
        }}
        actions={
          <Button onClick={exportarLibroMayor} variant="outline" size="sm">
            <Download className="mr-2 h-4 w-4" />
            Exportar
          </Button>
        }
      />

      <MetricGrid columns={4}>
        <EnhancedMetricCard title="Cuentas visibles" value={cuentasFiltradas.length} subtitle="Segun filtros aplicados" icon={BookOpenCheck} />
        <EnhancedMetricCard title="Con movimiento" value={cuentasConMovimiento} subtitle="Cuentas con actividad" icon={Search} variant="success" />
        <EnhancedMetricCard title="Debe acumulado" value={`Bs ${totalDebe.toFixed(2)}`} subtitle="Movimiento deudor" icon={Filter} />
        <EnhancedMetricCard title="Haber acumulado" value={`Bs ${totalHaber.toFixed(2)}`} subtitle="Movimiento acreedor" icon={Calendar} />
      </MetricGrid>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpenCheck className="w-6 h-6" />
            Libro Mayor - Normativa Boliviana
          </CardTitle>
          <CardDescription>
            Registro detallado de movimientos por cuenta contable según normativa del CTNAC
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Filtros */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              <div className="flex flex-col gap-1">
                <Label htmlFor="fecha-inicio">Desde:</Label>
                <Input
                  id="fecha-inicio"
                  type="date"
                  value={fechaInicio}
                  onChange={(e) => setFechaInicio(e.target.value)}
                />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex flex-col gap-1">
                <Label htmlFor="fecha-fin">Hasta:</Label>
                <Input
                  id="fecha-fin"
                  type="date"
                  value={fechaFin}
                  onChange={(e) => setFechaFin(e.target.value)}
                />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Search className="w-4 h-4" />
              <div className="flex flex-col gap-1">
                <Label>Buscar Cuenta:</Label>
                <Input
                  placeholder="Código o nombre..."
                  value={busquedaCuenta}
                  onChange={(e) => setBusquedaCuenta(e.target.value)}
                />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4" />
              <div className="flex flex-col gap-1">
                <Label>Cuenta Específica:</Label>
                <Select value={cuentaSeleccionada} onValueChange={setCuentaSeleccionada}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todas las cuentas" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas las cuentas</SelectItem>
                    {cuentasDisponibles.map(cuenta => (
                      <SelectItem key={cuenta.codigo} value={cuenta.codigo}>
                        {cuenta.codigo} - {cuenta.nombre}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Botón de exportar */}
          <div className="flex justify-end mb-4">
            <Button onClick={exportarLibroMayor} className="flex items-center gap-2">
              <Download className="w-4 h-4" />
              Exportar Libro Mayor
            </Button>
          </div>

          {/* Resumen */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-primary">
                  {cuentasFiltradas.length}
                </div>
                <div className="text-sm text-muted-foreground">Cuentas con Movimiento</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-green-600">
                  Bs. {cuentasFiltradas.reduce((sum, cuenta) => sum + cuenta.totalDebe, 0).toFixed(2)}
                </div>
                <div className="text-sm text-muted-foreground">Total Débitos</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-red-600">
                  Bs. {cuentasFiltradas.reduce((sum, cuenta) => sum + cuenta.totalHaber, 0).toFixed(2)}
                </div>
                <div className="text-sm text-muted-foreground">Total Créditos</div>
              </CardContent>
            </Card>
          </div>

          {/* Cuentas Mayor */}
          <div className="space-y-6">
            {cuentasFiltradas.map(cuenta => (
              <Card key={cuenta.codigo} className="border-l-4 border-l-primary">
                <CardHeader className="pb-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-lg">
                        {cuenta.codigo} - {cuenta.nombre}
                      </CardTitle>
                      <CardDescription>
                        {cuenta.movimientos.length} movimientos registrados
                      </CardDescription>
                    </div>
                  <div className="text-right">
                      <div className="text-lg font-medium text-muted-foreground">
                        Saldo Inicial: Bs. {cuenta.saldoInicial.toFixed(2)}
                      </div>
                      <div className="text-2xl font-bold">
                        Bs. {cuenta.saldoFinal.toFixed(2)}
                      </div>
                      <div className="text-sm text-muted-foreground">Saldo Final</div>
                    </div>
                  </div>
                  <div className="flex gap-4 text-sm">
                    <Badge variant="outline" className="text-green-600">
                      Debe: Bs. {cuenta.totalDebe.toFixed(2)}
                    </Badge>
                    <Badge variant="outline" className="text-red-600">
                      Haber: Bs. {cuenta.totalHaber.toFixed(2)}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Fecha</TableHead>
                        <TableHead>N° Asiento</TableHead>
                        <TableHead>Concepto</TableHead>
                        <TableHead>Referencia</TableHead>
                        <TableHead className="text-right">Debe (Bs.)</TableHead>
                        <TableHead className="text-right">Haber (Bs.)</TableHead>
                        <TableHead className="text-right">Saldo (Bs.)</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {/* Saldo inicial si existe */}
                      {cuenta.saldoInicial !== 0 && (
                        <TableRow className="bg-muted/50">
                          <TableCell className="font-semibold">Saldo Inicial</TableCell>
                          <TableCell>-</TableCell>
                          <TableCell className="italic">Saldo del período anterior</TableCell>
                          <TableCell>-</TableCell>
                          <TableCell className="text-right">-</TableCell>
                          <TableCell className="text-right">-</TableCell>
                          <TableCell className="text-right font-bold">
                            {cuenta.saldoInicial.toFixed(2)}
                          </TableCell>
                        </TableRow>
                      )}
                      {cuenta.movimientos.map((movimiento, index) => (
                        <TableRow key={index}>
                          <TableCell>{new Date(movimiento.fecha).toLocaleDateString('es-BO')}</TableCell>
                          <TableCell className="font-mono">{movimiento.numeroAsiento}</TableCell>
                          <TableCell>{movimiento.concepto}</TableCell>
                          <TableCell>{movimiento.referencia}</TableCell>
                          <TableCell className="text-right font-semibold text-green-600">
                            {movimiento.debe > 0 ? movimiento.debe.toFixed(2) : '-'}
                          </TableCell>
                          <TableCell className="text-right font-semibold text-red-600">
                            {movimiento.haber > 0 ? movimiento.haber.toFixed(2) : '-'}
                          </TableCell>
                          <TableCell className="text-right font-semibold">
                            {movimiento.saldo.toFixed(2)}
                          </TableCell>
                        </TableRow>
                      ))}
                      {/* Totales si hay movimientos */}
                      {cuenta.movimientos.length > 0 && (
                        <TableRow className="bg-primary/10 font-semibold">
                          <TableCell colSpan={4} className="text-right">TOTALES:</TableCell>
                          <TableCell className="text-right text-green-600">
                            {cuenta.totalDebe.toFixed(2)}
                          </TableCell>
                          <TableCell className="text-right text-red-600">
                            {cuenta.totalHaber.toFixed(2)}
                          </TableCell>
                          <TableCell className="text-right font-bold text-primary">
                            {cuenta.saldoFinal.toFixed(2)}
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            ))}
          </div>

          {(loading || loadingPlan) && (
            <Card>
              <CardContent className="p-8 text-center">
                <BookOpenCheck className="w-12 h-12 mx-auto mb-4 text-muted-foreground animate-pulse" />
                <h3 className="text-lg font-semibold mb-2">Cargando datos contables...</h3>
                <p className="text-muted-foreground">Obteniendo asientos y plan de cuentas desde la base de datos</p>
              </CardContent>
            </Card>
          )}

          {!loading && !loadingPlan && cuentasFiltradas.length === 0 && (
            <Card>
              <CardContent className="p-8 text-center">
                <BookOpenCheck className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-semibold mb-2">Sin movimientos contables</h3>
                <p className="text-muted-foreground">
                  No se encontraron movimientos contables en el período seleccionado.
                </p>
              </CardContent>
            </Card>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default LibroMayor;
