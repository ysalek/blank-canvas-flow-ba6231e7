import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useConfiguracionSistema } from "@/hooks/useConfiguracionSistema";
import { useFacturas } from "@/hooks/useFacturas";
import {
  actividadesEconomicas,
  calcularIVA,
  calcularSubtotalSinIVA,
  generarCUF,
  obtenerCUFD,
  sectoresEspeciales,
  validarNITBoliviano,
  type Factura,
} from "../billing/BillingData";
import {
  AlertTriangle,
  CheckCircle2,
  Clock3,
  Download,
  FileText,
  RefreshCw,
  Send,
  Settings,
  ShieldCheck,
  Wifi,
  XCircle,
  Zap,
} from "lucide-react";

interface PuntoVentaElectronico {
  codigo: number;
  nombre: string;
  tipo: "fijo" | "movil";
  estado: "activo" | "inactivo";
}

interface NuevaFacturaElectronicaForm {
  codigoPuntoVenta: number;
  nit: string;
  razonSocial: string;
  montoTotal: number;
  codigoSector: number;
  actividadEconomica: string;
  observaciones: string;
}

interface ResultadoRecepcionSimulada {
  aceptada: boolean;
  motivo?: string;
}

const FORM_INITIAL_STATE: NuevaFacturaElectronicaForm = {
  codigoPuntoVenta: 0,
  nit: "",
  razonSocial: "",
  montoTotal: 0,
  codigoSector: 1,
  actividadEconomica: "",
  observaciones: "",
};

const MetricCard = ({
  title,
  value,
  detail,
  tone,
  icon,
}: {
  title: string;
  value: string;
  detail: string;
  tone: "slate" | "green" | "amber" | "sky";
  icon: ReactNode;
}) => {
  const tones = {
    slate: "border-slate-200 bg-white text-slate-900",
    green: "border-emerald-200 bg-emerald-50 text-emerald-900",
    amber: "border-amber-200 bg-amber-50 text-amber-900",
    sky: "border-sky-200 bg-sky-50 text-sky-900",
  };

  return (
    <Card className={`rounded-3xl shadow-sm ${tones[tone]}`}>
      <CardContent className="flex items-center justify-between gap-4 p-5">
        <div className="space-y-1">
          <p className="text-sm font-medium">{title}</p>
          <p className="text-3xl font-semibold tracking-tight">{value}</p>
          <p className="text-xs opacity-80">{detail}</p>
        </div>
        <div className="rounded-2xl bg-white/80 p-3">{icon}</div>
      </CardContent>
    </Card>
  );
};

const InfoStrip = ({ label, value }: { label: string; value: string }) => (
  <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
    <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
    <p className="truncate font-medium text-slate-900">{value}</p>
  </div>
);

const hasText = (value?: string | null) => Boolean(value?.trim());

const obtenerPendientesSin = (
  configSin: ReturnType<typeof useConfiguracionSistema>["configSin"],
  nitEmpresa: string,
) => {
  const pendientes: string[] = [];

  if (!configSin.activo) pendientes.push("Activar integracion SIN");
  if (!hasText(configSin.codigoSistema)) pendientes.push("Codigo de sistema");
  if (!hasText(configSin.tokenDelegado)) pendientes.push("Token delegado");
  if (!hasText(configSin.urlApi)) pendientes.push("URL API");
  if (!hasText(configSin.tipoAmbiente)) pendientes.push("Tipo de ambiente");
  if (!hasText(configSin.codigoSucursal)) pendientes.push("Codigo de sucursal");
  if (!hasText(configSin.codigoPuntoVenta)) pendientes.push("Codigo de punto de venta");
  if (!hasText(configSin.nit || nitEmpresa)) pendientes.push("NIT emisor");

  return pendientes;
};

const esFacturaElectronica = (factura: Factura) =>
  Boolean(factura.cuf || factura.cufd || factura.codigoControl) ||
  factura.observaciones.includes("Registro creado desde Facturacion Electronica.");

const simularRecepcionElectronica = (
  factura: Factura,
  conectadoSIN: boolean,
): ResultadoRecepcionSimulada => {
  if (!conectadoSIN) {
    return { aceptada: false, motivo: "La configuracion operativa del SIN no esta lista." };
  }

  if (!validarNITBoliviano(factura.cliente.nit).valido) {
    return { aceptada: false, motivo: "El NIT del cliente no supera la validacion boliviana." };
  }

  if (!hasText(factura.cufd)) {
    return { aceptada: false, motivo: "La factura no tiene CUFD operativo asociado." };
  }

  if (!hasText(factura.cuf)) {
    return { aceptada: false, motivo: "La factura no tiene CUF generado." };
  }

  if (!factura.items.length || !hasText(factura.items[0]?.codigoSIN)) {
    return { aceptada: false, motivo: "La factura no tiene sector/documento tributario enlazado." };
  }

  return { aceptada: true };
};

