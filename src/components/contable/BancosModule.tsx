import {
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type ComponentType,
  type FormEvent,
  type ReactNode,
} from "react";
import {
  ArrowRightLeft,
  Building2,
  CreditCard,
  Download,
  Landmark,
  Receipt,
  Sparkles,
  TrendingDown,
  TrendingUp,
  Upload,
  Wallet,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useContabilidadIntegration } from "@/hooks/useContabilidadIntegration";
import { CuentaContable, useSupabasePlanCuentas } from "@/hooks/useSupabasePlanCuentas";
import {
  CuentaBancaria,
  ExtractoPreview,
  MOVIMIENTO_NATURALEZA_OPTIONS,
  MOVIMIENTO_TIPO_OPTIONS,
  MovimientoBancario,
  NaturalezaMovimientoBancario,
  TipoMovimientoBancario,
  useSupabaseBancos,
} from "@/hooks/useSupabaseBancos";
import { AsientoContable } from "@/components/contable/diary/DiaryData";

const currency = (value: number) =>
  new Intl.NumberFormat("es-BO", {
    style: "currency",
    currency: "BOB",
    minimumFractionDigits: 2,
  }).format(value || 0);

const natureLabel = (naturaleza: NaturalezaMovimientoBancario) =>
  naturaleza === "credito" ? "Credito" : "Debito";

const getTypeLabel = (tipo: TipoMovimientoBancario) =>
  MOVIMIENTO_TIPO_OPTIONS.find((item) => item.value === tipo)?.label || tipo;

