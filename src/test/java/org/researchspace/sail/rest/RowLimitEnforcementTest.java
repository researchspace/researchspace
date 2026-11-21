/**
 * Copyright (c) 2026 ResearchSpace contributors.
 *
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */
package org.researchspace.sail.rest;

import static org.junit.Assert.assertEquals;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import java.util.Arrays;
import java.util.Collections;
import java.util.List;
import java.util.Map;

import org.eclipse.rdf4j.common.iteration.CloseableIteration;
import org.eclipse.rdf4j.common.iteration.CloseableIteratorIteration;
import org.eclipse.rdf4j.model.impl.SimpleValueFactory;
import org.eclipse.rdf4j.query.BindingSet;
import org.eclipse.rdf4j.query.impl.MapBindingSet;
import org.junit.Test;
import org.researchspace.federation.repository.service.ServiceDescriptor;

/**
 * {@code ephedra:rowLimit} is declared generically on service descriptors, so
 * it must be enforced generically for every service-wrapping sail — not only
 * for REST responses whose JSON root happens to be an array. SQL sails and
 * subclasses overriding the response conversion get the cap from the shared
 * base class.
 */
public class RowLimitEnforcementTest {

    private ServiceDescriptor descriptorWithRowLimitParam(String name) {
        ServiceDescriptor descriptor = mock(ServiceDescriptor.class);
        ServiceDescriptor.Parameter limitParam = mock(ServiceDescriptor.Parameter.class);
        when(limitParam.isRowLimit()).thenReturn(true);
        when(descriptor.getInputParameters()).thenReturn(Map.of(name, limitParam));
        return descriptor;
    }

    private CloseableIteration<? extends BindingSet> rows(int n) {
        MapBindingSet[] rows = new MapBindingSet[n];
        for (int i = 0; i < n; i++) {
            rows[i] = new MapBindingSet();
            rows[i].addBinding("v", SimpleValueFactory.getInstance().createLiteral(i));
        }
        return new CloseableIteratorIteration<>(Arrays.<BindingSet>asList(rows).iterator());
    }

    private int count(CloseableIteration<? extends BindingSet> iteration) {
        int count = 0;
        try (iteration) {
            while (iteration.hasNext()) {
                iteration.next();
                count++;
            }
        }
        return count;
    }

    @Test
    public void boundRowLimitCapsAnyResultIteration() {
        AbstractServiceWrappingSailConnection.ServiceParametersHolder holder =
                new AbstractServiceWrappingSailConnection.ServiceParametersHolder();
        holder.getInputParameters().put("limit", "1");

        assertEquals(1, count(AbstractServiceWrappingSailConnection.applyRowLimit(
                rows(3), holder, descriptorWithRowLimitParam("limit"))));
    }

    @Test
    public void zeroRowLimitSuppressesAllRows() {
        AbstractServiceWrappingSailConnection.ServiceParametersHolder holder =
                new AbstractServiceWrappingSailConnection.ServiceParametersHolder();
        holder.getInputParameters().put("limit", "0");

        assertEquals(0, count(AbstractServiceWrappingSailConnection.applyRowLimit(
                rows(3), holder, descriptorWithRowLimitParam("limit"))));
    }

    @Test
    public void unboundRowLimitLeavesResultsUntouched() {
        AbstractServiceWrappingSailConnection.ServiceParametersHolder holder =
                new AbstractServiceWrappingSailConnection.ServiceParametersHolder();

        assertEquals(3, count(AbstractServiceWrappingSailConnection.applyRowLimit(
                rows(3), holder, descriptorWithRowLimitParam("limit"))));
    }

    @Test
    public void missingDescriptorLeavesResultsUntouched() {
        AbstractServiceWrappingSailConnection.ServiceParametersHolder holder =
                new AbstractServiceWrappingSailConnection.ServiceParametersHolder();
        holder.getInputParameters().put("limit", "1");

        assertEquals(3, count(AbstractServiceWrappingSailConnection.applyRowLimit(rows(3), holder, null)));

        ServiceDescriptor noParams = mock(ServiceDescriptor.class);
        when(noParams.getInputParameters()).thenReturn(Collections.emptyMap());
        holder.getInputParameters().put("limit", "1");
        assertEquals(3, count(AbstractServiceWrappingSailConnection.applyRowLimit(rows(3), holder, noParams)));
    }
}
