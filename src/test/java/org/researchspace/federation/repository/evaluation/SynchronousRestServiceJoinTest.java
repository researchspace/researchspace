/**
 * Copyright (c) 2026 ResearchSpace contributors.
 *
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */
package org.researchspace.federation.repository.evaluation;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertTrue;
import static org.junit.Assert.fail;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.Iterator;
import java.util.List;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;

import org.eclipse.rdf4j.common.iteration.CloseableIteration;
import org.eclipse.rdf4j.model.impl.SimpleValueFactory;
import org.eclipse.rdf4j.query.BindingSet;
import org.eclipse.rdf4j.query.QueryEvaluationException;
import org.eclipse.rdf4j.query.impl.EmptyBindingSet;
import org.eclipse.rdf4j.query.impl.MapBindingSet;
import org.junit.After;
import org.junit.Test;

/**
 * Unit tests for the lifecycle and failure semantics of
 * {@link SynchronousRestServiceJoin}: a failed or never-started prefetcher
 * must fail the query loudly (not silently truncate it), and closing the join
 * must always release the left-side iteration — that close is what unwinds
 * chained REST joins sharing the bounded executor pool.
 */
public class SynchronousRestServiceJoinTest {

    private final List<ExecutorService> executors = new ArrayList<>();

    @After
    public void shutDownExecutors() {
        for (ExecutorService executor : executors) {
            executor.shutdownNow();
        }
    }

    @Test
    public void rejectedPrefetcherFailsTheQueryAndClosesLeft() throws Exception {
        ExecutorService executor = newExecutor();
        executor.shutdown();

        TrackingIteration left = iterationOf(binding("a", "1"));
        SynchronousRestServiceJoin join = new SynchronousRestServiceJoin(
                SynchronousRestServiceJoinTest::echo, left, EmptyBindingSet.getInstance(), 2, executor);
        try {
            try {
                join.hasNext();
                fail("a join whose prefetcher could not be scheduled must fail the query, "
                        + "not silently return zero results");
            } catch (QueryEvaluationException expected) {
                // expected: the query fails loudly
            }
            assertTrue("left iteration must be closed when the prefetcher never runs", left.closed);
        } finally {
            join.close();
        }
    }

    @Test
    public void closeClosesLeftWhenPrefetcherNeverStarted() throws Exception {
        ExecutorService executor = newExecutor();
        CountDownLatch blockerRelease = new CountDownLatch(1);
        // Occupy the only worker thread so the prefetcher task stays queued.
        executor.submit(() -> {
            blockerRelease.await();
            return null;
        });

        TrackingIteration left = iterationOf(binding("a", "1"));
        SynchronousRestServiceJoin join = new SynchronousRestServiceJoin(
                SynchronousRestServiceJoinTest::echo, left, EmptyBindingSet.getInstance(), 2, executor);
        join.close();

        assertTrue("close() must release the left iteration even when the prefetcher task never ran "
                + "(cancel-before-start must not leak the left side)", left.closed);
        blockerRelease.countDown();
    }

    @Test
    public void closeUnblocksProducerBlockedOnFullQueue() throws Exception {
        ExecutorService executor = newExecutor();
        // prefetchSize 1: the first result fills the queue, the second blocks the producer.
        TrackingIteration left = iterationOf(binding("a", "1"), binding("a", "2"), binding("a", "3"));
        SynchronousRestServiceJoin join = new SynchronousRestServiceJoin(
                SynchronousRestServiceJoinTest::echo, left, EmptyBindingSet.getInstance(), 1, executor);

        // Wait until the producer is blocked handing over the second result.
        long deadline = System.nanoTime() + TimeUnit.SECONDS.toNanos(5);
        while (join.getHttpCallCount() < 2 && System.nanoTime() < deadline) {
            Thread.sleep(10);
        }
        assertTrue("producer should have started the second evaluation", join.getHttpCallCount() >= 2);

        join.close();

        // The producer thread must exit promptly after close; otherwise chained
        // REST joins permanently exhaust the shared pool.
        executor.shutdown();
        assertTrue("producer thread must be released by close()", executor.awaitTermination(5, TimeUnit.SECONDS));
        assertTrue("left iteration must be closed after close()", left.closed);
    }

    @Test
    public void joinsAllRows() throws Exception {
        ExecutorService executor = newExecutor();
        TrackingIteration left = iterationOf(binding("a", "1"), binding("a", "2"), binding("a", "3"));
        SynchronousRestServiceJoin join = new SynchronousRestServiceJoin(
                SynchronousRestServiceJoinTest::echo, left, EmptyBindingSet.getInstance(), 2, executor);
        try {
            List<String> seen = new ArrayList<>();
            while (join.hasNext()) {
                seen.add(join.next().getValue("a").stringValue());
            }
            assertEquals(Arrays.asList("1", "2", "3"), seen);
            assertTrue("left iteration must be closed after exhaustion", left.closed);
        } finally {
            join.close();
        }
    }

    private ExecutorService newExecutor() {
        ExecutorService executor = Executors.newSingleThreadExecutor();
        executors.add(executor);
        return executor;
    }

    /** Right evaluator that echoes the input binding set as a single row. */
    private static CloseableIteration<BindingSet> echo(BindingSet input) {
        return iterationOf(input);
    }

    private static BindingSet binding(String name, String value) {
        MapBindingSet bs = new MapBindingSet();
        bs.addBinding(name, SimpleValueFactory.getInstance().createLiteral(value));
        return bs;
    }

    private static TrackingIteration iterationOf(BindingSet... rows) {
        return new TrackingIteration(Arrays.asList(rows));
    }

    /** List-backed iteration that records whether it was closed. */
    private static final class TrackingIteration implements CloseableIteration<BindingSet> {
        private final Iterator<BindingSet> delegate;
        volatile boolean closed = false;

        TrackingIteration(List<BindingSet> rows) {
            this.delegate = rows.iterator();
        }

        @Override
        public boolean hasNext() {
            return !closed && delegate.hasNext();
        }

        @Override
        public BindingSet next() {
            return delegate.next();
        }

        @Override
        public void remove() {
            throw new UnsupportedOperationException();
        }

        @Override
        public void close() {
            closed = true;
        }
    }
}
