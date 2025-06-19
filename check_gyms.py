import requests

try:
    response = requests.get('http://localhost:8000/api/gyms/all')
    print(f'Status code: {response.status_code}')
    print('Response:')
    print(response.json() if response.status_code == 200 else response.text)
except Exception as e:
    print(f'Error: {e}')