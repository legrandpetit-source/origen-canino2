# 🐕 Sistema de Referidos por Código QR: "Embajadores Origen Canino"
### *"Nuestros Clientes como Vendedores sin Sueldo"*
**Documento de Arquitectura, Modelo de Incentivos y Aplicabilidad Operativa**  
**Proyecto:** Origen Canino 2 (`https://origencanino.cl`)  
**Fecha:** 6 de Noviembre de 2026  
**Autor:** Patricio Padilla & Antigravity  

---

## 1. Visión Estratégica y Concepto

El boca a boca (*Word-of-Mouth*) en la nutrición canina es el canal de adquisición con mayor tasa de conversión del mercado: cuando un tutor de perro ve cómo a otro perro le brilla el pelo, tiene más energía y dejó de tener alergias gracias a la comida real, la decisión de compra es inmediata.

El **Sistema de Referidos por QR** transforma a cada cliente satisfecho de Origen Canino en un **promotor activo**, entregándole herramientas físicas (QR) y digitales (enlace WhatsApp) para que gane premios o dinero para la comida de su propio perro cada vez que un amigo o vecino compre.

```
┌────────────────────────┐         Invita con su QR          ┌────────────────────────┐
│   CLIENTE EMBAJADOR    │ ─────────────────────────────────>│     AMIGO / VECINO     │
│ (Dueño de Canelo)      │                                   │ (Dueño de nuevo perro) │
└────────────────────────┘                                   └────────────────────────┘
            ▲                                                             │
            │                                                             │
   Gana $5.000 CLP de                                            Obtiene 15% OFF de
   saldo para su próximo                                         bienvenida en su
   pedido o ración gratis                                        primera compra
            │                                                             │
            │                                                             ▼
            │               ┌────────────────────────┐                    │
            └───────────────│     ORIGEN CANINO      │◄───────────────────┘
                            │    (Venta Realizada)   │
                            └────────────────────────┘
```

---

## 2. El Modelo de Incentivos: *"Ganar - Ganar" (Win-Win)*

Para que un programa de referidos sea viral y no se estanque, la propuesta debe ser irresistible para ambas partes:

| Rol | ¿Qué recibe? | ¿Cuándo lo recibe? | Beneficio Psicológico |
| :--- | :--- | :--- | :--- |
| **Nuevo Cliente (Amigo)** | **15% de Descuento** (o $5.000 CLP de descuento directo en su primer pedido de mínimo $30.000). | Al instante en el Checkout al escanear el QR o abrir el link. | *“Mi amigo me regaló un descuento exclusivo”.* |
| **Cliente Embajador (Promotor)** | **$5.000 CLP de Saldo Acumulable** en su Billetera Origen Canino (o raciones/snacks gratis al juntar créditos). | Apenas el pedido de su amigo queda confirmado y pagado. | *“La comida de mi perro me está saliendo gratis solo por recomendarla”.* |

---

## 3. Experiencia del Usuario (Flujo Operativo)

### 3.1 Para el Cliente Embajador (Dentro de `/mi-cuenta`)
1. **Nueva Pestaña:** `"Invita y Gana 🐾"`.
2. **Código y QR Único:** 
   - El sistema le asigna un código mnemotécnico personal basado en su perro o nombre: ej. `CANELO-742`.
   - Se muestra en pantalla su **Código QR generado en tiempo real en alta resolución**.
3. **Acciones Disponibles para el Cliente:**
   - 📲 **Botón "Compartir por WhatsApp":** Abre WhatsApp con texto preconfigurado:
     > *"¡Hola! Mi perrito Canelo come comida natural en Origen Canino y su salud cambió radicalmente 🐾. Te dejo este link con un 15% de descuento de regalo para tu primer pedido: https://origencanino.cl/r/CANELO-742"*
   - 🖼️ **Botón "Descargar Tarjeta QR":** Genera una imagen elegante en formato historia de Instagram o tarjeta digital lista para guardar en el celular y mostrar en la plaza canina.
   - 📋 **Botón "Copiar Enlace Directo"**.
4. **Billetera de Recompensas en Vivo:**
   - Indicador de saldo: *"Tienes $15.000 CLP acumulados por 3 amigos que compraron"*.
   - Historial transparente:
     - *Fecha 05/Nov: Amigo Andrés V. compró menú 10 Kg (+ $5.000 CLP).*
     - *Fecha 02/Nov: Amiga Carola M. compró menú 5 Kg (+ $5.000 CLP).*

### 3.2 Para el Amigo Referido (Nuevo Cliente)
1. Escanea el QR con su cámara o hace clic en el enlace de WhatsApp: `origencanino.cl/r/CANELO-742`.
2. La web se abre mostrando un **Banner de Bienvenida Personalizado**:
   > *"¡Bienvenido! Tu amigo Patricio (papá de Canelo) te regaló un 15% OFF en tu primer pedido de nutrición real."*
3. Al agregar productos y llegar al Checkout:
   - El descuento se aplica automáticamente sin necesidad de que el usuario tipee nada.
   - El sistema almacena la cookie/parámetro de sesión vinculándolo al embajador.

### 3.3 Uso del Saldo por el Embajador
- Cuando el embajador vuelve a comprar en Origen Canino:
- En el Checkout verá un interruptor:
  - `[✓] Usar mi saldo acumulado ($15.000 CLP)`
- El total del pedido se reduce automáticamente. Si el pedido cuesta $35.000, solo paga $20.000.

---

