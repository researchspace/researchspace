/**
 * ResearchSpace
 * Copyright (C) 2020, © Trustees of the British Museum
 * Copyright (C) 2015-2019, metaphacts GmbH
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

package org.researchspace.services.fields;

import org.eclipse.rdf4j.model.IRI;
import org.eclipse.rdf4j.model.Literal;
import org.eclipse.rdf4j.model.Value;

import javax.annotation.Nullable;
import java.util.HashSet;
import java.util.Set;

public final class FieldDefinition {
    private IRI iri;

    @Nullable
    private Literal description;

    @Nullable
    private Literal minOccurs;

    @Nullable
    private Literal maxOccurs;

    @Nullable
    private IRI xsdDatatype;

    private Set<IRI> domain = new HashSet<>();

    private Set<IRI> range = new HashSet<>();

    private Set<Value> defaultValues = new HashSet<>();

    @Nullable
    private String selectPattern;

    @Nullable
    private String insertPattern;

    @Nullable
    private String deletePattern;

    @Nullable
    private String askPattern;

    @Nullable
    private String autosuggestionPattern;

    @Nullable
    private String valueSetPattern;

    @Nullable
    private String treePatterns;

    public IRI getIri() {
        return iri;
    }

    public void setIri(IRI iri) {
        this.iri = iri;
    }

    @Nullable
    public Literal getDescription() {
        return description;
    }

    public void setDescription(@Nullable Literal description) {
        this.description = description;
    }

    public Literal getMinOccurs() {
        return minOccurs;
    }

    public void setMinOccurs(Literal minOccurs) {
        this.minOccurs = minOccurs;
    }

    public Literal getMaxOccurs() {
        return maxOccurs;
    }

    public void setMaxOccurs(Literal maxOccurs) {
        this.maxOccurs = maxOccurs;
    }

    @Nullable
    public IRI getXsdDatatype() {
        return xsdDatatype;
    }

    public void setXsdDatatype(@Nullable IRI xsdDatatype) {
        this.xsdDatatype = xsdDatatype;
    }

    public Set<IRI> getDomain() {
        return domain;
    }

    public void setDomain(Set<IRI> domain) {
        this.domain = domain;
    }

    public Set<IRI> getRange() {
        return range;
    }

    public void setRange(Set<IRI> range) {
        this.range = range;
    }

    public Set<Value> getDefaultValues() {
        return defaultValues;
    }

    public void setDefaultValues(Set<Value> defaultValues) {
        this.defaultValues = defaultValues;
    }

    public String getInsertPattern() {
        return insertPattern;
    }

    public void setInsertPattern(String insertPattern) {
        this.insertPattern = insertPattern;
    }

    @Nullable
    public String getSelectPattern() {
        return selectPattern;
    }

    public void setSelectPattern(@Nullable String selectPattern) {
        this.selectPattern = selectPattern;
    }

    @Nullable
    public String getDeletePattern() {
        return deletePattern;
    }

    public void setDeletePattern(@Nullable String deletePattern) {
        this.deletePattern = deletePattern;
    }

    @Nullable
    public String getAskPattern() {
        return askPattern;
    }

    public void setAskPattern(@Nullable String askPattern) {
        this.askPattern = askPattern;
    }

    @Nullable
    public String getAutosuggestionPattern() {
        return autosuggestionPattern;
    }

    public void setAutosuggestionPattern(@Nullable String autosuggestionPattern) {
        this.autosuggestionPattern = autosuggestionPattern;
    }

    @Nullable
    public String getValueSetPattern() {
        return valueSetPattern;
    }

    public void setValueSetPattern(@Nullable String valueSetPattern) {
        this.valueSetPattern = valueSetPattern;
    }

    @Nullable
    public String getTreePatterns() {
        return treePatterns;
    }

    public void setTreePatterns(@Nullable String treePatterns) {
        this.treePatterns = treePatterns;
    }
}
