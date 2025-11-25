#!/bin/bash

# Test script to verify duplicate quiz fix

echo "=========================================="
echo "Testing Duplicate Quiz Fix"
echo "=========================================="

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
API_URL="http://localhost:8080/api/v1"
LESSON_ID="8b7b8107-f487-46e7-b678-e60336e5c34f"
TOKEN="YOUR_BEARER_TOKEN_HERE"

echo -e "${YELLOW}Step 1: Verify database cleanup${NC}"
echo "Run this SQL query to check for duplicates:"
echo "SELECT lesson_id, COUNT(*) as quiz_count FROM quizzes WHERE lesson_id IS NOT NULL GROUP BY lesson_id HAVING COUNT(*) > 1;"
echo ""

echo -e "${YELLOW}Step 2: Test creating quiz (first time)${NC}"
curl -X POST "$API_URL/quizzes/lessons/$LESSON_ID" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "questionIds": [],
    "timeLimitMinutes": 30,
    "maxAttempts": 1,
    "passingScore": 60,
    "shuffleQuestions": false,
    "shuffleOptions": false,
    "showResultsImmediately": true,
    "showCorrectAnswers": false
  }'
echo ""
echo ""

echo -e "${YELLOW}Step 3: Test creating quiz (second time - should return existing)${NC}"
curl -X POST "$API_URL/quizzes/lessons/$LESSON_ID" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "questionIds": [],
    "timeLimitMinutes": 30,
    "maxAttempts": 1,
    "passingScore": 60,
    "shuffleQuestions": false,
    "shuffleOptions": false,
    "showResultsImmediately": true,
    "showCorrectAnswers": false
  }'
echo ""
echo ""

echo -e "${GREEN}✅ Test completed!${NC}"
echo "If both requests returned the same quiz ID, the fix is working correctly."
