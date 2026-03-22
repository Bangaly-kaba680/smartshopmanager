"""
Test Admin and Owner Features - Iteration 5
Tests for:
- Admin user CRUD, shop management, subscription plans, global stats
- Owner financial analysis, sales by seller/product, stock alerts, employee permissions
- Product returns, Seller performance tracking
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
SUPER_ADMIN_EMAIL = "bangalykaba635@gmail.com"
SUPER_ADMIN_PASSWORD = "admin123"
CEO_EMAIL = "admin@startup.com"
CEO_PASSWORD = "admin123"
OWNER_EMAIL = "testowner@example.com"
OWNER_PASSWORD = "password123"


class TestAuthentication:
    """Test authentication for different roles"""
    
    def test_super_admin_login(self):
        """Super Admin login should return token with super_admin role"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": SUPER_ADMIN_EMAIL,
            "password": SUPER_ADMIN_PASSWORD
        })
        assert response.status_code == 200, f"Super Admin login failed: {response.text}"
        data = response.json()
        assert "access_token" in data
        assert data["user"]["role"] == "super_admin"
        print(f"✅ Super Admin login successful - role: {data['user']['role']}")
    
    def test_ceo_login(self):
        """CEO login should return token with ceo role"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": CEO_EMAIL,
            "password": CEO_PASSWORD
        })
        assert response.status_code == 200, f"CEO login failed: {response.text}"
        data = response.json()
        assert "access_token" in data
        assert data["user"]["role"] == "ceo"
        print(f"✅ CEO login successful - role: {data['user']['role']}")
    
    def test_owner_login(self):
        """Owner login should return token with owner role"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": OWNER_EMAIL,
            "password": OWNER_PASSWORD
        })
        assert response.status_code == 200, f"Owner login failed: {response.text}"
        data = response.json()
        assert "access_token" in data
        assert data["user"]["role"] == "owner"
        print(f"✅ Owner login successful - role: {data['user']['role']}")
    
    def test_invalid_credentials(self):
        """Invalid credentials should return 401"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "invalid@test.com",
            "password": "wrongpassword"
        })
        assert response.status_code == 401
        print("✅ Invalid credentials correctly rejected with 401")


@pytest.fixture
def admin_token():
    """Get admin token for authenticated requests"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": SUPER_ADMIN_EMAIL,
        "password": SUPER_ADMIN_PASSWORD
    })
    if response.status_code == 200:
        return response.json()["access_token"]
    pytest.skip("Admin authentication failed")


