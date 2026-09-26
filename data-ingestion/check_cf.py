import os
import requests
from dotenv import load_dotenv

load_dotenv()

ACCOUNT_ID = os.getenv('CLOUDFLARE_ACCOUNT_ID')
API_TOKEN = os.getenv('CLOUDFLARE_API_TOKEN')

print(f"Checking credentials for Account: {ACCOUNT_ID}")

url = f"https://api.cloudflare.com/client/v4/accounts/{ACCOUNT_ID}/vectorize/v2/indexes"
headers = {"Authorization": f"Bearer {API_TOKEN}"}

try:
    response = requests.get(url, headers=headers)
    if response.status_code == 200:
        print("✅ API Token is VALID!")
        indexes = response.json().get('result', [])
        print(f"Found {len(indexes)} indexes:")
        for idx in indexes:
            print(f" - {idx['name']} (Dimensions: {idx['config']['dimensions']})")
    else:
        print(f"❌ API Token check failed: {response.status_code} - {response.text}")
except Exception as e:
    print(f"❌ Error: {str(e)}")
