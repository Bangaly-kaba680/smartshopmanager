"""
Iteration 7 Tests - Multi-tenant SaaS Platform Features
Tests for:
- Owner employee management (create, block, activate, delete)
- Role-based dashboards (owner, manager, seller, cashier, stock_manager)
- QR code auto-generation and print/scan endpoints
- Stock approval workflow (stock_manager creates → manager approves)
- Activity audit log
- Products with buy_price/sell_price
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
CREDENTIALS = {
    "super_admin": {"email": "bangalykaba635@gmail.com", "password": "admin123"},
    "owner": {"email": "admin@startup.com", "password": "admin123"},
    "manager": {"email": "manager@test.com", "password": "changeme123"},
    "stock_manager": {"email": "stock@test.com", "password": "changeme123"},
    "seller": {"email": "vendeur@test.com", "password": "changeme123"},
    "cashier": {"email": "caissier@test.com", "password": "changeme123"},
}


class TestAuthentication:
    """Test login for all roles"""
    
    def test_owner_login(self):
        """Owner/CEO can login"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json=CREDENTIALS["owner"])
        assert response.status_code == 200, f"Owner login failed: {response.text}"
        data = response.json()
        assert "access_token" in data
        assert data["user"]["role"] in ("ceo", "owner")
        print(f"✅ Owner login successful - role: {data['user']['role']}")
    
    def test_manager_login(self):
        """Manager can login"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json=CREDENTIALS["manager"])
        if response.status_code == 401:
            pytest.skip("Manager account not created yet")
        assert response.status_code == 200, f"Manager login failed: {response.text}"
        data = response.json()
        assert data["user"]["role"] == "manager"
        print(f"✅ Manager login successful")
    
    def test_stock_manager_login(self):
        """Stock Manager can login"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json=CREDENTIALS["stock_manager"])
        if response.status_code == 401:
            pytest.skip("Stock Manager account not created yet")
        assert response.status_code == 200, f"Stock Manager login failed: {response.text}"
        data = response.json()
        assert data["user"]["role"] == "stock_manager"
        print(f"✅ Stock Manager login successful")
    
    def test_seller_login(self):
        """Seller can login"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json=CREDENTIALS["seller"])
        if response.status_code == 401:
            pytest.skip("Seller account not created yet")
        assert response.status_code == 200, f"Seller login failed: {response.text}"
        data = response.json()
        assert data["user"]["role"] == "seller"
        print(f"✅ Seller login successful")
    
    def test_cashier_login(self):
        """Cashier can login"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json=CREDENTIALS["cashier"])
        if response.status_code == 401:
            pytest.skip("Cashier account not created yet")
        assert response.status_code == 200, f"Cashier login failed: {response.text}"
        data = response.json()
        assert data["user"]["role"] == "cashier"
        print(f"✅ Cashier login successful")


