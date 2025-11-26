#!/bin/bash

# Test script to verify quiz loading functionality

echo "🔍 Testing Quiz Loading Functionality"
echo "======================================"

# Get a lesson ID (you need to replace this with actual lesson ID)
LESSON_ID="your-lesson-id-here"
TEACHER_ID="your-teacher-id-here"

echo ""
echo "1. Testing auto-populate quiz questions..."
curl -X POST "http://localhost:8080/api/v1/quizzes/lessons/$LESSON_ID/auto-populate-questions" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json"

echo ""
echo ""
echo "2. Testing get quiz questions..."
curl -X GET "http://localhost:8080/api/v1/quizzes/lessons/$LESSON_ID/questions" \
  -H "Authorization: Bearer YOUR_TOKEN"

echo ""
echo ""
echo "3. Testing create sample questions..."
curl -X POST "http://localhost:8080/api/v1/quizzes/lessons/$LESSON_ID/create-sample-questions" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json"

echo ""
echo "✅ Test completed"
