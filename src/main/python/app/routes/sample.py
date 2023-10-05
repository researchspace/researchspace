from app import app


@app.route("/", methods = ["GET"])
def hello():
    return "Welcome to Research Space"


@app.route("/hello", methods = ["GET"])
def hellow():
    return "Hello World"