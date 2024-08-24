package org.researchspace.services.info;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import org.eclipse.rdf4j.model.IRI;
import org.eclipse.rdf4j.model.ValueFactory;
import org.eclipse.rdf4j.model.impl.SimpleValueFactory;

import com.fasterxml.jackson.annotation.JsonProperty;

public class ResourceInfoProfileField {
    protected String subject;
    protected List<ResourceInfoInputMapping> returns;
    protected String label;
    protected Map<IRI, ResourceInfoProfileField> fields;
    protected List<ResourceInfoInputMapping> params;
    protected IRI fieldIri;

    public String getSubject() {
        return subject;
    }

    public void setSubject(String subject) {
        this.subject = subject;
    }

    public List<ResourceInfoInputMapping> getReturns() {
        return returns;
    }

    public void setReturns(List<ResourceInfoInputMapping> returns) {
        this.returns = returns;
    }

    public String getLabel() {
        return label;
    }

    public void setLabel(String label) {
        this.label = label;
    }

    public List<ResourceInfoInputMapping> getParams() {
        return params;
    }

    public void setParams(List<ResourceInfoInputMapping> params) {
        this.params = params;
    }

    @JsonProperty("fields")
    public void setFields(Map<String, ResourceInfoProfileField> rawFields) {
        if (rawFields != null) {
            this.fields = new HashMap<>();
            ValueFactory vf = SimpleValueFactory.getInstance();
            for (Map.Entry<String, ResourceInfoProfileField> entry : rawFields.entrySet()) {
                IRI iri = vf.createIRI(entry.getKey());
                entry.getValue().fieldIri = iri;
                fields.put(iri, entry.getValue());
            }
        }
    }

    public Map<IRI, ResourceInfoProfileField> getFields() {
        return fields;
    }

    public IRI getFieldIri() {
        return fieldIri;
    }
}
