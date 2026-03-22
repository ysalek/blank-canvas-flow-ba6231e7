import { useMemo, useState } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useContabilidadIntegration } from "@/hooks/useContabilidadIntegration";
import { useClientesSupabase } from "@/hooks/useClientesSupabase";
import { useSupabaseProveedores } from "@/hooks/useSupabaseProveedores";
import { useAnticipos } from "@/hooks/useAnticipos";
import { Building2, Info, Landmark, Plus, Users } from "lucide-react";

type TipoAnticipo = "cliente" | "proveedor";

const AdvancesManagement = () => {
  const [showNewForm, setShowNewForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [newAnticipo, setNewAnticipo] = useState({
    tipo: "cliente" as TipoAnticipo,
    entidadId: "",
    monto: 0,
    concepto: "",
  });
  const { toast } = useToast();
  const { guardarAsiento } = useContabilidadIntegration();
  const { clientes, loading: loadingClientes } = useClientesSupabase();
  const { proveedores, loading: loadingProveedores } = useSupabaseProveedores();
  const { anticipos, loading: loadingAnticipos, crearAnticipo } = useAnticipos();

  const entidades = newAnticipo.tipo === "cliente" ? clientes : proveedores;

  const anticiposClientes = useMemo(
    () => anticipos.filter((anticipo) => anticipo.tipo === "cliente" && anticipo.estado === "activo"),
    [anticipos]
  );
  const anticiposProveedores = useMemo(
    () => anticipos.filter((anticipo) => anticipo.tipo === "proveedor" && anticipo.estado === "activo"),
    [anticipos]
  );

  const totalAnticiposClientes = anticiposClientes.reduce((sum, anticipo) => sum + anticipo.saldoPendiente, 0);
  const totalAnticiposProveedores = anticiposProveedores.reduce((sum, anticipo) => sum + anticipo.saldoPendiente, 0);

  const generateAccountingEntry = (anticipo: {
    tipo: TipoAnticipo;
    entidadNombre: string;
    monto: number;
    concepto: string;
  }) => {
    const fecha = new Date().toISOString().slice(0, 10);
    const numero = `ANT-${Date.now()}`;

    if (anticipo.tipo === "cliente") {
      return {
        id: numero,
        numero,
        fecha,
        concepto: `Anticipo recibido de ${anticipo.entidadNombre} - ${anticipo.concepto}`,
        referencia: `Anticipo Cliente ${anticipo.entidadNombre}`,
        estado: "registrado" as const,
        debe: anticipo.monto,
        haber: anticipo.monto,
        cuentas: [
          { codigo: "1111", nombre: "Caja", debe: anticipo.monto, haber: 0 },
          { codigo: "2121", nombre: "Anticipos de Clientes", debe: 0, haber: anticipo.monto },
        ],
      };
    }

    return {
      id: numero,
      numero,
      fecha,
      concepto: `Anticipo entregado a ${anticipo.entidadNombre} - ${anticipo.concepto}`,
      referencia: `Anticipo Proveedor ${anticipo.entidadNombre}`,
      estado: "registrado" as const,
      debe: anticipo.monto,
      haber: anticipo.monto,
      cuentas: [
        { codigo: "1151", nombre: "Anticipos a Proveedores", debe: anticipo.monto, haber: 0 },
        { codigo: "1111", nombre: "Caja", debe: 0, haber: anticipo.monto },
      ],
    };
  };

  const handleSaveAnticipo = async () => {
    if (!newAnticipo.entidadId || newAnticipo.monto <= 0 || !newAnticipo.concepto.trim()) {
      toast({
        title: "Datos incompletos",
        description: "Complete entidad, monto y concepto antes de registrar el anticipo.",
        variant: "destructive",
      });
      return;
    }

    const entidad = entidades.find((item) => item.id === newAnticipo.entidadId);
    if (!entidad) {
      toast({
        title: "Entidad no encontrada",
        description: "Seleccione un cliente o proveedor valido.",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);
    try {
      const asientoContable = generateAccountingEntry({
        tipo: newAnticipo.tipo,
        entidadNombre: entidad.nombre,
        monto: newAnticipo.monto,
        concepto: newAnticipo.concepto.trim(),
      });

      const asientoGuardado = await guardarAsiento(asientoContable);
      if (!asientoGuardado) {
        return;
      }

      const anticipoGuardado = await crearAnticipo({
        tipo: newAnticipo.tipo,
        entidadId: newAnticipo.entidadId,
        monto: newAnticipo.monto,
        concepto: newAnticipo.concepto.trim(),
      });

      if (!anticipoGuardado) {
        toast({
          title: "Persistencia parcial",
          description: "El asiento fue generado, pero el anticipo no pudo guardarse en Supabase.",
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Anticipo registrado",
        description: `Se registro el anticipo de ${entidad.nombre} por Bs. ${newAnticipo.monto.toFixed(2)}.`,
      });

      setShowNewForm(false);
      setNewAnticipo({
        tipo: "cliente",
        entidadId: "",
        monto: 0,
        concepto: "",
      });
    } finally {
      setSaving(false);
    }
  };

  const loading = loadingAnticipos || loadingClientes || loadingProveedores;

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-3xl border border-slate-200 bg-gradient-to-br from-slate-950 via-slate-900 to-emerald-900 text-white shadow-xl">
        <div className="grid gap-6 px-6 py-7 lg:grid-cols-[1.6fr_1fr] lg:px-8">
          <div className="space-y-4">
            <Badge className="w-fit border border-white/20 bg-white/10 text-white hover:bg-white/10">
              Tesoreria operativa
            </Badge>
            <div className="space-y-2">
              <h2 className="text-3xl font-semibold tracking-tight">Gestion de anticipos</h2>
              <p className="max-w-2xl text-sm text-slate-200">
                Registro auditable de anticipos de clientes y proveedores con asiento contable y persistencia real.
              </p>
            </div>
            <Dialog open={showNewForm} onOpenChange={setShowNewForm}>
              <DialogTrigger asChild>
                <Button className="bg-white text-slate-950 hover:bg-slate-100">
                  <Plus className="mr-2 h-4 w-4" />
                  Nuevo anticipo
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Registrar nuevo anticipo</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Tipo de anticipo</Label>
                    <Select
                      value={newAnticipo.tipo}
                      onValueChange={(value: TipoAnticipo) =>
                        setNewAnticipo((prev) => ({ ...prev, tipo: value, entidadId: "" }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="cliente">Anticipo de cliente</SelectItem>
                        <SelectItem value="proveedor">Anticipo a proveedor</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>{newAnticipo.tipo === "cliente" ? "Cliente" : "Proveedor"}</Label>
                    <Select
                      value={newAnticipo.entidadId}
                      onValueChange={(value) => setNewAnticipo((prev) => ({ ...prev, entidadId: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={`Seleccione ${newAnticipo.tipo}`} />
                      </SelectTrigger>
                      <SelectContent>
                        {entidades.map((entidad) => (
                          <SelectItem key={entidad.id} value={entidad.id}>
                            {entidad.nombre}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Monto</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={newAnticipo.monto || ""}
                      onChange={(event) =>
                        setNewAnticipo((prev) => ({ ...prev, monto: Number(event.target.value) || 0 }))
                      }
                      placeholder="0.00"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Concepto</Label>
                    <Textarea
                      value={newAnticipo.concepto}
                      onChange={(event) => setNewAnticipo((prev) => ({ ...prev, concepto: event.target.value }))}
                      placeholder="Motivo del anticipo, orden comercial o detalle de respaldo"
                    />
                  </div>

                  <div className="flex gap-2 pt-2">
                    <Button onClick={() => void handleSaveAnticipo()} disabled={saving}>
                      {saving ? "Registrando..." : "Registrar anticipo"}
                    </Button>
                    <Button variant="outline" onClick={() => setShowNewForm(false)} disabled={saving}>
                      Cancelar
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          <Card className="border-white/10 bg-white/10 text-white shadow-none backdrop-blur">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Balance de anticipos</CardTitle>
              <CardDescription className="text-slate-200">
                Los anticipos de clientes quedan como pasivo y los de proveedores como activo.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3 text-sm">
              <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-black/10 px-4 py-3">
                <span>Clientes</span>
                <strong>Bs. {totalAnticiposClientes.toFixed(2)}</strong>
              </div>
              <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-black/10 px-4 py-3">
                <span>Proveedores</span>
                <strong>Bs. {totalAnticiposProveedores.toFixed(2)}</strong>
              </div>
              <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-black/10 px-4 py-3">
                <span>Registros activos</span>
                <strong>{anticipos.filter((anticipo) => anticipo.estado === "activo").length}</strong>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          Los anticipos de clientes se registran en pasivo y los anticipos a proveedores en activo. Este modulo ya
          no depende del navegador: guarda en Supabase y genera asiento antes de confirmar la operacion.
        </AlertDescription>
      </Alert>

      <div className="grid gap-4 md:grid-cols-2">
        <ResumenCard
          title="Anticipos de clientes"
          detail={`${anticiposClientes.length} activos`}
          value={`Bs. ${totalAnticiposClientes.toFixed(2)}`}
          icon={<Users className="h-4 w-4 text-emerald-700" />}
          tone="emerald"
        />
        <ResumenCard
          title="Anticipos a proveedores"
          detail={`${anticiposProveedores.length} activos`}
          value={`Bs. ${totalAnticiposProveedores.toFixed(2)}`}
          icon={<Building2 className="h-4 w-4 text-sky-700" />}
          tone="sky"
        />
      </div>

      <Card className="rounded-3xl border-slate-200 shadow-sm">
        <CardHeader>
          <CardTitle>Detalle de anticipos activos</CardTitle>
          <CardDescription>Relacion completa de anticipos pendientes de aplicacion o regularizacion.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tipo</TableHead>
                <TableHead>Entidad</TableHead>
                <TableHead>Fecha</TableHead>
                <TableHead className="text-right">Monto</TableHead>
                <TableHead className="text-right">Saldo</TableHead>
                <TableHead>Concepto</TableHead>
                <TableHead className="text-center">Estado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} className="py-10 text-center text-sm text-muted-foreground">
                    Cargando anticipos...
                  </TableCell>
                </TableRow>
              ) : anticipos.filter((anticipo) => anticipo.estado === "activo").length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="py-10 text-center text-sm text-muted-foreground">
                    No hay anticipos activos.
                  </TableCell>
                </TableRow>
              ) : (
                anticipos
                  .filter((anticipo) => anticipo.estado === "activo")
                  .map((anticipo) => (
                    <TableRow key={anticipo.id}>
                      <TableCell>
                        <Badge variant={anticipo.tipo === "cliente" ? "default" : "secondary"}>
                          {anticipo.tipo === "cliente" ? "Cliente" : "Proveedor"}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-medium">{anticipo.entidadNombre}</TableCell>
                      <TableCell>{new Date(anticipo.fecha).toLocaleDateString("es-BO")}</TableCell>
                      <TableCell className="text-right">Bs. {anticipo.monto.toFixed(2)}</TableCell>
                      <TableCell className="text-right">Bs. {anticipo.saldoPendiente.toFixed(2)}</TableCell>
                      <TableCell>{anticipo.concepto}</TableCell>
                      <TableCell className="text-center">
                        <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100">
                          {anticipo.estado}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

const ResumenCard = ({
  title,
  detail,
  value,
  icon,
  tone,
}: {
  title: string;
  detail: string;
  value: string;
  icon: React.ReactNode;
  tone: "emerald" | "sky";
}) => {
  const tones = {
    emerald: "border-emerald-200 bg-emerald-50",
    sky: "border-sky-200 bg-sky-50",
  };

  return (
    <Card className={`rounded-3xl shadow-sm ${tones[tone]}`}>
      <CardContent className="flex items-center justify-between gap-4 p-5">
        <div className="space-y-1">
          <p className="text-sm font-medium text-slate-700">{title}</p>
          <p className="text-2xl font-semibold text-slate-950">{value}</p>
          <p className="text-xs text-muted-foreground">{detail}</p>
        </div>
        <div className="rounded-2xl bg-white p-3 shadow-sm">{icon}</div>
      </CardContent>
    </Card>
  );
};

export default AdvancesManagement;
