# 🤖 Laburen AI Sales Agent

> Agente de ventas inteligente para WhatsApp, potenciado por **Google Gemini 2.0 Flash**, Node.js y PostgreSQL.

Este proyecto implementa un asistente virtual capaz de gestionar un flujo de ventas completo (búsqueda de productos, armado de carrito y modificación de pedidos) actuando como una capa de inteligencia sobre una API RESTful tradicional.

---

## 📂 Documentación de Diseño

Para entender la arquitectura y el flujo de datos, consulta los documentos de diseño en la carpeta `/docs`:

* 📐 **[Diseño Conceptual y Arquitectura](./docs/CONCEPTUAL_DESIGN.md)**: Explicación detallada del flujo, decisiones técnicas y Prompt del sistema.
* 📊 **[Diagramas Técnicos](./docs/DIAGRAMS.md)**: Gráficos Mermaid.js (Arquitectura C4, Secuencia y ERD).

---

## 🚀 Stack Tecnológico

* **Runtime:** Node.js v20+
* **Framework:** Express.js
* **IA / LLM:** Google Gemini 2.0 Flash (vía SDK `@google/generative-ai`)
* **Base de Datos:** PostgreSQL (con extensión `pgcrypto`)
* **ORM:** Prisma
* **Mensajería:** Twilio API for WhatsApp

---

## 📁 Estructura del Proyecto

```text
src/
├── config/         # Configuración (DB, API, LLM Tools)
├── controllers/    # Lógica de los endpoints (REST & WhatsApp)
├── routes/         # Definición de rutas Express
├── services/       # Lógica de negocio y conexión con Gemini
│   ├── agentService.js   # Cerebro del Agente (Prompt & Tools)
│   ├── cartService.js    # Cliente interno para consumir la API
│   └── productService.js # Cliente interno para búsqueda
├── scripts/        # Utilities (Seed, Init DB, Tests)
└── app.js          # Entry point
```

---

## 🛠️ Instalación y Puesta en Marcha

### 1. Requisitos Previos
* Node.js instalado.
* Una base de datos PostgreSQL activa (local o nube como Neon/Supabase).
* Cuenta en Twilio (para testing en WhatsApp).
* API Key de Google AI Studio (Gemini).

### 2. Configuración de Variables de Entorno
Crea un archivo `.env` en la raíz:

```env
PORT=3010
DATABASE_URL="postgresql://user:pass@host:port/dbname"
GEMINI_API_KEY="tu_api_key_de_google"
TWILIO_ACCOUNT_SID="tu_sid"
TWILIO_AUTH_TOKEN="tu_token"
```

### 3. Instalación de Dependencias

```bash
npm install
```

### 4. Inicialización de Base de Datos

Ejecuta los siguientes scripts para crear las tablas y poblar los datos desde products.xlsx:

```bash
# Genera el cliente de Prisma
npm run build

# Crea las tablas (init.sql)
npm run db:init

# Carga los productos desde el Excel (Seed)
npm run db:seed
```

### 5. Ejecutar el Servidor

```bash
npm start
# O para desarrollo:
npm run dev
```

---

## 🔌 API Endpoints Principales

El sistema expone una API REST que es consumida tanto por el Agente de IA como por clientes externos:

| Método | Endpoint | Descripción |
| :--- | :--- | :--- |
| GET | /api/products | Lista productos (soporta filtro ?q=nombre). |
| GET | /api/products/:id | Detalle de un producto específico. |
| POST | /api/cart | Crea un carrito nuevo con items. |
| PATCH | /api/cart/:id | Modifica cantidades o elimina items de un carrito. |
| GET | /api/cart/:waId | Obtiene el carrito activo de un usuario. |
| POST | /api/whatsapp/webhook | Entrada de mensajes desde Twilio. |

## 🧪 Testing

Puedes probar el flujo completo de compra (simulado) sin usar WhatsApp ejecutando:

```bash
node src/scripts/test-cart-flow.js
```