@pytest.fixture
def owner_token():
    """Get owner token for authenticated requests"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": OWNER_EMAIL,
        "password": OWNER_PASSWORD
    })
    if response.status_code == 200:
        return response.json()["access_token"]
    pytest.skip("Owner authentication failed")


class TestAdminUserManagement:
    """Test Admin User CRUD operations"""
    
    def test_admin_list_users(self, admin_token):
        """Admin should be able to list all users"""
        response = requests.get(
            f"{BASE_URL}/api/admin/users",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200, f"Failed to list users: {response.text}"
        users = response.json()
        assert isinstance(users, list)
        assert len(users) >= 3, f"Expected at least 3 users, got {len(users)}"
        
        # Check user structure
        for user in users:
            assert "id" in user
            assert "email" in user
            assert "role" in user
            assert "password" not in user  # Password should not be exposed
        
        print(f"✅ Admin listed {len(users)} users with role badges")
    
    def test_admin_create_user(self, admin_token):
        """Admin should be able to create a new user"""
        import uuid
        test_email = f"test_user_{uuid.uuid4().hex[:8]}@example.com"
        
        response = requests.post(
            f"{BASE_URL}/api/admin/users",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={
                "name": "Test User",
                "email": test_email,
                "password": "testpass123",
                "role": "owner",
                "company_name": "Test Company",
                "phone": "+221771234567"
            }
        )
        assert response.status_code == 200, f"Failed to create user: {response.text}"
        data = response.json()
        assert "user" in data
        assert data["user"]["email"] == test_email
        assert data["user"]["role"] == "owner"
        
        # Verify user was created with shop (for owner role)
        user_id = data["user"]["id"]
        print(f"✅ Admin created user {test_email} with role 'owner'")
        
        # Cleanup - delete the test user
        requests.delete(
            f"{BASE_URL}/api/admin/users/{user_id}",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
    
    def test_admin_suspend_user(self, admin_token):
        """Admin should be able to suspend a user"""
        # First create a test user
        import uuid
        test_email = f"suspend_test_{uuid.uuid4().hex[:8]}@example.com"
        
        create_response = requests.post(
            f"{BASE_URL}/api/admin/users",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={
                "name": "Suspend Test",
                "email": test_email,
                "password": "testpass123",
                "role": "seller"
            }
        )
        assert create_response.status_code == 200
        user_id = create_response.json()["user"]["id"]
        
        # Suspend the user
        suspend_response = requests.post(
            f"{BASE_URL}/api/admin/users/{user_id}/suspend",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert suspend_response.status_code == 200, f"Failed to suspend: {suspend_response.text}"
        
        # Verify user is suspended
        users_response = requests.get(
            f"{BASE_URL}/api/admin/users",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        users = users_response.json()
        suspended_user = next((u for u in users if u["id"] == user_id), None)
        assert suspended_user is not None
        # is_active can be False or "false" string depending on DB
        assert suspended_user.get("is_active") in [False, "false"], f"User not suspended: {suspended_user}"
        
        print(f"✅ Admin suspended user - is_active set to false")
        
        # Cleanup
        requests.delete(
            f"{BASE_URL}/api/admin/users/{user_id}",
            headers={"Authorization": f"Bearer {admin_token}"}
        )


class TestAdminShopManagement:
    """Test Admin Shop Management"""
    
    def test_admin_list_shops(self, admin_token):
        """Admin should be able to list all shops with owner info"""
        response = requests.get(
            f"{BASE_URL}/api/admin/shops",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200, f"Failed to list shops: {response.text}"
        shops = response.json()
        assert isinstance(shops, list)
        assert len(shops) >= 1, f"Expected at least 1 shop, got {len(shops)}"
        
        # Check shop structure includes owner info
        for shop in shops:
            assert "id" in shop
            assert "name" in shop
            assert "owner_name" in shop
            assert "owner_email" in shop
        
        print(f"✅ Admin listed {len(shops)} shops with owner info")
    
    def test_admin_deactivate_activate_shop(self, admin_token):
        """Admin should be able to deactivate and activate shops"""
        # Get first shop
        shops_response = requests.get(
            f"{BASE_URL}/api/admin/shops",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        shops = shops_response.json()
        if not shops:
            pytest.skip("No shops available for testing")
        
        shop_id = shops[0]["id"]
        
        # Deactivate
        deactivate_response = requests.post(
            f"{BASE_URL}/api/admin/shops/{shop_id}/deactivate",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert deactivate_response.status_code == 200
        print(f"✅ Admin deactivated shop {shop_id}")
        
        # Re-activate
        activate_response = requests.post(
            f"{BASE_URL}/api/admin/shops/{shop_id}/activate",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert activate_response.status_code == 200
        print(f"✅ Admin re-activated shop {shop_id}")


class TestAdminSubscriptions:
    """Test Admin Subscription Plans"""
    
    def test_admin_list_subscriptions(self, admin_token):
        """Admin should see 3 default subscription plans"""
        response = requests.get(
            f"{BASE_URL}/api/admin/subscriptions",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200, f"Failed to list subscriptions: {response.text}"
        plans = response.json()
        assert isinstance(plans, list)
        assert len(plans) >= 3, f"Expected at least 3 plans, got {len(plans)}"
        
        # Check for expected plans
        plan_names = [p["name"] for p in plans]
        assert "Gratuit" in plan_names, f"Missing 'Gratuit' plan. Plans: {plan_names}"
        assert "Professionnel" in plan_names, f"Missing 'Professionnel' plan. Plans: {plan_names}"
        assert "Premium" in plan_names, f"Missing 'Premium' plan. Plans: {plan_names}"
        
        # Check plan structure
        for plan in plans:
            assert "id" in plan
            assert "name" in plan
            assert "price" in plan
            assert "features" in plan
        
        print(f"✅ Admin listed {len(plans)} subscription plans: {plan_names}")


class TestAdminPlatformStats:
    """Test Admin Platform Statistics"""
    
    def test_admin_platform_stats(self, admin_token):
        """Admin should get global platform statistics"""
        response = requests.get(
            f"{BASE_URL}/api/admin/platform-stats",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200, f"Failed to get platform stats: {response.text}"
        stats = response.json()
        
        # Check required fields
        assert "total_users" in stats
        assert "total_shops" in stats
        assert "total_revenue" in stats
        assert "total_products" in stats
        assert "total_sales" in stats
        assert "users_by_role" in stats
        
        print(f"✅ Admin platform stats: {stats['total_users']} users, {stats['total_shops']} shops, {stats['total_revenue']} GNF revenue")


class TestOwnerFinancialAnalysis:
    """Test Owner Financial Analysis"""
    
    def test_owner_financial_analysis(self, owner_token):
        """Owner should get financial analysis with profit calculations"""
        response = requests.get(
            f"{BASE_URL}/api/owner/financial-analysis",
            headers={"Authorization": f"Bearer {owner_token}"}
        )
        assert response.status_code == 200, f"Failed to get financial analysis: {response.text}"
        data = response.json()
        
        # Check structure
        assert "today" in data
        assert "monthly" in data
        assert "revenue" in data["today"]
        assert "profit" in data["today"]
        assert "revenue" in data["monthly"]
        assert "profit" in data["monthly"]
        
        print(f"✅ Owner financial analysis: Today revenue={data['today']['revenue']}, Monthly revenue={data['monthly']['revenue']}")


class TestOwnerStockAlerts:
    """Test Owner Stock Alerts"""
    
    def test_owner_stock_alerts(self, owner_token):
        """Owner should get products with low stock"""
        response = requests.get(
            f"{BASE_URL}/api/owner/stock-alerts",
            headers={"Authorization": f"Bearer {owner_token}"}
        )
        assert response.status_code == 200, f"Failed to get stock alerts: {response.text}"
        data = response.json()
        
        # Check structure
        assert "alerts" in data
        assert "total_alerts" in data
        assert isinstance(data["alerts"], list)
        
        # If there are alerts, check structure
        if data["alerts"]:
            alert = data["alerts"][0]
            assert "product_id" in alert
            assert "product_name" in alert
            assert "current_stock" in alert
            assert "threshold" in alert
        
        print(f"✅ Owner stock alerts: {data['total_alerts']} alerts")


class TestOwnerSalesBySellerProduct:
    """Test Owner Sales by Seller and Product"""
    
    def test_owner_sales_by_seller(self, owner_token):
        """Owner should view sales grouped by seller"""
        response = requests.get(
            f"{BASE_URL}/api/owner/sales-by-seller",
            headers={"Authorization": f"Bearer {owner_token}"}
        )
        assert response.status_code == 200, f"Failed to get sales by seller: {response.text}"
        data = response.json()
        assert isinstance(data, list)
        
        # If there are sales, check structure
        if data:
            seller = data[0]
            assert "name" in seller
            assert "total" in seller
            assert "count" in seller
        
        print(f"✅ Owner sales by seller: {len(data)} sellers")
    
    def test_owner_sales_by_product(self, owner_token):
        """Owner should view sales grouped by product"""
        response = requests.get(
            f"{BASE_URL}/api/owner/sales-by-product",
            headers={"Authorization": f"Bearer {owner_token}"}
        )
        assert response.status_code == 200, f"Failed to get sales by product: {response.text}"
        data = response.json()
        assert isinstance(data, list)
        
        print(f"✅ Owner sales by product: {len(data)} products")


class TestProductReturns:
    """Test Product Returns"""
    
    def test_list_returns(self, owner_token):
        """Should list product returns"""
        response = requests.get(
            f"{BASE_URL}/api/returns",
            headers={"Authorization": f"Bearer {owner_token}"}
        )
        assert response.status_code == 200, f"Failed to list returns: {response.text}"
        data = response.json()
        assert isinstance(data, list)
        
        print(f"✅ Returns list: {len(data)} returns")


class TestSellerPerformance:
    """Test Seller Performance Tracking"""
    
    def test_seller_my_performance(self, owner_token):
        """Seller should view own performance"""
        response = requests.get(
            f"{BASE_URL}/api/seller/my-performance",
            headers={"Authorization": f"Bearer {owner_token}"}
        )
        assert response.status_code == 200, f"Failed to get seller performance: {response.text}"
        data = response.json()
        
        # Check structure
        assert "today" in data
        assert "all_time" in data
        assert "sales_count" in data["today"]
        assert "revenue" in data["today"]
        
        print(f"✅ Seller performance: Today={data['today']['sales_count']} sales, All time={data['all_time']['sales_count']} sales")
    
    def test_seller_available_products(self, owner_token):
        """Seller should view available products with stock"""
        response = requests.get(
            f"{BASE_URL}/api/seller/available-products",
            headers={"Authorization": f"Bearer {owner_token}"}
        )
        assert response.status_code == 200, f"Failed to get available products: {response.text}"
        data = response.json()
        assert isinstance(data, list)
        
        # If there are products, check structure
        if data:
            product = data[0]
            assert "id" in product
            assert "name" in product
            assert "sell_price" in product
            assert "stock_quantity" in product
        
        print(f"✅ Seller available products: {len(data)} products")


class TestShopInfo:
    """Test Shop Info endpoint"""
    
    def test_owner_shop_info(self, owner_token):
        """Owner should get own shop info"""
        response = requests.get(
            f"{BASE_URL}/api/shop/info",
            headers={"Authorization": f"Bearer {owner_token}"}
        )
        assert response.status_code == 200, f"Failed to get shop info: {response.text}"
        data = response.json()
        
        assert "id" in data
        assert "name" in data
        
        print(f"✅ Owner shop info: {data['name']}")


class TestRBACAccess:
    """Test Role-Based Access Control"""
    
    def test_owner_cannot_access_admin_users(self, owner_token):
        """Owner should NOT be able to access admin user management"""
        response = requests.get(
            f"{BASE_URL}/api/admin/users",
            headers={"Authorization": f"Bearer {owner_token}"}
        )
        assert response.status_code == 403, f"Owner should not access admin users, got {response.status_code}"
        print("✅ RBAC: Owner correctly denied access to admin users")
    
    def test_owner_cannot_access_admin_shops(self, owner_token):
        """Owner should NOT be able to access admin shop management"""
        response = requests.get(
            f"{BASE_URL}/api/admin/shops",
            headers={"Authorization": f"Bearer {owner_token}"}
        )
        assert response.status_code == 403, f"Owner should not access admin shops, got {response.status_code}"
        print("✅ RBAC: Owner correctly denied access to admin shops")
    
    def test_owner_cannot_access_platform_stats(self, owner_token):
        """Owner should NOT be able to access platform stats"""
        response = requests.get(
            f"{BASE_URL}/api/admin/platform-stats",
            headers={"Authorization": f"Bearer {owner_token}"}
        )
        assert response.status_code == 403, f"Owner should not access platform stats, got {response.status_code}"
        print("✅ RBAC: Owner correctly denied access to platform stats")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
