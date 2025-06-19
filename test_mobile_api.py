import requests
import json
import time
import random
import string

def generate_random_email():
    """Generate a random email for testing"""
    random_string = ''.join(random.choice(string.ascii_lowercase) for _ in range(8))
    timestamp = int(time.time())
    return f"testmobile_{random_string}_{timestamp}@example.com"

def test_api_connection(base_url):
    print(f"\nTesting API connection to: {base_url}")
    
    # Step 1: Try to fetch gyms (public endpoint)
    try:
        print("\n1. Testing gym listing endpoint...")
        gyms_response = requests.get(f"{base_url}/api/gyms/all", timeout=10)
        
        if gyms_response.status_code == 200:
            gyms = gyms_response.json()
            print(f"✅ Success! Found {len(gyms)} gyms")
            
            if len(gyms) > 0:
                gym_id = gyms[0]['id']
                print(f"Using gym_id: {gym_id}")
                
                # Step 2: Try to fetch plans for the first gym
                print("\n2. Testing plans endpoint...")
                plans_response = requests.get(f"{base_url}/api/plans/gym/{gym_id}", timeout=10)
                
                if plans_response.status_code == 200:
                    plans = plans_response.json()
                    print(f"✅ Success! Found {len(plans)} plans for the gym")
                    
                    if len(plans) > 0:
                        plan_id = plans[0]['id']
                        print(f"Using plan_id: {plan_id}")
                        
                        # Step 3: Try to register a new user
                        print("\n3. Testing member registration...")
                        test_email = generate_random_email()
                        registration_data = {
                            "name": f"Test Mobile User {int(time.time())}",
                            "email": test_email,
                            "password": "password123",
                            "phone": "1234567890",
                            "gym_id": gym_id,
                            "plan_id": plan_id
                        }
                        
                        print(f"Registering with email: {test_email}")
                        registration_response = requests.post(
                            f"{base_url}/api/auth/register-member",
                            json=registration_data,
                            timeout=10
                        )
                        
                        if registration_response.status_code == 200:
                            registration_result = registration_response.json()
                            print("✅ Registration successful!")
                            
                            # Step 4: Try to login with the new user
                            print("\n4. Testing login with new user...")
                            login_data = {
                                "email": registration_data["email"],
                                "password": registration_data["password"]
                            }
                            
                            login_response = requests.post(
                                f"{base_url}/api/auth/login",
                                json=login_data,
                                timeout=10
                            )
                            
                            if login_response.status_code == 200:
                                login_result = login_response.json()
                                print("✅ Login successful!")
                                
                                # Step 5: Try to access protected endpoint
                                print("\n5. Testing protected endpoint access...")
                                token = login_result["access_token"]
                                headers = {"Authorization": f"Bearer {token}"}
                                
                                me_response = requests.get(
                                    f"{base_url}/api/members/me",
                                    headers=headers,
                                    timeout=10
                                )
                                
                                if me_response.status_code == 200:
                                    me_data = me_response.json()
                                    print("✅ Protected endpoint access successful!")
                                    print(f"User data: {me_data['name']} ({me_data['email']})")
                                    return True
                                else:
                                    print(f"❌ Protected endpoint access failed: {me_response.status_code}")
                                    try:
                                        print(me_response.json())
                                    except:
                                        print(me_response.text)
                            else:
                                print(f"❌ Login failed: {login_response.status_code}")
                                try:
                                    print(login_response.json())
                                except:
                                    print(login_response.text)
                        else:
                            print(f"❌ Registration failed: {registration_response.status_code}")
                            try:
                                print(registration_response.json())
                            except:
                                print(registration_response.text)
                    else:
                        print("❌ No plans found for the gym")
                else:
                    print(f"❌ Failed to fetch plans: {plans_response.status_code}")
                    try:
                        print(plans_response.json())
                    except:
                        print(plans_response.text)
            else:
                print("❌ No gyms found")
        else:
            print(f"❌ Failed to fetch gyms: {gyms_response.status_code}")
            try:
                print(gyms_response.json())
            except:
                print(gyms_response.text)
    except requests.exceptions.Timeout:
        print(f"❌ Connection timeout: The request to {base_url} timed out after 10 seconds")
    except requests.exceptions.ConnectionError:
        print(f"❌ Connection error: Could not connect to {base_url}")
        print("   This usually means the server is not running or not accessible from this network")
    except Exception as e:
        print(f"❌ Unexpected error: {str(e)}")
    
    return False

def main():
    # Test both localhost and Android emulator connection
    print("=== GYMBLE MOBILE API CONNECTION TEST ===\n")
    print("This script tests the API connection for the mobile app")
    print("It will help diagnose connection issues between the mobile app and backend")

    # Test localhost connection (for development on computer)
    localhost_success = test_api_connection("http://localhost:8000")

    # Test Android emulator connection
    emulator_success = test_api_connection("http://10.0.2.2:8000")

    # Summary
    print("\n=== TEST SUMMARY ===")
    print(f"Localhost connection: {'✅ SUCCESS' if localhost_success else '❌ FAILED'}")
    print(f"Android emulator connection: {'✅ SUCCESS' if emulator_success else '❌ FAILED'}")

    if not emulator_success and localhost_success:
        print("\n⚠️ IMPORTANT: The API is working on localhost but not accessible from the Android emulator.")
        print("This explains why the mobile app cannot connect to the backend.")
        print("\nPossible solutions:")
        print("1. Make sure the backend server is started with --host 0.0.0.0 to allow external connections")
        print("   Example: uvicorn main:app --host 0.0.0.0 --port 8000")
        print("2. Check if any firewall is blocking connections to the server port")
        print("3. For physical devices, use your computer's actual IP address instead of localhost")
        print("   Update the config.ts file with your computer's IP address")
    elif not localhost_success and not emulator_success:
        print("\n❌ Both connections failed. The backend server might not be running.")
        print("Please start the backend server and try again.")
    elif localhost_success and emulator_success:
        print("\n✅ Both connections are working! The mobile app should be able to connect to the backend.")
        print("If you're still having issues, check the config.ts file in the mobile app to ensure")
        print("it's using the correct API URL.")

if __name__ == "__main__":
    main()