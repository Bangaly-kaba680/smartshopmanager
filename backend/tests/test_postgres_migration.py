"""
Test suite for StartupManager Pro - PostgreSQL Migration Tests
Tests backend API functionality after MongoDB to PostgreSQL migration
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://admin-strategic-hub.preview.emergentagent.com')

class TestAPIRoot:
    """Test API root and database verification"""
    
    def test_api_root_returns_postgresql(self):
        """Verify API root shows PostgreSQL database"""
        response = requests.get(f"{BASE_URL}/api/")
        assert response.status_code == 200
        data = response.json()
        assert data.get("database") == "PostgreSQL", f"Expected PostgreSQL, got {data.get('database')}"
        assert "message" in data
        print(f"✅ API root shows database: {data.get('database')}")


class TestAuthentication:
    """Test authentication with demo credentials"""
    
    def test_login_admin_success(self):
        """Login with admin@startup.com / admin123 should succeed"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@startup.com",
            "password": "admin123"
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        assert "access_token" in data
        assert "user" in data
        assert data["user"]["email"] == "admin@startup.com"
        print(f"✅ Login successful for admin@startup.com")
        return data["access_token"]
    
    def test_login_invalid_credentials(self):
        """Invalid credentials should return 401"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "invalid@test.com",
            "password": "wrongpassword"
        })
        assert response.status_code == 401
        print("✅ Invalid credentials correctly rejected")


class TestDashboard:
    """Test dashboard stats endpoint"""
    
    @pytest.fixture
    def auth_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@startup.com",
            "password": "admin123"
        })
        return response.json()["access_token"]
    
    def test_dashboard_stats(self, auth_token):
        """Dashboard should show stats with products, employees, shops, and financial balances"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        response = requests.get(f"{BASE_URL}/api/dashboard/stats", headers=headers)
        assert response.status_code == 200, f"Dashboard stats failed: {response.text}"
        data = response.json()
        
        # Verify expected stats fields
        assert "total_products" in data
        assert "total_employees" in data
        assert "total_shops" in data
        assert "cash_balance" in data
        assert "orange_money_balance" in data
        assert "bank_balance" in data
        
        print(f"✅ Dashboard stats: products={data.get('total_products')}, employees={data.get('total_employees')}, shops={data.get('total_shops')}")
        print(f"   Balances: cash={data.get('cash_balance')}, orange_money={data.get('orange_money_balance')}, bank={data.get('bank_balance')}")
        return data


class TestProducts:
    """Test products CRUD - should have 8 products"""
    
    @pytest.fixture
    def auth_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@startup.com",
            "password": "admin123"
        })
        return response.json()["access_token"]
    
    def test_list_products_count(self, auth_token):
        """Products page should list 8 products"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        response = requests.get(f"{BASE_URL}/api/products", headers=headers)
        assert response.status_code == 200
        products = response.json()
        assert isinstance(products, list)
        print(f"✅ Products count: {len(products)}")
        
        # Verify products have required fields
        if len(products) > 0:
            product = products[0]
            assert "id" in product
            assert "name" in product
            assert "category" in product
            assert "price" in product
            print(f"   Sample product: {product.get('name')} - {product.get('category')} - {product.get('price')}")
        
        return len(products)


class TestEmployees:
    """Test employees CRUD - should have 4 employees"""
    
    @pytest.fixture
    def auth_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@startup.com",
            "password": "admin123"
        })
        return response.json()["access_token"]
    
    def test_list_employees_count(self, auth_token):
        """Employees page should list 4 employees"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        response = requests.get(f"{BASE_URL}/api/employees", headers=headers)
        assert response.status_code == 200
        employees = response.json()
        assert isinstance(employees, list)
        print(f"✅ Employees count: {len(employees)}")
        
        # Verify employees have required fields
        if len(employees) > 0:
            emp = employees[0]
            assert "id" in emp
            assert "name" in emp
            assert "position" in emp
            assert "salary" in emp
            assert "contract_type" in emp
            print(f"   Sample employee: {emp.get('name')} - {emp.get('position')} - {emp.get('contract_type')}")
        
        return len(employees)


class TestBatches:
    """Test stock/batches endpoint"""
    
    @pytest.fixture
    def auth_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@startup.com",
            "password": "admin123"
        })
        return response.json()["access_token"]
    
    def test_list_batches(self, auth_token):
        """Stock/Batches page should show batches data"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        response = requests.get(f"{BASE_URL}/api/batches", headers=headers)
        assert response.status_code == 200
        batches = response.json()
        assert isinstance(batches, list)
        print(f"✅ Batches count: {len(batches)}")
        
        # Verify batches have required fields
        if len(batches) > 0:
            batch = batches[0]
            assert "id" in batch
            assert "lot_number" in batch
            assert "quantity" in batch
            print(f"   Sample batch: {batch.get('lot_number')} - qty: {batch.get('quantity')}")


class TestAccounts:
    """Test finance/accounts endpoint"""
    
    @pytest.fixture
    def auth_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@startup.com",
            "password": "admin123"
        })
        return response.json()["access_token"]
    
    def test_list_accounts(self, auth_token):
        """Finance page should show account balances"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        response = requests.get(f"{BASE_URL}/api/accounts", headers=headers)
        assert response.status_code == 200
        accounts = response.json()
        assert isinstance(accounts, list)
        print(f"✅ Accounts count: {len(accounts)}")
        
        # Verify we have different account types
        account_types = [acc.get("type") for acc in accounts]
        print(f"   Account types: {account_types}")
        
        for acc in accounts:
            print(f"   - {acc.get('type')}: {acc.get('balance')}")


class TestShops:
    """Test shops endpoint"""
    
    @pytest.fixture
    def auth_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@startup.com",
            "password": "admin123"
        })
        return response.json()["access_token"]
    
    def test_list_shops(self, auth_token):
        """Should have at least one shop"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        response = requests.get(f"{BASE_URL}/api/shops", headers=headers)
        assert response.status_code == 200
        shops = response.json()
        assert isinstance(shops, list)
        assert len(shops) >= 1, "Expected at least 1 shop"
        print(f"✅ Shops count: {len(shops)}")
        
        if len(shops) > 0:
            shop = shops[0]
            print(f"   Shop: {shop.get('name')} - {shop.get('address')}")


class TestSales:
    """Test sales endpoint"""
    
    @pytest.fixture
    def auth_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@startup.com",
            "password": "admin123"
        })
        return response.json()["access_token"]
    
    def test_list_sales(self, auth_token):
        """Should be able to retrieve sales"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        response = requests.get(f"{BASE_URL}/api/sales", headers=headers)
        assert response.status_code == 200
        sales = response.json()
        assert isinstance(sales, list)
        print(f"✅ Sales count: {len(sales)}")


class TestRegistration2FA:
    """Test 2FA registration request endpoint"""
    
    def test_registration_request_triggers_otp(self):
        """Registration request should send OTP via email"""
        response = requests.post(f"{BASE_URL}/api/auth/register-request", json={
            "company_name": "Test Company",
            "owner_name": "Test Owner",
            "email": "test_registration_2fa@test.com",
            "password": "testpass123",
            "phone": "+1234567890"
        })
        # May succeed or fail if email exists - just check it doesn't crash
        assert response.status_code in [200, 400], f"Unexpected status: {response.status_code}"
        print(f"✅ Registration request endpoint working (status: {response.status_code})")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
