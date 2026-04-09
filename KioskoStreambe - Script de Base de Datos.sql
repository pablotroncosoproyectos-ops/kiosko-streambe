-- =============================================================================
-- Kiosko Streambe — Script de base de datos (PostgreSQL / Supabase)
-- =============================================================================
-- Objetivo: esquema coherente con la aplicación Next.js (App Router) y los
-- servicios en `src/services/*` y rutas API bajo `src/app/api/`.
--
-- Notas importantes:
-- - La aplicación usa la tabla `sales_sessions` con `session_type` IN
--   ('RECREO', 'VENTA_LIBRE'). Las filas de recreo se exponen también como
--   vista `recess_sessions` (nombre pedido en documentación funcional).
-- - La venta en punto de móvil invoca la función RPC `process_sale` definida
--   abajo. Ajustá la lógica de combos o reglas de negocio avanzadas según
--   necesidad en producción.
-- - Tras ejecutar este script en Supabase: habilitá Row Level Security (RLS),
--   políticas por rol y, si aplica, sincronización `auth.users` → `public.users`.
-- =============================================================================

BEGIN;

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- -----------------------------------------------------------------------------
-- Tipos auxiliares (opcional; el código valida también en TypeScript)
-- -----------------------------------------------------------------------------
DO $$ BEGIN
  CREATE TYPE public.user_role AS ENUM ('ADMIN', 'OPERATOR');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.session_type AS ENUM ('RECREO', 'VENTA_LIBRE');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.session_status AS ENUM ('OPEN', 'CLOSED');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.payment_method AS ENUM ('CASH', 'DEBIT', 'TRANSFER', 'QR');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.inventory_movement_type AS ENUM ('IN', 'OUT');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- -----------------------------------------------------------------------------
-- Usuarios de aplicación (perfil enlazado a Supabase Auth)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('ADMIN', 'OPERATOR')),
  is_active BOOLEAN NOT NULL DEFAULT true,
  can_view_sales_history BOOLEAN NOT NULL DEFAULT false,
  must_change_password BOOLEAN NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS users_role_idx ON public.users (role);
CREATE INDEX IF NOT EXISTS users_email_lower_idx ON public.users (lower(email));

COMMENT ON TABLE public.users IS 'Perfiles de negocio; id = auth.users.id. Roles ADMIN / OPERATOR.';

-- -----------------------------------------------------------------------------
-- Categorías y productos (SKU operativo único cuando está presente)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT categories_name_unique UNIQUE (name)
);

CREATE TABLE IF NOT EXISTS public.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sku TEXT NULL,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  image_url TEXT NULL,
  price NUMERIC(14, 2) NOT NULL CHECK (price >= 0),
  cost_price NUMERIC(14, 2) NULL CHECK (cost_price IS NULL OR cost_price >= 0),
  es_granel BOOLEAN NOT NULL DEFAULT false,
  cantidad_por_unidad NUMERIC(14, 4) NULL,
  es_combo BOOLEAN NOT NULL DEFAULT false,
  current_stock INTEGER NOT NULL DEFAULT 0 CHECK (current_stock >= 0),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS products_sku_unique_not_null
  ON public.products (sku)
  WHERE sku IS NOT NULL;

CREATE INDEX IF NOT EXISTS products_category_idx ON public.products (category);

COMMENT ON COLUMN public.products.sku IS 'Clave operativa de lectura (scanner / pistola); única si no es NULL.';

-- -----------------------------------------------------------------------------
-- Combos (producto compuesto → componentes)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.combo_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  combo_product_id UUID NOT NULL REFERENCES public.products (id) ON DELETE CASCADE,
  component_product_id UUID NOT NULL REFERENCES public.products (id) ON DELETE CASCADE,
  quantity_per_combo NUMERIC(14, 4) NOT NULL CHECK (quantity_per_combo > 0),
  CONSTRAINT combo_items_no_self CHECK (combo_product_id <> component_product_id)
);

CREATE INDEX IF NOT EXISTS combo_items_combo_idx ON public.combo_items (combo_product_id);

-- -----------------------------------------------------------------------------
-- Configuración del negocio (marca en login, etc.)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.business_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  logo_url TEXT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- -----------------------------------------------------------------------------
-- Sesiones de venta: caja global (VENTA_LIBRE) y recreos por operador (RECREO)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.sales_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users (id) ON DELETE RESTRICT,
  session_type TEXT NOT NULL CHECK (session_type IN ('RECREO', 'VENTA_LIBRE')),
  status TEXT NOT NULL CHECK (status IN ('OPEN', 'CLOSED')),
  total_amount NUMERIC(14, 2) NOT NULL DEFAULT 0 CHECK (total_amount >= 0),
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  closed_at TIMESTAMPTZ NULL,
  closed_by UUID NULL REFERENCES public.users (id),
  notes TEXT NULL,
  expense_notes TEXT NULL,
  opening_balance NUMERIC(14, 2) NULL,
  expenses_total NUMERIC(14, 2) NULL,
  expected_balance NUMERIC(14, 2) NULL,
  closing_balance NUMERIC(14, 2) NULL,
  cash_difference NUMERIC(14, 2) NULL
);