const BancosModule = () => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const { guardarAsiento } = useContabilidadIntegration();
  const {
    cuentasBancarias,
    movimientosBancarios,
    loading,
    createCuentaBancaria,
    createMovimientoBancario,
    parseExtractoFile,
    importMovimientosDesdePreview,
    refetch,
  } = useSupabaseBancos();
  const { planCuentas } = useSupabasePlanCuentas();

  const [selectedCuentaId, setSelectedCuentaId] = useState<string>("");
  const [showNewAccount, setShowNewAccount] = useState(false);
  const [showNewMovement, setShowNewMovement] = useState(false);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [importPreview, setImportPreview] = useState<ExtractoPreview | null>(null);
  const [processingFile, setProcessingFile] = useState(false);
  const [importing, setImporting] = useState(false);

  const cuentasActivas = useMemo(
    () => cuentasBancarias.filter((cuenta) => cuenta.activa),
    [cuentasBancarias],
  );

  const selectedCuenta = useMemo(
    () =>
      cuentasBancarias.find((cuenta) => cuenta.id === selectedCuentaId) ||
      cuentasActivas[0] ||
      null,
    [cuentasActivas, cuentasBancarias, selectedCuentaId],
  );

  const movimientosRecientes = useMemo(() => {
    const filtered = selectedCuenta
      ? movimientosBancarios.filter((item) => item.cuenta_bancaria_id === selectedCuenta.id)
      : movimientosBancarios;

    return [...filtered]
      .sort((left, right) => {
        const byDate = new Date(right.fecha).getTime() - new Date(left.fecha).getTime();
        return byDate !== 0
          ? byDate
          : new Date(right.created_at).getTime() - new Date(left.created_at).getTime();
      })
      .slice(0, 10);
  }, [movimientosBancarios, selectedCuenta]);

  const bankLedgerAccounts = useMemo(
    () =>
      planCuentas.filter(
        (cuenta) =>
          cuenta.activa !== false &&
          cuenta.tipo === "activo" &&
          cuenta.codigo.startsWith("111"),
      ),
    [planCuentas],
  );

  const counterAccounts = useMemo(() => {
    const selectedCode = selectedCuenta?.codigo_cuenta_contable;
    return planCuentas.filter(
      (cuenta) =>
        cuenta.activa !== false &&
        (!selectedCode || cuenta.codigo !== selectedCode),
    );
  }, [planCuentas, selectedCuenta?.codigo_cuenta_contable]);

  const totalSaldos = cuentasBancarias.reduce((sum, cuenta) => sum + (cuenta.saldo || 0), 0);
  const ingresosMes = movimientosBancarios
    .filter((item) => item.naturaleza_movimiento === "credito")
    .reduce((sum, item) => sum + Math.abs(item.monto), 0);
  const egresosMes = movimientosBancarios
    .filter((item) => item.naturaleza_movimiento === "debito")
    .reduce((sum, item) => sum + Math.abs(item.monto), 0);
  const importados = movimientosBancarios.filter((item) => item.origen_registro === "importado").length;

  const handleCreateCuenta = async (payload: NewAccountPayload) => {
    try {
      await createCuentaBancaria({
        banco: payload.banco,
        numero_cuenta: payload.numeroCuenta,
        tipo_cuenta: payload.tipoCuenta,
        nombre: payload.nombre,
        moneda: payload.moneda,
        saldo: payload.saldo,
        activa: true,
        codigo_cuenta_contable: payload.codigoCuentaContable,
        nombre_cuenta_contable:
          bankLedgerAccounts.find((item) => item.codigo === payload.codigoCuentaContable)?.nombre ||
          payload.codigoCuentaContable,
      });
      setShowNewAccount(false);
      void refetch();
    } catch (error) {
      console.error("Error creando cuenta bancaria:", error);
      toast({
        title: "Error al crear cuenta",
        description: "No se pudo registrar la cuenta bancaria.",
        variant: "destructive",
      });
    }
  };

  const handleCreateMovimiento = async (payload: NewMovementPayload) => {
    if (!selectedCuenta?.codigo_cuenta_contable) {
      toast({
        title: "Cuenta contable requerida",
        description: "La cuenta bancaria debe estar vinculada al plan contable antes de registrar movimientos.",
        variant: "destructive",
      });
      return;
    }

    try {
      const movimiento = await createMovimientoBancario({
        cuenta_bancaria_id: selectedCuenta.id,
        fecha: payload.fecha,
        tipo: payload.tipo,
        naturaleza_movimiento: payload.naturaleza,
        monto: payload.monto,
        descripcion: payload.descripcion,
        beneficiario: payload.beneficiario,
        numero_comprobante: payload.numeroComprobante,
        origen_registro: "manual",
      });

      const contra = counterAccounts.find((cuenta) => cuenta.codigo === payload.contracuentaCodigo);
      if (!contra) {
        toast({
          title: "Contracuenta no encontrada",
          description: "El movimiento se guardo, pero falta una contracuenta valida para el asiento.",
          variant: "destructive",
        });
        setShowNewMovement(false);
        return;
      }

      const asiento = buildBankAsiento({
        cuenta: selectedCuenta,
        movimiento,
        contraCuenta: contra,
      });

      const ok = await guardarAsiento(asiento);
      if (!ok) {
        toast({
          title: "Movimiento guardado sin asiento",
          description:
            "El movimiento bancario quedo registrado, pero el asiento contable necesita revision manual.",
          variant: "destructive",
        });
      }

      setShowNewMovement(false);
      void refetch();
    } catch (error) {
      console.error("Error registrando movimiento:", error);
      toast({
        title: "Error al registrar movimiento",
        description: "No se pudo registrar el movimiento bancario.",
        variant: "destructive",
      });
    }
  };

  const handleImportClick = () => {
    if (!selectedCuenta) {
      toast({
        title: "Selecciona una cuenta",
        description: "Debes elegir una cuenta bancaria antes de importar un extracto.",
        variant: "destructive",
      });
      return;
    }
    fileInputRef.current?.click();
  };

  const handleExtractoFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !selectedCuenta) return;

    setProcessingFile(true);
    try {
      const preview = await parseExtractoFile(file, selectedCuenta.id);
      setImportPreview(preview);
      setShowImportDialog(true);
    } catch (error) {
      console.error("Error parseando extracto:", error);
      toast({
        title: "Archivo no valido",
        description: "No se pudo interpretar el extracto bancario.",
        variant: "destructive",
      });
    } finally {
      setProcessingFile(false);
      event.target.value = "";
    }
  };

  const handleConfirmImport = async () => {
    if (!importPreview) return;

    setImporting(true);
    try {
      await importMovimientosDesdePreview(importPreview);
      setImportPreview(null);
      setShowImportDialog(false);
      void refetch();
    } catch (error) {
      console.error("Error importando movimientos:", error);
      toast({
        title: "Error al importar extracto",
        description: "No se pudo completar la importacion del archivo.",
        variant: "destructive",
      });
    } finally {
      setImporting(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold">Tesoreria Ejecutiva</h2>
          <p className="text-slate-600">Cargando cuentas y movimientos bancarios...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <input
        ref={fileInputRef}
        type="file"
        accept=".xlsx,.xls,.csv"
        className="hidden"
        onChange={handleExtractoFile}
      />

      <div className="overflow-hidden rounded-3xl border border-slate-200 bg-[radial-gradient(circle_at_top_left,_rgba(14,116,144,0.18),_transparent_38%),linear-gradient(135deg,_#f8fafc,_#eef6ff_40%,_#f7fbff)] p-6">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-3xl space-y-4">
            <Badge variant="outline" className="border-sky-200 bg-white/80 text-sky-700">
              Mesa Ejecutiva de Tesoreria
            </Badge>
            <div>
              <h2 className="text-3xl font-semibold tracking-tight text-slate-950">
                Bancos y liquidez con trazabilidad contable real
              </h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
                Centro operativo para cuentas bancarias, movimientos, importacion de extractos y
                generacion de asientos alineados al plan de cuentas boliviano.
              </p>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <ExecutiveChip icon={Wallet} label="Saldo total" value={currency(totalSaldos)} tone="neutral" />
              <ExecutiveChip icon={TrendingUp} label="Ingresos registrados" value={currency(ingresosMes)} tone="positive" />
              <ExecutiveChip icon={TrendingDown} label="Egresos registrados" value={currency(egresosMes)} tone="negative" />
            </div>
          </div>

          <div className="grid min-w-[280px] gap-3 sm:grid-cols-2 lg:w-[320px] lg:grid-cols-1">
            <Dialog open={showNewAccount} onOpenChange={setShowNewAccount}>
              <DialogTrigger asChild>
                <Button size="lg" className="justify-start rounded-2xl">
                  <Landmark className="mr-2 h-4 w-4" />
                  Nueva cuenta bancaria
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Nueva cuenta bancaria</DialogTitle>
                  <DialogDescription>
                    Vincula la cuenta con su codigo contable para que la tesoreria sea conciliable.
                  </DialogDescription>
                </DialogHeader>
                <NewAccountForm bankLedgerAccounts={bankLedgerAccounts} onSave={handleCreateCuenta} onCancel={() => setShowNewAccount(false)} />
              </DialogContent>
            </Dialog>

            <Dialog open={showNewMovement} onOpenChange={setShowNewMovement}>
              <DialogTrigger asChild>
                <Button size="lg" variant="outline" className="justify-start rounded-2xl bg-white/80" disabled={!selectedCuenta}>
                  <ArrowRightLeft className="mr-2 h-4 w-4" />
                  Registrar movimiento
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Nuevo movimiento bancario</DialogTitle>
                  <DialogDescription>
                    El movimiento se registra en banco y genera asiento contable con contracuenta seleccionada.
                  </DialogDescription>
                </DialogHeader>
                {selectedCuenta && (
                  <NewMovementForm cuenta={selectedCuenta} counterAccounts={counterAccounts} onSave={handleCreateMovimiento} onCancel={() => setShowNewMovement(false)} />
                )}
              </DialogContent>
            </Dialog>

            <Button size="lg" variant="outline" className="justify-start rounded-2xl bg-white/80" onClick={handleImportClick} disabled={!selectedCuenta || processingFile}>
              <Upload className="mr-2 h-4 w-4" />
              {processingFile ? "Procesando extracto..." : "Importar extracto"}
            </Button>

            <Button size="lg" variant="ghost" className="justify-start rounded-2xl" onClick={() => void refetch()}>
              <Download className="mr-2 h-4 w-4" />
              Recargar tesoreria
            </Button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <MetricCard icon={Building2} title="Cuentas activas" value={String(cuentasActivas.length)} caption="Cuentas listas para operar" />
        <MetricCard icon={Receipt} title="Movimientos importados" value={String(importados)} caption="Filas trazables desde extracto" />
        <MetricCard icon={Sparkles} title="Cuenta seleccionada" value={selectedCuenta?.banco || "Sin cuenta"} caption={selectedCuenta?.nombre || "Selecciona una cuenta para operar"} />
        <MetricCard icon={CreditCard} title="Cuenta contable" value={selectedCuenta?.codigo_cuenta_contable || "Pendiente"} caption={selectedCuenta?.nombre_cuenta_contable || "Asigna una cuenta del plan"} />
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.7fr_1fr]">
        <Card className="rounded-3xl border-slate-200">
          <CardHeader>
            <CardTitle>Cuentas destacadas</CardTitle>
            <CardDescription>
              Selecciona una cuenta para revisar movimientos recientes, importar extractos y conciliar.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 lg:grid-cols-2">
            {cuentasBancarias.map((cuenta) => {
              const isSelected = selectedCuenta?.id === cuenta.id;
              return (
                <button
                  key={cuenta.id}
                  type="button"
                  onClick={() => setSelectedCuentaId(cuenta.id)}
                  className={`rounded-2xl border p-4 text-left transition ${
                    isSelected
                      ? "border-sky-300 bg-sky-50 shadow-sm"
                      : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-xs uppercase tracking-[0.18em] text-slate-500">
                        {cuenta.banco}
                      </div>
                      <div className="mt-1 text-lg font-semibold text-slate-950">
                        {cuenta.nombre}
                      </div>
                    </div>
                    <Badge variant={cuenta.activa ? "default" : "secondary"}>
                      {cuenta.activa ? "Activa" : "Inactiva"}
                    </Badge>
                  </div>
                  <div className="mt-4 space-y-2 text-sm text-slate-600">
                    <div className="flex items-center justify-between">
                      <span>Cuenta bancaria</span>
                      <span className="font-medium">{cuenta.numero_cuenta}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Moneda</span>
                      <span className="font-medium">{cuenta.moneda || "BOB"}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Codigo contable</span>
                      <span className="font-medium">
                        {cuenta.codigo_cuenta_contable || "Sin asignar"}
                      </span>
                    </div>
                  </div>
                  <div className="mt-4 text-2xl font-semibold text-slate-950">
                    {currency(cuenta.saldo || 0)}
                  </div>
                </button>
              );
            })}
          </CardContent>
        </Card>

        <Card className="rounded-3xl border-slate-200 bg-[linear-gradient(180deg,_rgba(255,255,255,0.98),_rgba(240,249,255,0.96))]">
          <CardHeader>
            <CardTitle>Cuenta activa</CardTitle>
            <CardDescription>Resumen ejecutivo para la cuenta actualmente seleccionada.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {selectedCuenta ? (
              <>
                <div className="rounded-2xl border border-slate-200 bg-white p-4">
                  <div className="text-sm text-slate-500">Saldo actual</div>
                  <div className="mt-1 text-3xl font-semibold text-slate-950">
                    {currency(selectedCuenta.saldo || 0)}
                  </div>
                  <div className="mt-3 text-sm text-slate-600">
                    {selectedCuenta.banco} / {selectedCuenta.numero_cuenta}
                  </div>
                </div>

                <div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Tipo de cuenta</span>
                    <span className="font-medium">{selectedCuenta.tipo_cuenta || "corriente"}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Cuenta contable</span>
                    <span className="font-medium">
                      {selectedCuenta.codigo_cuenta_contable || "Sin asignar"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Nombre contable</span>
                    <span className="font-medium">
                      {selectedCuenta.nombre_cuenta_contable || "Pendiente"}
                    </span>
                  </div>
                </div>

                {!selectedCuenta.codigo_cuenta_contable && (
                  <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                    Esta cuenta aun no tiene codigo contable asignado. Se puede usar para importar, pero no para
                    conciliacion auditable ni asientos automaticos confiables.
                  </div>
                )}
              </>
            ) : (
              <div className="rounded-2xl border border-dashed p-8 text-center text-slate-500">
                Crea o selecciona una cuenta para empezar.
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="timeline" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="timeline">Timeline bancario</TabsTrigger>
          <TabsTrigger value="tabla">Tabla operativa</TabsTrigger>
        </TabsList>

        <TabsContent value="timeline">
          <Card className="rounded-3xl border-slate-200">
            <CardHeader>
              <CardTitle>Movimientos recientes</CardTitle>
              <CardDescription>
                Flujo operativo de la cuenta seleccionada, con origen del registro y direccion bancaria.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {movimientosRecientes.length === 0 ? (
                <div className="rounded-2xl border border-dashed p-8 text-center text-slate-500">
                  No hay movimientos registrados para esta cuenta.
                </div>
              ) : (
                movimientosRecientes.map((movimiento) => (
                  <div
                    key={movimiento.id}
                    className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-4 md:flex-row md:items-center md:justify-between"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Badge variant={movimiento.naturaleza_movimiento === "credito" ? "default" : "secondary"}>
                          {natureLabel(movimiento.naturaleza_movimiento as NaturalezaMovimientoBancario)}
                        </Badge>
                        <Badge variant="outline">{getTypeLabel(movimiento.tipo as TipoMovimientoBancario)}</Badge>
                        <Badge variant="outline">
                          {movimiento.origen_registro === "importado" ? "Importado" : "Manual"}
                        </Badge>
                      </div>
                      <div className="text-base font-semibold text-slate-950">{movimiento.descripcion}</div>
                      <div className="text-sm text-slate-500">
                        {new Date(`${movimiento.fecha}T00:00:00`).toLocaleDateString("es-BO")} / Ref:{" "}
                        {movimiento.numero_comprobante || "Sin referencia"}
                      </div>
                    </div>
                    <div className="text-right">
                      <div
                        className={`text-xl font-semibold ${
                          movimiento.naturaleza_movimiento === "credito"
                            ? "text-emerald-600"
                            : "text-rose-600"
                        }`}
                      >
                        {movimiento.naturaleza_movimiento === "credito" ? "+" : "-"}
                        {currency(Math.abs(movimiento.monto))}
                      </div>
                      <div className="text-sm text-slate-500">
                        Saldo: {currency(movimiento.saldo_actual || 0)}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="tabla">
          <Card className="rounded-3xl border-slate-200">
            <CardHeader>
              <CardTitle>Vista operativa</CardTitle>
              <CardDescription>
                Tabla compacta para control interno, auditoria y cruce con conciliacion bancaria.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Cuenta</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Referencia</TableHead>
                    <TableHead>Descripcion</TableHead>
                    <TableHead className="text-right">Monto</TableHead>
                    <TableHead className="text-right">Saldo</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {movimientosBancarios.map((movimiento) => {
                    const cuenta = cuentasBancarias.find(
                      (item) => item.id === movimiento.cuenta_bancaria_id,
                    );

                    return (
                      <TableRow key={movimiento.id}>
                        <TableCell>
                          {new Date(`${movimiento.fecha}T00:00:00`).toLocaleDateString("es-BO")}
                        </TableCell>
                        <TableCell>{cuenta?.nombre || cuenta?.banco || "N/A"}</TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {getTypeLabel(movimiento.tipo as TipoMovimientoBancario)}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-mono text-xs">
                          {movimiento.numero_comprobante || "Sin referencia"}
                        </TableCell>
                        <TableCell>{movimiento.descripcion}</TableCell>
                        <TableCell className="text-right">
                          <span
                            className={
                              movimiento.naturaleza_movimiento === "credito"
                                ? "text-emerald-600"
                                : "text-rose-600"
                            }
                          >
                            {movimiento.naturaleza_movimiento === "credito" ? "+" : "-"}
                            {currency(Math.abs(movimiento.monto))}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          {currency(movimiento.saldo_actual || 0)}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={showImportDialog} onOpenChange={setShowImportDialog}>
        <DialogContent className="max-w-5xl">
          <DialogHeader>
            <DialogTitle>Preview de extracto bancario</DialogTitle>
            <DialogDescription>
              Se validan filas, duplicados y tipos de movimiento antes de persistir el extracto.
            </DialogDescription>
          </DialogHeader>

          {importPreview && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                <ImportSummaryCard label="Filas" value={String(importPreview.totalRows)} />
                <ImportSummaryCard label="Validas" value={String(importPreview.validRows)} />
                <ImportSummaryCard label="Duplicadas" value={String(importPreview.duplicateRows)} />
                <ImportSummaryCard label="Invalidas" value={String(importPreview.invalidRows)} />
              </div>

              <div className="max-h-[420px] overflow-auto rounded-2xl border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Fila</TableHead>
                      <TableHead>Fecha</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Descripcion</TableHead>
                      <TableHead>Referencia</TableHead>
                      <TableHead className="text-right">Monto</TableHead>
                      <TableHead>Estado</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {importPreview.rows.slice(0, 30).map((row) => (
                      <TableRow key={`${row.rowNumber}-${row.referencia}`}>
                        <TableCell>{row.rowNumber}</TableCell>
                        <TableCell>{row.fecha || "Invalida"}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{getTypeLabel(row.tipo)}</Badge>
                        </TableCell>
                        <TableCell>{row.descripcion || "Sin descripcion"}</TableCell>
                        <TableCell>{row.referencia || "Sin referencia"}</TableCell>
                        <TableCell className="text-right">{currency(row.monto)}</TableCell>
                        <TableCell>
                          {row.duplicado ? (
                            <Badge variant="destructive">{row.motivoDuplicado || "Duplicada"}</Badge>
                          ) : !row.fecha || !row.descripcion || row.monto <= 0 ? (
                            <Badge variant="secondary">Invalida</Badge>
                          ) : (
                            <Badge variant="default">Lista</Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setImportPreview(null);
                    setShowImportDialog(false);
                  }}
                  disabled={importing}
                >
                  Cancelar
                </Button>
                <Button onClick={handleConfirmImport} disabled={importing || importPreview.validRows === 0}>
                  {importing ? "Importando..." : "Confirmar importacion"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

interface NewAccountPayload {
  banco: string;
  numeroCuenta: string;
  tipoCuenta: string;
  nombre: string;
  moneda: string;
  saldo: number;
  codigoCuentaContable: string;
}

const NewAccountForm = ({
  bankLedgerAccounts,
  onSave,
  onCancel,
}: {
  bankLedgerAccounts: CuentaContable[];
  onSave: (payload: NewAccountPayload) => Promise<void>;
  onCancel: () => void;
}) => {
  const [formData, setFormData] = useState<NewAccountPayload>({
    banco: "",
    numeroCuenta: "",
    tipoCuenta: "corriente",
    nombre: "",
    moneda: "BOB",
    saldo: 0,
    codigoCuentaContable: bankLedgerAccounts[0]?.codigo || "1113",
  });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    try {
      await onSave(formData);
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Field label="Banco">
          <Input
            value={formData.banco}
            onChange={(event) => setFormData((prev) => ({ ...prev, banco: event.target.value }))}
            required
          />
        </Field>
        <Field label="Numero de cuenta">
          <Input
            value={formData.numeroCuenta}
            onChange={(event) =>
              setFormData((prev) => ({ ...prev, numeroCuenta: event.target.value }))
            }
            required
          />
        </Field>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Field label="Nombre interno">
          <Input
            value={formData.nombre}
            onChange={(event) => setFormData((prev) => ({ ...prev, nombre: event.target.value }))}
            required
          />
        </Field>
        <Field label="Cuenta contable bancaria">
          <Select
            value={formData.codigoCuentaContable}
            onValueChange={(value) =>
              setFormData((prev) => ({ ...prev, codigoCuentaContable: value }))
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {bankLedgerAccounts.map((cuenta) => (
                <SelectItem key={cuenta.codigo} value={cuenta.codigo}>
                  {cuenta.codigo} - {cuenta.nombre}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Field label="Tipo">
          <Select
            value={formData.tipoCuenta}
            onValueChange={(value) => setFormData((prev) => ({ ...prev, tipoCuenta: value }))}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="corriente">Corriente</SelectItem>
              <SelectItem value="ahorro">Ahorro</SelectItem>
              <SelectItem value="empresarial">Empresarial</SelectItem>
            </SelectContent>
          </Select>
        </Field>
        <Field label="Moneda">
          <Select
            value={formData.moneda}
            onValueChange={(value) => setFormData((prev) => ({ ...prev, moneda: value }))}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="BOB">BOB</SelectItem>
              <SelectItem value="USD">USD</SelectItem>
            </SelectContent>
          </Select>
        </Field>
        <Field label="Saldo inicial">
          <Input
            type="number"
            step="0.01"
            value={formData.saldo}
            onChange={(event) =>
              setFormData((prev) => ({ ...prev, saldo: parseFloat(event.target.value) || 0 }))
            }
          />
        </Field>
      </div>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onCancel} disabled={saving}>
          Cancelar
        </Button>
        <Button type="submit" disabled={saving}>{saving ? "Guardando..." : "Crear cuenta"}</Button>
      </div>
    </form>
  );
};

interface NewMovementPayload {
  tipo: TipoMovimientoBancario;
  naturaleza: NaturalezaMovimientoBancario;
  fecha: string;
  descripcion: string;
  monto: number;
  beneficiario: string;
  numeroComprobante: string;
  contracuentaCodigo: string;
}

const NewMovementForm = ({
  cuenta,
  counterAccounts,
  onSave,
  onCancel,
}: {
  cuenta: CuentaBancaria;
  counterAccounts: CuentaContable[];
  onSave: (payload: NewMovementPayload) => Promise<void>;
  onCancel: () => void;
}) => {
  const defaultTipo = MOVIMIENTO_TIPO_OPTIONS[0];
  const [formData, setFormData] = useState<NewMovementPayload>({
    tipo: defaultTipo.value,
    naturaleza: defaultTipo.naturalezaDefault,
    fecha: new Date().toISOString().slice(0, 10),
    descripcion: "",
    monto: 0,
    beneficiario: "",
    numeroComprobante: "",
    contracuentaCodigo: counterAccounts[0]?.codigo || "",
  });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    try {
      await onSave(formData);
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="rounded-2xl border bg-slate-50 p-4 text-sm text-slate-600">
        Cuenta operativa: <strong>{cuenta.nombre}</strong> · codigo contable{" "}
        <strong>{cuenta.codigo_cuenta_contable || "Pendiente"}</strong>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Field label="Tipo de movimiento">
          <Select
            value={formData.tipo}
            onValueChange={(value) => {
              const selected = MOVIMIENTO_TIPO_OPTIONS.find((item) => item.value === value);
              setFormData((prev) => ({
                ...prev,
                tipo: value as TipoMovimientoBancario,
                naturaleza: selected?.naturalezaDefault || prev.naturaleza,
              }));
            }}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {MOVIMIENTO_TIPO_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Field label="Naturaleza bancaria">
          <Select
            value={formData.naturaleza}
            onValueChange={(value) =>
              setFormData((prev) => ({
                ...prev,
                naturaleza: value as NaturalezaMovimientoBancario,
              }))
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {MOVIMIENTO_NATURALEZA_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Field label="Fecha">
          <Input
            type="date"
            value={formData.fecha}
            onChange={(event) => setFormData((prev) => ({ ...prev, fecha: event.target.value }))}
            required
          />
        </Field>
        <Field label="Monto">
          <Input
            type="number"
            step="0.01"
            value={formData.monto}
            onChange={(event) =>
              setFormData((prev) => ({ ...prev, monto: parseFloat(event.target.value) || 0 }))
            }
            required
          />
        </Field>
      </div>

      <Field label="Descripcion">
        <Textarea
          value={formData.descripcion}
          onChange={(event) =>
            setFormData((prev) => ({ ...prev, descripcion: event.target.value }))
          }
          required
        />
      </Field>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Field label="Beneficiario / contraparte">
          <Input
            value={formData.beneficiario}
            onChange={(event) =>
              setFormData((prev) => ({ ...prev, beneficiario: event.target.value }))
            }
          />
        </Field>
        <Field label="Numero de comprobante">
          <Input
            value={formData.numeroComprobante}
            onChange={(event) =>
              setFormData((prev) => ({ ...prev, numeroComprobante: event.target.value }))
            }
          />
        </Field>
      </div>

      <Field label="Contracuenta contable">
        <Select
          value={formData.contracuentaCodigo}
          onValueChange={(value) =>
            setFormData((prev) => ({ ...prev, contracuentaCodigo: value }))
          }
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {counterAccounts.map((cuentaContable) => (
              <SelectItem key={cuentaContable.codigo} value={cuentaContable.codigo}>
                {cuentaContable.codigo} - {cuentaContable.nombre}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onCancel} disabled={saving}>
          Cancelar
        </Button>
        <Button type="submit" disabled={saving}>{saving ? "Guardando..." : "Registrar movimiento"}</Button>
      </div>
    </form>
  );
};

const buildBankAsiento = ({
  cuenta,
  movimiento,
  contraCuenta,
}: {
  cuenta: CuentaBancaria;
  movimiento: MovimientoBancario;
  contraCuenta: CuentaContable;
}) => {
  const numero = `BCO-${Date.now().toString().slice(-6)}`;
  const monto = Math.abs(movimiento.monto);
  const reference = `BANK:${cuenta.id}:${movimiento.id}:${movimiento.numero_comprobante || "SINREF"}`;

  const cuentas =
    movimiento.naturaleza_movimiento === "credito"
      ? [
          {
            codigo: cuenta.codigo_cuenta_contable || "1113",
            nombre: cuenta.nombre_cuenta_contable || "Bancos",
            debe: monto,
            haber: 0,
          },
          {
            codigo: contraCuenta.codigo,
            nombre: contraCuenta.nombre,
            debe: 0,
            haber: monto,
          },
        ]
      : [
          {
            codigo: contraCuenta.codigo,
            nombre: contraCuenta.nombre,
            debe: monto,
            haber: 0,
          },
          {
            codigo: cuenta.codigo_cuenta_contable || "1113",
            nombre: cuenta.nombre_cuenta_contable || "Bancos",
            debe: 0,
            haber: monto,
          },
        ];

  const asiento: AsientoContable = {
    id: numero,
    numero,
    fecha: movimiento.fecha,
    concepto: `${getTypeLabel(movimiento.tipo as TipoMovimientoBancario)} bancario - ${movimiento.descripcion}`,
    referencia: reference,
    debe: monto,
    haber: monto,
    estado: "registrado",
    cuentas,
    origen: "movimiento_bancario",
  };

  return asiento;
};

const Field = ({ label, children }: { label: string; children: ReactNode }) => (
  <div className="space-y-2">
    <Label>{label}</Label>
    {children}
  </div>
);

const MetricCard = ({
  icon: Icon,
  title,
  value,
  caption,
}: {
  icon: ComponentType<{ className?: string }>;
  title: string;
  value: string;
  caption: string;
}) => (
  <Card className="rounded-3xl border-slate-200">
    <CardContent className="flex items-start justify-between p-5">
      <div>
        <div className="text-sm text-slate-500">{title}</div>
        <div className="mt-2 text-2xl font-semibold text-slate-950">{value}</div>
        <div className="mt-1 text-xs text-slate-500">{caption}</div>
      </div>
      <div className="rounded-2xl bg-slate-100 p-3">
        <Icon className="h-5 w-5 text-slate-700" />
      </div>
    </CardContent>
  </Card>
);

const ExecutiveChip = ({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: ComponentType<{ className?: string }>;
  label: string;
  value: string;
  tone: "neutral" | "positive" | "negative";
}) => {
  const toneClass =
    tone === "positive"
      ? "border-emerald-200 bg-emerald-50 text-emerald-900"
      : tone === "negative"
        ? "border-rose-200 bg-rose-50 text-rose-900"
        : "border-slate-200 bg-white text-slate-900";

  return (
    <div className={`rounded-2xl border px-4 py-3 ${toneClass}`}>
      <div className="flex items-center gap-2 text-xs uppercase tracking-[0.18em]">
        <Icon className="h-4 w-4" />
        {label}
      </div>
      <div className="mt-2 text-xl font-semibold">{value}</div>
    </div>
  );
};

const ImportSummaryCard = ({ label, value }: { label: string; value: string }) => (
  <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
    <div className="text-xs uppercase tracking-[0.16em] text-slate-500">{label}</div>
    <div className="mt-2 text-xl font-semibold text-slate-950">{value}</div>
  </div>
);

export default BancosModule;
