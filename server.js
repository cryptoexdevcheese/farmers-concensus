require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const axios = require('axios');
const session = require('express-session');
const { Pool } = require('pg');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const app = express();
const PORT = process.env.PORT || 3000;

// Cheese Blockchain Configuration
const CHEESE_API_URL = process.env.CHEESE_BLOCKCHAIN_API_URL || 'http://165.22.252.113:8080';
const TREASURY_WALLET = process.env.FARMERS_CONSENSUS_TREASURY_WALLET || '0x045D4e61757a873DAF5F3B59CCeD9f2585643cc3';
const REGISTRATION_REWARD = parseInt(process.env.REGISTRATION_REWARD_AMOUNT) || 10;

// Revenue Configuration
const TRANSACTION_FEE = parseFloat(process.env.TRANSACTION_FEE) || 0.5; // NCH per registration
const PREMIUM_TIER_FEE = parseFloat(process.env.PREMIUM_TIER_FEE) || 2.0; // NCH for premium features
const HARVEST_VERIFICATION_FEE = parseFloat(process.env.HARVEST_VERIFICATION_FEE) || 1.5; // NCH per verification
const BUYER_REGISTRATION_FEE = parseFloat(process.env.BUYER_REGISTRATION_FEE) || 1.0; // NCH per buyer registration
const BUYER_PREMIUM_FEE = parseFloat(process.env.BUYER_PREMIUM_FEE) || 3.0; // NCH for buyer premium features
const BUYER_MATCHING_FEE = parseFloat(process.env.BUYER_MATCHING_FEE) || 0.25; // NCH per successful farmer-buyer match

// Token Price Configuration (mock prices, would connect to real price feeds in production)
const TOKEN_PRICES = {
    NCH: {
        USD: 0.05,        // $0.05 per NCH
        PHP: 2.80,       // ₱2.80 per NCH
        EUR: 0.045,      // €0.045 per NCH
        BTC: 0.0000008,  // ~0.0000008 BTC per NCH
        ETH: 0.000015    // ~0.000015 ETH per NCH
    },
    updateInterval: 60000 // Update prices every 60 seconds
};

// Current token prices (will be updated periodically)
let currentTokenPrices = { ...TOKEN_PRICES.NCH };

// Function to update token prices (would connect to price APIs in production)
function updateTokenPrices() {
    // In production, this would fetch from price APIs like CoinGecko, CoinMarketCap, etc.
    // For now, we'll use the mock prices with small random fluctuations to simulate live prices
    
    const fluctuation = 0.02; // 2% max fluctuation
    
    Object.keys(currentTokenPrices).forEach(currency => {
        const randomChange = (Math.random() - 0.5) * fluctuation;
        currentTokenPrices[currency] = TOKEN_PRICES.NCH[currency] * (1 + randomChange);
    });
}

// Update prices periodically
setInterval(updateTokenPrices, TOKEN_PRICES.updateInterval);

// Admin Configuration
const ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'admin';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'secure_password_change_this';
const ADMIN_SESSION_SECRET = process.env.ADMIN_SESSION_SECRET || 'change_this_to_secure_random_string';

// JWT Configuration for user authentication
const JWT_SECRET = process.env.JWT_SECRET || 'change_this_to_secure_random_string_for_jwt';
const JWT_EXPIRES_IN = '7d'; // Token expiration time

// PostgreSQL Database Configuration
let pool = null;
try {
    if (process.env.DATABASE_URL) {
        pool = new Pool({
            connectionString: process.env.DATABASE_URL,
            ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
            max: 20, // Maximum number of clients in the pool
            idleTimeoutMillis: 30000, // Close idle clients after 30 seconds
            connectionTimeoutMillis: 2000, // Return an error after 2 seconds if connection could not be established
        });
    } else {
        console.warn('⚠️ DATABASE_URL not set, running in in-memory mode');
    }
} catch (error) {
    console.error('Failed to create database pool:', error);
    console.warn('⚠️ Running in in-memory mode');
}

// Safe database query helper
async function safeQuery(text, params) {
    if (!pool) {
        console.warn('⚠️ Database not available, skipping query');
        return null;
    }
    try {
        return await pool.query(text, params);
    } catch (error) {
        console.error('Database query error:', error);
        return null;
    }
}

// Database connection helper
async function initializeDatabase() {
    if (!pool) {
        console.warn('⚠️ No database pool available, skipping database initialization');
        return;
    }
    
    try {
        // Test connection
        await pool.query('SELECT NOW()');
        console.log('✅ Database connected successfully');
        
        // Run schema if table doesn't exist
        try {
            const fs = require('fs');
            const schemaPath = path.join(__dirname, 'schema.sql');
            if (fs.existsSync(schemaPath)) {
                const schema = fs.readFileSync(schemaPath, 'utf8');
                await pool.query(schema);
                console.log('✅ Database schema initialized');
            } else {
                console.warn('⚠️ schema.sql not found, skipping schema initialization');
            }
        } catch (schemaError) {
            console.error('Schema initialization error:', schemaError);
            // Continue even if schema fails
        }
    } catch (error) {
        console.error('Database initialization error:', error);
        console.warn('⚠️ Continuing without database connection');
        // Continue without database if connection fails
    }
}

// Initialize database on startup (non-blocking)
initializeDatabase().catch(err => {
    console.error('Database initialization failed:', err);
});
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname)));

// Session Middleware
app.use(session({
    secret: ADMIN_SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: { 
        secure: process.env.NODE_ENV === 'production', // HTTPS only in production
        maxAge: 3600000 // 1 hour
    }
}));

// Authentication Middleware
function requireAdmin(req, res, next) {
    if (req.session.isAdmin) {
        next();
    } else {
        res.status(401).json({ success: false, error: 'Admin authentication required' });
    }
}

// JWT Authentication Middleware for regular users
function requireAuth(req, res, next) {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
        return res.status(401).json({ success: false, error: 'No token provided' });
    }
    
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded;
        next();
    } catch (error) {
        return res.status(401).json({ success: false, error: 'Invalid or expired token' });
    }
}

// JWT Helper Functions
function generateToken(userId, userType) {
    return jwt.sign(
        { userId, userType },
        JWT_SECRET,
        { expiresIn: JWT_EXPIRES_IN }
    );
}

