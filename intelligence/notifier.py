import requests
from config import BACKEND_URL

def send_alert(tower_id: str, alert_type: str, severity: str, message: str):
  """
  Sends a detected operational anomaly alert to the Node.js backend.
  """
  url = f"{BACKEND_URL}/api/alerts/internal"
  payload = {
      "towerId": tower_id,
      "type": alert_type,
      "severity": severity,
      "message": message
  }
  
  try:
      response = requests.post(url, json=payload, timeout=5)
      if response.status_code == 201:
          print(f"[NOTIFIER SUCCESS] Posted alert to backend: {alert_type} on site {tower_id}")
      else:
          print(f"[NOTIFIER ERROR] Backend returned {response.status_code}: {response.text}")
  except Exception as e:
      print(f"[NOTIFIER EXCEPTION] Failed to dispatch alert: {e}")
