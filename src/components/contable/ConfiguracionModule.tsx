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
    const nuevoCuis = `CUIS${Date.now()}`;
    setConfigSin((prev) => ({ ...prev, cuis: nuevoCuis }));
    toast({
      title: "CUIS simulado generado",
      description: `Se asigno ${nuevoCuis} para pruebas internas.`,
    });
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
  };

  const handleImportarClick = () => {
    fileInputRef.current?.click();
  };

  const handleImportFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

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
      if (event.target) {
        event.target.value = "";
      }
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold">Configuracion del Sistema</h2>
          <p className="text-slate-600">Cargando parametros centralizados...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <input
        ref={fileInputRef}
        type="file"
        accept="application/json"
        className="hidden"
        onChange={handleImportFile}
      />

      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Configuracion del Sistema</h2>
          <p className="text-slate-600">
            Parametros tributarios y operativos con persistencia centralizada
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={handleImportarClick} variant="outline">
            <Upload className="mr-2 h-4 w-4" />
            Importar
          </Button>
          <Button onClick={exportarConfiguracion} variant="outline">
            <Download className="mr-2 h-4 w-4" />
            Exportar
          </Button>
          <Button onClick={refetch} variant="outline">
            <RefreshCw className="mr-2 h-4 w-4" />
            Recargar
          </Button>
        </div>
      </div>

      <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900">
        La configuracion tributaria critica ya se guarda en Supabase. Esto reduce el riesgo de perder
        parametros fiscales y mejora consistencia para auditoria y cumplimiento.
      </div>

      <Tabs defaultValue="empresa" className="w-full">
        <TabsList className="grid w-full grid-cols-5">
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
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="nit">NIT</Label>
                  <Input
                    id="nit"
                    value={empresa.nit}
                    onChange={(event) => setEmpresa({ ...empresa, nit: event.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="telefono">Telefono</Label>
                  <Input
                    id="telefono"
                    value={empresa.telefono}
                    onChange={(event) => setEmpresa({ ...empresa, telefono: event.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={empresa.email}
                    onChange={(event) => setEmpresa({ ...empresa, email: event.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="direccion">Direccion</Label>
                <Textarea
                  id="direccion"
                  value={empresa.direccion}
                  onChange={(event) => setEmpresa({ ...empresa, direccion: event.target.value })}
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
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="codigoSin">Codigo de actividad / SIN</Label>
                  <Input
                    id="codigoSin"
                    value={empresa.codigoSin}
                    onChange={(event) => setEmpresa({ ...empresa, codigoSin: event.target.value })}
                  />
                </div>
              </div>

              <Button onClick={guardarEmpresaFiscal} className="w-full">
                <Save className="mr-2 h-4 w-4" />
                Guardar empresa y base tributaria
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
                  />
                </div>
                <div className="space-y-2">
                  <Label>Regimen tributario</Label>
                  <Select
                    value={configFiscal.regimen}
                    onValueChange={(value) => setConfigFiscal({ ...configFiscal, regimen: value })}
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
                  />
                </div>
              </div>

              <Button onClick={guardarEmpresaFiscal} className="w-full">
                <Save className="mr-2 h-4 w-4" />
                Guardar configuracion fiscal
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
                  />
                </div>
                <div className="space-y-2">
                  <Label>Tipo de ambiente</Label>
                  <Select
                    value={configSin.tipoAmbiente}
                    onValueChange={(value) => setConfigSin({ ...configSin, tipoAmbiente: value })}
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
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="nitSin">NIT empresa</Label>
                  <Input
                    id="nitSin"
                    value={configSin.nit}
                    onChange={(event) => setConfigSin({ ...configSin, nit: event.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Codigo modalidad</Label>
                  <Select
                    value={configSin.codigoModalidad}
                    onValueChange={(value) =>
                      setConfigSin({ ...configSin, codigoModalidad: value })
                    }
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
                  <Button onClick={testearConexionSin} disabled={testingConnection} variant="outline">
                    <TestTube className="mr-2 h-4 w-4" />
                    {testingConnection ? "Probando..." : "Probar conexion"}
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="cuis">CUIS</Label>
                  <div className="flex gap-2">
                    <Input id="cuis" value={configSin.cuis} readOnly placeholder="No generado" />
                    <Button onClick={obtenerCuis} variant="outline">
                      Obtener
                    </Button>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cufd">CUFD</Label>
                  <div className="flex gap-2">
                    <Input id="cufd" value={configSin.cufd} readOnly placeholder="No generado" />
                    <Button onClick={obtenerCufd} variant="outline" disabled={!configSin.cuis}>
                      Obtener
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
                />
              </div>

              <Button onClick={guardarSin} className="w-full">
                <Save className="mr-2 h-4 w-4" />
                Guardar configuracion SIN
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
                      />
                    </div>
                  </>
                )}
              </div>

              <Button onClick={guardarSistema} className="w-full">
                <Save className="mr-2 h-4 w-4" />
                Guardar configuracion del sistema
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
