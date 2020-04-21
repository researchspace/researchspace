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
package org.researchspace.api.transform;

import static org.researchspace.api.transform.ModelUtils.getNotNullObjectIRI;
import static org.researchspace.api.transform.ModelUtils.getNotNullObjectLiteral;
import static org.researchspace.api.transform.ModelUtils.getNotNullSubjectIRI;

import java.util.ArrayList;
import java.util.Collection;
import java.util.Set;

import org.apache.commons.lang3.NotImplementedException;
import org.eclipse.rdf4j.model.IRI;
import org.eclipse.rdf4j.model.Model;
import org.eclipse.rdf4j.model.Resource;
import org.eclipse.rdf4j.model.Value;
import org.eclipse.rdf4j.model.util.ModelException;
import org.eclipse.rdf4j.model.vocabulary.RDF;
import org.eclipse.rdf4j.model.vocabulary.RDFS;
import org.researchspace.api.dto.InconsistentDtoException;
import org.researchspace.api.dto.queryform.QueryFormConfiguration;
import org.researchspace.api.dto.queryform.QueryFormElement;
import org.researchspace.api.dto.querytemplate.QueryArgument;
import org.researchspace.api.dto.querytemplate.QueryTemplate;
import org.researchspace.api.dto.uiform.Choice;
import org.researchspace.api.dto.uiform.DatePicker;
import org.researchspace.api.dto.uiform.TextInput;
import org.researchspace.api.dto.uiform.UIFormElement;
import org.researchspace.api.dto.uiform.TextInput.InputType;
import org.researchspace.api.rest.client.APICallFailedException;
import org.researchspace.api.rest.client.QueryTemplateCatalogAPIClient;
import org.researchspace.vocabulary.QF;

/**
 * Transformation from {@link Model} to {@link QueryFormConfiguration} and back.
 * 
 * @author msc, jt
 */
