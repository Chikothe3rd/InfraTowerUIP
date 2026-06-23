from sqlalchemy import text
from config import Session
from notifier import send_alert

def calculate_rolling_sla():
  """
  Calculates rolling SLA compliance percentages for all towers.
  Dispatches SLA_BREACH alerts if values fall below 99.50%.
  """
  session = Session()
  try:
    towers = session.execute(text('SELECT id, "siteCode" FROM "Tower"')).fetchall()
    
    for tower in towers:
      tower_id = tower[0]
      site_code = tower[1]
      
      # 1. Fetch total count of telemetry records
      total_records = session.execute(text('''
          SELECT COUNT(*) FROM "Telemetry" WHERE "towerId" = :tower_id
      '''), {"tower_id": tower_id}).scalar()
      
      if not total_records or total_records == 0:
        continue
      
      # 2. Fetch records where power status was active (uptime)
      online_records = session.execute(text('''
          SELECT COUNT(*) FROM "Telemetry"
          WHERE "towerId" = :tower_id
            AND ("gridPower" > 0 OR "solarPower" > 0 OR "generatorRunning" = true)
      '''), {"tower_id": tower_id}).scalar()
      
      sla = (online_records / total_records) * 100
      
      # 3. If SLA target breached, raise alert
      if sla < 99.50:
        active_sla_alert = session.execute(text('''
            SELECT id FROM "Alert"
            WHERE "towerId" = :tower_id AND type = 'SLA_BREACH' AND "isAcknowledged" = false
            LIMIT 1
        '''), {"tower_id": tower_id}).fetchone()
        
        if not active_sla_alert:
          downtime_pct = 100.0 - sla
          msg = (
              f"SLA Compliance Breach: Rolling site availability has fallen to {sla:.2f}% "
              f"(target: 99.50%). Accumulated downtime: {downtime_pct:.2f}% of monitored timeframe. "
              f"Est. commercial penalty liability initiated."
          )
          send_alert(tower_id, "SLA_BREACH", "HIGH", msg)
          
  except Exception as e:
    print(f"[SLA ERROR] SLA calculation failed: {e}")
  finally:
    Session.remove()
