# Kiosko Streambe — Manual de usuario y flujos

Documento orientado a operadores y administradores. Describe los niveles de acceso y los flujos principales tal como están implementados en la aplicación **Next.js (App Router)** con backend en **rutas API** y datos en **Supabase (PostgreSQL)**.

---

## 1. Acceso y autenticación

### 1.1 Inicio de sesión

1. El usuario accede a la ruta **`/login`** e ingresa correo y contraseña.
2. La aplicación envía las credenciales al endpoint **`POST /api/auth/login`**, que valida la sesión contra **Supabase Auth** y consulta el perfil en la tabla pública **`users`** (rol, estado activo, etc.).
3. Tras un inicio correcto, el cliente recibe la información necesaria para decidir redirecciones (por ejemplo, si el usuario debe **cambiar la contraseña obligatoria** según metadatos de Auth).

### 1.2 Redirección según el rol

Una vez autenticado, el **proxy de control de acceso** (`src/proxy.ts`) aplica reglas de sesión y rol:

| Rol | Comportamiento típico |
|-----|------------------------|
| **ADMIN** | Acceso a **`/dashboard`** (informes) y **`/admin`** (inventario). También puede usar **`/operador`** (punto de venta), ya que no está restringido a operadores. |
| **OPERATOR** | Acceso principal a **`/operador`** (punto de venta). Las rutas **`/dashboard`** e **`/admin`** redirigen a **`/operador`**. |

Desde **`/login`** o la raíz **`/`**, un usuario con sesión válida es redirigido de forma automática: hacia **`/dashboard`** si es administrador y hacia **`/operador`** si es operador.

### 1.3 Flujos complementarios de seguridad

- **Cambio de contraseña obligatorio:** si aplica según la política de la cuenta, el sistema puede exigir la ruta **`/auth/cambiar-contrasena-obligatoria`** antes de permitir el uso del panel.
- **Recuperación de contraseña:** el usuario puede solicitar enlace desde la pantalla de login; el retorno del flujo utiliza **`/auth/callback`** y, tras intercambiar el código por sesión, la aplicación permite definir una nueva contraseña en **`/auth/reset-password`**.

### 1.4 Recuperación de Contraseña

#### 1.4.1 Método Público (Autogestión)

1. El usuario accede a la pantalla de **`/login`** y utiliza el enlace **"¿Olvidaste tu contraseña?"**.
2. La aplicación solicita el correo de recuperación y dispara el envío del enlace de restablecimiento mediante la integración con **Supabase Auth**.
3. Este flujo está orientado a la autogestión del acceso por parte del propio usuario final.

#### 1.4.2 Método Administrativo (Gestión Interna)

1. Un usuario con rol **ADMIN** puede abrir el modal de **Gestión de Usuarios** desde el panel administrativo.
2. Desde esa vista, el administrador puede iniciar la recuperación para un usuario específico mediante el botón **"Reset"**, que dispara el envío del correo de recuperación.
3. Por seguridad operativa y control de rate limit, este método aplica un **cooldown local de 60 segundos** entre intentos para el mismo usuario.

#### 1.4.3 Proceso de Validación y Redirección

1. En ambos métodos, el sistema envía un correo electrónico con un **enlace único de un solo uso** para continuar el restablecimiento.
2. Al abrir el enlace, la aplicación procesa la sesión de manera segura a través de **`/auth/callback`**, contemplando tanto el flujo **PKCE** (parámetros en query) como parámetros implícitos en **hash (`#`)**.
3. Para mejorar la experiencia y evitar rebotes innecesarios al login, se muestra una pantalla de transición **"Procesando acceso seguro..."** mientras se consolida la sesión.
4. Completada la validación, el usuario es dirigido de forma automática al formulario de nueva contraseña en **`/auth/reset-password`**.

---

## 2. Rol Operador

### 2.1 Vista exclusiva de Punto de Venta

El rol **OPERATOR** utiliza la vista **`/operador`**, pensada como **punto de venta** del kiosco: catálogo, carrito, cobro y gestión operativa del turno. No tiene acceso a las secciones de informes ni de inventario administrativo del sistema (rutas protegidas para **ADMIN**).

### 2.2 Flujo “Modo Recreo”

El modo recreo está alineado con la lógica de **sesiones de venta** (`RECREO` en la tabla **`sales_sessions`**) y con la experiencia de usuario del panel del operador.

1. **Apertura de sesión de recreo**  
   El operador inicia una sesión de recreo desde la interfaz (registro vía API, p. ej. **`/api/sales-sessions/start-recreo`**). Queda asociada al usuario autenticado y al tipo **`RECREO`**.

