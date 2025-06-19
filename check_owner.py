import requests

# Base URL for the API
API_URL = "http://localhost:8000/api"

def check_owner_login():
    try:
        # Try to login with the Admin gym owner
        print("Attempting to login as Admin gym owner...")
        login_data = {
            "email": "admin@admin.com",  # Using the email from the Admin gym
            "password": "admin"  # Common default password, let's try it
        }
        
        login_response = requests.post(f"{API_URL}/auth/login", json=login_data)
        print(f"Login status code: {login_response.status_code}")
        
        if login_response.status_code == 200:
            login_data = login_response.json()
            print("Login successful!")
            print(f"User data: {login_data['user']}")
            
            # Get the token for future requests
            token = login_data["access_token"]
            
            # Try to get members with this token
            print("\nFetching members for the gym...")
            members_response = requests.get(
                f"{API_URL}/members",
                headers={"Authorization": f"Bearer {token}"}
            )
            
            print(f"Members status code: {members_response.status_code}")
            if members_response.status_code == 200:
                members = members_response.json()
                print(f"Found {len(members)} members")
                for member in members:
                    print(f"Member: {member.get('name', 'N/A')}, Email: {member.get('email', 'N/A')}")
            else:
                print(f"Error fetching members: {members_response.text}")
        else:
            print(f"Login failed: {login_response.text}")
            
            # Try with a different password
            print("\nTrying with a different password...")
            login_data["password"] = "password123"
            login_response = requests.post(f"{API_URL}/auth/login", json=login_data)
            print(f"Login status code: {login_response.status_code}")
            print(login_response.text if login_response.status_code != 200 else "Login successful!")
    
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    check_owner_login()