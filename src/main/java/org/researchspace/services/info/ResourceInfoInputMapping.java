package org.researchspace.services.info;

import com.fasterxml.jackson.annotation.JsonProperty;

public class ResourceInfoInputMapping {
    @JsonProperty("sparql_var")
    private String sparqlVar;
    
    @JsonProperty("local_var")
    private String localVar;

    public String getSparqlVar() {
        return sparqlVar;
    }

    public void setSparqlVar(String sparqlVar) {
        this.sparqlVar = sparqlVar;
    }

    public String getLocalVar() {
        return localVar;
    }

    public void setLocalVar(String localVar) {
        this.localVar = localVar;
    }
}
