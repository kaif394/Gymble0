import requests
import json
import uuid

# Base URL for the API
API_URL = "http://localhost:8000/api"

def create_owner_and_gym():
    try:
        # Generate a unique email to avoid conflicts
        unique_id = str(uuid.uuid4())[:8]
        email = f"testowner{unique_id}@example.com"
        
        # Step 1: Register a new owner
        print("Registering new gym owner...")
        owner_data = {
            "name": "Test Owner",
            "email": email,
            "password": "password123",
            "phone": "1234567890",
            "role": "owner"  # Specify the role as owner
        }
        
        registration_response = requests.post(
            f"{API_URL}/auth/register", 
            json=owner_data
        )
        
        print(f"Registration status code: {registration_response.status_code}")
        if registration_response.status_code == 200:
            registration_data = registration_response.json()
            print("Registration successful!")
            print(f"User data: {json.dumps(registration_data['user'], indent=2)}")
            
            # Save the token for future requests
            token = registration_data["access_token"]
            owner_id = registration_data["user"]["id"]
            
            # Step 2: Create a new gym
            print("\nCreating a new gym...")
            gym_data = {
                "name": "Test Gym",
                "address": "123 Test Street",
                "phone": "1234567890",
                "email": f"testgym{unique_id}@example.com",
                "description": "A test gym for API testing",
                "owner_id": owner_id
            }
            
            gym_response = requests.post(
                f"{API_URL}/gyms",
                headers={"Authorization": f"Bearer {token}"},
                json=gym_data
            )
            
            print(f"Gym creation status code: {gym_response.status_code}")
            if gym_response.status_code == 200:
                gym_data = gym_response.json()
                print("Gym creation successful!")
                print(f"Gym data: {json.dumps(gym_data, indent=2)}")
                gym_id = gym_data["id"]
                
                # Step 3: Create a plan for the gym
                print("\nCreating a plan for the gym...")
                plan_data = {
                    "name": "Basic Plan",
                    "description": "A basic plan for testing",
                    "price": 1000,
                    "duration_days": 30,
                    "gym_id": gym_id,
                    "plan_type": "basic"  # Changed to lowercase 'basic'
                }
                
                plan_response = requests.post(
                    f"{API_URL}/plans",
                    headers={"Authorization": f"Bearer {token}"},
                    json=plan_data
                )
                
                print(f"Plan creation status code: {plan_response.status_code}")
                if plan_response.status_code == 200:
                    plan_data = plan_response.json()
                    print("Plan creation successful!")
                    print(f"Plan data: {json.dumps(plan_data, indent=2)}")
                    
                    # Save credentials for future use
                    with open("owner_credentials.txt", "w") as f:
                        f.write(f"Email: {owner_data['email']}\n")
                        f.write(f"Password: {owner_data['password']}\n")
                        f.write(f"Owner ID: {owner_id}\n")
                        f.write(f"Gym ID: {gym_id}\n")
                        f.write(f"Plan ID: {plan_data['id']}\n")
                    
                    print("\nCredentials saved to owner_credentials.txt")
                else:
                    print(f"Plan creation failed: {plan_response.text}")
            else:
                print(f"Gym creation failed: {gym_response.text}")
        else:
            print(f"Registration failed: {registration_response.text}")
    
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    create_owner_and_gym()