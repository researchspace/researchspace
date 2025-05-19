/**
 * ResearchSpace
 * SPDX-FileCopyrightText: 2024, PHAROS: The International Consortium of Photo Archives
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */
package org.researchspace.services.info;

import com.fasterxml.jackson.annotation.JsonProperty;

public class ResourceInfoInputMapping {
    @JsonProperty("sparql_var")
    private String sparqlVar;
    
    @JsonProperty("local_var")
    private String localVar;

    @JsonProperty("constant")
    private String constant;

    public String getConstant() {
        return constant;
    }

    public void setConstant(String constant) {
        this.constant = constant;
    }

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
