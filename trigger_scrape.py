import urllib.request, json

# Register with correct DTO fields
print("=== REGISTER ===")
register_data = json.dumps({
    'email': 'admin@test.com',
    'password': 'password123',
    'adminName': 'Admin Test',
    'companyName': 'Test Corp'
}).encode()

req = urllib.request.Request('http://localhost:3000/api/auth/register',
    data=register_data,
    headers={'Content-Type':'application/json'})
try:
    resp = urllib.request.urlopen(req, timeout=10)
    print('Register response:', resp.read().decode()[:500])
except urllib.error.HTTPError as e:
    body = e.read().decode()
    print(f'Register error ({e.code}):', body[:500])

# Try to login now
print("\n=== LOGIN ===")
req_l = urllib.request.Request('http://localhost:3000/api/auth/login',
    data=json.dumps({'email':'admin@test.com','password':'password123'}).encode(),
    headers={'Content-Type':'application/json'})
try:
    resp = urllib.request.urlopen(req_l, timeout=10)
    token = json.loads(resp.read())['access_token']
    print('Login OK, token:', token[:40])
except urllib.error.HTTPError as e:
    body = e.read().decode()
    print(f'Login error ({e.code}):', body[:500])
