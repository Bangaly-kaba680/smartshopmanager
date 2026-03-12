"""
Test Suite for BINTRONIX StartupManager Pro - Tenant Data Isolation & RBAC
Tests: 
1. Role-based access control (super_admin, ceo, owner)
2. Data isolation (owners see only their shop data)
3. Dashboard stats with tenant filtering
4. API endpoints with tenant scoping
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


class TestAPIEndpoints:
    """Test basic API functionality"""
    
    def test_api_root_returns_postgresql(self):
        """API root should return database: PostgreSQL"""
        response = requests.get(f"{BASE_URL}/api/")
        assert response.status_code == 200
        data = response.json()
        assert "database" in data
        assert data["database"] == "PostgreSQL"
        print(f"API Root: database = {data['database']}")
    
    def test_api_health_check(self):
        """Basic API health check"""
        response = requests.get(f"{BASE_URL}/api/")
        assert response.status_code == 200


class TestAuthFlows:
    """Test authentication for different roles"""
    
    def test_super_admin_login(self):
        """Super Admin (bangalykaba635@gmail.com) should login successfully"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": SUPER_ADMIN_EMAIL,
            "password": SUPER_ADMIN_PASSWORD
        })
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert "user" in data
        assert data["user"]["role"] == "super_admin"
        assert data["user"]["email"] == SUPER_ADMIN_EMAIL
        print(f"Super Admin login: role={data['user']['role']}, name={data['user']['name']}")
    
    def test_ceo_login(self):
        """CEO (admin@startup.com) should login successfully"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": CEO_EMAIL,
            "password": CEO_PASSWORD
        })
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert "user" in data
        assert data["user"]["role"] == "ceo"
        assert data["user"]["email"] == CEO_EMAIL
        print(f"CEO login: role={data['user']['role']}, name={data['user']['name']}")
    
    def test_owner_login(self):
        """Owner (testowner@example.com) should login successfully"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": OWNER_EMAIL,
            "password": OWNER_PASSWORD
        })
        # If owner doesn't exist, this is expected
        if response.status_code == 401:
            pytest.skip("Owner test account not yet created - registration needed")
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert data["user"]["role"] == "owner"
        print(f"Owner login: role={data['user']['role']}, name={data['user']['name']}")
    
    def test_invalid_credentials_rejected(self):
        """Invalid credentials should return 401"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "invalid@example.com",
            "password": "wrongpassword"
        })
        assert response.status_code == 401


class TestSuperAdminDataAccess:
    """Test Super Admin sees ALL data"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Get super admin token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": SUPER_ADMIN_EMAIL,
            "password": SUPER_ADMIN_PASSWORD
        })
        assert response.status_code == 200
        self.token = response.json()["access_token"]
        self.headers = {"Authorization": f"Bearer {self.token}"}
    
    def test_super_admin_dashboard_stats(self):
        """Super Admin dashboard should show ALL data (8 products, 4 employees)"""
        response = requests.get(
            f"{BASE_URL}/api/dashboard/stats",
            headers=self.headers
        )
        assert response.status_code == 200
        data = response.json()
        
        # Super admin should see all demo data
        print(f"Super Admin Dashboard: products={data['total_products']}, employees={data['total_employees']}")
        assert data["total_products"] >= 8, f"Expected >= 8 products, got {data['total_products']}"
        assert data["total_employees"] >= 4, f"Expected >= 4 employees, got {data['total_employees']}"
        
        # Check financial balances exist and are > 0
        total_balance = data.get("cash_balance", 0) + data.get("orange_money_balance", 0) + data.get("bank_balance", 0)
        print(f"Super Admin Financial: cash={data.get('cash_balance')}, orange={data.get('orange_money_balance')}, bank={data.get('bank_balance')}")
        assert total_balance > 0, "Financial balances should be > 0 for super admin"
    
    def test_super_admin_products_list(self):
        """Super Admin should see ALL products (8 products)"""
        response = requests.get(
            f"{BASE_URL}/api/products",
            headers=self.headers
        )
        assert response.status_code == 200
        products = response.json()
        print(f"Super Admin Products: count={len(products)}")
        assert len(products) >= 8, f"Expected >= 8 products, got {len(products)}"
    
    def test_super_admin_employees_list(self):
        """Super Admin should see ALL employees (4 employees)"""
        response = requests.get(
            f"{BASE_URL}/api/employees",
            headers=self.headers
        )
        assert response.status_code == 200
        employees = response.json()
        print(f"Super Admin Employees: count={len(employees)}")
        assert len(employees) >= 4, f"Expected >= 4 employees, got {len(employees)}"


