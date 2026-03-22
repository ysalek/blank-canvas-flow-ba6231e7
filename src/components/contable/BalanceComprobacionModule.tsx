
import { useState } from 'react';
import { useReportesContables } from '@/hooks/useReportesContables';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Scale, FileWarning, Filter, CalendarIcon } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { EnhancedHeader, EnhancedMetricCard, MetricGrid } from './dashboard/EnhancedLayout';

const BalanceComprobacionModule = () => {
    const { getTrialBalanceData } = useReportesContables();
    const [fechaInicio, setFechaInicio] = useState<Date | undefined>();
    const [fechaFin, setFechaFin] = useState<Date | undefined>();
    const [cuentaInicio, setCuentaInicio] = useState('');
    const [cuentaFin, setCuentaFin] = useState('');
    const [formato4Columnas, setFormato4Columnas] = useState(false);
    const [isGenerating, setIsGenerating] = useState(false);
    
    const generarReporte = async () => {
        setIsGenerating(true);
        // Simular proceso de generación
        await new Promise(resolve => setTimeout(resolve, 1000));
        setIsGenerating(false);
        // Forzar actualización de datos
        window.location.hash = `#${Date.now()}`;
    };
    
    const { details, totals } = getTrialBalanceData({ 
        fechaInicio: fechaInicio ? format(fechaInicio, 'yyyy-MM-dd') : '', 
        fechaFin: fechaFin ? format(fechaFin, 'yyyy-MM-dd') : '', 
        cuentaInicio, 
        cuentaFin 
    });

    const totalsMatch = Math.abs(totals.sumaDebe - totals.sumaHaber) < 0.01;
    const balancesMatch = Math.abs(totals.saldoDeudor - totals.saldoAcreedor) < 0.01;

    return (
        <div className="page-shell space-y-6 pb-12">
            <EnhancedHeader
                title="Balance de comprobacion"
                subtitle="Controla sumas, saldos y cuadre contable con filtros mas claros para revision operativa y auditoria."
                badge={{
                    text: totalsMatch && balancesMatch ? 'Cuadre correcto' : 'Revisar diferencias',
                    variant: totalsMatch && balancesMatch ? 'secondary' : 'destructive'
                }}
            />

            <MetricGrid columns={4}>
                <EnhancedMetricCard title="Suma debe" value={`Bs ${totals.sumaDebe.toFixed(2)}`} subtitle="Movimiento acumulado" icon={Scale} />
                <EnhancedMetricCard title="Suma haber" value={`Bs ${totals.sumaHaber.toFixed(2)}`} subtitle="Contrapartida acumulada" icon={Scale} />
                <EnhancedMetricCard title="Saldo deudor" value={`Bs ${totals.saldoDeudor.toFixed(2)}`} subtitle="Saldos del periodo" icon={FileWarning} variant={balancesMatch ? 'success' : 'warning'} />
                <EnhancedMetricCard title="Saldo acreedor" value={`Bs ${totals.saldoAcreedor.toFixed(2)}`} subtitle="Comparativo de saldos" icon={Filter} variant={balancesMatch ? 'success' : 'warning'} />
            </MetricGrid>

        <Card>
            <CardHeader>
                <CardTitle className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Scale className="w-6 h-6" />
                        Balance de Comprobación de Sumas y Saldos
                    </div>
                    <Button 
                        onClick={generarReporte}
                        disabled={isGenerating}
                        variant="default"
                        size="sm"
                        className="flex items-center gap-2"
                    >
                        <Filter className="w-4 h-4" />
                        {isGenerating ? 'Generando...' : 'Generar Reporte'}
                    </Button>
                </CardTitle>
                <CardDescription>
                    Balance de sumas y saldos por período - Cumple normativa contable boliviana
                </CardDescription>
            </CardHeader>
            <CardContent>
                {details.length === 0 ? (
                    <div className="text-center py-10 text-muted-foreground">
                        <p>No hay datos suficientes para generar el balance de comprobación.</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {/* Filtros */}
                        <Card>
                            <CardContent className="pt-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4 items-end">
                                    <div>
                                        <Label>Fecha Inicio</Label>
                                        <Popover>
                                            <PopoverTrigger asChild>
                                                <Button
                                                    variant="outline"
                                                    className={cn(
                                                        "w-full justify-start text-left font-normal",
                                                        !fechaInicio && "text-muted-foreground"
                                                    )}
                                                >
                                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                                    {fechaInicio ? format(fechaInicio, "dd/MM/yyyy") : <span>Seleccionar</span>}
                                                </Button>
                                            </PopoverTrigger>
                                            <PopoverContent className="w-auto p-0" align="start">
                                                <CalendarComponent
                                                    mode="single"
                                                    selected={fechaInicio}
                                                    onSelect={setFechaInicio}
                                                    initialFocus
                                                    className={cn("p-3 pointer-events-auto")}
                                                />
                                            </PopoverContent>
                                        </Popover>
                                    </div>
                                    <div>
                                        <Label>Fecha Fin</Label>
                                        <Popover>
                                            <PopoverTrigger asChild>
                                                <Button
                                                    variant="outline"
                                                    className={cn(
                                                        "w-full justify-start text-left font-normal",
                                                        !fechaFin && "text-muted-foreground"
                                                    )}
                                                >
                                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                                    {fechaFin ? format(fechaFin, "dd/MM/yyyy") : <span>Seleccionar</span>}
                                                </Button>
                                            </PopoverTrigger>
                                            <PopoverContent className="w-auto p-0" align="start">
                                                <CalendarComponent
                                                    mode="single"
                                                    selected={fechaFin}
                                                    onSelect={setFechaFin}
                                                    initialFocus
                                                    className={cn("p-3 pointer-events-auto")}
                                                />
                                            </PopoverContent>
                                        </Popover>
                                    </div>
                                    <div>
                                        <Label htmlFor="cuentaInicio">Cuenta Inicio</Label>
                                        <Input
                                            id="cuentaInicio"
                                            placeholder="Ej: 1000"
                                            value={cuentaInicio}
                                            onChange={(e) => setCuentaInicio(e.target.value)}
                                        />
                                    </div>
                                    <div>
                                        <Label htmlFor="cuentaFin">Cuenta Fin</Label>
                                        <Input
                                            id="cuentaFin"
                                            placeholder="Ej: 9999"
                                            value={cuentaFin}
                                            onChange={(e) => setCuentaFin(e.target.value)}
                                        />
                                    </div>
                                    <div className="flex items-center space-x-2">
                                        <Switch
                                            id="formato4Columnas"
                                            checked={formato4Columnas}
                                            onCheckedChange={setFormato4Columnas}
                                        />
                                        <Label htmlFor="formato4Columnas">Formato 4 Columnas</Label>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Tabla del Balance */}
                        <div className="border rounded-md">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Código</TableHead>
                                        <TableHead>Cuenta</TableHead>
                                        {formato4Columnas ? (
                                            <>
                                                <TableHead className="text-right">Debe</TableHead>
                                                <TableHead className="text-right">Haber</TableHead>
                                            </>
                                        ) : (
                                            <>
                                                <TableHead className="text-right">Debe (Sumas)</TableHead>
                                                <TableHead className="text-right">Haber (Sumas)</TableHead>
                                                <TableHead className="text-right">Deudor (Saldos)</TableHead>
                                                <TableHead className="text-right">Acreedor (Saldos)</TableHead>
                                            </>
                                        )}
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {details.map((cuenta) => (
                                        <TableRow key={cuenta.codigo}>
                                            <TableCell>{cuenta.codigo}</TableCell>
                                            <TableCell className="max-w-[300px] truncate">{cuenta.nombre}</TableCell>
                                            {formato4Columnas ? (
                                                <>
                                                    <TableCell className="text-right">
                                                        {cuenta.sumaDebe > 0 ? `Bs. ${cuenta.sumaDebe.toFixed(2)}` : '-'}
                                                    </TableCell>
                                                    <TableCell className="text-right">
                                                        {cuenta.sumaHaber > 0 ? `Bs. ${cuenta.sumaHaber.toFixed(2)}` : '-'}
                                                    </TableCell>
                                                </>
                                            ) : (
                                                <>
                                                    <TableCell className="text-right">Bs. {cuenta.sumaDebe.toFixed(2)}</TableCell>
                                                    <TableCell className="text-right">Bs. {cuenta.sumaHaber.toFixed(2)}</TableCell>
                                                    <TableCell className="text-right">{cuenta.saldoDeudor > 0 ? `Bs. ${cuenta.saldoDeudor.toFixed(2)}` : '-'}</TableCell>
                                                    <TableCell className="text-right">{cuenta.saldoAcreedor > 0 ? `Bs. ${cuenta.saldoAcreedor.toFixed(2)}` : '-'}</TableCell>
                                                </>
                                            )}
                                        </TableRow>
                                    ))}
                                </TableBody>
                                <TableFooter>
                                    <TableRow className="bg-muted/50 font-bold">
                                        <TableCell colSpan={2}>Totales</TableCell>
                                        {formato4Columnas ? (
                                            <>
                                                <TableCell className={`text-right ${!totalsMatch ? 'text-red-500' : ''}`}>
                                                    Bs. {totals.sumaDebe.toFixed(2)}
                                                </TableCell>
                                                <TableCell className={`text-right ${!totalsMatch ? 'text-red-500' : ''}`}>
                                                    Bs. {totals.sumaHaber.toFixed(2)}
                                                </TableCell>
                                            </>
                                        ) : (
                                            <>
                                                <TableCell className={`text-right ${!totalsMatch ? 'text-red-500' : ''}`}>Bs. {totals.sumaDebe.toFixed(2)}</TableCell>
                                                <TableCell className={`text-right ${!totalsMatch ? 'text-red-500' : ''}`}>Bs. {totals.sumaHaber.toFixed(2)}</TableCell>
                                                <TableCell className={`text-right ${!balancesMatch ? 'text-red-500' : ''}`}>Bs. {totals.saldoDeudor.toFixed(2)}</TableCell>
                                                <TableCell className={`text-right ${!balancesMatch ? 'text-red-500' : ''}`}>Bs. {totals.saldoAcreedor.toFixed(2)}</TableCell>
                                            </>
                                        )}
                                    </TableRow>
                                </TableFooter>
                            </Table>
                        </div>
                        {(!totalsMatch || !balancesMatch) && (
                            <div className="p-4 bg-red-50 border border-red-200 rounded-md flex items-center gap-3 text-red-800">
                                <FileWarning className="w-5 h-5" />
                                <div>
                                    <h4 className="font-bold">¡Descuadre Contable!</h4>
                                    <p className="text-sm">Los totales de sumas y/o saldos no coinciden. Por favor, revise los asientos contables.</p>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </CardContent>
        </Card>
        </div>
    );
};

export default BalanceComprobacionModule;
