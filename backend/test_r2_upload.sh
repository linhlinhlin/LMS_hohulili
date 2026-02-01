#!/bin/bash
# Test R2 Upload Script

# Create a test image file
echo "Creating test image..."
# Using a simple 1x1 red PNG
echo -n "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==" | base64 -d > test_image.png

# Get a valid JWT token (you need to replace this with your actual token)
TOKEN="YOUR_JWT_TOKEN_HERE"

# Test upload
echo "Testing upload to R2..."
curl -X POST "http://localhost:8088/api/v3/files/upload/editor" \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@test_image.png" \
  -F "folder=test-uploads" \
  -v

echo ""
echo "Done. Check the response above for success: 1 and file.url should be R2 CDN URL"
