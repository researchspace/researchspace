/**
 * ResearchSpace
 * Copyright (C) 2020, © Trustees of the British Museum
 * Copyright (C) 2015-2016, metaphacts GmbH
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.

 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */
package org.researchspace.api.dto.querytemplate;

import java.util.Optional;

import org.eclipse.rdf4j.model.IRI;
import org.eclipse.rdf4j.model.Value;
import org.researchspace.api.dto.base.DTOBase;
import org.researchspace.vocabulary.SPL;

/**
 * POJO representation of {@link SPL#ARGUMENT_CLASS}
 * 
 * @author jt
 *
 */
public class QueryArgument extends DTOBase {
    private static final long serialVersionUID = 274319120337754602L;

    /**
     * Default constructor
     */
    public QueryArgument(IRI id, String label, String description, String predicate, IRI valueType) {
        super(id, label, description);

        setPredicate(predicate);
        setValueType(valueType);
    }

    /**
     * holds {@link SPL#PREDICATE_PROPERTY}
     */
    private String predicate;
    /**
     * holds {@link SPL#VALUETYPE_PROPERTY}, usually any of the xsd:Datatype or
     * rdfs:Resource
     */
    private IRI valueType;
    /**
     * holds an inverse of {@link SPL#OPTIONAL_PROPERTY}
     */
    private boolean required = true;
    /**
     * holds {@link SPL#DEFAULT_VALUE_PROPERTY}
     */
    private Value defaultValue;

    public String getPredicate() {
        return predicate;
    }

    public void setPredicate(String predicate) {
        if (predicate == null || predicate.isEmpty())
            throw new IllegalArgumentException("A QueryArgument must have a predicate.");
        this.predicate = predicate;
    }

    public IRI getValueType() {
        return valueType;
    }

    public void setValueType(IRI valueType) {
        if (valueType == null)
            throw new IllegalArgumentException("A QueryArgument must have a valueType.");
        this.valueType = valueType;
    }

    /**
     * @return true by default
     */
    public boolean isRequired() {
        return required;
    }

    public void setRequired(boolean required) {
        this.required = required;
    }

    public Optional<Value> getDefaultValue() {
        return Optional.ofNullable(this.defaultValue);
    }

    public void setDefaultValue(Value defaultValue) {
        // TODO add datatype validation here
        this.defaultValue = defaultValue;
    }
}