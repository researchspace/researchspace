/**
 * Copyright (c) 2026 ResearchSpace contributors.
 * 
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

package org.researchspace.federation.repository.evaluation;

import java.util.concurrent.ArrayBlockingQueue;
import java.util.concurrent.BlockingQueue;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Future;
import java.util.concurrent.RejectedExecutionException;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.concurrent.atomic.AtomicInteger;

import org.eclipse.rdf4j.common.iteration.CloseableIteration;
import org.eclipse.rdf4j.common.iteration.LookAheadIteration;
import org.eclipse.rdf4j.federated.evaluation.FederationEvalStrategy;
import org.eclipse.rdf4j.query.BindingSet;
import org.eclipse.rdf4j.query.QueryEvaluationException;
import org.eclipse.rdf4j.query.algebra.TupleExpr;
import org.eclipse.rdf4j.query.impl.MapBindingSet;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

/**
 * Prefetching join executor for REST-backed services.
 * 
 * <p>This join implementation uses bounded parallelism to prefetch results from REST services.
 * It uses a shared executor from MpFederation to avoid creating new thread pools per query,
 * maintaining up to {@code prefetchSize} HTTP calls in-flight at any time, providing
 * a balance between lazy evaluation (respecting LIMIT) and parallelism (better performance).</p>
 * 
 * <h3>Thread Safety</h3>
 * <p>This class is designed for single-consumer use (one thread calls {@code getNextElement} and
 * {@code close}). The prefetcher runs in a separate thread from the shared executor pool.</p>
 * 
 * <h3>Synchronization Strategy</h3>
 * <ul>
 *   <li>{@code leftIter} is only accessed from the prefetcher thread</li>
 *   <li>{@code resultQueue} is a thread-safe blocking queue (producer=prefetcher, consumer=caller)</li>
 *   <li>{@code currentRightIter} is only accessed from the consumer thread</li>
 *   <li>{@code closed} flag from parent class coordinates shutdown</li>
 * </ul>
 * 
 * @see QueryHintAwareSparqlFederationEvalStrategy#executeJoin
 */
public class SynchronousRestServiceJoin extends LookAheadIteration<BindingSet> {

    private static final Logger log = LoggerFactory.getLogger(SynchronousRestServiceJoin.class);

    /** Poison pill to signal end of results */
    private static final CloseableIteration<BindingSet> END_MARKER = 
            new org.eclipse.rdf4j.common.iteration.EmptyIteration<>();

    private final FederationEvalStrategy strategy;
    private final CloseableIteration<BindingSet> leftIter;
    private final TupleExpr rightArg;
    private final BindingSet bindings;
    private final int prefetchSize;
    
    private final ExecutorService executor;
    private final BlockingQueue<CloseableIteration<BindingSet>> resultQueue;
    private final AtomicBoolean prefetcherDone = new AtomicBoolean(false);
    private final AtomicInteger httpCallCount = new AtomicInteger(0);
    private final AtomicInteger processedCount = new AtomicInteger(0);
    
    // Only accessed from consumer thread (getNextElement and handleClose)
    private CloseableIteration<BindingSet> currentRightIter;
    
    // The prefetcher task handle - used for cancellation
    private volatile Future<?> prefetcherTask;

    /**
     * Create a new prefetching join with a shared executor.
     * 
     * @param strategy the federation evaluation strategy
     * @param leftIter the left iterator providing bindings (will be consumed by prefetcher thread)
     * @param rightArg the right argument to evaluate 
     * @param bindings base bindings
     * @param prefetchSize number of results to prefetch (bounded parallelism)
     * @param executor shared executor service from MpFederation
     */
    public SynchronousRestServiceJoin(
            FederationEvalStrategy strategy,
            CloseableIteration<BindingSet> leftIter,
            TupleExpr rightArg,
            BindingSet bindings,
            int prefetchSize,
            ExecutorService executor) {
        this.strategy = strategy;
        this.leftIter = leftIter;
        this.rightArg = rightArg;
        this.bindings = bindings;
        this.prefetchSize = Math.max(1, prefetchSize);
        this.executor = executor;
        
        // Create bounded queue - acts as the synchronization point between producer and consumer
        this.resultQueue = new ArrayBlockingQueue<>(this.prefetchSize);
        
        // Start prefetcher task using shared executor
        try {
            this.prefetcherTask = executor.submit(this::prefetchLoop);
        } catch (RejectedExecutionException e) {
            // Executor is shutdown - proceed without prefetching
            log.warn("Failed to start prefetcher - executor is shutdown");
            prefetcherDone.set(true);
        }
        
        if (log.isDebugEnabled()) {
            log.debug("SynchronousRestServiceJoin started with prefetchSize={}", this.prefetchSize);
        }
    }

