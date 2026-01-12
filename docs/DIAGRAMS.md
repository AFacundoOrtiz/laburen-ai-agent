# Diagramas Técnicos - Laburen AI Agent

Este documento detalla la arquitectura, el flujo de datos y el modelo de base de datos del agente.

## 1. Arquitectura de Componentes (C4 Nivel Contenedor)

Este diagrama ilustra la separación de responsabilidades. Destaca cómo el AgentService actúa como un orquestador que consume módulos de IA (/src/ai) y se comunica con la lógica de negocio a través de peticiones HTTP internas, desacoplándose de la base de datos directa.

```mermaid
graph TD
    %% Estilos
    classDef external fill:#f9f9f9,stroke:#333,stroke-width:2px;
    classDef core fill:#e1f5fe,stroke:#0277bd,stroke-width:2px;
    classDef ai_mod fill:#e8f5e9,stroke:#2e7d32,stroke-width:2px,stroke-dasharray: 5 5;
    classDef storage fill:#fff3e0,stroke:#ef6c00,stroke-width:2px;

    %% Nodos Externos
    User((Usuario WhatsApp)):::external
    Twilio[Twilio Sandbox Gateway]:::external
    Gemini[Google Gemini 2.0 Flash]:::external

    %% Nodos Internos
    subgraph "Laburen Server (Node.js)"
        Webhook[Webhook Controller]:::core
        
        subgraph "Agent Orchestrator (src/services)"
            AgentService[Agent Service]:::core
            MockHandler[Mock Handler]:::core
        end

        subgraph "AI Brain (src/ai)"
            Prompts[Prompts & Rules]:::ai_mod
            ToolsDef[Tools Definitions]:::ai_mod
            FuncExec[Functions Execution]:::ai_mod
        end

        subgraph "Internal REST API"
            API_Gateway[API Routes /api/...]:::core
            ProductCtrl[Product Controller]:::core
            CartCtrl[Cart Controller]:::core
            Prisma[Prisma ORM]:::core
        end
    end

    DB[(PostgreSQL Neon)]:::storage

    %% Conexiones
    User <-->|WhatsApp Protocol| Twilio
    Twilio <-->|HTTP POST Webhook| Webhook
    Webhook <--> AgentService
    
    %% Lógica de Agente
    AgentService -.->|Check| MockHandler
    AgentService <-->|History & Config| Prompts
    AgentService <-->|Schemas| ToolsDef
    AgentService <-->|Generate Content| Gemini
    AgentService <-->|Tool Execution| FuncExec

    %% Consumo de API
    FuncExec <-->|"fetch (HTTP)"| API_Gateway
    MockHandler -.->|"fetch (HTTP)"| API_Gateway

    %% Capa de Datos
    API_Gateway --> ProductCtrl & CartCtrl
    ProductCtrl & CartCtrl --> Prisma
    Prisma <-->|SQL Connection| DB
```

## 2. Diagrama de Secuencia: Flujo de Búsqueda y Lazy Loading

Detalla el ciclo de vida de una interacción compleja donde se aplica la regla de "Verificación de Existencia" y posteriormente "Lazy Loading" para obtener detalles técnicos.

```mermaid
sequenceDiagram
    autonumber
    actor User as Usuario
    participant WA as WhatsApp
    participant Agent as Agent Service
    participant AI as Gemini 2.0
    participant API as Internal API
    participant DB as PostgreSQL

    Note over User, WA: Fase 1: Búsqueda General
    User->>WA: "Busco una camisa"
    WA->>Agent: POST /webhook
    Agent->>AI: Historial + Tools Def
    
    Note right of AI: Anti-Lie Rule: <br/>Verificar existencia primero.
    AI-->>Agent: Call: search_products("camisa")
    
    Agent->>API: GET /products?q=camisa
    API->>DB: SELECT id, name, price FROM products...
    DB-->>API: Results (Sin descripción larga)
    API-->>Agent: JSON List (Lightweight)
    Agent-->>AI: Tool Result
    
    AI-->>Agent: "Tenemos Camisa Azul ($20) y Roja ($22)"
    Agent-->>WA: Respuesta al usuario

    Note over User, WA: Fase 2: Lazy Loading (Detalles)
    User->>WA: "¿Qué más puedes decirme sobre la Camisa Azul?"
    WA->>Agent: POST /webhook
    Agent->>AI: Contexto actualizado
    
    Note right of AI: Intención: Detalles<br/>Acción: Usar ID del historial
    AI-->>Agent: Call: get_product_details(uuid_azul)
    
    Agent->>API: GET /products/:uuid_azul
    API->>DB: SELECT * FROM products WHERE id = ...
    DB-->>API: Full Object (Description)
    API-->>Agent: {material: "Algodón", description: "..."}
    Agent-->>AI: Tool Result (Full Details)
    
    Note right of AI: Secure Output Policy:<br/>Ocultar UUID al usuario
    AI-->>Agent: "Tiene un diseño moderno y elegante."
    Agent-->>WA: Respuesta final
```

## 3. Diagrama de Secuencia: Flujo de Compra y Cierre

Muestra el uso de la API de Carrito, incluyendo la actualización de estado para cerrar la venta.

```mermaid
sequenceDiagram
    autonumber
    actor User as Usuario
    participant Agent as Agent Service
    participant AI as Gemini 2.0
    participant API as Internal API

    User->>Agent: "Me llevo la azul. Confirmo compra."
    
    Agent->>AI: Process Message
    
    Note right of AI: Tool: add_to_cart
    AI-->>Agent: Call: add_to_cart(id="uuid_azul", qty=1)
    Agent->>API: POST /cart (Create/Update)
    API-->>Agent: {success: true, total: $20}
    Agent-->>AI: Tool Result

    Note right of AI: Tool: confirm_order
    AI-->>Agent: Call: confirm_order()
    
    Agent->>API: PUT /cart/:waId/status (status="COMPLETED")
    API-->>Agent: {status: "COMPLETED", order_id: "..."}
    Agent-->>AI: Tool Result
    
    AI-->>Agent: "¡Listo! Tu pedido ha sido confirmado. 🎉"
```

## 4. Modelo de Entidad-Relación (ERD)

Esquema de base de datos. Refleja la estructura de PostgreSQL con las extensiones pgcrypto y vector.

```mermaid
erDiagram
    %% Definición de Relaciones
    products ||--o{ cart_items : "tiene referencias en"
    carts ||--|{ cart_items : "contiene"

    %% Entidad PRODUCTO
    products {
        uuid id PK "default: gen_random_uuid()"
        string sku UK "Unique VarChar(50)"
        string name "VarChar(255)"
        string description "Text (Nullable)"
        decimal price "Decimal(10,2)"
        int stock "Default: 0"
        boolean is_available "Default: true"
        string category "VarChar(100)"
        string type "VarChar(50)"
        string color "VarChar(50)"
        string size "VarChar(20)"
        vector embedding "Unsupported: vector(768)"
    }

    %% Entidad CARRITO
    carts {
        uuid id PK "default: gen_random_uuid()"
        string wa_id "VarChar(50) - Indexado"
        enum status "ACTIVE | COMPLETED | CANCELED"
        timestamp created_at "Default: now()"
        timestamp updated_at "Default: now()"
    }

    %% Entidad ITEM DE CARRITO (Tabla Pivote)
    cart_items {
        uuid id PK "default: gen_random_uuid()"
        uuid cart_id FK "Delete Cascade"
        uuid product_id FK
        int qty "Default: 1"
    }
```