## 4. Estrategia de Terreno y Físico (Plazas, Parques y Condominios)

Para que los clientes actúen como verdaderos promotores en la vida real:

1. **Sticker QR de Mochila / Placa:**
   - Podemos imprimir planchas de mini-stickers o credenciales para que el tutor las pegue en su botella de agua, correa o mochila de paseo con el mensaje: *"Pregúntame qué come mi perro y escanea aquí para tu descuento"*.
2. **Pack de Bienvenida con Tarjetas de Referidos:**
   - En cada despacho de Origen Canino incluimos dentro de la caja **3 tarjetas de presentación impresas** con el QR único del cliente:
   - *"Regálale estas 3 tarjetas a tus amigos del parque canino. Por cada uno que compre, te descontamos $5.000 de tu próxima comida."*

---

## 5. Prevención de Fraude y Abuso (Reglas de Seguridad)

Para evitar que personas malintencionadas intenten burlar el sistema o sacarle dinero a la plataforma:

1. **Regla de Primera Compra Estricta:**
   - El descuento de referido solo aplica para clientes que **nunca antes hayan comprado** en Origen Canino.
2. **Bloqueo de Auto-Referidos:**
   - El sistema rechaza si el nuevo pedido tiene el mismo correo electrónico, el mismo número de WhatsApp o el mismo RUT/medio de pago que el embajador.
3. **Liberación Condicionada del Saldo:**
   - El saldo de $5.000 NO se entrega de inmediato al crear el pedido: se libera únicamente cuando el pedido pasa a estado **`PAGADO`** (Mercado Pago aprobado o transferencia confirmada por el admin). Si el pedido se cancela o rebota, no se genera saldo.
4. **Compra Mínima:**
   - El pedido del amigo debe cumplir con el mínimo del carrito ($25.000 o $30.000 CLP) para ser elegible para la recompensa.
5. **No acumulable con otros cupones:**
   - El descuento de referido no se puede sumar a un cupón de campaña del 30% simultáneamente.

---

## 6. Arquitectura Técnica en Base de Datos (PostgreSQL Hetzner)

Aprovechando la base de datos PostgreSQL existente en `origen-canino-db`, la implementación requiere solo 2 tablas y un par de columnas:

### 6.1 Nuevas Columnas en `customers`
```sql
ALTER TABLE customers ADD COLUMN IF NOT EXISTS referral_code VARCHAR(30) UNIQUE;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS wallet_balance NUMERIC(10,2) DEFAULT 0.00;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS referred_by_customer_id INTEGER REFERENCES customers(id);
```

### 6.2 Tabla de Historial de Referidos (`referral_transactions`)
```sql
CREATE TABLE IF NOT EXISTS referral_transactions (
    id SERIAL PRIMARY KEY,
    referrer_customer_id INTEGER NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    referee_customer_id INTEGER REFERENCES customers(id) ON DELETE SET NULL,
    order_id INTEGER REFERENCES orders(id) ON DELETE SET NULL,
    transaction_type VARCHAR(20) NOT NULL, -- 'reward_earned' | 'wallet_spent' | 'manual_adjustment'
    amount NUMERIC(10,2) NOT NULL,
    description VARCHAR(255),
    status VARCHAR(20) DEFAULT 'completed', -- 'pending' | 'completed' | 'cancelled'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

### 6.3 Tabla de Configuración Global del Programa (`system_settings`)
Valores administrables desde el Panel Admin:
- `referral_friend_discount_percent`: `15` (% que recibe el amigo).
- `referral_reward_amount`: `5000` ($ CLP que gana el embajador).
- `referral_min_order_amount`: `30000` (monto mínimo del pedido del amigo).
- `referral_program_active`: `true`.

---

## 7. Panel Administrativo (`/admin` -> Pestaña "Embajadores y Referidos")

Para que tengas control total de las ventas generadas por este canal:

1. **Ranking de Top Embajadores:**
   - Tabla que muestra qué clientes han traído más amigos, cuántas ventas totales han generado y cuánto saldo han ganado.
2. **Métricas Clave (KPIs):**
   - Total de Clientes Captados por Referidos.
   - Total de Dinero Facturado por este Canal.
   - Retorno sobre la Inversión (ROI): por cada $5.000 entregados en recompensa, se capturó una venta de $35.000+.
3. **Ajuste Manual de Billetera:**
   - Opción para que el admin pueda regalar saldo extra a un cliente estrella o corregir saldos.

---

## 8. Hoja de Ruta de Implementación Sugerida

1. **Fase 1 (Base de Datos y Backend):**
   - Generación automática de `referral_code` único al registrarse un cliente.
   - Endpoint `GET /api/customer/referral-stats` (QR, enlace, saldo, amigos).
   - Hook en `POST /api/orders` para acreditar los $5.000 al embajador al confirmarse el pago.
2. **Fase 2 (Frontend Cliente en `/mi-cuenta`):**
   - Vista "Invita y Gana" con QR interactivo descargable y botón de compartir en WhatsApp con 1 tap.
   - Checkbox en el Checkout para descontar saldo acumulado.
3. **Fase 3 (Frontend Admin en `/admin`):**
   - Vista de control de embajadores, ajustes y métricas de adquisición.

---

## 9. Conclusión y Veredicto

Esta iniciativa convierte el costo de marketing tradicional (que normalmente se le paga a Meta o Google Ads) en **premios para tus propios clientes**. Es la estrategia con mayor fidelización existente para marcas D2C (*Direct to Consumer*) de alimentos premium.
