#!/usr/bin/env python3
"""
Focused test for Reviews System to verify the delivery requirement logic
"""

import asyncio
import aiohttp
import json

BASE_URL = "https://ecommerce-otp-system.preview.emergentagent.com"
API_BASE = f"{BASE_URL}/api"

async def test_reviews_system_focused():
    """Test reviews system with proper order sequencing"""
    print("🔍 FOCUSED REVIEWS SYSTEM TEST")
    print("="*50)
    
    async with aiohttp.ClientSession() as session:
        
        async def make_request(method, endpoint, json_data=None, params=None):
            """Make HTTP request with error handling"""
            url = f"{API_BASE}{endpoint}"
            try:
                async with session.request(
                    method, url, 
                    json=json_data, 
                    params=params,
                    headers={"Content-Type": "application/json"}
                ) as response:
                    response_text = await response.text()
                    try:
                        response_json = json.loads(response_text) if response_text else {}
                    except json.JSONDecodeError:
                        response_json = {"raw_response": response_text}
                    
                    return {
                        'status': response.status,
                        'data': response_json,
                        'headers': dict(response.headers)
                    }
            except Exception as e:
                return {'status': 0, 'data': {'error': str(e)}, 'headers': {}}
        
        # Get available products
        products_result = await make_request('GET', '/products')
        if products_result['status'] != 200 or not products_result['data']:
            print("❌ No products available for testing")
            return False
        
        products = products_result['data']
        test_product = products[0]
        
        print(f"Using product: {test_product['name']} (ID: {test_product['id']})")
        
        # Create a fresh order for reviews testing
        order_data = {
            "items": [{"productId": test_product['id'], "quantity": 1}],
            "customerName": "Reviews Test User",
            "phone": "+1111111111",
            "email": "reviews@test.com"
        }
        
        order_result = await make_request('POST', '/orders', order_data)
        if order_result['status'] != 201:
            print(f"❌ Failed to create test order: {order_result['status']}")
            return False
        
        order = order_result['data']
        order_id = order['id']
        product_id = test_product['id']
        
        print(f"✅ Created fresh test order: {order_id}")
        print(f"   Order status: {order['status']}")
        
        # Test 1: Try to create review before delivery (should fail)
        print("\n1️⃣ Testing review creation before delivery...")
        
        review_data = {
            "orderId": order_id,
            "productId": product_id,
            "rating": 5,
            "comment": "Great product!",
            "customerName": "Reviews Test User"
        }
        
        review_result = await make_request('POST', '/reviews', review_data)
        print(f"   Review attempt result: Status {review_result['status']}")
        print(f"   Response: {review_result['data']}")
        
        if review_result['status'] == 400:
            error_msg = review_result['data'].get('error', '')
            if 'delivery' in error_msg.lower():
                print("✅ Review correctly rejected before delivery")
            else:
                print(f"❌ Wrong error message: {error_msg}")
                return False
        else:
            print(f"❌ Review should be rejected with 400, got {review_result['status']}")
            return False
        
        # Test 2: Update order to DELIVERED
        print("\n2️⃣ Marking order as DELIVERED...")
        
        status_data = {"status": "DELIVERED"}
        status_result = await make_request('PUT', f'/orders/{order_id}/status', status_data)
        
        if status_result['status'] == 200:
            print("✅ Order marked as DELIVERED")
            
            # Verify order status
            order_check = await make_request('GET', f'/orders/{order_id}')
            if order_check['status'] == 200:
                updated_order = order_check['data']
                print(f"   Verified order status: {updated_order['status']}")
            
        else:
            print(f"❌ Failed to mark order as delivered: {status_result['status']}")
            return False
        
        # Test 3: Now try to create review (should succeed)
        print("\n3️⃣ Testing review creation after delivery...")
        
        review_result = await make_request('POST', '/reviews', review_data)
        print(f"   Review creation result: Status {review_result['status']}")
        
        if review_result['status'] == 201:
            review = review_result['data']
            print(f"✅ Review created successfully: {review['id']}")
            print(f"   Rating: {review['rating']}, Comment: {review['comment']}")
            
            # Test 4: Get reviews for product
            print("\n4️⃣ Testing product reviews retrieval...")
            
            params = {'productId': product_id}
            reviews_result = await make_request('GET', '/reviews', params=params)
            
            if reviews_result['status'] == 200:
                reviews = reviews_result['data']
                review_found = any(r['id'] == review['id'] for r in reviews)
                print(f"✅ Product has {len(reviews)} reviews")
                
                if review_found:
                    print("✅ Created review found in product reviews")
                    return True
                else:
                    print("❌ Created review not found in product reviews")
            else:
                print(f"❌ Failed to get product reviews: {reviews_result['status']}")
        else:
            print(f"❌ Review creation after delivery failed: {review_result['status']}")
            print(f"   Error: {review_result['data']}")
        
        return False

async def main():
    success = await test_reviews_system_focused()
    
    print("\n" + "="*50)
    if success:
        print("🎉 REVIEWS SYSTEM TEST: ✅ PASSED")
        print("   • Correctly rejects reviews before delivery")
        print("   • Allows reviews after delivery")
        print("   • Reviews appear in product listings")
    else:
        print("💥 REVIEWS SYSTEM TEST: ❌ FAILED")
    
    print("="*50)
    return success

if __name__ == "__main__":
    result = asyncio.run(main())