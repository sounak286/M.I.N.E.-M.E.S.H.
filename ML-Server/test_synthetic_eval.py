import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "inference-service"))
from app import load_model, predict, PredictRequest

load_model()

print("--- TESTING CALIBRATED WINDOWS ---")

# 1. Physical resting node (quiet baseline)
normal_w = [[0.01, 0.01, 0.02, 5.0, 3.0, 1.5, 75.0, 26.0, 70.0]] * 32
res_normal = predict(PredictRequest(window=normal_w, reference_id="test_normal"))
print("Resting Node:", res_normal.anomaly_class, "Probs:", res_normal.class_probs, "Sev:", res_normal.severity, "Alert:", res_normal.alert_level)

# 2. Equipment vibration (heavy motor / cutting machine)
equip_w = [[0.01, 0.01, 0.45, 35.0, 3.0, 1.5, 75.0, 26.0, 70.0]] * 32
res_equip = predict(PredictRequest(window=equip_w, reference_id="test_equip"))
print("Equipment Noise:", res_equip.anomaly_class, "Probs:", res_equip.class_probs, "Sev:", res_equip.severity, "Alert:", res_equip.alert_level)

# 3. Subsidence precursor (tilt increase, crack opening, pore water pressure rise)
sub_w = [[1.8, 1.2, 0.08, 4.5, 9.5, 5.5, 85.0, 26.0, 70.0]] * 32
res_sub = predict(PredictRequest(window=sub_w, reference_id="test_sub"))
print("Subsidence Event:", res_sub.anomaly_class, "Probs:", res_sub.class_probs, "Sev:", res_sub.severity, "Alert:", res_sub.alert_level)
