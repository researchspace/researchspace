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

package org.researchspace.sail.rest.wikidata;

import java.io.InputStream;
import java.util.Collection;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

import org.eclipse.rdf4j.model.IRI;
import org.eclipse.rdf4j.model.Literal;
import org.eclipse.rdf4j.model.ValueFactory;
import org.eclipse.rdf4j.model.impl.SimpleValueFactory;
import org.eclipse.rdf4j.model.vocabulary.RDFS;
import org.eclipse.rdf4j.query.BindingSet;
import org.eclipse.rdf4j.query.algebra.StatementPattern;
import org.eclipse.rdf4j.query.impl.MapBindingSet;
import org.eclipse.rdf4j.sail.SailConnection;
import org.eclipse.rdf4j.sail.SailException;
import org.researchspace.sail.rest.AbstractRESTWrappingSailConnection;
import org.researchspace.sail.rest.AbstractServiceWrappingSail;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.google.common.collect.Lists;

/**
 * {@link SailConnection} implementation for {@link WikidataSail}
 * 
 * @author Andriy Nikolov <an@metaphacts.com>
 *
 */
public class WikidataSailConnection extends AbstractRESTWrappingSailConnection<WikidataSailConfig> {

    private static final ValueFactory VF = SimpleValueFactory.getInstance();

    public static final IRI HAS_WIKIDATA_SEARCH_TOKEN = VF
            .createIRI("http://www.researchspace.org/resource/system/hasWikidataSearchToken");
    public static final IRI USE_LANGUAGE = VF.createIRI("http://www.researchspace.org/resource/system/useLanguage");
    public static final IRI SCHEMA_ORG_DESCRIPTION = VF.createIRI("http://schema.org/description");
    public static final IRI ORDER_NR = VF.createIRI("http://www.researchspace.org/resource/system/orderNr");

    public WikidataSailConnection(AbstractServiceWrappingSail<WikidataSailConfig> sailBase) {
        super(sailBase);
    }

    @Override
    protected RESTParametersHolder extractInputsAndOutputs(List<StatementPattern> stmtPatterns) throws SailException {
        RESTParametersHolder res = new RESTParametersHolder();

        List<StatementPattern> relevant = stmtPatterns.stream()
                .filter(stmtPattern -> stmtPattern.getPredicateVar().hasValue()
                        && stmtPattern.getPredicateVar().getValue().equals(HAS_WIKIDATA_SEARCH_TOKEN))
                .collect(Collectors.toList());

        if (relevant.isEmpty()) {
            throw new SailException("The search token was not provided, must be passed via the reserved <"
                    + HAS_WIKIDATA_SEARCH_TOKEN.stringValue() + "> property.");
        }

        if (relevant.stream().allMatch(stmtPattern -> (stmtPattern.getObjectVar().getValue() instanceof Literal)
                && !stmtPattern.getSubjectVar().hasValue())) {
            relevant.stream().forEach(stmtPattern -> {
                res.getOutputVariables().put(HAS_WIKIDATA_SEARCH_TOKEN, stmtPattern.getSubjectVar().getName());
                res.getInputParameters().put("search", stmtPattern.getObjectVar().getValue().stringValue());
            });
        } else {
            throw new SailException("Illegally defined statement patterns");
        }

        String subjVarName = res.getOutputVariables().get(HAS_WIKIDATA_SEARCH_TOKEN);

        stmtPatterns.stream()
                .filter(stmtPattern -> stmtPattern.getPredicateVar().getValue().equals(USE_LANGUAGE)
                        && stmtPattern.getSubjectVar().getName().equals(subjVarName)
                        && stmtPattern.getObjectVar().hasValue())
                .forEach(stmtPattern -> {
                    res.getInputParameters().put("language", stmtPattern.getObjectVar().getValue().stringValue());
                    res.getInputParameters().put("uselang", stmtPattern.getObjectVar().getValue().stringValue());
                });

        stmtPatterns.stream().filter(stmtPattern -> stmtPattern.getPredicateVar().getValue().equals(RDFS.LABEL)
                && stmtPattern.getSubjectVar().getName().equals(subjVarName) && !stmtPattern.getObjectVar().hasValue())
                .forEach(stmtPattern -> res.getOutputVariables().put(RDFS.LABEL, stmtPattern.getObjectVar().getName()));

        stmtPatterns.stream()
                .filter(stmtPattern -> stmtPattern.getPredicateVar().getValue().equals(SCHEMA_ORG_DESCRIPTION)
                        && stmtPattern.getSubjectVar().getName().equals(subjVarName)
                        && !stmtPattern.getObjectVar().hasValue())
                .forEach(stmtPattern -> res.getOutputVariables().put(SCHEMA_ORG_DESCRIPTION,
                        stmtPattern.getObjectVar().getName()));

        stmtPatterns.stream().filter(stmtPattern -> stmtPattern.getPredicateVar().getValue().equals(ORDER_NR)
                && stmtPattern.getSubjectVar().getName().equals(subjVarName) && !stmtPattern.getObjectVar().hasValue())
                .forEach(stmtPattern -> res.getOutputVariables().put(ORDER_NR, stmtPattern.getObjectVar().getName()));

        if (!res.getInputParameters().containsKey("language")) {
            res.getInputParameters().put("language", "en");
        }

        if (!res.getInputParameters().containsKey("uselang")) {
            res.getInputParameters().put("uselang", "en");
        }

        res.getInputParameters().put("action", "wbsearchentities");
        res.getInputParameters().put("format", "json");
        res.getInputParameters().put("type", "item");

        return res;
    }

