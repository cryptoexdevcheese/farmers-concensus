// Admin Panel JavaScript
document.addEventListener('DOMContentLoaded', () => {
    initLucide();
    checkAdminSession();
    initAdminLogin();
    initAdminLogout();
    initMobileEnhancements();
});

// Initialize Lucide icons
function initLucide() {
    if (typeof lucide !== 'undefined') {
        lucide.createIcons();
    }
}

// Check if admin is logged in
async function checkAdminSession() {
    try {
        const response = await fetch('/api/admin/check');
        const result = await response.json();
        
        if (result.isAdmin) {
            showAdminDashboard();
        } else {
            showAdminLogin();
        }
    } catch (error) {
        console.error('Session check failed:', error);
        showAdminLogin();
    }
}

// Show admin login form
function showAdminLogin() {
    document.getElementById('admin-login-section').classList.remove('hidden');
    document.getElementById('admin-dashboard-section').classList.add('hidden');
}

// Show admin dashboard
function showAdminDashboard() {
    document.getElementById('admin-login-section').classList.add('hidden');
    document.getElementById('admin-dashboard-section').classList.remove('hidden');
    initRevenueDashboard();
}

// Initialize admin login form
function initAdminLogin() {
    const form = document.getElementById('admin-login-form');
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const username = document.getElementById('admin-username').value;
        const password = document.getElementById('admin-password').value;
        
        try {
            const response = await fetch('/api/admin/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            });
            
            const result = await response.json();
            
            if (result.success) {
                showAdminDashboard();
            } else {
                showLoginError(result.error);
            }
        } catch (error) {
            showLoginError('Login failed. Please try again.');
        }
    });
}

// Show login error
function showLoginError(message) {
    const errorDiv = document.getElementById('login-error');
    errorDiv.textContent = message;
    errorDiv.classList.remove('hidden');
    
    setTimeout(() => {
        errorDiv.classList.add('hidden');
    }, 3000);
}

// Initialize admin logout
function initAdminLogout() {
    const logoutBtn = document.getElementById('admin-logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', async () => {
            try {
                await fetch('/api/admin/logout', { method: 'POST' });
                showAdminLogin();
            } catch (error) {
                console.error('Logout failed:', error);
            }
        });
    }
}

// Revenue Dashboard Functions
async function fetchRevenueAnalytics(timeframe = 'all') {
    try {
        const response = await fetch(`/api/revenue/analytics?timeframe=${timeframe}`);
        const result = await response.json();
        
        if (result.success) {
            updateRevenueDashboard(result.analytics);
        }
    } catch (error) {
        console.error('Failed to fetch revenue analytics:', error);
    }
}

function updateRevenueDashboard(analytics) {
    // Update revenue metrics
    document.getElementById('revenue-total').textContent = `${analytics.totalRevenue.toFixed(2)} NCH`;
    document.getElementById('revenue-transactions').textContent = analytics.totalTransactions;
    document.getElementById('revenue-avg-fee').textContent = `${analytics.averageFeePerTransaction} NCH`;
    document.getElementById('revenue-growth').textContent = `+${analytics.revenueGrowth}%`;
    
    // Update fee breakdown
    document.getElementById('revenue-transaction-fees').textContent = `${analytics.feeBreakdown.transactionFees.toFixed(2)} NCH`;
    document.getElementById('revenue-premium-fees').textContent = `${analytics.feeBreakdown.premiumFees.toFixed(2)} NCH`;
    document.getElementById('revenue-verification-fees').textContent = `${analytics.feeBreakdown.verificationFees.toFixed(2)} NCH`;
    document.getElementById('revenue-buyer-registration-fees').textContent = `${analytics.feeBreakdown.buyerRegistrationFees.toFixed(2)} NCH`;
    document.getElementById('revenue-buyer-premium-fees').textContent = `${analytics.feeBreakdown.buyerPremiumFees.toFixed(2)} NCH`;
    document.getElementById('revenue-matching-fees').textContent = `${analytics.feeBreakdown.buyerMatchingFees.toFixed(2)} NCH`;
    
    // Update progress bars
    const total = analytics.totalRevenue || 1;
    document.getElementById('revenue-transaction-bar').style.width = `${(analytics.feeBreakdown.transactionFees / total) * 100}%`;
    document.getElementById('revenue-premium-bar').style.width = `${(analytics.feeBreakdown.premiumFees / total) * 100}%`;
    document.getElementById('revenue-verification-bar').style.width = `${(analytics.feeBreakdown.verificationFees / total) * 100}%`;
    document.getElementById('revenue-buyer-registration-bar').style.width = `${(analytics.feeBreakdown.buyerRegistrationFees / total) * 100}%`;
    document.getElementById('revenue-buyer-premium-bar').style.width = `${(analytics.feeBreakdown.buyerPremiumFees / total) * 100}%`;
    document.getElementById('revenue-matching-bar').style.width = `${(analytics.feeBreakdown.buyerMatchingFees / total) * 100}%`;
    
    // Update recent transactions
    updateRecentTransactions(analytics.recentTransactions);
}

