# Planificación Técnica y Funcional: Módulo "Clientes (CRM & Marketing Directo)"
**Proyecto:** Origen Canino (`origencanino.cl/admin`)  
**Fecha:** 22 de Noviembre de 2026  
**Estado:** En Planificación (sin código implementado aún — pendiente de revisión y aprobación)

---

## 1. Diagnóstico y Objetivo

Actualmente el Panel de Administración cuenta con un grupo llamado **Marketing y Clientes** (`Alianzas Vet & Pet`, `Promociones & 1ra Compra`, `Retención`, `Puntos NFC`, `Testimonios`, `Blog SEO IA`), pero **no existe una vista centralizada de Clientes**. Hoy solo es posible ver nombres y teléfonos de forma aislada dentro de cada orden de despacho.

**Objetivo:** Crear el nuevo menú **Clientes (CRM)** como **primera opción del grupo Marketing y Clientes** para entregar a administración control total en 4 pilares:
1. **Visibilidad 360°:** Panorama real de clientes registrados, clientes invitados (que compraron sin cuenta), sus perros, historial de compras y actividad en el sitio.
2. **Soporte y Control de Cuentas:** Cambiar/restablecer contraseñas, editar datos básicos, ajustar saldo de billetera, bloquear/desbloquear cuentas y eliminar cuentas de forma segura.
3. **Analítica de Comportamiento:** Total gastado (LTV), frecuencia de compra, productos favoritos, número de ingresos al sitio (`login_count`) y última conexión (`last_login_at`).
4. **Comunicación y Marketing Directo:** Contacto instantáneo 1-a-1 por WhatsApp con plantillas personalizadas, campañas segmentadas (cola WhatsApp asistida + Email corporativo) y exportación CSV para audiencias.

---

## 2. Arquitectura de Datos (PostgreSQL)

### 2.1 Datos que ya existen hoy
- `customers`: `id`, `name`, `email`, `password_hash`, `phone`, `address`, `city`, `region`, `referral_code`, `wallet_balance`, `created_at`, `updated_at`.
- `customer_dogs`: `id`, `customer_id`, `name`, `weight`, `age_stage`, `favorite_diet`, `notes`, `photo_url`.
- `orders` + `order_items`: Historial completo de pedidos, montos, descuentos, cupones y estados de pago/entrega.
- `referral_transactions`: Movimientos de billetera del Club de Embajadores.
- `admin_audit_logs`: Bitácora de auditoría de acciones administrativas.

### 2.2 Nuevas columnas en `customers` (migración segura `ADD COLUMN IF NOT EXISTS`)
| Columna | Tipo | Propósito |
| :--- | :--- | :--- |
| `is_blocked` | `BOOLEAN DEFAULT FALSE` | Bloquea inicio de sesión y acceso al portal del cliente. |
| `blocked_reason` | `TEXT` | Motivo interno del bloqueo (solo visible para admin). |
| `blocked_at` | `TIMESTAMP` | Fecha y hora del bloqueo. |
| `is_deleted` | `BOOLEAN DEFAULT FALSE` | Borrado lógico (soft-delete) para proteger contabilidad y lotes FIFO. |
| `deleted_at` | `TIMESTAMP` | Fecha de desactivación/eliminación. |
| `last_login_at` | `TIMESTAMP` | Última fecha/hora en que el cliente inició sesión en el sitio. |
| `login_count` | `INTEGER DEFAULT 0` | Contador acumulado de ingresos al sitio/portal. |
| `last_seen_at` | `TIMESTAMP` | Última actividad autenticada detectada (opcional). |
| `admin_notes` | `TEXT` | Notas privadas internas del equipo (ej. horario preferido, sensibilidad alimentaria). |
| `tags` | `TEXT DEFAULT ''` | Etiquetas CRM separadas por coma (ej. `VIP,BARF,Condominio,Embajador`). |
| `marketing_opt_in` | `BOOLEAN DEFAULT TRUE` | Indica si el cliente acepta comunicaciones promocionales. |

### 2.3 Nueva tabla opcional `customer_crm_events`
Permite ver en la ficha del cliente una **línea de tiempo real**:
- `id`, `customer_id`, `event_type` (`login`, `password_reset`, `blocked`, `unblocked`, `wallet_adjustment`, `whatsapp_sent`, `email_sent`, `note_updated`), `details`, `created_by` (admin o sistema), `created_at`.

---

## 3. Diseño de la Interfaz en `/admin` (Menú "Clientes")

