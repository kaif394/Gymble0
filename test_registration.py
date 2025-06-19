import requests
import json

# Base URL for the API
API_URL = "http://localhost:8000/api"

# Read credentials from the file
def read_credentials():
    try:
        credentials = {}
        with open("owner_credentials.txt", "r") as f:
            for line in f:
                key, value = line.strip().split(": ", 1)
                credentials[key] = value
        return credentials
    except Exception as e:
        print(f"Error reading credentials: {e}")
        return None

def test_registration_flow():
    try:
        # Get credentials
        credentials = read_credentials()
        if not credentials:
            print("Could not read credentials. Please run create_owner.py first.")
            return
        
        # Test data for member registration
        member_data = {
            "name": "Test Member",
            "email": "testmember123@example.com",  # Using a different email to avoid conflicts
            "password": "password123",
            "phone": "1234567890",
            "gym_id": credentials["Gym ID"],
            "plan_id": credentials["Plan ID"]
        }
        
        # Step 1: Register a new member
        print("Registering new member...")
        registration_response = requests.post(
            f"{API_URL}/auth/register-member", 
            json=member_data
        )
        
        print(f"Registration status code: {registration_response.status_code}")
        if registration_response.status_code == 200:
            registration_data = registration_response.json()
            print("Registration successful!")
            print(f"User data: {json.dumps(registration_data['user'], indent=2)}")
            
            # Step 2: Login as gym owner to check if the member is visible
            print("\nLogging in as gym owner...")
            owner_login_data = {
                "email": credentials["Email"],
                "password": credentials["Password"]
            }
            
            login_response = requests.post(f"{API_URL}/auth/login", json=owner_login_data)
            print(f"Login status code: {login_response.status_code}")
            
            if login_response.status_code == 200:
                login_data = login_response.json()
                print("Login successful!")
                print(f"Owner data: {json.dumps(login_data['user'], indent=2)}")
                
                owner_token = login_data["access_token"]
                
                # Step 3: Get members for the gym
                print("\nFetching members for the gym...")
                members_response = requests.get(
                    f"{API_URL}/members",
                    headers={"Authorization": f"Bearer {owner_token}"}
                )
                
                print(f"Members status code: {members_response.status_code}")
                if members_response.status_code == 200:
                    members = members_response.json()
                    print(f"Found {len(members)} members")
                    
                    # Check if our newly registered member is in the list
                    found = False
                    for member in members:
                        if member.get("email") == member_data["email"]:
                            found = True
                            print("\nNewly registered member found in the gym's member list!")
                            print(f"Member details: {json.dumps(member, indent=2)}")
                            break
                    
                    if not found:
                        print("\nERROR: Newly registered member NOT found in the gym's member list!")
                        print("Members found:")
                        for member in members:
                            print(f"  - {member.get('name', 'N/A')} ({member.get('email', 'N/A')})")
                else:
                    print(f"Error fetching members: {members_response.text}")
            else:
                print(f"Error logging in as gym owner: {login_response.text}")
        else:
            print(f"Registration failed: {registration_response.text}")
    
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    test_registration_flow()