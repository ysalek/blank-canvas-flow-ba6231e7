import { useEffect, useMemo, useState, type ComponentType, type ReactNode } from "react";
import {
  AlertCircle,
  CheckCircle2,
  Clock3,
  FileWarning,
  Landmark,
  RefreshCw,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
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
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useSupabasePlanCuentas } from "@/hooks/useSupabasePlanCuentas";
import { useSupabaseBancos } from "@/hooks/useSupabaseBancos";
import {
  PartidaConciliacion,
  ResumenConciliacion,
  useConciliacionBancaria,
} from "@/hooks/useConciliacionBancaria";

const currency = (value: number) =>
  new Intl.NumberFormat("es-BO", {
    style: "currency",
    currency: "BOB",
    minimumFractionDigits: 2,
  }).format(value || 0);

const formatDate = (value: string) =>
  new Date(`${value}T00:00:00`).toLocaleDateString("es-BO");

const getStatusBadge = (partida: PartidaConciliacion) => {
  if (partida.categoria === "coincidencia") {
    if (partida.conciliado) {
      return {
        label: partida.sugerida ? "Confirmada" : "Exacta",
        className: "border-emerald-200 bg-emerald-50 text-emerald-800",
      };
    }

    return {
      label: "Sugerida",
      className: "border-amber-200 bg-amber-50 text-amber-800",
    };
  }

  if (partida.categoria === "ajuste") {
    return partida.estado === "aplicado"
      ? {
          label: "Ajustada",
          className: "border-emerald-200 bg-emerald-50 text-emerald-800",
        }
      : {
          label: "Ajuste sugerido",
          className: "border-rose-200 bg-rose-50 text-rose-800",
        };
  }

  if (partida.categoria === "excepcion_banco") {
    return {
      label: "Banco sin libro",
      className: "border-sky-200 bg-sky-50 text-sky-800",
    };
  }

  return {
    label: partida.tipoPartida === "cheque_transito" ? "Cheque en transito" : "Deposito en transito",
    className: "border-slate-200 bg-slate-50 text-slate-700",
  };
};

const getPartidaLabel = (partida: PartidaConciliacion) => {
  switch (partida.tipoPartida) {
    case "coincidencia":
      return partida.sugerida ? "Coincidencia sugerida" : "Coincidencia exacta";
    case "cargo_bancario":
      return "Cargo bancario";
    case "abono_bancario":
      return "Abono bancario";
    case "cheque_transito":
      return "Cheque en transito";
    case "deposito_transito":
      return "Deposito en transito";
    default:
      return "Diferencia en revision";
  }
};

const getEstadoCorte = (
  resumen: ResumenConciliacion,
  estadoActual: string | null | undefined,
) => {
  if (estadoActual === "conciliado") {
    return {
      label: "Conciliado",
      className: "border-emerald-200 bg-emerald-50 text-emerald-800",
    };
  }

  if (
    Math.abs(resumen.diferencia) <= 0.01 &&
    resumen.ajustesPendientes === 0 &&
    resumen.sugerenciasPendientes === 0
  ) {
    return {
      label: "Listo para cierre",
      className: "border-sky-200 bg-sky-50 text-sky-800",
    };
  }

  if (estadoActual === "con_diferencias") {
    return {
      label: "Cerrado con diferencias",
      className: "border-amber-200 bg-amber-50 text-amber-800",
    };
  }

  return {
    label: "Borrador auditable",
    className: "border-slate-200 bg-slate-50 text-slate-700",
  };
};

