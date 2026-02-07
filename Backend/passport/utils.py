import requests

def send_otp(
    country: str, phone: str, project_id: str, message_type: str, key: str
) -> dict:
    url = "https://sendotp-47lvvvrp4a-uc.a.run.app"
    headers = {"Content-Type": "application/json", "key": key}
    data = {
        "country": country,
        "phone": phone,
        "projectId": project_id,
        "type": message_type,
    }

    try:
        resp = requests.post(url, json=data, headers=headers, timeout=10)
    except requests.exceptions.RequestException:
        return {
            "status": "Error",
            "http_status": None,  
            "message": "OTP provider is temporarily unavailable",
        }  

    if resp.status_code == 429:
        return {
            "status": "Error",
            "http_status": resp.status_code,
            "message": "Too many OTP requests, please try again later.",
        }  

    if not 200 <= resp.status_code < 300:
        return {
            "status": "Error",
            "http_status": resp.status_code,
            "message": "OTP provider returned an error.",
        }  

    try:
        body = resp.json()
    except ValueError:
        body = {}

    return {
        "status": "Success",
        "http_status": resp.status_code,
        "message": body.get("success"),
    }


import requests


def verify_otp(country: str, phone: str, project_id: str, otp: str, key: str) -> dict:
    """
    Verifies an OTP for a given phone number and project ID.
    """
    url = "https://verifyotp-47lvvvrp4a-uc.a.run.app"
    headers = {"Content-Type": "application/json", "key": key}
    data = {"country": country, "phone": phone, "projectId": project_id, "otp": otp}

    try:
        resp = requests.post(url, json=data, headers=headers, timeout=10)
    except requests.exceptions.RequestException:
        return {
            "status": "Error",
            "http_status": None,
            "message": "OTP verification service is temporarily unavailable",
        }

    if resp.status_code == 429:
        return {
            "status": "Error",
            "http_status": resp.status_code,
            "message": "Too many verification requests, please try again later.",
        }

    if not 200 <= resp.status_code < 300:
        return {
            "status": "Error",
            "http_status": resp.status_code,
            "message": "OTP verification failed.",
        }

    

    return {
        "status": "Success",
        "http_status": resp.status_code,
        "message": "OTP verified successfully",
    }
