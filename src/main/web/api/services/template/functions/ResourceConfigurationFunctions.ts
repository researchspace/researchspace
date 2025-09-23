
import { Rdf } from "platform/api/rdf";
import { getResourceConfiguration, getResourceConfigurationValue } from "../../resource-config";
import { QueryContext } from "platform/api/sparql";
export const ResourceConfigurationFunctions = {
  
  getResourceConfigurationValue: function(iri:string, key:string) {   
    return getResourceConfigurationValue(iri, key);
  },

  getResourceConfiguration: function(iri:string) {       
    return getResourceConfiguration(Rdf.iri(iri),"default");
  }
};