function verifyToken(token) {
    try {
        return jwt.verify(token, JWT_SECRET);
    } catch (error) {
        return null;
    }
}

// Password Hashing Helper
async function hashPassword(password) {
    const saltRounds = 10;
    return await bcrypt.hash(password, saltRounds);
}

async function verifyPassword(password, hash) {
    return await bcrypt.compare(password, hash);
}

// In-memory fallback for revenue tracking (used if database fails)
let inMemoryRevenue = {
    totalRevenue: 0,
    transactionCount: 0,
    feeBreakdown: {
        transactionFees: 0,
        premiumFees: 0,
        verificationFees: 0,
        buyerRegistrationFees: 0,
        buyerPremiumFees: 0,
        buyerMatchingFees: 0
    },
    dailyRevenue: [],
    transactions: []
};

function inMemoryRevenueFallback(type, amount, metadata) {
    const today = new Date().toISOString().split('T')[0];
    
    inMemoryRevenue.totalRevenue += amount;
    inMemoryRevenue.transactionCount++;
    inMemoryRevenue.feeBreakdown[`${type}Fees`] += amount;
    
    const existingDay = inMemoryRevenue.dailyRevenue.find(day => day.date === today);
    if (existingDay) {
        existingDay.revenue += amount;
        existingDay.count++;
    } else {
        inMemoryRevenue.dailyRevenue.push({
            date: today,
            revenue: amount,
            count: 1
        });
    }
    
    inMemoryRevenue.transactions.push({
        type,
        amount,
        timestamp: new Date().toISOString(),
        metadata
    });
}

// Blockchain Integration Helper Functions
async function createBlockchainTransaction(registrationData) {
    try {
        const response = await axios.post(`${CHEESE_API_URL}/api/notary/stamp`, {
            hash: generateRegistrationHash(registrationData),
            fileName: `farmer-${registrationData.id}`,
            category: 'crop_registration',
            metadata: {
                type: 'farmers_consensus',
                farmerId: registrationData.id,
                farmerName: registrationData.farmerName,
                province: registrationData.province,
                municipality: registrationData.municipality,
                barangay: registrationData.barangay,
                vegetableId: registrationData.vegetableId,
                areaHa: registrationData.areaHa,
                expectedYield: registrationData.expectedYieldTons,
                plantingDate: registrationData.plantingDate,
                harvestDate: registrationData.harvestDate
            }
        });

        return response.data;
    } catch (error) {
        console.error('Blockchain transaction failed:', error);
        throw new Error('Failed to record on blockchain');
    }
}

// Revenue Tracking Functions
async function recordRevenue(type, amount, metadata = {}) {
    try {
        if (!pool) {
            console.warn('⚠️ Database not available, using in-memory fallback');
            inMemoryRevenueFallback(type, amount, metadata);
            return;
        }

        const client = await pool.connect();
        
        try {
            await client.query('BEGIN');
            
            // Record individual transaction
            await client.query(
                'INSERT INTO revenue_transactions (transaction_type, amount, related_id, metadata, transaction_timestamp) VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)',
                [type, amount, metadata.related_id || null, JSON.stringify(metadata)]
            );
            
            // Update daily revenue
            const today = new Date().toISOString().split('T')[0];
            await client.query(`
                INSERT INTO daily_revenue (date, total_revenue, transaction_count)
                VALUES ($1, $2, 1)
                ON CONFLICT (date) DO UPDATE SET
                    total_revenue = daily_revenue.total_revenue + EXCLUDED.total_revenue,
                    transaction_count = daily_revenue.transaction_count + 1
            `, [today, amount]);
            
            // Update specific fee type in daily revenue
            let feeColumn = '';
            switch(type) {
                case 'transaction': feeColumn = 'transaction_fees'; break;
                case 'premium': feeColumn = 'premium_fees'; break;
                case 'verification': feeColumn = 'verification_fees'; break;
                case 'buyerRegistration': feeColumn = 'buyer_registration_fees'; break;
                case 'buyerPremium': feeColumn = 'buyer_premium_fees'; break;
                case 'buyerMatching': feeColumn = 'buyer_matching_fees'; break;
            }
            
            if (feeColumn) {
                await client.query(`
                    UPDATE daily_revenue 
                    SET ${feeColumn} = COALESCE(${feeColumn}, 0) + $1
                    WHERE date = $2
                `, [amount, today]);
            }
            
            await client.query('COMMIT');
            
            console.log(`💰 Revenue recorded in database: ${amount} NCH (${type})`);
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    } catch (error) {
        console.error('Database revenue recording failed:', error);
        // Fallback to in-memory if database fails
        console.warn('Using in-memory fallback for revenue tracking');
        inMemoryRevenueFallback(type, amount, metadata);
    }
}

function generateRegistrationHash(data) {
    // Create a simple hash for the registration data
    const dataString = `${data.id}-${data.farmerName}-${data.province}-${data.vegetableId}-${data.areaHa}-${data.plantingDate}`;
    
    // Simple hash function (in production, use crypto.subtle)
    let hash = 0;
    for (let i = 0; i < dataString.length; i++) {
        const char = dataString.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32bit integer
    }
    
    // Convert to hex string
    return Math.abs(hash).toString(16).padStart(64, '0');
}

// API Routes

// Health check
app.get('/api/health', (req, res) => {
    res.json({
        status: 'healthy',
        service: 'farmers-consensus-api',
        blockchain_connected: true,
        cheese_api_url: CHEESE_API_URL
    });
});

// Register farmer crop (with blockchain integration)
app.post('/api/farmers/register', async (req, res) => {
    try {
        const registrationData = req.body;
        
        // Validate required fields
        if (!registrationData.farmerName || !registrationData.province || !registrationData.vegetableId) {
            return res.status(400).json({ 
                success: false, 
                error: 'Missing required fields' 
            });
        }

        // Calculate fees and rewards
        const isPremium = registrationData.premiumTier || false;
        const totalFee = TRANSACTION_FEE + (isPremium ? PREMIUM_TIER_FEE : 0);
        const netReward = REGISTRATION_REWARD - totalFee;

        // Create blockchain transaction
        const blockchainResult = await createBlockchainTransaction(registrationData);

        // Save farmer to database
        if (pool) {
            try {
                await pool.query(
                    `INSERT INTO farmers_registrations
                    (farmer_id, farmer_name, contact, province, municipality, barangay,
                     vegetable_id, area_sqm, area_ha, expected_yield_tons,
                     planting_date, harvest_date, blockchain_transaction_id, blockchain_hash, premium_tier)
                    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
                    ON CONFLICT (farmer_id) DO NOTHING`,
                    [
                        registrationData.id || `FC-${Date.now()}`,
                        registrationData.farmerName,
                        registrationData.contact || '',
                        registrationData.province,
                        registrationData.municipality || '',
                        registrationData.barangay || '',
                        registrationData.vegetableId,
                        registrationData.areaSqm || 0,
                        registrationData.areaHa || 0,
                        registrationData.expectedYieldTons || 0,
                        registrationData.plantingDate || null,
                        registrationData.harvestDate || null,
                        blockchainResult.txid || null,
                        blockchainResult.hash || null,
                        isPremium
                    ]
                );
                console.log('✅ Farmer saved to database:', registrationData.farmerName);
            } catch (dbError) {
                console.error('❌ Failed to save farmer to database:', dbError.message);
                // Continue with registration even if database save fails
            }
        } else {
            console.warn('⚠️ Database not available, skipping farmer database save');
        }

        // Record revenue for Cheese Blockchain
        recordRevenue('transaction', TRANSACTION_FEE, {
            farmerId: registrationData.id,
            farmerName: registrationData.farmerName,
            transactionId: blockchainResult.txid
        });

        if (isPremium) {
            recordRevenue('premium', PREMIUM_TIER_FEE, {
                farmerId: registrationData.id,
                farmerName: registrationData.farmerName,
                features: 'advanced_analytics, priority_verification'
            });
        }

        // Return success with blockchain receipt and fee breakdown
        res.json({
            success: true,
            message: 'Farmer registration recorded on blockchain',
            registration: registrationData,
            blockchainReceipt: {
                transactionId: blockchainResult.txid,
                hash: blockchainResult.hash,
                timestamp: new Date().toISOString()
            },
            financial: {
                grossReward: REGISTRATION_REWARD,
                transactionFee: TRANSACTION_FEE,
                premiumFee: isPremium ? PREMIUM_TIER_FEE : 0,
                totalFees: totalFee,
                netReward: netReward,
                currency: 'NCH'
            },
            reward: {
                amount: netReward,
                currency: 'NCH',
                note: 'Net reward after Cheese Blockchain fees'
            }
        });
    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Registration failed' 
        });
    }
});

