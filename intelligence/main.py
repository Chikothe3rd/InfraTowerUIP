import sys
import os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import time
from apscheduler.schedulers.blocking import BlockingScheduler
from anomaly_detector import check_fuel_theft_and_temp
from predictive_engine import check_predictive_indicators
from sla_calculator import calculate_rolling_sla

def run_immediate_evaluations():
  print("==================================================")
  print("INFRATEL Intelligence Service Bootstrapped")
  print("Executing initial diagnostic sweeps...")
  print("==================================================")
  
  # Run evaluations once immediately on start
  check_fuel_theft_and_temp()
  check_predictive_indicators()
  calculate_rolling_sla()
  
  print("Diagnostic sweeps completed. Scheduler running...")

if __name__ == "__main__":
  # Run immediate sweep
  time.sleep(2)  # brief sleep to let DB container fully wake up and migrate
  run_immediate_evaluations()

  scheduler = BlockingScheduler()

  # 1. Check anomalies (thefts & thermal runs) every 30 seconds
  scheduler.add_job(check_fuel_theft_and_temp, 'interval', seconds=30, id='anomaly_job')

  # 2. Check predictive maintenance alerts every 60 seconds
  scheduler.add_job(check_predictive_indicators, 'interval', seconds=60, id='predictive_job')

  # 3. Calculate rolling SLA percentages every 5 minutes
  scheduler.add_job(calculate_rolling_sla, 'interval', minutes=5, id='sla_job')

  try:
    scheduler.start()
  except (KeyboardInterrupt, SystemExit):
    print("Intelligence Service shutting down...")
