"""
Test script for Streaming API
Debug HTTP 500 error

Run: python scripts/test_streaming_api.py
"""

import asyncio
import httpx
import sys

# Configuration
BASE_URL = "https://maritime-ai-chatbot.onrender.com"
# BASE_URL = "http://localhost:8000"  # For local testing
API_KEY = "maritime-lms-prod-2024"

async def test_health():
    """Test health endpoint"""
    print("=" * 50)
    print("1. Testing /health...")
    async with httpx.AsyncClient() as client:
        try:
            resp = await client.get(f"{BASE_URL}/health", timeout=30)
            print(f"   Status: {resp.status_code}")
            print(f"   Response: {resp.json()}")
            return resp.status_code == 200
        except Exception as e:
            print(f"   Error: {e}")
            return False

async def test_non_streaming():
    """Test non-streaming chat endpoint"""
    print("=" * 50)
    print("2. Testing /api/v1/chat (non-streaming)...")
    
    payload = {
        "user_id": "test-debug-user",
        "message": "Hello",
        "role": "student"
    }
    
    async with httpx.AsyncClient(follow_redirects=True) as client:
        try:
            resp = await client.post(
                f"{BASE_URL}/api/v1/chat",  # No trailing slash
                json=payload,
                headers={
                    "Content-Type": "application/json",
                    "X-API-Key": API_KEY
                },
                timeout=120
            )
            print(f"   Status: {resp.status_code}")
            if resp.status_code == 200:
                data = resp.json()
                print(f"   Answer: {data.get('data', {}).get('answer', '')[:100]}...")
                return True
            else:
                print(f"   Error: {resp.text[:500]}")
                return False
        except Exception as e:
            print(f"   Error: {e}")
            return False

async def test_streaming():
    """Test streaming chat endpoint"""
    print("=" * 50)
    print("3. Testing /api/v1/chat/stream (streaming)...")
    
    payload = {
        "user_id": "test-debug-user",
        "message": "Hello",
        "role": "student"
    }
    
    async with httpx.AsyncClient() as client:
        try:
            resp = await client.post(
                f"{BASE_URL}/api/v1/chat/stream",
                json=payload,
                headers={
                    "Content-Type": "application/json",
                    "X-API-Key": API_KEY,
                    "Accept": "text/event-stream"
                },
                timeout=120
            )
            print(f"   Status: {resp.status_code}")
            
            if resp.status_code == 200:
                print(f"   Content-Type: {resp.headers.get('content-type')}")
                print("   SSE Events received:")
                event_count = 0
                for line in resp.text.split('\n'):
                    if line.startswith('event:') or line.startswith('data:'):
                        print(f"     {line[:100]}")
                        event_count += 1
                        if event_count > 10:
                            print("     ... (truncated)")
                            break
                return True
            else:
                print(f"   Error Response: {resp.text[:500]}")
                return False
                
        except Exception as e:
            print(f"   Error: {e}")
            import traceback
            traceback.print_exc()
            return False

async def test_streaming_with_stream():
    """Test streaming with true streaming response"""
    print("=" * 50)
    print("4. Testing /api/v1/chat/stream (with true streaming)...")
    
    payload = {
        "user_id": "test-debug-user",
        "message": "Điều 15 là gì?",
        "role": "student"
    }
    
    async with httpx.AsyncClient() as client:
        try:
            async with client.stream(
                "POST",
                f"{BASE_URL}/api/v1/chat/stream",
                json=payload,
                headers={
                    "Content-Type": "application/json",
                    "X-API-Key": API_KEY,
                    "Accept": "text/event-stream"
                },
                timeout=120
            ) as resp:
                print(f"   Status: {resp.status_code}")
                print(f"   Headers: {dict(resp.headers)}")
                
                if resp.status_code == 200:
                    print("   Streaming events:")
                    event_count = 0
                    async for line in resp.aiter_lines():
                        if line:
                            print(f"     {line[:150]}")
                            event_count += 1
                            if event_count > 15:
                                print("     ... (truncated)")
                                break
                    return True
                else:
                    content = await resp.aread()
                    print(f"   Error: {content.decode()[:500]}")
                    return False
                    
        except Exception as e:
            print(f"   Error: {e}")
            import traceback
            traceback.print_exc()
            return False

async def main():
    print("\n" + "=" * 50)
    print("STREAMING API DEBUG TEST")
    print(f"Target: {BASE_URL}")
    print("=" * 50)
    
    results = {
        "health": await test_health(),
        "non_streaming": await test_non_streaming(),
        "streaming": await test_streaming(),
        "streaming_true": await test_streaming_with_stream()
    }
    
    print("\n" + "=" * 50)
    print("SUMMARY")
    print("=" * 50)
    for test, passed in results.items():
        status = "✅ PASS" if passed else "❌ FAIL"
        print(f"  {test}: {status}")
    
    if all(results.values()):
        print("\nAll tests passed!")
        return 0
    else:
        print("\nSome tests failed!")
        return 1

if __name__ == "__main__":
    sys.exit(asyncio.run(main()))
