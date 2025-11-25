#!/bin/bash

# Test Teacher API Endpoint
# This script tests if the teacher endpoint is working

echo "=== Testing Teacher API ==="
echo ""

# Step 1: Login as teacher
echo "Step 1: Login as teacher1..."
LOGIN_RESPONSE=$(curl -s -X POST http://localhost:8088/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"teacher1","password":"password123"}')

echo "Login response: $LOGIN_RESPONSE"
echo ""

# Extract token (assuming JSON response with "token" field)
TOKEN=$(echo $LOGIN_RESPONSE | grep -o '"token":"[^"]*' | cut -d'"' -f4)

if [ -z "$TOKEN" ]; then
    echo "❌ Failed to get token. Check if:"
    echo "   1. Backend is running on port 8088"
    echo "   2. User teacher1 exists with password password123"
    echo "   3. Login endpoint is /api/v1/auth/login"
    exit 1
fi

echo "✅ Got token: ${TOKEN:0:50}..."
echo ""

# Step 2: Test endpoint
echo "Step 2: Testing /api/v1/teacher/test endpoint..."
TEST_RESPONSE=$(curl -s -w "\nHTTP_CODE:%{http_code}" -X GET http://localhost:8088/api/v1/teacher/test \
  -H "Authorization: Bearer $TOKEN")

HTTP_CODE=$(echo "$TEST_RESPONSE" | grep "HTTP_CODE" | cut -d':' -f2)
RESPONSE_BODY=$(echo "$TEST_RESPONSE" | sed '/HTTP_CODE/d')

echo "Response: $RESPONSE_BODY"
echo "HTTP Code: $HTTP_CODE"
echo ""

if [ "$HTTP_CODE" = "200" ]; then
    echo "✅ Test endpoint works!"
else
    echo "❌ Test endpoint failed with code $HTTP_CODE"
    echo "   This means TeacherController is not loaded or security is blocking it"
    exit 1
fi

# Step 3: Test students endpoint
echo "Step 3: Testing /api/v1/teacher/students endpoint..."
STUDENTS_RESPONSE=$(curl -s -w "\nHTTP_CODE:%{http_code}" -X GET "http://localhost:8088/api/v1/teacher/students?page=0&size=20" \
  -H "Authorization: Bearer $TOKEN")

HTTP_CODE=$(echo "$STUDENTS_RESPONSE" | grep "HTTP_CODE" | cut -d':' -f2)
RESPONSE_BODY=$(echo "$STUDENTS_RESPONSE" | sed '/HTTP_CODE/d')

echo "Response: $RESPONSE_BODY"
echo "HTTP Code: $HTTP_CODE"
echo ""

if [ "$HTTP_CODE" = "200" ]; then
    echo "✅ Students endpoint works!"
    echo ""
    echo "=== SUCCESS! ==="
    echo "The API is working correctly."
    echo "If frontend still shows 403, check:"
    echo "  1. Frontend is sending Authorization header"
    echo "  2. Token is not expired"
    echo "  3. User is logged in as teacher"
else
    echo "❌ Students endpoint failed with code $HTTP_CODE"
    echo ""
    echo "=== FAILED ==="
    echo "Possible issues:"
    echo "  1. Backend not restarted after adding TeacherController"
    echo "  2. Compilation error in TeacherController"
    echo "  3. Security configuration issue"
    echo ""
    echo "Try:"
    echo "  1. Restart backend: cd api && ./mvnw spring-boot:run"
    echo "  2. Check logs for errors"
    echo "  3. Verify TeacherController.java compiled successfully"
fi