### 3.1 KPIs Superiores (Panorama Instantáneo)
Una barra compacta de 5 tarjetas clicables (que además filtran la tabla):
1. **Total Clientes Registrados** (+ contador secundario de *Compradores Invitados sin cuenta*).
2. **Clientes Activos (últimos 30 días)** con compra pagada.
3. **Registrados Sin Comprar** *(oportunidad comercial inmediata)*.
4. **Inactivos / En Riesgo (>45 días sin comprar)**.
5. **LTV Promedio & Saldo en Billeteras** (valor total del cliente + saldo pendiente por canjear).

### 3.2 Pestañas Internas del Módulo
1. **Directorio de Clientes (Registrados):** Tabla maestra con buscador, filtros y acciones rápidas.
2. **Compradores Invitados (Sin Cuenta):** Detecta automáticamente correos/teléfonos en `orders` que compraron sin registrarse en `customers`, permitiendo contactarlos para invitarlos a activar su cuenta y su código de embajador.
3. **Marketing Directo & Campañas:** Generador de segmentos + plantillas de WhatsApp/Email + exportación CSV.

### 3.3 Buscador, Filtros y Tabla Maestra
- **Buscador único instantáneo:** Busca por nombre, email, teléfono, comuna, código de referido (`CANELO-742`, etc.) o nombre de su perro.
- **Filtros rápidos (chips):**
  - `Todos` · `Con Compras` · `Sin Compras (Leads)` · `VIP (3+ pedidos)` · `Inactivos (+35d)` · `Embajadores` · `Bloqueados` · Selector de `Comuna`.
- **Ordenamiento:** Último ingreso, Total gastado (LTV), Cantidad de pedidos, Fecha de registro.
- **Columnas de la tabla:**
  - Checkbox de selección (para campañas/exportación).
  - **Cliente:** Nombre, correo, teléfono, comuna y badges (`VIP`, `Bloqueado`, `Embajador`).
  - **Mascota(s):** Nombre y peso de sus perros registrados (ej. *Canelo · 14 kg*).
  - **Compras:** Cantidad de pedidos pagados + **Total gastado ($ CLP)** + fecha de última compra.
  - **Actividad en el Sitio:** **Nº de ingresos (`login_count`)** + última conexión (`Hace 2 días` / `Nunca`).
  - **Billetera:** Saldo disponible (`$5.000`).
  - **Acciones rápidas:** Botón **Ver Ficha 360°**, botón **WhatsApp directo** (con plantilla), menú rápido (`Cambiar Clave`, `Bloquear`, `Eliminar`).

---

## 4. Ficha 360° del Cliente (Panel Lateral / Modal)

Al hacer clic en cualquier cliente se abre su expediente completo organizado en 4 bloques:

1. **Resumen Ejecutivo & Actividad**
   - Total gastado (LTV), ticket promedio, pedidos pagados vs cancelados, días desde última compra, **veces que ingresó al sitio** y fecha de último acceso.
   - Mascotas registradas (`customer_dogs`): foto, nombre, peso, etapa, dieta favorita y notas médicas/alergias.
2. **Historial de Pedidos**
   - Tabla cronológica de todas sus órdenes (ID, fecha, productos comprados, cupón usado, total pagado, estado de entrega).
3. **Embajador & Billetera**
   - Código personal, link de referido, amigos referidos que compraron, saldo actual y herramienta de **Ajuste Manual de Saldo** (`+$` / `-$` con motivo obligatorio registrado en auditoría).
4. **Soporte, Control de Cuenta y Notas CRM**
   - **Editar Datos de Soporte:** Nombre, teléfono, dirección, comuna, región.
   - **Cambiar / Restablecer Contraseña:**
     - Permite ingresar una clave nueva o generarla automáticamente con 1 clic (cifrada con `bcrypt`).
     - Botón inmediato *"Enviar nueva clave por WhatsApp"* con mensaje amable pre-armado.
   - **Bloquear / Desbloquear Cuenta:**
     - Al bloquear, el backend rechaza inmediatamente cualquier login o token activo del cliente (HTTP `403` con mensaje claro) y guarda el motivo + fecha. Reversible en 1 clic.
   - **Eliminar Cuenta (con Blindaje Contable):**
     - **Si NO tiene pedidos pagados:** permite eliminación definitiva tras confirmación explícita.
     - **Si TIENE pedidos pagados:** ofrece **Desactivar y Anonimizar** (soft-delete) para no corromper las finanzas, boletas ni el inventario FIFO histórico.
   - **Notas Internas & Etiquetas CRM:** Campo libre de notas privadas + selector rápido de tags (`VIP`, `BARF`, `Cocinada`, `Sensible`, `Condominio`).
   - **Línea de Tiempo de Eventos:** Registro de logins, cambios de clave, bloqueos y mensajes enviados.

