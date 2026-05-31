require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const axios = require('axios');
const session = require('express-session');
const { Pool } = require('pg');

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

// Admin Configuration
const ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'admin';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'secure_password_change_this';
const ADMIN_SESSION_SECRET = process.env.ADMIN_SESSION_SECRET || 'change_this_to_secure_random_string';

// PostgreSQL Database Configuration
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// Database connection helper
async function initializeDatabase() {
    try {
        // Test connection
        await pool.query('SELECT NOW()');
        console.log('✅ Database connected successfully');
        
        // Run schema if table doesn't exist
        const schema = require('fs').readFileSync('./schema.sql', 'utf8');
        await pool.query(schema);
        console.log('✅ Database schema initialized');
    } catch (error) {
        console.error('Database initialization error:', error);
        // Continue without database if connection fails
    }
}

// Initialize database on startup
initializeDatabase();
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
        try {
            await pool.query(
                `INSERT INTO farmers 
                (name, province, vegetable_id, premium_tier, blockchain_txid, registration_date, 
                 crop_size, soil_type, irrigation_type, harvest_date, farm_coordinates, metadata)
                VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP, $6, $7, $8, $9, $10, $11)`,
                [
                    registrationData.farmerName,
                    registrationData.province,
                    registrationData.vegetableId,
                    isPremium,
                    blockchainResult.txid,
                    registrationData.cropSize || null,
                    registrationData.soilType || null,
                    registrationData.irrigationType || null,
                    registrationData.harvestDate || null,
                    registrationData.farmCoordinates || null,
                    JSON.stringify(registrationData)
                ]
            );
            console.log('Farmer saved to database:', registrationData.farmerName);
        } catch (dbError) {
            console.error('Failed to save farmer to database:', dbError);
            // Continue with registration even if database save fails
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

// Revenue Analytics Endpoint (Admin Only)
app.get('/api/revenue/analytics', requireAdmin, async (req, res) => {
    try {
        const { timeframe = 'all' } = req.query;
        
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