2. **Temporizador de 15 minutos**  
   La duración por defecto del recreo es de **15 minutos** (constante de aplicación). El temporizador se muestra en pantalla y puede persistir el fin del intervalo en el almacenamiento local del navegador para mantener coherencia si se recarga la página (la autoridad de negocio sigue siendo la sesión y las ventas registradas en base de datos).

3. **Escaneo y carga por SKU**  
   Los productos se identifican de forma operativa por el campo **`sku`** en **`products`**. El escánero (cámara o pistola) resuelve el producto comparando el código leído con el **SKU** almacenado; las ventas registran líneas en **`sale_items`** con cantidad, precio unitario y costo histórico cuando corresponde.

4. **Cierre y arqueo de caja**  
   El **cierre de caja con arqueo** corresponde a la sesión de **venta libre** (**`VENTA_LIBRE`**) del turno: el operador (o un administrador en el mismo flujo) utiliza el modal de cierre, que consume APIs como **`/api/sales-sessions/cash-summary`** y **`/api/sales-sessions/close-cash`**.  
   Al cerrar la caja del turno, el sistema también intenta **cerrar las sesiones de recreo abiertas** del operador, de modo que quede un corte consistente entre caja y recreos. Los subtotales por medio de pago distinguen, en la interfaz, el efectivo y ventas de **venta libre** frente a las de **recreo** cuando aplica el informe de cierre.

---

## 3. Rol Administrador

El rol **ADMIN** concentra tres grandes áreas de trabajo: punto de venta (mismo flujo operativo), inventario e informes.

### 3.1 Punto de Venta

El administrador puede acceder a **`/operador`** y utilizar el **mismo flujo operativo** que el operador: apertura de caja, modo recreo, escaneo por SKU, registro de ventas y acceso a historiales permitidos por permisos. Esto permite cubrir el mostrador sin cambiar de usuario cuando la política del negocio lo permite.

### 3.2 Inventario

La sección **`/admin`** concentra la **gestión de productos** y operaciones relacionadas:

- **Alta, baja, modificación y consulta (ABMC)** de productos mediante formularios modulares y llamadas a las rutas **`/api/products`**, **`/api/products/[productIdentifier]`**, categorías en **`/api/categories`**, e imágenes en **`/api/products/upload-image`**.
- **Ajuste de stock** con motivo cuando el ajuste reduce existencias, registrando movimientos en **`inventory_movements`** vía **`/api/products/stock-adjustment`**.
- **Carga de mercadería** entendida como variaciones de stock de entrada o altas de producto con stock inicial, según el flujo elegido en pantalla.
- **Trazabilidad:** los movimientos de inventario quedan asociados a producto, usuario y tipo de movimiento (**IN** / **OUT**), consultables desde informes y listados de movimientos según la implementación en UI.

### 3.3 Informes

La ruta **`/dashboard`** agrupa la **consulta de métricas** y reportes:

- **Ventas por recreo vs venta libre:** análisis según tipo de sesión (**`RECREO`** / **`VENTA_LIBRE`**) y filtros disponibles en los informes (incluye comparativas y arqueos donde la UI lo muestra).
- **Ventas diarias y cierre:** resúmenes por día calendario (zona horaria de negocio configurada en la aplicación), totales por medio de pago y, donde corresponde, **cierre diario** con impresión o exportación según la pantalla.
- **Productos más vendidos:** rankings a partir de **`sale_items`** y vistas de soporte como **`v_top_products`**.
- **Estado actual del stock:** alertas de stock bajo y vistas como **`v_low_stock_alerts`**, más el detalle de productos en inventario.

Los administradores también pueden gestionar **usuarios** del sistema desde el panel de informes (modal de gestión de usuarios), operación reservada a **ADMIN** y respaldada por las rutas bajo **`/api/users`**.

---

## 4. Lineamientos técnicos (referencia)

- **Arquitectura:** aplicación **fullstack** con **Next.js** y **App Router**; la lógica de negocio expuesta al cliente se implementa principalmente mediante **API Routes** en `src/app/api/`, con servicios reutilizables en `src/services/`.
- **Datos:** persistencia en **PostgreSQL** gestionada por **Supabase** (Auth, filas en esquema `public`, funciones RPC como **`process_sale`** para ventas transaccionales).
- **Seguridad:** control de sesión en proxy/middleware y autorización por rol en los *handlers* de API; las políticas **RLS** en Supabase deben configurarse en el entorno de despliegue según el modelo de permisos del negocio.

Para el modelo físico de tablas, vistas y función de venta, consulte el archivo **`KioskoStreambe - Script de Base de Datos.sql`** en la raíz del repositorio.

---

*Documento alineado al código del proyecto Kiosko Streambe. Las capturas de pantalla y nombres comerciales pueden variar según la marca configurada en **business_settings**.*