---

## 5. Comunicación y Marketing Directo

### 5.1 Contacto 1-a-1 por WhatsApp (Plantillas Inteligentes)
Desde cada cliente se puede elegir una plantilla que rellena automáticamente `{nombre}`, `{perro}`, `{codigo_embajador}`, `{descuento}` y `{ultima_compra}`:
- **Bienvenida / Post-Primera Compra:** *"Hola {nombre}, ¿cómo le cayó la comida real a {perro}? Cualquier duda con la transición escríbeme directo..."*
- **Recordatorio de Reposición:** *"Hola {nombre}, calculamos que a {perro} le debe quedar poca comida. ¿Te reservo para el próximo despacho?"*
- **Activación (Registrado sin comprar):** *"Hola {nombre}, vi que creaste tu cuenta en Origen Canino para {perro}. Recuerda que tienes 10% de descuento en tu primera compra con BIENVENIDO10..."*
- **Invitación al Club de Embajadores:** *"Hola {nombre}, ¿sabías que con tu código {codigo_embajador} tus amigos tienen 10% OFF y tú acumulas $5.000 sin tope?"*
- **Mensaje Libre / Soporte:** Redacción manual o envío de clave restablecida.

### 5.2 Campañas Segmentadas (Marketing Directo)
- **Paso 1 — Elegir Audiencia:** Por filtro guardado (*Sin compras*, *Inactivos +35d*, *VIP*, *Por comuna*, *Por tipo de dieta BARF/Cocinada*) o selección manual por checkbox.
- **Paso 2 — Canal de Salida:**
  - **Cola Asistida de WhatsApp (Recomendado — cero riesgo de baneo):** Muestra la lista filtrada con el mensaje personalizado ya armado y un botón *"Abrir WhatsApp"* por cada cliente, marcando automáticamente `"Enviado ✓"` y registrándolo en el CRM para no duplicar envíos.
  - **Correo Electrónico Masivo (Opcional, si se configura SMTP):** Envío de campaña HTML con branding de Origen Canino respetando `marketing_opt_in = true`.
  - **Exportar CSV / Excel:** Descarga limpia (`nombre, email, telefono, comuna, perro, total_gastado, pedidos, codigo_embajador`) para campañas externas o audiencias personalizadas en Meta/Google Ads.

### 5.3 Convivencia con el módulo "Retención"
- **Clientes (CRM):** Base maestra 360°, soporte técnico (claves, bloqueos, eliminaciones), analítica de accesos/compras y marketing directo segmentado.
- **Retención:** Radar táctico enfocado exclusivamente en alertas de reposición por consumo estimado de kilos. Ambos se complementan sin duplicarse.

---

## 6. Plan de Implementación Sugerido (Por Fases)

| Fase | Alcance | Entregables |
| :--- | :--- | :--- |
| **Fase 1: Base CRM, Actividad y Soporte** | Migración BD, tracking real de ingresos (`login_count`, `last_login_at`), endpoints admin protegidos, tabla maestra, filtros, Ficha 360°, Cambio de Clave, Bloqueo/Desbloqueo, Eliminación segura y Ajuste de Billetera. | Menú `Clientes` 100% operativo para administración y soporte diario. |
| **Fase 2: Marketing Directo e Invitados** | Pestaña de Compradores Invitados sin cuenta, motor de plantillas WhatsApp personalizadas, Cola Asistida de campañas segmentadas, exportación CSV y línea de tiempo CRM (`customer_crm_events`). | Marketing directo accionable desde el mismo panel. |
| **Fase 3 (Opcional): Email Marketing SMTP** | Envío de campañas HTML directo desde el panel (solo si deseas activar envío masivo por correo además de WhatsApp). | Campañas por correo integradas. |

---

## 7. Puntos a Confirmar Contigo Antes de Programar

1. **¿Partimos con Fase 1 + Fase 2 juntas** (CRM completo + Soporte + Marketing por WhatsApp/CSV + Invitados), o prefieres desplegar Fase 1 primero y luego Fase 2?
2. **Email Marketing directo desde el panel:** ¿Quieres incluir envío de correos masivos desde ya (usando tu cuenta SMTP / dominio `origencanino.cl`), o por ahora priorizamos **WhatsApp asistido + Exportación CSV**?
3. **Seguimiento de visitas:** Hoy podemos medir con 100% precisión **cuántas veces inicia sesión y cuándo fue su última visita autenticada** (`login_count` + `last_login_at` + `last_seen_at`). ¿Te sirve así o también quieres registrar cuántas veces abre la tienda aun con la sesión ya recordada en su celular (1 visita contada por día activo)?

