from flask import Flask, jsonify, render_template, request
from flask_cors import CORS
import joblib
import datetime
import pandas as pd
from pymongo import MongoClient
import random
import threading
import time
import os


SAMPLE_LOCATIONS = [
    {
        "name": "Central Mall",
        "lat": 12.9716,
        "lng": 77.5946,
        "system_installed": True,
        "queues": ["Billing", "Customer Help", "Returns"]
    },
    {
        "name": "Airport Hub",
        "lat": 12.9941,
        "lng": 77.6606,
        "system_installed": False,
        "queues": ["Check-in", "Security", "Boarding"]
    },
    {
        "name": "City Hospital",
        "lat": 12.9279,
        "lng": 77.6271,
        "system_installed": True,
        "queues": ["OP Desk", "Lab", "Pharmacy"]
    }
]


def pick_location():
    return random.choice(SAMPLE_LOCATIONS)


def get_location_by_name(name):
    for location in SAMPLE_LOCATIONS:
        if location["name"] == name:
            return location
    return SAMPLE_LOCATIONS[0]


def background_simulation():
    while True:
        now = datetime.datetime.now()
        hour = now.hour
        day = now.weekday()
        location = pick_location()
        block = random.choice(location["queues"])
        crowd = generate_crowd(hour)
        service_time = 2

        input_data = pd.DataFrame(
            [[crowd, hour, day, service_time]],
            columns=["crowd_count", "hour", "day", "service_time"]
        )

        prediction = model.predict(input_data)
        minutes = int(prediction[0])

        collection.insert_one({
            "crowd": crowd,
            "date": now.strftime("%Y-%m-%d"),
            "day": day,
            "time": now.strftime("%H:%M"),
            "waiting_time": minutes,
            "location": location["name"],
            "block": block
        })

        time.sleep(30)


def generate_crowd(hour):
    if 6 <= hour < 10:
        return random.randint(10, 25)
    elif 10 <= hour < 16:
        return random.randint(20, 40)
    elif 16 <= hour < 21:
        return random.randint(40, 70)
    return random.randint(5, 15)


app = Flask(__name__, template_folder="templates")
CORS(app)

model = joblib.load(r"C:\Users\advai\Documents\smart-queue-project\model\queue_prediction_model.pkl")

client = MongoClient(
    "mongodb+srv://advaithy132_db_user:Adv3699%40%23@clusterqueue.zmd4ruu.mongodb.net/?retryWrites=true&w=majority"
)
db = client["smart_queue_db"]
collection = db["crowd_data"]


def template_context(page_name):
    return {
        "google_maps_api_key": os.environ.get("GOOGLE_MAPS_API_KEY", "AIzaSyAmJs8kREdkjT-D7-upeb1mZauX6ZXoFKw"),
        "page_name": page_name
    }


@app.route("/")
def dashboard():
    return render_template("dashboard.html", **template_context("home"))


@app.route("/place")
def place():
    location_name = request.args.get("location", SAMPLE_LOCATIONS[0]["name"])
    location = get_location_by_name(location_name)
    return render_template("place.html", location=location, **template_context("place"))


@app.route("/queue")
def queue():
    location_name = request.args.get("location", SAMPLE_LOCATIONS[0]["name"])
    block = request.args.get("block", get_location_by_name(location_name)["queues"][0])
    return render_template("queue.html", location_name=location_name, block=block, **template_context("queue"))


@app.route("/locations")
def locations():
    return jsonify(SAMPLE_LOCATIONS)


@app.route("/simulate")
def simulate():
    now = datetime.datetime.now()
    hour = now.hour
    day = now.weekday()
    location = pick_location()
    block = random.choice(location["queues"])
    crowd = generate_crowd(hour)
    service_time = 2

    input_data = pd.DataFrame(
        [[crowd, hour, day, service_time]],
        columns=["crowd_count", "hour", "day", "service_time"]
    )

    prediction = model.predict(input_data)
    minutes = int(prediction[0])

    collection.insert_one({
        "crowd": crowd,
        "hour": hour,
        "day": day,
        "time": now.strftime("%H:%M"),
        "waiting_time": minutes,
        "location": location["name"],
        "block": block
    })

    return jsonify({
        "crowd": crowd,
        "waiting_time": minutes
    })


@app.route("/history")
def history():
    data = list(collection.find().sort("_id", -1).limit(20))
    crowds = []
    times = []

    for item in data:
        crowds.append(item["crowd"])
        times.append(item.get("time", "--"))

    return jsonify({
        "crowd": crowds[::-1],
        "time": times[::-1]
    })


@app.route("/latest")
def latest():
    data = collection.find_one(sort=[("_id", -1)])

    if not data:
        return jsonify({
            "crowd": 0,
            "waiting_time": "0 min",
            "date": "--",
            "time": "--",
            "location": "--",
            "block": "--"
        })

    minutes = data["waiting_time"]
    hours = minutes // 60
    mins = minutes % 60

    if hours > 0:
        formatted = f"{hours} hr {mins} min"
    else:
        formatted = f"{mins} min"

    return jsonify({
        "crowd": data["crowd"],
        "date": data["date"],
        "time": data["time"],
        "waiting_time": formatted,
        "location": data.get("location", "--"),
        "block": data.get("block", "--")
    })


thread = threading.Thread(target=background_simulation)
thread.daemon = True
thread.start()

app.run(port=5000)
