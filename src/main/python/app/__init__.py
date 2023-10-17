from flask import Flask
from flask_cors import CORS

app = Flask(__name__)
#cors = CORS(app)
#app.config['CORS_HEADERS'] = 'Content-Type'
CORS(app, resources={r"/*": {"origins": "http://localhost:10215"}})

#Import all required routes from routes folder
from app.routes import delimited_file_upload_controller, recommend_images

@app.route('/')
# ‘/’ URL is bound with hello_world() function.
def hello_world():
    return 'Hello World'