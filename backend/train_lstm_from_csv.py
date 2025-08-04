import os
import sys
import django
import numpy as np
import pandas as pd
from sklearn.preprocessing import MinMaxScaler
from sklearn.model_selection import train_test_split
import joblib
from keras.models import Sequential
from keras.layers import LSTM, Dense, Dropout

# --------------------------------------------------
# Configuration Django
# --------------------------------------------------
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'vitarenta.settings')
django.setup()

# --------------------------------------------------
# Chargement des données
# --------------------------------------------------
csv_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'data', 'iot_dataset.csv')
print(f"Chemin du fichier CSV : {csv_path}")

if not os.path.exists(csv_path):
    print("❌ Le fichier CSV n'existe pas. Lancez d'abord : python generate_iot_dataset.py")
    sys.exit(1)

df = pd.read_csv(csv_path, encoding='ISO-8859-1', engine='python')
print(f"📊 Données chargées : {df.shape}")

# Tri chronologique par véhicule
df = df.sort_values(['vehicle_id', 'timestamp'])

# --------------------------------------------------
# Normalisation
# --------------------------------------------------
features = ['temperature', 'vibration', 'fuel_consumption', 'mileage', 'engine_hours', 'battery_health']
scaler = MinMaxScaler()
scaled_features = scaler.fit_transform(df[features])

# --------------------------------------------------
# Création des séquences temporelles
# --------------------------------------------------
sequence_length = 30

def create_sequences(data, seq_len):
    X, y = [], []
    for vid in df['vehicle_id'].unique():
        veh_data = data[df['vehicle_id'] == vid]
        for i in range(len(veh_data) - seq_len):
            X.append(veh_data[i:i + seq_len])
            y.append(veh_data[i + seq_len, [0, 1, 5]])  # Température, vibration, battery_health
    return np.array(X), np.array(y)

X, y = create_sequences(scaled_features, sequence_length)
print(f"✅ Séquences créées : X={X.shape}, y={y.shape}")

# --------------------------------------------------
# Fractionnement train / test
# --------------------------------------------------
X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.2, random_state=42
)

# --------------------------------------------------
# Construction du modèle LSTM
# --------------------------------------------------
model = Sequential([
    LSTM(50, return_sequences=True, input_shape=(X.shape[1], X.shape[2])),
    Dropout(0.2),
    LSTM(50),
    Dropout(0.2),
    Dense(3)  # 3 sorties pour température, vibration, battery_health
])
model.compile(optimizer='adam', loss='mse')

# --------------------------------------------------
# Entraînement
# --------------------------------------------------
print("🧠 Entraînement du modèle LSTM ...")
model.fit(
    X_train, y_train,
    epochs=20,
    batch_size=32,
    validation_data=(X_test, y_test),
    verbose=1
)

# --------------------------------------------------
# Sauvegarde
# --------------------------------------------------
model_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'ml_models')
os.makedirs(model_dir, exist_ok=True)

model_path = os.path.join(model_dir, 'lstm_model.h5')
scaler_path = os.path.join(model_dir, 'scaler.pkl')

model.save(model_path)
joblib.dump(scaler, scaler_path)

print(f"✅ Modèle sauvegardé : {model_path}")
print(f"✅ Scaler sauvegardé : {scaler_path}")
print("🎉 Entraînement terminé avec succès !")