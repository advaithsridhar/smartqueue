import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.linear_model import LinearRegression
import joblib

# load dataset (fixed path)
data = pd.read_csv(r"C:\Users\advai\Documents\smart-queue-project\dataset\smart_queue_dataset.csv")

# input features
X = data[["crowd_count", "hour", "day", "service_time"]]

# output target
y = data["waiting_time"]

# split dataset
X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.2, random_state=42
)

# create model
model = LinearRegression()

# train model
model.fit(X_train, y_train)

# save model
joblib.dump(model, "queue_prediction_model.pkl")

print("Model trained and saved")