class TestOwnerEmployeeManagement:
    """Test owner employee CRUD operations"""
    
    @pytest.fixture
    def owner_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json=CREDENTIALS["owner"])
        assert response.status_code == 200
        return response.json()["access_token"]
    
    def test_owner_list_employees(self, owner_token):
        """Owner can list employees via /api/owner/employees"""
        headers = {"Authorization": f"Bearer {owner_token}"}
        response = requests.get(f"{BASE_URL}/api/owner/employees", headers=headers)
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert isinstance(data, list)
        print(f"✅ Owner can list employees - count: {len(data)}")
    
    def test_owner_create_employee(self, owner_token):
        """Owner can create employee with role via POST /api/owner/employees"""
        headers = {"Authorization": f"Bearer {owner_token}"}
        import uuid
        unique_email = f"test_emp_{uuid.uuid4().hex[:8]}@test.com"
        payload = {
            "name": "TEST Employee",
            "email": unique_email,
            "position": "Test Position",
            "role": "seller",
            "salary": 100000,
            "contract_type": "CDD"
        }
        response = requests.post(f"{BASE_URL}/api/owner/employees", json=payload, headers=headers)
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert "employee" in data
        assert data["employee"]["role"] == "seller"
        assert data.get("account_created") == True
        assert data.get("default_password") == "changeme123"
        print(f"✅ Owner created employee with role 'seller' - account created with default password")
        
        # Cleanup - delete the test employee
        emp_id = data["employee"]["id"]
        requests.delete(f"{BASE_URL}/api/owner/employees/{emp_id}", headers=headers)
    
    def test_owner_create_employee_all_roles(self, owner_token):
        """Owner can create employees with all 4 roles"""
        headers = {"Authorization": f"Bearer {owner_token}"}
        import uuid
        roles = ["manager", "seller", "cashier", "stock_manager"]
        created_ids = []
        
        for role in roles:
            unique_email = f"test_{role}_{uuid.uuid4().hex[:6]}@test.com"
            payload = {
                "name": f"TEST {role.title()}",
                "email": unique_email,
                "position": f"{role.title()} Position",
                "role": role,
                "salary": 150000,
                "contract_type": "CDI"
            }
            response = requests.post(f"{BASE_URL}/api/owner/employees", json=payload, headers=headers)
            assert response.status_code == 200, f"Failed to create {role}: {response.text}"
            data = response.json()
            assert data["employee"]["role"] == role
            created_ids.append(data["employee"]["id"])
            print(f"  ✅ Created employee with role: {role}")
        
        # Cleanup
        for emp_id in created_ids:
            requests.delete(f"{BASE_URL}/api/owner/employees/{emp_id}", headers=headers)
        print(f"✅ Owner can create employees with all 4 roles (manager, seller, cashier, stock_manager)")


class TestQRCodeFeatures:
    """Test QR code auto-generation and endpoints"""
    
    @pytest.fixture
    def owner_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json=CREDENTIALS["owner"])
        assert response.status_code == 200
        return response.json()["access_token"]
    
    def test_product_creation_generates_qr(self, owner_token):
        """POST /api/products should return qr_code field"""
        headers = {"Authorization": f"Bearer {owner_token}"}
        import uuid
        payload = {
            "name": f"TEST QR Product {uuid.uuid4().hex[:6]}",
            "category": "Vetements",
            "buy_price": 5000,
            "sell_price": 10000,
            "description": "Test product for QR"
        }
        response = requests.post(f"{BASE_URL}/api/products", json=payload, headers=headers)
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert "qr_code" in data, "Product should have qr_code field"
        assert data["qr_code"] is not None, "qr_code should not be None"
        assert len(data["qr_code"]) > 100, "qr_code should be base64 encoded PNG"
        print(f"✅ Product creation auto-generates QR code (base64 length: {len(data['qr_code'])})")
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/products/{data['id']}", headers=headers)
    
    def test_qr_print_endpoint(self, owner_token):
        """GET /api/products/{id}/qr-print returns QR data"""
        headers = {"Authorization": f"Bearer {owner_token}"}
        # Get existing product
        products_res = requests.get(f"{BASE_URL}/api/products", headers=headers)
        products = products_res.json()
        if not products:
            pytest.skip("No products to test QR print")
        
        product_id = products[0]["id"]
        response = requests.get(f"{BASE_URL}/api/products/{product_id}/qr-print", headers=headers)
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert "qr_code" in data
        assert "product_name" in data
        assert "sell_price" in data
        assert "category" in data
        print(f"✅ QR print endpoint returns: product_name, sell_price, category, qr_code")
    
    def test_qr_scan_endpoint_public(self):
        """GET /api/products/{id}/qr-scan returns product info (public)"""
        # First get a product ID
        owner_res = requests.post(f"{BASE_URL}/api/auth/login", json=CREDENTIALS["owner"])
        token = owner_res.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}
        products_res = requests.get(f"{BASE_URL}/api/products", headers=headers)
        products = products_res.json()
        if not products:
            pytest.skip("No products to test QR scan")
        
        product_id = products[0]["id"]
        # Call without auth (public endpoint)
        response = requests.get(f"{BASE_URL}/api/products/{product_id}/qr-scan")
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert "name" in data
        assert "sell_price" in data
        assert "buy_price" in data
        assert "stock_quantity" in data
        print(f"✅ QR scan endpoint (public) returns: name, sell_price, buy_price, stock_quantity")


