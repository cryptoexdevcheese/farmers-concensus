-- Farmers Consensus Database Schema for PostgreSQL

-- Farmers Registration Table
CREATE TABLE IF NOT EXISTS farmers_registrations (
    id SERIAL PRIMARY KEY,
    farmer_id VARCHAR(50) UNIQUE NOT NULL,
    farmer_name VARCHAR(255) NOT NULL,
    contact VARCHAR(20) NOT NULL,
    province VARCHAR(100) NOT NULL,
    municipality VARCHAR(100) NOT NULL,
    barangay VARCHAR(100) NOT NULL,
    vegetable_id VARCHAR(50) NOT NULL,
    area_sqm DECIMAL(10, 2) NOT NULL,
    area_ha DECIMAL(10, 2) NOT NULL,
    expected_yield_tons DECIMAL(10, 2) NOT NULL,
    planting_date DATE NOT NULL,
    harvest_date DATE NOT NULL,
    blockchain_transaction_id VARCHAR(255),
    blockchain_hash VARCHAR(255),
    registration_timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    premium_tier BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Buyers Registration Table
CREATE TABLE IF NOT EXISTS buyers_registrations (
    id SERIAL PRIMARY KEY,
    buyer_id VARCHAR(50) UNIQUE NOT NULL,
    buyer_name VARCHAR(255) NOT NULL,
    company_name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    province VARCHAR(100) NOT NULL,
    business_type VARCHAR(50) NOT NULL,
    products TEXT[] NOT NULL,
    monthly_volume DECIMAL(10, 2) NOT NULL,
    blockchain_transaction_id VARCHAR(255),
    blockchain_hash VARCHAR(255),
    registration_timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    premium_tier BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Farmer-Buyer Matches Table
CREATE TABLE IF NOT EXISTS farmer_buyer_matches (
    id SERIAL PRIMARY KEY,
    farmer_id VARCHAR(50) NOT NULL,
    buyer_id VARCHAR(50) NOT NULL,
    vegetable_id VARCHAR(50) NOT NULL,
    quantity DECIMAL(10, 2) NOT NULL,
    match_value DECIMAL(12, 2) NOT NULL,
    blockchain_transaction_id VARCHAR(255),
    blockchain_hash VARCHAR(255),
    match_timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Revenue Tracking Table
CREATE TABLE IF NOT EXISTS revenue_transactions (
    id SERIAL PRIMARY KEY,
    transaction_type VARCHAR(50) NOT NULL,
    amount DECIMAL(10, 2) NOT NULL,
    related_id VARCHAR(50),
    metadata JSONB,
    transaction_timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Daily Revenue Summary Table
CREATE TABLE IF NOT EXISTS daily_revenue (
    id SERIAL PRIMARY KEY,
    date DATE UNIQUE NOT NULL,
    total_revenue DECIMAL(10, 2) DEFAULT 0,
    transaction_count INTEGER DEFAULT 0,
    transaction_fees DECIMAL(10, 2) DEFAULT 0,
    premium_fees DECIMAL(10, 2) DEFAULT 0,
    verification_fees DECIMAL(10, 2) DEFAULT 0,
    buyer_registration_fees DECIMAL(10, 2) DEFAULT 0,
    buyer_premium_fees DECIMAL(10, 2) DEFAULT 0,
    buyer_matching_fees DECIMAL(10, 2) DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for better performance
CREATE INDEX IF NOT EXISTS idx_farmers_registrations_id ON farmers_registrations(farmer_id);
CREATE INDEX IF NOT EXISTS idx_farmers_registrations_province ON farmers_registrations(province);
CREATE INDEX IF NOT EXISTS idx_farmers_registrations_vegetable ON farmers_registrations(vegetable_id);
CREATE INDEX IF NOT EXISTS idx_farmers_registrations_date ON farmers_registrations(registration_timestamp);

CREATE INDEX IF NOT EXISTS idx_buyers_registrations_id ON buyers_registrations(buyer_id);
CREATE INDEX IF NOT EXISTS idx_buyers_registrations_province ON buyers_registrations(province);
CREATE INDEX IF NOT EXISTS idx_buyers_registrations_business_type ON buyers_registrations(business_type);

CREATE INDEX IF NOT EXISTS idx_matches_farmer ON farmer_buyer_matches(farmer_id);
CREATE INDEX IF NOT EXISTS idx_matches_buyer ON farmer_buyer_matches(buyer_id);
CREATE INDEX IF NOT EXISTS idx_matches_vegetable ON farmer_buyer_matches(vegetable_id);

CREATE INDEX IF NOT EXISTS idx_revenue_type ON revenue_transactions(transaction_type);
CREATE INDEX IF NOT EXISTS idx_revenue_timestamp ON revenue_transactions(transaction_timestamp);

CREATE INDEX IF NOT EXISTS idx_daily_revenue_date ON daily_revenue(date);

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_farmers_registrations_updated_at BEFORE UPDATE ON farmers_registrations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_buyers_registrations_updated_at BEFORE UPDATE ON buyers_registrations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_daily_revenue_updated_at BEFORE UPDATE ON daily_revenue
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();