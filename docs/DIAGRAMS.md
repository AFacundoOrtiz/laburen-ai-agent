# Diagramas Técnicos - Laburen AI Agent

Este documento detalla la arquitectura, el flujo de datos y el modelo de base de datos del agente.

## 1. Arquitectura de Componentes (C4 Nivel Contenedor)

Este diagrama muestra cómo interactúan los servicios externos (WhatsApp/Twilio, Google Gemini) con nuestro servidor y cómo se divide la lógica interna entre el Agente y la API REST.

```mermaid
graph TD
    %% Estilos
    classDef external fill:#f9f9f9,stroke:#333,stroke-width:2px;
    classDef core fill:#e1f5fe,stroke:#0277bd,stroke-width:2px;
    classDef storage fill:#fff3e0,stroke:#ef6c00,stroke-width:2px;

    %% Nodos Externos
    User((Usuario WhatsApp)):::external
    Twilio[Twilio Sandbox Gateway]:::external
    Gemini[Google Gemini 2.0 Flash]:::external

    %% Nodos Internos
    subgraph "Laburen Server (Koyeb)"
        Webhook[Webhook Controller]:::core
        AgentService[Agent Logic Service]:::core
        
        subgraph "Internal REST API"
            API_Gateway[API Routes /api/...]:::core
            Prisma[Prisma ORM]:::core
        end
    end

    DB[(PostgreSQL Neon)]:::storage

    %% Conexiones
    User <-->|WhatsApp Protocol| Twilio
    Twilio <-->|HTTP POST Webhook| Webhook
    Webhook <--> AgentService
    AgentService <-->|Prompt & Tools| Gemini
    
    %% La conexión clave del challenge: El agente consume la API
    AgentService <-->|fetch (HTTP)| API_Gateway
    
    API_Gateway --> Prisma
    Prisma <-->|SQL Connection| DB
```

## 2. Diagrama de Secuencia: Flujo de Compra

Detalla el ciclo de vida de un mensaje desde que el usuario pide un producto hasta que se confirma la transacción. Muestra explícitamente el consumo de los endpoints REST (GET, POST, PATCH).

```mermaid
sequenceDiagram
    autonumber
    actor User as Usuario
    participant WA as WhatsApp/Twilio
    participant Agent as Agente (Node.js)
    participant AI as Gemini 2.0
    participant API as Internal REST API
    participant DB as PostgreSQL

    Note over User, WA: Inicio de Interacción
    User->>WA: "Hola, busco pantalones rojos"
    WA->>Agent: POST /webhook (Message)
    Agent->>AI: Enviar historial + Definición de Tools
    
    Note right of AI: Razonamiento:<br/>Intención: Búsqueda<br/>Tool: search_products
    
    AI-->>Agent: Ejecutar: search_products("pantalón rojo")
    Agent->>API: GET /products?q=pantalón%20rojo
    API->>DB: SELECT * FROM products WHERE...
    DB-->>API: Result: [{id: "uuid1", name: "Pantalón Rojo", price: 20}]
    API-->>Agent: JSON Response
    Agent-->>AI: Tool Result (Datos de productos)
    
    AI-->>Agent: Generar respuesta en lenguaje natural
    Agent-->>WA: "Tengo un Pantalón Rojo a $20. ¿Te interesa?"
    WA-->>User: Mensaje de WhatsApp

    Note over User, WA: Intención de Compra
    User->>WA: "Sí, quiero 2 unidades"
    WA->>Agent: POST /webhook
    Agent->>AI: Contexto actualizado
    
    Note right of AI: Razonamiento:<br/>Intención: Compra<br/>Tool: add_to_cart
    
    AI-->>Agent: Ejecutar: add_to_cart(id="uuid1", qty=2)
    
    Note right of Agent: Verifica sesión local
    Agent->>API: POST /carts (Body: {items: [...]})
    API->>DB: INSERT INTO Carts / CartItems
    DB-->>API: OK
    API-->>Agent: {success: true, cart_id: "xyz"}
    
    Agent-->>AI: Confirmación de éxito
    AI-->>Agent: Respuesta final
    Agent-->>WA: "Listo, agregué 2 pantalones a tu carrito."
```

## 3. Modelo de Entidad-Relación (ERD)

Esquema de base de datos utilizado para persistir productos y carritos de compra.

```mermaid
erDiagram
    PRODUCTS ||--o{ CART_ITEMS : "incluido en"
    CARTS ||--|{ CART_ITEMS : "contiene"

    PRODUCTS {
        uuid id PK
        string name
        string description
        float price
        int stock
        vector embedding "Opcional para búsqueda semántica"
    }

    CARTS {
        uuid id PK
        timestamp created_at
        timestamp updated_at
    }

    CART_ITEMS {
        uuid id PK
        uuid cart_id FK
        uuid product_id FK
        int qty
    }
```