CREATE INDEX IF NOT EXISTS sales_sessions_user_type_status_idx
  ON public.sales_sessions (user_id, session_type, status);
CREATE INDEX IF NOT EXISTS sales_sessions_type_status_started_idx
  ON public.sales_sessions (session_type, status, started_at DESC);

COMMENT ON TABLE public.sales_sessions IS 'Sesiones RECREO (por operador) y VENTA_LIBRE (caja del turno).';

-- Vista pedida en nomenclatura de negocio: solo sesiones de recreo.
CREATE OR REPLACE VIEW public.recess_sessions AS
SELECT *
FROM public.sales_sessions
WHERE session_type = 'RECREO';

COMMENT ON VIEW public.recess_sessions IS 'Alias de lectura: filas RECREO de sales_sessions.';

-- -----------------------------------------------------------------------------
-- Ventas e ítems de venta
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.sales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.sales_sessions (id) ON DELETE RESTRICT,
  total_price NUMERIC(14, 2) NOT NULL CHECK (total_price >= 0),
  payment_method TEXT NOT NULL CHECK (payment_method IN ('CASH', 'DEBIT', 'TRANSFER', 'QR')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  notes TEXT NULL
);

CREATE INDEX IF NOT EXISTS sales_session_id_idx ON public.sales (session_id);
CREATE INDEX IF NOT EXISTS sales_created_at_idx ON public.sales (created_at);

CREATE TABLE IF NOT EXISTS public.sale_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id UUID NOT NULL REFERENCES public.sales (id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products (id) ON DELETE RESTRICT,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  unit_price NUMERIC(14, 2) NOT NULL CHECK (unit_price >= 0),
  unit_cost NUMERIC(14, 2) NULL
);

CREATE INDEX IF NOT EXISTS sale_items_sale_id_idx ON public.sale_items (sale_id);
CREATE INDEX IF NOT EXISTS sale_items_product_id_idx ON public.sale_items (product_id);

-- -----------------------------------------------------------------------------
-- Movimientos de inventario (ajustes y salidas por venta según política)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.inventory_movements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES public.products (id) ON DELETE RESTRICT,
  user_id UUID NOT NULL REFERENCES public.users (id) ON DELETE RESTRICT,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  movement_type TEXT NOT NULL CHECK (movement_type IN ('IN', 'OUT')),
  reason TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS inventory_movements_product_idx ON public.inventory_movements (product_id);
CREATE INDEX IF NOT EXISTS inventory_movements_created_at_idx ON public.inventory_movements (created_at DESC);

-- -----------------------------------------------------------------------------
-- Vistas de informes (consumidas por reportService / dashboard)
-- -----------------------------------------------------------------------------
CREATE OR REPLACE VIEW public.v_daily_sales_summary AS
SELECT
  ss.session_type AS session_type,
  COALESCE(SUM(s.total_price), 0)::NUMERIC(14, 2) AS total_revenue,
  COUNT(s.id)::BIGINT AS total_transactions
FROM public.sales s
INNER JOIN public.sales_sessions ss ON ss.id = s.session_id
WHERE date_trunc(
  'day',
  s.created_at AT TIME ZONE 'America/Argentina/Buenos_Aires'
) = date_trunc(
  'day',
  CURRENT_TIMESTAMP AT TIME ZONE 'America/Argentina/Buenos_Aires'
)
GROUP BY ss.session_type;

COMMENT ON VIEW public.v_daily_sales_summary IS 'Agregado del día (zona AR) por tipo de sesión; usado en informes.';

CREATE OR REPLACE VIEW public.v_low_stock_alerts AS
SELECT p.*
FROM public.products p
WHERE p.is_active = true
  AND p.current_stock <= 5;

CREATE OR REPLACE VIEW public.v_top_products AS
SELECT
  p.id AS product_id,
  p.name AS product_name,
  p.sku,
  COALESCE(SUM(si.quantity), 0)::BIGINT AS total_quantity_sold,
  COALESCE(SUM(si.quantity * si.unit_price), 0)::NUMERIC(14, 2) AS total_revenue
FROM public.sale_items si
INNER JOIN public.sales s ON s.id = si.sale_id
INNER JOIN public.products p ON p.id = si.product_id
GROUP BY p.id, p.name, p.sku;

