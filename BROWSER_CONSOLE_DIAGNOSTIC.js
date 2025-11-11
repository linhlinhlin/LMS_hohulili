// 🔐 BROWSER CONSOLE DIAGNOSTIC SCRIPT
// 
// Copy and paste this entire code block into your browser's Developer Console (F12 → Console tab)
// This will help diagnose the authentication issue

console.log('🔍 Starting Authentication Diagnostic...\n');

// ========== 1. CHECK LOCALSTORAGE ==========
console.log('📦 ========== LOCAL STORAGE CHECK ==========');
const token = localStorage.getItem('auth_token');
const refreshToken = localStorage.getItem('refresh_token');
const user = localStorage.getItem('user');

console.log('✓ Token exists:', !!token ? `YES (${token.length} chars)` : 'NO ❌');
console.log('✓ RefreshToken exists:', !!refreshToken ? 'YES' : 'NO ❌');
console.log('✓ User exists:', !!user ? 'YES' : 'NO ❌');

if (user) {
  try {
    const parsedUser = JSON.parse(user);
    console.log('✓ Parsed user:', parsedUser);
    console.log('  - Username:', parsedUser.username);
    console.log('  - Email:', parsedUser.email);
    console.log('  - Role:', parsedUser.role);
  } catch (e) {
    console.log('❌ Error parsing user:', e);
  }
}

if (token) {
  console.log('\n🔑 Token Details:');
  try {
    // JWT has 3 parts separated by dots: header.payload.signature
    const parts = token.split('.');
    if (parts.length === 3) {
      // Decode payload (base64url)
      const payload = JSON.parse(atob(parts[1]));
      console.log('  - Payload:', payload);
      
      const expDate = new Date(payload.exp * 1000);
      const now = new Date();
      const isExpired = expDate < now;
      
      console.log('  - Expires at:', expDate.toLocaleString());
      console.log('  - Status:', isExpired ? '❌ EXPIRED' : '✅ VALID');
      console.log('  - Time until expiry:', Math.round((expDate - now) / 1000), 'seconds');
    } else {
      console.log('  ⚠️  Invalid token format (expected 3 parts separated by dots)');
    }
  } catch (e) {
    console.log('  ⚠️  Could not decode token:', e.message);
  }
}

// ========== 2. CHECK AUTHENTICATION STATUS ==========
console.log('\n🔐 ========== AUTHENTICATION STATUS ==========');
console.log('✓ isAuthenticated:', !!token);
console.log('✓ Can make API calls:', !!token ? 'YES ✅' : 'NO ❌ (need to login first)');

// ========== 3. SIMULATE API CALL ==========
console.log('\n🚀 ========== TESTING API CALL ==========');
if (!token) {
  console.log('⚠️  Skipping API test: No token found');
  console.log('📝 ACTION REQUIRED: Please login first at http://localhost:4200/login');
} else {
  console.log('Testing API with token...');
  
  fetch('http://localhost:8088/api/v1/users?page=1&size=10', {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  })
    .then(response => {
      console.log('✓ API Response Status:', response.status, response.statusText);
      return response.json().then(data => ({ status: response.status, data }));
    })
    .then(({ status, data }) => {
      if (status === 200) {
        console.log('✅ SUCCESS! Users loaded:');
        console.log('  - Total users:', data.total);
        console.log('  - Users on page:', data.content?.length || 0);
        console.log('  - Full response:', data);
      } else {
        console.log('❌ API Error:', data);
      }
    })
    .catch(error => {
      console.log('❌ API Call Failed:', error);
      console.log('   Check if backend is running at http://localhost:8088');
    });
}

// ========== 4. RECOMMENDATIONS ==========
console.log('\n💡 ========== RECOMMENDATIONS ==========');
if (!token) {
  console.log('1. ❌ NO TOKEN FOUND');
  console.log('   → Go to http://localhost:4200/login');
  console.log('   → Login with your credentials');
  console.log('   → Token should be saved automatically');
  console.log('   → After login, run this diagnostic again');
} else {
  const parts = token.split('.');
  if (parts.length === 3) {
    try {
      const payload = JSON.parse(atob(parts[1]));
      if (payload.role !== 'admin') {
        console.log('1. ⚠️  ROLE ISSUE');
        console.log('   → Your role is:', payload.role);
        console.log('   → Admin page requires role: "admin"');
        console.log('   → Logout and login with admin account');
      }
      if (payload.exp * 1000 < Date.now()) {
        console.log('1. ⚠️  TOKEN EXPIRED');
        console.log('   → Logout and login again');
        console.log('   → Or wait for automatic token refresh');
      } else {
        console.log('1. ✅ TOKEN LOOKS GOOD');
        console.log('   → Token is valid and not expired');
        console.log('   → Check browser Console for 🔐 and 🔗 debug messages');
        console.log('   → If still getting 401, backend may be rejecting the token');
      }
    } catch (e) {
      console.log('1. ⚠️  Could not parse token - might be corrupted');
    }
  }
}

console.log('\n🔗 Backend Status:');
console.log('   → Check if running at http://localhost:8088');
console.log('   → Health check: http://localhost:8088/health');

console.log('\n📋 For Support:');
console.log('   → Share this console output');
console.log('   → Include browser: ' + navigator.userAgent.substring(0, 50) + '...');
console.log('   → Check backend logs for JWT errors');

console.log('\n✅ Diagnostic Complete!\n');
