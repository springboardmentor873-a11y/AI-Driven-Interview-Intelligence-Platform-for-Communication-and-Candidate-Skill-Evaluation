import requests

BASE_URL = "http://127.0.0.1:8000"

def test_endpoint(method, path):
    try:
        response = requests.request(
            method,
            BASE_URL + path,
            timeout=10
        )
        print(f"{method:6} {path:35} Status: {response.status_code}")
        return response
    except requests.RequestException as error:
        print(f"FAILED: {error}")
        return None

print("\n=== SmartHire AI API Tests ===")

test_endpoint("GET", "/")
test_endpoint("GET", "/health")

# These protected endpoints should reject requests without authentication.
test_endpoint("GET", "/recruiter/sessions")
test_endpoint("POST", "/recruiter/sessions")

print("\n=== Tests completed ===")
