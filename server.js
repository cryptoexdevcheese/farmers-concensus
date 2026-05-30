require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const axios = require('axios');
const session = require('express-session');

const app = express();
const PORT = process.env.PORT || 3000;

// Cheese Blockchain Configuration
const CHEESE_API_URL = process.env.CHEESE_BLOCKCHAIN_API_URL || 'http://165.22.252.113:8080';
const TREASURY_WALLET = process.env.FARMERS_CONSENSUS_TREASURY_WALLET || '0x7e73806ef3E8e11b9a226672Df5EC8E816EDA56D';
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

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname)));

// Session Middleware
app.use(session({
    secret: ADMIN_SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: { 
        secure: false, // Set to true in production with HTTPS
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

// Revenue Tracking (in-memory for demo, use database in production)
let revenueData = {
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
function recordRevenue(type, amount, metadata = {}) {
    const today = new Date().toISOString().split('T')[0];
    
    revenueData.totalRevenue += amount;
    revenueData.transactionCount++;
    revenueData.feeBreakdown[`${type}Fees`] += amount;
    
    // Track daily revenue
    const existingDay = revenueData.dailyRevenue.find(day => day.date === today);
    if (existingDay) {
        existingDay.revenue += amount;
        existingDay.count++;
    } else {
        revenueData.dailyRevenue.push({
            date: today,
            revenue: amount,
            count: 1
        });
    }
    
    // Track individual transaction
    revenueData.transactions.push({
        type,
        amount,
        timestamp: new Date().toISOString(),
        metadata
    });
    
    console.log(`💰 Revenue recorded: ${amount} NCH (${type}) - Total: ${revenueData.totalRevenue} NCH`);
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
app.get('/api/revenue/analytics', requireAdmin, (req, res) => {
    try {
        const { timeframe = 'all' } = req.query;
        
        let filteredRevenue = revenueData.dailyRevenue;
        if (timeframe === '7d') {
            const sevenDaysAgo = new Date();
            sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
            filteredRevenue = revenueData.dailyRevenue.filter(day => 
                new Date(day.date) >= sevenDaysAgo
            );
        } else if (timeframe === '30d') {
            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
            filteredRevenue = revenueData.dailyRevenue.filter(day => 
                new Date(day.date) >= thirtyDaysAgo
            );
        }

        res.json({
            success: true,
            analytics: {
                totalRevenue: revenueData.totalRevenue,
                totalTransactions: revenueData.transactionCount,
                feeBreakdown: revenueData.feeBreakdown,
                averageFeePerTransaction: revenueData.transactionCount > 0 
                    ? (revenueData.totalRevenue / revenueData.transactionCount).toFixed(2) 
                    : 0,
                dailyRevenue: filteredRevenue,
                recentTransactions: revenueData.transactions.slice(-10),
                revenueGrowth: calculateRevenueGrowth()
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: 'Failed to fetch revenue analytics'
        });
    }
});

// Helper function to calculate revenue growth
function calculateRevenueGrowth() {
    if (revenueData.dailyRevenue.length < 2) return 0;
    
    const latest = revenueData.dailyRevenue[revenueData.dailyRevenue.length - 1];
    const previous = revenueData.dailyRevenue[revenueData.dailyRevenue.length - 2];
    
    if (previous.revenue === 0) return 0;
    
    const growth = ((latest.revenue - previous.revenue) / previous.revenue) * 100;
    return growth.toFixed(2);
}

// Serve frontend for all other routes
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Start server
app.listen(PORT, () => {
    console.log(`🌾 Farmers Consensus API Server running on port ${PORT}`);
    console.log(`🧀 Connected to Cheese Blockchain at ${CHEESE_API_URL}`);
    console.log(`📱 Frontend available at http://localhost:${PORT}`);
});