// Register buyer (with blockchain integration)
app.post('/api/buyers/register', async (req, res) => {
    try {
        const buyerData = req.body;
        
        // Validate required fields
        if (!buyerData.buyerName || !buyerData.companyName || !buyerData.province) {
            return res.status(400).json({ 
                success: false, 
                error: 'Missing required fields' 
            });
        }

        // Calculate fees
        const isPremium = buyerData.premiumTier || false;
        const totalFee = BUYER_REGISTRATION_FEE + (isPremium ? BUYER_PREMIUM_FEE : 0);

        // Create blockchain transaction for buyer registration
        const blockchainResult = await createBlockchainTransaction({
            ...buyerData,
            category: 'buyer_registration'
        });

        // Save buyer to database
        if (pool) {
            try {
                await pool.query(
                    `INSERT INTO buyers 
                    (name, company_name, province, premium_tier, blockchain_txid, registration_date, 
                     contact_email, phone, business_type, annual_volume, preferred_provinces, metadata)
                    VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP, $6, $7, $8, $9, $10, $11)`,
                    [
                        buyerData.buyerName,
                        buyerData.companyName,
                        buyerData.province,
                        isPremium,
                        blockchainResult.txid,
                        buyerData.email || null,
                        buyerData.phone || null,
                        buyerData.businessType || null,
                        buyerData.annualVolume || null,
                        buyerData.preferredProvinces || null,
                        JSON.stringify(buyerData)
                    ]
                );
                console.log('Buyer saved to database:', buyerData.buyerName);
            } catch (dbError) {
                console.error('Failed to save buyer to database:', dbError);
                // Continue with registration even if database save fails
            }
        } else {
            console.warn('⚠️ Database not available, skipping buyer database save');
        }

        // Record revenue for Cheese Blockchain
        recordRevenue('buyerRegistration', BUYER_REGISTRATION_FEE, {
            buyerId: buyerData.id,
            buyerName: buyerData.buyerName,
            companyName: buyerData.companyName,
            transactionId: blockchainResult.txid
        });

        if (isPremium) {
            recordRevenue('buyerPremium', BUYER_PREMIUM_FEE, {
                buyerId: buyerData.id,
                buyerName: buyerData.buyerName,
                features: 'priority_matching, advanced_analytics, direct_farmer_access'
            });
        }

        // Return success with blockchain receipt and fee breakdown
        res.json({
            success: true,
            message: 'Buyer registration recorded on blockchain',
            registration: buyerData,
            blockchainReceipt: {
                transactionId: blockchainResult.txid,
                hash: blockchainResult.hash,
                timestamp: new Date().toISOString()
            },
            financial: {
                registrationFee: BUYER_REGISTRATION_FEE,
                premiumFee: isPremium ? BUYER_PREMIUM_FEE : 0,
                totalFees: totalFee,
                currency: 'NCH',
                note: 'Buyer registration fees support Cheese Blockchain operations'
            }
        });
    } catch (error) {
        console.error('Buyer registration error:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Buyer registration failed' 
        });
    }
});

