-- Run this script in Supabase SQL Editor.
-- It creates an atomic RPC used by src/services/saleService.ts.
-- The function:
-- 1) Validates stock
-- 2) Creates/uses an open RECREO sales session for current auth user
-- 3) Inserts sale
-- 4) Inserts sale_items
-- 5) Decrements products.current_stock

create or replace function public.process_sale(
  p_payment_method text,
  p_session_type text,
  p_sale_items jsonb
)
returns table (sale_id uuid, total_sale_amount numeric)
language plpgsql
security invoker
as $$
declare
  authenticated_user_identifier uuid;
  active_sales_session_identifier uuid;
  created_sale_identifier uuid;
  computed_total_sale_amount numeric := 0;
  sale_item_record jsonb;
  current_product_identifier uuid;
  current_product_quantity integer;
  current_product_price numeric;
  current_product_stock integer;
  current_subtotal numeric;
begin
  authenticated_user_identifier := auth.uid();
  if authenticated_user_identifier is null then
    raise exception 'Authentication required';
  end if;

  if p_payment_method not in ('CASH', 'DEBIT', 'TRANSFER', 'QR') then
    raise exception 'Invalid payment method';
  end if;

  if p_session_type not in ('RECREO', 'VENTA_LIBRE') then
    raise exception 'Invalid automatic sale category';
  end if;

  if p_sale_items is null or jsonb_typeof(p_sale_items) <> 'array' or jsonb_array_length(p_sale_items) = 0 then
    raise exception 'Sale items list is required';
  end if;

  for sale_item_record in select * from jsonb_array_elements(p_sale_items)
  loop
    current_product_identifier := (sale_item_record->>'product_id')::uuid;
    current_product_quantity := (sale_item_record->>'quantity')::integer;

    if current_product_identifier is null then
      raise exception 'Invalid sale item product identifier';
    end if;

    if current_product_quantity is null or current_product_quantity <= 0 then
      raise exception 'Invalid sale item quantity';
    end if;

    select price, current_stock
      into current_product_price, current_product_stock
      from public.products
      where id = current_product_identifier
        and is_active = true
      for update;

    if current_product_price is null then
      raise exception 'Product not found';
    end if;

    if current_product_stock < current_product_quantity then
      raise exception 'Insufficient stock';
    end if;

    current_subtotal := current_product_price * current_product_quantity;
    computed_total_sale_amount := computed_total_sale_amount + current_subtotal;
  end loop;

  select id
    into active_sales_session_identifier
    from public.sales_sessions
    where user_id = authenticated_user_identifier
      and session_type = p_session_type
      and status = 'OPEN'
    order by started_at desc
    limit 1;

  if active_sales_session_identifier is null then
    insert into public.sales_sessions (user_id, session_type, status, total_amount, started_at)
    values (
      authenticated_user_identifier,
      p_session_type,
      'OPEN',
      0,
      timezone('America/Argentina/Buenos_Aires', now())
    )
    returning id into active_sales_session_identifier;
  end if;

  insert into public.sales (session_id, payment_method, total_price, created_at)
  values (
    active_sales_session_identifier,
    p_payment_method,
    computed_total_sale_amount,
    timezone('America/Argentina/Buenos_Aires', now())
  )
  returning id into created_sale_identifier;

  for sale_item_record in select * from jsonb_array_elements(p_sale_items)
  loop
    current_product_identifier := (sale_item_record->>'product_id')::uuid;
    current_product_quantity := (sale_item_record->>'quantity')::integer;

    select price
      into current_product_price
      from public.products
      where id = current_product_identifier;

    insert into public.sale_items (sale_id, product_id, quantity, unit_price)
    values (created_sale_identifier, current_product_identifier, current_product_quantity, current_product_price);

    update public.products
      set current_stock = current_stock - current_product_quantity
      where id = current_product_identifier;
  end loop;

  update public.sales_sessions
    set total_amount = coalesce(total_amount, 0) + computed_total_sale_amount
    where id = active_sales_session_identifier;

  return query
  select created_sale_identifier, computed_total_sale_amount;
end;
$$;
