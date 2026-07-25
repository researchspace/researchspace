# Federation Architecture Documentation

Comprehensive documentation of the federation system: FedX core, old MpFederation (archived), and our customizations.

---

## Table of Contents

1. [Overview](#overview)
2. [Architecture Diagram](#architecture-diagram)
3. [FedX Core](#fedx-core)
4. [Our Customizations](#our-customizations)
5. [Old MpFederation (Archived)](#old-mpfederation-archived)
6. [Monitoring & Logging](#monitoring--logging)
7. [Known Issues & Solutions](#known-issues--solutions)
8. [Deferred Work (TODOs)](#deferred-work-todos)

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
| `boundJoinBlockSize` | **100** | Bindings per VALUES clause in bound join (our default, FedX default is 25) |
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
| `QueryHintAwareSparqlFederationEvalStrategy.java` | **Core** - query hints + REST detection + ExclusiveGroup/ExclusiveSubquery bind join |
| `QueryHintAwareJoinOptimizer.java` | Join ordering with query hints + single-source NJoin pushdown |
| `SynchronousRestServiceJoin.java` | **Key** - Lazy evaluation for REST services |
| `GuardedServiceBindLeftJoin.java` (in `org.eclipse.rdf4j.federated.evaluation.join`) | Batched VALUES left join for `OPTIONAL { SERVICE <member> }`, with optional left-evaluable guard condition |
| `ExclusiveSubquery.java` | Wraps single-source NJoin trees (including NUnion) for subquery pushdown |
| `ExclusiveGroupQueryBuilder.java` | Builds VALUES-based SPARQL queries for ExclusiveGroup bind joins |

#### Optimizers

| Class | Purpose |
|-------|---------|
| `QueryHintsExtractor.java` | Extracts `executeFirst`/`executeLast` hints |
| `QueryHintsSetup.java` | Stores extracted hints |
| `MpQueryHintsSyncOptimizer.java` | Syncs hints after tree restructuring |
| `BoundJoinExclusiveGroupOptimizer.java` | Replaces `ExclusiveGroup` → `BoundJoinExclusiveGroup` in query plan |
| `BoundJoinExclusiveGroup.java` | `extends ExclusiveGroup implements BoundJoinTupleExpr` marker |

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

Support for `executeFirst` and `executeLast` hints to control join order. Hints
are plain triples in the `ephedra:` namespace, extracted (and removed) by
`QueryHintsExtractor` before join optimization:

```sparql
PREFIX ephedra: <http://www.researchspace.org/resource/system/ephedra#>
PREFIX xsd: <http://www.w3.org/2001/XMLSchema#>
SELECT * WHERE {
  SERVICE <http://...search-service> { ... }
  ephedra:Prior ephedra:executeFirst "true"^^xsd:boolean .   # applies to the SERVICE above
  SERVICE <http://...other-member> { ... }
}
```

Available hints:

| Hint triple | Effect |
|---|---|
| `ephedra:Prior ephedra:executeFirst "true"^^xsd:boolean` | Evaluate the **preceding** join operand first |
| `ephedra:Prior ephedra:executeLast "true"^^xsd:boolean` | Evaluate the **preceding** join operand last |
| `ephedra:Query ephedra:disableJoinReordering "true"^^xsd:boolean` | Keep the textual join order for the whole query |

> [!WARNING]
> `ephedra:Prior` attaches to the **preceding sibling in the same join group**
> (`QueryHintsExtractor.getPreviousJoinOperand`). A hint placed as the *first*
> element of a group attaches to nothing and is **silently dropped**. Always
> place the hint *after* the pattern or SERVICE clause it applies to.
>
> Hints are rarely needed for dependent SERVICE ordering, though: the join
> optimizer defers a member SERVICE whose descriptor-declared input arguments
> are not yet bound until another join argument can produce them
> (`QueryHintAwareJoinOptimizer.orderCostAndInputAware`), so a REST search
> automatically runs before the detail service it feeds.

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
| **Aggregate Services** | Yes (median, etc.) | Yes — median is an rdf4j custom aggregate now (same IRI, works in every repository type, see `MedianAggregateFactory`) |
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

## Monitoring & Logging

### 1. Incoming Query Logging (FedX built-in)

FedX's `QueryLog` logs the top-level incoming query via SLF4J logger `"QueryLog"` at INFO level.

**Requirements:**
- Set `fedx:enableMonitoring true` and `fedx:logQueries true` in the federation config
- Use `log4j2-debug.xml` or `log4j2-trace.xml` logging profile (the `QueryLog` logger is configured there)

### 2. Outgoing Query Logging (central, all SPARQL repos)

All outgoing SPARQL queries are logged at **TRACE** level by `CustomSPARQLConnection` — the central connection class used by all RS SPARQL repository implementations. This captures every SELECT, ASK, and CONSTRUCT query sent to any SPARQL endpoint, including:

- Federation default member queries
- FedX bound-join sub-queries (VALUES)
- FedX source-selection ASK probes
- Standalone (non-federated) repository queries

**Log format:**
```
TRACE Outgoing SPARQL SELECT to [endpoint]: SELECT ?x WHERE { ... }
TRACE Outgoing SPARQL ASK to [endpoint]: ASK { ... }
```

**Requirements:**
- Use `log4j2-trace.xml` logging profile
- No config flags needed — logging is gated behind `logger.isTraceEnabled()` with zero overhead in production

**Covered repository implementations:**
| Repository | Inherits `CustomSPARQLConnection`? |
|---|---|
| `CustomSPARQLRepository` | ✅ (base class) |
| `SPARQLAuthenticatingRepository` | ✅ (extends `CustomSPARQLRepository`) |
| `SPARQLBearerTokenAuthRepository` | ✅ (extends `CustomSPARQLRepository`) |
| `QLeverRepository` | ✅ (extends `CustomSPARQLRepository`) |

### Log4j2 Configuration

The `QueryLog` logger and `org.eclipse.rdf4j.federated` logger are defined in `log4j2-debug.xml` and `log4j2-trace.xml`:
```xml
<!-- FedX federation: optimized query plans logged here at DEBUG -->
<Logger name="org.eclipse.rdf4j.federated" level="debug" additivity="false">
  <AppenderRef ref="LOGFILE"/>
  <AppenderRef ref="STDOUT"/>
</Logger>

<!-- FedX incoming query log (requires enableMonitoring + logQueries in fedx:config) -->
<Logger name="QueryLog" level="debug" additivity="false">
  <AppenderRef ref="LOGFILE"/>
  <AppenderRef ref="STDOUT"/>
</Logger>
```

Production `log4j2.xml` intentionally does NOT include these loggers.

> [!NOTE]
> When `fedx:logQueryPlan true` is set, `enableMonitoring` is automatically enabled by `MpFederationConfig`.
> The `debugQueryPlan` option (which prints to stdout) is silently forced off — use `logQueryPlan` instead.

### 3. Source Selection Cache Invalidation

FedX caches the results of source-selection ASK probes in a `SourceSelectionMemoryCache` (default: `maximumSize=1000, expireAfterWrite=6h`). This avoids redundant ASK requests but can cause stale results when data is inserted into a federation member — patterns that previously returned `NONE` may now have data, but FedX won't re-check.

**Automatic invalidation:** During federation initialization, `MpFederationSailRepository` registers the FedX source selection cache as a `PlatformCache` with the platform `CacheManager`. This means any operation that calls `CacheManager.invalidateAll()` — including SPARQL UPDATE execution, form persistence, and LDP operations — automatically clears the source selection cache.

**Manual invalidation:** Call the cache invalidation REST endpoint (`/rest/cache/all/invalidate`) to clear all caches including source selection.

---

## Important Conventions

### Always use `researchspace:FederationSailRepository` for FedX federations

> [!CAUTION]
> **Never** use `fedx:FedXRepository` or `fedx:store "SPARQLEndpoint"` directly. Standard FedX bypasses the platform's `MpSharedHttpClientSessionManager` (no User-Agent), our `QueryHintAwareSparqlFederationEvalStrategy` (no REST service support, no ExclusiveGroup bind join), and `CustomSPARQLConnection` (no outgoing query TRACE logging).

**Correct pattern:**
1. Create standalone SPARQL repo configs for external endpoints (e.g. `wikidata-sparql.ttl`):
   ```turtle
   [] a config:Repository ;
      config:rep.id "wikidata-sparql" ;
      config:rep.impl [
         config:rep.type "researchspace:SPARQLRepository" ;
         config:sparql.queryEndpoint <https://qlever.dev/api/wikidata>
      ] .
   ```
2. Use `researchspace:FederationSailRepository` with both `config:fed.member` (Ephedra services) and `fedx:member` (SPARQL endpoints) as direct members:
   ```turtle
   [] a config:Repository ;
       config:rep.id "ephedra" ;
       config:rep.impl [
           config:rep.type "researchspace:FederationSailRepository" ;
           config:sail.impl [
               config:sail.type "researchspace:Federation" ;
               # Ephedra services
               config:fed.member [
                   ephedra:delegateRepositoryID "nominatim-search" ;
                   ephedra:serviceReference <http://.../NominatimSearchService>
               ] ;
               # SPARQL endpoint members (FedX auto-selects sources)
               fedx:member [
                   fedx:store "ResolvableRepository" ;
                   fedx:repositoryName "wikidata-sparql"
               ] ;
               ephedra:defaultMember "default"
           ]
       ] .
   ```

`MpFederationConfig` parses both `config:fed.member` and `fedx:member` entries. `MpFederationSailRepository` adds SPARQL endpoints as real FedX federation members (with source selection). All HTTP traffic flows through `MpSharedHttpClientSessionManager` (User-Agent) and all outgoing SPARQL queries are logged at TRACE level by `CustomSPARQLConnection`.

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
1. **Bound the source with `ephedra:rowLimit`** (preferred): declare an input
   argument flagged `ephedra:rowLimit true` on the search service descriptor
   and set it in the query (`?subject met:limit "50"`). The value caps the
   number of rows parsed from the service response — a declared "top N hits"
   bound that is NOT sent to the remote API — so downstream per-row joins and
   ORDER BY cannot fan out beyond N. With the source bounded, `ORDER BY` an
   `ephedra:rowIndex` ordinal is safe and free (it sorts N already-fetched
   rows). This is what the MET import does.
2. **Remove ORDER BY**: If ordering isn't critical, omit it to benefit from lazy evaluation.
   Lazy REST joins preserve the first service's response order and DISTINCT is
   streaming, so results already arrive in the search API's relevance order.
3. **Client-side sorting**: Retrieve unordered results with LIMIT, then sort in application code
4. **Accept the performance**: For correctness, all results must be fetched before sorting

> [!CAUTION]
> "ORDER BY a variable from the *first* service" is NOT a workaround on its
> own, even though that service returns all its rows in one call (e.g. an
> `ephedra:rowIndex` ordinal): the ORDER operator still consumes the ENTIRE
> child iteration before sorting, which drives the downstream per-row service
> through every row regardless of the final LIMIT. Adding `ORDER BY ?ordinal`
> to the MET import without a source bound did exactly this — one search for a
> broad term fired a details request for every one of thousands of matching
> object ids and got the deployment IP 403-banned by the MET WAF. Always pair
> the ordinal with an `ephedra:rowLimit` bound (workaround 1).
>
> Note the query's own LIMIT cannot be pushed into the source automatically:
> downstream joins may drop rows (non-matching details,
> `ephedra:ignoreHttpErrors`) or multiply them, so "first N final results" is
> not "first N search hits" — the bound has to be declared query semantics.

> [!NOTE]
> The old MpFederation implementation appeared to handle this case faster, but it was due to a bug: a race condition caused early termination, returning results sorted from only a subset of the data (e.g., 122 out of 30,000 items). The current implementation is **correct** - it fetches all results before sorting to ensure proper ORDER BY semantics.

> [!WARNING]
> Queries combining `ORDER BY` on a REST service variable with `LIMIT` will be slow because all HTTP calls must complete before sorting and limiting can occur.

### Issue 5: ExclusiveGroup N-Query Blow-Up (JOIN/OPTIONAL + SERVICE)

**Problem**: When a `SERVICE` returns N results and those results are joined against the default repository via multiple triple patterns (creating an `ExclusiveGroup`), FedX sends **N individual queries** — one per left binding — instead of batching them.

**Example**:
```sparql
SELECT * WHERE {
  SERVICE :SearchService { ?x :q "vase"; :objectIDs ?id. }  # Returns 40 IDs
  ?record :hasObjectId ?id .  # These form an ExclusiveGroup
  ?record :hasLabel ?label .  # (multiple patterns, same endpoint)
}
```

With 40 SERVICE results → 40 separate queries to the default repository.

**Root Cause**: FedX's `ExclusiveGroup` does not implement `BoundJoinTupleExpr`. The bind join check in `executeJoin()`/`executeLeftJoin()` (`rightArg instanceof BoundJoinTupleExpr`) always fails, so FedX falls back to `ControlledWorkerJoin`/`ControlledWorkerLeftJoin` which evaluates each binding individually. Additionally, `evaluateBoundJoinStatementPattern` casts to `(StatementPattern)` — no ExclusiveGroup support.

**Solution**: Three components:

1. **`BoundJoinExclusiveGroup`** (`org.eclipse.rdf4j.federated.algebra`) — Marker subclass: `extends ExclusiveGroup implements BoundJoinTupleExpr`. Uses same-package access to copy protected fields from the original.

2. **`BoundJoinExclusiveGroupOptimizer`** — Runs after other optimizers, walks the query plan, replaces `ExclusiveGroup` → `BoundJoinExclusiveGroup` via `parent.replaceChildNode()`. This makes FedX's existing routing choose `ControlledWorkerBindJoin`/`ControlledWorkerBindLeftJoin`.

3. **`evaluateBoundJoinStatementPattern` + `evaluateLeftBoundJoinStatementPattern` overrides** — Detect `ExclusiveGroup` and build a VALUES-based SPARQL query using `ExclusiveGroupQueryBuilder` (in `org.eclipse.rdf4j.federated.util` for same-package access to `QueryStringUtil.constructJoinArg()`).

**Result**: N queries → 1 query (or ⌈N/25⌉ for large N, batched by `boundJoinBlockSize`).

```
# Before fix:
JOIN+SERVICE (N=10): endpointEvals=10  (one query per binding)

# After fix:
JOIN+SERVICE (N=10): endpointEvals=0   (one VALUES query)
```

---

### Issue 6: Redundant Source Selection with Single Federation Member

**Problem**: When the Ephedra federation has only one real FedX member (the default repository, typically Blazegraph), FedX still performs full source selection — sending ASK queries to check which endpoint provides data for each triple pattern. For queries with `SERVICE` + `OPTIONAL`, this generates **tens of thousands of individual ASK queries** due to `CheckStatementPattern` evaluating every binding individually.

**Root Cause**: FedX has a `SingleSourceQuery` optimization that would send the entire query to the single member, but `propagateServices()` returns `false` when `SERVICE` clauses are present (since the single member can't evaluate Ephedra REST services). The `ephedra.ttl` typically has zero `fedx:member` entries — only Ephedra REST services (`config:fed.member`) and `ephedra:defaultMember "default"`.

**Solution**: Override `performSourceSelection()` in `QueryHintAwareSparqlFederationEvalStrategy`. When `members.size() == 1`, annotate all statement patterns as `ExclusiveStatement` for the single endpoint without sending any ASK queries. This feeds into the Issue 5 fix: patterns form `ExclusiveGroup` → `BoundJoinExclusiveGroup` → VALUES-batched queries.

**Result**: ~86K ASK queries → 0 ASK queries. OPTIONAL/JOIN patterns are evaluated via 1 VALUES query.

---

### Issue 7: Wrong Join Order Inside OPTIONAL (Outer-Scope Variable Unawareness)

**Problem**: When a query has `SERVICE` → `BIND` → `OPTIONAL { ... }`, the OPTIONAL body's triple patterns are reordered by FedX's cost model without considering which variables are bound from the outer scope. This causes fully-unbound queries to be sent to Blazegraph, scanning entire tables.

**Example**: `?citableReference` is computed via `BIND` in the outer scope, but the OPTIONAL's NJoin puts `ExclusiveGroup(P1, P2)` first (no `?citableReference`) instead of the NUnion that uses `?citableReference`. The ExclusiveGroup produces a fully unbound query: `SELECT ?identifier ?existingRecord WHERE { ?existingRecord P1 ?identifier . ?identifier P2 crn }`.

**Root Cause**: `StatementGroupAndJoinOptimizer.meetNJoin()` → `optimizeJoinOrder()` starts with an empty `joinVars` set. It has no context about which variables are bound from the outer scope of a `FedXLeftJoin`. The `DefaultFedXCostModel` estimates ExclusiveGroup as cheaper (cost ~0) vs NUnion (cost ~100+), so ExclusiveGroup goes first despite using no outer-scope variables.

**Solution**: Override the visitor traversal in `QueryHintAwareJoinOptimizer` to track outer-scope binding names when entering a `FedXLeftJoin` right side. The left side's `getBindingNames()` are captured and passed as initial `joinVars` to the cost model when ordering the right side's NJoin children. This makes the cost model correctly identify patterns using outer-scope-bound variables as cheap/selective.

**Result**: Patterns using `?citableReference` (from outer scope) are now ordered first within the OPTIONAL body. The subsequent ExclusiveGroup is driven by the results of the first pattern, producing a properly constrained query instead of a full table scan.

---

### Issue 8: NJoin Subquery Pushdown with VALUES Batching

**Problem**: SPARQL property paths like `(crm:P190|rdfs:label)` expand into `NJoin(NUnion, ExclusiveGroup)` inside OPTIONAL clauses. Even when all children target the same single endpoint, FedX evaluates them separately — the NUnion and ExclusiveGroup each produce individual per-binding queries, doubling the query count.

**Example**:
```sparql
OPTIONAL {
  ?existingRecord crm:P1_is_identified_by ?identifier .
  ?identifier crm:P2_has_type <.../crn> ;
              (crm:P190_has_symbolic_content|rdfs:label) ?citableReference .
}
```

The `|` expands to `NUnion(P190, rdfs:label)`, yielding a tree: `NJoin(NUnion, ExclusiveGroup(P1, P2))`. With 40 left-side bindings, this produces **80 queries** (2 per binding) without optimization.

**Solution**: Two-phase optimization:

1. **Phase 1 — NJoin Pushdown** (`QueryHintAwareJoinOptimizer.meetNJoin()`): Detects when all children of an NJoin target the same endpoint via `detectSingleSource()`. Replaces the entire NJoin with an `ExclusiveSubquery @default` node that sends a single SPARQL query (with UNION) per binding.

2. **Phase 2 — VALUES Batching**: `ExclusiveSubquery` implements `BoundJoinTupleExpr`, enabling FedX's `ControlledWorkerBindLeftJoin` to batch all bindings into a single VALUES-based query:
   ```sparql
   SELECT ?identifier ?citableReference ?existingRecord ?__index WHERE {
     VALUES (?citableReference ?__index) { ("YBBK/P/3" "0") ("RAIL 144" "1") ... }
     { ?identifier <P190> ?citableReference . }
     UNION
     { ?identifier <rdfs:label> ?citableReference . }
     ?existingRecord <P1> ?identifier .
     ?identifier <P2> <crn> .
   }
   ```

**Key classes**:
- `ExclusiveSubquery` — Algebra node wrapping the NJoin tree. Implements `StatementTupleExpr`, `ExclusiveTupleExpr`, and `BoundJoinTupleExpr`. Has `toSparqlBody()` for recursive SPARQL reconstruction and `toSelectQueryBoundJoinVALUES()` for VALUES batching.
- `QueryHintAwareJoinOptimizer.meetNJoin()` — Detects single-source NJoins, replaces with `ExclusiveSubquery`.
- `QueryHintAwareSparqlFederationEvalStrategy.evaluateExclusiveSubqueryBoundJoin()` — Handles VALUES-batched evaluation for both left and inner joins.

**Result**: 80 queries → 40 (Phase 1) → **1 query** (Phase 2, with `boundJoinBlockSize=100`).

---

### Issue 9: Per-Row Evaluation of Conditional OPTIONAL + SERVICE

**Problem**: The "enrich search results from a SPARQL member, but keep rows
that have no match" pattern was historically written as:

```sparql
SERVICE :SearchService { ?x :q "leonardo"; :id ?wikidataId . }   # 50 hits
OPTIONAL {
  BIND(IRI(CONCAT(STR(wd:), ?wikidataId)) AS ?entity)
  FILTER(BOUND(?entity))
  SERVICE <federation#wikidata-sparql> { OPTIONAL { ?entity wdt:P18 ?img } }
}
```

The `FILTER` becomes a **LeftJoin condition**. Conditional left joins cannot go
through the bind-join path (the condition would be silently dropped — see the
`executeLeftJoin` override), so FedX falls back to `ControlledWorkerLeftJoin`:
**one remote query per left binding**. 50 search hits → 50 requests to the
member endpoint, >10s per search (this was the Wikidata import slowness).

**Solution**: two batched shapes, depending on the desired semantics.

**(a) Hard filter** — write the member SERVICE as a **required inner join**;
it takes the vectored bound join path (`ControlledWorkerBindJoin` →
`evaluateService(service, List<BindingSet>)` → one VALUES query per
`boundJoinBlockSize`=100 bindings). Non-matching rows are dropped:

```sparql
SERVICE :SearchService { ?x :q "leonardo"; :entity ?entity; :ordinal ?ordinal . }
ephedra:Prior ephedra:executeFirst "true"^^xsd:boolean .
SERVICE <federation#wikidata-sparql> {
  ?entity wdt:P31/wdt:P279* wd:Q24229398 .       # required pattern = hard filter
  OPTIONAL { ?entity wdt:P18 ?img . }            # enrichment stays optional
}
```

**(b) Keep unmatched rows** — `OPTIONAL { SERVICE <member> { ... } }`.
Upstream FedX evaluates SERVICE clauses in left joins per binding (it excludes
`FedXService` from the bind left join path entirely); our
`GuardedServiceBindLeftJoin` batches them instead — one VALUES query (with a
`?__index` column joined back by `BindLeftJoinIteration`) per block, unmatched
rows re-emitted NULL-extended. Batching is **semantics-preserving**: a VALUES
row with UNDEF behaves exactly like per-binding evaluation with the variable
unbound.

> [!CAUTION]
> **Never let the join variable be unbound.** Per standard SPARQL semantics an
> unbound join variable makes the service patterns unanchored: the row
> cross-products against the *whole remote dataset* (this is true with or
> without batching — it is what the query means). Keep the variable always
> bound with a sentinel that matches nothing remotely:
>
> ```sparql
> BIND(IRI(CONCAT(STR(wd:), COALESCE(?wikidataId, "Q0-NO-WIKIDATA-TAG"))) AS ?osmPlaceURI)
> OPTIONAL {
>   SERVICE <federation#wikidata-sparql> {
>     OPTIONAL { ?osmPlaceURI rdfs:label ?_label . FILTER(LANG(?_label) = "en") }
>   }
> }
> ```
>
> Rows with the sentinel come back unenriched and survive the OPTIONAL. The
> engine logs a WARNING whenever an input row reaches a member-service left
> join with an unbound join variable.

A LeftJoin **condition** (`OPTIONAL { FILTER(...) SERVICE ... }`) is handled
per row, fully standard-compliant:

- *locally decidable* (every condition variable is either bound in the row —
  a compatible merge never re-binds it — or not producible by the service
  body — the merge can never bind it): evaluated against the row; `true` rows
  join the batch with the condition discharged, `false`/error rows pass
  through unextended;
- *undecidable* (a condition variable is unbound AND the service body could
  bind it, e.g. `FILTER(BOUND(?x))` with `?x` used in the body): the row falls
  back to strict per-binding evaluation — the bottom-up cross-product
  semantics — and a WARNING is logged;
- condition referencing variables not producible by the left side at all:
  the whole join keeps the strict `ControlledWorkerLeftJoin` path (one member
  request per row) and a WARNING is logged.

- Row order does NOT survive the parallel join + GROUP BY; project an
  `ephedra:rowIndex` column from the REST service and `ORDER BY` it to restore
  the search ranking.

**Result**: 1 REST call + 1 member request per search (was 1 + 50).

Pinned by `EphedraIntegrationTest.testRestSearchFilteredAndEnrichedBySparqlMemberInSingleBatch`,
`testOptionalServiceJoinWithoutConditionIsBatched`,
`testGuardedConditionalOptionalServiceJoinIsBatched`,
`testGuardOnVariableNotProducibleByServiceIsDecidedLocally` and
`testUnboundGuardVariableFallsBackToStrictPerRowEvaluation` (the strict
cross-product fallback for undecidable guards).

---

### Issue 10: Megabyte Geometry from Nominatim (OSM import page)

**Problem**: Nominatim with `polygon_text=1` returns the FULL boundary as WKT
— measured 1.75 MB for Ukraine, 222 KB for Russia even at
`polygon_threshold=0.005`. Interpolating that into a `query` attribute of a
`semantic-*` component (e.g. `BIND("{{geoText.value}}" AS ?wkt)`) crashes the
client-side sparqljs parser with Firefox's `InternalError: too much recursion`
— the table shows the `priority_high` error icon in the affected cells.

**Rule**: geometry (or any potentially-huge value) may flow to the client as
a query **result binding** (parsed iteratively — safe at any size), but must
NEVER be inlined into query **text**.

**Solution** (ImportFromOSM.html, July 2026):
- the search/table query binds `osm:polygon_text "0"` — no geometry at all in
  the table; instead it carries `osm_type`/`osm_id` (the identity every OSM
  result has) and the four `bbox_*` columns;
- the Map cell fetches geometry per row (one rate-limited Nominatim call per
  rendered row), joined back by `osm_type`+`osm_id`, with an
  `osm:polygon_threshold` picked from the bbox span in SPARQL: span > 2° →
  `0.01` (~1 km, sub-pixel on the 210 px preview), > 0.2° → `0.001`, else full
  geometry — only BIG entities are simplified. The threshold flows through a
  `BIND` into the SERVICE input, which relies on the descriptor-input-aware
  join ordering (`QueryHintAwareJoinOptimizer`);
- the "existing record" dedup matches the `import_from_external_source` chain
  on the wikidata-derived URI (the mechanism all other import pages use)
  instead of WKT string equality;
- the import-time field (`osm_wikidata_geo_coordinates`) is untouched and
  still stores full-precision geometry: `polygon_threshold` has NO default, so
  requests of consumers that don't bind it are byte-identical (pinned by
  `OsmSailTest`, which matches the exact request URL).

### SERVICE Clause Evaluation Contracts (verified by tests)

Facts about how a `SERVICE <federation#member>` clause is evaluated that
templates and tests rely on (member SERVICE refs resolve to rdf4j's
`RepositoryFederatedService`, registered in `MpFederationSailRepository`):

1. **The member body is forwarded verbatim, prologue included.** The query
   sent to the member is built from the Service node's raw expression string
   plus the original query's PREFIX declarations — NOT re-rendered from
   algebra. A SERVICE clause **nested inside** the member body (e.g.
   `SERVICE wikibase:mwapi { ... }` for endpoint-specific magic services) is
   passed through untouched, in a single request, preserving endpoint row
   order. Pinned by `EphedraIntegrationTest.testNestedServiceIsPassedThroughToSparqlMember`.

2. **Vectored evaluation projects `?__rowIdx`.** With >1 input binding,
   `RepositoryFederatedService` injects
   `VALUES (?__rowIdx ?boundVar ...) { ("0" <...>) ... }` and expects the
   endpoint to **echo `?__rowIdx` back** — results are joined to their input
   row by that variable (`ServiceJoinConversionIteration`), and join vars are
   not re-projected. WireMock stubs for member endpoints must therefore
   include `__rowIdx` in canned responses, or rows will cross-product.

3. **With a single (or empty) input binding** the member query is sent without
   VALUES — a canned-response stub then matches every input row. Test stubs
   must honor the endpoint contract (only return rows for the bindings
   actually requested), otherwise tests pass against behavior no real endpoint
   exhibits.

## Configuration Reference

### Ephedra Federation Configuration

The federation uses a single `researchspace:FederationSailRepository` that combines both Ephedra services
(`config:fed.member`) and SPARQL endpoint members (`fedx:member`) as direct members.

```turtle
@prefix config: <tag:rdf4j.org,2023:config/> .
@prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#> .
@prefix ephedra: <http://www.researchspace.org/resource/system/ephedra#> .
@prefix fedx: <http://rdf4j.org/config/federation#> .
@prefix xsd: <http://www.w3.org/2001/XMLSchema#> .

[] a config:Repository ;
   config:rep.id "ephedra" ;
   rdfs:label "Ephedra Federation" ;
   config:rep.impl [
      config:rep.type "researchspace:FederationSailRepository" ;
      config:sail.impl [
         config:sail.type "researchspace:Federation" ;
         ephedra:defaultMember "default" ;
         ephedra:enableQueryHints "true"^^xsd:boolean ;
         
         # Ephedra service members (accessed via SERVICE clauses)
         config:fed.member [
            ephedra:delegateRepositoryID "wikidata-text" ;
            ephedra:serviceReference <http://www.researchspace.org/resource/system/repository/federation#wikidata-text>
         ] ;
         config:fed.member [
            ephedra:delegateRepositoryID "assets" ;
            ephedra:serviceReference <http://www.researchspace.org/resource/system/repository/federation#assets>
         ] ;
         
         # SPARQL endpoint members (FedX auto-selects sources, no SERVICE needed)
         fedx:member [
            fedx:store "ResolvableRepository" ;
            fedx:repositoryName "wikidata-sparql"
         ] ;
         fedx:member [
            fedx:store "ResolvableRepository" ;
            fedx:repositoryName "artresearch-sparql"
         ] ;
         
         # Optional: FedX configuration
         fedx:config [
            fedx:enforceMaxQueryTime 120 ;
            fedx:joinWorkerThreads 20 ;
            fedx:logQueryPlan false
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
| `boundJoinBlockSize` | **100** | Bindings per VALUES clause in bound join (our default, FedX default is 25) |
| `enableServiceAsBoundJoin` | true | Use VALUES clause for SERVICE evaluation (vectored) |
| `enableOptionalAsBindJoin` | true | Use bind join for OPTIONAL clauses |
| `enableMonitoring` | false | Enable monitoring features |
| `debugQueryPlan` | ~~false~~ | ~~Print query plan to stdout~~ — **ignored**, silently forced off; use `logQueryPlan` |
| `logQueryPlan` | false | Log optimized query plan via SLF4J (auto-enables `enableMonitoring`) |
| `logQueries` | false | Log all queries to file |
| `includeInferredDefault` | true | Include inferred statements by default |
| `sourceSelectionCacheSpec` | - | Guava CacheBuilderSpec for source selection cache |
| `consumingIterationMax` | 1000 | Max results consumed by ConsumingIteration |

> [!NOTE]
> Legacy `ephedra:config` is still supported for backwards compatibility, but `fedx:config` is preferred.

### Service Descriptor

The descriptor declares the SPARQL pattern vocabulary of a REST service, its
input arguments (`spin:constraint`/`spl:Argument` → HTTP request parameters)
and output columns (`spin:column`/`spin:Column` → values extracted from the
JSON response). Parameter IRIs must start with `_`; the local name minus the
underscore becomes the HTTP parameter name (`:_q` → `?q=...`).

```turtle
PREFIX sp: <http://spinrdf.org/sp#>
PREFIX spin: <http://spinrdf.org/spin#>
PREFIX spl: <http://spinrdf.org/spl#>
PREFIX ephedra: <http://www.researchspace.org/resource/system/ephedra#>
PREFIX xsd: <http://www.w3.org/2001/XMLSchema#>
PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
PREFIX ex: <http://example.org/ns#>

ex:SearchService a ephedra:Service ;
   rdfs:label "Search service returning an ordered result array" ;
   spin:constraint [
      a spl:Argument ;
      spl:predicate ex:_q ;
      spl:valueType xsd:string
   ] ;
   spin:column [                       # row anchor: defines the JSON root path
      a spin:Column ;
      spl:predicate ex:_results ;
      spl:valueType rdfs:Resource ;
      ephedra:jsonPath "$.search[*]"
   ] ;
   spin:column [
      a spin:Column ;
      spl:predicate ex:_entity ;
      spl:valueType rdfs:Resource ;    # rdfs:Resource => an IRI is minted
      ephedra:jsonPath "$.entity"
   ] ;
   spin:column [                       # 0-based row position (relevance rank)
      a spin:Column ;
      spl:predicate ex:_ordinal ;
      spl:valueType xsd:integer ;
      ephedra:rowIndex true
   ] ;
   ephedra:hasSPARQLPattern (
      [ sp:subject ex:_results ; sp:predicate ex:q ; sp:object ex:_q ]
      [ sp:subject ex:_results ; sp:predicate ex:hasEntity ; sp:object ex:_entity ]
      [ sp:subject ex:_results ; sp:predicate ex:hasOrdinal ; sp:object ex:_ordinal ]
   ) .
```

> [!CAUTION]
> Only `spl:valueType rdfs:Resource` makes `RESTSailConnection` mint an IRI.
> Any other value — including the lookalike `rdf:Resource` — produces a
> **typed literal**, which silently breaks joining the value into SPARQL
> federation members and `<{{binding.value}}>` substitution in templates
> (this exact typo shipped in the wikidata-entity descriptor for years).
> Note that `Rio.parse` resolves well-known prefixes (`rdf:`, `xsd:`, ...)
> even when not declared in the file, so the typo is NOT a parse error.

### REST Service Configuration Properties

| Property | Level | Description |
|----------|-------|-------------|
| `ephedra:httpMethod` | sail | HTTP method: GET, POST |
| `ephedra:serviceURL` | sail | Base URL of the REST service |
| `ephedra:inputFormat` | sail | Input format for POST: JSON, FORM |
| `ephedra:mediaType` | sail | Response content type expected |
| `ephedra:ignoreHttpErrors` | sail | If true, HTTP 4xx/5xx return empty instead of failing |
| `ephedra:requestRateLimit` | sail | Max requests per second (rate limiting) |
| `ephedra:userAgent` | sail | Custom User-Agent header |
| `ephedra:jsonPath` | column | JSONPath to extract the column value (relative to the row anchor) |
| `ephedra:rowIndex` | column | If true, binds the 0-based position of the row in the response array instead of reading a `jsonPath`. Typed by the column's `spl:valueType` (default `xsd:integer`). Lets queries `ORDER BY` the service's own result ranking after joins/aggregation. |
| `ephedra:rowLimit` | argument | If true, the input argument's value caps the number of rows parsed from the service response and is NOT sent to the remote API. The declared "top N hits" bound for search APIs returning their full result list — bounds downstream per-row joins and makes `ORDER BY` over the rows safe. |

### External Wikidata Endpoints

Findings from the Wikidata import work (June 2026), relevant when adding
SPARQL members for public endpoints:

- **`https://qlever.dev/api/wikidata`** (QLever mirror; what `wikidata-sparql`
  points at): evaluates transitive property paths (`wdt:P31/wdt:P279*`)
  natively and fast, handles the vectored `VALUES (?__rowIdx ...)` queries,
  no vendor extensions needed. Trade-off: the dataset lags ~1 day behind live
  Wikidata, so a required filter drops entities created very recently.
  The old `qlever.cs.uni-freiburg.de/api/*` URLs answer **308 redirects**
  which Apache HttpClient 4.x does not follow for POST — use `qlever.dev`.
- **`https://query.wikidata.org/sparql`** (WDQS, Blazegraph): plain
  `wdt:P31/wdt:P279* <umbrella>` paths **time out** (Blazegraph materializes
  the umbrella class's entire subclass closure) unless the vendor hint
  `hint:Prior hint:gearing "forward"` is added. Offers `SERVICE wikibase:mwapi`
  (entity search inside SPARQL, with relevance ordinals) — Blazegraph-only,
  and WMF is phasing Blazegraph out. Aggressively rate-limits (429) and
  requires a meaningful User-Agent.
- Useful Wikidata umbrella classes for type filtering: human `Q5`,
  organization `Q43229`, group of humans `Q16334295`, and agent `Q24229398`
  (common superclass of person and organization — "people and organizations").

---

## Deferred Work (TODOs)

Known cleanups that were deliberately deferred during the July 2026 review/fix
pass. Each was judged real but not worth the risk or effort at the time; the
entries record what a proper fix looks like and what should trigger it.

### TODO: Move test debug counters out of the evaluation strategy

`QueryHintAwareSparqlFederationEvalStrategy` holds four `static AtomicInteger`
counters plus a `static volatile` enable flag, incremented in five production
overrides and consumed only by `EphedraIntegrationTest` (assertions like
"executeLeftJoin called exactly once"). Being class-static they are JVM-global:
counter-asserting tests cannot run in parallel, and production code carries
test instrumentation (cost when disabled: one volatile read per call).

- **Proper fix:** per-federation metrics object hung off `MpFederation` (or
  `FederationContext`), populated by the strategy, readable by both tests and
  monitoring. Requires making the hardcoded
  `QueryHintAwareFederationEvaluationStrategyFactory` in the `MpFederation`
  constructor pluggable, and an aggregation point across the per-query
  strategy instances (the reason the counters went static in the first place).
- **Revisit when:** enabling intra-JVM parallel test execution, or when
  per-federation runtime metrics become a monitoring requirement.

### TODO: Executor lifecycle in `MpFederation`

`getRestServiceExecutor()` uses double-checked locking; the pool size is the
underived magic `restServicePrefetchSize * 3`. Eager creation in the
constructor would delete the DCL — but `shutDownInternal()` closes the
executor and never recreates it, so eager init would bake in the
single-lifecycle assumption while upstream `FedXRepository.getConnection()`
can re-init a shut-down sail instance (a rejected prefetch task now fails the
query loudly rather than silently returning empty rows).

- **Proper fix:** support same-instance re-initialization coherently —
  recreate the executor on re-init, then simplify the lazy init, and derive
  the pool size from an explicit model (concurrent REST-joining queries ×
  in-flight calls per join) instead of `× 3`.
- **Revisit when:** touching federation lifecycle (e.g. fixing upstream FedX's
  members list surviving shutdown; see `initializeInternal` notes).

### TODO: `GuardedServiceBindLeftJoin` copies the upstream batching loop

`handleBindings()` duplicates ~45 lines of `ControlledWorkerBindJoinBase`'s
batching/phaser protocol (10000-party phaser guard, `getNextBindJoinSize`,
`informFinish`, `awaitAdvanceInterruptibly`) because upstream offers no
per-row hook — there is nothing smaller than `handleBindings()` to override.
The copy currently includes upstream's phaser-overflow fix (GH-4610) and has
diverged further by design (per-row guard routing + grouping rows by
bound-service-variable signature). Upstream fixes to that loop will not reach
this copy on upgrades.

- **Proper fix:** propose a per-row/per-batch extension hook upstream in FedX;
  once accepted, shrink this class to the guard/grouping logic.
- **Revisit when:** EVERY rdf4j upgrade — diff
  `ControlledWorkerBindJoinBase.handleBindings` against this class (two-minute
  check).

### TODO: Consolidate the "existing record" lookup across import templates

The ~45-line CRM lookup (entity form record → creation →
`import_from_external_source` → transferred URI) plus the "Open record"
dropdown markup is copy-pasted into ImportFromMET, ImportFromVAM,
ImportFromTNA, ImportFromWikidata and (since July 2026, when it switched from
fragile WKT-equality matching to the same chain) ImportFromOSM — five copies
differing only in the external-URI expression and variable name. Any
data-model change must be applied five times; missing one silently breaks
duplicate detection for that institution (users then re-import records they
already have). The one behavioral divergence (MET's unquoted
`STR({{id.value}})`) was fixed in July 2026; the structural duplication
remains.

- **Proper fix:** one shared include/partial parameterized by the URI
  expression and result variable name.
- **Revisit when:** someone works on the import flows with a running platform
  at hand — the include interacts with the client-side component wiring
  (`SemanticQuery`, `bs-dropdown`, `mp-event-trigger`), so the refactor needs
  a manual click-through per institution, not just the handlebars golden test.

### TODO: Retire the forked SPARQL renderer

`org.researchspace.sparql.renderer` (~3,000 lines) is the ancestor of rdf4j's
own `org.eclipse.rdf4j.queryrender.sparql.experimental.SparqlQueryRenderer`,
which already contains the QueryRoot-unwrapping fixes redone locally during
the rdf4j-5 upgrade. Every upgrade forces the fork to learn new algebra nodes
by hand (this one: `AggregateFunctionCall`, `TripleRef`), and the fork carries
pre-existing latent bugs (e.g. `meet(Var)` NPE when rendering updates with
anonymous variables — `currentQueryProfile` is never set on the update path).
It is load-bearing: query catalog, `PropertyPattern`, `FieldsBasedSearch`,
parametrized queries, and the single-source query-hint stripping in
`QueryHintAwareSparqlFederationEvalStrategy.optimize()` all render through it,
and its exact output format is pinned by golden tests.

- **Proper fix:** a subclass of the upstream renderer carrying only the local
  deltas (researchspace `NaryJoin`, `TripleRef`/`SerializableParsedQuery`
  wiring, `isSliceOwner`); run both renderers over the golden corpus, diff,
  then flip and re-baseline. Contribute generic fixes upstream.
- **Revisit when:** the upstream renderer graduates out of `.experimental`,
  or the next rdf4j upgrade forces another round of hand-ported node support.

### TODO: `researchspace:WikidataTextSearch` sail type has no factory

The shipped template `config/repository-templates/wikidata-text.ttl` (and the
`RepositoryManager` help page) reference `config:sail.type
"researchspace:WikidataTextSearch"`, but no `SailFactory` under that type is
registered anywhere in the codebase (checked both `rdf4j-update` and
`master`). Creating a repository from that template fails with "Unsupported
Sail type". The equally dead test fixture was deleted in July 2026.

- **Proper fix:** either implement/restore the sail (presumably a
  `RESTSail`-style wrapper for `https://www.wikidata.org/w/api.php`) or delete
  the template and its documentation mentions.
- **Revisit when:** deciding whether Wikidata text search is a supported
  feature; the ImportFromWikidata flow currently uses the QLever/SDC path
  instead.