import { useRef, useState } from "react";
import {
  Building2,
  CheckCircle,
  Download,
  Key,
  RefreshCw,
  Save,
  Shield,
  TestTube,
  Upload,
  XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useConfiguracionSistema } from "@/hooks/useConfiguracionSistema";
import UserProductionManager from "./users/UserProductionManager";
import { EnhancedHeader, EnhancedMetricCard, MetricGrid } from "./dashboard/EnhancedLayout";

const ConfiguracionModule = () => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const {
    empresa,
    setEmpresa,
    configFiscal,
    setConfigFiscal,
    configSistema,
    setConfigSistema,
    configSin,
    setConfigSin,
    loading,
    refetch,
    guardarEmpresaFiscal,
    guardarSistema,
    guardarSin,
    exportarConfiguracion,
    importarConfiguracion,
  } = useConfiguracionSistema();

  const [testingConnection, setTestingConnection] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<"idle" | "success" | "error">("idle");
  const [importingConfig, setImportingConfig] = useState(false);
  const [exportingConfig, setExportingConfig] = useState(false);
  const [refreshingConfig, setRefreshingConfig] = useState(false);
  const [savingSection, setSavingSection] = useState<"empresa" | "sin" | "sistema" | null>(null);
  const [generatingCuis, setGeneratingCuis] = useState(false);
  const [generatingCufd, setGeneratingCufd] = useState(false);
  const integracionSinLista = Boolean(configSin.tokenDelegado && configSin.codigoSistema);
  const parametrosEmpresaCompletos = [empresa.razonSocial, empresa.nit, empresa.actividadEconomica].filter(
    (value) => value?.trim().length > 0
  ).length;
  const automatizacionesActivas = [
    configSistema.numeracionAutomatica,
    configSistema.backupAutomatico,
    configSistema.notificacionesEmail,
    configSistema.posHabilitado,
  ].filter(Boolean).length;

  const uiBlocked =
    loading ||
    testingConnection ||
    importingConfig ||
    exportingConfig ||
    refreshingConfig ||
    savingSection !== null ||
    generatingCuis ||
    generatingCufd;

  const testearConexionSin = async () => {
    setTestingConnection(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 2000));

      if (configSin.tokenDelegado && configSin.codigoSistema) {
        setConnectionStatus("success");
        toast({
          title: "Conexion simulada exitosa",
          description: "Las credenciales minimas del SIN estan completas para ambiente de prueba.",
        });
      } else {
        setConnectionStatus("error");
        toast({
          title: "Conexion simulada fallida",
          description: "Completa token delegado y codigo de sistema antes de probar integracion.",
          variant: "destructive",
        });
      }
    } finally {
      setTestingConnection(false);
    }
  };

  const obtenerCuis = async () => {
    setGeneratingCuis(true);
    try {
      const nuevoCuis = `CUIS${Date.now()}`;
      setConfigSin((prev) => ({ ...prev, cuis: nuevoCuis }));
      toast({
        title: "CUIS simulado generado",
        description: `Se asigno ${nuevoCuis} para pruebas internas.`,
      });
    } finally {
      setGeneratingCuis(false);
    }
  };

  const obtenerCufd = async () => {
    if (!configSin.cuis) {
      toast({
        title: "CUIS requerido",
        description: "Primero debes obtener un CUIS antes de generar el CUFD.",
        variant: "destructive",
      });
      return;
    }
    setGeneratingCufd(true);
    try {
      const fechaVigencia = new Date();
      fechaVigencia.setDate(fechaVigencia.getDate() + 1);
      setConfigSin((prev) => ({
        ...prev,
        cufd: `CUFD${Date.now()}`,
        fechaVigenciaCufd: fechaVigencia.toISOString().split("T")[0],
      }));

      toast({
        title: "CUFD simulado generado",
        description: `El CUFD de prueba quedo vigente hasta ${fechaVigencia.toLocaleDateString("es-BO")}.`,
      });
    } finally {
      setGeneratingCufd(false);
    }
  };

  const handleImportarClick = () => {
    fileInputRef.current?.click();
  };

  const handleImportFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setImportingConfig(true);
    try {
      const contenido = await file.text();
      const data = JSON.parse(contenido);
      await importarConfiguracion(data);
    } catch (error) {
      console.error("Error importando configuracion:", error);
      toast({
        title: "Archivo invalido",
        description: "No se pudo interpretar el archivo de configuracion.",
        variant: "destructive",
      });
    } finally {
      setImportingConfig(false);
      if (event.target) {
        event.target.value = "";
      }
    }
  };

  const handleExportarConfiguracion = () => {
    setExportingConfig(true);
    try {
      exportarConfiguracion();
    } finally {
      setExportingConfig(false);
    }
  };

  const handleRefetch = async () => {
    setRefreshingConfig(true);
    try {
      await Promise.resolve(refetch());
    } finally {
      setRefreshingConfig(false);
    }
  };

  const handleGuardarEmpresaFiscal = async () => {
    setSavingSection("empresa");
    try {
      await guardarEmpresaFiscal();
    } finally {
      setSavingSection(null);
    }
  };

  const handleGuardarSistema = async () => {
    setSavingSection("sistema");
    try {
      await guardarSistema();
    } finally {
      setSavingSection(null);
    }
  };

  const handleGuardarSin = async () => {
    setSavingSection("sin");
    try {
      await guardarSin();
    } finally {
      setSavingSection(null);
    }
  };

  if (loading) {
    return (
      <div className="page-shell space-y-6 pb-12">
        <EnhancedHeader
          title="Configuracion del sistema"
          subtitle="Cargando parametros fiscales, operativos y de seguridad centralizados."
        />
      </div>
    );
  }

  return (
    <div className="page-shell space-y-6 pb-12">
      <input
        ref={fileInputRef}
        type="file"
        accept="application/json"
        className="hidden"
        onChange={handleImportFile}
      />

      <EnhancedHeader
        title="Configuracion del sistema"
        subtitle="Administra parametros empresariales, fiscales y operativos desde una sola mesa de control con persistencia centralizada."
        badge={{
          text: integracionSinLista ? "Base operativa conectada" : "Pendiente de completar",
          variant: integracionSinLista ? "secondary" : "warning",
        }}
        actions={
          <div className="flex flex-wrap gap-2">
            <Button onClick={handleImportarClick} variant="outline" size="sm" disabled={uiBlocked}>
              <Upload className="mr-2 h-4 w-4" />
              {importingConfig ? "Importando..." : "Importar"}
            </Button>
            <Button onClick={handleExportarConfiguracion} variant="outline" size="sm" disabled={uiBlocked}>
              <Download className="mr-2 h-4 w-4" />
              {exportingConfig ? "Exportando..." : "Exportar"}
            </Button>
            <Button onClick={() => void handleRefetch()} variant="outline" size="sm" disabled={uiBlocked}>
              <RefreshCw className="mr-2 h-4 w-4" />
              {refreshingConfig ? "Recargando..." : "Recargar"}
            </Button>
          </div>
        }
      />

      <MetricGrid columns={4}>
        <EnhancedMetricCard
          title="Empresa"
          value={`${parametrosEmpresaCompletos}/3`}
          subtitle="Campos base completos"
          icon={Building2}
          variant={parametrosEmpresaCompletos === 3 ? "success" : "warning"}
        />
        <EnhancedMetricCard
          title="Fiscal"
          value={configFiscal.regimen || "Sin regimen"}
          subtitle="Marco tributario activo"
          icon={Shield}
        />
        <EnhancedMetricCard
          title="Integracion SIN"
          value={integracionSinLista ? "Lista" : "Pendiente"}
          subtitle={configSin.cuis ? `CUIS ${configSin.cuis}` : "Sin credenciales activas"}
          icon={connectionStatus === "success" ? CheckCircle : connectionStatus === "error" ? XCircle : Key}
          variant={connectionStatus === "success" ? "success" : connectionStatus === "error" ? "danger" : "warning"}
        />
        <EnhancedMetricCard
          title="Automatizaciones"
          value={automatizacionesActivas}
          subtitle="Controles operativos activos"
          icon={RefreshCw}
        />
      </MetricGrid>

      <div className="hero-panel rounded-[2rem] p-6">
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.35fr)_340px]">
          <div className="rounded-3xl border border-slate-200 bg-white/90 p-5 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
              Gobierno del sistema
            </p>
            <h3 className="mt-2 text-lg font-semibold text-slate-950">
              Parametros fiscales, seguridad y operacion en un solo frente
            </h3>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              La configuracion critica ya vive en Supabase. Esto reduce perdida de parametros,
              mejora continuidad operativa y fortalece la trazabilidad para auditoria.
            </p>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-slate-950 p-5 text-slate-50 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">
              Prioridad sugerida
            </p>
            <div className="mt-4 space-y-3">
              <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
                <p className="text-sm font-semibold">Primero empresa y fiscal</p>
                <p className="mt-1 text-xs leading-5 text-slate-300">
                  Completa razon social, NIT y regimen antes de abrir flujos tributarios avanzados.
                </p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
                <p className="text-sm font-semibold">Despues integracion y seguridad</p>
                <p className="mt-1 text-xs leading-5 text-slate-300">
                  Valida credenciales SIN, automatizaciones y politicas internas de uso del sistema.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <Tabs defaultValue="empresa" className="w-full">
        <TabsList className="grid w-full grid-cols-1 gap-2 rounded-2xl border border-slate-200 bg-white p-2 md:grid-cols-5">
          <TabsTrigger value="empresa">Empresa</TabsTrigger>
          <TabsTrigger value="fiscal">Fiscal</TabsTrigger>
          <TabsTrigger value="sin">SIN</TabsTrigger>
          <TabsTrigger value="sistema">Sistema</TabsTrigger>
          <TabsTrigger value="usuarios">Usuarios</TabsTrigger>
        </TabsList>

        <TabsContent value="empresa" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Datos de la Empresa
              </CardTitle>
              <CardDescription>
                Base legal y operativa usada en configuracion tributaria y documentos
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="razonSocial">Razon social</Label>
                  <Input
                    id="razonSocial"
                    value={empresa.razonSocial}
                    onChange={(event) => setEmpresa({ ...empresa, razonSocial: event.target.value })}
                    disabled={uiBlocked}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="nit">NIT</Label>
                  <Input
                    id="nit"
                    value={empresa.nit}
                    onChange={(event) => setEmpresa({ ...empresa, nit: event.target.value })}
                    disabled={uiBlocked}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="telefono">Telefono</Label>
                  <Input
                    id="telefono"
                    value={empresa.telefono}
                    onChange={(event) => setEmpresa({ ...empresa, telefono: event.target.value })}
                    disabled={uiBlocked}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={empresa.email}
                    onChange={(event) => setEmpresa({ ...empresa, email: event.target.value })}
                    disabled={uiBlocked}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="direccion">Direccion</Label>
                <Textarea
                  id="direccion"
                  value={empresa.direccion}
                  onChange={(event) => setEmpresa({ ...empresa, direccion: event.target.value })}
                  disabled={uiBlocked}
                />
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="actividad">Actividad economica</Label>
                  <Input
                    id="actividad"
                    value={empresa.actividadEconomica}
                    onChange={(event) =>
                      setEmpresa({ ...empresa, actividadEconomica: event.target.value })
                    }
                    disabled={uiBlocked}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="codigoSin">Codigo de actividad / SIN</Label>
                  <Input
                    id="codigoSin"
                    value={empresa.codigoSin}
                    onChange={(event) => setEmpresa({ ...empresa, codigoSin: event.target.value })}
                    disabled={uiBlocked}
                  />
                </div>
              </div>

              <Button onClick={() => void handleGuardarEmpresaFiscal()} className="w-full" disabled={uiBlocked}>
                <Save className="mr-2 h-4 w-4" />
                {savingSection === "empresa" ? "Guardando..." : "Guardar empresa y base tributaria"}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="fiscal" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Configuracion Fiscal</CardTitle>
              <CardDescription>
                Parametros bolivianos base del sistema y operacion del entorno fiscal
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="ivaGeneral">IVA general (%)</Label>
                  <Input
                    id="ivaGeneral"
                    type="number"
                    value={configFiscal.ivaGeneral}
                    onChange={(event) =>
                      setConfigFiscal({
                        ...configFiscal,
                        ivaGeneral: parseFloat(event.target.value) || 0,
                      })
                    }
                    disabled={uiBlocked}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Regimen tributario</Label>
                  <Select
                    value={configFiscal.regimen}
                    onValueChange={(value) => setConfigFiscal({ ...configFiscal, regimen: value })}
                    disabled={uiBlocked}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="general">Regimen General</SelectItem>
                      <SelectItem value="simplificado">Regimen Simplificado</SelectItem>
                      <SelectItem value="integrado">Regimen Integrado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Modalidad de facturacion</Label>
                  <Select
                    value={configFiscal.modalidadFacturacion}
                    onValueChange={(value) =>
                      setConfigFiscal({ ...configFiscal, modalidadFacturacion: value })
                    }
                    disabled={uiBlocked}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="computarizada">Computarizada</SelectItem>
                      <SelectItem value="preimpresa">Preimpresa</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Ambiente SIN</Label>
                  <Select
                    value={configFiscal.ambienteSin}
                    onValueChange={(value) =>
                      setConfigFiscal({ ...configFiscal, ambienteSin: value })
                    }
                    disabled={uiBlocked}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="test">Pruebas</SelectItem>
                      <SelectItem value="production">Produccion</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="sucursal">Sucursal</Label>
                  <Input
                    id="sucursal"
                    value={configFiscal.sucursal}
                    onChange={(event) =>
                      setConfigFiscal({ ...configFiscal, sucursal: event.target.value })
                    }
                    disabled={uiBlocked}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="puntoVenta">Punto de venta</Label>
                  <Input
                    id="puntoVenta"
                    value={configFiscal.puntoVenta}
                    onChange={(event) =>
                      setConfigFiscal({ ...configFiscal, puntoVenta: event.target.value })
                    }
                    disabled={uiBlocked}
                  />
                </div>
              </div>

              <Button onClick={() => void handleGuardarEmpresaFiscal()} className="w-full" disabled={uiBlocked}>
                <Save className="mr-2 h-4 w-4" />
                {savingSection === "empresa" ? "Guardando..." : "Guardar configuracion fiscal"}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="sin" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Key className="h-5 w-5" />
                Integracion SIN
              </CardTitle>
              <CardDescription>
                Parametros operativos y credenciales de trabajo para entorno de pruebas o produccion
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="urlApi">URL API SIN</Label>
                  <Input
                    id="urlApi"
                    value={configSin.urlApi}
                    onChange={(event) => setConfigSin({ ...configSin, urlApi: event.target.value })}
                    disabled={uiBlocked}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Tipo de ambiente</Label>
                  <Select
                    value={configSin.tipoAmbiente}
                    onValueChange={(value) => setConfigSin({ ...configSin, tipoAmbiente: value })}
                    disabled={uiBlocked}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="2">Pruebas</SelectItem>
                      <SelectItem value="1">Produccion</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="tokenDelegado">Token delegado</Label>
                  <Input
                    id="tokenDelegado"
                    type="password"
                    value={configSin.tokenDelegado}
                    onChange={(event) =>
                      setConfigSin({ ...configSin, tokenDelegado: event.target.value })
                    }
                    disabled={uiBlocked}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="codigoSistema">Codigo de sistema</Label>
                  <Input
                    id="codigoSistema"
                    value={configSin.codigoSistema}
                    onChange={(event) =>
                      setConfigSin({ ...configSin, codigoSistema: event.target.value })
                    }
                    disabled={uiBlocked}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="nitSin">NIT empresa</Label>
                  <Input
                    id="nitSin"
                    value={configSin.nit}
                    onChange={(event) => setConfigSin({ ...configSin, nit: event.target.value })}
                    disabled={uiBlocked}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Codigo modalidad</Label>
                  <Select
                    value={configSin.codigoModalidad}
                    onValueChange={(value) =>
                      setConfigSin({ ...configSin, codigoModalidad: value })
                    }
                    disabled={uiBlocked}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">Electronica en linea</SelectItem>
                      <SelectItem value="2">Computarizada en linea</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="codigoSucursal">Codigo sucursal</Label>
                  <Input
                    id="codigoSucursal"
                    value={configSin.codigoSucursal}
                    onChange={(event) =>
                      setConfigSin({ ...configSin, codigoSucursal: event.target.value })
                    }
                    disabled={uiBlocked}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="codigoPuntoVenta">Codigo punto de venta</Label>
                  <Input
                    id="codigoPuntoVenta"
                    value={configSin.codigoPuntoVenta}
                    onChange={(event) =>
                      setConfigSin({ ...configSin, codigoPuntoVenta: event.target.value })
                    }
                    disabled={uiBlocked}
                  />
                </div>
              </div>

              <div className="flex items-center justify-between rounded-lg border p-4">
                <div className="space-y-1">
                  <div className="font-medium">Prueba de conexion</div>
                  <div className="text-sm text-slate-600">
                    Validacion operativa simulada para no exponer llamadas reales al SIN.
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {connectionStatus === "success" && <CheckCircle className="h-5 w-5 text-green-500" />}
                  {connectionStatus === "error" && <XCircle className="h-5 w-5 text-red-500" />}
                  <Button onClick={testearConexionSin} disabled={uiBlocked} variant="outline">
                    <TestTube className="mr-2 h-4 w-4" />
                    {testingConnection ? "Probando..." : "Probar conexion"}
                  </Button>
                </div>
              </div>

              <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                Este bloque guarda la configuracion operativa del SIN, pero la emision y validacion oficial siguen
                en modo simulado dentro del sistema. Si falta un dato obligatorio, el guardado se bloqueara para
                evitar credenciales inconsistentes.
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="cuis">CUIS</Label>
                  <div className="flex gap-2">
                    <Input id="cuis" value={configSin.cuis} readOnly placeholder="No generado" disabled={uiBlocked} />
                    <Button onClick={obtenerCuis} variant="outline" disabled={uiBlocked}>
                      {generatingCuis ? "Obteniendo..." : "Obtener"}
                    </Button>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cufd">CUFD</Label>
                  <div className="flex gap-2">
                    <Input id="cufd" value={configSin.cufd} readOnly placeholder="No generado" disabled={uiBlocked} />
                    <Button onClick={obtenerCufd} variant="outline" disabled={uiBlocked || !configSin.cuis}>
                      {generatingCufd ? "Obteniendo..." : "Obtener"}
                    </Button>
                  </div>
                </div>
              </div>

              {configSin.fechaVigenciaCufd && (
                <div className="text-sm text-slate-600">
                  <strong>Vigencia CUFD:</strong>{" "}
                  {new Date(configSin.fechaVigenciaCufd).toLocaleDateString("es-BO")}
                </div>
              )}

              <div className="flex items-center justify-between rounded-lg border p-4">
                <div className="space-y-1">
                  <div className="font-medium">Estado de integracion SIN</div>
                  <div className="text-sm text-slate-600">
                    {configSin.activo
                      ? "Integracion habilitada para uso interno"
                      : "Integracion desactivada"}
                  </div>
                </div>
                <Switch
                  checked={configSin.activo}
                  onCheckedChange={(checked) => setConfigSin({ ...configSin, activo: checked })}
                  disabled={uiBlocked}
                />
              </div>

              <Button onClick={() => void handleGuardarSin()} className="w-full" disabled={uiBlocked}>
                <Save className="mr-2 h-4 w-4" />
                {savingSection === "sin" ? "Guardando..." : "Guardar configuracion SIN"}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="sistema" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Configuracion del Sistema
              </CardTitle>
              <CardDescription>Preferencias operativas y controles funcionales</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Moneda base</Label>
                  <Select
                    value={configSistema.monedaBase}
                    onValueChange={(value) => setConfigSistema({ ...configSistema, monedaBase: value })}
                    disabled={uiBlocked}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="BOB">Boliviano (BOB)</SelectItem>
                      <SelectItem value="USD">Dolar Americano (USD)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Formato de fecha</Label>
                  <Select
                    value={configSistema.formatoFecha}
                    onValueChange={(value) =>
                      setConfigSistema({ ...configSistema, formatoFecha: value })
                    }
                    disabled={uiBlocked}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="dd/mm/yyyy">DD/MM/YYYY</SelectItem>
                      <SelectItem value="mm/dd/yyyy">MM/DD/YYYY</SelectItem>
                      <SelectItem value="yyyy-mm-dd">YYYY-MM-DD</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="decimales">Decimales en montos</Label>
                  <Input
                    id="decimales"
                    type="number"
                    min="0"
                    max="4"
                    value={configSistema.decimalesMontos}
                    onChange={(event) =>
                      setConfigSistema({
                        ...configSistema,
                        decimalesMontos: parseInt(event.target.value, 10) || 0,
                      })
                    }
                    disabled={uiBlocked}
                  />
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Numeracion automatica</Label>
                    <p className="text-sm text-slate-500">
                      Generar numeros de documento automaticamente
                    </p>
                  </div>
                  <Switch
                    checked={configSistema.numeracionAutomatica}
                    onCheckedChange={(checked) =>
                      setConfigSistema({ ...configSistema, numeracionAutomatica: checked })
                    }
                    disabled={uiBlocked}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Backup automatico</Label>
                    <p className="text-sm text-slate-500">Sugerencia operativa de respaldo periodico</p>
                  </div>
                  <Switch
                    checked={configSistema.backupAutomatico}
                    onCheckedChange={(checked) =>
                      setConfigSistema({ ...configSistema, backupAutomatico: checked })
                    }
                    disabled={uiBlocked}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Notificaciones por email</Label>
                    <p className="text-sm text-slate-500">Enviar avisos relevantes por correo</p>
                  </div>
                  <Switch
                    checked={configSistema.notificacionesEmail}
                    onCheckedChange={(checked) =>
                      setConfigSistema({ ...configSistema, notificacionesEmail: checked })
                    }
                    disabled={uiBlocked}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Punto de venta (POS)</Label>
                    <p className="text-sm text-slate-500">Habilitar modulo de punto de venta</p>
                  </div>
                  <Switch
                    checked={configSistema.posHabilitado}
                    onCheckedChange={(checked) =>
                      setConfigSistema({ ...configSistema, posHabilitado: checked })
                    }
                    disabled={uiBlocked}
                  />
                </div>

                {configSistema.posHabilitado && (
                  <>
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>Autoimpresion POS</Label>
                        <p className="text-sm text-slate-500">Imprimir automaticamente al vender</p>
                      </div>
                      <Switch
                        checked={configSistema.posAutoimpresion}
                        onCheckedChange={(checked) =>
                          setConfigSistema({ ...configSistema, posAutoimpresion: checked })
                        }
                        disabled={uiBlocked}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>Autorizacion requerida</Label>
                        <p className="text-sm text-slate-500">
                          Solicitar autorizacion en descuentos especiales
                        </p>
                      </div>
                      <Switch
                        checked={configSistema.posRequiereAutorizacion}
                        onCheckedChange={(checked) =>
                          setConfigSistema({
                            ...configSistema,
                            posRequiereAutorizacion: checked,
                          })
                        }
                        disabled={uiBlocked}
                      />
                    </div>
                  </>
                )}
              </div>

              <Button onClick={() => void handleGuardarSistema()} className="w-full" disabled={uiBlocked}>
                <Save className="mr-2 h-4 w-4" />
                {savingSection === "sistema" ? "Guardando..." : "Guardar configuracion del sistema"}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="usuarios" className="space-y-4">
          <UserProductionManager />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ConfiguracionModule;
