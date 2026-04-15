import pandas as pd

data = pd.read_csv("smart_queue_dataset.csv")

print(data.head())
print("\nDataset shape:", data.shape)