class TestStockApprovalWorkflow:
    """Test stock modification approval workflow"""
    
    @pytest.fixture
    def owner_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json=CREDENTIALS["owner"])
        assert response.status_code == 200
        return response.json()["access_token"]
    
    @pytest.fixture
    def stock_manager_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json=CREDENTIALS["stock_manager"])
        if response.status_code != 200:
            pytest.skip("Stock manager account not available")
        return response.json()["access_token"]
    
    @pytest.fixture
    def manager_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json=CREDENTIALS["manager"])
        if response.status_code != 200:
            pytest.skip("Manager account not available")
        return response.json()["access_token"]
    
    def test_create_stock_request(self, owner_token):
        """Stock request can be created via POST /api/stock-requests"""
        headers = {"Authorization": f"Bearer {owner_token}"}
        # Get a product
        products_res = requests.get(f"{BASE_URL}/api/products", headers=headers)
        products = products_res.json()
        if not products:
            pytest.skip("No products to test stock request")
        
        product_id = products[0]["id"]
        payload = {
            "product_id": product_id,
            "action": "add",
            "quantity": 10,
            "reason": "TEST - Restocking"
        }
        response = requests.post(f"{BASE_URL}/api/stock-requests", json=payload, headers=headers)
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert "request" in data
        assert data["request"]["status"] == "pending"
        assert data["request"]["action"] == "add"
        assert data["request"]["quantity"] == 10
        print(f"✅ Stock request created with status 'pending'")
    
    def test_list_stock_requests(self, owner_token):
        """GET /api/stock-requests returns list of requests"""
        headers = {"Authorization": f"Bearer {owner_token}"}
        response = requests.get(f"{BASE_URL}/api/stock-requests", headers=headers)
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert isinstance(data, list)
        print(f"✅ Stock requests list returned - count: {len(data)}")
    
    def test_filter_pending_requests(self, owner_token):
        """GET /api/stock-requests?status=pending filters correctly"""
        headers = {"Authorization": f"Bearer {owner_token}"}
        response = requests.get(f"{BASE_URL}/api/stock-requests?status=pending", headers=headers)
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        for req in data:
            assert req["status"] == "pending"
        print(f"✅ Stock requests filter by status works - pending count: {len(data)}")
    
    def test_approve_stock_request(self, owner_token):
        """Manager/Owner can approve stock request"""
        headers = {"Authorization": f"Bearer {owner_token}"}
        # Create a request first
        products_res = requests.get(f"{BASE_URL}/api/products", headers=headers)
        products = products_res.json()
        if not products:
            pytest.skip("No products")
        
        product_id = products[0]["id"]
        create_res = requests.post(f"{BASE_URL}/api/stock-requests", json={
            "product_id": product_id,
            "action": "add",
            "quantity": 5,
            "reason": "TEST approval"
        }, headers=headers)
        request_id = create_res.json()["request"]["id"]
        
        # Approve it
        response = requests.post(f"{BASE_URL}/api/stock-requests/{request_id}/approve", headers=headers)
        assert response.status_code == 200, f"Failed: {response.text}"
        print(f"✅ Stock request approved successfully")
    
    def test_reject_stock_request(self, owner_token):
        """Manager/Owner can reject stock request"""
        headers = {"Authorization": f"Bearer {owner_token}"}
        products_res = requests.get(f"{BASE_URL}/api/products", headers=headers)
        products = products_res.json()
        if not products:
            pytest.skip("No products")
        
        product_id = products[0]["id"]
        create_res = requests.post(f"{BASE_URL}/api/stock-requests", json={
            "product_id": product_id,
            "action": "remove",
            "quantity": 2,
            "reason": "TEST rejection"
        }, headers=headers)
        request_id = create_res.json()["request"]["id"]
        
        # Reject it
        response = requests.post(f"{BASE_URL}/api/stock-requests/{request_id}/reject", headers=headers)
        assert response.status_code == 200, f"Failed: {response.text}"
        print(f"✅ Stock request rejected successfully")