// Record farmer-buyer match (generates matching fee)
app.post('/api/matches/create', async (req, res) => {
    try {
        const matchData = req.body;
        
        // Validate required fields
        if (!matchData.farmerId || !matchData.buyerId || !matchData.vegetableId) {
            return res.status(400).json({ 
                success: false, 
                error: 'Missing required fields' 
            });
        }

        // Create blockchain transaction for the match
        const blockchainResult = await createBlockchainTransaction({
            ...matchData,
            category: 'farmer_buyer_match'
        });

        // Save match to database
        if (pool) {
            try {
                await pool.query(
                    `INSERT INTO matches 
                    (farmer_id, buyer_id, vegetable_id, quantity, match_value, blockchain_txid, match_date, 
                     status, delivery_terms, payment_terms, metadata)
                    VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP, $7, $8, $9, $10)`,
                    [
                        matchData.farmerId,
                        matchData.buyerId,
                        matchData.vegetableId,
                        matchData.quantity || null,
                        matchData.matchValue || null,
                        blockchainResult.txid,
                        matchData.status || 'pending',
                        matchData.deliveryTerms || null,
                        matchData.paymentTerms || null,
                        JSON.stringify(matchData)
                    ]
                );
                console.log('Match saved to database:', matchData.farmerId, '-', matchData.buyerId);
            } catch (dbError) {
                console.error('Failed to save match to database:', dbError);
                // Continue with matching even if database save fails
            }
        } else {
            console.warn('⚠️ Database not available, skipping match database save');
        }

        // Record matching fee revenue
        recordRevenue('buyerMatching', BUYER_MATCHING_FEE, {
            farmerId: matchData.farmerId,
            buyerId: matchData.buyerId,
            vegetableId: matchData.vegetableId,
            quantity: matchData.quantity,
            matchValue: matchData.matchValue,
            transactionId: blockchainResult.txid
        });

        res.json({
            success: true,
            message: 'Farmer-buyer match recorded on blockchain',
            match: matchData,
            blockchainReceipt: {
                transactionId: blockchainResult.txid,
                hash: blockchainResult.hash,
                timestamp: new Date().toISOString()
            },
            financial: {
                matchingFee: BUYER_MATCHING_FEE,
                currency: 'NCH'
            }
        });
    } catch (error) {
        console.error('Match creation error:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Match creation failed' 
        });
    }
});

// Get blockchain status
app.get('/api/blockchain/status', async (req, res) => {
    try {
        const response = await axios.get(`${CHEESE_API_URL}/api/health`);
        res.json({
            success: true,
            blockchain: response.data
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: 'Unable to connect to Cheese Blockchain'
        });
    }
});

// Get registration statistics (from blockchain)
// GET all farmer registrations (for frontend hydration from DB)
app.get('/api/farmers/registrations', async (req, res) => {
    try {
        const result = await safeQuery(
            `SELECT farmer_id as id, farmer_name as "farmerName", contact, province,
                    municipality, barangay, vegetable_id as "vegetableId",
                    area_sqm as "areaSqm", area_ha as "areaHa",
                    expected_yield_tons as "expectedYieldTons",
                    planting_date as "plantingDate", harvest_date as "harvestDate",
                    registration_timestamp as timestamp,
                    blockchain_transaction_id as "blockchainTxId"
             FROM farmers_registrations
             ORDER BY registration_timestamp DESC
             LIMIT 500`,
            []
        );

        res.json({
            success: true,
            registrations: result ? result.rows : [],
            count: result ? result.rows.length : 0
        });
    } catch (error) {
        console.error('Failed to fetch registrations:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch registrations' });
    }
});

app.get('/api/farmers/statistics', async (req, res) => {
    try {
        // This would query the blockchain for all crop registration transactions
        // For now, return mock data
        res.json({
            success: true,
            statistics: {
                totalRegistrations: 0,
                totalAreaHectares: 0,
                provinces: [],
                topCrops: []
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: 'Failed to fetch statistics'
        });
    }
});

// Admin Authentication Endpoints
app.post('/api/admin/login', (req, res) => {
    const { username, password } = req.body;
    
    if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
        req.session.isAdmin = true;
        res.json({ 
            success: true, 
            message: 'Admin login successful' 
        });
    } else {
        res.status(401).json({ 
            success: false, 
            error: 'Invalid credentials' 
        });
    }
});

app.post('/api/admin/logout', (req, res) => {
    req.session.destroy();
    res.json({ 
        success: true, 
        message: 'Admin logout successful' 
    });
});

app.get('/api/admin/check', (req, res) => {
    res.json({ 
        success: true, 
        isAdmin: !!req.session.isAdmin 
    });
});

// ===== USER AUTHENTICATION ENDPOINTS =====

// User Registration
app.post('/api/auth/register', async (req, res) => {
    try {
        const { email, password, fullName, userType, registrationId } = req.body;
        
        // Validate input
        if (!email || !password || !fullName || !userType) {
            return res.status(400).json({ 
                success: false, 
                error: 'Missing required fields' 
            });
        }
        
        if (!['farmer', 'buyer'].includes(userType)) {
            return res.status(400).json({ 
                success: false, 
                error: 'Invalid user type' 
            });
        }
        
        // Check if email already exists
        const existingUser = await safeQuery(
            'SELECT id FROM users WHERE email = $1',
            [email.toLowerCase()]
        );
        
        if (existingUser && existingUser.rows.length > 0) {
            return res.status(409).json({ 
                success: false, 
                error: 'Email already registered' 
            });
        }
        
        // Hash password
        const passwordHash = await hashPassword(password);
        
        // Create user account
        const result = await safeQuery(
            `INSERT INTO users (email, password_hash, full_name, user_type, registration_id, wallet_address)
             VALUES ($1, $2, $3, $4, $5, $6)
             RETURNING id, email, full_name, user_type, created_at`,
            [email.toLowerCase(), passwordHash, fullName, userType, registrationId || null, null]
        );
        
        if (result && result.rows[0]) {
            const newUser = result.rows[0];
            
            // Initialize NCH balance for new user
            await safeQuery(
                `INSERT INTO user_balances (user_id, token_symbol, balance, total_earned)
                 VALUES ($1, 'NCH', 0, 0)`,
                [newUser.id]
            );
            
            // Give registration reward if it's a farmer or buyer
            if (registrationId) {
                const rewardAmount = userType === 'farmer' ? REGISTRATION_REWARD : REGISTRATION_REWARD;
                
                await safeQuery(
                    `INSERT INTO user_rewards (user_id, reward_type, reward_amount, reward_token, description)
                     VALUES ($1, 'registration', $2, 'NCH', 'Welcome bonus for joining Farmers Consensus')`,
                    [newUser.id, rewardAmount]
                );
                
                // Update user balance with reward
                await safeQuery(
                    `UPDATE user_balances 
                     SET balance = balance + $1, total_earned = total_earned + $1,
                     last_updated = CURRENT_TIMESTAMP
                     WHERE user_id = $2`,
                    [rewardAmount, newUser.id]
                );
            }
            
            // Generate JWT token
            const token = generateToken(newUser.id, newUser.user_type);
            
            res.status(201).json({
                success: true,
                message: 'Registration successful',
                user: {
                    id: newUser.id,
                    email: newUser.email,
                    fullName: newUser.fullName,
                    userType: newUser.user_type
                },
                token
            });
        } else {
            // Fallback for in-memory mode
            res.status(201).json({
                success: true,
                message: 'Registration successful (in-memory mode)',
                user: {
                    id: Date.now(),
                    email: email,
                    fullName,
                    userType
                },
                token: 'mock_token_' + Date.now()
            });
        }
    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Registration failed' 
        });
    }
});