    @SuppressWarnings("unchecked")
    @Override
    protected Collection<BindingSet> convertStream2BindingSets(InputStream inputStream,
            RESTParametersHolder parametersHolder) throws SailException {
        try {
            ObjectMapper mapper = new ObjectMapper();
            HashMap<String, Object> map = mapper.readValue(inputStream, HashMap.class);
            List<Object> resList = (List<Object>) map.get("search");
            List<BindingSet> outList = Lists.newArrayList();
            int idx = 0;
            for (Object resObj : resList) {
                idx++;
                Map<String, Object> resMap = (Map<String, Object>) resObj;
                IRI conceptURI = VF.createIRI((String) resMap.get("concepturi"));
                MapBindingSet bs = new MapBindingSet();
                bs.addBinding(parametersHolder.getOutputVariables().get(HAS_WIKIDATA_SEARCH_TOKEN), conceptURI);
                if (parametersHolder.getOutputVariables().containsKey(RDFS.LABEL)) {
                    String strVal = resMap.containsKey("label") ? (String) resMap.get("label") : "";
                    Literal litLabel = VF.createLiteral(strVal);
                    bs.addBinding(parametersHolder.getOutputVariables().get(RDFS.LABEL), litLabel);
                }
                if (parametersHolder.getOutputVariables().containsKey(SCHEMA_ORG_DESCRIPTION)) {
                    String strVal = resMap.containsKey("description") ? (String) resMap.get("description") : "";
                    Literal litDesc = VF.createLiteral(strVal);
                    bs.addBinding(parametersHolder.getOutputVariables().get(SCHEMA_ORG_DESCRIPTION), litDesc);
                }
                if (parametersHolder.getOutputVariables().containsKey(ORDER_NR)) {
                    Literal litDesc = VF.createLiteral(idx);
                    bs.addBinding(parametersHolder.getOutputVariables().get(ORDER_NR), litDesc);
                }

                outList.add(bs);
            }
            return outList;
        } catch (Exception e) {
            throw new SailException(e);
        }
    }

    @Override
    protected void closeInternal() throws SailException {
        super.closeInternal();
    }

    @Override
    public boolean pendingRemovals() {
        return false;
    }
}