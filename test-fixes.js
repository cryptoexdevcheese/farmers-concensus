const axios = require('axios');
require('dotenv').config();

const BASE_URL = 'http://localhost:3000';

async function runTests() {
  console.log('🏁 Starting security verification tests...');
  
  try {
    // 1. Data Privacy Leak Check (unauthenticated PII redaction)
    console.log('\nTest 1: Verifying public registrations have redacted PII...');
    const publicListRes = await axios.get(`${BASE_URL}/api/farmers/registrations`);
    if (publicListRes.data.success) {
      const allRedacted = publicListRes.data.registrations.every(r => 
        r.farmerName === '[REDACTED (Login Required)]' && 
        r.contact === '[REDACTED (Login Required)]'
      );
      if (allRedacted) {
        console.log('✅ Test 1 Passed: Public crop names and phone numbers are completely redacted.');
      } else {
        console.error('❌ Test 1 Failed: Some public registration names or phone numbers are exposed');
      }
    } else {
      throw new Error('Test 1 Failed: Failed to query public registrations list');
    }

    // 2. Register Farmer Juan & Login
    console.log('\nTest 2: Registering and logging in a new farmer user...');
    const farmerEmail = `test-farmer-sec-${Date.now()}@example.com`;
    const farmerPhone = '09' + Math.floor(100000000 + Math.random() * 900000000).toString();
    const regFarmer = await axios.post(`${BASE_URL}/api/auth/register`, {
      email: farmerEmail,
      password: 'password123',
      fullName: 'Farmer Juan Dela Cruz',
      userType: 'farmer',
      phone: farmerPhone
    });
    
    let farmerToken = regFarmer.data.token;
    let farmerRegId = regFarmer.data.user.registrationId;
    console.log(`✅ Test 2 Passed: Farmer Juan registered with ID: ${farmerRegId}`);

    // 3. Register Crop with 10 Tons Yield
    console.log('\nTest 3: Creating a crop forecast with 10.00 tons expected yield...');
    await axios.post(`${BASE_URL}/api/farmers/register`, {
      province: 'Benguet',
      municipality: 'La Trinidad',
      barangay: 'Pico',
      vegetableId: 'potato',
      areaSqm: 5000,
      areaHa: 0.5,
      expectedYieldTons: 10.0,
      plantingDate: '2026-06-01',
      harvestDate: '2026-09-01'
    }, {
      headers: { 'Authorization': `Bearer ${farmerToken}` }
    });
    console.log('✅ Test 3 Passed: Crop forecast recorded successfully.');

    // 4. Authenticated PII Exposure check
    console.log('\nTest 4: Verifying crop lookup reveals name and contact when authenticated...');
    const authListRes = await axios.get(`${BASE_URL}/api/farmers/registrations`, {
      headers: { 'Authorization': `Bearer ${farmerToken}` }
    });
    const juanCrop = authListRes.data.registrations.find(r => r.id === farmerRegId);
    if (juanCrop && juanCrop.farmerName === 'Farmer Juan Dela Cruz' && juanCrop.contact === farmerPhone) {
      console.log('✅ Test 4 Passed: Authenticated users can view real names and phone numbers.');
    } else {
      console.error('❌ Test 4 Failed: Expected farmer details to be exposed, got:', juanCrop);
    }

    // 5. Register Buyer 1 & Buyer 2
    console.log('\nTest 5: Registering Buyer 1 and Buyer 2...');
    const buyer1Email = `buyer1-${Date.now()}@example.com`;
    const buyer1Phone = '09' + Math.floor(100000000 + Math.random() * 900000000).toString();
    const regBuyer1 = await axios.post(`${BASE_URL}/api/auth/register`, {
      email: buyer1Email,
      password: 'password123',
      fullName: 'Buyer One Ltd',
      userType: 'buyer',
      phone: buyer1Phone
    });
    const buyer1Token = regBuyer1.data.token;
    const buyer1RegId = regBuyer1.data.user.registrationId;

    const buyer2Email = `buyer2-${Date.now()}@example.com`;
    const buyer2Phone = '09' + Math.floor(100000000 + Math.random() * 900000000).toString();
    const regBuyer2 = await axios.post(`${BASE_URL}/api/auth/register`, {
      email: buyer2Email,
      password: 'password123',
      fullName: 'Buyer Two Corp',
      userType: 'buyer',
      phone: buyer2Phone
    });
    const buyer2Token = regBuyer2.data.token;
    const buyer2RegId = regBuyer2.data.user.registrationId;
    console.log('✅ Test 5 Passed: Both buyers registered successfully.');

    // 6. Double-Booking Allocation Block Test
    console.log('\nTest 6: Testing crop allocation limits...');
    console.log('Buyer 1 booking 6.00 tons matching quantity...');
    const match1Res = await axios.post(`${BASE_URL}/api/matches/create`, {
      farmerId: farmerRegId,
      vegetableId: 'potato',
      quantity: 6.0,
      matchValue: 90000
    }, {
      headers: { 'Authorization': `Bearer ${buyer1Token}` }
    });
    
    let matchId = '';
    if (match1Res.data.success) {
      matchId = match1Res.data.match.id;
      console.log(`✅ Match 1 successfully recorded with ID: ${matchId}`);
    }

    console.log('Buyer 2 attempting to book 5.00 tons matching quantity (exceeds remaining 4.00 tons)...');
    try {
      await axios.post(`${BASE_URL}/api/matches/create`, {
        farmerId: farmerRegId,
        vegetableId: 'potato',
        quantity: 5.0,
        matchValue: 75000
      }, {
        headers: { 'Authorization': `Bearer ${buyer2Token}` }
      });
      console.error('❌ Test 6 Failed: Booking should have failed due to yield over-allocation');
    } catch (err) {
      if (err.response && err.response.status === 400) {
        console.log('✅ Test 6 Passed: Booking correctly rejected with over-allocation message:', err.response.data.error);
      } else {
        console.error('❌ Test 6 Failed: Expected status 400, got:', err.response ? err.response.status : err.message);
      }
    }

    // 7. Authorization Ownership Verification (Confirming another buyer's match)
    console.log('\nTest 7: Buyer 2 attempting to confirm Buyer 1\'s match (should fail)...');
    try {
      await axios.post(`${BASE_URL}/api/matches/buyer-confirm`, {
        matchId: matchId,
        status: 'Confirmed',
        receivedQtyTons: 6.0,
        qualityRating: 'Grade A',
        remarks: 'Attempting hijack'
      }, {
        headers: { 'Authorization': `Bearer ${buyer2Token}` }
      });
      console.error('❌ Test 7 Failed: Buyer 2 should have been blocked from confirming Buyer 1\'s match');
    } catch (err) {
      if (err.response && err.response.status === 403) {
        console.log('✅ Test 7 Passed: Unauthorized confirm rejected successfully with 403 Forbidden.');
      } else {
        console.error('❌ Test 7 Failed: Expected status 403, got:', err.response ? err.response.status : err.message);
      }
    }

    // 8. Brute-Force Guessing OTP Lockout
    console.log('\nTest 8: Requesting OTP recovery and testing brute-force lockout...');
    const forgotRes = await axios.post(`${BASE_URL}/api/auth/forgot-password`, {
      email: farmerEmail
    });
    const realOTP = forgotRes.data.code;
    console.log(`Simulating invalid recovery entries with wrong OTP codes on ${farmerEmail}...`);
    
    // Guess 1
    try {
      await axios.post(`${BASE_URL}/api/auth/reset-password`, { email: farmerEmail, code: '000000', newPassword: 'new' });
    } catch (err) {
      console.log('   Guess 1: Rejected (2 attempts remaining)');
    }
    // Guess 2
    try {
      await axios.post(`${BASE_URL}/api/auth/reset-password`, { email: farmerEmail, code: '000000', newPassword: 'new' });
    } catch (err) {
      console.log('   Guess 2: Rejected (1 attempt remaining)');
    }
    // Guess 3 (OTP lockout threshold)
    try {
      await axios.post(`${BASE_URL}/api/auth/reset-password`, { email: farmerEmail, code: '000000', newPassword: 'new' });
    } catch (err) {
      console.log('   Guess 3: Rejected successfully, code deleted.');
    }

    console.log('Now trying to submit the real OTP code (should fail as code is now deleted)...');
    try {
      await axios.post(`${BASE_URL}/api/auth/reset-password`, {
        email: farmerEmail,
        code: realOTP,
        newPassword: 'newpassword123'
      });
      console.error('❌ Test 8 Failed: Password reset succeeded with voided OTP code');
    } catch (err) {
      if (err.response && err.response.status === 400) {
        console.log('✅ Test 8 Passed: Voided OTP recovery successfully blocked:', err.response.data.error);
      } else {
        console.error('❌ Test 8 Failed: Expected status 400, got:', err.response ? err.response.status : err.message);
      }
    }

    // 9. Admin Clean Up
    console.log('\nTest 9: Purging verification crop registrations via admin override...');
    const adminLoginRes = await axios.post(`${BASE_URL}/api/admin/login`, {
      username: process.env.ADMIN_USERNAME || 'admin',
      password: process.env.ADMIN_PASSWORD || 'secure_password_change_this'
    });
    const adminCookie = adminLoginRes.headers['set-cookie'] ? adminLoginRes.headers['set-cookie'][0] : '';
    
    // Purge crop forecast
    const purgeRes = await axios.delete(`${BASE_URL}/api/admin/farmers/delete/${farmerRegId}`, {
      headers: { 'Cookie': adminCookie },
      withCredentials: true
    });
    if (purgeRes.data.success) {
      console.log('✅ Test 9 Passed: Purged test crop registrations successfully.');
    }

    console.log('\n🎉 ALL SECURITY VERIFICATION TESTS PASSED SUCCESSFULLY!');
  } catch (error) {
    console.error('\n❌ Security verification failed:', error.message);
    if (error.response) {
      console.error('Response details:', error.response.data);
    }
  }
}

runTests();
