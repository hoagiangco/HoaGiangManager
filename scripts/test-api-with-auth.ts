import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const API_URL = 'http://localhost:3000';

async function testAPI() {
  try {
    console.log('🔍 Testing API with authentication...\n');

    // Step 1: Login
    console.log('1. Logging in...');
    const loginResponse = await axios.post(`${API_URL}/api/auth/login`, {
      email: 'admin@quanlyvt.com',
      password: 'Admin@123'
    });

    if (!loginResponse.data.status) {
      console.error('❌ Login failed:', loginResponse.data.error);
      return;
    }

    const token = loginResponse.data.data.token;
    console.log('✅ Login successful');
    console.log('   Token:', token.substring(0, 30) + '...\n');

    // Step 2: Test Devices API
    console.log('2. Testing GET /api/devices...');
    try {
      const devicesResponse = await axios.get(`${API_URL}/api/devices?cateId=0`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      if (devicesResponse.data.status) {
        console.log('✅ Devices API successful');
        console.log(`   Found ${devicesResponse.data.data?.length || 0} devices`);
        if (devicesResponse.data.data && devicesResponse.data.data.length > 0) {
          console.log('   Sample device:', {
            id: devicesResponse.data.data[0].id,
            name: devicesResponse.data.data[0].name
          });
        }
      } else {
        console.error('❌ Devices API returned error:', devicesResponse.data.error);
      }
    } catch (error: any) {
      console.error('❌ Devices API failed:');
      console.error('   Status:', error.response?.status);
      console.error('   Error:', error.response?.data || error.message);
      if (error.response?.data?.details) {
        console.error('   Details:', error.response.data.details);
      }
    }

    // Step 3: Test Departments API
    console.log('\n3. Testing GET /api/departments...');
    try {
      const deptResponse = await axios.get(`${API_URL}/api/departments`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      if (deptResponse.data.status) {
        console.log('✅ Departments API successful');
        console.log(`   Found ${deptResponse.data.data?.length || 0} departments`);
      } else {
        console.error('❌ Departments API returned error:', deptResponse.data.error);
      }
    } catch (error: any) {
      console.error('❌ Departments API failed:');
      console.error('   Status:', error.response?.status);
      console.error('   Error:', error.response?.data || error.message);
    }

    // Step 4: Test Device Categories API
    console.log('\n4. Testing GET /api/device-categories...');
    try {
      const catResponse = await axios.get(`${API_URL}/api/device-categories`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      if (catResponse.data.status) {
        console.log('✅ Device Categories API successful');
        console.log(`   Found ${catResponse.data.data?.length || 0} categories`);
      } else {
        console.error('❌ Device Categories API returned error:', catResponse.data.error);
      }
    } catch (error: any) {
      console.error('❌ Device Categories API failed:');
      console.error('   Status:', error.response?.status);
      console.error('   Error:', error.response?.data || error.message);
    }

  } catch (error: any) {
    console.error('❌ Test failed:', error.message);
    if (error.response) {
      console.error('Response:', error.response.data);
    }
  }
}

testAPI();



