# Intel Engine Predictive Analysis Rules
from sqlalchemy import text
from config import Session
from notifier import send_alert
from datetime import datetime, timedelta

def check_predictive_indicators():
  """
  Analyzes historical logs for mechanical wear and continuous operations
  to issue predictive maintenance indicators.
  """
  session = Session()
  try:
    towers = session.execute(text('SELECT id, "siteCode" FROM "Tower"')).fetchall()
    
    for tower in towers:
      tower_id = tower[0]
      site_code = tower[1]
      
      # ----------------------------------------------------
      # PREDICTIVE RULE 1: POWER SWITCHING STRESS
      # Count changes in active power source over last 12 hours
      # ----------------------------------------------------
      twelve_hours_ago = datetime.utcnow() - timedelta(hours=12)
      telemetry_12h = session.execute(text('''
          SELECT timestamp, "gridPower", "solarPower", "generatorRunning"
          FROM "Telemetry"
          WHERE "towerId" = :tower_id AND timestamp >= :cutoff
          ORDER BY timestamp ASC
      '''), {"tower_id": tower_id, "cutoff": twelve_hours_ago}).fetchall()
      
      if len(telemetry_12h) > 5:
        switches = 0
        last_source = ""
        for row in telemetry_12h:
          grid = row[1]
          solar = row[2]
          gen = row[3]
          
          source = "GRID"
          if gen:
            source = "GENERATOR"
          elif solar > grid and solar > 0:
            source = "SOLAR"
            
          if last_source and source != last_source:
            switches += 1
          last_source = source
          
        if switches > 5:
          # Check active warning alert
          active_switch_alert = session.execute(text('''
              SELECT id FROM "Alert"
              WHERE "towerId" = :tower_id AND type = 'EQUIPMENT_FAIL' AND message LIKE '%Switching Stress%' AND "isAcknowledged" = false
              LIMIT 1
          '''), {"tower_id": tower_id}).fetchone()
          
          if not active_switch_alert:
            msg = (
                f"Predictive Maintenance: High power switching stress detected on "
                f"site {site_code} ({switches} source switches in 12h). "
                f"Increased relay mechanical wear. Investigate grid stability."
            )
            send_alert(tower_id, "EQUIPMENT_FAIL", "MEDIUM", msg)

      # ----------------------------------------------------
      # PREDICTIVE RULE 2: CONTINUOUS GENERATOR RUNTIME & DEPLETION FORECAST
      # Check if generator is active and predict time to fuel depletion
      # ----------------------------------------------------
      latest_5 = session.execute(text('''
          SELECT "generatorRunning"
          FROM "Telemetry"
          WHERE "towerId" = :tower_id
          ORDER BY timestamp DESC
          LIMIT 5
      '''), {"tower_id": tower_id}).fetchall()
      
      if len(latest_5) >= 5 and all(row[0] for row in latest_5):
        # Generator is running continuously
        active_run_alert = session.execute(text('''
            SELECT id FROM "Alert"
            WHERE "towerId" = :tower_id AND type = 'EQUIPMENT_FAIL' AND message LIKE '%generator runtime%' AND "isAcknowledged" = false
            LIMIT 1
        '''), {"tower_id": tower_id}).fetchone()
        
        if not active_run_alert:
          msg = (
              f"Generator Overrun Warning: Generator on site {site_code} has been "
              f"running continuously. High fuel draw active. Inspect grid restoration."
          )
          send_alert(tower_id, "EQUIPMENT_FAIL", "MEDIUM", msg)

      # Linear Regression depletion rate check
      telemetry_24h = session.execute(text('''
          SELECT timestamp, "fuelLevel", "generatorRunning"
          FROM "Telemetry"
          WHERE "towerId" = :tower_id AND timestamp >= :cutoff
          ORDER BY timestamp ASC
      '''), {"tower_id": tower_id, "cutoff": twelve_hours_ago}).fetchall() # Using twelve_hours_ago as cutoff is safe and high density

      gen_rows = [r for r in telemetry_24h if r[2]]
      if len(gen_rows) >= 3:
        first_pt = gen_rows[0]
        last_pt = gen_rows[-1]
        fuel_diff = float(first_pt[1]) - float(last_pt[1])
        # Calculate time diff in hours
        time_diff = (last_pt[0] - first_pt[0]).total_seconds() / 3600.0
        if time_diff > 0.1 and fuel_diff > 0.5:
          burn_rate = fuel_diff / time_diff # % fuel per hour
          current_fuel = float(last_pt[1])
          hours_left = current_fuel / burn_rate
          if hours_left < 24.0:
            active_low_fuel_alert = session.execute(text('''
                SELECT id FROM "Alert"
                WHERE "towerId" = :tower_id AND type = 'LOW_FUEL' AND "isAcknowledged" = false
                LIMIT 1
            '''), {"tower_id": tower_id}).fetchone()

            if not active_low_fuel_alert:
              msg = (
                  f"Predictive Low Fuel Alert: Generator is active on site {site_code} "
                  f"with a high burn rate of {burn_rate:.2f}%/hr. Projected fuel depletion "
                  f"in {hours_left:.1f} hours (under 24h threshold). Current fuel: {current_fuel:.1f}%. "
                  f"Schedule urgent diesel replenishment."
              )
              send_alert(tower_id, "LOW_FUEL", "CRITICAL", msg)

      # ----------------------------------------------------
      # PREDICTIVE RULE 3: SOLAR/BATTERY EFFICIENCY DEGRADATION
      # Check if peak solar generation in last 24h was unusually low
      # ----------------------------------------------------
      twenty_four_hours_ago = datetime.utcnow() - timedelta(hours=24)
      peak_solar = session.execute(text('''
          SELECT MAX("solarPower")
          FROM "Telemetry"
          WHERE "towerId" = :tower_id AND timestamp >= :cutoff
      '''), {"tower_id": tower_id, "cutoff": twenty_four_hours_ago}).fetchone()
      
      # We check if peak is under 2.5kW, assuming we have at least 10 readings to avoid false positives on fresh starts
      telemetry_count_24h = session.execute(text('''
          SELECT COUNT(id) FROM "Telemetry"
          WHERE "towerId" = :tower_id AND timestamp >= :cutoff
      '''), {"tower_id": tower_id, "cutoff": twenty_four_hours_ago}).fetchone()

      if telemetry_count_24h and telemetry_count_24h[0] > 100 and peak_solar and peak_solar[0] is not None and peak_solar[0] < 2.5:
        active_solar_alert = session.execute(text('''
            SELECT id FROM "Alert"
            WHERE "towerId" = :tower_id AND type = 'EQUIPMENT_FAIL' AND message LIKE '%Solar efficiency%' AND "isAcknowledged" = false
            LIMIT 1
        '''), {"tower_id": tower_id}).fetchone()
        
        if not active_solar_alert:
          msg = (
              f"Predictive Maintenance: Solar efficiency degradation detected on "
              f"site {site_code}. Peak solar yield dropped below 2.5kW threshold. "
              f"Schedule panel cleaning and battery cell inspection."
          )
          send_alert(tower_id, "EQUIPMENT_FAIL", "MEDIUM", msg)

      # ----------------------------------------------------
      # PREDICTIVE RULE 4: BATTERY STATE OF HEALTH (SoH) DEGRADATION
      # Check if latest battery SoH is below 85.0%
      # ----------------------------------------------------
      latest_telemetry = session.execute(text('''
          SELECT "batterySoH" FROM "Telemetry"
          WHERE "towerId" = :tower_id
          ORDER BY timestamp DESC
          LIMIT 1
      '''), {"tower_id": tower_id}).fetchone()

      if latest_telemetry and latest_telemetry[0] is not None:
        soh = float(latest_telemetry[0])
        if soh < 85.0:
          active_soh_alert = session.execute(text('''
              SELECT id FROM "Alert"
              WHERE "towerId" = :tower_id AND type = 'EQUIPMENT_FAIL' AND message LIKE '%Battery bank State of Health%' AND "isAcknowledged" = false
              LIMIT 1
          '''), {"tower_id": tower_id}).fetchone()

          if not active_soh_alert:
            msg = (
                f"Predictive Maintenance: Battery bank State of Health (SoH) degraded to {soh:.2f}% "
                f"on site {site_code} (under 85% critical replacement threshold). "
                f"Schedule battery cell diagnostic and replacement."
            )
            send_alert(tower_id, "EQUIPMENT_FAIL", "HIGH", msg)

      # ----------------------------------------------------
      # PREDICTIVE RULE 5: GENERATOR AIR FILTER MAINTENANCE
      # Sum generator active hours in the telemetry history
      # ----------------------------------------------------
      gen_run_records = session.execute(text('''
          SELECT COUNT(id) FROM "Telemetry"
          WHERE "towerId" = :tower_id AND "generatorRunning" = true
      '''), {"tower_id": tower_id}).fetchone()

      if gen_run_records and gen_run_records[0] is not None:
        cumulative_gen_hours = gen_run_records[0] * 2.0
        if cumulative_gen_hours > 250.0:
          active_filter_alert = session.execute(text('''
              SELECT id FROM "Alert"
              WHERE "towerId" = :tower_id AND type = 'EQUIPMENT_FAIL' AND message LIKE '%Air Filter maintenance%' AND "isAcknowledged" = false
              LIMIT 1
          '''), {"tower_id": tower_id}).fetchone()

          if not active_filter_alert:
            msg = (
                f"Predictive Maintenance: Generator runtime has reached {cumulative_gen_hours:.1f} hours "
                f"on site {site_code}. Air filter replacement and general servicing due (threshold: 250h)."
            )
            send_alert(tower_id, "EQUIPMENT_FAIL", "MEDIUM", msg)
          
  except Exception as e:
    print(f"[PREDICTIVE ERROR] Predictive check failed: {e}")
  finally:
    Session.remove()