class TestCEODataAccess:
    """Test CEO sees ALL data (same as super admin)"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Get CEO token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": CEO_EMAIL,
            "password": CEO_PASSWORD
        })
        assert response.status_code == 200
        self.token = response.json()["access_token"]
        self.headers = {"Authorization": f"Bearer {self.token}"}
    
    def test_ceo_dashboard_stats(self):
        """CEO dashboard should show ALL data like super admin"""
        response = requests.get(
            f"{BASE_URL}/api/dashboard/stats",
            headers=self.headers
        )
        assert response.status_code == 200
        data = response.json()
        
        print(f"CEO Dashboard: products={data['total_products']}, employees={data['total_employees']}")
        assert data["total_products"] >= 8, f"CEO should see >= 8 products, got {data['total_products']}"
        assert data["total_employees"] >= 4, f"CEO should see >= 4 employees, got {data['total_employees']}"
    
    def test_ceo_products_list(self):
        """CEO should see ALL products"""
        response = requests.get(
            f"{BASE_URL}/api/products",
            headers=self.headers
        )
        assert response.status_code == 200
        products = response.json()
        print(f"CEO Products: count={len(products)}")
        assert len(products) >= 8


class TestOwnerDataIsolation:
    """Test Owner sees ONLY their shop's data (isolated)"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Get owner token - create owner if needed"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": OWNER_EMAIL,
            "password": OWNER_PASSWORD
        })
        
        if response.status_code == 401:
            # Owner doesn't exist - need to create via registration
            pytest.skip("Owner test account not created. Run registration test first.")
        
        assert response.status_code == 200
        self.token = response.json()["access_token"]
        self.user = response.json()["user"]
        self.headers = {"Authorization": f"Bearer {self.token}"}
    
    def test_owner_dashboard_stats_isolated(self):
        """Owner dashboard should show ONLY their shop's data (0 products if new)"""
        response = requests.get(
            f"{BASE_URL}/api/dashboard/stats",
            headers=self.headers
        )
        assert response.status_code == 200
        data = response.json()
        
        print(f"Owner Dashboard: products={data['total_products']}, employees={data['total_employees']}")
        print(f"Owner Financial: cash={data.get('cash_balance')}, orange={data.get('orange_money_balance')}, bank={data.get('bank_balance')}")
        
        # New owner should have 0 products and employees (isolated from demo data)
        # Their financial accounts should be 0 GNF (newly created)
        assert data["total_products"] == 0, f"Owner should see 0 products (isolated), got {data['total_products']}"
        assert data["total_employees"] == 0, f"Owner should see 0 employees (isolated), got {data['total_employees']}"
    
    def test_owner_products_list_isolated(self):
        """Owner should see 0 products (their shop is empty)"""
        response = requests.get(
            f"{BASE_URL}/api/products",
            headers=self.headers
        )
        assert response.status_code == 200
        products = response.json()
        print(f"Owner Products: count={len(products)}")
        assert len(products) == 0, f"Owner should see 0 products (isolated), got {len(products)}"
    
    def test_owner_employees_list_isolated(self):
        """Owner should see 0 employees (their shop is empty)"""
        response = requests.get(
            f"{BASE_URL}/api/employees",
            headers=self.headers
        )
        assert response.status_code == 200
        employees = response.json()
        print(f"Owner Employees: count={len(employees)}")
        assert len(employees) == 0, f"Owner should see 0 employees (isolated), got {len(employees)}"


class TestRegistration2FA:
    """Test 2FA registration flow"""
    
    def test_registration_request_sends_otp(self):
        """Registration request should generate OTP"""
        import uuid
        test_email = f"test_{uuid.uuid4().hex[:8]}@example.com"
        
        response = requests.post(f"{BASE_URL}/api/auth/register-request", json={
            "company_name": "Test Company",
            "owner_name": "Test Owner",
            "email": test_email,
            "password": "testpass123",
            "phone": "+224620000000"
        })
        assert response.status_code == 200
        data = response.json()
        
        # Should indicate OTP was sent
        assert data.get("otp_sent") == True
        print(f"Registration OTP: otp_sent={data.get('otp_sent')}, dev_otp present={bool(data.get('dev_otp'))}")
    
    def test_create_owner_account_if_not_exists(self):
        """Create the testowner@example.com account for isolation testing"""
        # Check if already exists
        login_response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": OWNER_EMAIL,
            "password": OWNER_PASSWORD
        })
        
        if login_response.status_code == 200:
            print("Owner account already exists")
            return
        
        # Request registration
        reg_response = requests.post(f"{BASE_URL}/api/auth/register-request", json={
            "company_name": "Test Owner Shop",
            "owner_name": "Test Owner",
            "email": OWNER_EMAIL,
            "password": OWNER_PASSWORD,
            "phone": "+224620001111"
        })
        
        if reg_response.status_code != 200:
            pytest.skip(f"Registration request failed: {reg_response.text}")
        
        data = reg_response.json()
        dev_otp = data.get("dev_otp")
        
        if not dev_otp:
            pytest.skip("No dev OTP available - email not configured")
        
        # Verify OTP
        verify_response = requests.post(f"{BASE_URL}/api/auth/verify-registration", json={
            "email": OWNER_EMAIL,
            "otp": dev_otp
        })
        
        assert verify_response.status_code == 200
        verify_data = verify_response.json()
        assert verify_data["user"]["role"] == "owner"
        print(f"Created owner account: {OWNER_EMAIL} with role=owner")


class TestDataIsolationComparison:
    """Compare data between admin and owner to verify isolation"""
    
    def test_isolation_comparison(self):
        """Admin should see more data than owner"""
        # Get admin token
        admin_response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": SUPER_ADMIN_EMAIL,
            "password": SUPER_ADMIN_PASSWORD
        })
        assert admin_response.status_code == 200
        admin_token = admin_response.json()["access_token"]
        
        # Get owner token
        owner_response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": OWNER_EMAIL,
            "password": OWNER_PASSWORD
        })
        
        if owner_response.status_code == 401:
            pytest.skip("Owner account not created")
        
        owner_token = owner_response.json()["access_token"]
        
        # Get admin products
        admin_products = requests.get(
            f"{BASE_URL}/api/products",
            headers={"Authorization": f"Bearer {admin_token}"}
        ).json()
        
        # Get owner products
        owner_products = requests.get(
            f"{BASE_URL}/api/products",
            headers={"Authorization": f"Bearer {owner_token}"}
        ).json()
        
        print(f"Isolation Test: Admin sees {len(admin_products)} products, Owner sees {len(owner_products)} products")
        
        # Admin should see more products than owner (unless owner created some)
        assert len(admin_products) >= len(owner_products), "Admin should see >= owner's products"


if __name__ == "__main__":
    pytest.main([__file__, "-v", "-s"])
