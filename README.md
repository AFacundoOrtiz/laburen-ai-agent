# 🤖 Laburen AI Sales Agent

> Agente de ventas inteligente para WhatsApp, potenciado por **Google Gemini 2.0 Flash**, Node.js y PostgreSQL.

Este proyecto implementa un asistente virtual capaz de gestionar un flujo de ventas completo (búsqueda inteligente, venta cruzada, armado de carrito y cierre) actuando como un orquestador cognitivo sobre una API RESTful propia.

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
├── ai/                 # 🧠 Cerebro del Agente (Nuevo)
│   ├── functions.js    # Lógica de ejecución de herramientas
│   ├── prompts.js      # System Prompt y reglas de negocio
│   └── tools.js        # Definiciones JSON (Schemas) para Gemini
├── config/             # Configuración (DB, Gemini Client, Twilio)
├── controllers/        # Lógica de los endpoints (REST & WhatsApp)
├── routes/             # Definición de rutas Express
├── services/           # Lógica de negocio (Consumo de API interna)
│   ├── agentService.js # Orquestador principal del chat
│   └── productService.js # Cliente HTTP interno
├── utils/              # Utilidades
│   ├── mockHandler.js  # 🧪 Manejador de pruebas simuladas
│   └── textUtils.js    # ✂️ Fragmentación y limpieza de texto
└── app.js              # Entry point
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
TWILIO_WHATSAPP_NUMBER="whatsapp:+14155238886"
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

La aplicación expone una API REST organizada por recursos. El Agente de IA consume internamente estos servicios, pero también están disponibles para integraciones externas.

### 🛒 Carrito (`/api/cart`)
| Método | Endpoint | Descripción |
| :--- | :--- | :--- |
| **GET** | `/api/cart/:waId` | Obtiene el carrito activo actual de un usuario (usando su ID de WhatsApp). |
| **POST** | `/api/cart` | Crea un nuevo carrito o agrega items a uno existente. |
| **PATCH** | `/api/cart/:id` | Modifica el contenido del carrito (cambiar cantidades o eliminar items). |
| **PUT** | `/api/cart/:waId/status` | Actualiza el estado del pedido (ej: cerrar venta `COMPLETED` o cancelar `CANCELED`). |

### 📦 Productos (`/api/products`)
| Método | Endpoint | Descripción |
| :--- | :--- | :--- |
| **GET** | `/api/products` | Lista el catálogo de productos disponible. |
| **GET** | `/api/products/:id` | Obtiene los detalles completos (descripción, stock) de un producto específico. |

### 🤖 Agente & Mensajería
| Recurso | Método | Endpoint | Descripción |
| :--- | :--- | :--- | :--- |
| **Agent** | **POST** | `/api/agent/chat` | Endpoint de depuración para enviar mensajes directos al bot vía HTTP (Bypass de WhatsApp). |
| **WhatsApp** | **POST** | `/api/whatsapp/webhook` | Webhook de entrada para recibir eventos y mensajes desde la API de Twilio. |

## 🧪 Testing y Mock Mode

Puedes probar el flujo completo sin conectar con Google Gemini.
- Envía mensajes por WhatsApp que comiencen con test_ (ej: test_ buscar camisa).

### Scripts Locales

Puedes probar el flujo completo de compra (simulado) sin usar WhatsApp ejecutando:

```bash
node src/scripts/test-cart-flow.js
```