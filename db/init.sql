CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "vector";

DROP TABLE IF EXISTS cart_items CASCADE;
DROP TABLE IF EXISTS carts CASCADE;
DROP TABLE IF EXISTS products CASCADE;
DROP TYPE IF EXISTS "CartStatus";
CREATE TYPE "CartStatus" AS ENUM ('ACTIVE', 'COMPLETED', 'CANCELED');

-- Tabla de Productos
CREATE TABLE products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sku VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    price DECIMAL(10, 2) NOT NULL,
    stock INTEGER DEFAULT 0,
    is_available BOOLEAN DEFAULT TRUE,
    category VARCHAR(100),
    type VARCHAR(50),
    color VARCHAR(50),
    size VARCHAR(20),
    embedding vector(768)
);

-- Tabla de Carritos
CREATE TABLE carts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    wa_id VARCHAR(50) NOT NULL,
    
    status "CartStatus" DEFAULT 'ACTIVE',
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_carts_wa_status ON carts(wa_id, status);

-- Items del Carrito
CREATE TABLE cart_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cart_id UUID REFERENCES carts(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id),
    qty INTEGER NOT NULL DEFAULT 1,
    
    UNIQUE(cart_id, product_id)
);