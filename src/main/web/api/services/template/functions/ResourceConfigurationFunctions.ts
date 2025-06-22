
import { getResourceConfiguration } from "../../resource-config";
export const ResourceConfigurationFunctions = {
  
  getResourceConfigurationValue: function(iri:string, key:string) {   
    return getResourceConfiguration(iri, key);
  }
};