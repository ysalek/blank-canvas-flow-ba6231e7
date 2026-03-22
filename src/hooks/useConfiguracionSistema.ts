import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "./use-toast";

export interface EmpresaConfig {
  razonSocial: string;
  nit: string;
  telefono: string;
  email: string;
  direccion: string;
  actividadEconomica: string;
  codigoSin: string;
}

export interface FiscalConfig {
  ivaGeneral: number;
  regimen: string;
  modalidadFacturacion: string;
  ambienteSin: string;
  sucursal: string;
  puntoVenta: string;
}

export interface SistemaConfig {
  monedaBase: string;
  formatoFecha: string;
  decimalesMontos: number;
  numeracionAutomatica: boolean;
  backupAutomatico: boolean;
  notificacionesEmail: boolean;
  posHabilitado: boolean;
  posAutoimpresion: boolean;
  posRequiereAutorizacion: boolean;
}

export interface SinConfig {
  urlApi: string;
  tokenDelegado: string;
  codigoSistema: string;
  nit: string;
  codigoModalidad: string;
  codigoEmision: string;
  tipoFacturaDocumento: string;
  tipoAmbiente: string;
  codigoSucursal: string;
  codigoPuntoVenta: string;
  cuis: string;
  cufd: string;
  fechaVigenciaCufd: string;
  activo: boolean;
}

interface ConfiguracionExportable {
  empresa: EmpresaConfig;
  fiscal: FiscalConfig;
  sistema: SistemaConfig;
  sin: SinConfig;
}

const DEFAULT_EMPRESA: EmpresaConfig = {
  razonSocial: "Empresa Demo S.R.L.",
  nit: "1234567890",
  telefono: "+591 2 2345678",
  email: "contacto@empresa.com",
  direccion: "Av. Principal #123, La Paz, Bolivia",
  actividadEconomica: "Servicios de consultoria",
  codigoSin: "001234567",
};

const DEFAULT_FISCAL: FiscalConfig = {
  ivaGeneral: 13,
  regimen: "general",
  modalidadFacturacion: "computarizada",
  ambienteSin: "test",
  sucursal: "0",
  puntoVenta: "0",
};

const DEFAULT_SISTEMA: SistemaConfig = {
  monedaBase: "BOB",
  formatoFecha: "dd/mm/yyyy",
  decimalesMontos: 2,
  numeracionAutomatica: true,
  backupAutomatico: true,
  notificacionesEmail: true,
  posHabilitado: true,
  posAutoimpresion: false,
  posRequiereAutorizacion: false,
};

const DEFAULT_SIN = (nit: string): SinConfig => ({
  urlApi: "https://pilotosiatservicios.impuestos.gob.bo",
  tokenDelegado: "",
  codigoSistema: "",
  nit,
  codigoModalidad: "1",
  codigoEmision: "1",
  tipoFacturaDocumento: "1",
  tipoAmbiente: "2",
  codigoSucursal: "0",
  codigoPuntoVenta: "0",
  cuis: "",
  cufd: "",
  fechaVigenciaCufd: "",
  activo: false,
});

const SYSTEM_KEY = "configuracion_sistema";
const FISCAL_KEY = "configuracion_fiscal_operativa";
const SIN_KEY = "configuracion_sin";

const safeParse = <T>(value: string | null, fallback: T): T => {
  if (!value) return fallback;
  try {
    return { ...fallback, ...JSON.parse(value) };
  } catch {
    return fallback;
  }
};

