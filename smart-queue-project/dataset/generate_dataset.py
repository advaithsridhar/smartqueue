import pandas as pd
import numpy as np

rows = 5000
data = []

for i in range(rows):

    # hour of day (8 AM to 8 PM)
    hour = np.random.randint(8, 20)

    # day of week (0 = Monday, 6 = Sunday)
    day = np.random.randint(0, 7)

    # base crowd level
    crowd = np.random.randint(5, 25)

    # simulate lunch rush
    if 11 <= hour <= 14:
        crowd += np.random.randint(20, 50)

    # simulate evening rush
    if 17 <= hour <= 19:
        crowd += np.random.randint(15, 40)

    # weekends more crowd
    if day >= 5:
        crowd += np.random.randint(10, 30)

    # service time per person (minutes)
    service_time = np.random.uniform(1.5, 3)

    # waiting time formula
    waiting_time = crowd * service_time

    data.append([crowd, hour, day, service_time, waiting_time])

df = pd.DataFrame(data, columns=[
    "crowd_count",
    "hour",
    "day",
    "service_time",
    "waiting_time"
])

df.to_csv("smart_queue_dataset.csv", index=False)

print("5000-row realistic dataset created successfully")