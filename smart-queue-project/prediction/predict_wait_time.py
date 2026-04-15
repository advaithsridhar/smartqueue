import joblib

model = joblib.load(r"C:\Users\advai\Documents\smart-queue-project\model\queue_prediction_model.pkl")

crowd = 40
hour = 12
day = 2
service_time = 2

prediction = model.predict([[crowd,hour,day,service_time]])

print("Predicted waiting time:", prediction[0])