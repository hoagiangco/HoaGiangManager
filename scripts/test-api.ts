import dotenv from 'dotenv';
import axios from 'axios';

dotenv.config();

const API_URL = process.env.API_URL || 'http://localhost:3000';

async function testAPI() {
  try {
    console.log('🔍 Testing API endpoints...\n');

    // Test login
    console.log('1. Testing login...');
    const loginResponse = await axios.post(`${API_URL}/api/auth/login`, {
      email: 'admin@quanlyvt.com',
      password: 'Admin@123'
    });

    if (loginResponse.data.status) {
      console.log('✅ Login successful');
      const token = loginResponse.data.data.token;
      console.log('Token:', token.substring(0, 20) + '...\n');

      // Test devices endpoint
      console.log('2. Testing /api/devices...');
      try {
        const devicesResponse = await axios.get(`${API_URL}/api/devices?cateId=0`, {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });
        console.log('✅ Devices API successful');
        console.log('   Devices count:', devicesResponse.data.data?.length || 0);
      } catch (error: any) {
        console.error('❌ Devices API failed:', error.response?.data || error.message);
      }

      // Test departments endpoint
      console.log('\n3. Testing /api/departments...');
      try {
        const deptResponse = await axios.get(`${API_URL}/api/departments`, {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });
        console.log('✅ Departments API successful');
        console.log('   Departments count:', deptResponse.data.data?.length || 0);
      } catch (error: any) {
        console.error('❌ Departments API failed:', error.response?.data || error.message);
      }

      // Test device-categories endpoint
      console.log('\n4. Testing /api/device-categories...');
      try {
        const catResponse = await axios.get(`${API_URL}/api/device-categories`, {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });
        console.log('✅ Device Categories API successful');
        console.log('   Categories count:', catResponse.data.data?.length || 0);
      } catch (error: any) {
        console.error('❌ Device Categories API failed:', error.response?.data || error.message);
      }

    } else {
      console.error('❌ Login failed:', loginResponse.data.error);
    }
  } catch (error: any) {
    console.error('❌ Test failed:', error.message);
    if (error.response) {
      console.error('Response:', error.response.data);
    }
  }
}

testAPI();

