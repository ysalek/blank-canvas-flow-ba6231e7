import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Upload, Download, CheckCircle, AlertCircle, RefreshCw, FileSpreadsheet, Banknote, Calculator } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useContabilidadIntegration } from '@/hooks/useContabilidadIntegration';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AsientoContable } from '../diary/DiaryData';

interface MovimientoBancario {
  id: string;
  fecha: string;
  descripcion: string;
  referencia: string;
  debito: number;
  credito: number;
  saldo: number;
  conciliado: boolean;
}

interface MovimientoContable {
  id: string;
  fecha: string;
  numero: string;
  descripcion: string;
  debe: number;
  haber: number;
  conciliado: boolean;
}

const ConciliacionBancaria = () => {
  const { toast } = useToast();
  const { guardarAsiento } = useContabilidadIntegration();
  const [selectedBank, setSelectedBank] = useState('');
  const [fechaCorte, setFechaCorte] = useState(new Date().toISOString().slice(0, 10));
  const [saldoLibros, setSaldoLibros] = useState(0);
  const [saldoBanco, setSaldoBanco] = useState(0);
  const [diferencias, setDiferencias] = useState<any[]>([]);
  const [ajustesContables, setAjustesContables] = useState<any[]>([]);
  const [showAjusteDialog, setShowAjusteDialog] = useState(false);
  const [ajusteSeleccionado, setAjusteSeleccionado] = useState<any>(null);

  useEffect(() => {
    cargarDatosBancarios();
  }, [selectedBank, fechaCorte]);

  const cargarDatosBancarios = () => {
    // Cargar movimientos bancarios y contables para conciliar
    const cuentasBancarias = JSON.parse(localStorage.getItem('cuentasBancarias') || '[]');
    const movimientosBancarios = JSON.parse(localStorage.getItem('movimientosBancarios') || '[]');
    const asientos = JSON.parse(localStorage.getItem('asientosContables') || '[]');
    
    if (selectedBank && fechaCorte) {
      // Calcular saldo en libros (asientos contables)
      const saldoEnLibros = calcularSaldoLibros(asientos, selectedBank, fechaCorte);
      setSaldoLibros(saldoEnLibros);
      
      // Obtener saldo banco del último movimiento
      const movimientosBanco = movimientosBancarios.filter((m: any) => 
        m.cuenta_bancaria_id === selectedBank && m.fecha <= fechaCorte
      );
      const ultimoMovimiento = movimientosBanco[movimientosBanco.length - 1];
      setSaldoBanco(ultimoMovimiento?.saldo_actual || 0);
      
      // Identificar diferencias
      identificarDiferencias(movimientosBanco, asientos);
    }
  };

  const calcularSaldoLibros = (asientos: any[], cuentaBancaria: string, fechaCorte: string) => {
    let saldo = 0;
    asientos.forEach(asiento => {
      if (asiento.fecha <= fechaCorte && asiento.estado === 'registrado') {
        asiento.cuentas.forEach((cuenta: any) => {
          // Buscar movimientos de la cuenta bancaria específica (ej: 1111, 1112, etc.)
          if (cuenta.codigo.startsWith('111') && cuenta.nombre.includes('Banco')) {
            saldo += cuenta.debe - cuenta.haber;
          }
        });
      }
    });
    return saldo;
  };

  const identificarDiferencias = (movimientosBanco: any[], asientos: any[]) => {
    const diferenciasEncontradas: any[] = [];
    const ajustesRequeridos: any[] = [];
    
    // Cheques en tránsito (registrados en libros pero no en banco)
    const chequesTransito = asientos.filter(a => 
      a.concepto.includes('Cheque') && 
      !movimientosBanco.some(m => m.numero_comprobante === a.referencia)
    );
    
    chequesTransito.forEach(cheque => {
      diferenciasEncontradas.push({
        tipo: 'cheque_transito',
        descripcion: `Cheque en tránsito: ${cheque.referencia}`,
        monto: cheque.debe || cheque.haber,
        fecha: cheque.fecha,
        requiereAjuste: false
      });
    });

    // Depósitos en tránsito (en banco pero no en libros)
    const depositosTransito = movimientosBanco.filter(m => 
      m.tipo === 'deposito' && 
      !asientos.some(a => a.referencia === m.numero_comprobante)
    );
    
    depositosTransito.forEach(deposito => {
      diferenciasEncontradas.push({
        tipo: 'deposito_transito',
        descripcion: `Depósito en tránsito: ${deposito.numero_comprobante}`,
        monto: deposito.monto,
        fecha: deposito.fecha,
        requiereAjuste: true,
        datosOriginales: deposito
      });
      
      ajustesRequeridos.push({
        tipo: 'deposito_no_registrado',
        descripcion: `Registrar depósito: ${deposito.descripcion}`,
        monto: deposito.monto,
        fecha: deposito.fecha,
        referencia: deposito.numero_comprobante,
        cuentasBanco: deposito
      });
    });

    // Cargos bancarios (comisiones, intereses)
    const cargosBancarios = movimientosBanco.filter(m => 
      m.tipo === 'cargo' && 
      !asientos.some(a => a.referencia === m.numero_comprobante)
    );
    
    cargosBancarios.forEach(cargo => {
      ajustesRequeridos.push({
        tipo: 'cargo_bancario',
        descripcion: `Cargo bancario: ${cargo.descripcion}`,
        monto: Math.abs(cargo.monto),
        fecha: cargo.fecha,
        referencia: cargo.numero_comprobante,
        cuentasBanco: cargo
      });
    });

    setDiferencias(diferenciasEncontradas);
    setAjustesContables(ajustesRequeridos);
  };

  const generarAsientoAjuste = (ajuste: any) => {
    const numeroAsiento = `CONC-${Date.now()}`;
    
    let asientoAjuste: AsientoContable;
    
    switch (ajuste.tipo) {
      case 'deposito_no_registrado':
        asientoAjuste = {
          id: numeroAsiento,
          numero: numeroAsiento,
          fecha: ajuste.fecha,
          concepto: `Conciliación bancaria - ${ajuste.descripcion}`,
          referencia: ajuste.referencia,
          debe: ajuste.monto,
          haber: ajuste.monto,
          estado: 'registrado',
          cuentas: [
            {
              codigo: '1111',
              nombre: 'Bancos Moneda Nacional',
              debe: ajuste.monto,
              haber: 0
            },
            {
              codigo: '1121',
              nombre: 'Cuentas por Cobrar Clientes',
              debe: 0,
              haber: ajuste.monto
            }
          ]
        };
        break;
        
      case 'cargo_bancario':
        asientoAjuste = {
          id: numeroAsiento,
          numero: numeroAsiento,
          fecha: ajuste.fecha,
          concepto: `Conciliación bancaria - ${ajuste.descripcion}`,
          referencia: ajuste.referencia,
          debe: ajuste.monto,
          haber: ajuste.monto,
          estado: 'registrado',
          cuentas: [
            {
              codigo: '5241',
              nombre: 'Gastos Bancarios',
              debe: ajuste.monto,
              haber: 0
            },
            {
              codigo: '1111',
              nombre: 'Bancos Moneda Nacional',
              debe: 0,
              haber: ajuste.monto
            }
          ]
        };
        break;
        
      default:
        return false;
    }
    
    const resultado = guardarAsiento(asientoAjuste);
    if (resultado) {
      toast({
        title: "Asiento de ajuste creado",
        description: `${asientoAjuste.concepto} - Bs. ${ajuste.monto.toFixed(2)}`,
      });
      
      // Remover de ajustes pendientes
      setAjustesContables(prev => prev.filter(a => a !== ajuste));
      
      // Recargar datos
      cargarDatosBancarios();
    }
    
    return resultado;
  };

  const [movimientosBanco] = useState<MovimientoBancario[]>([
    {
      id: '1',
      fecha: '2024-01-15',
      descripcion: 'Depósito Cliente ABC',
      referencia: 'DEP001',
      debito: 0,
      credito: 5000,
      saldo: 25000,
      conciliado: true
    },
    {
      id: '2',
      fecha: '2024-01-16',
      descripcion: 'Cheque #001234',
      referencia: 'CHQ001234',
      debito: 2500,
      credito: 0,
      saldo: 22500,
      conciliado: false
    },
    {
      id: '3',
      fecha: '2024-01-17',
      descripcion: 'Comisión mensual',
      referencia: 'COM001',
      debito: 50,
      credito: 0,
      saldo: 22450,
      conciliado: false
    }
  ]);

  const [movimientosContables] = useState<MovimientoContable[]>([
    {
      id: '1',
      fecha: '2024-01-15',
      numero: 'AST001',
      descripcion: 'Cobro Cliente ABC',
      debe: 5000,
      haber: 0,
      conciliado: true
    },
    {
      id: '2',
      fecha: '2024-01-16',
      numero: 'AST002',
      descripcion: 'Pago Proveedor XYZ',
      debe: 0,
      haber: 2500,
      conciliado: false
    }
  ]);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <RefreshCw className="h-5 w-5" />
            Conciliación Bancaria Automática
          </CardTitle>
          <CardDescription>
            Conciliación automática con generación de asientos de ajuste según normativa boliviana
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="banco">Cuenta Bancaria</Label>
              <select 
                id="banco"
                value={selectedBank} 
                onChange={(e) => setSelectedBank(e.target.value)}
                className="w-full p-2 border rounded"
              >
                <option value="">Seleccione cuenta</option>
                <option value="bcp001">BCP - Cuenta Corriente Bs.</option>
                <option value="bnb001">BNB - Cuenta Ahorro Bs.</option>
                <option value="fie001">FIE - Cuenta Corriente USD</option>
                <option value="union001">Banco Unión - Cuenta Empresarial</option>
              </select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="fecha-corte">Fecha de Corte</Label>
              <Input
                id="fecha-corte"
                type="date"
                value={fechaCorte}
                onChange={(e) => setFechaCorte(e.target.value)}
              />
            </div>
            
            <div className="space-y-2">
              <Label>Acciones</Label>
              <div className="flex gap-2">
                <Button size="sm" onClick={cargarDatosBancarios} className="flex-1">
                  <RefreshCw className="h-4 w-4 mr-1" />
                  Conciliar
                </Button>
              </div>
            </div>
          </div>

          {/* Resumen de Conciliación */}
          {selectedBank && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 bg-muted rounded-lg">
              <div className="text-center">
                <div className="text-2xl font-bold text-primary">Bs. {saldoLibros.toFixed(2)}</div>
                <div className="text-sm text-muted-foreground">Saldo en Libros</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-success">Bs. {saldoBanco.toFixed(2)}</div>
                <div className="text-sm text-muted-foreground">Saldo Banco</div>
              </div>
              <div className="text-center">
                <div className={`text-2xl font-bold ${Math.abs(saldoLibros - saldoBanco) < 0.01 ? 'text-success' : 'text-destructive'}`}>
                  Bs. {(saldoLibros - saldoBanco).toFixed(2)}
                </div>
                <div className="text-sm text-muted-foreground">Diferencia</div>
              </div>
              <div className="text-center">
                <Badge variant={Math.abs(saldoLibros - saldoBanco) < 0.01 ? "default" : "destructive"}>
                  {Math.abs(saldoLibros - saldoBanco) < 0.01 ? (
                    <>
                      <CheckCircle className="w-4 h-4 mr-1" />
                      Conciliado
                    </>
                  ) : (
                    <>
                      <AlertCircle className="w-4 h-4 mr-1" />
                      Descuadre
                    </>
                  )}
                </Badge>
              </div>
            </div>
          )}

          {/* Ajustes Contables Pendientes */}
          {ajustesContables.length > 0 && (
             <Card className="border-warning/30 bg-warning/5">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-warning">
                  <Calculator className="w-5 h-5" />
                  Ajustes Contables Requeridos ({ajustesContables.length})
                </CardTitle>
                <CardDescription>
                  Movimientos bancarios que requieren asientos de ajuste
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {ajustesContables.map((ajuste, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-card rounded border border-border/60">
                      <div className="flex-1">
                        <div className="font-medium">{ajuste.descripcion}</div>
                        <div className="text-sm text-muted-foreground">
                          {ajuste.fecha} • Bs. {ajuste.monto.toFixed(2)} • Ref: {ajuste.referencia}
                        </div>
                      </div>
                      <Button 
                        size="sm" 
                        onClick={() => generarAsientoAjuste(ajuste)}
                        className="ml-3"
                      >
                        <Banknote className="w-4 h-4 mr-1" />
                        Crear Asiento
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </CardContent>
      </Card>

      <Tabs defaultValue="movimientos-banco" className="space-y-4">
        <TabsList>
          <TabsTrigger value="movimientos-banco">Movimientos Banco</TabsTrigger>
          <TabsTrigger value="movimientos-contables">Movimientos Contables</TabsTrigger>
          <TabsTrigger value="diferencias">Diferencias Identificadas</TabsTrigger>
        </TabsList>

        <TabsContent value="movimientos-banco" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Movimientos del Banco</CardTitle>
              <CardDescription>
                Extracto bancario importado o capturado manualmente
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Descripción</TableHead>
                    <TableHead>Referencia</TableHead>
                    <TableHead className="text-right">Débito</TableHead>
                    <TableHead className="text-right">Crédito</TableHead>
                    <TableHead className="text-right">Saldo</TableHead>
                    <TableHead>Estado</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {movimientosBanco.map((mov) => (
                    <TableRow key={mov.id}>
                      <TableCell>{mov.fecha}</TableCell>
                      <TableCell>{mov.descripcion}</TableCell>
                      <TableCell className="font-mono text-sm">{mov.referencia}</TableCell>
                      <TableCell className="text-right">
                        {mov.debito > 0 && `Bs. ${mov.debito.toFixed(2)}`}
                      </TableCell>
                      <TableCell className="text-right">
                        {mov.credito > 0 && `Bs. ${mov.credito.toFixed(2)}`}
                      </TableCell>
                      <TableCell className="text-right font-semibold">
                        Bs. {mov.saldo.toFixed(2)}
                      </TableCell>
                      <TableCell>
                        <Badge variant={mov.conciliado ? "default" : "secondary"}>
                          {mov.conciliado ? "Conciliado" : "Pendiente"}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="movimientos-contables" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Movimientos Contables</CardTitle>
              <CardDescription>
                Asientos contables relacionados con la cuenta bancaria
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Asiento</TableHead>
                    <TableHead>Descripción</TableHead>
                    <TableHead className="text-right">Debe</TableHead>
                    <TableHead className="text-right">Haber</TableHead>
                    <TableHead>Estado</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {movimientosContables.map((mov) => (
                    <TableRow key={mov.id}>
                      <TableCell>{mov.fecha}</TableCell>
                      <TableCell className="font-mono text-sm">{mov.numero}</TableCell>
                      <TableCell>{mov.descripcion}</TableCell>
                      <TableCell className="text-right">
                        {mov.debe > 0 && `Bs. ${mov.debe.toFixed(2)}`}
                      </TableCell>
                      <TableCell className="text-right">
                        {mov.haber > 0 && `Bs. ${mov.haber.toFixed(2)}`}
                      </TableCell>
                      <TableCell>
                        <Badge variant={mov.conciliado ? "default" : "secondary"}>
                          {mov.conciliado ? "Conciliado" : "Pendiente"}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="diferencias" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertCircle className="w-5 h-5" />
                Diferencias Identificadas ({diferencias.length})
              </CardTitle>
              <CardDescription>
                Partidas conciliatorias entre banco y libros contables
              </CardDescription>
            </CardHeader>
            <CardContent>
              {diferencias.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Descripción</TableHead>
                      <TableHead>Fecha</TableHead>
                      <TableHead className="text-right">Monto</TableHead>
                      <TableHead>Requiere Ajuste</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {diferencias.map((diff, index) => (
                      <TableRow key={index}>
                        <TableCell>
                          <Badge variant={diff.requiereAjuste ? "destructive" : "secondary"}>
                            {diff.tipo.replace('_', ' ').toUpperCase()}
                          </Badge>
                        </TableCell>
                        <TableCell>{diff.descripcion}</TableCell>
                        <TableCell>{diff.fecha}</TableCell>
                        <TableCell className="text-right">Bs. {diff.monto.toFixed(2)}</TableCell>
                        <TableCell>
                          {diff.requiereAjuste ? (
                            <Badge variant="destructive">Sí</Badge>
                          ) : (
                            <Badge variant="secondary">No</Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-8">
                  <CheckCircle className="w-12 h-12 mx-auto text-success mb-4" />
                  <h3 className="text-lg font-semibold mb-2">¡Cuenta Conciliada!</h3>
                  <p className="text-muted-foreground">
                    No se encontraron diferencias entre los registros bancarios y contables.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ConciliacionBancaria;