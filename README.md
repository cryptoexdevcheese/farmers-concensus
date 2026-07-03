# Farmers Consensus + Cheese Blockchain 🌾🧀

A revolutionary Philippine agricultural platform that integrates crop registration with Cheese Blockchain for immutable record-keeping, token rewards, and transparent governance.

## 🚀 Overview

**Farmers Consensus** is a web-based application that allows Filipino farmers to register their planting intentions, helping prevent crop oversupply and stabilize market prices. By integrating with **Cheese Blockchain**, every crop registration becomes an immutable blockchain transaction, providing trust, transparency, and financial incentives for farmers.

### 🎯 Key Features

- **Immutable Crop Registration** - Every farmer registration recorded on Cheese Blockchain
- **Blockchain Receipt System** - Tamper-proof proof of agricultural commitments
- **NCH Token Rewards** - Farmers earn tokens for accurate reporting
- **Real-time Analytics** - Dashboard with supply chain insights
- **Geographic Hierarchy** - Province → Municipality → Barangay structure
- **Yield Calculation** - Automated harvest estimates based on crop data

## 🛠️ Tech Stack

- **Frontend**: HTML5, CSS3, Vanilla JavaScript
- **Backend**: Node.js, Express.js
- **Blockchain**: Cheese Blockchain API integration
- **Charts**: Chart.js for analytics visualization
- **Icons**: Lucide Icons
- **Storage**: LocalStorage (browser) + Blockchain (immutable)

## 📦 Installation

### Prerequisites
- Node.js v14+ installed
- Cheese Blockchain server running (https://cheeseblockchain.com)

### Setup

1. **Clone or navigate to the project:**
   ```bash
   cd /Users/cheeseblockchain/CascadeProjects/farmers-consensus
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Configure environment variables:**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

4. **Start the server:**
   ```bash
   npm start
   ```

5. **Access the application:**
   - Frontend: http://localhost:3000
   - API Health: http://localhost:3000/api/health

For development with auto-reload:
```bash
npm run dev
```

## 🧀 Blockchain Integration

### How It Works

1. **Farmer Registration Flow:**
   - Farmer fills out crop registration form
   - Data validated locally
   - Registration sent to backend API
   - Backend creates transaction on Cheese Blockchain
   - Blockchain receipt returned with transaction ID
   - NCH token reward allocated (10 NCH per registration)

2. **Blockchain Data Structure:**
   ```javascript
   {
     type: 'crop_registration',
     farmerId: 'FC-2026-0001',
     farmerName: 'Juan Dela Cruz',
     location: 'Benguet:La Trinidad:Puguis',
     crop: 'cabbage',
     area: 1.5 hectares,
     expectedYield: 30.75 tons,
     timeline: '2026-06-05 → 2026-08-19',
     timestamp: '2026-05-29T22:37:11.984Z'
   }
   ```

3. **Transaction Recording:**
   - Uses Cheese Blockchain notary stamp API
   - Immutable record on blockchain
   - Generates unique transaction ID
   - Provides cryptographic hash verification

### API Endpoints

#### **Health Check**
```
GET /api/health
```
Returns server and blockchain connection status.

#### **Blockchain Status**
```
GET /api/blockchain/status
```
Returns Cheese Blockchain health and chain information.

#### **Register Farmer**
```
POST /api/farmers/register
Content-Type: application/json

{
  "id": "FC-2026-0001",
  "farmerName": "Juan Dela Cruz",
  "contact": "09171234567",
  "province": "Benguet",
  "municipality": "La Trinidad",
  "barangay": "Puguis",
  "vegetableId": "cabbage",
  "areaSqm": 15000,
  "areaHa": 1.5,
  "expectedYieldTons": 30.75,
  "plantingDate": "2026-06-05",
  "harvestDate": "2026-08-19"
}
```

#### **Get Statistics**
```
GET /api/farmers/statistics
```
Returns aggregated data from blockchain registrations.

## 💰 Token Economics

### NCH Token Rewards

- **Registration Reward**: 10 NCH per crop registration
- **Harvest Verification**: 25 NCH (future feature)
- **Data Contribution**: Variable rewards (future feature)
- **Governance Voting**: 1 NCH = 1 vote weight (future feature)

### Token Utility

- **Rewards**: Incentivize farmer participation
- **Governance**: Vote on agricultural policies
- **Marketplace**: Purchase future crop credits
- **Data Access**: Buy agricultural insights
- **Insurance**: Pay for crop protection

## 🌱 Supported Crops

### Highland Vegetables
- Cabbage, Carrots, Lettuce, Broccoli
- Cauliflower, Celery, Spinach, Peppers
- Strawberries, Tomatoes, Beans

### Lowland Vegetables
- Rice, Corn, Eggplant, Okra
- Squash, String beans, Ampalaya
- Watermelon, Melon, Onions, Garlic

## 🗺️ Geographic Coverage

### Provinces Included
- **Benguet** - 13 municipalities, complete barangay data
- **Nueva Ecija** - 27 municipalities/cities, complete barangay data
- More provinces can be easily added to the geographic data

### Data Structure
```javascript
PHILIPPINES_GEOGRAPHY = {
  "Benguet": {
    "La Trinidad": ["Pico", "Balili", "Puguis", "Wangal", ...],
    "Baguio City": ["Holy Ghost", "Sanitary Camp", ...],
    ...
  },
  "Nueva Ecija": {
    "Cabanatuan City": ["Valenzuela", "Magsaysay", ...],
    "Science City of Muñoz": ["Bical", "Catalanacan", ...],
    ...
  }
}
```

## 🔐 Security Features

- **Blockchain Immutability** - Tamper-proof agricultural records
- **Cryptographic Hashing** - Each registration has unique fingerprint
- **Transparent Receipts** - Public verification of commitments
- **Privacy Protection** - Sensitive data can be encrypted on-chain
- **API Security** - Ready for API key authentication

## 📊 Analytics Dashboard

### Real-time Metrics
- Total registered farmers
- Total hectares planted
- Crop distribution by category
- Provincial planting intensity
- Harvest timeline projections

### Data Visualization
- Doughnut charts for crop share
- Horizontal bar charts for provincial intensity
- Line charts for supply timeline
- Interactive data filtering

## 🚧 Future Enhancements

### Phase 1: Advanced Features
- [ ] Wallet integration for NCH token distribution
- [ ] Smart contract quota management
- [ ] Supply chain NFT tracking
- [ ] Decentralized marketplace for future crops

### Phase 2: Ecosystem Expansion
- [ ] Mobile app development
- [ ] Government verification portal
- [ ] Insurance smart contracts
- [ ] Data monetization marketplace
- [ ] IoT integration for farm monitoring

### Phase 3: Advanced Governance
- [ ] DAO-based policy voting
- [ ] Automated quota adjustment algorithms
- [ ] Price stabilization mechanisms
- [ ] Cross-chain interoperability

## 🧪 Testing

### Test Blockchain Integration

```bash
# Test health endpoint
curl http://localhost:3000/api/health

# Test blockchain status
curl http://localhost:3000/api/blockchain/status

# Test farmer registration
curl -X POST http://localhost:3000/api/farmers/register \
  -H "Content-Type: application/json" \
  -d '{
    "id": "FC-2026-TEST-001",
    "farmerName": "Test Farmer",
    "contact": "09171234567",
    "province": "Benguet",
    "municipality": "La Trinidad",
    "barangay": "Puguis",
    "vegetableId": "cabbage",
    "areaSqm": 15000,
    "areaHa": 1.5,
    "expectedYieldTons": 30.75,
    "plantingDate": "2026-06-05",
    "harvestDate": "2026-08-19"
  }'
```

## 📱 User Guide

### For Farmers

1. **Register Account**: Fill in personal information and contact details
2. **Select Location**: Choose province, municipality, barangay
3. **Choose Crop**: Select the vegetable variety you intend to plant
4. **Enter Land Area**: Input plantation size in hectares or square meters
5. **Set Planting Date**: Choose when you plan to start planting
6. **Submit Registration**: Receive blockchain receipt and NCH token reward

### For Government Officials

1. **Access Analytics Dashboard**: View real-time planting data
2. **Monitor Supply**: Track crop quantities by region and timing
3. **Verify Records**: Check blockchain receipts for authenticity
4. **Adjust Quotas**: Make data-driven policy decisions
5. **Distribute Rewards**: Approve token allocations for verified harvests

## 🤝 Contributing

This is an open-source agricultural platform. Contributions welcome for:
- Additional provinces and geographic data
- More crop varieties and yield data
- Enhanced analytics and reporting
- Mobile application development
- Smart contract development

## 📄 License

MIT License - See LICENSE file for details

## 🆘 Support

For technical support or questions:
- Email: farmers-consensus@cheeseblockchain.com
- Cheese Blockchain: https://cheeseblockchain.com
- Documentation: https://github.com/cryptoexdevcheese/farmers-consensus

---

**Built for Filipino Farmers** 🌾  
**Powered by Cheese Blockchain** 🧀  
**Transforming Agriculture Through Technology** 🚀