// User Login
app.post('/api/auth/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        
        if (!email || !password) {
            return res.status(400).json({ 
                success: false, 
                error: 'Email and password required' 
            });
        }
        
        // Find user by email
        const result = await safeQuery(
            'SELECT * FROM users WHERE email = $1 AND is_active = true',
            [email.toLowerCase()]
        );
        
        if (result && result.rows.length > 0) {
            const user = result.rows[0];
            
            // Verify password
            const isValidPassword = await verifyPassword(password, user.password_hash);
            
            if (isValidPassword) {
                // Log user activity
                await safeQuery(
                    `INSERT INTO user_activity (user_id, activity_type, activity_description, ip_address)
                     VALUES ($1, 'login', 'User logged in', $2)`,
                    [user.id, req.ip]
                );
                
                // Generate JWT token
                const token = generateToken(user.id, user.user_type);
                
                res.json({
                    success: true,
                    message: 'Login successful',
                    user: {
                        id: user.id,
                        email: user.email,
                        fullName: user.full_name,
                        userType: user.user_type,
                        walletAddress: user.wallet_address
                    },
                    token
                });
            } else {
                res.status(401).json({ 
                    success: false, 
                    error: 'Invalid credentials' 
                });
            }
        } else {
            res.status(401).json({ 
                success: false, 
                error: 'User not found' 
            });
        }
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Login failed' 
        });
    }
});

// Get User Profile
app.get('/api/user/profile', requireAuth, async (req, res) => {
    try {
        const userId = req.user.userId;
        
        const userResult = await safeQuery(
            'SELECT id, email, full_name, user_type, wallet_address, created_at FROM users WHERE id = $1',
            [userId]
        );
        
        if (userResult && userResult.rows.length > 0) {
            const user = userResult.rows[0];
            
            // Get user's NCH balance
            const balanceResult = await safeQuery(
                'SELECT balance, total_earned, frozen_balance FROM user_balances WHERE user_id = $1 AND token_symbol = $2',
                [userId, 'NCH']
            );
            
            const nchBalance = balanceResult && balanceResult.rows.length > 0 ? balanceResult.rows[0] : {
                balance: 0,
                total_earned: 0,
                frozen_balance: 0
            };
            
            // Get user's recent rewards
            const rewardsResult = await safeQuery(
                `SELECT reward_type, reward_amount, reward_token, description, created_at, is_claimed
                 FROM user_rewards 
                 WHERE user_id = $1 
                 ORDER BY created_at DESC 
                 LIMIT 10`,
                [userId]
            );
            
            res.json({
                success: true,
                user: {
                    ...user,
                    nchBalance: nchBalance.balance,
                    totalEarned: nchBalance.total_earned,
                    frozenBalance: nchBalance.frozen_balance
                },
                recentRewards: rewardsResult ? rewardsResult.rows : []
            });
        } else {
            res.status(404).json({ 
                success: false, 
                error: 'User not found' 
            });
        }
    } catch (error) {
        console.error('Profile fetch error:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Failed to fetch profile' 
        });
    }
});

// Update User Profile
app.put('/api/user/profile', requireAuth, async (req, res) => {
    try {
        const userId = req.user.userId;
        const { fullName, walletAddress } = req.body;
        
        const updateFields = [];
        const values = [];
        const paramCount = [];
        
        if (fullName) {
            updateFields.push('full_name = $1');
            values.push(fullName);
            paramCount.push(++paramCount.length);
        }
        
        if (walletAddress) {
            updateFields.push('wallet_address = $1');
            values.push(walletAddress);
            paramCount.push(++paramCount.length);
        }
        
        if (updateFields.length === 0) {
            return res.status(400).json({ 
                success: false, 
                error: 'No fields to update' 
            });
        }
        
        values.push(userId);
        
        const result = await safeQuery(
            `UPDATE users SET ${updateFields.join(', ')} WHERE id = $${paramCount.length} RETURNING *`,
            values
        );
        
        if (result && result.rows.length > 0) {
            res.json({
                success: true,
                message: 'Profile updated successfully',
                user: result.rows[0]
            });
        } else {
            res.status(404).json({ 
                success: false, 
                error: 'User not found' 
            });
        }
    } catch (error) {
        console.error('Profile update error:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Failed to update profile' 
        });
    }
});

// Get User Balance
app.get('/api/user/balance', requireAuth, async (req, res) => {
    try {
        const userId = req.user.userId;
        
        const result = await safeQuery(
            'SELECT token_symbol, balance, total_earned, frozen_balance FROM user_balances WHERE user_id = $1',
            [userId]
        );
        
        res.json({
            success: true,
            balances: result ? result.rows : []
        });
    } catch (error) {
        console.error('Balance fetch error:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Failed to fetch balance' 
        });
    }
});

