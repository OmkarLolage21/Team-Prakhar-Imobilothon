import pickle
import pandas as pd

with open("model/xgb_model_reduced.pkl", "rb") as f:
    model = pickle.load(f)

# sanity test
sample = pd.DataFrame([{
    'past_1h_occ': 0.8, 'dynamic_price': 50, 'past_3h_occ': 0.7, 'capacity': 100,
    'past_6h_occ': 0.6, 'base_price': 40, 'cluster_id': 3, 'traffic_index': 55,
    'weather_precip': 0.2, 'month': 11, 'forecast_precip_next1h': 0.3,
    'dayofweek': 2, 'hour': 17, 'weather_temp': 30, 'forecast_temp_next1h': 29,
    'is_holiday': 0, 'event_flag': 1, 'is_weekend': 0
}])
# Ensure the sample columns match model's training order
sample = sample[model.get_booster().feature_names]

pred = model.predict_proba(sample)[:,1]
print("Predicted probability slot is free:", pred[0])

