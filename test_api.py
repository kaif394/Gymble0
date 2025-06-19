import requests
import json

url = 'http://192.168.57.172:8000/api/auth/register-member'
headers = {'Content-Type': 'application/json'}
payload = {
    'name': 'Test User',
    'email': 'test_new6@example.com',
    'password': 'password123',
    'phone': '1234567890',
    'gym_id': 'cfa5218f-70c0-4b75-8416-05db60ba269f',
    'plan_id': '0ffb4c27-d3de-4e5e-ae2e-3ee35b6fa762'
}

response = requests.post(url, headers=headers, json=payload)
print(f'Status Code: {response.status_code}')
print(f'Response: {response.text}')