const EstadoSinBadge = ({ estado }: { estado: Factura["estadoSIN"] }) => {
  if (estado === "aceptado") {
    return (
      <Badge className="gap-1 bg-emerald-100 text-emerald-900 hover:bg-emerald-100">
        <CheckCircle2 className="h-3.5 w-3.5" />
        Aceptado
      </Badge>
    );
  }

  if (estado === "rechazado") {
    return (
      <Badge variant="destructive" className="gap-1">
        <XCircle className="h-3.5 w-3.5" />
        Rechazado
      </Badge>
    );
  }

  return (
    <Badge variant="secondary" className="gap-1">
      <Clock3 className="h-3.5 w-3.5" />
      Pendiente
    </Badge>
  );
};

const FacturacionElectronicaModule = () => {
  const { facturas, loading, guardarFactura, actualizarFacturaElectronica } = useFacturas();
  const { empresa, configSin, configFiscal } = useConfiguracionSistema();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("operaciones");
  const [periodoFiltro, setPeriodoFiltro] = useState("");
  const [facturaFocoId, setFacturaFocoId] = useState("");
  const [accionFoco, setAccionFoco] = useState("");
  const [correccionPreparadaId, setCorreccionPreparadaId] = useState("");
  const [conectadoSIN, setConectadoSIN] = useState(false);
  const [verificandoSIN, setVerificandoSIN] = useState(false);
  const [facturaEnProcesoId, setFacturaEnProcesoId] = useState<string | null>(null);
  const [formData, setFormData] = useState<NuevaFacturaElectronicaForm>({
    ...FORM_INITIAL_STATE,
    codigoPuntoVenta: Number(configSin.codigoPuntoVenta || configFiscal.puntoVenta || 0),
  });

  useEffect(() => {
    setFormData((prev) => ({
      ...prev,
      codigoPuntoVenta: Number(configSin.codigoPuntoVenta || configFiscal.puntoVenta || prev.codigoPuntoVenta || 0),
    }));
  }, [configFiscal.puntoVenta, configSin.codigoPuntoVenta]);

  useEffect(() => {
    const applyUrlContext = () => {
      const urlParams = new URLSearchParams(window.location.search);
      const tab = urlParams.get("tab");
      const periodo = urlParams.get("periodo");
      const factura = urlParams.get("factura");
      const accion = urlParams.get("accion");

      if (tab && ["operaciones", "nueva", "puntos-venta", "sectores"].includes(tab)) {
        setActiveTab(tab);
      }

      setPeriodoFiltro(periodo || "");
      setFacturaFocoId(factura || "");
      setAccionFoco(accion || "");
    };

    applyUrlContext();
    window.addEventListener("popstate", applyUrlContext);
    return () => window.removeEventListener("popstate", applyUrlContext);
  }, []);

  const puntosVenta = useMemo<PuntoVentaElectronico[]>(() => {
    const discovered = new Set<number>();
    const baseCode = Number(configSin.codigoPuntoVenta || configFiscal.puntoVenta || 0);
    discovered.add(baseCode);
    facturas.forEach((factura) => discovered.add(Number(factura.puntoVenta || 0)));

    return Array.from(discovered)
      .sort((a, b) => a - b)
      .map((codigo) => ({
        codigo,
        nombre: codigo === baseCode ? "Casa matriz" : `Punto de venta ${codigo}`,
        tipo: codigo === 0 ? "fijo" : "movil",
        estado: "activo" as const,
      }));
  }, [configFiscal.puntoVenta, configSin.codigoPuntoVenta, facturas]);

  const facturasElectronicas = useMemo(
    () =>
      [...facturas]
        .filter(esFacturaElectronica)
        .filter((factura) => !periodoFiltro || factura.fecha?.startsWith(periodoFiltro))
        .sort((a, b) => (a.fecha < b.fecha ? 1 : -1)),
    [facturas, periodoFiltro]
  );

  const pendientesSin = useMemo(
    () => obtenerPendientesSin(configSin, empresa.nit),
    [configSin, empresa.nit],
  );

  useEffect(() => {
    if (!facturaFocoId || activeTab !== "operaciones") {
      return;
    }

    const element = document.getElementById(`factura-electronica-${facturaFocoId}`);
    if (!element) {
      return;
    }

    element.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [activeTab, facturaFocoId, facturasElectronicas]);

  const resumen = useMemo(() => {
    const total = facturasElectronicas.length;
    const autorizadas = facturasElectronicas.filter((factura) => factura.estadoSIN === "aceptado").length;
    const rechazadas = facturasElectronicas.filter((factura) => factura.estadoSIN === "rechazado").length;
    const pendientes = facturasElectronicas.filter((factura) => factura.estadoSIN === "pendiente").length;
    const montoAutorizado = facturasElectronicas
      .filter((factura) => factura.estadoSIN === "aceptado")
      .reduce((sum, factura) => sum + factura.total, 0);

    return {
      total,
      autorizadas,
      rechazadas,
      pendientes,
      montoAutorizado,
      porcentajeExito: total > 0 ? Math.round((autorizadas / total) * 100) : 0,
    };
  }, [facturasElectronicas]);

  const facturaEnfocada = useMemo(
    () => facturasElectronicas.find((factura) => factura.id === facturaFocoId) ?? null,
    [facturaFocoId, facturasElectronicas],
  );

  const accionSugerida = useMemo(() => {
    if (!facturaEnfocada) {
      return null;
    }

    const accion = accionFoco || (facturaEnfocada.estadoSIN === "rechazado" ? "revisar-datos" : "reenviar");

    if (accion === "revisar-datos") {
      return {
        titulo: "Revisar datos fiscales",
        detalle: "La factura enfocada fue observada. Revisa NIT, actividad economica, CUF/CUFD y observaciones antes de reenviar.",
      };
    }

    if (accion === "descargar-soporte") {
      return {
        titulo: "Descargar soporte auditable",
        detalle: "Genera el soporte JSON para revisar el rastro fiscal de esta factura con el equipo contable o de sistemas.",
      };
    }

    return {
      titulo: "Reenviar factura al flujo SIN",
      detalle: "La factura enfocada sigue pendiente. Una vez verificada la configuracion, puedes reenviarla desde esta misma mesa operativa.",
    };
  }, [accionFoco, facturaEnfocada]);

  useEffect(() => {
    if (accionFoco !== "revisar-datos" || !facturaEnfocada || correccionPreparadaId === facturaEnfocada.id) {
      return;
    }

    const itemPrincipal = facturaEnfocada.items?.[0];
    setFormData({
      codigoPuntoVenta: Number(facturaEnfocada.puntoVenta || configSin.codigoPuntoVenta || configFiscal.puntoVenta || 0),
      nit: facturaEnfocada.cliente?.nit || "",
      razonSocial: facturaEnfocada.cliente?.nombre || "",
      montoTotal: Number(facturaEnfocada.total || 0),
      codigoSector: Number(itemPrincipal?.codigoSIN || 1),
      actividadEconomica: itemPrincipal?.codigo || "",
      observaciones: [
        `Correccion sugerida de factura ${facturaEnfocada.numero}.`,
        facturaEnfocada.observaciones || "",
      ]
        .filter(Boolean)
        .join(" "),
    });
    setCorreccionPreparadaId(facturaEnfocada.id);
    setActiveTab("nueva");
  }, [accionFoco, configFiscal.puntoVenta, configSin.codigoPuntoVenta, correccionPreparadaId, facturaEnfocada]);

  const cufdActual = configSin.cufd || obtenerCUFD(Number(configSin.codigoPuntoVenta || 0));

  const verificarConexionSIN = useCallback(async () => {
    setVerificandoSIN(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 900));
      const listo = obtenerPendientesSin(configSin, empresa.nit).length === 0;

      setConectadoSIN(listo);

      toast({
        title: listo ? "Conectividad SIN validada" : "Configuracion SIN incompleta",
        description: listo
          ? "La capa operativa puede simular recepcion sobre facturas reales."
          : "Revise configuracion SIN: faltan credenciales o parametros operativos.",
        variant: listo ? "default" : "destructive",
      });
    } finally {
      setVerificandoSIN(false);
    }
  }, [configSin, empresa.nit, toast]);

  useEffect(() => {
    void verificarConexionSIN();
  }, [verificarConexionSIN]);

  const estadoConexion = useMemo(() => {
    if (!configSin.activo) {
      return {
        titulo: "SIN no habilitado",
        detalle: "La empresa no tiene la integracion activada en configuracion.",
        progreso: 30,
      };
    }

    if (!conectadoSIN) {
      return {
        titulo: "Pendiente de configuracion",
        detalle: "Faltan parametros operativos o aun no se verifico la conectividad.",
        progreso: 65,
      };
    }

    return {
      titulo: "Operacion asistida disponible",
      detalle: "La simulacion opera sobre la factura real y deja rastro auditable.",
      progreso: 100,
    };
  }, [configSin.activo, conectadoSIN]);

  const generarNumeroFactura = () => {
    const ultimoNumero = facturas.reduce((maximo, factura) => {
      const numero = Number(factura.numero || 0);
      return Number.isFinite(numero) && numero > maximo ? numero : maximo;
    }, 0);
    return String(ultimoNumero + 1).padStart(6, "0");
  };

  const handleCrearFactura = async () => {
    if (!conectadoSIN) {
      toast({
        title: "SIN no disponible",
        description: "Verifique la configuracion antes de registrar facturas electronicas.",
        variant: "destructive",
      });
      return;
    }

    const validacionNIT = validarNITBoliviano(formData.nit);
    if (!validacionNIT.valido) {
      toast({
        title: "NIT invalido",
        description: validacionNIT.mensaje,
        variant: "destructive",
      });
      return;
    }

    if (!formData.razonSocial.trim() || formData.montoTotal <= 0) {
      toast({
        title: "Datos incompletos",
        description: "La razon social y el monto total son obligatorios.",
        variant: "destructive",
      });
      return;
    }

    if (!formData.actividadEconomica) {
      toast({
        title: "Actividad requerida",
        description: "Selecciona la actividad economica antes de registrar la factura electronica.",
        variant: "destructive",
      });
      return;
    }

    const numeroFactura = generarNumeroFactura();
    const cufd = configSin.cufd || obtenerCUFD(formData.codigoPuntoVenta);
    const subtotal = Number(calcularSubtotalSinIVA(formData.montoTotal, formData.codigoSector).toFixed(2));
    const iva = Number(calcularIVA(formData.montoTotal, formData.codigoSector).toFixed(2));

    const factura: Factura = {
      id: "",
      numero: numeroFactura,
      cliente: {
        id: "",
        nombre: formData.razonSocial.trim(),
        nit: formData.nit.trim(),
        email: "",
        telefono: "",
        direccion: "",
        activo: true,
        fechaCreacion: new Date().toISOString().slice(0, 10),
      },
      fecha: new Date().toISOString().slice(0, 10),
      fechaVencimiento: new Date().toISOString().slice(0, 10),
      items: [
        {
          id: `FE-${Date.now()}`,
          productoId: "",
          codigo: formData.actividadEconomica || "SERV-SIN",
          descripcion: `Factura electronica ${formData.actividadEconomica || "servicio general"}`,
          cantidad: 1,
          precioUnitario: formData.montoTotal,
          descuento: 0,
          subtotal: formData.montoTotal,
          codigoSIN: String(formData.codigoSector),
        },
      ],
      subtotal,
      descuentoTotal: 0,
      iva,
      total: formData.montoTotal,
      estado: "borrador",
      estadoSIN: "pendiente",
      cuf: generarCUF(
        {
          nitEmisor: configSin.nit || empresa.nit,
          fechaHora: new Date().toISOString(),
          sucursal: configSin.codigoSucursal || configFiscal.sucursal || "0",
          modalidad: configSin.codigoModalidad || "1",
          tipoEmision: configSin.codigoEmision || "1",
          tipoFactura: configSin.tipoFacturaDocumento || "1",
          tipoDocumentoSector: String(formData.codigoSector),
          numeroFactura,
          pos: String(formData.codigoPuntoVenta),
        },
        cufd
      ),
      cufd,
      puntoVenta: formData.codigoPuntoVenta,
      codigoControl: `${Math.floor(Math.random() * 90) + 10}-${Math.floor(Math.random() * 90) + 10}-${Math.floor(Math.random() * 90) + 10}`,
      observaciones: [
        "Registro creado desde Facturacion Electronica.",
        `Actividad economica: ${formData.actividadEconomica || "no especificada"}.`,
        formData.observaciones.trim(),
      ]
        .filter(Boolean)
        .join(" "),
      fechaCreacion: new Date().toISOString().slice(0, 10),
    };

    const facturaGuardada = await guardarFactura(factura);
    if (!facturaGuardada) return;

    setFormData({
      ...FORM_INITIAL_STATE,
      codigoPuntoVenta: Number(configSin.codigoPuntoVenta || configFiscal.puntoVenta || 0),
    });
    setActiveTab("operaciones");

    toast({
      title: "Factura electronica registrada",
      description: `La factura ${numeroFactura} ya esta persistida y lista para recepcion simulada.`,
    });
  };

  const handleEnviarFactura = async (factura: Factura) => {
    if (!conectadoSIN) {
      toast({
        title: "SIN no disponible",
        description: "La verificacion de conectividad debe estar completa antes del envio.",
        variant: "destructive",
      });
      return;
    }

    setFacturaEnProcesoId(factura.id);
    await new Promise((resolve) => setTimeout(resolve, 1600));

    const resultado = simularRecepcionElectronica(factura, conectadoSIN);
    const observaciones = resultado.aceptada
      ? [factura.observaciones, "Recepcion SIN simulada: aceptada y auditada sobre la factura real."]
          .filter(Boolean)
          .join(" ")
      : [
          factura.observaciones,
          `Recepcion SIN simulada: rechazada por validacion funcional. Motivo: ${resultado.motivo}.`,
        ]
          .filter(Boolean)
          .join(" ");

    const actualizado = await actualizarFacturaElectronica(factura.id, {
      estado: resultado.aceptada ? "enviada" : "borrador",
      estadoSIN: resultado.aceptada ? "aceptado" : "rechazado",
      cuf: factura.cuf,
      cufd: factura.cufd || cufdActual,
      puntoVenta: factura.puntoVenta,
      codigoControl: factura.codigoControl,
      observaciones,
    });

    setFacturaEnProcesoId(null);
    if (!actualizado) return;

    toast({
      title: resultado.aceptada ? "Factura autorizada" : "Factura rechazada",
      description: resultado.aceptada
        ? `La factura ${factura.numero} quedo aceptada en el flujo simulado del SIN.`
        : `La factura ${factura.numero} quedo observada: ${resultado.motivo}.`,
      variant: resultado.aceptada ? "default" : "destructive",
    });
  };

  const handleDescargarSoporte = (factura: Factura) => {
    const blob = new Blob(
      [
        JSON.stringify(
          {
            numero: factura.numero,
            cliente: factura.cliente.nombre,
            nit: factura.cliente.nit,
            fecha: factura.fecha,
            total: factura.total,
            estadoSIN: factura.estadoSIN,
            cuf: factura.cuf,
            cufd: factura.cufd,
            puntoVenta: factura.puntoVenta,
            codigoControl: factura.codigoControl,
            observaciones: factura.observaciones,
          },
          null,
          2
        ),
      ],
      { type: "application/json" }
    );
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `factura_electronica_${factura.numero}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const obtenerSectorEspecial = (codigo: number) =>
    Object.values(sectoresEspeciales).find((sector) => sector.codigo === codigo);

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-3xl border border-slate-200 bg-gradient-to-br from-slate-950 via-slate-900 to-sky-900 text-white shadow-xl">
        <div className="grid gap-6 px-6 py-7 lg:grid-cols-[1.5fr_1fr] lg:px-8">
          <div className="space-y-4">
            <Badge className="w-fit border border-white/20 bg-white/10 text-white hover:bg-white/10">Mesa ejecutiva SIAT</Badge>
            <div className="flex items-center gap-3">
              <div className="rounded-2xl bg-white/10 p-3"><Zap className="h-6 w-6 text-sky-200" /></div>
              <div>
                <h2 className="text-3xl font-semibold tracking-tight">Facturacion electronica</h2>
                <p className="max-w-2xl text-sm text-slate-200">
                  Seguimiento operativo de CUF, CUFD, recepcion SIN y puntos de venta sobre facturas reales.
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-3">
              <Button variant="secondary" className="bg-white text-slate-950 hover:bg-slate-100" onClick={() => void verificarConexionSIN()} disabled={verificandoSIN}>
                <Settings className="mr-2 h-4 w-4" />
                {verificandoSIN ? "Verificando..." : "Verificar SIN"}
              </Button>
              <Badge variant="outline" className={`border-white/20 px-3 py-1 text-white ${conectadoSIN ? "bg-emerald-500/15" : "bg-rose-500/15"}`}>
                <Wifi className="mr-1 h-3.5 w-3.5" />
                {conectadoSIN ? "Operacion asistida disponible" : "Configuracion pendiente"}
              </Badge>
            </div>
          </div>

          <Card className="border-white/10 bg-white/10 text-white shadow-none backdrop-blur">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Estado de preparacion</CardTitle>
              <CardDescription className="text-slate-200">{estadoConexion.detalle}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span>{estadoConexion.titulo}</span>
                  <span>{estadoConexion.progreso}%</span>
                </div>
                <Progress value={estadoConexion.progreso} className="h-2 bg-white/15" />
              </div>
              <div className="grid gap-3 text-sm text-slate-100">
                <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-black/10 px-4 py-3"><span>Ambiente</span><strong>{configSin.tipoAmbiente === "1" ? "Produccion" : "Pruebas"}</strong></div>
                <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-black/10 px-4 py-3"><span>CUFD operativo</span><strong className="truncate pl-3 text-right">{cufdActual || "No generado"}</strong></div>
                <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-black/10 px-4 py-3"><span>Punto de venta</span><strong>{configSin.codigoPuntoVenta || configFiscal.puntoVenta || "0"}</strong></div>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      <Alert className="border-amber-300 bg-amber-50">
        <AlertTriangle className="h-4 w-4 text-amber-700" />
        <AlertDescription className="text-amber-900">
          El flujo sigue en modo demostracion para CUIS, CUFD, recepcion y rechazo. Ahora todo opera sobre la factura real que usan ventas, libros y cobranza.
        </AlertDescription>
      </Alert>

      {!conectadoSIN && pendientesSin.length > 0 && (
        <Alert className="border-rose-300 bg-rose-50">
          <XCircle className="h-4 w-4 text-rose-700" />
          <AlertDescription className="text-rose-900">
            Antes de operar faltan estos datos SIN: {pendientesSin.join(", ")}.
          </AlertDescription>
        </Alert>
      )}

      {periodoFiltro && (
        <Alert className="border-sky-300 bg-sky-50">
          <FileText className="h-4 w-4 text-sky-700" />
          <AlertDescription className="flex flex-col gap-3 text-sky-900 md:flex-row md:items-center md:justify-between">
            <span>Vista enfocada en facturas electronicas del periodo {periodoFiltro}.</span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                const url = new URL(window.location.href);
                url.searchParams.delete("periodo");
                window.history.pushState({}, "", url.toString());
                setPeriodoFiltro("");
              }}
            >
              Limpiar filtro
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {facturaEnfocada && accionSugerida && (
        <Alert className="border-amber-300 bg-amber-50">
          <AlertTriangle className="h-4 w-4 text-amber-700" />
          <AlertDescription className="flex flex-col gap-3 text-amber-950 lg:flex-row lg:items-center lg:justify-between">
            <div className="space-y-1">
              <p className="font-medium">
                {accionSugerida.titulo}: factura {facturaEnfocada.numero}
              </p>
              <p className="text-sm text-amber-900">
                {accionSugerida.detalle}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {(accionFoco === "reenviar" || facturaEnfocada.estadoSIN === "pendiente") && (
                <Button
                  size="sm"
                  onClick={() => void handleEnviarFactura(facturaEnfocada)}
                  disabled={!conectadoSIN || facturaEnProcesoId === facturaEnfocada.id || facturaEnfocada.estadoSIN === "aceptado"}
                >
                  {facturaEnProcesoId === facturaEnfocada.id ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                  Reenviar ahora
                </Button>
              )}
              <Button size="sm" variant="outline" onClick={() => handleDescargarSoporte(facturaEnfocada)}>
                <Download className="mr-2 h-4 w-4" />
                Descargar soporte
              </Button>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => {
                  const url = new URL(window.location.href);
                  url.searchParams.delete("factura");
                  url.searchParams.delete("accion");
                  window.history.pushState({}, "", url.toString());
                  setFacturaFocoId("");
                  setAccionFoco("");
                  setCorreccionPreparadaId("");
                }}
              >
                Quitar foco
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      )}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard title="Facturas auditadas" value={String(resumen.total)} detail="Base unica electronica" tone="slate" icon={<FileText className="h-4 w-4" />} />
        <MetricCard title="Autorizadas" value={String(resumen.autorizadas)} detail={`Bs ${resumen.montoAutorizado.toLocaleString("es-BO", { minimumFractionDigits: 2 })}`} tone="green" icon={<CheckCircle2 className="h-4 w-4" />} />
        <MetricCard title="Pendientes" value={String(resumen.pendientes)} detail="Por recepcionar" tone="amber" icon={<Clock3 className="h-4 w-4" />} />
        <MetricCard title="Exito SIN" value={`${resumen.porcentajeExito}%`} detail={`${resumen.rechazadas} observadas`} tone="sky" icon={<ShieldCheck className="h-4 w-4" />} />
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="flex h-auto w-full flex-wrap justify-start gap-2 rounded-2xl bg-slate-100 p-2">
          <TabsTrigger value="operaciones" className="rounded-xl">Operaciones</TabsTrigger>
          <TabsTrigger value="nueva" className="rounded-xl">Nueva factura</TabsTrigger>
          <TabsTrigger value="puntos-venta" className="rounded-xl">Puntos de venta</TabsTrigger>
          <TabsTrigger value="sectores" className="rounded-xl">Sectores</TabsTrigger>
        </TabsList>

        <TabsContent value="operaciones" className="space-y-4">
          <div className="grid gap-4 xl:grid-cols-[1.7fr_1fr]">
            <Card className="rounded-3xl border-slate-200 shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle>Control operativo de facturas</CardTitle>
                <CardDescription>Recepcion simulada del SIN y descarga de soporte auditable.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="hidden md:block">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Factura</TableHead>
                        <TableHead>Cliente</TableHead>
                        <TableHead>CUF / CUFD</TableHead>
                        <TableHead>Estado</TableHead>
                        <TableHead className="text-right">Monto</TableHead>
                        <TableHead className="text-right">Acciones</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {loading ? (
                        <TableRow><TableCell colSpan={6} className="py-10 text-center text-sm text-muted-foreground">Cargando facturas electronicas...</TableCell></TableRow>
                      ) : facturasElectronicas.length === 0 ? (
                        <TableRow><TableCell colSpan={6} className="py-10 text-center text-sm text-muted-foreground">No hay facturas registradas en la base real todavia.</TableCell></TableRow>
                      ) : (
                        facturasElectronicas.map((factura) => (
                          <TableRow
                            key={factura.id}
                            id={`factura-electronica-${factura.id}`}
                            className={factura.id === facturaFocoId ? "bg-amber-50/80 ring-1 ring-inset ring-amber-200 transition-colors" : ""}
                          >
                            <TableCell><div className="space-y-1"><div className="font-medium">{factura.numero}</div><div className="text-xs text-muted-foreground">{new Date(factura.fecha).toLocaleDateString("es-BO")} - PV {factura.puntoVenta}</div></div></TableCell>
                            <TableCell><div className="space-y-1"><div className="font-medium">{factura.cliente.nombre}</div><div className="text-xs text-muted-foreground">NIT {factura.cliente.nit}</div></div></TableCell>
                            <TableCell className="max-w-[240px]"><div className="space-y-1"><p className="truncate text-xs text-muted-foreground">{factura.cuf || "Sin CUF"}</p><p className="truncate text-xs text-muted-foreground">{factura.cufd || "Sin CUFD"}</p></div></TableCell>
                            <TableCell><EstadoSinBadge estado={factura.estadoSIN} /></TableCell>
                            <TableCell className="text-right font-medium">Bs {factura.total.toLocaleString("es-BO", { minimumFractionDigits: 2 })}</TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-2">
                                <Button size="sm" onClick={() => void handleEnviarFactura(factura)} disabled={!conectadoSIN || facturaEnProcesoId === factura.id || factura.estadoSIN === "aceptado"}>
                                  {facturaEnProcesoId === factura.id ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                                  {factura.estadoSIN === "aceptado" ? "Autorizada" : "Enviar"}
                                </Button>
                                <Button size="sm" variant="outline" onClick={() => handleDescargarSoporte(factura)}><Download className="mr-2 h-4 w-4" />Soporte</Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>

                <div className="space-y-3 md:hidden">
                  {facturaFocoId && !facturasElectronicas.some((factura) => factura.id === facturaFocoId) && (
                    <Alert className="rounded-2xl border-amber-200 bg-amber-50 text-amber-900">
                      <AlertTriangle className="h-4 w-4" />
                      <AlertDescription>
                        La factura observada ya no aparece en este filtro. Revisa si cambio de periodo o si su estado fue corregido.
                      </AlertDescription>
                    </Alert>
                  )}
                  {facturasElectronicas.map((factura) => (
                    <Card
                      key={factura.id}
                      id={`factura-electronica-${factura.id}`}
                      className={factura.id === facturaFocoId ? "rounded-2xl border-amber-200 bg-amber-50 shadow-none ring-1 ring-amber-200" : "rounded-2xl border border-slate-200 shadow-none"}
                    >
                      <CardContent className="space-y-4 p-4">
                        <div className="flex items-start justify-between gap-3"><div><div className="font-semibold">{factura.numero}</div><p className="text-sm text-muted-foreground">{factura.cliente.nombre}</p></div><EstadoSinBadge estado={factura.estadoSIN} /></div>
                        <div className="text-sm text-muted-foreground">Bs {factura.total.toLocaleString("es-BO", { minimumFractionDigits: 2 })} - PV {factura.puntoVenta}</div>
                        <div className="flex gap-2"><Button size="sm" className="flex-1" onClick={() => void handleEnviarFactura(factura)} disabled={!conectadoSIN || facturaEnProcesoId === factura.id || factura.estadoSIN === "aceptado"}>Enviar</Button><Button size="sm" variant="outline" className="flex-1" onClick={() => handleDescargarSoporte(factura)}>Soporte</Button></div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-3xl border-slate-200 shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle>Cola tributaria</CardTitle>
                <CardDescription>Excepciones y observaciones visibles para no perder trazabilidad.</CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[460px] pr-4">
                  <div className="space-y-3">
                    {facturasElectronicas.slice(0, 10).map((factura) => (
                      <div
                        key={factura.id}
                        id={`factura-electronica-${factura.id}-cola`}
                        className={factura.id === facturaFocoId ? "rounded-2xl border border-amber-200 bg-amber-50 p-4 ring-1 ring-amber-200" : "rounded-2xl border border-slate-200 bg-slate-50 p-4"}
                      >
                        <div className="flex items-center justify-between gap-3"><div><p className="font-medium">{factura.numero}</p><p className="text-xs text-muted-foreground">{factura.cliente.nombre} - NIT {factura.cliente.nit}</p></div><EstadoSinBadge estado={factura.estadoSIN} /></div>
                        <Separator className="my-3" />
                        <div className="space-y-2 text-sm">
                          <div className="flex items-center justify-between"><span className="text-muted-foreground">CUF</span><span className="max-w-[180px] truncate font-medium">{factura.cuf || "Pendiente"}</span></div>
                          <div className="flex items-center justify-between"><span className="text-muted-foreground">CUFD</span><span className="max-w-[180px] truncate font-medium">{factura.cufd || "Pendiente"}</span></div>
                          <div className="flex items-center justify-between"><span className="text-muted-foreground">Observacion</span><span className="max-w-[180px] truncate text-right font-medium">{factura.observaciones || "Sin novedad"}</span></div>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="nueva">
          <Card className="rounded-3xl border-slate-200 shadow-sm">
            <CardHeader>
              <CardTitle>Registro electronico asistido</CardTitle>
              <CardDescription>Crea una factura basica sobre la base real para dejar CUF, CUFD y control enlazados.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {accionFoco === "revisar-datos" && facturaEnfocada && correccionPreparadaId === facturaEnfocada.id && (
                <Alert className="border-amber-300 bg-amber-50">
                  <AlertTriangle className="h-4 w-4 text-amber-700" />
                  <AlertDescription className="flex flex-col gap-3 text-amber-950 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                      Se preparo un borrador correctivo con base en la factura {facturaEnfocada.numero}. Ajusta los datos fiscales y registra una nueva version antes de reenviar.
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button size="sm" variant="outline" onClick={() => handleDescargarSoporte(facturaEnfocada)}>
                        <Download className="mr-2 h-4 w-4" />
                        Soporte origen
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setActiveTab("operaciones")}>
                        Volver a operaciones
                      </Button>
                    </div>
                  </AlertDescription>
                </Alert>
              )}
              <div className="grid gap-4 lg:grid-cols-3">
                <InfoStrip label="Empresa" value={empresa.razonSocial || "Sin configurar"} />
                <InfoStrip label="NIT emisor" value={configSin.nit || empresa.nit || "Sin NIT"} />
                <InfoStrip label="CUFD operativo" value={cufdActual || "No generado"} />
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Punto de venta</Label>
                  <Select value={String(formData.codigoPuntoVenta)} onValueChange={(value) => setFormData((prev) => ({ ...prev, codigoPuntoVenta: Number(value) }))}>
                    <SelectTrigger><SelectValue placeholder="Seleccione punto de venta" /></SelectTrigger>
                    <SelectContent>{puntosVenta.map((punto) => <SelectItem key={punto.codigo} value={String(punto.codigo)}>{punto.codigo} - {punto.nombre}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Sector especial</Label>
                  <Select value={String(formData.codigoSector)} onValueChange={(value) => setFormData((prev) => ({ ...prev, codigoSector: Number(value) }))}>
                    <SelectTrigger><SelectValue placeholder="Seleccione sector" /></SelectTrigger>
                    <SelectContent>{Object.entries(sectoresEspeciales).map(([nombre, sector]) => <SelectItem key={sector.codigo} value={String(sector.codigo)}>{sector.codigo} - {nombre} (IVA {sector.tasa}%)</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-2"><Label>NIT cliente</Label><Input value={formData.nit} onChange={(event) => setFormData((prev) => ({ ...prev, nit: event.target.value }))} placeholder="Ej. 1234567890" /></div>
                <div className="space-y-2"><Label>Razon social</Label><Input value={formData.razonSocial} onChange={(event) => setFormData((prev) => ({ ...prev, razonSocial: event.target.value }))} placeholder="Nombre o razon social" /></div>
                <div className="space-y-2"><Label>Monto total</Label><Input type="number" min="0" step="0.01" value={formData.montoTotal || ""} onChange={(event) => setFormData((prev) => ({ ...prev, montoTotal: Number(event.target.value) || 0 }))} placeholder="0.00" /></div>
                <div className="space-y-2">
                  <Label>Actividad economica</Label>
                  <Select value={formData.actividadEconomica} onValueChange={(value) => setFormData((prev) => ({ ...prev, actividadEconomica: value }))}>
                    <SelectTrigger><SelectValue placeholder="Seleccione actividad" /></SelectTrigger>
                    <SelectContent>{actividadesEconomicas.map((actividad) => <SelectItem key={actividad.codigo} value={actividad.codigo}>{actividad.codigo} - {actividad.descripcion}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2"><Label>Observaciones</Label><Textarea value={formData.observaciones} onChange={(event) => setFormData((prev) => ({ ...prev, observaciones: event.target.value }))} placeholder="Leyendas comerciales, referencia interna o comentario tributario." /></div>
              <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
                <Card className="rounded-2xl border border-slate-200 bg-slate-50 shadow-none">
                  <CardContent className="grid gap-3 p-4 text-sm">
                    <div className="flex items-center justify-between"><span className="text-muted-foreground">Subtotal contable</span><strong>Bs {calcularSubtotalSinIVA(formData.montoTotal, formData.codigoSector).toFixed(2)}</strong></div>
                    <div className="flex items-center justify-between"><span className="text-muted-foreground">IVA estimado</span><strong>Bs {calcularIVA(formData.montoTotal, formData.codigoSector).toFixed(2)}</strong></div>
                    <div className="flex items-center justify-between"><span className="text-muted-foreground">Sector tributario</span><strong>{obtenerSectorEspecial(formData.codigoSector)?.tasa === 0 ? "Tasa cero" : "General"}</strong></div>
                  </CardContent>
                </Card>
                <div className="flex items-end justify-end"><Button className="w-full md:w-auto" onClick={() => void handleCrearFactura()} disabled={!conectadoSIN}><FileText className="mr-2 h-4 w-4" />Registrar factura electronica</Button></div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="puntos-venta">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {puntosVenta.map((punto) => (
              <Card key={punto.codigo} className="rounded-3xl border-slate-200 shadow-sm">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between gap-3"><div><CardTitle className="text-lg">{punto.nombre}</CardTitle><CardDescription>Codigo {punto.codigo}</CardDescription></div><Badge variant={punto.estado === "activo" ? "default" : "destructive"}>{punto.estado}</Badge></div>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3"><span className="text-muted-foreground">Tipo</span><strong>{punto.tipo === "fijo" ? "Fijo" : "Movil"}</strong></div>
                  <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3"><span className="text-muted-foreground">Facturas asociadas</span><strong>{facturasElectronicas.filter((factura) => factura.puntoVenta === punto.codigo).length}</strong></div>
                  <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3"><span className="text-muted-foreground">Configuracion central</span><strong>{String(configSin.codigoPuntoVenta || 0) === String(punto.codigo) ? "Principal" : "Derivado"}</strong></div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="sectores">
          <div className="grid gap-4 md:grid-cols-2">
            {Object.entries(sectoresEspeciales).map(([nombre, sector]) => (
              <Card key={sector.codigo} className="rounded-3xl border-slate-200 shadow-sm">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between gap-3"><div><CardTitle className="text-lg capitalize">{nombre.replace(/([A-Z])/g, " $1")}</CardTitle><CardDescription>Codigo sector {sector.codigo}</CardDescription></div><Badge variant={sector.tasa === 0 ? "default" : "secondary"}>IVA {sector.tasa}%</Badge></div>
                </CardHeader>
                <CardContent className="space-y-3 text-sm text-muted-foreground">
                  <p>{sector.tasa === 0 ? "Este sector opera con tratamiento especial y el modulo calcula tasa cero." : "Este sector usa tratamiento general y mantiene debito fiscal estimado al 13%."}</p>
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">Vinculacion sugerida con el comprobante electronico y libros de ventas.</div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default FacturacionElectronicaModule;