COMMENT ON VIEW public.v_top_products IS 'Ranking acumulado histórico; la UI limita filas.';

-- -----------------------------------------------------------------------------
-- Función: sesión VENTA_LIBRE abierta (caja del kiosco)
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.kiosko_open_venta_libre_session_id()
RETURNS UUID
LANGUAGE sql
STABLE
AS $$
  SELECT id
  FROM public.sales_sessions
  WHERE session_type = 'VENTA_LIBRE'
    AND status = 'OPEN'
  ORDER BY started_at DESC
  LIMIT 1;
$$;

-- -----------------------------------------------------------------------------
-- RPC principal: procesar venta (invocada desde saleService.processSale)
-- Parámetros alineados al cliente: p_payment_method, p_session_type, p_sale_items
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.process_sale(
  p_payment_method TEXT,
  p_session_type TEXT,
  p_sale_items JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_session_id UUID;
  v_sale_id UUID;
  v_total NUMERIC(14, 2) := 0;
  v_item JSONB;
  v_product RECORD;
  v_line_total NUMERIC(14, 2);
  v_qty INTEGER;
  v_payment TEXT;
  v_session_type_norm TEXT;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Autenticación requerida';
  END IF;

  v_payment := upper(trim(p_payment_method));
  IF v_payment NOT IN ('CASH', 'DEBIT', 'TRANSFER', 'QR') THEN
    RAISE EXCEPTION 'invalid payment method';
  END IF;

  v_session_type_norm := upper(trim(p_session_type));
  IF v_session_type_norm NOT IN ('RECREO', 'VENTA_LIBRE') THEN
    RAISE EXCEPTION 'invalid automatic sale category';
  END IF;

  IF p_sale_items IS NULL OR jsonb_typeof(p_sale_items) <> 'array' OR jsonb_array_length(p_sale_items) = 0 THEN
    RAISE EXCEPTION 'La lista de artículos es requerida';
  END IF;

  -- Resolver sesión destino
  IF v_session_type_norm = 'RECREO' THEN
    SELECT ss.id INTO v_session_id
    FROM public.sales_sessions ss
    WHERE ss.user_id = v_uid
      AND ss.session_type = 'RECREO'
      AND ss.status = 'OPEN'
    ORDER BY ss.started_at DESC
    LIMIT 1;
  ELSE
    SELECT public.kiosko_open_venta_libre_session_id() INTO v_session_id;
  END IF;

  IF v_session_id IS NULL THEN
    RAISE EXCEPTION 'no se encontró una sesión abierta';
  END IF;

  INSERT INTO public.sales (session_id, total_price, payment_method, notes)
  VALUES (v_session_id, 0, v_payment, NULL)
  RETURNING id INTO v_sale_id;

  FOR v_item IN SELECT * FROM jsonb_array_elements(p_sale_items)
  LOOP
    v_qty := (v_item->>'quantity')::INTEGER;
    IF v_qty IS NULL OR v_qty <= 0 THEN
      RAISE EXCEPTION 'Cantidad de artículo inválida';
    END IF;

    SELECT * INTO v_product
    FROM public.products
    WHERE id = (v_item->>'product_id')::UUID
    FOR UPDATE;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Identificador de producto inválido';
    END IF;

    IF v_product.current_stock < v_qty THEN
      RAISE EXCEPTION 'insufficient stock';
    END IF;

    v_line_total := round(v_qty::NUMERIC * v_product.price, 2);
    v_total := v_total + v_line_total;

    INSERT INTO public.sale_items (
      sale_id,
      product_id,
      quantity,
      unit_price,
      unit_cost
    ) VALUES (
      v_sale_id,
      v_product.id,
      v_qty,
      v_product.price,
      v_product.cost_price
    );

    UPDATE public.products
    SET current_stock = current_stock - v_qty
    WHERE id = v_product.id;

    INSERT INTO public.inventory_movements (
      product_id,
      user_id,
      quantity,
      movement_type,
      reason
    ) VALUES (
      v_product.id,
      v_uid,
      v_qty,
      'OUT',
      'OUT_SALE'
    );
  END LOOP;

  UPDATE public.sales
  SET total_price = v_total
  WHERE id = v_sale_id;

  UPDATE public.sales_sessions
  SET total_amount = total_amount + v_total
  WHERE id = v_session_id;

  RETURN jsonb_build_object(
    'sale_id', v_sale_id,
    'total_sale_amount', v_total,
    'total', v_total
  );
END;
$$;

COMMENT ON FUNCTION public.process_sale IS 'Procesa una venta, descuenta stock y registra movimientos OUT.';

COMMIT;

-- =============================================================================
-- Fin del script — revisar RLS, grants y políticas en el panel de Supabase.
-- =============================================================================
