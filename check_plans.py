import requests

try:
    # Use the gym ID from the previous check_gyms.py output
    gym_id = 'cfa5218f-70c0-4b75-8416-05db60ba269f'
    response = requests.get(f'http://localhost:8000/api/plans/gym/{gym_id}')
    print(f'Status code: {response.status_code}')
    print('Response:')
    print(response.json() if response.status_code == 200 else response.text)
except Exception as e:
    print(f'Error: {e}')