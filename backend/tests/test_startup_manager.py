"""
StartupManager Pro - Comprehensive Backend API Tests
Tests: MongoDB Persistence, Payments, Exports, AI Integration, Access Control, Authentication
"""
import pytest
import requests
import os
import time
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://startup-manager-4.preview.emergentagent.com').rstrip('/')

# Test credentials
ADMIN_EMAIL = "admin@startup.com"
ADMIN_PASSWORD = "admin123"
ACCESS_GATE_EMAIL = "bangalykaba635@gmail.com"


class TestHealthAndBasics:
    """Basic API health and connectivity tests"""
    
    def test_api_root(self):
        """Test API root endpoint"""
        response = requests.get(f"{BASE_URL}/api/")
        assert response.status_code == 200
        data = response.json()
        assert data["message"] == "StartupManager Pro API"
        assert data["database"] == "MongoDB"
        print(f"✓ API root working: {data}")


class TestAuthentication:
    """Authentication endpoint tests"""
    
    def test_login_success(self):
        """Test successful login with admin credentials"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert "user" in data
        assert data["user"]["email"] == ADMIN_EMAIL
        assert data["user"]["role"] == "ceo"
        print(f"✓ Login successful for {ADMIN_EMAIL}")
        return data["access_token"]
    
    def test_login_invalid_credentials(self):
        """Test login with invalid credentials"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "wrong@example.com",
            "password": "wrongpassword"
        })
        assert response.status_code == 401
        print("✓ Invalid credentials correctly rejected")
    
    def test_register_new_user(self):
        """Test user registration"""
        unique_email = f"TEST_user_{uuid.uuid4().hex[:8]}@example.com"
        response = requests.post(f"{BASE_URL}/api/auth/register", json={
            "name": "Test User",
            "email": unique_email,
            "password": "testpass123",
            "role": "cashier"
        })
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert data["user"]["email"] == unique_email
        print(f"✓ User registration successful: {unique_email}")


class TestMongoDBPersistence:
    """Test MongoDB data persistence for products, employees, sales"""
    
    def test_products_crud_persistence(self):
        """Test product CRUD operations persist in MongoDB"""
        # CREATE product
        product_name = f"TEST_Product_{uuid.uuid4().hex[:6]}"
        create_response = requests.post(f"{BASE_URL}/api/products", json={
            "name": product_name,
            "category": "Vêtements",
            "price": 25000,
            "description": "Test product for persistence check"
        })
        assert create_response.status_code == 200
        created = create_response.json()
        product_id = created["id"]
        assert created["name"] == product_name
        print(f"✓ Product created: {product_id}")
        
        # READ - Verify persistence
        get_response = requests.get(f"{BASE_URL}/api/products/{product_id}")
        assert get_response.status_code == 200
        fetched = get_response.json()
        assert fetched["name"] == product_name
        assert fetched["price"] == 25000
        print(f"✓ Product persisted and retrieved: {product_name}")
        
        # UPDATE product
        update_response = requests.put(f"{BASE_URL}/api/products/{product_id}", json={
            "price": 30000
        })
        assert update_response.status_code == 200
        updated = update_response.json()
        assert updated["price"] == 30000
        print(f"✓ Product updated: price changed to 30000")
        
        # Verify update persisted
        verify_response = requests.get(f"{BASE_URL}/api/products/{product_id}")
        assert verify_response.json()["price"] == 30000
        print("✓ Product update persisted in MongoDB")
        
        # DELETE product
        delete_response = requests.delete(f"{BASE_URL}/api/products/{product_id}")
        assert delete_response.status_code == 200
        print(f"✓ Product deleted: {product_id}")
        
        # Verify deletion
        verify_delete = requests.get(f"{BASE_URL}/api/products/{product_id}")
        assert verify_delete.status_code == 404
        print("✓ Product deletion verified")
    
    def test_employees_crud_persistence(self):
        """Test employee CRUD operations persist in MongoDB"""
        # CREATE employee
        employee_name = f"TEST_Employee_{uuid.uuid4().hex[:6]}"
        create_response = requests.post(f"{BASE_URL}/api/employees", json={
            "name": employee_name,
            "position": "Vendeur",
            "salary": 200000,
            "contract_type": "CDD"
        })
        assert create_response.status_code == 200
        created = create_response.json()
        employee_id = created["id"]
        assert created["name"] == employee_name
        print(f"✓ Employee created: {employee_id}")
        
        # READ - Verify persistence
        get_response = requests.get(f"{BASE_URL}/api/employees/{employee_id}")
        assert get_response.status_code == 200
        fetched = get_response.json()
        assert fetched["name"] == employee_name
        assert fetched["salary"] == 200000
        print(f"✓ Employee persisted and retrieved: {employee_name}")
        
        # UPDATE employee
        update_response = requests.put(f"{BASE_URL}/api/employees/{employee_id}", json={
            "salary": 250000
        })
        assert update_response.status_code == 200
        updated = update_response.json()
        assert updated["salary"] == 250000
        print(f"✓ Employee updated: salary changed to 250000")
        
        # DELETE employee
        delete_response = requests.delete(f"{BASE_URL}/api/employees/{employee_id}")
        assert delete_response.status_code == 200
        print(f"✓ Employee deleted: {employee_id}")
    
    def test_sales_persistence(self):
        """Test sales data persists in MongoDB"""
        # First get a product to use in sale
        products_response = requests.get(f"{BASE_URL}/api/products")
        assert products_response.status_code == 200
        products = products_response.json()
        
        if len(products) > 0:
            product = products[0]
            
            # CREATE sale
            sale_response = requests.post(f"{BASE_URL}/api/sales", json={
                "items": [{
                    "product_id": product["id"],
                    "quantity": 2,
                    "price": product["price"]
                }],
                "payment_method": "cash",
                "customer_phone": "+221771234567"
            })
            assert sale_response.status_code == 200
            sale = sale_response.json()
            assert sale["total"] == product["price"] * 2
            print(f"✓ Sale created: {sale['id']} - Total: {sale['total']} FCFA")
            
            # Verify sale in list
            sales_list = requests.get(f"{BASE_URL}/api/sales")
            assert sales_list.status_code == 200
            sales = sales_list.json()
            sale_ids = [s["id"] for s in sales]
            assert sale["id"] in sale_ids
            print("✓ Sale persisted in MongoDB")
        else:
            print("⚠ No products available for sale test")


