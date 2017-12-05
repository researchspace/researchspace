declare module SparqlJs {
  interface SparqlJsStatic {
    Parser: new (
      prefixes?: { [prefix: string]: string },
      baseIRI?: string,
      options?: SparqlJsParserOptions,
    ) => SparqlParser
    Generator: new (options?: SparqlJsGeneratorOptions) => SparqlGenerator
  }

  interface SparqlJsParserOptions {
    /** @default true */
    collapseGroups?: boolean;
  }

  interface SparqlJsGeneratorOptions {
    allPrefixes?: boolean;
  }

  interface SparqlParser {
    parse(query: string): SparqlQuery;
  }

  interface SparqlGenerator {
    stringify(query: any): string
  }

  type SparqlQuery = Query | Update;

  type Query = SelectQuery | ConstructQuery | AskQuery | DescribeQuery;

  interface BaseQuery {
    type: 'query';
    base?: string;
    prefixes: { [prefix: string]: string; };
    where?: Pattern[];
    values?: ValuePatternRow[];
  }

  interface SelectQuery extends BaseQuery {
    queryType: 'SELECT';
    variables: Variable[] | ['*'];
    distinct?: boolean;
    from?: {
      default: string[];
      named: string[];
    };
    reduced?: boolean;
    group?: Grouping[];
    having?: Expression[];
    order?: Ordering[];
    limit?: number;
    offset?: number;
  }

  interface Grouping {
    expression: Expression;
  }

  interface Ordering {
    expression: Expression;
    descending?: boolean;
  }

  interface ConstructQuery extends BaseQuery {
    queryType: 'CONSTRUCT';
    template?: Triple[];
  }

  interface AskQuery extends BaseQuery {
    queryType: 'ASK';
  }

  interface DescribeQuery extends BaseQuery {
    queryType: 'DESCRIBE';
    variables: Variable[] | ['*'];
  }

  interface Update {
    type: 'update';
    prefixes: { [prefix: string]: string; };
    updates: UpdateOperation[];
  }

  type UpdateOperation = InsertDeleteOperation | ManagementOperation;

  interface InsertDeleteOperation {
    updateType: 'insert' | 'delete' | 'deletewhere' | 'insertdelete';
    insert?: Quads[];
    delete?: Quads[];
    where?: Pattern[];
  }

  type Quads = BgpPattern | GraphQuads;

  interface ManagementOperation {
    type: 'load' | 'copy' | 'move' | 'add';
    silent: boolean;
    source: string | {
      type: 'graph';
      default: boolean;
    };
    destination?: string | {
      type: 'graph';
      name: string;
    };
  }

  /**
   * Examples: '?var', '*',
   *   SELECT (?a as ?b) ... ==> { expression: '?a', variable: '?b' }
   */
  type Variable = VariableExpression | Term;

  interface VariableExpression {
    expression: Expression;
    variable: Term;
  }

  type Pattern =
    BgpPattern
    | BlockPattern
    | GraphPattern
    | ServicePattern
    | FilterPattern
    | BindPattern
    | ValuesPattern
    | SelectQuery;

  /**
   * Basic Graph Pattern
   */
  interface BgpPattern {
    type: 'bgp';
    triples: Triple[];
  }

  interface GraphQuads {
    type: 'graph';
    name: Term;
    triples: Triple[];
  }

  interface BlockPattern {
    type: 'optional' | 'union' | 'group' | 'minus' | 'graph' | 'service';
    patterns: Pattern[];
  }

  interface GroupPattern extends BlockPattern {
    type: 'group';
  }

  interface GraphPattern extends BlockPattern {
    type: 'graph';
    name: Term;
  }

  interface ServicePattern extends BlockPattern {
    type: 'service';
    name: Term;
    silent: boolean;
  }

  interface FilterPattern {
    type: 'filter';
    expression: Expression;
  }

  interface BindPattern {
    type: 'bind';
    expression: Expression;
    variable: Term;
  }

  interface ValuesPattern {
    type: 'values';
    values: ValuePatternRow[];
  }

  interface ValuePatternRow {
    [variable: string]: Term;
  }

  /**
   * Either '?var', 'schema:iri', '_:blankNode',
   * '"literal"^^<schema:datatype>' or '{undefined}'.
   *
   * Term is a nominal type based on string.
   */
  type Term = string & { __termBrand: string; };

  interface Triple {
    subject: Term;
    predicate: PropertyPath | Term;
    object: Term;
  }

  interface PropertyPath {
    type: 'path';
    pathType: '|' | '/' | '^' | '+' | '*' | '!';
    items: Array<PropertyPath | Term>;
  }

  type Expression =
    OperationExpression
    | FunctionCallExpression
    | AggregateExpression
    | BgpPattern
    | GroupPattern
    | Tuple
    | Term;

  interface Tuple extends Array<Expression> {}

  interface BaseExpression {
    type: string;
    distinct?: boolean;
  }

  interface OperationExpression extends BaseExpression {
    type: 'operation';
    operator: string;
    args: Expression[];
  }

  interface FunctionCallExpression extends BaseExpression {
    type: 'functionCall';
    function: string;
    args: Expression[];
  }

  interface AggregateExpression extends BaseExpression {
    type: 'aggregate';
    expression: Expression;
    aggregation: string;
    separator?: string;
  }
}

// node
declare module 'sparqljs' {
  const sparqljs: SparqlJs.SparqlJsStatic;
  export = sparqljs;
}