function updateRecentTransactions(transactions) {
    const container = document.getElementById('recent-transactions-list');
    
    if (!transactions || transactions.length === 0) {
        container.innerHTML = '<div class="no-transactions">No transactions yet</div>';
        return;
    }
    
    container.innerHTML = transactions.map(tx => `
        <div class="transaction-item">
            <div>
                <div class="transaction-type">${tx.type.charAt(0).toUpperCase() + tx.type.slice(1)} Fee</div>
                <div class="transaction-time">${new Date(tx.timestamp).toLocaleString()}</div>
            </div>
            <div class="transaction-amount">${tx.amount.toFixed(2)} NCH</div>
        </div>
    `).join('');
}

function initRevenueDashboard() {
    // Fetch revenue analytics on load
    fetchRevenueAnalytics();
    
    // Set up timeframe filter
    const timeframeSelect = document.getElementById('revenue-timeframe');
    if (timeframeSelect) {
        timeframeSelect.addEventListener('change', (e) => {
            fetchRevenueAnalytics(e.target.value);
        });
    }
}

// Mobile Enhancements for Admin Panel
function initMobileEnhancements() {
    addTouchFeedback();
    optimizeMobileInputs();
    preventInputZoom();
}

function addTouchFeedback() {
    const touchElements = document.querySelectorAll('button, .card, .revenue-breakdown-item');
    
    touchElements.forEach(element => {
        element.addEventListener('touchstart', () => {
            element.style.transform = 'scale(0.98)';
            element.style.opacity = '0.8';
        }, { passive: true });
        
        element.addEventListener('touchend', () => {
            element.style.transform = '';
            element.style.opacity = '';
        }, { passive: true });
    });
}

function optimizeMobileInputs() {
    const usernameInput = document.getElementById('admin-username');
    const passwordInput = document.getElementById('admin-password');
    
    if (usernameInput) {
        usernameInput.setAttribute('inputmode', 'text');
        usernameInput.setAttribute('autocomplete', 'username');
    }
    
    if (passwordInput) {
        passwordInput.setAttribute('inputmode', 'text');
        passwordInput.setAttribute('autocomplete', 'current-password');
    }
}

function preventInputZoom() {
    const viewport = document.querySelector('meta[name=viewport]');
    if (viewport) {
        const inputs = document.querySelectorAll('input, select');
        
        inputs.forEach(input => {
            input.addEventListener('focus', () => {
                viewport.setAttribute('content', 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=0');
            });
            
            input.addEventListener('blur', () => {
                viewport.setAttribute('content', 'width=device-width, initial-scale=1.0, maximum-scale=5.0, user-scalable=yes');
            });
        });
    }
}