class TestPaymentEndpoints:
    """Test payment endpoints (Orange Money, Card, Cash) - SIMULATED"""
    
    def test_orange_money_initiate(self):
        """Test Orange Money payment initiation (SIMULATED)"""
        response = requests.post(f"{BASE_URL}/api/payments/orange/initiate", json={
            "amount": 50000,
            "phone": "+221771234567"
        })
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "pending"
        assert "transaction_id" in data
        assert data["transaction_id"].startswith("OM-")
        print(f"✓ Orange Money payment initiated: {data['transaction_id']} (SIMULATED)")
        return data["transaction_id"]
    
    def test_orange_money_confirm(self):
        """Test Orange Money payment confirmation (SIMULATED)"""
        # First initiate
        init_response = requests.post(f"{BASE_URL}/api/payments/orange/initiate", json={
            "amount": 25000,
            "phone": "+221779998888"
        })
        transaction_id = init_response.json()["transaction_id"]
        
        # Then confirm
        confirm_response = requests.post(f"{BASE_URL}/api/payments/orange/confirm/{transaction_id}")
        assert confirm_response.status_code == 200
        data = confirm_response.json()
        assert data["status"] == "success"
        print(f"✓ Orange Money payment confirmed: {transaction_id} (SIMULATED)")
    
    def test_card_payment(self):
        """Test card payment processing (SIMULATED)"""
        response = requests.post(f"{BASE_URL}/api/payments/card", json={
            "amount": 75000
        })
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "success"
        assert "transaction_id" in data
        assert data["transaction_id"].startswith("CARD-")
        assert data["details"]["card_type"] == "VISA"
        print(f"✓ Card payment processed: {data['transaction_id']} (SIMULATED)")
    
    def test_cash_payment(self):
        """Test cash payment processing (SIMULATED)"""
        response = requests.post(f"{BASE_URL}/api/payments/cash", json={
            "amount": 30000
        })
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "success"
        assert "transaction_id" in data
        assert data["transaction_id"].startswith("CASH-")
        print(f"✓ Cash payment processed: {data['transaction_id']} (SIMULATED)")


