from app import app
from flask import request, jsonify
from scripts.delimited_to_rdf import DelimitedToRDFConverter

@app.route("/filecolumns", methods = ["GET"])
def get_column_details():

    dataFileName = request.args.get('dataFileName')
    rdf = DelimitedToRDFConverter();
    column_names = rdf.get_headers(dataFileName)

    return column_names


@app.route("/generaterdf", methods = ["POST"])
def generate_rdf_file():

    # Get data from the POST request
    request_payload = request.json

    rdf = DelimitedToRDFConverter();
    rdf_file_status = rdf.create_rdf_file(request_payload.get('Delimited_File_Name'),
                                          request_payload.get('Unique_Id_Column'),
                                          request_payload.get('Unique_Id_Label_Column'))
    
    response_payload = { "Message": rdf_file_status }
    json_response_payload = jsonify(response_payload)

    return json_response_payload