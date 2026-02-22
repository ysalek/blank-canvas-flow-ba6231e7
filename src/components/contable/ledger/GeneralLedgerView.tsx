
import { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Download, Edit, Filter } from "lucide-react";
import { useContabilidadIntegration } from '@/hooks/useContabilidadIntegration';
import { useReportesContables } from '@/hooks/useReportesContables';
import * as XLSX from '@e965/xlsx';

const GeneralLedgerView = () => {
    const { getLibroMayor } = useContabilidadIntegration();
    const { getLibroMayor: getLibroMayorReportes } = useReportesContables();
    const [selectedAccount, setSelectedAccount] = useState<string>('');
    const [fechaInicio, setFechaInicio] = useState<string>('');
    const [fechaFin, setFechaFin] = useState<string>('');
    const [cuentaInicio, setCuentaInicio] = useState<string>('');
    const [cuentaFin, setCuentaFin] = useState<string>('');
    const [showFilters, setShowFilters] = useState<boolean>(false);
    
    const libroMayorData = useMemo(() => getLibroMayorReportes(), [getLibroMayorReportes]);
    const accounts = useMemo(() => Object.values(libroMayorData).sort((a, b) => a.codigo.localeCompare(b.codigo)), [libroMayorData]);

    const selectedAccountData = libroMayorData[selectedAccount];

    const getTipoCuenta = (codigo: string): 'deudor' | 'acreedor' => {
        // Activos (1), Costos (5), Gastos (6) son de naturaleza deudora
        if (codigo.startsWith('1') || codigo.startsWith('5') || codigo.startsWith('6')) {
            return 'deudor';
        }
        // Pasivos (2), Patrimonio (3), Ingresos (4) son de naturaleza acreedora
        return 'acreedor';
    };

    const calculateRunningBalance = (movimientos: any[], tipoCuenta: 'deudor' | 'acreedor') => {
        let balance = 0;
        return movimientos.map(mov => {
            if (tipoCuenta === 'deudor') {
                balance += mov.debe - mov.haber;
            } else { // acreedor
                balance += mov.haber - mov.debe;
            }
            return { ...mov, saldo: balance };
        });
    }

    // Filtrar movimientos por fecha
    const filteredMovements = useMemo(() => {
        if (!selectedAccountData) return [];
        
        let movements = selectedAccountData.movimientos;
        
        // Filtrar por rango de fechas
        if (fechaInicio && fechaFin) {
            const inicio = new Date(fechaInicio);
            const fin = new Date(fechaFin);
            fin.setHours(23, 59, 59, 999);
            
            movements = movements.filter(mov => {
                const fechaMov = new Date(mov.fecha);
                return fechaMov >= inicio && fechaMov <= fin;
            });
        }
        
        return movements;
    }, [selectedAccountData, fechaInicio, fechaFin]);
    
    // Filtrar cuentas por rango de códigos
    const filteredAccounts = useMemo(() => {
        let filtered = accounts;
        
        if (cuentaInicio && cuentaFin) {
            filtered = accounts.filter(account => 
                account.codigo >= cuentaInicio && account.codigo <= cuentaFin
            );
        }
        
        return filtered;
    }, [accounts, cuentaInicio, cuentaFin]);

    const detailedMovements = filteredMovements.length > 0 ? calculateRunningBalance(filteredMovements, getTipoCuenta(selectedAccountData?.codigo || '')) : [];

    const exportToExcel = () => {
        if (!selectedAccountData) return;
        
        const data = detailedMovements.map(mov => ({
            Fecha: mov.fecha,
            Concepto: mov.concepto,
            Referencia: mov.referencia,
            Debe: mov.debe,
            Haber: mov.haber,
            Saldo: mov.saldo
        }));
        
        const ws = XLSX.utils.json_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, `${selectedAccountData.codigo}-${selectedAccountData.nombre}`);
        
        // Agregar información de la cuenta
        const accountInfo = [
            [`Cuenta: ${selectedAccountData.codigo} - ${selectedAccountData.nombre}`],
            [`Total Debe: ${selectedAccountData.totalDebe.toFixed(2)}`],
            [`Total Haber: ${selectedAccountData.totalHaber.toFixed(2)}`],
            [`Saldo: ${(getTipoCuenta(selectedAccountData.codigo) === 'deudor' ? selectedAccountData.totalDebe - selectedAccountData.totalHaber : selectedAccountData.totalHaber - selectedAccountData.totalDebe).toFixed(2)}`],
            [''],
            ['Fecha', 'Concepto', 'Referencia', 'Debe', 'Haber', 'Saldo']
        ];
        
        const wsWithHeader = XLSX.utils.aoa_to_sheet(accountInfo.concat(data.map(row => Object.values(row))));
        const wbWithHeader = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wbWithHeader, wsWithHeader, `${selectedAccountData.codigo}-${selectedAccountData.nombre}`);
        
        XLSX.writeFile(wbWithHeader, `LibroMayor_${selectedAccountData.codigo}_${new Date().toISOString().slice(0, 10)}.xlsx`);
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle>Libro Mayor</CardTitle>
                <CardDescription>Consulta los movimientos y saldos de cada cuenta contable.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="flex flex-wrap gap-4 items-end">
                    <div className="min-w-[300px]">
                        <Label>Cuenta</Label>
                        <Select onValueChange={setSelectedAccount} value={selectedAccount}>
                            <SelectTrigger>
                                <SelectValue placeholder="Seleccione una cuenta" />
                            </SelectTrigger>
                            <SelectContent>
                                {filteredAccounts.map(account => (
                                    <SelectItem key={account.codigo} value={account.codigo}>
                                        {account.codigo} - {account.nombre}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    
                    <Button variant="outline" onClick={() => setShowFilters(!showFilters)}>
                        <Filter className="w-4 h-4 mr-2" />
                        Filtros
                    </Button>
                    
                    {selectedAccountData && (
                        <Button variant="outline" onClick={exportToExcel}>
                            <Download className="w-4 h-4 mr-2" />
                            Exportar Excel
                        </Button>
                    )}
                </div>

                {showFilters && (
                    <Card className="p-4 bg-muted/30">
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                            <div>
                                <Label htmlFor="fechaInicio">Fecha Inicio</Label>
                                <Input
                                    id="fechaInicio"
                                    type="date"
                                    value={fechaInicio}
                                    onChange={(e) => setFechaInicio(e.target.value)}
                                />
                            </div>
                            <div>
                                <Label htmlFor="fechaFin">Fecha Fin</Label>
                                <Input
                                    id="fechaFin"
                                    type="date"
                                    value={fechaFin}
                                    onChange={(e) => setFechaFin(e.target.value)}
                                />
                            </div>
                            <div>
                                <Label htmlFor="cuentaInicio">Cuenta Desde</Label>
                                <Input
                                    id="cuentaInicio"
                                    placeholder="Ej: 1000"
                                    value={cuentaInicio}
                                    onChange={(e) => setCuentaInicio(e.target.value)}
                                />
                            </div>
                            <div>
                                <Label htmlFor="cuentaFin">Cuenta Hasta</Label>
                                <Input
                                    id="cuentaFin"
                                    placeholder="Ej: 9999"
                                    value={cuentaFin}
                                    onChange={(e) => setCuentaFin(e.target.value)}
                                />
                            </div>
                        </div>
                        <div className="flex gap-2 mt-4">
                            <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => {
                                    setFechaInicio('');
                                    setFechaFin('');
                                    setCuentaInicio('');
                                    setCuentaFin('');
                                }}
                            >
                                Limpiar Filtros
                            </Button>
                        </div>
                    </Card>
                )}

                {selectedAccountData && (
                    <div className="space-y-4">
                        <Card>
                            <CardHeader>
                                <CardTitle>Detalle de la Cuenta: {selectedAccountData.codigo} - {selectedAccountData.nombre}</CardTitle>
                            </CardHeader>
                            <CardContent>
                                 <div className="grid grid-cols-3 gap-4 text-center">
                                    <div>
                                        <p className="text-sm text-muted-foreground">Total Debe</p>
                                        <p className="text-lg font-bold">Bs. {selectedAccountData.totalDebe.toFixed(2)}</p>
                                    </div>
                                    <div>
                                        <p className="text-sm text-muted-foreground">Total Haber</p>
                                        <p className="text-lg font-bold">Bs. {selectedAccountData.totalHaber.toFixed(2)}</p>
                                    </div>
                                    <div>
                                        <p className="text-sm text-muted-foreground">Saldo Final</p>
                                        <p className="text-lg font-bold">Bs. {(getTipoCuenta(selectedAccountData.codigo) === 'deudor' ? selectedAccountData.totalDebe - selectedAccountData.totalHaber : selectedAccountData.totalHaber - selectedAccountData.totalDebe).toFixed(2)}</p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        <div className="border rounded-md">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Fecha</TableHead>
                                        <TableHead>Concepto</TableHead>
                                        <TableHead>Referencia</TableHead>
                                        <TableHead className="text-right">Debe</TableHead>
                                        <TableHead className="text-right">Haber</TableHead>
                                        <TableHead className="text-right">Saldo</TableHead>
                                        <TableHead className="text-center">Acciones</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {detailedMovements.map((mov, index) => (
                                        <TableRow key={index}>
                                            <TableCell>{mov.fecha}</TableCell>
                                            <TableCell className="max-w-[250px] truncate">{mov.concepto}</TableCell>
                                            <TableCell className="max-w-[150px] truncate">{mov.referencia}</TableCell>
                                            <TableCell className="text-right">{mov.debe > 0 ? `Bs. ${mov.debe.toFixed(2)}` : '-'}</TableCell>
                                            <TableCell className="text-right">{mov.haber > 0 ? `Bs. ${mov.haber.toFixed(2)}` : '-'}</TableCell>
                                            <TableCell className="text-right">Bs. {mov.saldo.toFixed(2)}</TableCell>
                                            <TableCell className="text-center">
                                                <Dialog>
                                                    <DialogTrigger asChild>
                                                        <Button variant="ghost" size="sm">
                                                            <Edit className="w-4 h-4" />
                                                        </Button>
                                                    </DialogTrigger>
                                                    <DialogContent className="max-w-md">
                                                        <DialogHeader>
                                                            <DialogTitle>Información del Asiento</DialogTitle>
                                                        </DialogHeader>
                                                        <div className="space-y-4">
                                                            <div className="grid grid-cols-2 gap-4 text-sm">
                                                                <div>
                                                                    <span className="font-medium">Fecha:</span>
                                                                    <p>{mov.fecha}</p>
                                                                </div>
                                                                <div>
                                                                    <span className="font-medium">Referencia:</span>
                                                                    <p>{mov.referencia}</p>
                                                                </div>
                                                            </div>
                                                            <div>
                                                                <span className="font-medium">Concepto:</span>
                                                                <p className="text-sm">{mov.concepto}</p>
                                                            </div>
                                                            <div className="grid grid-cols-2 gap-4 text-sm">
                                                                <div>
                                                                    <span className="font-medium">Debe:</span>
                                                                    <p>Bs. {mov.debe.toFixed(2)}</p>
                                                                </div>
                                                                <div>
                                                                    <span className="font-medium">Haber:</span>
                                                                    <p>Bs. {mov.haber.toFixed(2)}</p>
                                                                </div>
                                                            </div>
                                                            <div className="text-center text-sm text-muted-foreground">
                                                                Para modificar este asiento, vaya al módulo de Libro Diario
                                                            </div>
                                                        </div>
                                                    </DialogContent>
                                                </Dialog>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    </div>
                )}
                {!selectedAccountData && accounts.length > 0 && (
                    <div className="text-center py-10 text-muted-foreground">
                        <p>Seleccione una cuenta para ver sus movimientos.</p>
                    </div>
                )}
                 {!accounts.length && (
                    <div className="text-center py-10 text-muted-foreground">
                        <p>No hay datos en el libro diario para generar el libro mayor.</p>
                    </div>
                )}
            </CardContent>
        </Card>
    );
};

export default GeneralLedgerView;