// Claim Rewards
app.post('/api/user/rewards/claim', requireAuth, async (req, res) => {
    try {
        const userId = req.user.userId;
        const { rewardId } = req.body;
        
        // Get reward details
        const rewardResult = await safeQuery(
            'SELECT * FROM user_rewards WHERE id = $1 AND user_id = $2 AND is_claimed = false',
            [rewardId, userId]
        );
        
        if (rewardResult && rewardResult.rows.length > 0) {
            const reward = rewardResult.rows[0];
            
            // Mark as claimed
            await safeQuery(
                'UPDATE user_rewards SET is_claimed = true, claimed_at = CURRENT_TIMESTAMP WHERE id = $1',
                [rewardId]
            );
            
            // Add to user balance
            await safeQuery(
                `UPDATE user_balances 
                 SET balance = balance + $1, total_earned = total_earned + $1,
                 last_updated = CURRENT_TIMESTAMP 
                 WHERE user_id = $2 AND token_symbol = $3`,
                [reward.reward_amount, userId, reward.reward_token]
            );
            
            res.json({
                success: true,
                message: 'Reward claimed successfully',
                claimedAmount: reward.reward_amount,
                token: reward.reward_token
            });
        } else {
            res.status(404).json({ 
                success: false, 
                error: 'Reward not found or already claimed' 
            });
        }
    } catch (error) {
        console.error('Reward claim error:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Failed to claim reward' 
        });
    }
});

// User Logout
app.post('/api/auth/logout', requireAuth, async (req, res) => {
    try {
        const userId = req.user.userId;
        
        // Log logout activity
        await safeQuery(
            `INSERT INTO user_activity (user_id, activity_type, activity_description, ip_address)
             VALUES ($1, 'logout', 'User logged out', $2)`,
            [userId, req.ip]
        );
        
        res.json({
            success: true,
            message: 'Logged out successfully'
        });
    } catch (error) {
        console.error('Logout error:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Logout failed' 
        });
    }
});

// Get User Activity History
app.get('/api/user/activity', requireAuth, async (req, res) => {
    try {
        const userId = req.user.userId;
        const limit = parseInt(req.query.limit) || 20;
        
        const result = await safeQuery(
            `SELECT activity_type, activity_description, created_at 
             FROM user_activity 
             WHERE user_id = $1 
             ORDER BY created_at DESC 
             LIMIT $2`,
            [userId, limit]
        );
        
        res.json({
            success: true,
            activities: result ? result.rows : []
        });
    } catch (error) {
        console.error('Activity fetch error:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Failed to fetch activity' 
        });
    }
});

// ===== REWARDS SYSTEM ENDPOINTS =====

// Reward Configuration
const REWARD_CONFIG = {
    registration: REGISTRATION_REWARD,
    first_crop_registration: 5,
    referral_bonus: 15,
    weekly_activity_bonus: 2,
    milestone_rewards: {
        first_5_crops: 10,
        first_10_crops: 25,
        first_20_crops: 50,
        first_50_crops: 100
    },
    seasonal_bonus: 20,
    verification_bonus: 3
};

// Grant reward to user
async function grantReward(userId, rewardType, rewardAmount, token, description) {
    try {
        await safeQuery(
            `INSERT INTO user_rewards (user_id, reward_type, reward_amount, reward_token, description)
             VALUES ($1, $2, $3, $4, $5)`,
            [userId, rewardType, rewardAmount, token, description]
        );
        
        // Update user balance
        await safeQuery(
            `UPDATE user_balances 
             SET balance = balance + $1, total_earned = total_earned + $1,
             last_updated = CURRENT_TIMESTAMP 
             WHERE user_id = $2 AND token_symbol = $3`,
            [rewardAmount, userId, token]
        );
        
        // Log reward activity
        await safeQuery(
            `INSERT INTO user_activity (user_id, activity_type, activity_description, ip_address)
             VALUES ($1, 'reward', 'Received reward: ' + $2, $3)`,
            [userId, description, '127.0.0.1']
        );
        
        return true;
    } catch (error) {
        console.error('Error granting reward:', error);
        return false;
    }
}

// Get available rewards for user
app.get('/api/user/rewards', requireAuth, async (req, res) => {
    try {
        const userId = req.user.userId;
        
        const result = await safeQuery(
            `SELECT id, reward_type, reward_amount, reward_token, description, created_at, is_claimed
             FROM user_rewards 
             WHERE user_id = $1 
             ORDER BY created_at DESC`,
            [userId]
        );
        
        res.json({
            success: true,
            rewards: result ? result.rows : []
        });
    } catch (error) {
        console.error('Rewards fetch error:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Failed to fetch rewards' 
        });
    }
});

// Get reward statistics
app.get('/api/user/rewards/stats', requireAuth, async (req, res) => {
    try {
        const userId = req.user.userId;
        
        // Get total rewards earned
        const totalResult = await safeQuery(
            `SELECT COALESCE(SUM(reward_amount), 0) as total_rewards
             FROM user_rewards 
             WHERE user_id = $1`,
            [userId]
        );
        
        // Get claimed vs unclaimed
        const claimedResult = await safeQuery(
            `SELECT 
                COALESCE(SUM(CASE WHEN is_claimed = true THEN reward_amount ELSE 0 END), 0) as claimed,
                COALESCE(SUM(CASE WHEN is_claimed = false THEN reward_amount ELSE 0 END), 0) as unclaimed
             FROM user_rewards 
             WHERE user_id = $1`,
            [userId]
        );
        
        // Get reward breakdown by type
        const breakdownResult = await safeQuery(
            `SELECT reward_type, COUNT(*) as count, SUM(reward_amount) as total
             FROM user_rewards 
             WHERE user_id = $1 
             GROUP BY reward_type 
             ORDER BY total DESC`,
            [userId]
        );
        
        res.json({
            success: true,
            stats: {
                totalRewards: totalResult?.rows[0]?.total_rewards || 0,
                claimed: claimedResult?.rows[0]?.claimed || 0,
                unclaimed: claimedResult?.rows[0]?.unclaimed || 0,
                breakdown: breakdownResult?.rows || []
            }
        });
    } catch (error) {
        console.error('Reward stats error:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Failed to fetch reward statistics' 
        });
    }
});

