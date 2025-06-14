
import requests
import sys
import time
from datetime import datetime

class GYMBLEAPITester:
    def __init__(self, base_url="https://34d77448-1de3-4d98-a151-7bb7bb3affbf.preview.emergentagent.com/api"):
        self.base_url = base_url
        self.token = None
        self.tests_run = 0
        self.tests_passed = 0
        self.owner_token = None
        self.member_token = None
        self.gym_id = None
        self.plan_id = None
        self.member_id = None
        self.workout_template_id = None
        self.diet_template_id = None
        self.qr_code_data = None

    def run_test(self, name, method, endpoint, expected_status, data=None, token=None):
        """Run a single API test"""
        url = f"{self.base_url}/{endpoint}"
        headers = {'Content-Type': 'application/json'}
        if token:
            headers['Authorization'] = f'Bearer {token}'
        elif self.token:
            headers['Authorization'] = f'Bearer {self.token}'

        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=headers)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=headers)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=headers)
            elif method == 'DELETE':
                response = requests.delete(url, headers=headers)

            success = response.status_code == expected_status
            if success:
                self.tests_passed += 1
                print(f"✅ Passed - Status: {response.status_code}")
                try:
                    return success, response.json()
                except:
                    return success, {}
            else:
                print(f"❌ Failed - Expected {expected_status}, got {response.status_code}")
                try:
                    print(f"Response: {response.json()}")
                except:
                    print(f"Response: {response.text}")
                return False, {}

        except Exception as e:
            print(f"❌ Failed - Error: {str(e)}")
            return False, {}

    def test_health_check(self):
        """Test the health check endpoint"""
        return self.run_test("Health Check", "GET", "health", 200)

    def test_owner_login(self, email, password):
        """Test owner login and get token"""
        success, response = self.run_test(
            "Owner Login",
            "POST",
            "auth/login",
            200,
            data={"email": email, "password": password}
        )
        if success and 'access_token' in response:
            self.owner_token = response['access_token']
            self.token = self.owner_token
            return True
        return False

    def test_member_login(self, email, password):
        """Test member login and get token"""
        success, response = self.run_test(
            "Member Login",
            "POST",
            "auth/login",
            200,
            data={"email": email, "password": password}
        )
        if success and 'access_token' in response:
            self.member_token = response['access_token']
            self.token = self.member_token
            return True
        return False

    def test_get_current_user(self):
        """Test getting current user info"""
        return self.run_test("Get Current User", "GET", "auth/me", 200)

    def test_get_gym(self):
        """Test getting gym info"""
        success, response = self.run_test("Get Gym", "GET", "gyms/my", 200)
        if success and 'id' in response:
            self.gym_id = response['id']
        return success

    def test_get_all_gyms(self):
        """Test getting all gyms"""
        return self.run_test("Get All Gyms", "GET", "gyms/all", 200)

    def test_get_plans(self):
        """Test getting plans"""
        success, response = self.run_test("Get Plans", "GET", "plans", 200)
        if success and len(response) > 0:
            self.plan_id = response[0]['id']
        return success

    def test_get_gym_plans(self):
        """Test getting gym plans"""
        if not self.gym_id:
            print("❌ No gym ID available")
            return False
        return self.run_test("Get Gym Plans", "GET", f"plans/gym/{self.gym_id}", 200)

    def test_create_plan(self):
        """Test creating a plan"""
        plan_data = {
            "name": "Test Plan",
            "description": "Test plan description",
            "price": 2500,
            "duration_days": 30,
            "plan_type": "basic",
            "features": ["Access to gym", "Basic equipment"]
        }
        success, response = self.run_test("Create Plan", "POST", "plans", 200, data=plan_data)
        if success and 'id' in response:
            self.plan_id = response['id']
        return success

    def test_get_members(self):
        """Test getting members"""
        return self.run_test("Get Members", "GET", "members", 200)

    def test_search_members(self, query="test"):
        """Test searching members"""
        return self.run_test("Search Members", "GET", f"members/search/{query}", 200)

    def test_create_member(self):
        """Test creating a member"""
        if not self.plan_id:
            print("❌ No plan ID available")
            return False
            
        member_data = {
            "name": f"Test Member {datetime.now().strftime('%H%M%S')}",
            "email": f"test{datetime.now().strftime('%H%M%S')}@example.com",
            "password": "password123",
            "phone": "1234567890",
            "plan_id": self.plan_id,
            "payment_method": "cash",
            "payment_amount": 2500
        }
        success, response = self.run_test("Create Member", "POST", "members", 200, data=member_data)
        if success and 'id' in response:
            self.member_id = response['id']
        return success

    def test_dashboard_stats(self):
        """Test getting dashboard stats"""
        return self.run_test("Dashboard Stats", "GET", "dashboard/stats", 200)

    def test_get_attendance_qr_code(self):
        """Test getting attendance QR code"""
        success, response = self.run_test("Get Attendance QR Code", "GET", "attendance/qr-code", 200)
        if success and 'qr_code_data' in response:
            self.qr_code_data = response['qr_code_data']
        return success

    def test_mark_attendance(self):
        """Test marking attendance with QR code"""
        if not self.qr_code_data:
            print("❌ No QR code data available")
            return False
            
        # Switch to member token
        old_token = self.token
        self.token = self.member_token
        
        success, response = self.run_test(
            "Mark Attendance", 
            "POST", 
            "attendance/mark", 
            200, 
            data={"qr_code_data": self.qr_code_data, "device_info": "Test Device"}
        )
        
        # Restore token
        self.token = old_token
        return success

    def test_get_attendance_status(self):
        """Test getting attendance status"""
        # Switch to member token
        old_token = self.token
        self.token = self.member_token
        
        success, response = self.run_test("Get Attendance Status", "GET", "attendance/my-status", 200)
        
        # Restore token
        self.token = old_token
        return success

    def test_get_today_attendance(self):
        """Test getting today's attendance"""
        return self.run_test("Get Today's Attendance", "GET", "attendance/today", 200)

    def test_create_workout_template(self):
        """Test creating a workout template"""
        workout_data = {
            "name": "Test Workout",
            "description": "Test workout description",
            "category": "Strength",
            "target_muscle_groups": ["Chest", "Arms"],
            "estimated_duration": 60,
            "difficulty_level": "Intermediate",
            "exercises": [
                {
                    "exercise_name": "Push-ups",
                    "sets": 3,
                    "reps": "10-12"
                },
                {
                    "exercise_name": "Bench Press",
                    "sets": 3,
                    "reps": "8-10",
                    "weight": "50kg"
                }
            ]
        }
        success, response = self.run_test("Create Workout Template", "POST", "workout-templates", 200, data=workout_data)
        if success and 'id' in response:
            self.workout_template_id = response['id']
        return success

    def test_get_workout_templates(self):
        """Test getting workout templates"""
        return self.run_test("Get Workout Templates", "GET", "workout-templates", 200)

    def test_create_diet_template(self):
        """Test creating a diet template"""
        diet_data = {
            "name": "Test Diet",
            "description": "Test diet description",
            "goal": "Weight Loss",
            "total_calories": 2000,
            "protein_target": 150,
            "carbs_target": 200,
            "fat_target": 70,
            "meals": [
                {
                    "meal_type": "Breakfast",
                    "time": "8:00 AM",
                    "items": [
                        {
                            "food_name": "Oatmeal",
                            "quantity": "1 cup",
                            "calories": 300
                        },
                        {
                            "food_name": "Banana",
                            "quantity": "1 medium",
                            "calories": 100
                        }
                    ]
                },
                {
                    "meal_type": "Lunch",
                    "time": "1:00 PM",
                    "items": [
                        {
                            "food_name": "Chicken Breast",
                            "quantity": "150g",
                            "calories": 250
                        },
                        {
                            "food_name": "Brown Rice",
                            "quantity": "1 cup",
                            "calories": 200
                        }
                    ]
                }
            ]
        }
        success, response = self.run_test("Create Diet Template", "POST", "diet-templates", 200, data=diet_data)
        if success and 'id' in response:
            self.diet_template_id = response['id']
        return success

    def test_get_diet_templates(self):
        """Test getting diet templates"""
        return self.run_test("Get Diet Templates", "GET", "diet-templates", 200)

    def test_assign_plan_to_member(self):
        """Test assigning a plan to a member"""
        if not self.member_id or not self.workout_template_id:
            print("❌ No member ID or workout template ID available")
            return False
            
        assignment_data = {
            "member_id": self.member_id,
            "plan_type": "workout",
            "plan_id": self.workout_template_id
        }
        return self.run_test("Assign Plan to Member", "POST", "plan-assignments", 200, data=assignment_data)

    def test_get_member_plan_assignments(self):
        """Test getting member plan assignments"""
        if not self.member_id:
            print("❌ No member ID available")
            return False
            
        return self.run_test("Get Member Plan Assignments", "GET", f"plan-assignments/member/{self.member_id}", 200)

    def test_create_announcement(self):
        """Test creating an announcement"""
        announcement_data = {
            "title": "Test Announcement",
            "content": "This is a test announcement",
            "priority": "normal"
        }
        return self.run_test("Create Announcement", "POST", "announcements", 200, data=announcement_data)

    def test_get_announcements(self):
        """Test getting announcements"""
        return self.run_test("Get Announcements", "GET", "announcements", 200)

