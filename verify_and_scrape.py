import urllib.request, json, subprocess, sys

# Step 1: Get verification code from database
result = subprocess.run(
    ['npx', 'prisma', 'db', 'execute', '--stdin'],
    input="SELECT email_verification_code FROM users WHERE email = 'admin@test.com';",
    cwd='/opt/sinyaltender/apps/backend',
    capture_output=True,
    text=True,
    timeout=30
)
print('DB raw output:', result.stdout, result.stderr[:200] if result.stderr else '')

# Step 2: Try to verify - the code might be in the output
# Actually, prisma db execute returns tabular output, let me check
if result.stdout:
    lines = result.stdout.strip().split('\n')
    if len(lines) >= 2:
        code = lines[-1].strip()
        print(f'Possible code: {code}')

# Alternative: check pm2 logs for the registration code
result2 = subprocess.run(
    ['pm2', 'logs', 'sinyaltender-backend', '--lines', '200', '--nostream'],
    capture_output=True, text=True, timeout=10
)
# Find resend warning which might contain the code
for line in result2.stdout.split('\n'):
    if 'verification' in line.lower() or 'code' in line.lower() or 'resend' in line.lower():
        print('LOG:', line.strip())
