from app import app
from flask import request, jsonify, Response
import io
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
    # print(request_payload)
    rdf = DelimitedToRDFConverter();
    rdf_data = rdf.create_rdf_file(request_payload.get('Delimited_File_Name'),
                                          request_payload.get('Unique_Id_Column'),
                                          request_payload.get('Unique_Id_Label_Column'),
                                          request_payload.get('Mapped_Columns_Array'))
    rdf_file_name = request_payload.get('Delimited_File_Name').split('.')[0] + '.ttl'

    # Create a file-like object from RDF data
    rdf_file = io.BytesIO(rdf_data)

    # Set response headers to simulate a file upload
    response_payload = Response(
        rdf_file,
        content_type='text/turtle',
        headers={
            'Content-Disposition': 'attachment; filename=' + rdf_file_name,
            'Content-Length': len(rdf_data)  # Provide the length of the data
        }
    )
    return response_payload