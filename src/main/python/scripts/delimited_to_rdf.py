import os
import csv
import uuid
from flask import abort
from rdflib import Graph, Namespace, URIRef, Literal, RDF, RDFS

class DelimitedToRDFConverter:

    # Relative Path to the folders
    relativeDelimitedFileRootPath = "../../../runtime-data/file/Delimited_Data/"
    relativeRdfFileRootPath = '../../../runtime-data/file/RDF_Data/'

    # Define namespaces
    crm = Namespace("http://www.cidoc-crm.org/cidoc-crm/")
    ns = Namespace("http://www.researchspace.org/")


    def get_headers(self, dataFileName):

        dataFilePath = self.get_absolute_path(self.relativeDelimitedFileRootPath) + '/' + dataFileName

        with open(dataFilePath, 'r', encoding='utf-8') as data:
            dataLines = csv.DictReader(data)
            headers = dataLines.fieldnames

        return headers

    def create_rdf_file(self, dataFileName, unique_id_col, unique_id_label_col):
        try:
           
            # Input File Path
            delimitedFilePath = self.get_absolute_path(self.relativeDelimitedFileRootPath) + '/' + dataFileName
            
            # Output file paths
            outputRdfFileName = dataFileName.split('.')[0] + '.ttl'
            outputRdfFilePath = self.get_absolute_path(self.relativeRdfFileRootPath) + '/' + outputRdfFileName

            # Ensure the directory for the RDF file exists, and create it if necessary
            os.makedirs(os.path.dirname(outputRdfFilePath), exist_ok=True)

            # Create an RDF graph
            g = Graph()
    
            # Open and read the CSV file
            with open(delimitedFilePath, 'r', encoding='utf-8') as csvfile:
                reader = csv.DictReader(csvfile, delimiter=",", quotechar='"')
                for row in reader:

                    # Get the Unique_Identifier and Unique_Identifier_Label values from the CSV
                    if not unique_id_col:
                        entity_id = URIRef(self.ns + self.transform_data(unique_id_label_col) + '/' + str(uuid.uuid4()))
                    else:
                        entity_id = URIRef(self.ns + self.transform_data(unique_id_label_col) + '/' + row.get(unique_id_col, str(uuid.uuid4())))
                        
                    entity_label = Literal(row[unique_id_label_col])
    
                    # Create RDF triples for the entity
                    g.add((entity_id, RDF.type, self.crm.E1_CRM_Entity))
                    g.add((entity_id, RDFS.label, entity_label))
    
                    # Create RDF triples for each has_note property
                    for key, value in row.items():
                        if key not in [unique_id_col, unique_id_label_col]:
                            appellation_id = URIRef(str(entity_id) + '/' + key + '/' + str(uuid.uuid4()))
                            appellation_type = Literal(key)
                            appellation_content = Literal(value)
                            g.add((entity_id, self.crm.P3_has_note, appellation_id))
                            g.add((appellation_id, RDF.type, self.crm.E41_Appellation))
                            g.add((appellation_id, self.crm.P2_has_type, appellation_type))
                            g.add((appellation_id, self.crm.P190_has_symbolic_content, appellation_content))
            
            # Serialize the RDF graph to TTL format and save it as a file for archival
            g.serialize(destination=outputRdfFilePath, format='turtle', encoding='utf-8')

            # Serialize the RDF graph to TTL format
            rdf_data = g.serialize(format='turtle', encoding='utf-8')

            return rdf_data
        
        except FileNotFoundError as e:
            abort(404, description="The specified file " + dataFileName + " was not found: " + str(e))
        except Exception as e:
            abort(500, description="An unexpected error occurred: " + str(e))

    def transform_data(self, string):
        
        # Split the string by whitespace and capitalize each word
        words = string.split()
        capitalized_words = [word.capitalize() for word in words]

        # Join the capitalized words without spaces
        camel_case_string = ''.join(capitalized_words)

        # Make the first letter lowercase
        camel_case_string = camel_case_string[0].lower() + camel_case_string[1:]

        return camel_case_string
    
    def get_absolute_path(self, string):

        current_dir = os.path.dirname(os.path.abspath(__name__))
        abs_apth = os.path.normpath(os.path.join(current_dir, string))

        return abs_apth
    