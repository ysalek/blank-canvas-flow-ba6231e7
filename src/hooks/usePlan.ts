import { useState, useEffect, createContext, useContext } from 'react';

export type PlanType = 'basic' | 'pro';

export interface PlanFeatures {
  maxTransactionsPerMonth: number;
  maxUsers: number;
  modules: string[];
}

const PLAN_FEATURES: Record<PlanType, PlanFeatures> = {
  basic: {
    maxTransactionsPerMonth: 100,
    maxUsers: 1,
    modules: [
      'dashboard',
      'plan-cuentas',
      'diario',
      'mayor',
      'balance-comprobacion',
      'comprobantes-integrados',
      'facturacion',
      'productos',
      'inventario',
      'clientes',
      'configuracion',
      'tutorial',
    ],
  },
  pro: {
    maxTransactionsPerMonth: Infinity,
    maxUsers: 5,
    modules: [
      // All basic modules
      'dashboard',
      'plan-cuentas',
      'diario',
      'mayor',
      'balance-comprobacion',
      'comprobantes-integrados',
      'facturacion',
      'productos',
      'inventario',
      'clientes',
      'configuracion',
      'tutorial',
      // Pro modules
      'balance-general',
      'estado-resultados',
      'punto-venta',
      'credit-sales',
      'compras',
      'kardex',
      'activos-fijos',
      'bancos',
      'flujo-caja',
      'cuentas-cobrar-pagar',
      'declaraciones-tributarias',
      'cumplimiento-normativo',
      'auditoria-avanzada',
      'plan-cuentas-2025',
      'nomina',
      'empleados',
      'reportes',
      'analisis-financiero',
      'analisis-inteligente',
      'rentabilidad',
      'presupuestos',
      'centros-costo',
      'facturacion-electronica',
      'retenciones',
      'backup',
      'usuarios',
    ],
  },
};

export const PLAN_PRICES = {
  basic: { monthly: 0, label: 'Gratuito' },
  pro: { monthly: 29, label: '$29/mes' },
};

export const usePlan = () => {
  const [currentPlan, setCurrentPlan] = useState<PlanType>(() => {
    return (localStorage.getItem('user_plan') as PlanType) || 'basic';
  });

  useEffect(() => {
    localStorage.setItem('user_plan', currentPlan);
  }, [currentPlan]);

  const features = PLAN_FEATURES[currentPlan];

  const hasAccess = (moduleId: string): boolean => {
    return features.modules.includes(moduleId);
  };

  const isProFeature = (moduleId: string): boolean => {
    return !PLAN_FEATURES.basic.modules.includes(moduleId);
  };

  const upgradeToPro = () => {
    // TODO: Integrate with Stripe
    setCurrentPlan('pro');
  };

  const transactionCount = (): number => {
    const key = `txn_count_${new Date().toISOString().slice(0, 7)}`;
    return parseInt(localStorage.getItem(key) || '0', 10);
  };

  const canCreateTransaction = (): boolean => {
    if (currentPlan === 'pro') return true;
    return transactionCount() < features.maxTransactionsPerMonth;
  };

  const incrementTransactionCount = () => {
    const key = `txn_count_${new Date().toISOString().slice(0, 7)}`;
    const current = parseInt(localStorage.getItem(key) || '0', 10);
    localStorage.setItem(key, String(current + 1));
  };

  return {
    currentPlan,
    setCurrentPlan,
    features,
    hasAccess,
    isProFeature,
    upgradeToPro,
    canCreateTransaction,
    incrementTransactionCount,
    transactionCount,
    prices: PLAN_PRICES,
  };
};
