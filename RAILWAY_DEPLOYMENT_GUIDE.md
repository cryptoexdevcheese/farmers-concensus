# Railway Deployment Guide for Farmers Consensus

## ✅ Completed Steps

1. **✅ GitHub Repository Updated**
   - Repository: `https://github.com/cryptoexdevcheese/farmers-concensus`
   - All code successfully pushed
   - Railway configuration files added

2. **✅ Railway Configuration Files Added**
   - `railway.json` - Deployment configuration
   - `Procfile` - Process management
   - Ready for Railway deployment

## 🚀 Manual Railway Setup Steps

### Step 1: Login to Railway
1. Go to [railway.app](https://railway.app)
2. Login with: **cryptoexdevcheese@gmail.com**
3. Verify your email if required

### Step 2: Create New Project
1. Click **"New Project"** button
2. Select **"Deploy from GitHub repo"**
3. Search for: **cryptoexdevcheese/farmers-concensus**
4. Select the repository
5. Click **"Import"**

### Step 3: Configure Environment Variables
1. Once project is created, click on **"Variables"** tab
2. Add the following environment variables:

```
# Cheese Blockchain Configuration
CHEESE_BLOCKCHAIN_API_URL=http://165.22.252.113:8080
CHEESE_BLOCKCHAIN_API_KEY=

# Server Configuration
PORT=3000
NODE_ENV=production

# Farmers Consensus Configuration
FARMERS_CONSENSUS_TREASURY_WALLET=0x045D4e61757a873DAF5F3B59CCeD9f2585643cc3
REGISTRATION_REWARD_AMOUNT=10
HARVEST_VERIFICATION_REWARD=25

# Revenue Configuration
TRANSACTION_FEE=0.5
PREMIUM_TIER_FEE=2.0
HARVEST_VERIFICATION_FEE=1.5
BUYER_REGISTRATION_FEE=1.0
BUYER_PREMIUM_FEE=3.0
BUYER_MATCHING_FEE=0.25

# Admin Configuration (IMPORTANT: Change these!)
ADMIN_USERNAME=admin
ADMIN_PASSWORD=CHANGE_THIS_TO_SECURE_PASSWORD
ADMIN_SESSION_SECRET=CHANGE_THIS_TO_RANDOM_SECRET_STRING
```

### Step 4: Deploy
1. Railway will automatically deploy on first import
2. Wait for deployment to complete (usually 2-3 minutes)
3. Click on **"Domains"** tab to get your live URL
4. Railway will provide a domain like: `farmers-consensus.up.railway.app`

### Step 5: Enable Custom Domain (Optional)
1. Click **"Domains"** tab
2. Click **"Add Domain"**
3. Enter your custom domain (e.g., `farmers.yourdomain.com`)
4. Update DNS records as instructed by Railway

## 🔧 Important Security Notes

### ⚠️ Change Default Admin Credentials
Before going live, you MUST change:
- `ADMIN_USERNAME` from default `admin`
- `ADMIN_PASSWORD` to a strong, unique password
- `ADMIN_SESSION_SECRET` to a random string

Generate secure passwords using:
```bash
# Generate random secret
openssl rand -hex 32
```

### 🔒 Railway Security Settings
1. Enable **"Protections"** in Railway project settings
2. Enable **"Two-Factor Authentication"** on your Railway account
3. Set up **"Deployment Restrictions"** if needed

## 🌐 Worldwide Access

Once deployed, your Farmers Consensus platform will be:
- **Live worldwide** via Railway's global CDN
- **Accessible 24/7** with automatic failover
- **SSL/HTTPS enabled** automatically
- **Auto-scaling** based on traffic
- **Global edge network** for fast loading

## 📊 Monitoring Your Deployment

### Railway Dashboard Features:
- **Real-time logs** - Monitor application performance
- **Metrics** - CPU, memory, and network usage
- **Deployments** - Track deployment history
- **Alerts** - Set up notifications for issues

### Health Check:
Your application will have a built-in health check at:
```
https://your-domain.railway.app/api/health
```

## 🔄 Continuous Deployment

Railway will automatically redeploy when you push to GitHub:
1. Make changes locally
2. Commit and push to GitHub
3. Railway auto-detects and redeploys
4. New version goes live automatically

## 📱 Testing Your Live Deployment

### Test Endpoints:
- **Main Site:** `https://your-domain.railway.app/`
- **Health Check:** `https://your-domain.railway.app/api/health`
- **Admin Panel:** `https://your-domain.railway.app/admin.html`
- **API Status:** `https://your-domain.railway.app/api/blockchain/status`

### Test Features:
1. ✅ Farmer registration flow
2. ✅ Buyer registration flow
3. ✅ Admin login and revenue dashboard
4. ✅ Mobile responsiveness
5. ✅ Blockchain integration
6. ✅ All revenue tracking

## 🆘 Troubleshooting

### Common Issues:

**Deployment Fails:**
- Check Railway logs in "Deployments" tab
- Ensure all environment variables are set
- Verify Cheese Blockchain API is accessible

**Database Issues:**
- Current version uses in-memory storage
- For production, consider adding Railway PostgreSQL
- Revenue data resets on redeploy (current limitation)

**Admin Login Issues:**
- Verify ADMIN_USERNAME and ADMIN_PASSWORD match environment variables
- Clear browser cookies and try again
- Check Railway logs for authentication errors

## 🎉 Success Indicators

Your deployment is successful when:
- ✅ Railway shows "Active" status
- ✅ Health check returns `{"status":"healthy"}`
- ✅ Website loads without errors
- ✅ Admin panel accessible with correct credentials
- ✅ Blockchain connection shows "Connected"

## 📞 Need Help?

- **Railway Documentation:** [docs.railway.app](https://docs.railway.app)
- **Railway Support:** [support@railway.app](mailto:support@railway.app)
- **GitHub Issues:** [github.com/cryptoexdevcheese/farmers-concensus/issues]

---

**Your Farmers Consensus platform is ready for worldwide deployment! 🌍🚀**