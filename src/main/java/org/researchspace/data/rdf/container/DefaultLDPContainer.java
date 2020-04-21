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

package org.researchspace.data.rdf.container;

import org.eclipse.rdf4j.model.IRI;
import org.eclipse.rdf4j.query.BindingSet;
import org.eclipse.rdf4j.query.QueryLanguage;
import org.eclipse.rdf4j.query.TupleQuery;
import org.eclipse.rdf4j.query.TupleQueryResult;
import org.eclipse.rdf4j.repository.RepositoryConnection;
import org.researchspace.repository.MpRepositoryProvider;
import org.researchspace.vocabulary.LDP;

import com.google.common.base.Throwables;

/**
 * Default implementation of a {@link LDPContainer} i.e. if no custom
 * implementation is provided.
 * 
 * @author Johannes Trame <jt@metaphacts.com>
 */
public class DefaultLDPContainer extends AbstractLDPContainer {

    public DefaultLDPContainer(IRI iri, MpRepositoryProvider repositoryProvider) {
        super(iri, repositoryProvider);
    }

    /**
     * TODO see {@link VisibilityContainer}, {@link SetContainer} and
     * {@link ClipboardRootContainer}
     * 
     * @param setItem
     * @param connectingPredicate
     * @param checkForUserIdentity
     * @return
     */
    protected IRI checkForExistingItem(IRI setItem, IRI connectingPredicate, boolean checkForUserIdentity) {

        String query = "SELECT ?node WHERE{" + "?container <http://www.w3.org/ns/ldp#contains> ?node."
                + (checkForUserIdentity ? "?node <http://www.w3.org/ns/prov#wasAttributedTo> ?useruri." : "")
                + "?node ?connectingPredicate ?setItem." + "}";
        TupleQuery tq = null;
        try (RepositoryConnection con = getConnection()) {
            tq = con.prepareTupleQuery(QueryLanguage.SPARQL, query);
            tq.setBinding("container", this.getResourceIRI());
            tq.setBinding("setItem", setItem);
            if (checkForUserIdentity)
                tq.setBinding("useruri", ns.getUserIRI());
            tq.setBinding("connectingPredicate", connectingPredicate);

            TupleQueryResult result = tq.evaluate();
            while (result.hasNext()) {
                BindingSet next = result.next();
                return (IRI) next.getBinding("node").getValue();
            }
            return null;

        } catch (NullPointerException e) {
            return null;
        } catch (Exception e) {
            throw Throwables.propagate(e);
        }
    }

    @Override
    public IRI getResourceType() {
        return LDP.Resource;
    }
}