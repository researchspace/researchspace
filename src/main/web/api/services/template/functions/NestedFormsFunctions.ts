
import { Rdf } from "platform/api/rdf";
import { getObservedEntity, getPrimaryAppellation} from "../../resource-util";
export const NestedFormsFunctions = {  
  
  getParentResourcePrimaryLabel: function(iri:string) {   
    return getPrimaryAppellation(Rdf.iri(iri));
  },

  getParentObservedEntity: function(iri:string) {       
    return getObservedEntity(Rdf.iri(iri));
  }
};