// Trigger milestone reward
app.post('/api/user/rewards/milestone', requireAuth, async (req, res) => {
    try {
        const userId = req.user.userId;
        const { milestoneType } = req.body;
        
        if (!REWARD_CONFIG.milestone_rewards[milestoneType]) {
            return res.status(400).json({ 
                success: false, 
                error: 'Invalid milestone type' 
            });
        }
        
        // Check if milestone already achieved
        const existingReward = await safeQuery(
            `SELECT id FROM user_rewards 
             WHERE user_id = $1 AND reward_type = $2`,
            [userId, milestoneType]
        );
        
        if (existingReward && existingReward.rows.length > 0) {
            return res.status(400).json({ 
                success: false, 
                error: 'Milestone already claimed' 
            });
        }
        
        const rewardAmount = REWARD_CONFIG.milestone_rewards[milestoneType];
        const description = `Milestone achieved: ${milestoneType.replace(/_/g, ' ')}`;
        
        const granted = await grantReward(userId, milestoneType, rewardAmount, 'NCH', description);
        
        if (granted) {
            res.json({
                success: true,
                message: 'Milestone reward granted successfully',
                rewardAmount,
                rewardType: milestoneType
            });
        } else {
            res.status(500).json({ 
                success: false, 
                error: 'Failed to grant milestone reward' 
            });
        }
    } catch (error) {
        console.error('Milestone reward error:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Failed to process milestone reward' 
        });
    }
});

// Leaderboard endpoint
app.get('/api/rewards/leaderboard', async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 10;
        
        const result = await safeQuery(
            `SELECT u.id, u.full_name, u.user_type, COALESCE(SUM(ur.reward_amount), 0) as total_rewards
             FROM users u
             LEFT JOIN user_rewards ur ON u.id = ur.user_id
             WHERE u.is_active = true
             GROUP BY u.id, u.full_name, u.user_type
             ORDER BY total_rewards DESC
             LIMIT $1`,
            [limit]
        );
        
        res.json({
            success: true,
            leaderboard: result ? result.rows : []
        });
    } catch (error) {
        console.error('Leaderboard error:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Failed to fetch leaderboard' 
        });
    }
});

// ===== TOKEN PRICE ENDPOINTS =====

// Get current token prices
app.get('/api/tokens/prices', async (req, res) => {
    try {
        // Update prices before returning
        updateTokenPrices();
        
        res.json({
            success: true,
            token: 'NCH',
            prices: currentTokenPrices,
            lastUpdated: new Date().toISOString()
        });
    } catch (error) {
        console.error('Price fetch error:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Failed to fetch token prices' 
        });
    }
});

// Convert NCH to other currencies
app.get('/api/tokens/convert', async (req, res) => {
    try {
        const { amount, from = 'NCH', to = 'USD' } = req.query;
        
        if (!amount || isNaN(amount)) {
            return res.status(400).json({ 
                success: false, 
                error: 'Invalid amount' 
            });
        }
        
        const nchAmount = from.toUpperCase() === 'NCH' ? parseFloat(amount) : parseFloat(amount) / currentTokenPrices[from.toUpperCase()];
        const convertedAmount = nchAmount * (currentTokenPrices[to.toUpperCase()] || 0);
        
        res.json({
            success: true,
            from: { amount: parseFloat(amount), currency: from.toUpperCase() },
            to: { amount: convertedAmount, currency: to.toUpperCase() },
            rate: currentTokenPrices[to.toUpperCase()] || 0,
            nchAmount
        });
    } catch (error) {
        console.error('Conversion error:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Failed to convert tokens' 
        });
    }
});

// Get token price history (mock data)
app.get('/api/tokens/history', async (req, res) => {
    try {
        const { timeframe = '24h', currency = 'USD' } = req.query;
        
        // Generate mock price history based on timeframe
        const points = timeframe === '24h' ? 24 : timeframe === '7d' ? 7 : 30;
        const history = [];
        
        for (let i = points; i >= 0; i--) {
            const date = new Date();
            if (timeframe === '24h') {
                date.setHours(date.getHours() - i);
            } else if (timeframe === '7d') {
                date.setDate(date.getDate() - i);
            } else {
                date.setDate(date.getDate() - i);
            }
            
            const basePrice = currentTokenPrices[currency.toUpperCase()] || TOKEN_PRICES.NCH[currency.toUpperCase()];
            const randomChange = (Math.random() - 0.5) * 0.1; // 5% variation
            const price = basePrice * (1 + randomChange);
            
            history.push({
                timestamp: date.toISOString(),
                price: price,
                currency: currency.toUpperCase()
            });
        }
        
        res.json({
            success: true,
            token: 'NCH',
            timeframe,
            currency: currency.toUpperCase(),
            history
        });
    } catch (error) {
        console.error('Price history error:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Failed to fetch price history' 
        });
    }
});