class TestWhatsAppSMSReceipt:
    """Test WhatsApp/SMS receipt sending (SIMULATED)"""
    
    def test_whatsapp_receipt(self):
        """Test WhatsApp receipt sending (SIMULATED)"""
        # First create a sale
        products_response = requests.get(f"{BASE_URL}/api/products")
        products = products_response.json()
        
        if len(products) > 0:
            product = products[0]
            sale_response = requests.post(f"{BASE_URL}/api/sales", json={
                "items": [{"product_id": product["id"], "quantity": 1, "price": product["price"]}],
                "payment_method": "cash",
                "customer_phone": "+221771234567"
            })
            sale_id = sale_response.json()["id"]
            
            # Send WhatsApp receipt
            receipt_response = requests.post(f"{BASE_URL}/api/whatsapp/send-receipt", json={
                "phone": "+221771234567",
                "sale_id": sale_id
            })
            assert receipt_response.status_code == 200
            data = receipt_response.json()
            assert data["status"] == "sent"
            print(f"✓ WhatsApp receipt sent (SIMULATED): {data['message_id']}")
        else:
            print("⚠ No products available for WhatsApp receipt test")
    
    def test_sms_receipt(self):
        """Test SMS receipt sending (SIMULATED)"""
        products_response = requests.get(f"{BASE_URL}/api/products")
        products = products_response.json()
        
        if len(products) > 0:
            product = products[0]
            sale_response = requests.post(f"{BASE_URL}/api/sales", json={
                "items": [{"product_id": product["id"], "quantity": 1, "price": product["price"]}],
                "payment_method": "cash",
                "customer_phone": "+221771234567"
            })
            sale_id = sale_response.json()["id"]
            
            # Send SMS receipt
            sms_response = requests.post(f"{BASE_URL}/api/sms/send-receipt", json={
                "phone": "+221771234567",
                "sale_id": sale_id
            })
            assert sms_response.status_code == 200
            data = sms_response.json()
            assert data["status"] == "sent"
            assert "receipt" in data
            print(f"✓ SMS receipt sent (SIMULATED): {data['message']}")
        else:
            print("⚠ No products available for SMS receipt test")


class TestExportEndpoints:
    """Test CSV and PDF export endpoints"""
    
    def test_products_csv_export(self):
        """Test CSV export for products"""
        response = requests.get(f"{BASE_URL}/api/export/products/csv")
        assert response.status_code == 200
        assert "text/csv" in response.headers.get("content-type", "")
        content = response.text
        assert "name" in content.lower() or "nom" in content.lower()
        print(f"✓ Products CSV export working - {len(content)} bytes")
    
    def test_employees_csv_export(self):
        """Test CSV export for employees"""
        response = requests.get(f"{BASE_URL}/api/export/employees/csv")
        assert response.status_code == 200
        assert "text/csv" in response.headers.get("content-type", "")
        content = response.text
        assert "name" in content.lower() or "nom" in content.lower()
        print(f"✓ Employees CSV export working - {len(content)} bytes")
    
    def test_sales_pdf_export(self):
        """Test PDF export for sales"""
        response = requests.get(f"{BASE_URL}/api/export/sales/pdf")
        assert response.status_code == 200
        assert "application/pdf" in response.headers.get("content-type", "")
        # PDF files start with %PDF
        assert response.content[:4] == b'%PDF'
        print(f"✓ Sales PDF export working - {len(response.content)} bytes")


class TestAIIntegration:
    """Test AI features (GPT-5.2 via Emergent LLM Key)"""
    
    def test_ai_help(self):
        """Test AI help assistant"""
        response = requests.post(f"{BASE_URL}/api/ai/help", json={
            "question": "Comment ajouter un nouveau produit?"
        }, timeout=30)
        assert response.status_code == 200
        data = response.json()
        assert "response" in data
        assert len(data["response"]) > 10  # Should have meaningful response
        print(f"✓ AI Help working - Response length: {len(data['response'])} chars")
    
    def test_ai_contract_generation(self):
        """Test AI contract generation"""
        # Get an employee first
        employees_response = requests.get(f"{BASE_URL}/api/employees")
        employees = employees_response.json()
        
        if len(employees) > 0:
            employee = employees[0]
            response = requests.post(f"{BASE_URL}/api/ai/contract", json={
                "employee_id": employee["id"]
            }, timeout=30)
            assert response.status_code == 200
            data = response.json()
            assert "content" in data or "contract" in data
            print(f"✓ AI Contract generation working for employee: {employee['name']}")
        else:
            print("⚠ No employees available for contract generation test")
    
    def test_ai_marketing_content(self):
        """Test AI marketing content generation"""
        response = requests.post(f"{BASE_URL}/api/ai/product-ad", json={
            "type": "product_ad",
            "title": "T-Shirt Premium",
            "description": "T-shirt de haute qualité en coton",
            "price": 15000
        }, timeout=30)
        assert response.status_code == 200
        data = response.json()
        assert "content" in data
        print(f"✓ AI Marketing content generation working")
    
    def test_ai_dashboard_insights(self):
        """Test AI dashboard insights"""
        response = requests.get(f"{BASE_URL}/api/ai/insights/dashboard")
        assert response.status_code == 200
        data = response.json()
        assert "insights" in data
        assert "summary" in data
        print(f"✓ AI Dashboard insights working - {len(data['insights'])} insights")


