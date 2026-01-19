-- Agregar cuentas contables faltantes según normativa boliviana 2025-2026
-- Estas cuentas son necesarias para el correcto registro del IT y otras operaciones tributarias

-- Cuenta IT por Pagar (pasivo tributario)
INSERT INTO plan_cuentas (codigo, nombre, tipo, naturaleza, nivel, activa, user_id)
SELECT '2114', 'IT por Pagar', 'pasivo', 'acreedora', 4, true, id
FROM auth.users
WHERE NOT EXISTS (SELECT 1 FROM plan_cuentas WHERE codigo = '2114')
LIMIT 1;

-- Cuenta IT Pagado (gasto tributario)
INSERT INTO plan_cuentas (codigo, nombre, tipo, naturaleza, nivel, activa, user_id)
SELECT '5401', 'IT Pagado', 'gastos', 'deudora', 4, true, id
FROM auth.users
WHERE NOT EXISTS (SELECT 1 FROM plan_cuentas WHERE codigo = '5401')
LIMIT 1;

-- Cuenta Pérdidas y Faltantes de Inventario
INSERT INTO plan_cuentas (codigo, nombre, tipo, naturaleza, nivel, activa, user_id)
SELECT '5322', 'Pérdidas y Faltantes de Inventario', 'gastos', 'deudora', 4, true, id
FROM auth.users
WHERE NOT EXISTS (SELECT 1 FROM plan_cuentas WHERE codigo = '5322')
LIMIT 1;

-- Cuenta Otros Ingresos (para ajustes de inventario)
INSERT INTO plan_cuentas (codigo, nombre, tipo, naturaleza, nivel, activa, user_id)
SELECT '4211', 'Otros Ingresos', 'ingresos', 'acreedora', 4, true, id
FROM auth.users
WHERE NOT EXISTS (SELECT 1 FROM plan_cuentas WHERE codigo = '4211')
LIMIT 1;

-- Cuenta Gastos Operativos
INSERT INTO plan_cuentas (codigo, nombre, tipo, naturaleza, nivel, activa, user_id)
SELECT '5211', 'Gastos Operativos', 'gastos', 'deudora', 4, true, id
FROM auth.users
WHERE NOT EXISTS (SELECT 1 FROM plan_cuentas WHERE codigo = '5211')
LIMIT 1;

-- Actualizar nombres si las cuentas ya existen para mantener consistencia
UPDATE plan_cuentas SET nombre = 'IT por Pagar' WHERE codigo = '2114';
UPDATE plan_cuentas SET nombre = 'IT Pagado' WHERE codigo = '5401';
UPDATE plan_cuentas SET nombre = 'Pérdidas y Faltantes de Inventario' WHERE codigo = '5322';
UPDATE plan_cuentas SET nombre = 'Otros Ingresos' WHERE codigo = '4211';