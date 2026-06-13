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
        const response = await fetch('/api/admin/check', { credentials: 'same-origin' });
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
    initAdminLedger();
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
                body: JSON.stringify({ username, password }),
                credentials: 'same-origin'
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
                await fetch('/api/admin/logout', { method: 'POST', credentials: 'same-origin' });
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
        const response = await fetch(`/api/revenue/analytics?timeframe=${timeframe}`, { credentials: 'same-origin' });
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

// ===== CROP REGISTRATION & VERIFICATION CONSOLE =====
let adminRegistrations = [];

async function initAdminLedger() {
    await fetchAdminRegistrations();
}

async function fetchAdminRegistrations() {
    try {
        const response = await fetch('/api/farmers/registrations', { credentials: 'same-origin' });
        const result = await response.json();
        if (result.success) {
            adminRegistrations = result.registrations;
            renderAdminLedgerTable();
        } else {
            console.error('Failed to load admin registrations:', result.error);
        }
    } catch (error) {
        console.error('Error fetching admin registrations:', error);
    }
}

function renderAdminLedgerTable() {
    const tbody = document.getElementById('admin-ledger-tbody');
    if (!tbody) return;
    
    if (adminRegistrations.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="8" style="text-align: center; color: var(--color-text-muted); padding: 36px 0; font-style: italic;">
                    No crop registrations found.
                </td>
            </tr>
        `;
        return;
    }

    tbody.innerHTML = adminRegistrations.map(r => {
        const status = r.verificationStatus || 'Pending';
        
        let statusBadge = '';
        if (status === 'Geo-Verified') {
            statusBadge = `
                <span class="status-badge geo-verified" style="background-color: rgba(59, 130, 246, 0.1); color: #3b82f6; border: 1px solid rgba(59, 130, 246, 0.3); display: inline-flex; align-items: center; gap: 6px; padding: 4px 8px; border-radius: 6px; font-size: 0.85rem; font-weight: 500;">
                    <i data-lucide="map-pin" style="width: 14px; height: 14px;"></i>
                    <span>Geo-Verified</span>
                </span>
            `;
        } else if (status === 'Oracle Confirmed') {
            statusBadge = `
                <span class="status-badge oracle-confirmed" style="background-color: rgba(16, 185, 129, 0.1); color: #10b981; border: 1px solid rgba(16, 185, 129, 0.3); display: inline-flex; align-items: center; gap: 6px; padding: 4px 8px; border-radius: 6px; font-size: 0.85rem; font-weight: 500;">
                    <i data-lucide="shield-check" style="width: 14px; height: 14px;"></i>
                    <span>Oracle Confirmed</span>
                </span>
            `;
        } else if (status === 'Cancelled') {
            statusBadge = `
                <span class="status-badge cancelled" style="background-color: rgba(239, 68, 68, 0.1); color: #ef4444; border: 1px solid rgba(239, 68, 68, 0.3); display: inline-flex; align-items: center; gap: 6px; padding: 4px 8px; border-radius: 6px; font-size: 0.85rem; font-weight: 500;">
                    <i data-lucide="x-circle" style="width: 14px; height: 14px;"></i>
                    <span>Cancelled</span>
                </span>
            `;
        } else {
            statusBadge = `
                <span class="status-badge pending" style="background-color: rgba(245, 158, 11, 0.1); color: #f59e0b; border: 1px solid rgba(245, 158, 11, 0.3); display: inline-flex; align-items: center; gap: 6px; padding: 4px 8px; border-radius: 6px; font-size: 0.85rem; font-weight: 500;">
                    <i data-lucide="clock" style="width: 14px; height: 14px;"></i>
                    <span>Pending</span>
                </span>
            `;
        }

        let actionButtons = '';
        if (status === 'Pending') {
            actionButtons = `
                <div style="display: flex; gap: 8px; flex-wrap: wrap;">
                    <button class="btn-secondary btn-sm" onclick="verifyRegistration('${r.id}', 'Geo-Verified')" style="padding: 4px 8px; font-size: 0.8rem; border-radius: 6px; display: inline-flex; align-items: center; gap: 4px; cursor: pointer;">
                        <i data-lucide="map-pin" style="width: 12px; height: 12px;"></i>
                        <span>Geo-Verify</span>
                    </button>
                    <button class="btn-primary btn-sm" onclick="verifyRegistration('${r.id}', 'Oracle Confirmed')" style="padding: 4px 8px; font-size: 0.8rem; border-radius: 6px; display: inline-flex; align-items: center; gap: 4px; background: var(--color-primary); cursor: pointer;">
                        <i data-lucide="shield-check" style="width: 12px; height: 12px;"></i>
                        <span>Confirm</span>
                    </button>
                    <button class="btn-danger btn-sm" onclick="cancelRegistration('${r.id}')" style="padding: 4px 8px; font-size: 0.8rem; border-radius: 6px; display: inline-flex; align-items: center; gap: 4px; background: rgba(239, 68, 68, 0.15); color: #ef4444; border: 1px solid rgba(239, 68, 68, 0.3); cursor: pointer;">
                        <i data-lucide="x-circle" style="width: 12px; height: 12px;"></i>
                        <span>Cancel</span>
                    </button>
                </div>
            `;
        } else if (status === 'Geo-Verified') {
            actionButtons = `
                <div style="display: flex; gap: 8px; flex-wrap: wrap;">
                    <button class="btn-primary btn-sm" onclick="verifyRegistration('${r.id}', 'Oracle Confirmed')" style="padding: 4px 8px; font-size: 0.8rem; border-radius: 6px; display: inline-flex; align-items: center; gap: 4px; background: var(--color-primary); cursor: pointer;">
                        <i data-lucide="shield-check" style="width: 12px; height: 12px;"></i>
                        <span>Oracle Confirm</span>
                    </button>
                    <button class="btn-danger btn-sm" onclick="cancelRegistration('${r.id}')" style="padding: 4px 8px; font-size: 0.8rem; border-radius: 6px; display: inline-flex; align-items: center; gap: 4px; background: rgba(239, 68, 68, 0.15); color: #ef4444; border: 1px solid rgba(239, 68, 68, 0.3); cursor: pointer;">
                        <i data-lucide="x-circle" style="width: 12px; height: 12px;"></i>
                        <span>Cancel</span>
                    </button>
                </div>
            `;
        } else {
            actionButtons = `<span style="color: var(--color-text-muted); font-size: 0.85rem;">No actions</span>`;
        }

        const areaHa = parseFloat(r.areaHa) || 0;
        const yieldTons = parseFloat(r.expectedYieldTons) || 0;

        return `
            <tr>
                <td data-label="Registry ID"><span class="registry-id">${r.id}</span></td>
                <td data-label="Farmer Name"><strong style="color: var(--color-text-primary); font-weight: 600;">${r.farmerName}</strong></td>
                <td data-label="Contact Number"><code style="font-family: monospace; font-size: 0.9rem; color: #10b981; background: rgba(16, 185, 129, 0.1); padding: 2px 6px; border-radius: 4px;">${r.contact}</code></td>
                <td data-label="Location">
                    <div>${r.barangay}, ${r.municipality}</div>
                    <div style="font-size: 0.8rem; color: var(--color-text-secondary);">${r.province}</div>
                </td>
                <td data-label="Crop">
                    <span style="font-weight: 500;">${r.vegetableId.toUpperCase()}</span>
                </td>
                <td data-label="Area & Yield">
                    <div>${areaHa.toFixed(2)} ha</div>
                    <div style="font-size: 0.8rem; color: var(--color-text-secondary);">${yieldTons.toFixed(2)} Tons</div>
                </td>
                <td data-label="Verification Status">
                    ${statusBadge}
                </td>
                <td data-label="Actions">
                    ${actionButtons}
                </td>
            </tr>
        `;
    }).join('');

    initLucide();
}

async function verifyRegistration(id, status) {
    if (!confirm(`Are you sure you want to verify registration ${id} as ${status}?`)) {
        return;
    }
    
    try {
        const response = await fetch('/api/admin/farmers/verify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id, status }),
            credentials: 'same-origin'
        });
        
        const result = await response.json();
        if (result.success) {
            alert(`Registration ${id} successfully updated to ${status}`);
            
            // Refresh registration table
            await fetchAdminRegistrations();
            
            // Refresh revenue metrics
            const timeframeSelect = document.getElementById('revenue-timeframe');
            const timeframe = timeframeSelect ? timeframeSelect.value : 'all';
            await fetchRevenueAnalytics(timeframe);
        } else {
            alert(`Failed to verify: ${result.error}`);
        }
    } catch (error) {
        console.error('Error verifying registration:', error);
        alert('An error occurred during verification.');
    }
}

// Cancel registration function
async function cancelRegistration(id) {
    if (!confirm(`Are you sure you want to CANCEL registration ${id}? This cannot be undone.`)) {
        return;
    }
    
    try {
        const response = await fetch('/api/admin/farmers/verify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id, status: 'Cancelled' }),
            credentials: 'same-origin'
        });
        
        const result = await response.json();
        if (result.success) {
            alert(`Registration ${id} has been cancelled.`);
            
            // Refresh registration table
            await fetchAdminRegistrations();
            
            // Refresh revenue metrics
            const timeframeSelect = document.getElementById('revenue-timeframe');
            const timeframe = timeframeSelect ? timeframeSelect.value : 'all';
            await fetchRevenueAnalytics(timeframe);
        } else {
            alert(`Failed to cancel: ${result.error}`);
        }
    } catch (error) {
        console.error('Error cancelling registration:', error);
        alert('An error occurred while cancelling the registration.');
    }
}

// Bind to window for inline onclick handlers
window.verifyRegistration = verifyRegistration;
window.cancelRegistration = cancelRegistration;