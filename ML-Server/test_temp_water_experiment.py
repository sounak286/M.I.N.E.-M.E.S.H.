import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "inference-service"))
from app import load_model, predict, PredictRequest

load_model()

print("\n--- EXPERIMENT: WHAT HAPPENS WHEN TEMPERATURE & WATER LEVEL INCREASE? ---")

# Normal quiet baseline
baseline_w = [[0.01, 0.01, 0.02, 5.0, 3.0, 1.5, 75.0, 26.0, 70.0]] * 32
res_base = predict(PredictRequest(window=baseline_w, reference_id="baseline"))
print(f"1. Baseline Normal:        Class={res_base.anomaly_class:15} Probs={res_base.class_probs} Severity={res_base.severity:.3f} Alert={res_base.alert_level}")

# Experiment A: Water level increases significantly (e.g. from 1.5cm to 6.5cm - simulated pore pressure rise / flood)
water_rise_w = [[0.01, 0.01, 0.02, 5.0, 3.0, 6.5, 75.0, 26.0, 70.0]] * 32
res_water = predict(PredictRequest(window=water_rise_w, reference_id="water_rise"))
print(f"2. High Water Level:       Class={res_water.anomaly_class:15} Probs={res_water.class_probs} Severity={res_water.severity:.3f} Alert={res_water.alert_level}")

# Experiment B: Temperature increases (e.g. from 26°C to 45°C)
temp_rise_w = [[0.01, 0.01, 0.02, 5.0, 3.0, 1.5, 75.0, 45.0, 70.0]] * 32
res_temp = predict(PredictRequest(window=temp_rise_w, reference_id="temp_rise"))
print(f"3. High Temperature:       Class={res_temp.anomaly_class:15} Probs={res_temp.class_probs} Severity={res_temp.severity:.3f} Alert={res_temp.alert_level}")

# Experiment C: Both Temperature (40°C) AND Water Level (7.0cm) increase
both_rise_w = [[0.01, 0.01, 0.02, 5.0, 3.0, 7.0, 75.0, 40.0, 70.0]] * 32
res_both = predict(PredictRequest(window=both_rise_w, reference_id="both_rise"))
print(f"4. High Temp + High Water: Class={res_both.anomaly_class:15} Probs={res_both.class_probs} Severity={res_both.severity:.3f} Alert={res_both.alert_level}")

# Experiment D: Progressive water inrush and strata tilt (geotechnical subsidence precursor)
progressive_w = []
for i in range(32):
    t_val = 26.0 + (i / 31.0) * 12.0      # Temp rising 26 -> 38°C
    w_val = 1.5 + (i / 31.0) * 6.0       # Water rising 1.5 -> 7.5cm
    tilt_val = 0.02 + (i / 31.0) * 1.5   # Tilt rising 0.02 -> 1.52°
    progressive_w.append([tilt_val, tilt_val * 0.8, 0.06, 5.0, 5.5, w_val, 80.0, t_val, 72.0])
res_prog = predict(PredictRequest(window=progressive_w, reference_id="progressive"))
print(f"5. Progressive Inrush+Tilt: Class={res_prog.anomaly_class:15} Probs={res_prog.class_probs} Severity={res_prog.severity:.3f} Alert={res_prog.alert_level}")
