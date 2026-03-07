#!/usr/bin/env python3

import requests
import sys
import json
from datetime import datetime, timedelta
from typing import Dict, Any

class PGManagerAPITester:
    def __init__(self, base_url: str = "https://rentease-admin.preview.emergentagent.com"):
        self.base_url = base_url
        self.token = None
        self.tests_run = 0
        self.tests_passed = 0
        self.test_results = []
        
        # Test data storage
        self.test_data = {
            'user_id': None,
            'property_ids': [],
            'room_ids': [],
            'resident_ids': [],
            'payment_ids': [],
            'complaint_ids': [],
            'staff_ids': [],
            'notice_ids': []
        }

    def log_result(self, test_name: str, success: bool, details: str = ""):
        """Log test result"""
        self.tests_run += 1
        if success:
            self.tests_passed += 1
            print(f"✅ {test_name}")
        else:
            print(f"❌ {test_name} - {details}")
        
        self.test_results.append({
            'test': test_name,
            'success': success,
            'details': details
        })

    def make_request(self, method: str, endpoint: str, data: Dict[Any, Any] = None, expected_status: int = 200) -> tuple:
        """Make HTTP request with error handling"""
        url = f"{self.base_url}/api/{endpoint}"
        headers = {'Content-Type': 'application/json'}
        
        if self.token:
            headers['Authorization'] = f'Bearer {self.token}'

        try:
            if method == 'GET':
                response = requests.get(url, headers=headers, timeout=30)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=headers, timeout=30)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=headers, timeout=30)
            elif method == 'DELETE':
                response = requests.delete(url, headers=headers, timeout=30)
            else:
                return False, f"Unsupported method: {method}"

            success = response.status_code == expected_status
            response_data = {}
            
            try:
                response_data = response.json()
            except:
                response_data = {"raw_response": response.text}

            return success, response_data

        except requests.exceptions.Timeout:
            return False, "Request timeout"
        except requests.exceptions.ConnectionError:
            return False, "Connection error"
        except Exception as e:
            return False, f"Request failed: {str(e)}"

    def test_authentication(self):
        """Test authentication endpoints"""
        print("\n🔐 Testing Authentication...")
        
        # Test login with admin credentials
        login_data = {
            "email": "admin@pgmanager.com",
            "password": "admin123"
        }
        
        success, response = self.make_request('POST', 'auth/login', login_data)
        if success and 'access_token' in response:
            self.token = response['access_token']
            self.test_data['user_id'] = response['user']['id']
            self.log_result("Admin Login", True)
            
            # Test get current user
            success, response = self.make_request('GET', 'auth/me')
            self.log_result("Get Current User", success and 'email' in response)
        else:
            self.log_result("Admin Login", False, "Failed to login or get token")
            return False
        
        return True

    def test_dashboard_endpoints(self):
        """Test dashboard statistics"""
        print("\n📊 Testing Dashboard...")
        
        # Test dashboard stats
        success, response = self.make_request('GET', 'dashboard/stats')
        self.log_result("Dashboard Stats", success and 'total_properties' in response)
        
        # Test revenue chart
        success, response = self.make_request('GET', 'dashboard/revenue-chart')
        self.log_result("Revenue Chart", success and isinstance(response, list))
        
        # Test occupancy chart
        success, response = self.make_request('GET', 'dashboard/occupancy-chart')
        self.log_result("Occupancy Chart", success and isinstance(response, list))

    def test_properties_crud(self):
        """Test properties CRUD operations"""
        print("\n🏢 Testing Properties...")
        
        # Get all properties
        success, response = self.make_request('GET', 'properties')
        if success and isinstance(response, list):
            self.log_result("Get Properties", True)
            if response:
                self.test_data['property_ids'] = [p['id'] for p in response[:2]]
        else:
            self.log_result("Get Properties", False)
        
        # Create new property
        property_data = {
            "name": "Test PG Property",
            "address": "123 Test Street",
            "city": "Test City",
            "state": "Test State",
            "pincode": "123456",
            "total_floors": 2,
            "amenities": ["WiFi", "AC"]
        }
        
        success, response = self.make_request('POST', 'properties', property_data, 200)
        if success and 'id' in response:
            property_id = response['id']
            self.test_data['property_ids'].append(property_id)
            self.log_result("Create Property", True)
            
            # Get single property
            success, response = self.make_request('GET', f'properties/{property_id}')
            self.log_result("Get Single Property", success and response.get('name') == property_data['name'])
            
            # Update property
            update_data = {"name": "Updated Test PG"}
            success, response = self.make_request('PUT', f'properties/{property_id}', update_data)
            self.log_result("Update Property", success and response.get('name') == update_data['name'])
        else:
            self.log_result("Create Property", False)

    def test_rooms_crud(self):
        """Test rooms CRUD operations"""
        print("\n🚪 Testing Rooms...")
        
        if not self.test_data['property_ids']:
            self.log_result("Rooms Test", False, "No properties available")
            return
        
        property_id = self.test_data['property_ids'][0]
        
        # Get rooms for property
        success, response = self.make_request('GET', f'rooms?property_id={property_id}')
        if success and isinstance(response, list):
            self.log_result("Get Rooms", True)
            if response:
                self.test_data['room_ids'] = [r['id'] for r in response[:2]]
        else:
            self.log_result("Get Rooms", False)
        
        # Create new room
        room_data = {
            "property_id": property_id,
            "room_number": "TEST101",
            "room_type": "single",
            "number_of_beds": 1,
            "rent_amount": 8000,
            "security_deposit": 16000,
            "floor": 1,
            "status": "available"
        }
        
        success, response = self.make_request('POST', 'rooms', room_data)
        if success and 'id' in response:
            room_id = response['id']
            self.test_data['room_ids'].append(room_id)
            self.log_result("Create Room", True)
            
            # Get single room
            success, response = self.make_request('GET', f'rooms/{room_id}')
            self.log_result("Get Single Room", success and response.get('room_number') == room_data['room_number'])
        else:
            self.log_result("Create Room", False)

    def test_residents_crud(self):
        """Test residents CRUD operations"""
        print("\n👥 Testing Residents...")
        
        if not self.test_data['room_ids']:
            self.log_result("Residents Test", False, "No rooms available")
            return
        
        # Get all residents
        success, response = self.make_request('GET', 'residents')
        if success and isinstance(response, list):
            self.log_result("Get Residents", True)
            if response:
                self.test_data['resident_ids'] = [r['id'] for r in response[:2]]
        else:
            self.log_result("Get Residents", False)
        
        # Create new resident
        room_id = self.test_data['room_ids'][0]
        property_id = self.test_data['property_ids'][0]
        
        resident_data = {
            "name": "Test Resident",
            "phone": "+91 9876543210",
            "email": "test.resident@email.com",
            "emergency_contact": "+91 9876543211",
            "property_id": property_id,
            "room_id": room_id,
            "bed_number": 1,
            "check_in_date": datetime.now().isoformat(),
            "contract_end_date": (datetime.now() + timedelta(days=180)).isoformat(),
            "deposit_paid": 16000,
            "status": "active"
        }
        
        success, response = self.make_request('POST', 'residents', resident_data)
        if success and 'id' in response:
            resident_id = response['id']
            self.test_data['resident_ids'].append(resident_id)
            self.log_result("Create Resident", True)
            
            # Get single resident
            success, response = self.make_request('GET', f'residents/{resident_id}')
            self.log_result("Get Single Resident", success and response.get('name') == resident_data['name'])
        else:
            self.log_result("Create Resident", False)

    def test_payments_crud(self):
        """Test payments CRUD operations"""
        print("\n💳 Testing Payments...")
        
        if not self.test_data['resident_ids']:
            self.log_result("Payments Test", False, "No residents available")
            return
        
        # Get all payments
        success, response = self.make_request('GET', 'payments')
        if success and isinstance(response, list):
            self.log_result("Get Payments", True)
            if response:
                self.test_data['payment_ids'] = [p['id'] for p in response[:2]]
        else:
            self.log_result("Get Payments", False)
        
        # Create new payment
        resident_id = self.test_data['resident_ids'][0]
        
        payment_data = {
            "resident_id": resident_id,
            "invoice_month": "2024-12",
            "base_rent": 8000,
            "electricity_charge": 200,
            "food_charge": 2500,
            "maintenance_charge": 300,
            "due_date": (datetime.now() + timedelta(days=5)).isoformat()
        }
        
        success, response = self.make_request('POST', 'payments', payment_data)
        if success and 'id' in response:
            payment_id = response['id']
            self.test_data['payment_ids'].append(payment_id)
            self.log_result("Create Payment", True)
            
            # Update payment status
            update_data = {
                "status": "paid",
                "payment_method": "UPI",
                "payment_date": datetime.now().isoformat()
            }
            success, response = self.make_request('PUT', f'payments/{payment_id}', update_data)
            self.log_result("Update Payment Status", success and response.get('status') == 'paid')
        else:
            self.log_result("Create Payment", False)

    def test_complaints_crud(self):
        """Test complaints CRUD operations"""
        print("\n🔧 Testing Complaints...")
        
        if not self.test_data['resident_ids'] or not self.test_data['room_ids']:
            self.log_result("Complaints Test", False, "No residents or rooms available")
            return
        
        # Get all complaints
        success, response = self.make_request('GET', 'complaints')
        if success and isinstance(response, list):
            self.log_result("Get Complaints", True)
            if response:
                self.test_data['complaint_ids'] = [c['id'] for c in response[:2]]
        else:
            self.log_result("Get Complaints", False)
        
        # Create new complaint
        complaint_data = {
            "resident_id": self.test_data['resident_ids'][0],
            "room_id": self.test_data['room_ids'][0],
            "category": "plumbing",
            "description": "Test complaint - water leakage"
        }
        
        success, response = self.make_request('POST', 'complaints', complaint_data)
        if success and 'id' in response:
            complaint_id = response['id']
            self.test_data['complaint_ids'].append(complaint_id)
            self.log_result("Create Complaint", True)
            
            # Update complaint status
            update_data = {"status": "in_progress"}
            success, response = self.make_request('PUT', f'complaints/{complaint_id}', update_data)
            self.log_result("Update Complaint Status", success and response.get('status') == 'in_progress')
        else:
            self.log_result("Create Complaint", False)

    def test_staff_crud(self):
        """Test staff CRUD operations"""
        print("\n👷 Testing Staff...")
        
        if not self.test_data['property_ids']:
            self.log_result("Staff Test", False, "No properties available")
            return
        
        # Get all staff
        success, response = self.make_request('GET', 'staff')
        if success and isinstance(response, list):
            self.log_result("Get Staff", True)
            if response:
                self.test_data['staff_ids'] = [s['id'] for s in response[:2]]
        else:
            self.log_result("Get Staff", False)
        
        # Create new staff
        staff_data = {
            "name": "Test Staff Member",
            "phone": "+91 9876543212",
            "role": "maintenance",
            "assigned_property_id": self.test_data['property_ids'][0],
            "salary": 15000,
            "status": "active"
        }
        
        success, response = self.make_request('POST', 'staff', staff_data)
        if success and 'id' in response:
            staff_id = response['id']
            self.test_data['staff_ids'].append(staff_id)
            self.log_result("Create Staff", True)
            
            # Get single staff
            success, response = self.make_request('GET', f'staff/{staff_id}')
            self.log_result("Get Single Staff", success and response.get('name') == staff_data['name'])
        else:
            self.log_result("Create Staff", False)

    def test_notices_crud(self):
        """Test notices CRUD operations"""
        print("\n📢 Testing Notices...")
        
        # Get all notices
        success, response = self.make_request('GET', 'notices')
        if success and isinstance(response, list):
            self.log_result("Get Notices", True)
            if response:
                self.test_data['notice_ids'] = [n['id'] for n in response[:2]]
        else:
            self.log_result("Get Notices", False)
        
        # Create new notice
        notice_data = {
            "title": "Test Notice",
            "description": "This is a test notice for API testing",
            "target": "all",
            "priority": "normal"
        }
        
        success, response = self.make_request('POST', 'notices', notice_data)
        if success and 'id' in response:
            notice_id = response['id']
            self.test_data['notice_ids'].append(notice_id)
            self.log_result("Create Notice", True)
            
            # Get single notice
            success, response = self.make_request('GET', f'notices/{notice_id}')
            self.log_result("Get Single Notice", success and response.get('title') == notice_data['title'])
        else:
            self.log_result("Create Notice", False)

    def test_settings(self):
        """Test settings endpoints"""
        print("\n⚙️ Testing Settings...")
        
        # Get settings
        success, response = self.make_request('GET', 'settings')
        self.log_result("Get Settings", success and 'rent_due_day' in response)
        
        # Update settings
        settings_data = {
            "rent_due_day": 10,
            "late_fee_percentage": 7.5,
            "notice_period_days": 45
        }
        
        success, response = self.make_request('PUT', 'settings', settings_data)
        self.log_result("Update Settings", success and response.get('rent_due_day') == 10)

    def test_reports(self):
        """Test reports endpoints"""
        print("\n📊 Testing Reports...")
        
        # Test revenue report
        success, response = self.make_request('GET', 'reports/revenue')
        self.log_result("Revenue Report", success and isinstance(response, list))
        
        # Test occupancy report
        success, response = self.make_request('GET', 'reports/occupancy')
        self.log_result("Occupancy Report", success and isinstance(response, list))
        
        # Test outstanding dues report
        success, response = self.make_request('GET', 'reports/outstanding-dues')
        self.log_result("Outstanding Dues Report", success and isinstance(response, list))
        
        # Test maintenance report
        success, response = self.make_request('GET', 'reports/maintenance')
        self.log_result("Maintenance Report", success and isinstance(response, list))

    def run_all_tests(self):
        """Run all API tests"""
        print("🚀 Starting PG Manager API Tests...")
        print(f"Testing against: {self.base_url}")
        
        # Authentication is required for all other tests
        if not self.test_authentication():
            print("❌ Authentication failed - stopping tests")
            return False
        
        # Run all test suites
        self.test_dashboard_endpoints()
        self.test_properties_crud()
        self.test_rooms_crud()
        self.test_residents_crud()
        self.test_payments_crud()
        self.test_complaints_crud()
        self.test_staff_crud()
        self.test_notices_crud()
        self.test_settings()
        self.test_reports()
        
        # Print summary
        print(f"\n📊 Test Summary:")
        print(f"Tests Run: {self.tests_run}")
        print(f"Tests Passed: {self.tests_passed}")
        print(f"Tests Failed: {self.tests_run - self.tests_passed}")
        print(f"Success Rate: {(self.tests_passed / self.tests_run * 100):.1f}%")
        
        return self.tests_passed == self.tests_run

def main():
    tester = PGManagerAPITester()
    success = tester.run_all_tests()
    
    # Save detailed results
    with open('/tmp/api_test_results.json', 'w') as f:
        json.dump({
            'summary': {
                'tests_run': tester.tests_run,
                'tests_passed': tester.tests_passed,
                'success_rate': tester.tests_passed / tester.tests_run * 100 if tester.tests_run > 0 else 0
            },
            'results': tester.test_results
        }, f, indent=2)
    
    return 0 if success else 1

if __name__ == "__main__":
    sys.exit(main())