class TestAccessControl:
    """Test access control system"""
    
    def test_access_check_admin(self):
        """Test access check for admin email"""
        response = requests.get(f"{BASE_URL}/api/access/check/{ACCESS_GATE_EMAIL}")
        assert response.status_code == 200
        data = response.json()
        assert data["authorized"] == True
        assert data["is_admin"] == True
        print(f"✓ Admin access check working for {ACCESS_GATE_EMAIL}")
    
    def test_access_check_authorized_user(self):
        """Test access check for authorized demo user"""
        response = requests.get(f"{BASE_URL}/api/access/check/{ADMIN_EMAIL}")
        assert response.status_code == 200
        data = response.json()
        assert data["authorized"] == True
        print(f"✓ Authorized user access check working for {ADMIN_EMAIL}")
    
    def test_access_request_flow(self):
        """Test access request submission"""
        unique_email = f"TEST_access_{uuid.uuid4().hex[:8]}@example.com"
        response = requests.post(f"{BASE_URL}/api/access/request", json={
            "name": "Test Access User",
            "email": unique_email,
            "reason": "Testing access request flow"
        })
        assert response.status_code == 200
        data = response.json()
        assert data["status"] in ["submitted", "pending", "already_authorized"]
        print(f"✓ Access request submitted for {unique_email}")
    
    def test_get_access_requests(self):
        """Test getting all access requests (admin)"""
        response = requests.get(f"{BASE_URL}/api/access/requests")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Access requests list retrieved - {len(data)} requests")
    
    def test_get_authorized_users(self):
        """Test getting all authorized users"""
        response = requests.get(f"{BASE_URL}/api/access/authorized")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Authorized users list retrieved - {len(data)} users")


class TestDashboardAndStats:
    """Test dashboard statistics endpoints"""
    
    def test_dashboard_stats(self):
        """Test dashboard statistics"""
        response = requests.get(f"{BASE_URL}/api/dashboard/stats")
        assert response.status_code == 200
        data = response.json()
        # Check expected fields
        expected_fields = ["total_products", "total_employees", "total_shops"]
        for field in expected_fields:
            assert field in data, f"Missing field: {field}"
        print(f"✓ Dashboard stats working - Products: {data.get('total_products', 0)}, Employees: {data.get('total_employees', 0)}")
    
    def test_accounts_balance(self):
        """Test accounts/finance data"""
        response = requests.get(f"{BASE_URL}/api/accounts")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        # Should have cash, orange_money, bank accounts
        account_types = [acc["type"] for acc in data]
        print(f"✓ Accounts data retrieved - Types: {account_types}")


class TestBatchesAndStock:
    """Test batches/stock management"""
    
    def test_batches_list(self):
        """Test getting batches list"""
        response = requests.get(f"{BASE_URL}/api/batches")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Batches list retrieved - {len(data)} batches")
    
    def test_batch_qr_generation(self):
        """Test QR code generation for batch"""
        batches_response = requests.get(f"{BASE_URL}/api/batches")
        batches = batches_response.json()
        
        if len(batches) > 0:
            batch = batches[0]
            qr_response = requests.get(f"{BASE_URL}/api/batches/{batch['id']}/qr")
            assert qr_response.status_code == 200
            data = qr_response.json()
            assert "qr_code" in data
            assert "lot_number" in data
            print(f"✓ QR code generated for batch: {data['lot_number']}")
        else:
            print("⚠ No batches available for QR generation test")


# Cleanup fixture
@pytest.fixture(scope="session", autouse=True)
def cleanup_test_data():
    """Cleanup TEST_ prefixed data after all tests"""
    yield
    # Cleanup products
    try:
        products = requests.get(f"{BASE_URL}/api/products").json()
        for p in products:
            if p["name"].startswith("TEST_"):
                requests.delete(f"{BASE_URL}/api/products/{p['id']}")
        
        # Cleanup employees
        employees = requests.get(f"{BASE_URL}/api/employees").json()
        for e in employees:
            if e["name"].startswith("TEST_"):
                requests.delete(f"{BASE_URL}/api/employees/{e['id']}")
        
        print("✓ Test data cleanup completed")
    except Exception as e:
        print(f"⚠ Cleanup error: {e}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
