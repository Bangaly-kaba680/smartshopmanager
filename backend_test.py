#!/usr/bin/env python3
"""
StartupManager Pro Backend API Testing
Tests all backend endpoints for the comprehensive startup management system
"""

import requests
import sys
import json
from datetime import datetime
from typing import Dict, Any, Optional

class StartupManagerAPITester:
    def __init__(self, base_url="https://startup-manager-4.preview.emergentagent.com"):
        self.base_url = base_url
        self.api_base = f"{base_url}/api"
        self.token = None
        self.user_id = None
        self.shop_id = None
        self.tests_run = 0
        self.tests_passed = 0
        self.test_results = []

    def log_test(self, name: str, success: bool, details: str = ""):
        """Log test result"""
        self.tests_run += 1
        if success:
            self.tests_passed += 1
        
        result = {
            "test": name,
            "success": success,
            "details": details,
            "timestamp": datetime.now().isoformat()
        }
        self.test_results.append(result)
        
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{status} - {name}")
        if details:
            print(f"    {details}")

    def make_request(self, method: str, endpoint: str, data: Optional[Dict] = None, 
                    expected_status: int = 200, auth_required: bool = True) -> tuple[bool, Dict]:
        """Make API request and return success status and response data"""
        url = f"{self.api_base}/{endpoint.lstrip('/')}"
        headers = {'Content-Type': 'application/json'}
        
        if auth_required and self.token:
            headers['Authorization'] = f'Bearer {self.token}'

        try:
            if method == 'GET':
                response = requests.get(url, headers=headers, timeout=10)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=headers, timeout=10)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=headers, timeout=10)
            elif method == 'DELETE':
                response = requests.delete(url, headers=headers, timeout=10)
            else:
                return False, {"error": f"Unsupported method: {method}"}

            success = response.status_code == expected_status
            
            try:
                response_data = response.json()
            except:
                response_data = {"status_code": response.status_code, "text": response.text}

            return success, response_data

        except requests.exceptions.RequestException as e:
            return False, {"error": str(e)}

    def test_root_endpoint(self):
        """Test root API endpoint"""
        success, data = self.make_request('GET', '/', auth_required=False)
        self.log_test("Root API Endpoint", success, 
                     f"Response: {data.get('message', 'No message')}" if success else f"Error: {data}")
        return success

    def test_login_demo_account(self):
        """Test login with demo account"""
        login_data = {
            "email": "admin@startup.com",
            "password": "admin123"
        }
        
        success, data = self.make_request('POST', '/auth/login', login_data, auth_required=False)
        
        if success and 'access_token' in data:
            self.token = data['access_token']
            self.user_id = data['user']['id']
            self.shop_id = data['user'].get('shop_id')
            self.log_test("Demo Account Login", True, 
                         f"User: {data['user']['name']}, Role: {data['user']['role']}")
        else:
            self.log_test("Demo Account Login", False, f"Error: {data}")
        
        return success

    def test_register_new_user(self):
        """Test user registration"""
        timestamp = datetime.now().strftime("%H%M%S")
        register_data = {
            "name": f"Test User {timestamp}",
            "email": f"test{timestamp}@example.com",
            "password": "testpass123",
            "role": "cashier"
        }
        
        success, data = self.make_request('POST', '/auth/register', register_data, 
                                        expected_status=200, auth_required=False)
        self.log_test("User Registration", success, 
                     f"New user created: {data.get('user', {}).get('name', 'Unknown')}" if success else f"Error: {data}")
        return success

    def test_get_current_user(self):
        """Test get current user info"""
        # Make sure we have a token first
        if not self.token:
            self.log_test("Get Current User", False, "No token available - login failed")
            return False
            
        success, data = self.make_request('GET', '/auth/me')
        self.log_test("Get Current User", success, 
                     f"User: {data.get('name', 'Unknown')}" if success else f"Error: {data}")
        return success

    def test_dashboard_stats(self):
        """Test dashboard statistics"""
        success, data = self.make_request('GET', '/dashboard/stats')
        if success:
            stats = f"Sales: {data.get('today_sales', 0)}, Revenue: {data.get('monthly_revenue', 0)}, Shops: {data.get('total_shops', 0)}"
            self.log_test("Dashboard Stats", True, stats)
        else:
            self.log_test("Dashboard Stats", False, f"Error: {data}")
        return success

    def test_products_crud(self):
        """Test products CRUD operations"""
        # Get products
        success, products = self.make_request('GET', '/products')
        self.log_test("Get Products", success, 
                     f"Found {len(products) if success else 0} products")
        
        if not success:
            return False

        # Create product
        product_data = {
            "name": "Test Product",
            "category": "Test Category",
            "price": 25000,
            "description": "Test product description"
        }
        
        success, new_product = self.make_request('POST', '/products', product_data, expected_status=200)
        product_id = new_product.get('id') if success else None
        self.log_test("Create Product", success, 
                     f"Product ID: {product_id}" if success else f"Error: {new_product}")
        
        if not success or not product_id:
            return False

        # Update product
        update_data = {"name": "Updated Test Product", "price": 30000}
        success, updated = self.make_request('PUT', f'/products/{product_id}', update_data)
        self.log_test("Update Product", success, 
                     f"Updated name: {updated.get('name', 'Unknown')}" if success else f"Error: {updated}")

        # Delete product
        success, _ = self.make_request('DELETE', f'/products/{product_id}')
        self.log_test("Delete Product", success, 
                     "Product deleted successfully" if success else "Failed to delete product")

        return True

    def test_stock_management(self):
        """Test stock/batches management"""
        # Get existing products first
        success, products = self.make_request('GET', '/products')
        if not success or not products:
            self.log_test("Stock Management - Get Products", False, "No products available for stock test")
            return False

        product_id = products[0]['id']
        
        # Create batch
        batch_data = {
            "product_id": product_id,
            "size": "L",
            "color": "Rouge",
            "quantity": 20
        }
        
        success, new_batch = self.make_request('POST', '/batches', batch_data, expected_status=200)
        batch_id = new_batch.get('id') if success else None
        self.log_test("Create Batch", success, 
                     f"Batch ID: {batch_id}" if success else f"Error: {new_batch}")
        
        if not success or not batch_id:
            return False

        # Generate QR code
        success, qr_data = self.make_request('POST', f'/batches/{batch_id}/generate-qr')
        self.log_test("Generate QR Code", success, 
                     "QR code generated" if success else f"Error: {qr_data}")

        # Get batches
        success, batches = self.make_request('GET', '/batches')
        self.log_test("Get Batches", success, 
                     f"Found {len(batches) if success else 0} batches")

        return True

    def test_employees_crud(self):
        """Test employees CRUD operations"""
        # Get employees
        success, employees = self.make_request('GET', '/employees')
        self.log_test("Get Employees", success, 
                     f"Found {len(employees) if success else 0} employees")

        # Create employee
        employee_data = {
            "name": "Test Employee",
            "position": "Test Position",
            "salary": 200000,
            "contract_type": "CDI"
        }
        
        success, new_employee = self.make_request('POST', '/employees', employee_data, expected_status=200)
        employee_id = new_employee.get('id') if success else None
        self.log_test("Create Employee", success, 
                     f"Employee ID: {employee_id}" if success else f"Error: {new_employee}")
        
        if success and employee_id:
            # Update employee
            update_data = {"salary": 250000}
            success, updated = self.make_request('PUT', f'/employees/{employee_id}', update_data)
            self.log_test("Update Employee", success, 
                         f"Updated salary: {updated.get('salary', 0)}" if success else f"Error: {updated}")

        return True

    def test_ai_document_generation(self):
        """Test AI document generation"""
        # Get employees first
        success, employees = self.make_request('GET', '/employees')
        if not success or not employees:
            self.log_test("AI Documents - Get Employees", False, "No employees available for AI test")
            return False

        employee_id = employees[0]['id']
        
        # Test contract generation
        success, contract = self.make_request('POST', '/ai/contract', {"employee_id": employee_id})
        self.log_test("AI Contract Generation", success, 
                     f"Contract generated for employee {employee_id}" if success else f"Error: {contract}")

        # Test work attestation
        success, attestation = self.make_request('POST', '/ai/attestation-work', {"employee_id": employee_id})
        self.log_test("AI Work Attestation", success, 
                     f"Work attestation generated" if success else f"Error: {attestation}")

        return True

    def test_marketing_ai(self):
        """Test marketing AI content generation"""
        # Test product ad generation
        ad_data = {
            "type": "product_ad",
            "title": "Super Produit Test",
            "description": "Un produit incroyable pour les tests",
            "price": 15000
        }
        
        success, ad_content = self.make_request('POST', '/ai/product-ad', ad_data)
        self.log_test("AI Product Ad Generation", success, 
                     "Product ad generated" if success else f"Error: {ad_content}")

        # Test job offer generation
        job_data = {
            "type": "job_offer",
            "title": "Développeur Test",
            "description": "Poste de développeur pour les tests"
        }
        
        success, job_content = self.make_request('POST', '/ai/job-offer', job_data)
        self.log_test("AI Job Offer Generation", success, 
                     "Job offer generated" if success else f"Error: {job_content}")

        return True

    def test_help_center_ai(self):
        """Test help center AI assistant"""
        help_data = {"question": "Comment ajouter un nouveau produit?"}
        
        success, help_response = self.make_request('POST', '/ai/help', help_data)
        self.log_test("AI Help Assistant", success, 
                     "Help response generated" if success else f"Error: {help_response}")
        return success

    def test_pos_sales(self):
        """Test POS sales functionality"""
        # Get products for sale
        success, products = self.make_request('GET', '/products')
        if not success or not products:
            self.log_test("POS Sales - Get Products", False, "No products available for sale")
            return False

        # Create a sale
        sale_data = {
            "items": [
                {
                    "product_id": products[0]['id'],
                    "quantity": 2,
                    "price": products[0]['price']
                }
            ],
            "payment_method": "cash",
            "customer_phone": "+221771234567"
        }
        
        success, new_sale = self.make_request('POST', '/sales', sale_data, expected_status=200)
        sale_id = new_sale.get('id') if success else None
        self.log_test("Create Sale", success, 
                     f"Sale ID: {sale_id}, Total: {new_sale.get('total', 0)}" if success else f"Error: {new_sale}")

        # Get sales
        success, sales = self.make_request('GET', '/sales')
        self.log_test("Get Sales", success, 
                     f"Found {len(sales) if success else 0} sales")

        return True

    def test_accounts_finances(self):
        """Test accounts and finances"""
        success, accounts = self.make_request('GET', '/accounts')
        self.log_test("Get Accounts", success, 
                     f"Found {len(accounts) if success else 0} accounts")
        
        if success and accounts:
            total_balance = sum(acc.get('balance', 0) for acc in accounts)
            self.log_test("Account Balances", True, f"Total balance: {total_balance} FCFA")

        return success

    def test_mock_payments(self):
        """Test mock payment systems"""
        # Test Orange Money payment
        orange_data = {"amount": 10000, "phone": "+221771234567"}
        success, orange_response = self.make_request('POST', '/payments/orange/initiate', orange_data)
        self.log_test("Orange Money Payment", success, 
                     f"Transaction ID: {orange_response.get('transaction_id', 'N/A')}" if success else f"Error: {orange_response}")

        # Test Card payment
        card_data = {"amount": 15000}
        success, card_response = self.make_request('POST', '/payments/card', card_data)
        self.log_test("Card Payment", success, 
                     f"Transaction ID: {card_response.get('transaction_id', 'N/A')}" if success else f"Error: {card_response}")

        return True

    def test_mock_messaging(self):
        """Test mock WhatsApp and SMS"""
        # Get a sale first
        success, sales = self.make_request('GET', '/sales')
        if not success or not sales:
            self.log_test("Mock Messaging - Get Sales", False, "No sales available for messaging test")
            return False

        sale_id = sales[0]['id']
        
        # Test WhatsApp receipt
        whatsapp_data = {"phone": "+221771234567", "sale_id": sale_id}
        success, whatsapp_response = self.make_request('POST', '/whatsapp/send-receipt', whatsapp_data)
        self.log_test("WhatsApp Receipt", success, 
                     "WhatsApp receipt sent" if success else f"Error: {whatsapp_response}")

        # Test SMS receipt
        sms_data = {"phone": "+221771234567", "sale_id": sale_id}
        success, sms_response = self.make_request('POST', '/sms/send-receipt', sms_data)
        self.log_test("SMS Receipt", success, 
                     "SMS receipt sent" if success else f"Error: {sms_response}")

        return True

    def run_all_tests(self):
        """Run all backend tests"""
        print("🚀 Starting StartupManager Pro Backend API Tests")
        print(f"📍 Testing against: {self.base_url}")
        print("=" * 60)

        # Core tests that must pass for system to work
        critical_tests = [
            self.test_root_endpoint,
            self.test_login_demo_account,
            self.test_get_current_user,
            self.test_dashboard_stats,
        ]

        # Feature tests
        feature_tests = [
            self.test_register_new_user,
            self.test_products_crud,
            self.test_stock_management,
            self.test_employees_crud,
            self.test_pos_sales,
            self.test_accounts_finances,
            self.test_ai_document_generation,
            self.test_marketing_ai,
            self.test_help_center_ai,
            self.test_mock_payments,
            self.test_mock_messaging,
        ]

        # Run critical tests first
        print("\n🔥 CRITICAL TESTS")
        critical_passed = 0
        for test in critical_tests:
            if test():
                critical_passed += 1

        if critical_passed < len(critical_tests):
            print(f"\n❌ CRITICAL FAILURE: Only {critical_passed}/{len(critical_tests)} critical tests passed")
            print("🛑 Stopping tests - system not functional")
            return False

        print(f"\n✅ All {len(critical_tests)} critical tests passed - system is functional")

        # Run feature tests
        print("\n🎯 FEATURE TESTS")
        for test in feature_tests:
            test()

        return True

    def print_summary(self):
        """Print test summary"""
        print("\n" + "=" * 60)
        print("📊 TEST SUMMARY")
        print("=" * 60)
        print(f"Total Tests: {self.tests_run}")
        print(f"Passed: {self.tests_passed}")
        print(f"Failed: {self.tests_run - self.tests_passed}")
        print(f"Success Rate: {(self.tests_passed/self.tests_run*100):.1f}%" if self.tests_run > 0 else "0%")
        
        # Show failed tests
        failed_tests = [r for r in self.test_results if not r['success']]
        if failed_tests:
            print(f"\n❌ FAILED TESTS ({len(failed_tests)}):")
            for test in failed_tests:
                print(f"  • {test['test']}: {test['details']}")
        
        return self.tests_passed == self.tests_run

def main():
    """Main test execution"""
    tester = StartupManagerAPITester()
    
    try:
        success = tester.run_all_tests()
        tester.print_summary()
        
        # Save results to file
        with open('/app/test_reports/backend_test_results.json', 'w') as f:
            json.dump({
                'timestamp': datetime.now().isoformat(),
                'total_tests': tester.tests_run,
                'passed_tests': tester.tests_passed,
                'success_rate': (tester.tests_passed/tester.tests_run*100) if tester.tests_run > 0 else 0,
                'results': tester.test_results
            }, f, indent=2)
        
        return 0 if success else 1
        
    except Exception as e:
        print(f"\n💥 FATAL ERROR: {str(e)}")
        return 1

if __name__ == "__main__":
    sys.exit(main())