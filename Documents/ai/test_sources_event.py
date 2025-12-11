#!/usr/bin/env python3
"""
Test script to check sources event from AI Service
Run: python Documents/ai/test_sources_event.py
"""

import requests
import json

AI_SERVICE_URL = "https://maritime-ai-chatbot.onrender.com"
API_KEY = "maritime-lms-prod-2024"

def test_streaming():
    """Test streaming endpoint and look for sources event"""
    url = f"{AI_SERVICE_URL}/api/v1/chat/stream"
    
    headers = {
        "Content-Type": "application/json",
        "X-API-Key": API_KEY,
        "Accept": "text/event-stream"
    }
    
    payload = {
        "user_id": "test-user",
        "message": "Điều 15 Luật Hàng hải 2015",
        "role": "student"
    }
    
    print(f"🚀 Sending request to {url}")
    print(f"📦 Payload: {json.dumps(payload, ensure_ascii=False)}")
    print("-" * 50)
    
    try:
        response = requests.post(url, json=payload, headers=headers, stream=True, timeout=120)
        
        print(f"📡 Response status: {response.status_code}")
        print("-" * 50)
        
        sources_found = False
        event_count = 0
        
        for line in response.iter_lines():
            if line:
                decoded = line.decode('utf-8')
                event_count += 1
                
                # Check for sources
                if 'sources' in decoded.lower():
                    sources_found = True
                    print(f"🎯 SOURCES FOUND in line {event_count}:")
                    print(decoded)
                    print("-" * 30)
                
                # Print event type lines
                if decoded.startswith('event:'):
                    print(f"📨 {decoded}")
                
                # Print data lines (truncated)
                if decoded.startswith('data:'):
                    data_preview = decoded[:200] + "..." if len(decoded) > 200 else decoded
                    print(f"📦 {data_preview}")
        
        print("-" * 50)
        print(f"📊 Total events: {event_count}")
        print(f"🎯 Sources found: {sources_found}")
        
    except Exception as e:
        print(f"❌ Error: {e}")

if __name__ == "__main__":
    test_streaming()
