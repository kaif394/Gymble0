# Here are your Instructions
- Backend Server Configuration : Make sure your backend server is started with the --host 0.0.0.0 flag to allow external connections. For example:

```
uvicorn main:app --host 0.0.0.0 --port 8000
```
- API URL Configuration : Your app is configured to use different URLs for emulator ( 10.0.2.2:8000 ) and physical devices (your local IP). Make sure your computer's actual IP address is correctly set in PHYSICAL_DEVICE_API_URL in the config.ts file if you're testing on a physical device.