const ConciliacionBancaria = () => {
  const { toast } = useToast();
  const {
    cuentasBancarias,
    loading: loadingBancos,
    refetch: refetchBancos,
  } = useSupabaseBancos();
  const { planCuentas } = useSupabasePlanCuentas();

  const [selectedCuentaId, setSelectedCuentaId] = useState("");
  const [fechaCorte, setFechaCorte] = useState(new Date().toISOString().slice(0, 10));
  const [observaciones, setObservaciones] = useState("");
  const [showAdjustmentDialog, setShowAdjustmentDialog] = useState(false);
  const [selectedPartida, setSelectedPartida] = useState<PartidaConciliacion | null>(null);
  const [contracuentaCodigo, setContracuentaCodigo] = useState("");
  const [savingDraft, setSavingDraft] = useState(false);
  const [closingCut, setClosingCut] = useState(false);
  const [creatingAdjustment, setCreatingAdjustment] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [confirmingMatchId, setConfirmingMatchId] = useState<string | null>(null);

  const cuentasActivas = useMemo(
    () => cuentasBancarias.filter((cuenta) => cuenta.activa),
    [cuentasBancarias],
  );

  useEffect(() => {
    const cuentasDisponibles = cuentasActivas.length > 0 ? cuentasActivas : cuentasBancarias;
    if (!cuentasDisponibles.length) {
      setSelectedCuentaId("");
      return;
    }

    const cuentaValida = cuentasDisponibles.some((cuenta) => cuenta.id === selectedCuentaId);
    if (!cuentaValida) {
      setSelectedCuentaId(cuentasDisponibles[0].id);
    }
  }, [cuentasActivas, cuentasBancarias, selectedCuentaId]);

  useEffect(() => {
    const applyUrlContext = () => {
      const urlParams = new URLSearchParams(window.location.search);
      const cuentaId = urlParams.get("cuenta_id");
      const fecha = urlParams.get("fecha_corte");

      if (cuentaId && cuentasBancarias.some((cuenta) => cuenta.id === cuentaId)) {
        setSelectedCuentaId(cuentaId);
      }

      if (fecha) {
        setFechaCorte(fecha);
      }
    };

    applyUrlContext();
    window.addEventListener("popstate", applyUrlContext);
    return () => window.removeEventListener("popstate", applyUrlContext);
  }, [cuentasBancarias]);

  const selectedCuenta = useMemo(
    () =>
      cuentasBancarias.find((cuenta) => cuenta.id === selectedCuentaId) ||
      cuentasActivas[0] ||
      cuentasBancarias[0] ||
      null,
    [cuentasActivas, cuentasBancarias, selectedCuentaId],
  );

  const contracuentas = useMemo(() => {
    const codigoBanco = selectedCuenta?.codigo_cuenta_contable;
    return planCuentas.filter(
      (cuenta) => cuenta.activa !== false && (!codigoBanco || cuenta.codigo !== codigoBanco),
    );
  }, [planCuentas, selectedCuenta?.codigo_cuenta_contable]);

  const {
    partidas,
    resumen,
    loading,
    conciliacionActual,
    confirmarCoincidencia,
    crearAsientoAjuste,
    guardarBorrador,
    cerrarConciliacion,
    refetch,
  } = useConciliacionBancaria({
    cuenta: selectedCuenta,
    fechaCorte,
  });

  useEffect(() => {
    setObservaciones(conciliacionActual?.observaciones || "");
  }, [conciliacionActual?.id, conciliacionActual?.observaciones, selectedCuenta?.id, fechaCorte]);

  useEffect(() => {
    if (!selectedPartida) {
      setContracuentaCodigo("");
      return;
    }

    const suggested =
      contracuentas.find((cuenta) => cuenta.codigo === selectedPartida.contracuentaSugeridaCodigo)
        ?.codigo ||
      contracuentas[0]?.codigo ||
      "";

    setContracuentaCodigo(suggested);
  }, [contracuentas, selectedPartida]);

  const coincidencias = useMemo(
    () => partidas.filter((partida) => partida.categoria === "coincidencia"),
    [partidas],
  );
  const excepcionesBanco = useMemo(
    () => partidas.filter((partida) => partida.categoria === "excepcion_banco"),
    [partidas],
  );
  const excepcionesLibros = useMemo(
    () => partidas.filter((partida) => partida.categoria === "excepcion_libros"),
    [partidas],
  );
  const ajustes = useMemo(
    () => partidas.filter((partida) => partida.categoria === "ajuste"),
    [partidas],
  );

  const estadoCorte = getEstadoCorte(resumen, conciliacionActual?.estado);
  const bloqueado =
    loading || refreshing || savingDraft || closingCut || creatingAdjustment || confirmingMatchId !== null;

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await Promise.all([refetchBancos(), refetch()]);
    } finally {
      setRefreshing(false);
    }
  };

  const handleConfirmMatch = async (partida: PartidaConciliacion) => {
    setConfirmingMatchId(partida.id);
    try {
      await Promise.resolve(confirmarCoincidencia(partida));
      toast({
        title: "Coincidencia confirmada",
        description: "La sugerencia quedo marcada para el cierre auditable del corte.",
      });
    } finally {
      setConfirmingMatchId(null);
    }
  };

  const handleOpenAdjustment = (partida: PartidaConciliacion) => {
    setSelectedPartida(partida);
    setShowAdjustmentDialog(true);
  };

  const handleCreateAdjustment = async () => {
    if (!selectedPartida) return;

    const contracuenta = contracuentas.find((cuenta) => cuenta.codigo === contracuentaCodigo);
    if (!contracuenta) {
      toast({
        title: "Contracuenta requerida",
        description: "Debes elegir una contracuenta valida para registrar el ajuste.",
        variant: "destructive",
      });
      return;
    }

    setCreatingAdjustment(true);
    try {
      const ok = await crearAsientoAjuste({
        partida: selectedPartida,
        contracuentaCodigo: contracuenta.codigo,
        contracuentaNombre: contracuenta.nombre,
      });

      if (ok) {
        setShowAdjustmentDialog(false);
        setSelectedPartida(null);
        await Promise.all([refetch(), refetchBancos()]);
      }
    } finally {
      setCreatingAdjustment(false);
    }
  };

  const handleSaveDraft = async () => {
    setSavingDraft(true);
    try {
      const ok = await guardarBorrador(observaciones);
      if (ok) {
        await refetch();
      }
    } finally {
      setSavingDraft(false);
    }
  };

  const handleCloseCut = async () => {
    setClosingCut(true);
    try {
      const result = await cerrarConciliacion(observaciones);
      if (result) {
        await refetch();
      }
    } finally {
      setClosingCut(false);
    }
  };

  if (loadingBancos) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold">Conciliacion Bancaria</h2>
          <p className="text-slate-600">Cargando cuentas y contexto de tesoreria...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="overflow-hidden rounded-3xl border border-slate-200 bg-[radial-gradient(circle_at_top_left,_rgba(2,132,199,0.18),_transparent_36%),linear-gradient(130deg,_#f8fafc,_#eff6ff_42%,_#f9fbff)] p-6">
        <div className="flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
          <div className="max-w-3xl space-y-4">
            <Badge variant="outline" className="border-sky-200 bg-white/80 text-sky-700">
              Mesa Ejecutiva de Conciliacion
            </Badge>
            <div>
              <h2 className="text-3xl font-semibold tracking-tight text-slate-950">
                Conciliacion bancaria auditable, sin simulacion y con cierre trazable
              </h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
                El corte cruza movimientos reales de banco con asientos registrados, separa
                coincidencias, excepciones y ajustes sugeridos, y solo cierra como conciliado
                cuando no quedan diferencias materiales.
              </p>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <ExecutivePill
                icon={Landmark}
                label="Cuenta activa"
                value={selectedCuenta?.banco || "Sin cuenta"}
              />
              <ExecutivePill
                icon={ShieldCheck}
                label="Estado del corte"
                value={estadoCorte.label}
              />
              <ExecutivePill icon={Sparkles} label="Fecha de corte" value={fechaCorte || "Pendiente"} />
            </div>
          </div>

          <div className="min-w-[280px] rounded-3xl border border-white/70 bg-white/80 p-4 shadow-sm backdrop-blur">
            <div className="text-xs uppercase tracking-[0.2em] text-slate-500">
              Politica de cierre
            </div>
            <div className="mt-3 space-y-3 text-sm text-slate-600">
              <p>Coincidencia exacta por referencia y monto: se toma como conciliada.</p>
              <p>Coincidencia por monto y fecha: solo se propone, nunca se aplica sola.</p>
              <p>Los ajustes requieren contracuenta explicita y generan asiento auditable.</p>
            </div>
            <Button
              variant="outline"
              className="mt-4 w-full justify-center rounded-2xl bg-white"
              onClick={() => void handleRefresh()}
              disabled={bloqueado}
            >
              <RefreshCw className={`mr-2 h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
              {refreshing ? "Actualizando..." : "Recargar conciliacion"}
            </Button>
          </div>
        </div>
      </div>

      {!selectedCuenta ? (
        <Card className="rounded-3xl border-slate-200">
          <CardContent className="p-8 text-center text-slate-500">
            Registra al menos una cuenta bancaria en tesoreria para iniciar la conciliacion.
          </CardContent>
        </Card>
      ) : (
        <>
          <Card className="rounded-3xl border-slate-200">
            <CardHeader>
              <CardTitle>Control del corte</CardTitle>
              <CardDescription>
                Selecciona la cuenta, define la fecha de corte y documenta observaciones del cierre.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.2fr_0.8fr_0.8fr]">
                <Field label="Cuenta bancaria">
                  <Select value={selectedCuenta.id} onValueChange={setSelectedCuentaId} disabled={bloqueado}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {cuentasBancarias.map((cuenta) => (
                        <SelectItem key={cuenta.id} value={cuenta.id}>
                          {cuenta.banco} - {cuenta.nombre}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>

                <Field label="Fecha de corte">
                  <Input
                    type="date"
                    value={fechaCorte}
                    onChange={(event) => setFechaCorte(event.target.value)}
                    disabled={bloqueado}
                  />
                </Field>

                <Field label="Estado persistido">
                  <div className="flex h-10 items-center rounded-2xl border border-slate-200 bg-slate-50 px-3">
                    <Badge className={estadoCorte.className}>{estadoCorte.label}</Badge>
                  </div>
                </Field>
              </div>

              <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.3fr_1fr]">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div className="text-xs uppercase tracking-[0.18em] text-slate-500">
                    Cuenta y trazabilidad
                  </div>
                  <div className="mt-3 grid grid-cols-1 gap-3 text-sm sm:grid-cols-3">
                    <InfoLine label="Banco" value={selectedCuenta.banco} />
                    <InfoLine label="Numero" value={selectedCuenta.numero_cuenta} />
                    <InfoLine
                      label="Cuenta contable"
                      value={selectedCuenta.codigo_cuenta_contable || "Sin asignar"}
                    />
                  </div>
                  {!selectedCuenta.codigo_cuenta_contable && (
                    <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                      La cuenta no tiene codigo contable asociado. Puedes revisar el corte, pero
                      los ajustes auditablemente correctos requieren esa vinculacion.
                    </div>
                  )}
                </div>

                <Field label="Observaciones del corte">
                  <Textarea
                    value={observaciones}
                    onChange={(event) => setObservaciones(event.target.value)}
                    placeholder="Documenta diferencias, pendientes o criterios usados en el cierre."
                    className="min-h-[126px]"
                    disabled={bloqueado}
                  />
                </Field>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
                <Button
                  variant="outline"
                  className="rounded-2xl"
                  onClick={() => void handleSaveDraft()}
                  disabled={bloqueado}
                >
                  {savingDraft ? "Guardando..." : "Guardar borrador"}
                </Button>
                <Button
                  className="rounded-2xl"
                  onClick={() => void handleCloseCut()}
                  disabled={bloqueado}
                >
                  {closingCut ? "Cerrando..." : "Cerrar corte"}
                </Button>
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            <SummaryCard
              icon={Landmark}
              title="Saldo banco"
              value={currency(resumen.saldoBanco)}
              caption="Ultimo saldo bancario hasta la fecha de corte"
            />
            <SummaryCard
              icon={ShieldCheck}
              title="Saldo libros"
              value={currency(resumen.saldoLibros)}
              caption="Saldo contable de la cuenta bancaria asociada"
            />
            <SummaryCard
              icon={CheckCircle2}
              title="Partidas conciliadas"
              value={String(resumen.coincidencias)}
              caption={`${resumen.sugerenciasPendientes} sugerencias pendientes de confirmacion`}
            />
            <SummaryCard
              icon={AlertCircle}
              title="Diferencia"
              value={currency(resumen.diferencia)}
              caption={`${resumen.ajustesPendientes} ajustes pendientes y ${resumen.excepcionesLibros} partidas en libros`}
              tone={Math.abs(resumen.diferencia) <= 0.01 ? "positive" : "negative"}
            />
          </div>

          <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.55fr_1fr]">
            <div className="space-y-6">
              <PartidasSection
                icon={CheckCircle2}
                title="Coincidencias y propuestas"
                description="Cruces entre extracto y libros. Las sugerencias por monto y fecha requieren confirmacion humana."
                items={coincidencias}
                emptyTitle="Sin coincidencias detectadas"
                emptyDescription="Importa el extracto y registra asientos para que el motor pueda proponer cruces."
                renderAction={(partida) =>
                  !partida.conciliado ? (
                    <Button
                      size="sm"
                      className="rounded-xl"
                      onClick={() => void handleConfirmMatch(partida)}
                      disabled={bloqueado}
                    >
                      {confirmingMatchId === partida.id ? "Confirmando..." : "Confirmar match"}
                    </Button>
                  ) : null
                }
              />

              <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
                <PartidasSection
                  icon={Clock3}
                  title="Excepciones banco"
                  description="Movimientos en banco sin reflejo contable confirmado. No se ajustan solos."
                  items={excepcionesBanco}
                  emptyTitle="Sin diferencias desde banco"
                  emptyDescription="No hay partidas bancarias pendientes de revision manual."
                />

                <PartidasSection
                  icon={FileWarning}
                  title="Excepciones libros"
                  description="Asientos registrados que aun no aparecen en el banco al corte."
                  items={excepcionesLibros}
                  emptyTitle="Sin diferencias desde libros"
                  emptyDescription="No hay cheques o depositos en transito pendientes al cierre."
                />
              </div>
            </div>

            <div className="space-y-6">
              <PartidasSection
                icon={Sparkles}
                title="Ajustes propuestos"
                description="Cargos, intereses, notas y abonos bancarios que requieren asiento confirmado."
                items={ajustes}
                emptyTitle="Sin ajustes sugeridos"
                emptyDescription="No hay movimientos que requieran asiento adicional en este corte."
                renderAction={(partida) =>
                  partida.estado !== "aplicado" ? (
                    <Button
                      size="sm"
                      variant="outline"
                      className="rounded-xl"
                      onClick={() => handleOpenAdjustment(partida)}
                      disabled={bloqueado}
                    >
                      Crear ajuste
                    </Button>
                  ) : null
                }
              />

              <Card className="rounded-3xl border-slate-200 bg-[linear-gradient(180deg,_rgba(255,255,255,0.98),_rgba(248,250,252,0.96))]">
                <CardHeader>
                  <CardTitle>Criterio de cierre</CardTitle>
                  <CardDescription>
                    El sistema solo cierra como conciliado cuando la diferencia final es cero y no
                    quedan sugerencias ni ajustes obligatorios pendientes.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3 text-sm text-slate-600">
                  <StatusLine label="Sugerencias sin confirmar" value={String(resumen.sugerenciasPendientes)} />
                  <StatusLine label="Ajustes pendientes" value={String(resumen.ajustesPendientes)} />
                  <StatusLine label="Excepciones banco" value={String(resumen.excepcionesBanco)} />
                  <StatusLine label="Excepciones libros" value={String(resumen.excepcionesLibros)} />
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <div className="text-xs uppercase tracking-[0.18em] text-slate-500">
                      Estado calculado
                    </div>
                    <div className="mt-2 flex items-center gap-2">
                      <Badge className={estadoCorte.className}>{estadoCorte.label}</Badge>
                      <span className="text-sm text-slate-600">
                        {conciliacionActual
                          ? `Ultima persistencia: ${formatDate(conciliacionActual.fechaCorte)}`
                          : "Aun no se guardo este corte"}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </>
      )}

      <Dialog
        open={showAdjustmentDialog}
        onOpenChange={(open) => {
          if (!open && creatingAdjustment) {
            return;
          }
          setShowAdjustmentDialog(open);
          if (!open) {
            setSelectedPartida(null);
          }
        }}
      >
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Crear asiento de ajuste</DialogTitle>
            <DialogDescription>
              El ajuste siempre usa la cuenta bancaria como una pierna del asiento y requiere una
              contracuenta explicita del plan contable.
            </DialogDescription>
          </DialogHeader>

          {selectedPartida && (
            <div className="space-y-4">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="text-xs uppercase tracking-[0.18em] text-slate-500">
                  Partida seleccionada
                </div>
                <div className="mt-2 text-base font-semibold text-slate-950">
                  {selectedPartida.descripcion}
                </div>
                <div className="mt-1 text-sm text-slate-600">
                  {formatDate(selectedPartida.fecha)} / {currency(selectedPartida.monto)} / Ref:{" "}
                  {selectedPartida.referencia || "Sin referencia"}
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <Field label="Cuenta bancaria">
                  <div className="flex h-10 items-center rounded-2xl border border-slate-200 bg-slate-50 px-3 text-sm">
                    {selectedCuenta?.codigo_cuenta_contable || "Sin codigo"} -{" "}
                    {selectedCuenta?.nombre_cuenta_contable || selectedCuenta?.nombre || "Bancos"}
                  </div>
                </Field>

                <Field label="Contracuenta sugerida">
                  <div className="flex h-10 items-center rounded-2xl border border-slate-200 bg-slate-50 px-3 text-sm">
                    {selectedPartida.contracuentaSugeridaCodigo} -{" "}
                    {selectedPartida.contracuentaSugeridaNombre}
                  </div>
                </Field>
              </div>

              <Field label="Contracuenta a usar en el ajuste">
                <Select
                  value={contracuentaCodigo}
                  onValueChange={setContracuentaCodigo}
                  disabled={creatingAdjustment}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona una contracuenta" />
                  </SelectTrigger>
                  <SelectContent>
                    {contracuentas.map((cuenta) => (
                      <SelectItem key={cuenta.codigo} value={cuenta.codigo}>
                        {cuenta.codigo} - {cuenta.nombre}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>

              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowAdjustmentDialog(false)}
                  disabled={creatingAdjustment}
                >
                  Cancelar
                </Button>
                <Button
                  type="button"
                  onClick={() => void handleCreateAdjustment()}
                  disabled={creatingAdjustment || !contracuentaCodigo}
                >
                  {creatingAdjustment ? "Registrando..." : "Registrar ajuste"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

const Field = ({ label, children }: { label: string; children: ReactNode }) => (
  <div className="space-y-2">
    <Label>{label}</Label>
    {children}
  </div>
);

const InfoLine = ({ label, value }: { label: string; value: string }) => (
  <div className="rounded-2xl border border-white bg-white px-3 py-2">
    <div className="text-xs uppercase tracking-[0.16em] text-slate-500">{label}</div>
    <div className="mt-1 font-medium text-slate-900">{value}</div>
  </div>
);

const SummaryCard = ({
  icon: Icon,
  title,
  value,
  caption,
  tone = "neutral",
}: {
  icon: ComponentType<{ className?: string }>;
  title: string;
  value: string;
  caption: string;
  tone?: "neutral" | "positive" | "negative";
}) => {
  const valueTone =
    tone === "positive"
      ? "text-emerald-700"
      : tone === "negative"
        ? "text-rose-700"
        : "text-slate-950";

  return (
    <Card className="rounded-3xl border-slate-200">
      <CardContent className="flex items-start justify-between p-5">
        <div>
          <div className="text-sm text-slate-500">{title}</div>
          <div className={`mt-2 text-2xl font-semibold ${valueTone}`}>{value}</div>
          <div className="mt-1 text-xs text-slate-500">{caption}</div>
        </div>
        <div className="rounded-2xl bg-slate-100 p-3">
          <Icon className="h-5 w-5 text-slate-700" />
        </div>
      </CardContent>
    </Card>
  );
};

const ExecutivePill = ({
  icon: Icon,
  label,
  value,
}: {
  icon: ComponentType<{ className?: string }>;
  label: string;
  value: string;
}) => (
  <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900">
    <div className="flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-slate-500">
      <Icon className="h-4 w-4 text-slate-700" />
      {label}
    </div>
    <div className="mt-2 text-lg font-semibold">{value}</div>
  </div>
);

const StatusLine = ({ label, value }: { label: string; value: string }) => (
  <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-3">
    <span className="text-slate-500">{label}</span>
    <span className="font-medium text-slate-900">{value}</span>
  </div>
);

const PartidasSection = ({
  icon: Icon,
  title,
  description,
  items,
  emptyTitle,
  emptyDescription,
  renderAction,
}: {
  icon: ComponentType<{ className?: string }>;
  title: string;
  description: string;
  items: PartidaConciliacion[];
  emptyTitle: string;
  emptyDescription: string;
  renderAction?: (partida: PartidaConciliacion) => ReactNode;
}) => (
  <Card className="rounded-3xl border-slate-200">
    <CardHeader>
      <CardTitle className="flex items-center gap-2">
        <Icon className="h-5 w-5 text-slate-700" />
        {title}
      </CardTitle>
      <CardDescription>{description}</CardDescription>
    </CardHeader>
    <CardContent className="space-y-4">
      {items.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 px-4 py-8 text-center">
          <div className="text-base font-semibold text-slate-900">{emptyTitle}</div>
          <div className="mt-2 text-sm text-slate-500">{emptyDescription}</div>
        </div>
      ) : (
        items.map((partida) => {
          const status = getStatusBadge(partida);

          return (
            <div
              key={partida.id}
              className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
            >
              <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
                <div className="space-y-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge className={status.className}>{status.label}</Badge>
                    <Badge variant="outline">{getPartidaLabel(partida)}</Badge>
                    {partida.sugerida && !partida.conciliado && (
                      <Badge variant="outline">Revision humana requerida</Badge>
                    )}
                  </div>

                  <div>
                    <div className="text-base font-semibold text-slate-950">
                      {partida.descripcion}
                    </div>
                    <div className="mt-1 text-sm text-slate-500">
                      {formatDate(partida.fecha)} / Ref: {partida.referencia || "Sin referencia"}
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-3 text-xs text-slate-500">
                    <span>
                      Naturaleza:{" "}
                      {partida.naturalezaMovimiento === "credito" ? "Credito" : "Debito"}
                    </span>
                    {partida.requiereAjuste && (
                      <span>
                        Sugerida: {partida.contracuentaSugeridaCodigo} -{" "}
                        {partida.contracuentaSugeridaNombre}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex flex-col items-start gap-3 xl:items-end">
                  <div
                    className={`text-xl font-semibold ${
                      partida.naturalezaMovimiento === "credito"
                        ? "text-emerald-600"
                        : "text-rose-600"
                    }`}
                  >
                    {partida.naturalezaMovimiento === "credito" ? "+" : "-"}
                    {currency(partida.monto)}
                  </div>
                  {renderAction?.(partida)}
                </div>
              </div>
            </div>
          );
        })
      )}
    </CardContent>
  </Card>
);

export default ConciliacionBancaria;