// Revenue Analytics Endpoint (Admin Only)
app.get('/api/revenue/analytics', requireAdmin, async (req, res) => {
    try {
        const { timeframe = 'all' } = req.query;
        
        // If database not available, use in-memory fallback immediately
        if (!pool) {
            console.warn('⚠️ Database not available, using in-memory fallback for analytics');
            
            let filteredRevenue = inMemoryRevenue.dailyRevenue;
            if (timeframe === '7d') {
                const sevenDaysAgo = new Date();
                sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
                filteredRevenue = inMemoryRevenue.dailyRevenue.filter(day => 
                    new Date(day.date) >= sevenDaysAgo
                );
            } else if (timeframe === '30d') {
                const thirtyDaysAgo = new Date();
                thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
                filteredRevenue = inMemoryRevenue.dailyRevenue.filter(day => 
                    new Date(day.date) >= thirtyDaysAgo
                );
            }
            
            res.json({
                success: true,
                analytics: {
                    totalRevenue: inMemoryRevenue.totalRevenue,
                    totalTransactions: inMemoryRevenue.transactionCount,
                    feeBreakdown: inMemoryRevenue.feeBreakdown,
                    averageFeePerTransaction: inMemoryRevenue.transactionCount > 0 
                        ? (inMemoryRevenue.totalRevenue / inMemoryRevenue.transactionCount).toFixed(2) 
                        : 0,
                    dailyRevenue: filteredRevenue,
                    recentTransactions: inMemoryRevenue.transactions.slice(-10),
                    revenueGrowth: calculateRevenueGrowth()
                }
            });
            return;
        }
        
        let dateFilter = '';
        if (timeframe === '7d') {
            const sevenDaysAgo = new Date();
            sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
            dateFilter = `AND transaction_timestamp >= '${sevenDaysAgo.toISOString()}'`;
        } else if (timeframe === '30d') {
            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
            dateFilter = `AND transaction_timestamp >= '${thirtyDaysAgo.toISOString()}'`;
        }
        
        // Try to use database first
        try {
            // Get total revenue from database
            const totalRevenueResult = await pool.query(
                'SELECT COALESCE(SUM(amount), 0) as total_revenue FROM revenue_transactions WHERE 1=1 ' + dateFilter
            );
            
            const transactionCountResult = await pool.query(
                'SELECT COUNT(*) as count FROM revenue_transactions WHERE 1=1 ' + dateFilter
            );
            
            // Get fee breakdown
            const feeBreakdownResult = await pool.query(`
                SELECT 
                    COALESCE(SUM(CASE WHEN transaction_type = 'transaction' THEN amount END), 0) as transaction_fees,
                    COALESCE(SUM(CASE WHEN transaction_type = 'premium' THEN amount END), 0) as premium_fees,
                    COALESCE(SUM(CASE WHEN transaction_type = 'verification' THEN amount END), 0) as verification_fees,
                    COALESCE(SUM(CASE WHEN transaction_type = 'buyerRegistration' THEN amount END), 0) as buyer_registration_fees,
                    COALESCE(SUM(CASE WHEN transaction_type = 'buyerPremium' THEN amount END), 0) as buyer_premium_fees,
                    COALESCE(SUM(CASE WHEN transaction_type = 'buyerMatching' THEN amount END), 0) as buyer_matching_fees
                FROM revenue_transactions 
                WHERE 1=1 ${dateFilter}
            `);
            
            // Get recent transactions
            const recentTransactionsResult = await pool.query(
                'SELECT transaction_type, amount, transaction_timestamp, metadata FROM revenue_transactions ' +
                'WHERE 1=1 ' + dateFilter + ' ' +
                'ORDER BY transaction_timestamp DESC LIMIT 10'
            );
            
            // Get daily revenue
            const dailyRevenueResult = await pool.query(`
                SELECT date, total_revenue as revenue, transaction_count as count 
                FROM daily_revenue 
                WHERE 1=1 ${dateFilter}
                ORDER BY date DESC
            `);
            
            const analytics = {
                totalRevenue: parseFloat(totalRevenueResult.rows[0].total_revenue),
                totalTransactions: parseInt(transactionCountResult.rows[0].count),
                feeBreakdown: {
                    transactionFees: parseFloat(feeBreakdownResult.rows[0].transaction_fees),
                    premiumFees: parseFloat(feeBreakdownResult.rows[0].premium_fees),
                    verificationFees: parseFloat(feeBreakdownResult.rows[0].verification_fees),
                    buyerRegistrationFees: parseFloat(feeBreakdownResult.rows[0].buyer_registration_fees),
                    buyerPremiumFees: parseFloat(feeBreakdownResult.rows[0].buyer_premium_fees),
                    buyerMatchingFees: parseFloat(feeBreakdownResult.rows[0].buyer_matching_fees)
                },
                averageFeePerTransaction: transactionCountResult.rows[0].count > 0 
                    ? (parseFloat(totalRevenueResult.rows[0].total_revenue) / parseInt(transactionCountResult.rows[0].count)).toFixed(2) 
                    : 0,
                dailyRevenue: dailyRevenueResult.rows,
                recentTransactions: recentTransactionsResult.rows.map(tx => ({
                    type: tx.transaction_type,
                    amount: parseFloat(tx.amount),
                    timestamp: tx.transaction_timestamp,
                    metadata: JSON.parse(tx.metadata)
                })),
                revenueGrowth: calculateRevenueGrowth()
            };
            
            res.json({
                success: true,
                analytics
            });
        } catch (dbError) {
            // Fallback to in-memory if database fails
            console.warn('Database query failed, using in-memory fallback:', dbError);
            
            let filteredRevenue = inMemoryRevenue.dailyRevenue;
            if (timeframe === '7d') {
                const sevenDaysAgo = new Date();
                sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
                filteredRevenue = inMemoryRevenue.dailyRevenue.filter(day => 
                    new Date(day.date) >= sevenDaysAgo
                );
            } else if (timeframe === '30d') {
                const thirtyDaysAgo = new Date();
                thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
                filteredRevenue = inMemoryRevenue.dailyRevenue.filter(day => 
                    new Date(day.date) >= thirtyDaysAgo
                );
            }
            
            res.json({
                success: true,
                analytics: {
                    totalRevenue: inMemoryRevenue.totalRevenue,
                    totalTransactions: inMemoryRevenue.transactionCount,
                    feeBreakdown: inMemoryRevenue.feeBreakdown,
                    averageFeePerTransaction: inMemoryRevenue.transactionCount > 0 
                        ? (inMemoryRevenue.totalRevenue / inMemoryRevenue.transactionCount).toFixed(2) 
                        : 0,
                    dailyRevenue: filteredRevenue,
                    recentTransactions: inMemoryRevenue.transactions.slice(-10),
                    revenueGrowth: calculateRevenueGrowth()
                }
            });
        }
    } catch (error) {
        console.error('Failed to fetch revenue analytics:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch revenue analytics'
        });
    }
});

// Helper function to calculate revenue growth
function calculateRevenueGrowth() {
    if (inMemoryRevenue.dailyRevenue.length < 2) return 0;
    
    const latest = inMemoryRevenue.dailyRevenue[inMemoryRevenue.dailyRevenue.length - 1];
    const previous = inMemoryRevenue.dailyRevenue[inMemoryRevenue.dailyRevenue.length - 2];
    
    if (previous.revenue === 0) return 0;
    
    const growth = ((latest.revenue - previous.revenue) / previous.revenue) * 100;
    return growth.toFixed(2);
}

// Serve frontend for all other routes
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Start server
app.listen(process.env.PORT || PORT, () => {
    const actualPort = process.env.PORT || PORT;
    console.log(`🌾 Farmers Consensus API Server running on port ${actualPort}`);
    console.log(`🧀 Connected to Cheese Blockchain at ${CHEESE_API_URL}`);
    console.log(`📱 Frontend available at http://localhost:${actualPort}`);
});
