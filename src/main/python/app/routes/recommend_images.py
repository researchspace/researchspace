from app import app
from flask import make_response, request, jsonify
import time
from scripts.clip_open_source import get_top_n_images
# import get_top_n_images from ../scripts/clip_open_source

@app.route("/recommend_images", methods = ["POST", "OPTIONS"])
def post_image_names():

    print("post images")
    if request.method == 'OPTIONS':
        response = make_response()
        response.headers.add('Access-Control-Allow-Methods', 'POST')
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type')
        return response

    # Get data from the POST request
    request_payload = request.json
    title = request_payload.get("title")
    # print
    print("title ")
    print(title)

    rec_images_result = get_top_n_images(terms_list=[title])
    print("recommended for "+title)
    print(rec_images_result)

    # Extract file names and sort them by probabilities in decreasing order
    key = next(iter(rec_images_result))
    file_tuple = [item[0].split('\\')[-1] for item in sorted(rec_images_result[key], key=lambda x: float(x[1]), reverse=True)]+['','']
    file_tuple = tuple(file_tuple)

    # file_tuple=tuple((i.strip().split("\\")[-1] for i in rec_images_result))
    print("file tuple")
    print(file_tuple)

    x = ["_file1.jpg","_file10.jpg","_file3.jpg"]
    y = [title+i for i in x]

    z = """PREFIX rsp: <http://www.researchspace.org/resource/>
            PREFIX rs: <http://www.researchspace.org/ontology/>
            PREFIX crm: <http://www.cidoc-crm.org/cidoc-crm/>
            select 
            distinct ?s_0 ?s ?o
            where {
            GRAPH ?graph1 {
                ?s_0 crm:P1_is_identified_by ?s .
            }
            GRAPH ?graph2 {
                ?s rs:PX_has_file_name ?o .
            }
            FILTER(?graph1 = <http://www.researchspace.org/assets/images> || ?graph1 = <http://www.researchspace.org/ns/data-updates-graph>)
            FILTER((REGEX(STR(?graph2), "^http://www.researchspace.org/resource/EX_File/"))) .
            FILTER(?o IN %s)
            }
            order by ?o""" % (file_tuple,)

    json_dict = {
                    "head" : {
                        "vars" : [ "query" ]
                    },
                    "results" : {
                        "bindings" : [ {
                            "query" : {
                                "datatype" : "http://www.w3.org/2001/XMLSchema#string",
                                "type" : "literal",
                                "value" : z
                            }
                        }, ]
                    }
                }

    return json_dict

@app.route("/recommend_images_get", methods = ["GET"])
def get_image_names():

    title="get"
    x = ["_file1.jpg","_file10.jpg","_file3.jpg"]
    y = [title+i for i in x]
    return y