export const useConfiguracionSistema = () => {
  const { toast } = useToast();
  const [empresa, setEmpresa] = useState<EmpresaConfig>(DEFAULT_EMPRESA);
  const [configFiscal, setConfigFiscal] = useState<FiscalConfig>(DEFAULT_FISCAL);
  const [configSistema, setConfigSistema] = useState<SistemaConfig>(DEFAULT_SISTEMA);
  const [configSin, setConfigSin] = useState<SinConfig>(DEFAULT_SIN(DEFAULT_EMPRESA.nit));
  const [loading, setLoading] = useState(true);

  const upsertAppSetting = useCallback(async (key: string, value: unknown) => {
    const { error } = await supabase.from("app_settings").upsert(
      {
        key,
        value: JSON.stringify(value),
      },
      { onConflict: "key" }
    );

    if (error) throw error;
  }, []);

  const migrarDesdeLocalStorage = useCallback(async () => {
    const empresaLocal = safeParse(localStorage.getItem("configuracionEmpresa"), DEFAULT_EMPRESA);
    const fiscalLocal = safeParse(localStorage.getItem("configuracionFiscal"), DEFAULT_FISCAL);
    const sistemaLocal = safeParse(localStorage.getItem("configuracionSistema"), DEFAULT_SISTEMA);
    const sinLocal = safeParse(localStorage.getItem("configSin"), DEFAULT_SIN(empresaLocal.nit));

    await supabase.from("configuracion_tributaria").upsert({
      razon_social: empresaLocal.razonSocial,
      nit_empresa: empresaLocal.nit,
      actividad_economica: empresaLocal.actividadEconomica,
      codigo_actividad: empresaLocal.codigoSin || DEFAULT_EMPRESA.codigoSin,
      iva_tasa: fiscalLocal.ivaGeneral || DEFAULT_FISCAL.ivaGeneral,
      it_tasa: 3,
      iue_tasa: 25,
      rc_iva_tasa: 13,
      rc_it_tasa: 13,
      regimen_tributario: fiscalLocal.regimen || DEFAULT_FISCAL.regimen,
      tipo_cambio_usd: 6.96,
      ufv_actual: 2.5,
    });

    await Promise.all([
      upsertAppSetting(FISCAL_KEY, fiscalLocal),
      upsertAppSetting(SYSTEM_KEY, sistemaLocal),
      upsertAppSetting(SIN_KEY, sinLocal),
    ]);

    return {
      empresa: empresaLocal,
      fiscal: fiscalLocal,
      sistema: sistemaLocal,
      sin: sinLocal,
    };
  }, [upsertAppSetting]);

  const cargarConfiguracion = useCallback(async () => {
    setLoading(true);
    try {
      const [tributariaResult, fiscalResult, sistemaResult, sinResult] = await Promise.all([
        supabase.from("configuracion_tributaria").select("*").limit(1).maybeSingle(),
        supabase.from("app_settings").select("key, value").eq("key", FISCAL_KEY).maybeSingle(),
        supabase.from("app_settings").select("key, value").eq("key", SYSTEM_KEY).maybeSingle(),
        supabase.from("app_settings").select("key, value").eq("key", SIN_KEY).maybeSingle(),
      ]);

      if (tributariaResult.error) throw tributariaResult.error;
      if (fiscalResult.error) throw fiscalResult.error;
      if (sistemaResult.error) throw sistemaResult.error;
      if (sinResult.error) throw sinResult.error;

      if (!tributariaResult.data && !fiscalResult.data && !sistemaResult.data && !sinResult.data) {
        const migrada = await migrarDesdeLocalStorage();
        setEmpresa(migrada.empresa);
        setConfigFiscal(migrada.fiscal);
        setConfigSistema(migrada.sistema);
        setConfigSin({ ...migrada.sin, nit: migrada.sin.nit || migrada.empresa.nit });
        return;
      }

      const empresaData: EmpresaConfig = tributariaResult.data
        ? {
            razonSocial: tributariaResult.data.razon_social,
            nit: tributariaResult.data.nit_empresa,
            telefono: DEFAULT_EMPRESA.telefono,
            email: DEFAULT_EMPRESA.email,
            direccion: DEFAULT_EMPRESA.direccion,
            actividadEconomica: tributariaResult.data.actividad_economica,
            codigoSin: tributariaResult.data.codigo_actividad,
          }
        : DEFAULT_EMPRESA;

      const fiscalOperativa = safeParse<FiscalConfig>(fiscalResult.data?.value || null, DEFAULT_FISCAL);
      const fiscalData: FiscalConfig = tributariaResult.data
        ? {
            ...fiscalOperativa,
            ivaGeneral: Number(tributariaResult.data.iva_tasa || fiscalOperativa.ivaGeneral),
            regimen: tributariaResult.data.regimen_tributario || fiscalOperativa.regimen,
          }
        : fiscalOperativa;

      const sistemaData = safeParse<SistemaConfig>(sistemaResult.data?.value || null, DEFAULT_SISTEMA);
      const sinData = safeParse<SinConfig>(sinResult.data?.value || null, DEFAULT_SIN(empresaData.nit));

      setEmpresa(empresaData);
      setConfigFiscal(fiscalData);
      setConfigSistema(sistemaData);
      setConfigSin({
        ...DEFAULT_SIN(empresaData.nit),
        ...sinData,
        nit: sinData.nit || empresaData.nit,
      });
    } catch (error) {
      console.error("Error cargando configuracion del sistema:", error);
      toast({
        title: "Error al cargar configuracion",
        description: "No se pudo leer la configuracion centralizada del sistema.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [migrarDesdeLocalStorage, toast]);

  useEffect(() => {
    void cargarConfiguracion();
  }, [cargarConfiguracion]);

  const guardarEmpresaFiscal = useCallback(async () => {
    try {
      const payload = {
        razon_social: empresa.razonSocial,
        nit_empresa: empresa.nit,
        actividad_economica: empresa.actividadEconomica,
        codigo_actividad: empresa.codigoSin,
        iva_tasa: configFiscal.ivaGeneral,
        it_tasa: 3,
        iue_tasa: 25,
        rc_iva_tasa: 13,
        rc_it_tasa: 13,
        regimen_tributario: configFiscal.regimen,
        tipo_cambio_usd: 6.96,
        ufv_actual: 2.5,
      };

      const { error } = await supabase.from("configuracion_tributaria").upsert(payload);
      if (error) throw error;

      const sinActualizado = { ...configSin, nit: empresa.nit };
      await Promise.all([
        upsertAppSetting(FISCAL_KEY, configFiscal),
        upsertAppSetting(SIN_KEY, sinActualizado),
      ]);
      setConfigSin(sinActualizado);

      toast({
        title: "Configuracion tributaria guardada",
        description: "La empresa y los parametros fiscales quedaron centralizados en Supabase.",
      });

      return true;
    } catch (error) {
      console.error("Error guardando configuracion tributaria:", error);
      toast({
        title: "Error al guardar configuracion tributaria",
        description: "No se pudo persistir la configuracion fiscal de la empresa.",
        variant: "destructive",
      });
      return false;
    }
  }, [configFiscal, configSin, empresa, toast, upsertAppSetting]);

  const guardarSistema = useCallback(async () => {
    try {
      await upsertAppSetting(SYSTEM_KEY, configSistema);
      toast({
        title: "Configuracion del sistema guardada",
        description: "Las preferencias operativas quedaron persistidas.",
      });
      return true;
    } catch (error) {
      console.error("Error guardando configuracion del sistema:", error);
      toast({
        title: "Error al guardar configuracion del sistema",
        description: "No se pudieron guardar las preferencias del sistema.",
        variant: "destructive",
      });
      return false;
    }
  }, [configSistema, toast, upsertAppSetting]);

  const guardarSin = useCallback(async () => {
    try {
      await upsertAppSetting(SIN_KEY, { ...configSin, nit: empresa.nit });
      toast({
        title: "Configuracion SIN guardada",
        description: "Las credenciales y parametros operativos del SIN fueron persistidos.",
      });
      return true;
    } catch (error) {
      console.error("Error guardando configuracion SIN:", error);
      toast({
        title: "Error al guardar configuracion SIN",
        description: "No se pudo guardar la configuracion de integracion con el SIN.",
        variant: "destructive",
      });
      return false;
    }
  }, [configSin, empresa.nit, toast, upsertAppSetting]);

  const exportarConfiguracion = useCallback(() => {
    const payload: ConfiguracionExportable = {
      empresa,
      fiscal: configFiscal,
      sistema: configSistema,
      sin: { ...configSin, nit: empresa.nit },
    };

    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `configuracion_contable_${new Date().toISOString().slice(0, 10)}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  }, [configFiscal, configSin, configSistema, empresa]);

  const importarConfiguracion = useCallback(
    async (payload: Partial<ConfiguracionExportable>) => {
      const empresaNueva = { ...DEFAULT_EMPRESA, ...payload.empresa };
      const fiscalNuevo = { ...DEFAULT_FISCAL, ...payload.fiscal };
      const sistemaNuevo = { ...DEFAULT_SISTEMA, ...payload.sistema };
      const sinNuevo = {
        ...DEFAULT_SIN(empresaNueva.nit),
        ...payload.sin,
        nit: payload.sin?.nit || empresaNueva.nit,
      };

      setEmpresa(empresaNueva);
      setConfigFiscal(fiscalNuevo);
      setConfigSistema(sistemaNuevo);
      setConfigSin(sinNuevo);

      try {
        const { error } = await supabase.from("configuracion_tributaria").upsert({
          razon_social: empresaNueva.razonSocial,
          nit_empresa: empresaNueva.nit,
          actividad_economica: empresaNueva.actividadEconomica,
          codigo_actividad: empresaNueva.codigoSin,
          iva_tasa: fiscalNuevo.ivaGeneral,
          it_tasa: 3,
          iue_tasa: 25,
          rc_iva_tasa: 13,
          rc_it_tasa: 13,
          regimen_tributario: fiscalNuevo.regimen,
          tipo_cambio_usd: 6.96,
          ufv_actual: 2.5,
        });
        if (error) throw error;

        await Promise.all([
          upsertAppSetting(FISCAL_KEY, fiscalNuevo),
          upsertAppSetting(SYSTEM_KEY, sistemaNuevo),
          upsertAppSetting(SIN_KEY, sinNuevo),
        ]);

        toast({
          title: "Configuracion importada",
          description: "La configuracion fue importada y persistida en Supabase.",
        });

        return true;
      } catch (error) {
        console.error("Error importando configuracion:", error);
        toast({
          title: "Error al importar configuracion",
          description: "No se pudo persistir la configuracion importada.",
          variant: "destructive",
        });
        return false;
      }
    },
    [toast, upsertAppSetting]
  );

  return {
    empresa,
    setEmpresa,
    configFiscal,
    setConfigFiscal,
    configSistema,
    setConfigSistema,
    configSin,
    setConfigSin,
    loading,
    refetch: cargarConfiguracion,
    guardarEmpresaFiscal,
    guardarSistema,
    guardarSin,
    exportarConfiguracion,
    importarConfiguracion,
  };
};
