import requests
import json

url = 'http://192.168.57.172:8000/api/auth/login'
headers = {'Content-Type': 'application/json'}
payload = {
    'email': 'test_new6@example.com',
    'password': 'password123'
}

response = requests.post(url, headers=headers, json=payload)
print(f'Status Code: {response.status_code}')
print(f'Response: {response.text}')