class TestActivityLog:
    """Test activity audit log"""
    
    @pytest.fixture
    def owner_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json=CREDENTIALS["owner"])
        assert response.status_code == 200
        return response.json()["access_token"]
    
    def test_activity_log_endpoint(self, owner_token):
        """GET /api/owner/activity-log returns activities"""
        headers = {"Authorization": f"Bearer {owner_token}"}
        response = requests.get(f"{BASE_URL}/api/owner/activity-log?limit=20", headers=headers)
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert isinstance(data, list)
        print(f"✅ Activity log returned - count: {len(data)}")
        
        if data:
            # Check structure
            log = data[0]
            assert "user_name" in log or "action" in log
            print(f"  Sample activity: {log.get('action', 'N/A')} by {log.get('user_name', 'N/A')}")


class TestProductPricing:
    """Test products with buy_price and sell_price"""
    
    @pytest.fixture
    def owner_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json=CREDENTIALS["owner"])
        assert response.status_code == 200
        return response.json()["access_token"]
    
    def test_products_have_buy_sell_prices(self, owner_token):
        """Products should have buy_price and sell_price fields"""
        headers = {"Authorization": f"Bearer {owner_token}"}
        response = requests.get(f"{BASE_URL}/api/products", headers=headers)
        assert response.status_code == 200
        products = response.json()
        
        if products:
            product = products[0]
            # Check fields exist (may be 0 for legacy products)
            assert "sell_price" in product or "price" in product
            print(f"✅ Products have pricing fields - sample: buy_price={product.get('buy_price', 0)}, sell_price={product.get('sell_price', product.get('price', 0))}")
    
    def test_create_product_with_prices(self, owner_token):
        """Create product with buy_price and sell_price"""
        headers = {"Authorization": f"Bearer {owner_token}"}
        import uuid
        payload = {
            "name": f"TEST Priced Product {uuid.uuid4().hex[:6]}",
            "category": "Electronique",
            "buy_price": 8000,
            "sell_price": 15000,
            "description": "Test pricing"
        }
        response = requests.post(f"{BASE_URL}/api/products", json=payload, headers=headers)
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert data.get("buy_price") == 8000 or data.get("buy_price") == 8000.0
        assert data.get("sell_price") == 15000 or data.get("sell_price") == 15000.0
        print(f"✅ Product created with buy_price=8000, sell_price=15000")
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/products/{data['id']}", headers=headers)


class TestDashboardStats:
    """Test dashboard stats endpoints for different roles"""
    
    @pytest.fixture
    def owner_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json=CREDENTIALS["owner"])
        assert response.status_code == 200
        return response.json()["access_token"]
    
    def test_owner_dashboard_stats(self, owner_token):
        """Owner can access /api/dashboard/stats"""
        headers = {"Authorization": f"Bearer {owner_token}"}
        response = requests.get(f"{BASE_URL}/api/dashboard/stats", headers=headers)
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert "today_sales" in data or "total_products" in data
        print(f"✅ Owner dashboard stats accessible")
    
    def test_seller_performance_endpoint(self, owner_token):
        """Seller performance endpoint works"""
        headers = {"Authorization": f"Bearer {owner_token}"}
        response = requests.get(f"{BASE_URL}/api/seller/my-performance", headers=headers)
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert "today" in data or "total" in data
        print(f"✅ Seller performance endpoint works")
    
    def test_seller_available_products(self, owner_token):
        """Seller available products endpoint works"""
        headers = {"Authorization": f"Bearer {owner_token}"}
        response = requests.get(f"{BASE_URL}/api/seller/available-products", headers=headers)
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert isinstance(data, list)
        print(f"✅ Seller available products endpoint works - count: {len(data)}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
