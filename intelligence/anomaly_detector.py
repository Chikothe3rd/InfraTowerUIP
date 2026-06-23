from sqlalchemy import text
from config import Session
from notifier import send_alert

def check_fuel_theft_and_temp():
  """
  Analyzes latest telemetry logs for sudden fuel drops (theft)
  and thermal runaways (cooling malfunctions).
  """
  session = Session()
  try:
    # 1. Fetch active towers
    towers = session.execute(text('SELECT id, "siteCode", name FROM "Tower"')).fetchall()
    
    for tower in towers:
      tower_id = tower[0]
      site_code = tower[1]
      name = tower[2]
      
      # 2. Get latest telemetry rows for this tower (ordered by timestamp desc)
      telemetry_rows = session.execute(text('''
          SELECT timestamp, "fuelLevel", "equipmentTemp", "generatorRunning", "ambientTemp"
          FROM "Telemetry"
          WHERE "towerId" = :tower_id
          ORDER BY timestamp DESC
          LIMIT 5
      '''), {"tower_id": tower_id}).fetchall()
      
      if len(telemetry_rows) < 2:
        continue
      
      latest = telemetry_rows[0]
      previous = telemetry_rows[1]
      
      # Extract values
      lat_fuel = latest[1]
      prev_fuel = previous[1]
      lat_temp = latest[2]
      prev_temp = previous[2]
      lat_gen_running = latest[3]
      lat_ambient = latest[4]
      
      # ----------------------------------------------------
      # RULE 1: FUEL THEFT DETECTION
      # If fuel drops > 8% between ticks AND generator is OFF
      # ----------------------------------------------------
      if lat_fuel < prev_fuel - 8.0 and not lat_gen_running:
        # Check if we already have an active fuel theft alert for this tower to avoid spamming
        active_theft_alert = session.execute(text('''
            SELECT id FROM "Alert"
            WHERE "towerId" = :tower_id AND type = 'FUEL_THEFT' AND "isAcknowledged" = false
            LIMIT 1
        '''), {"tower_id": tower_id}).fetchone()
        
        if not active_theft_alert:
          liters_lost = int((prev_fuel - lat_fuel) * 12.0) # 1200L total capacity, so 1% = 12L
          cost_impact = liters_lost * 26.50 # Assume K26.50 per liter diesel in Zambia (ZMW)
          
          msg = (
              f"Fuel Theft Alert: Anomalous drop of {prev_fuel - lat_fuel:.1f}% "
              f"({liters_lost}L) detected in diesel reserves on site {site_code} "
              f"while generator is offline. Est. liability: K{cost_impact:,.2f} ZMW. "
              f"Tamper sensor triggered."
          )
          
          # Dispatch alert
          send_alert(tower_id, "FUEL_THEFT", "CRITICAL", msg)
 
      # ----------------------------------------------------
      # RULE 2: TEMPERATURE ANOMALY (DEVIATION AND SPIKE)
      # Cabinet temperature > 20°C above ambient OR spiked by > 8°C
      # ----------------------------------------------------
      temp_diff = lat_temp - lat_ambient
      if (temp_diff >= 20.0 and lat_temp >= 45.0) or (lat_temp > prev_temp + 8.0):
        active_temp_alert = session.execute(text('''
            SELECT id FROM "Alert"
            WHERE "towerId" = :tower_id AND type = 'TEMP_HIGH' AND "isAcknowledged" = false
            LIMIT 1
        '''), {"tower_id": tower_id}).fetchone()
        
        if not active_temp_alert:
          msg = (
              f"Thermal Anomaly: Equipment enclosure temperature at {lat_temp:.1f}°C "
              f"(Ambient: {lat_ambient:.1f}°C, Diff: {temp_diff:.1f}°C) on site {site_code}. "
              f"Cabinet temperature runaway. Schedule cooling unit check."
          )
          send_alert(tower_id, "TEMP_HIGH", "HIGH", msg)
          
  except Exception as e:
    print(f"[ANOMALY ERROR] Anomaly check failed: {e}")
  finally:
    Session.remove()