def main():
    # Setup
    tester = GYMBLEAPITester()
    
    # Test health check
    tester.test_health_check()
    
    # Test owner authentication
    if not tester.test_owner_login("admin@admin.com", "password123"):
        print("❌ Owner login failed, stopping tests")
        return 1
    
    # Test getting current user
    tester.test_get_current_user()
    
    # Test gym management
    tester.test_get_gym()
    tester.test_get_all_gyms()
    
    # Test plan management
    tester.test_get_plans()
    if not tester.plan_id:
        tester.test_create_plan()
    tester.test_get_gym_plans()
    
    # Test member management
    tester.test_get_members()
    tester.test_search_members()
    tester.test_create_member()
    
    # Test dashboard
    tester.test_dashboard_stats()
    
    # Test workout and diet templates
    tester.test_create_workout_template()
    tester.test_get_workout_templates()
    tester.test_create_diet_template()
    tester.test_get_diet_templates()
    
    # Test plan assignments
    if tester.member_id and tester.workout_template_id:
        tester.test_assign_plan_to_member()
        tester.test_get_member_plan_assignments()
    
    # Test announcements
    tester.test_create_announcement()
    tester.test_get_announcements()
    
    # Test attendance system
    tester.test_get_attendance_qr_code()
    
    # Test member login
    if tester.member_id:
        # For testing, we'd need a member email/password
        # Using the admin credentials for now
        if tester.test_member_login("ka1686037@gmail.com", "password123"):
            tester.test_get_attendance_status()
            if tester.qr_code_data:
                tester.test_mark_attendance()
                tester.test_get_attendance_status()
    
    # Switch back to owner token
    tester.token = tester.owner_token
    tester.test_get_today_attendance()
    
    # Print results
    print(f"\n📊 Tests passed: {tester.tests_passed}/{tester.tests_run}")
    return 0 if tester.tests_passed == tester.tests_run else 1

if __name__ == "__main__":
    sys.exit(main())
