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

package org.researchspace.sail.rest;

import java.io.InputStream;
import java.sql.ResultSet;
import java.util.Collection;
import java.util.List;
import java.util.Map;

import org.eclipse.rdf4j.common.iteration.CloseableIteration;
import org.eclipse.rdf4j.model.IRI;
import org.eclipse.rdf4j.model.Namespace;
import org.eclipse.rdf4j.model.Resource;
import org.eclipse.rdf4j.model.Statement;
import org.eclipse.rdf4j.model.Value;
import org.eclipse.rdf4j.query.BindingSet;
import org.eclipse.rdf4j.query.Dataset;
import org.eclipse.rdf4j.query.QueryEvaluationException;
import org.eclipse.rdf4j.query.algebra.StatementPattern;
import org.eclipse.rdf4j.query.algebra.TupleExpr;
import org.eclipse.rdf4j.query.algebra.evaluation.optimizer.BindingAssignerOptimizer;
import org.eclipse.rdf4j.common.iteration.CloseableIteratorIteration;
import org.eclipse.rdf4j.query.algebra.helpers.collectors.StatementPatternCollector;
import org.eclipse.rdf4j.sail.SailConnection;
import org.eclipse.rdf4j.sail.SailException;
import org.eclipse.rdf4j.sail.helpers.AbstractSailConnection;

import com.google.common.collect.Lists;
import com.google.common.collect.Maps;

/**
 * Abstract {@link SailConnection} implementation for arbitrary services that
 * assume a request-response interaction pattern. Defines a generic sequence of
 * steps:
 * <ol>
 * <li>Extract input parameters from the incoming {@link TupleExpr}</li>
 * <li>Invoke the service and convert results into {@link BindingSet}s</li>
 * </ol>
 * 
 * @author Andriy Nikolov <an@metaphacts.com>
 *
 */
public abstract class AbstractServiceWrappingSailConnection<C extends AbstractServiceWrappingSailConfig>
        extends AbstractSailConnection {

    /**
     * A class holding the mappings for the API inputs (parameter name->value as
     * string) and outputs (IRI->variable name)
     * 
     * @author Andriy Nikolov an@metaphacts.com
     *
     */
    protected static class ServiceParametersHolder {
        private String subjVarName = null;
        private Map<String, String> inputParameters = Maps.newHashMap();
        private Map<IRI, String> outputVariables = Maps.newHashMap();

        public ServiceParametersHolder() {

        }

        public String getSubjVarName() {
            return subjVarName;
        }

        public void setSubjVarName(String subjVarName) {
            this.subjVarName = subjVarName;
        }

        public Map<String, String> getInputParameters() {
            return inputParameters;
        }

        public Map<IRI, String> getOutputVariables() {
            return outputVariables;
        }
    }

    private final AbstractServiceWrappingSail<C> sail;

    public AbstractServiceWrappingSailConnection(AbstractServiceWrappingSail<C> sailBase) {
        super(sailBase);
        this.sail = sailBase;
    }

    @Override
    protected void closeInternal() throws SailException {
    }

    /**
     * Follows the following workflow:
     * <ul>
     * <li>Extract input/output parameters and store them in a
     * {@link ServiceParametersHolder} object.</li>
     * <li>Submit an HTTP request (by default, an HTTP GET request passing
     * parameters via URL)</li>
     * <li>Process the response and assign the outputs to the output variables.</li>
     * </ul>
     * 
     */
    @Override
    protected CloseableIteration<? extends BindingSet> evaluateInternal(TupleExpr tupleExpr,
            Dataset dataset, BindingSet bindings, boolean includeInferred) throws SailException {
        TupleExpr cloned = tupleExpr.clone();
        new BindingAssignerOptimizer().optimize(cloned, dataset, bindings);
        StatementPatternCollector collector = new StatementPatternCollector();
        cloned.visit(collector);
        List<StatementPattern> stmtPatterns = collector.getStatementPatterns();
        ServiceParametersHolder parametersHolder = extractInputsAndOutputs(stmtPatterns);
        return executeAndConvertResultsToBindingSet(parametersHolder);
    }

    /**
     * Given the list of input parameters collected in
     * <code>parametersHolder</code>, executes the wrapped service and converts the
     * returned results into {@link BindingSet}s.
     * 
     * @param parametersHolder {@link ServiceParametersHolder} containing input
     *                         parameters to be submitted to the service
     * @return iteration over binding sets
     */
    protected abstract CloseableIteration<? extends BindingSet> executeAndConvertResultsToBindingSet(
            ServiceParametersHolder parametersHolder);

    @Override
    protected CloseableIteration<? extends Resource> getContextIDsInternal() throws SailException {
        return new CloseableIteratorIteration<>(Lists.<Resource>newArrayList().iterator());
    }

    @Override
    protected CloseableIteration<? extends Statement> getStatementsInternal(Resource subj, IRI pred,
            Value obj, boolean includeInferred, Resource... contexts) throws SailException {
        return new CloseableIteratorIteration<>(Lists.<Statement>newArrayList().iterator());
    }

    @Override
    protected long sizeInternal(Resource... contexts) throws SailException {
        return 0;
    }

    @Override
    protected void startTransactionInternal() throws SailException {

    }

    @Override
    protected void commitInternal() throws SailException {

    }

    @Override
    protected void rollbackInternal() throws SailException {

    }

    @Override
    protected void addStatementInternal(Resource subj, IRI pred, Value obj, Resource... contexts) throws SailException {
        throw new SailException("The service " + this.sail.getConfig().getUrl() + " is read-only");
    }

    @Override
    protected void removeStatementsInternal(Resource subj, IRI pred, Value obj, Resource... contexts)
            throws SailException {
        throw new SailException("The service " + this.sail.getConfig().getUrl() + " is read-only");
    }

    @Override
    protected void clearInternal(Resource... contexts) throws SailException {
        throw new SailException("The service " + this.sail.getConfig().getUrl() + " is read-only");

    }

    @Override
    protected CloseableIteration<? extends Namespace> getNamespacesInternal() throws SailException {
        return new CloseableIteratorIteration<>(Lists.<Namespace>newArrayList().iterator());
    }

    @Override
    protected String getNamespaceInternal(String prefix) throws SailException {
        return null;
    }

    @Override
    protected void setNamespaceInternal(String prefix, String name) throws SailException {

    }

    @Override
    protected void removeNamespaceInternal(String prefix) throws SailException {

    }

    @Override
    protected void clearNamespacesInternal() throws SailException {

    }

    public AbstractServiceWrappingSail<C> getSail() {
        return sail;
    }

    protected abstract ServiceParametersHolder extractInputsAndOutputs(List<StatementPattern> stmtPatterns)
            throws SailException;

    protected abstract Collection<BindingSet> convertResult2BindingSets(InputStream result,
            ServiceParametersHolder parametersHolder) throws SailException;

    protected abstract Collection<BindingSet> convertResult2BindingSets(ResultSet result,
            ServiceParametersHolder parametersHolder) throws SailException;
}