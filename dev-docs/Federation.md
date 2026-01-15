# Federation Architecture Documentation

Comprehensive documentation of the federation system: FedX core, old MpFederation (archived), and our customizations.

---

## Table of Contents

1. [Overview](#overview)
2. [Architecture Diagram](#architecture-diagram)
3. [FedX Core](#fedx-core)
4. [Our Customizations](#our-customizations)
5. [Old MpFederation (Archived)](#old-mpfederation-archived)
6. [Known Issues & Solutions](#known-issues--solutions)

---

## Overview

The federation system allows querying multiple RDF repositories as a single unified data source. We transitioned from a custom MpFederation implementation to the standard RDF4J FedX, adding customizations for REST services and query hints.

### Architecture Stack

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              SPARQL Query                                   │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                     MpFederationSailRepository                              │
│  (Wraps FedX SAIL, adds service descriptor loading)                         │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           MpFederation (SAIL)                               │
│  (Extends FedX with: repository mappings, REST detection, query hints)     │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│               QueryHintAwareSparqlFederationEvalStrategy                    │
│  (Custom strategy: query hints, SynchronousRestServiceJoin for REST)       │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                    ┌───────────────┴───────────────┐
                    ▼                               ▼
        ┌───────────────────┐           ┌───────────────────────┐
        │  SPARQL Endpoints │           │    REST Services      │
        │  (Parallel Join)  │           │  (Synchronous Join)   │
        └───────────────────┘           └───────────────────────┘
```

---

## Architecture Diagram

### Query Execution Flow

```
                         Query Execution Flow
                         ═══════════════════

     ┌──────────────────────────────────────────────────────────────┐
     │                    SPARQL Query String                        │
     └──────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
     ┌──────────────────────────────────────────────────────────────┐
     │              FedXConnection.evaluateInternal()               │
     │  - Creates FederationEvalStrategy                            │
     │  - Creates QueryInfo (timeout, metadata)                     │
     │  - Wraps result in StopRemainingExecutionsOnCloseIteration   │
     └──────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
     ┌──────────────────────────────────────────────────────────────┐
     │               FederationEvalStrategy.optimize()               │
     │  Optimization Pipeline:                                       │
     │  1. GenericInfoOptimizer - adds QueryInfo to nodes           │
     │  2. SourceSelection - determines which endpoints answer each │
     │     statement pattern (via ASK queries)                      │
     │  3. StatementGroupAndJoinOptimizer - groups statements by    │
     │     source, optimizes join order                             │
     │  4. FilterOptimizer - pushes filters to sources              │
     │  5. ServiceOptimizer - handles SERVICE clauses               │
     │  6. LimitOptimizer - pushes LIMIT to single-source queries   │
     │  7. UnionOptimizer - optimizes UNION operations              │
     └──────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
     ┌──────────────────────────────────────────────────────────────┐
     │               FederationEvalStrategy.evaluate()              │
     │  Evaluates the optimized query tree:                         │
     │  - NJoin → executeJoin() → ControlledWorkerJoin              │
     │  - NUnion → executeUnion() → ControlledWorkerUnion           │
     │  - FedXService → evaluateService()                           │
     │  - StatementPattern → evaluateTriplePattern()                │
     └──────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
     ┌──────────────────────────────────────────────────────────────┐
     │                  CloseableIteration<BindingSet>              │
     │  Results streamed back to caller                              │
     └──────────────────────────────────────────────────────────────┘
```

---

## FedX Core

FedX is RDF4J's built-in query federation engine. Location: `rdf4j/tools/federation/`

### Core Classes

| Class | Purpose |
|-------|---------|
| `FedX.java` | Main SAIL implementation, manages federation members |
| `FedXConnection.java` | Connection, orchestrates optimization and evaluation |
| `FedXConfig.java` | Configuration: thread counts, timeouts, bound join settings |
| `FederationContext.java` | Holds strategy factory, scheduler, config |
| `FederationManager.java` | Manages federation lifecycle and endpoints |
| `QueryManager.java` | Prefix management, query string utilities |
| `EndpointManager.java` | Endpoint lifecycle management |

### Evaluation Layer

| Class | Purpose |
|-------|---------|
| `FederationEvalStrategy.java` | **Core** - optimization pipeline and evaluation logic (1298 lines) |
| `SparqlFederationEvalStrategy.java` | SPARQL-specific: bound joins with VALUES clause |
| `SailFederationEvalStrategy.java` | Local SAIL repositories |
| `TripleSource.java` | Abstract interface for querying endpoints |
| `SparqlTripleSource.java` | HTTP SPARQL endpoint access |
| `SailTripleSource.java` | Local SAIL access |

### Join Executors

FedX uses parallel join execution with a work-queue model:

| Class | Purpose |
|-------|---------|
| `JoinExecutorBase.java` | Abstract base - queue-based result collection |
| `ControlledWorkerJoin.java` | Parallel nested-loop join (schedules all immediately) |
| `ControlledWorkerBindJoin.java` | Bound join using VALUES clause |
| `ControlledWorkerBoundJoin.java` | Alternative bound join implementation |
| `SynchronousJoin.java` | Sequential join (still uses background thread!) |
| `HashJoin.java` | In-memory hash join |
| `ControlledWorkerLeftJoin.java` | LEFT OUTER JOIN support |

### Concurrent Execution

| Class | Purpose |
|-------|---------|
| `ControlledWorkerScheduler.java` | Thread pool with queue, FIFO task scheduling |
| `ParallelExecutorBase.java` | Base class for parallel iterators |
| `ParallelTask.java` | Interface for schedulable tasks |
| `FedXQueueCursor.java` | Blocking queue for result iteration |

### Optimizers

| Optimizer | Purpose |
|-----------|---------|
| `GenericInfoOptimizer` | Attaches QueryInfo to all nodes |
| `SourceSelection` | Determines which endpoints can answer each pattern |
| `StatementGroupAndJoinOptimizer` | Groups patterns by source, orders joins |
| `FilterOptimizer` | Pushes FILTER expressions closer to sources |
| `ServiceOptimizer` | Wraps SERVICE clauses in FedXService nodes |
| `LimitOptimizer` | Pushes LIMIT into single-source subqueries |
| `UnionOptimizer` | Optimizes UNION by parallelizing branches |
| `DefaultFedXCostModel` | Estimates cardinality for join ordering |

### Algebra Nodes

FedX extends RDF4J's query algebra with federation-aware nodes:

| Node | Purpose |
|------|---------|
| `NJoin` | N-ary join (vs RDF4J's binary Join) |
| `NUnion` | N-ary union |
| `FedXService` | Wrapped SERVICE clause with source info |
| `FedXStatementPattern` | Statement pattern with source annotations |
| `ExclusiveGroup` | Multiple patterns from the same source (batched) |
| `ExclusiveStatement` | Single pattern exclusive to one source |
| `StatementSourcePattern` | Pattern with multiple possible sources |
| `BoundJoinTupleExpr` | Marker interface for bound-join-capable expressions |
| `CheckStatementPattern` | Pattern for existence check (used in bound join) |
| `FilterExpr` | Conjunctive filter expression |
| `ConjunctiveFilterExpr` | Combined filters for push-down |

### Key Configuration (FedXConfig)

| Property | Default | Purpose |
|----------|---------|---------|
| `boundJoinBlockSize` | 25 | Bindings per VALUES clause in bound join |
| `enableServiceAsBoundJoin` | true | Use bound join for SERVICE clauses |
| `joinWorkerThreads` | 20 | Thread pool size for joins |
| `unionWorkerThreads` | 20 | Thread pool size for unions |
| `enforceMaxQueryTime` | 30 | Default query timeout (seconds) |
| `debugQueryPlan` | false | Log optimized query plans |
| `logQueryPlan` | false | Log plans at INFO level |
| `includeInferredDefault` | true | Include inferred statements |
| `sourceSelectionCacheSpec` | - | Guava cache spec for ASK results |

---

## Our Customizations

Location: `src/main/java/org/researchspace/federation/`

### Custom Classes

#### Repository Layer

| Class | Purpose |
|-------|---------|
| `MpFederation.java` | Extends FedX: repository mappings, REST detection |
| `MpFederationFactory.java` | SAIL factory for MpFederation |
| `MpFederationConfig.java` | Configuration with legacy options |
| `MpFederationSailRepository.java` | Repository wrapper, loads service descriptors |
| `MpFederationSailRepositoryFactory.java` | Repository factory |
| `MpFederationSailRepositoryConfig.java` | Repository configuration |
| `FederationSailBooleanQueryWrapper.java` | Boolean query wrapper |
| `MpSparqlServiceRegistry.java` | Custom federated service registry for SERVICE clauses |

#### Evaluation Layer

| Class | Purpose |
|-------|---------|
| `QueryHintAwareFederationEvaluationStrategyFactory.java` | Creates our custom strategy |
| `QueryHintAwareSparqlFederationEvalStrategy.java` | **Core** - query hints + REST detection |
| `QueryHintAwareJoinOptimizer.java` | Join ordering with query hints |
| `SynchronousRestServiceJoin.java` | **Key** - Lazy evaluation for REST services |

#### Optimizers

| Class | Purpose |
|-------|---------|
| `QueryHintsExtractor.java` | Extracts `executeFirst`/`executeLast` hints |
| `QueryHintsSetup.java` | Stores extracted hints |
| `MpQueryHintsSyncOptimizer.java` | Syncs hints after tree restructuring |

### Key Features

#### 1. REST Service Detection

```java
// MpFederation.isRestBackedService()
public boolean isRestBackedService(String serviceUri) {
    IRI serviceIri = SimpleValueFactory.getInstance().createIRI(serviceUri);
    String repoId = repositoryIDMappings.get(serviceIri);
    
    if (repoId != null && repositoryManagerProvider != null) {
        Repository repo = repositoryManagerProvider.get().getRepository(repoId);
        if (repo instanceof SailRepository) {
            var sail = ((SailRepository) repo).getSail();
            return sail instanceof AbstractServiceWrappingSail;  // REST SAILs
        }
    }
    return false;
}
```

This allows different join strategies for REST vs SPARQL endpoints.

#### 2. Query Hints

Support for `executeFirst` and `executeLast` hints to control join order:

```sparql
PREFIX hint: <http://www.bigdata.com/queryHints#>
SELECT * WHERE {
  ?s ?p ?o .
  HINT %hint:executeFirst "true" .
  
  SERVICE <http://...> { ... }  # Will execute first
}
```

#### 3. Synchronous REST Service Join

When a SERVICE targets a REST endpoint, we use `SynchronousRestServiceJoin` instead of `ControlledWorkerJoin`:

```java
// QueryHintAwareSparqlFederationEvalStrategy.executeJoin()
if (rightArg instanceof FedXService) {
    FedXService fedXService = (FedXService) rightArg;
    if (isRestBackedService(fedXService)) {
        // True lazy evaluation - respects LIMIT!
        return new SynchronousRestServiceJoin(this, leftIter, rightArg, bindings, queryInfo);
    }
}
// Otherwise use parallel FedX joins
```

---

## Old MpFederation (Archived)

Location: `research-old/src/main/java/org/researchspace/federation/`

The old federation was a custom implementation based on RDF4J's deprecated Federation SAIL.

### Key Differences from FedX

| Aspect | Old MpFederation | FedX |
|--------|------------------|------|
| **Base** | RDF4J Federation SAIL | Native FedX implementation |
| **Source Selection** | Manual (via config) | Automatic (ASK queries) |
| **Optimizers** | 15+ custom | 8 standard |
| **Query Hints** | Full support | Added via our customizations |
| **Competing Join** | Yes (FedSearch paper) | No |
| **Aggregate Services** | Yes (median, etc.) | No |
| **Thread Pool** | 40 fixed threads | 20 controlled workers |
| **Bound Join Batch** | 10 | 25 |

### Old Join Strategies

| Class | Description |
|-------|-------------|
| `ParallelAsyncJoinCursor` | Async parallel join with 40 threads |
| `ParallelAsyncJoinCursorWithCache` | + caching to avoid duplicate probes |
| `ParallelBoundJoinCursor` | Batched bound join (batch size 10) |
| `ParallelTimeEstimatingPullBoundRankJoin` | Competing join from FedSearch paper |

### Old Optimization Pipeline

```
1.  BindingAssigner
2.  ConstantOptimizer
3.  CompareOptimizer
4.  ConjunctiveConstraintSplitter
5.  DisjunctiveConstraintOptimizer
6.  SameTermFilterOptimizer
7.  QueryModelPruner
8.  MpQueryNaryJoinExtractor
9.  QueryHintsExtractor
10. MpFederationJoinOptimizerWithHints
11. MpFederationServiceClauseOptimizer
12. MpOwnedTupleExprPruner
13. QueryModelPruner
14. MpQueryHintsSyncOptimizer
15. MpQueryJoinOrderOptimizer
16. MpPostJoinReorderingLocalJoinOptimizer
17. MpPrepareOwnedTupleExpr
```

---

## Known Issues & Solutions

### Issue 1: LIMIT Not Respected for REST Services

**Problem**: With a query like:
```sparql
SELECT * WHERE {
  SERVICE :SearchService { ?x :q "vase"; :objectIDs ?id. }  # Returns 30k IDs
  SERVICE :ObjectService { ?y :id ?id; :title ?t. }        # 1 HTTP call per ID
} LIMIT 100
```

FedX's parallel join schedules ALL 30,000 HTTP calls before any results are consumed.

**Root Cause**: `ControlledWorkerJoin.handleBindings()` runs in a background thread:
```java
while (!isClosed() && leftIter.hasNext()) {
    scheduler.schedule(task);  // ALL scheduled immediately
}
phaser.await();  // Wait for ALL to complete
```

By the time LIMIT triggers `close()`, all tasks are already scheduled.

**Solution**: `SynchronousRestServiceJoin` with bounded prefetching:
```java
// Prefetcher thread (background):
while (!isClosed() && leftIter.hasNext()) {
    BindingSet binding = leftIter.next();
    Future<CloseableIteration> future = executor.submit(() -> 
        strategy.evaluate(rightArg, binding)  // HTTP call
    );
    resultQueue.put(future.get());  // Blocks if queue full (bounded)
}

// Consumer thread (getNextElement):
CloseableIteration next = resultQueue.poll();  // Get prefetched result
return next.next();
```

**Trade-off**: With `prefetchSize=5` and `LIMIT 20`:
- Best case: ~20 HTTP calls
- Worst case: ~25 HTTP calls (20 + 5 prefetched)
- But ~5x faster than pure sequential execution!

**Configuration**: `ephedra:restServicePrefetchSize` (default: 5)

### Issue 2: VALUES Clause Not Supported by REST

**Problem**: FedX uses bound join with VALUES clause for efficiency:
```sparql
SELECT * WHERE { ?s ?p ?o } VALUES (?s) { (<uri1>) (<uri2>) ... }
```

REST services cannot parse SPARQL - they need individual calls.

**Solution**: Detect REST services and disable bound join:
```java
if (isRestBackedService(fedXService)) {
    return new SynchronousRestServiceJoin(...);  // One call at a time
}
```

### Issue 3: Query Hint Support

**Problem**: FedX doesn't support query hints for join ordering.

**Solution**: Custom optimizer pipeline in `QueryHintAwareSparqlFederationEvalStrategy`:
```java
@Override
protected void optimizeJoinOrder(TupleExpr query, QueryInfo queryInfo, GenericInfoOptimizer info) {
    QueryHintsExtractor hintsExtractor = new QueryHintsExtractor();
    hintsExtractor.optimize(query, null, null);
    QueryHintsSetup queryHintsSetup = hintsExtractor.getQueryHintsSetup();
    
    new MpQueryHintsSyncOptimizer(queryHintsSetup).optimize(query, null, null);
    new QueryHintAwareJoinOptimizer(queryInfo, DefaultFedXCostModel.INSTANCE, queryHintsSetup).optimize(query);
}
```

### Issue 4: ORDER BY with REST Services

**Problem**: When using `ORDER BY` on a variable that comes from a REST service, all HTTP calls must be made before sorting can occur. This defeats the lazy evaluation that makes `LIMIT` efficient.

**Example**:
```sparql
SELECT * WHERE {
  SERVICE :SearchService { ?x :q "vase"; :objectIDs ?id. }  # Returns 30k IDs
  SERVICE :ObjectService { ?y :id ?id; :title ?title. }     # 1 HTTP call per ID
}
ORDER BY ?title  # Requires ALL titles before sorting!
LIMIT 20
```

**Why it happens**: The `ORDER BY` operator must consume ALL child results before it can sort them. Even though `SynchronousRestServiceJoin` processes bindings lazily, the ORDER operator keeps calling `next()` until all results are collected.

**Impact**:
- Without ORDER BY: Only ~20 HTTP calls (lazy evaluation works ✅)
- With ORDER BY on REST variable: ALL 30k HTTP calls required (slow ⚠️)

**Workarounds**:
1. **Remove ORDER BY**: If ordering isn't critical, omit it to benefit from lazy evaluation
2. **ORDER BY on first service variable**: If you can order by a variable from the first service (which returns all values in one call), sorting doesn't block lazy evaluation
3. **Client-side sorting**: Retrieve unordered results with LIMIT, then sort in application code
4. **Accept the performance**: For correctness, all results must be fetched before sorting

> [!NOTE]
> The old MpFederation implementation appeared to handle this case faster, but it was due to a bug: a race condition caused early termination, returning results sorted from only a subset of the data (e.g., 122 out of 30,000 items). The current implementation is **correct** - it fetches all results before sorting to ensure proper ORDER BY semantics.

> [!WARNING]
> Queries combining `ORDER BY` on a REST service variable with `LIMIT` will be slow because all HTTP calls must complete before sorting and limiting can occur.

---

## Configuration Reference

### Ephedra Federation Configuration

```turtle
@prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#> .
@prefix rep: <http://www.openrdf.org/config/repository#> .
@prefix sail: <http://www.openrdf.org/config/sail#> .
@prefix mph: <http://www.researchspace.org/resource/system/> .
@prefix ephedra: <http://www.researchspace.org/resource/system/ephedra#> .
@prefix fedx: <http://rdf4j.org/config/federation#> .

[] a rep:Repository ;
   rep:repositoryID "ephedra" ;
   rdfs:label "Ephedra Federation" ;
   rep:repositoryImpl [
      rep:repositoryType "openrdf:SailRepository" ;
      sail:sailImpl [
         sail:sailType "researchspace:Federation" ;
         mph:defaultMember "default" ;
         ephedra:serviceReference <http://example.org/Service1> ;
         ephedra:serviceReference <http://example.org/Service2> ;
         
         # FedX configuration (optional)
         fedx:config [
            fedx:enforceMaxQueryTime 120 ;
            fedx:joinWorkerThreads 20 ;
            fedx:debugQueryPlan false
         ]
      ]
   ] .
```

### FedX Configuration Properties

All properties use the `fedx:` namespace (`http://rdf4j.org/config/federation#`).

| Property | Default | Description |
|----------|---------|-------------|
| `enforceMaxQueryTime` | **120** | Query timeout in seconds (0 = disabled). Our default is 120s, FedX default is 30s. |
| `joinWorkerThreads` | 20 | Thread pool size for parallel join operations |
| `unionWorkerThreads` | 20 | Thread pool size for parallel union operations |
| `leftJoinWorkerThreads` | 10 | Thread pool size for LEFT JOIN operations |
| `boundJoinBlockSize` | 25 | Number of bindings per VALUES clause in bound join |
| `enableServiceAsBoundJoin` | true | Use VALUES clause for SERVICE evaluation (vectored) |
| `enableOptionalAsBindJoin` | true | Use bind join for OPTIONAL clauses |
| `enableMonitoring` | false | Enable monitoring features |
| `debugQueryPlan` | false | Print optimized query plan to stdout |
| `logQueryPlan` | false | Log query plan via QueryPlanLog |
| `logQueries` | false | Log all queries to file |
| `includeInferredDefault` | true | Include inferred statements by default |
| `sourceSelectionCacheSpec` | - | Guava CacheBuilderSpec for source selection cache |
| `consumingIterationMax` | 1000 | Max results consumed by ConsumingIteration |

> [!NOTE]
> Legacy `ephedra:config` is still supported for backwards compatibility, but `fedx:config` is preferred.

### Service Descriptor

```turtle
@prefix sp: <http://spinrdf.org/sp#> .
@prefix ephedra: <http://www.researchspace.org/resource/system/ephedra#> .

<http://example.org/MyService> a ephedra:Service ;
    rdfs:label "My Service" ;
    ephedra:hasSail [
        a ephedra:RESTSail ;
        ephedra:httpMethod "GET" ;
        ephedra:url "https://api.example.org/search" ;
        # ... parameter mappings
    ] .
```

### REST Service Configuration Properties

| Property | Description |
|----------|-------------|
| `ephedra:httpMethod` | HTTP method: GET, POST |
| `ephedra:serviceURL` | Base URL of the REST service |
| `ephedra:inputFormat` | Input format for POST: JSON, FORM |
| `ephedra:mediaType` | Response content type expected |
| `ephedra:jsonPath` | JSONPath to extract results |
| `ephedra:ignoreHttpErrors` | If true, HTTP 4xx/5xx return empty instead of failing |
| `ephedra:requestRateLimit` | Max requests per second (rate limiting) |
| `ephedra:userAgent` | Custom User-Agent header |