public class ModelToQueryFormConfigurationTransformer
        implements ModelToDtoTransformer<QueryFormConfiguration<QueryTemplate<?>>> {

    final QueryTemplateCatalogAPIClient queryTemplateCatalogApi;

    public ModelToQueryFormConfigurationTransformer(final QueryTemplateCatalogAPIClient queryTemplateCatalogApi) {
        this.queryTemplateCatalogApi = queryTemplateCatalogApi;
    }

    @Override
    public QueryFormConfiguration<QueryTemplate<?>> modelToDto(final Model model)
            throws InvalidQueryFormConfigurationModelException {
        if (model == null)
            return null;

        IRI queryFormId = null;
        IRI queryTemplateId = null;
        QueryTemplate<?> queryTemplateDto = null;
        String label = null;
        String description = null;
        Set<Value> formElementIdentifier = null;

        Collection<QueryFormElement> formElements = new ArrayList<QueryFormElement>();
        try {
            // getOptional will throw exception if not exactly one matching object/subject
            // can be found
            queryFormId = getNotNullSubjectIRI(model, RDF.TYPE, QF.QUERY_FORM_CLASS);
            queryTemplateId = getNotNullObjectIRI(model, queryTemplateId, QF.SPIN_TEMPLATE_PROPERTY);
            queryTemplateDto = this.getQueryTemplate(queryTemplateId);
            label = getNotNullObjectLiteral(model, queryFormId, RDFS.LABEL).stringValue();
            description = getNotNullObjectLiteral(model, queryFormId, RDFS.COMMENT).stringValue();

            formElementIdentifier = model.filter(queryFormId, QF.FORM_ELEMENT_PROPERTY, null).objects();
            for (Value el : formElementIdentifier) {
                // TODO think of whether we really want to enforce this?
                if (!(el instanceof IRI))
                    throw new InvalidQueryFormConfigurationModelException(
                            "Identifier of query form " + queryFormId + " element must be a IRI.", null /* cause */);

                IRI argType = getNotNullObjectIRI(model, (Resource) el, RDF.TYPE);
                if (!argType.equals(QF.QUERY_FORM_ELEMENT_CLASS))
                    throw new InvalidQueryFormConfigurationModelException("Form element  " + el.stringValue()
                            + " of form " + queryFormId + " must be typed as qf:QueryFormElement", null /* cause */);

                // the predicate i.e. to be parameterized binding name is defined as the local
                // name of the object IRI of the predicate property
                String elLabel = getNotNullObjectLiteral(model, (Resource) el, RDFS.LABEL).stringValue();
                String elDescription = getNotNullObjectLiteral(model, (Resource) el, RDFS.COMMENT).stringValue();

                IRI uiElementId = getNotNullObjectIRI(model, (Resource) el, QF.UI_FORM_ELEMENT_PROPERTY);
                UIFormElement uiElement = getUIFormElement(uiElementId);

                IRI argumentId = getNotNullObjectIRI(model, (Resource) el, QF.SPL_ARGUMENT_PROPERTY);
                QueryArgument queryArgument = queryTemplateDto.getArgument(argumentId);

                QueryFormElement formElement = new QueryFormElement((IRI) el, elLabel, elDescription, queryArgument,
                        uiElement);

                try { // suggestionQuery is optional
                    IRI suggestionQueryId = getNotNullObjectIRI(model, (Resource) el, QF.SUGGESTION_QUERY_PROPERTY);
                    formElement.setSuggestionQueryId(suggestionQueryId);
                } catch (ModelException | IllegalArgumentException e1) {
                }

                try { // oder is optional
                    int orderNr = getNotNullObjectLiteral(model, (Resource) el, QF.ELEMENT_ORDER_PROPERTY).intValue();
                    formElement.setElementOrderNr(orderNr);
                } catch (ModelException | IllegalArgumentException e1) {
                }

                formElement.assertConsistency();
                formElements.add(formElement);
            }

        } catch (ModelException e) {

            throw new InvalidQueryFormConfigurationModelException(
                    "Failed to extract expected field from query form " + queryFormId + " configuration", e);

        } catch (InconsistentDtoException e) {

            throw new InvalidQueryFormConfigurationModelException(
                    "Inconsistent query form element detected in query form " + queryFormId, e);

        }

        final QueryFormConfiguration<QueryTemplate<?>> ret = new QueryFormConfiguration<QueryTemplate<?>>(queryFormId,
                label, description, queryTemplateDto, formElements);

        try {
            ret.assertConsistency();
        } catch (InconsistentDtoException e) {
            throw new InvalidQueryFormConfigurationModelException(
                    "Query form configuration for " + queryFormId + " is inconsistent", e);
        }

        return ret;

    }

    private UIFormElement getUIFormElement(IRI uiElementId) throws InvalidQueryFormConfigurationModelException {

        if (uiElementId.equals(QF.UI_DATEPICKER_INDIVIDUAL))
            return new DatePicker();
        else if (uiElementId.equals(QF.UI_TEXT_INPUT_INDIVIDUAL))
            return new TextInput(InputType.LINE);
        else if (uiElementId.equals(QF.UI_CHOICE_INDIVIDUAL))
            return new Choice();

        // fallback
        throw new InvalidQueryFormConfigurationModelException(
                uiElementId + " is not a valid UIFormElement (type not matched)", null /* cause */);
    }

    private QueryTemplate<?> getQueryTemplate(IRI queryTemplateId) throws InvalidQueryFormConfigurationModelException {
        QueryTemplate<?> queryTemplateDto = null;
        try {
            queryTemplateDto = queryTemplateCatalogApi.getQueryTemplate(queryTemplateId);
            if (queryTemplateDto == null)
                throw new InvalidQueryFormConfigurationModelException("Query template resolved to null",
                        null /* cause */);
        } catch (APICallFailedException e) {
            throw new InvalidQueryFormConfigurationModelException(
                    "Recursive API call for suggestion query resolution for query " + queryTemplateId
                            + " in query form configuration could not be resolved",
                    e);
        }

        try {
            queryTemplateDto.assertConsistency();
        } catch (InconsistentDtoException e) {
            throw new InvalidQueryFormConfigurationModelException(
                    "Query template " + queryTemplateId + " is inconsistent", e);
        }

        return queryTemplateDto;
    }

    @Override
    public Model dtoToModel(final QueryFormConfiguration<QueryTemplate<?>> queryFormConfiguration) {
        throw new NotImplementedException(
                QueryFormConfiguration.class.getName() + " to dtoToModel() is not yet implemented.");
    }

}