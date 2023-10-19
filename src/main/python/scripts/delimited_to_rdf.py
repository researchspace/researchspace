import os
import csv
import uuid
from flask import abort
import urllib.parse
from rdflib import Graph, Namespace, URIRef, Literal, RDF, RDFS

class DelimitedToRDFConverter:

    def __init__(self):

        # Define namespaces
        self.ns = Namespace("http://www.researchspace.org/")
        self.crm = Namespace("http://www.cidoc-crm.org/cidoc-crm/")
        
        self.distinct_values_url = {
            'Annotation': {},
            'German Translation': {},
            'Italian Translation': {},
            'English Translation': {},
            'Category': {},
            'Volume': {},
            'Author and Fragment': {},
            'Literature': {}
        }

        self.literature_url = 'https://www.jstor.org/action/doBasicSearch?Query='
        self.sample_image_url = 'http://localhost:10214/digilib/img/digilib-notfound.png'

        # Relative Path to the folders
        self.relativeDelimitedFileRootPath = "../../../runtime-data/file/Delimited_Data/"
        self.relativeRdfFileRootPath = '../../../runtime-data/file/RDF_Data/'

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
    
    def encode_search_url(self,string):

        encoded_search_term = urllib.parse.quote(string)
        encoded_url = self.literature_url + encoded_search_term
        return encoded_url

    def generate_distinct_urls(self, unique_id_label_col, column_name, value):
        
        if value in self.distinct_values_url[column_name]:
            return self.distinct_values_url[column_name][value]
        url = URIRef(self.ns + self.transform_data(unique_id_label_col) + '/' + self.transform_data(column_name) + '/' + str(uuid.uuid4()))
        self.distinct_values_url[column_name][value] = url

        return url
    
    def get_headers(self, dataFileName):

        dataFilePath = self.get_absolute_path(self.relativeDelimitedFileRootPath) + '/' + dataFileName

        with open(dataFilePath, 'r', encoding='utf-8') as data:
            dataLines = csv.DictReader(data, delimiter="|", quotechar='"')
            headers = dataLines.fieldnames

        return headers

    def create_rdf_file(self, dataFileName, unique_id_col, unique_id_label_col, mapped_columns):
        try:
            
            if unique_id_col in mapped_columns:
                mapped_columns.remove(unique_id_col)
            
            if unique_id_label_col in mapped_columns:
                mapped_columns.remove(unique_id_label_col)
            
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
                reader = csv.DictReader(csvfile, delimiter="|", quotechar='"')
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
                        if (key not in [unique_id_col, unique_id_label_col] and value) and key in mapped_columns:

                            if key == 'Pictures':
                                g.add(entity_id, self.crm.P138i_has_representation, URIRef(self.sample_image_url))

                            elif key == 'Literature':
                                exploded_column_values = value.split(';')

                                for single_value in exploded_column_values:

                                    if (single_value not in self.distinct_values_url[key]):

                                        url = self.encode_search_url(single_value)
                                        appellation_id = self.generate_distinct_urls(unique_id_label_col, key, url)
                                        appellation_type = Literal(key)
                                        appellation_content = Literal(single_value)

                                        g.add((entity_id, self.crm.P3_has_note, appellation_id))
                                        g.add((appellation_id, RDF.type, self.crm.E41_Appellation))
                                        g.add((appellation_id, self.crm.P2_has_type, appellation_type))
                                        g.add((appellation_id, self.crm.P190_has_symbolic_content, appellation_content))
                                        g.add((appellation_id, self.crm.P70i_is_documented_in, URIRef(url)))
                                    
                                    else:
                                        appellation_id = self.distinct_values_url[key][single_value]
                                        g.add((entity_id, self.crm.P3_has_note, appellation_id))
                            else:

                                exploded_column_values = value.split(';')

                                for single_value in exploded_column_values:

                                    if (single_value not in self.distinct_values_url[key]):

                                        appellation_id = self.generate_distinct_urls(unique_id_label_col, key, single_value)
                                        appellation_type = Literal(key)
                                        appellation_content = Literal(single_value)

                                        # print(entity_id, self.crm.P3_has_note, appellation_id)
                                        g.add((entity_id, self.crm.P3_has_note, appellation_id))
                                        g.add((appellation_id, RDF.type, self.crm.E41_Appellation))
                                        g.add((appellation_id, self.crm.P2_has_type, appellation_type))
                                        g.add((appellation_id, self.crm.P190_has_symbolic_content, appellation_content))
                                    
                                    else:
                                        appellation_id = self.distinct_values_url[key][single_value]
                                        g.add((entity_id, self.crm.P3_has_note, appellation_id))
                                

            
            # Serialize the RDF graph to TTL format and save it as a file for archival
            g.serialize(destination=outputRdfFilePath, format='turtle', encoding='utf-8')

            # Serialize the RDF graph to TTL format
            rdf_data = g.serialize(format='turtle', encoding='utf-8')

            return rdf_data
        
        except FileNotFoundError as e:
            print(str(e))
            abort(404, description="The specified file " + dataFileName + " was not found: " + str(e))
        except Exception as e:
            print(str(e))
            abort(500, description="An unexpected error occurred: " + str(e))


# obj = DelimitedToRDFConverter()

# print(obj.create_rdf_file('Sample_Data_Extract.csv', 'ID', 'Term', ['Annotation','German Translation','Italian Translation','English Translation','Category','Volume','Author and Fragment','Literature','Pictures']))