    /**
     * Prefetch loop - runs in executor thread.
     * 
     * <p>This method is the only place where {@code leftIter} is accessed, ensuring
     * thread-safe access to the left iterator. Results are passed to the consumer
     * via the thread-safe {@code resultQueue}.</p>
     */
    private void prefetchLoop() {
        try {
            while (!isClosed() && leftIter.hasNext()) {
                BindingSet leftBinding = leftIter.next();
                BindingSet mergedBindings = mergeBindings(bindings, leftBinding);
                
                // Check closed again before starting HTTP call
                if (isClosed()) {
                    break;
                }
                
                // Make HTTP call synchronously in this prefetcher thread
                // (we don't submit another task - just do the work here)
                try {
                    int callNum = httpCallCount.incrementAndGet();
                    if (log.isTraceEnabled()) {
                        log.trace("SynchronousRestServiceJoin: HTTP call #{} for binding: {}", 
                                callNum, mergedBindings);
                    }
                    
                    @SuppressWarnings("removal")
                    CloseableIteration<BindingSet> result = strategy.evaluate(rightArg, mergedBindings);
                    
                    // Add to queue, blocking if full
                    // This provides natural backpressure - if consumer is slow, we wait here
                    if (!isClosed()) {
                        resultQueue.put(result);
                    } else {
                        // Closed while evaluating - clean up the result
                        closeQuietly(result);
                        break;
                    }
                } catch (InterruptedException e) {
                    Thread.currentThread().interrupt();
                    break;
                } catch (Exception e) {
                    if (!isClosed()) {
                        log.warn("Error evaluating REST service: {}", e.getMessage());
                        // Continue with next binding - don't fail the whole query
                    }
                }
            }
        } catch (Exception e) {
            if (!isClosed()) {
                log.error("Prefetch loop error: {}", e.getMessage(), e);
            }
        } finally {
            prefetcherDone.set(true);
            
            // Close left iterator - we own it and are done with it
            closeQuietly(leftIter);
            
            // Add end marker to signal consumer (if not already closed)
            try {
                if (!isClosed()) {
                    // Use offer with timeout to avoid blocking forever if queue is full and consumer is gone
                    if (!resultQueue.offer(END_MARKER, 1, TimeUnit.SECONDS)) {
                        log.debug("Could not add END_MARKER - queue full or consumer gone");
                    }
                }
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
            }
        }
    }

    @Override
    protected BindingSet getNextElement() throws QueryEvaluationException {
        // Note: This method is only called from a single consumer thread
        
        while (!isClosed()) {
            // Try to get result from current iterator
            if (currentRightIter != null && currentRightIter.hasNext()) {
                processedCount.incrementAndGet();
                return currentRightIter.next();
            }
            
            // Close exhausted iterator
            if (currentRightIter != null && currentRightIter != END_MARKER) {
                closeQuietly(currentRightIter);
                currentRightIter = null;
            }
            
            // Get next result from queue with timeout
            try {
                CloseableIteration<BindingSet> next = resultQueue.poll(100, TimeUnit.MILLISECONDS);
                
                if (next == END_MARKER) {
                    // End of results
                    if (log.isDebugEnabled()) {
                        log.debug("SynchronousRestServiceJoin completed: {} HTTP calls, {} results returned",
                                httpCallCount.get(), processedCount.get());
                    }
                    return null;
                }
                
                if (next == null) {
                    // Timeout - check if prefetcher is done
                    if (prefetcherDone.get() && resultQueue.isEmpty()) {
                        if (log.isDebugEnabled()) {
                            log.debug("SynchronousRestServiceJoin completed: {} HTTP calls, {} results returned",
                                    httpCallCount.get(), processedCount.get());
                        }
                        return null;
                    }
                    continue; // Retry poll
                }
                
                currentRightIter = next;
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
                throw new QueryEvaluationException("Interrupted while waiting for results", e);
            }
        }
        
        return null;
    }

    /**
     * Merge base bindings with additional bindings from left iterator.
     */
    private BindingSet mergeBindings(BindingSet base, BindingSet additional) {
        if (base.isEmpty()) {
            return additional;
        }
        if (additional.isEmpty()) {
            return base;
        }
        
        MapBindingSet merged = new MapBindingSet();
        base.forEach(binding -> merged.addBinding(binding.getName(), binding.getValue()));
        additional.forEach(binding -> merged.addBinding(binding.getName(), binding.getValue()));
        return merged;
    }

    @Override
    protected void handleClose() throws QueryEvaluationException {
        if (log.isDebugEnabled()) {
            log.debug("SynchronousRestServiceJoin closed: {} HTTP calls made, {} results returned",
                    httpCallCount.get(), processedCount.get());
        }
        
        // Cancel prefetcher task - this will interrupt it if it's waiting on resultQueue.put()
        // Note: we do NOT shutdown the shared executor (it's managed by MpFederation)
        if (prefetcherTask != null) {
            prefetcherTask.cancel(true);
        }
        
        // Close current iterator (consumer-side resource)
        if (currentRightIter != null && currentRightIter != END_MARKER) {
            closeQuietly(currentRightIter);
            currentRightIter = null;
        }
        
        // Drain and close any remaining iterators in queue
        CloseableIteration<BindingSet> remaining;
        while ((remaining = resultQueue.poll()) != null) {
            if (remaining != END_MARKER) {
                closeQuietly(remaining);
            }
        }
        
        // Note: leftIter is closed by the prefetcher in its finally block
        // If prefetcher is cancelled before reaching finally, this is a fallback
        if (!prefetcherDone.get()) {
            // Prefetcher may not have closed leftIter yet - give it a moment
            // This is a best-effort; the prefetcher's finally block should handle it
            try {
                Thread.sleep(50);
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
            }
        }
    }
    
    /**
     * Close an iteration quietly, ignoring exceptions.
     */
    private void closeQuietly(CloseableIteration<?> iter) {
        if (iter != null) {
            try {
                iter.close();
            } catch (Exception e) {
                // Ignore
            }
        }
    }
    
    /**
     * @return the number of HTTP calls made so far
     */
    public int getHttpCallCount() {
        return httpCallCount.get();
    }
    
    /**
     * @return the number of results returned so far
     */
    public int getProcessedCount() {
        return processedCount.get();
    }
}
