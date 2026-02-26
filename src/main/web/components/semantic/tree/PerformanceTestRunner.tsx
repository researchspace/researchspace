/**
 * ResearchSpace
 * Performance Test Runner Component
 * 
 * This component provides a testing framework for comparing monolithic
 * vs lazy loading performance in hierarchical data visualization.
 */

import { Component, createElement, ReactElement } from 'react';
import * as D from 'react-dom-factories';
import * as React from 'react';

import { SemanticTree } from './SemanticTree';
import { SemanticTreeAdvanced, PerformanceMetric } from './SemanticTreeAdvanced';

export interface PerformanceTestRunnerConfig {
  /**
   * Array of dataset sizes to test (number of nodes)
   * @default [10, 50, 100, 250, 500, 1000]
   */
  testSizes?: number[];
  
  /**
   * SPARQL query template for monolithic loading
   * Use {{limit}} placeholder for LIMIT value
   */
  monolithicQueryTemplate?: string;
  
  /**
   * SPARQL query for lazy loading initial roots
   */
  lazyRootQuery?: string;
  
  /**
   * SPARQL query for lazy expansion
   */
  lazyExpandQuery?: string;
}

export type Props = PerformanceTestRunnerConfig;

interface PerformanceMetrics {
  success: boolean;
  loadTime: number;
  queryTime: number;
  renderTime: number;
  nodeCount: number;
  memoryEstimate: number;
  error?: string;
}

interface TestResult {
  size: number;
  monolithic: PerformanceMetrics;
  lazy: PerformanceMetrics;
  speedup: string;
  winner: string;
}

interface State {
  results: TestResult[];
  isRunning: boolean;
  currentTest?: number;
  totalTests?: number;
  selectedSize: number;
  currentMonolithicMetrics?: PerformanceMetrics;
  currentLazyMetrics?: PerformanceMetrics;
  testKey: number; // Used to force re-render of components
}

export class PerformanceTestRunner extends Component<Props, State> {
  static readonly defaultProps: Partial<Props> = {
    testSizes: [10, 25, 50, 75, 100, 150, 250, 350, 500, 750, 1000, 1500, 2000, 2500, 3000, 3500, 4000, 5000, 7500, 10000],
    monolithicQueryTemplate: `
      PREFIX rico: <https://www.ica.org/standards/RiC/ontology#>
      PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
      PREFIX dcterms: <http://purl.org/dc/terms/>
      
      SELECT DISTINCT ?parent ?node ?label ?title ?hasChildren 
      WHERE {
        { ?node a rico:RecordSet }
        UNION  
        { ?node a rico:Record }
        
        OPTIONAL { ?parent rico:includesOrIncluded ?node }
        OPTIONAL { ?node rdfs:label ?title }
        
        BIND(EXISTS { ?node rico:includesOrIncluded ?child } AS ?hasChildren)
      }
      LIMIT {{limit}}
    `,
    lazyRootQuery: `
      PREFIX dcterms: <http://purl.org/dc/terms/>
      PREFIX rico: <https://www.ica.org/standards/RiC/ontology#>
      PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
      
      SELECT DISTINCT ?parent ?node ?label ?title ?hasChildren 
      WHERE {
        VALUES ?parent { <http://ficlit.unibo.it/ArchivioEvangelisti/structure/RS1> }
        ?parent dcterms:hasPart ?node .
        OPTIONAL { ?node rdfs:label ?title }
        
        BIND(IRI(REPLACE(STR(?node), "/structure", "")) AS ?dataNode)
        BIND(EXISTS { ?dataNode rico:includesOrIncluded ?anyChild } AS ?hasChildren)
      }
    `,
    lazyExpandQuery: `
      PREFIX rico: <https://www.ica.org/standards/RiC/ontology#>
      PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
      
      SELECT DISTINCT ?parent ?node ?label ?title ?hasChildren 
      WHERE {
        BIND(IRI(REPLACE(STR(<{{clickedNode}}>), "/structure/", "/")) AS ?dataNode)
        BIND(<{{clickedNode}}> as ?parent)
        
        ?dataNode rico:includesOrIncluded ?node .
        OPTIONAL { ?node rdfs:label ?title }
        
        BIND(EXISTS { ?node rico:includesOrIncluded ?anyChild } AS ?hasChildren)
      }
    `,
  };

  private monolithicMetrics: Map<string, PerformanceMetric> = new Map();
  private lazyMetrics: Map<string, PerformanceMetric> = new Map();

  constructor(props: Props) {
    super(props);
    this.state = {
      results: [],
      isRunning: false,
      selectedSize: this.props.testSizes[2] || 100,
      testKey: 0,
    };
  }

  render() {
    return D.div(
      { className: 'performance-test-container', style: { padding: '20px', maxWidth: '1800px', margin: '0 auto' } },
      this.renderHeader(),
      this.renderControls(),
      this.renderTreeComparison(),
      this.renderResults()
    );
  }

  private renderHeader() {
    return D.div(
      {
        style: {
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          color: 'white',
          padding: '30px',
          borderRadius: '8px',
          marginBottom: '30px',
          boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
        },
      },
      D.h1({ style: { margin: '0 0 10px 0', fontSize: '2em' } }, '🚀 Performance Testing Framework'),
      D.p(
        { style: { margin: 0, opacity: 0.9, fontSize: '1.1em' } },
        'Comparing Monolithic vs. Lazy Loading with Real Evangelisti Archive Data'
      )
    );
  }

  private renderControls() {
    const { testSizes } = this.props;
    const { isRunning, selectedSize } = this.state;

    return D.div(
      {
        style: {
          background: 'white',
          padding: '20px',
          borderRadius: '8px',
          marginBottom: '30px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
          display: 'flex',
          gap: '15px',
          alignItems: 'center',
          flexWrap: 'wrap' as const,
        },
      },
      D.label({ style: { fontWeight: 'bold' as const, color: '#333' } }, 'Dataset Size:'),
      D.select(
        {
          value: selectedSize,
          onChange: (e: React.ChangeEvent<HTMLSelectElement>) =>
            this.setState({ selectedSize: parseInt(e.target.value) }),
          disabled: isRunning,
          style: {
            padding: '8px 12px',
            border: '2px solid #ddd',
            borderRadius: '4px',
            fontSize: '14px',
            minWidth: '180px',
          },
        },
        testSizes.map((size) =>
          D.option({ key: size, value: size }, `${size} nodes${size === 100 ? ' (recommended)' : ''}`)
        )
      ),
      D.button(
        {
          onClick: () => this.runSingleTest(),
          disabled: isRunning,
          style: {
            padding: '10px 20px',
            background: isRunning ? '#ccc' : '#667eea',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            fontSize: '14px',
            fontWeight: 'bold' as const,
            cursor: isRunning ? 'not-allowed' : 'pointer',
          },
        },
        isRunning ? 'Running Test...' : 'Run Single Test'
      ),
      D.button(
        {
          onClick: () => this.runAllTests(),
          disabled: isRunning,
          style: {
            padding: '10px 20px',
            background: isRunning ? '#ccc' : '#48bb78',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            fontSize: '14px',
            fontWeight: 'bold' as const,
            cursor: isRunning ? 'not-allowed' : 'pointer',
          },
        },
        isRunning && this.state.currentTest && this.state.totalTests
          ? `Running ${this.state.currentTest}/${this.state.totalTests}...`
          : 'Run All Tests'
      ),
      this.state.results.length > 0 &&
        D.button(
          {
            onClick: () => this.exportCSV(),
            disabled: isRunning,
            style: {
              padding: '10px 20px',
              background: '#ed8936',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              fontSize: '14px',
              fontWeight: 'bold' as const,
              cursor: 'pointer',
            },
          },
          '📊 Export CSV'
        ),
      this.state.results.length > 0 &&
        D.button(
          {
            onClick: () => this.clearResults(),
            disabled: isRunning,
            style: {
              padding: '10px 20px',
              background: '#718096',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              fontSize: '14px',
              fontWeight: 'bold' as const,
              cursor: 'pointer',
            },
          },
          '🗑️ Clear'
        )
    );
  }

  private renderTreeComparison() {
    if (!this.state.isRunning) {
      return null;
    }

    const monolithicQuery = this.props.monolithicQueryTemplate.replace('{{limit}}', this.state.selectedSize.toString());

    return D.div(
      {
        style: {
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '20px',
          marginBottom: '30px',
        },
      },
      // Monolithic Tree Panel
      D.div(
        {
          style: {
            background: 'white',
            borderRadius: '8px',
            padding: '20px',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
          },
        },
        D.h3(
          {
            style: {
              margin: '0 0 15px 0',
              color: '#333',
              fontSize: '1.3em',
              borderBottom: '3px solid #e53e3e',
              paddingBottom: '10px',
            },
          },
          '⚙️ Monolithic Loading'
        ),
        this.state.currentMonolithicMetrics && this.renderMetricsPanel(this.state.currentMonolithicMetrics, '#e53e3e'),
        D.div({ style: { maxHeight: '400px', overflow: 'auto', border: '1px solid #e2e8f0', borderRadius: '4px', padding: '10px' } },
          createElement(SemanticTree, {
            key: `mono-${this.state.testKey}`,
            id: `test-monolithic-${this.state.testKey}`,
            query: monolithicQuery,
            enablePerformanceTracking: true,
            onPerformanceMetric: this.handleMonolithicMetric,
            tupleTemplate: '<span>{{title.value}}</span>',
          } as any)
        )
      ),
      // Lazy Tree Panel
      D.div(
        {
          style: {
            background: 'white',
            borderRadius: '8px',
            padding: '20px',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
          },
        },
        D.h3(
          {
            style: {
              margin: '0 0 15px 0',
              color: '#333',
              fontSize: '1.3em',
              borderBottom: '3px solid #48bb78',
              paddingBottom: '10px',
            },
          },
          '⚡ Lazy Loading'
        ),
        this.state.currentLazyMetrics && this.renderMetricsPanel(this.state.currentLazyMetrics, '#48bb78'),
        D.div({ style: { maxHeight: '400px', overflow: 'auto', border: '1px solid #e2e8f0', borderRadius: '4px', padding: '10px' } },
          createElement(SemanticTreeAdvanced, {
            key: `lazy-${this.state.testKey}`,
            id: `test-lazy-${this.state.testKey}`,
            query: this.props.lazyRootQuery,
            expandQuery: this.props.lazyExpandQuery,
            enablePerformanceTracking: true,
            onPerformanceMetric: this.handleLazyMetric,
            roots: ['http://ficlit.unibo.it/ArchivioEvangelisti/structure/RS1'],
            keysOpened: ['http://ficlit.unibo.it/ArchivioEvangelisti/structure/RS1'],
            tupleTemplate: '<span>{{title.value}}</span>',
          } as any)
        )
      )
    );
  }

  private renderMetricsPanel(metrics: PerformanceMetrics, borderColor: string) {
    return D.div(
      {
        style: {
          background: '#f7fafc',
          padding: '15px',
          borderRadius: '6px',
          marginBottom: '15px',
          borderLeft: `4px solid ${borderColor}`,
        },
      },
      this.renderMetric('⏱️ Load Time', `${metrics.loadTime.toFixed(2)} ms`),
      this.renderMetric('🔍 Query Time', `${metrics.queryTime.toFixed(2)} ms`),
      this.renderMetric('🎨 Render Time', `${metrics.renderTime.toFixed(2)} ms`),
      this.renderMetric('📊 Nodes Loaded', metrics.nodeCount.toLocaleString()),
      this.renderMetric('💾 Memory (est)', `~${metrics.memoryEstimate.toFixed(0)} KB`)
    );
  }

  private renderMetric(label: string, value: string) {
    return D.div(
      {
        style: {
          display: 'flex',
          justifyContent: 'space-between',
          padding: '6px 0',
          borderBottom: '1px solid #e2e8f0',
        },
      },
      D.span({ style: { fontWeight: 'bold' as const, color: '#4a5568', fontSize: '13px' } }, label),
      D.span({ style: { color: '#2d3748', fontFamily: "'Courier New', monospace", fontSize: '13px' } }, value)
    );
  }

  private renderResults() {
    if (this.state.results.length === 0) {
      return null;
    }

    return D.div(
      {
        style: {
          background: 'white',
          borderRadius: '8px',
          padding: '20px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
        },
      },
      D.h3({ style: { margin: '0 0 20px 0', color: '#333', fontSize: '1.3em' } }, '📈 Performance Analysis'),
      this.renderTable(),
      this.renderComplexityAnalysis()
    );
  }

  private renderTable() {
    return D.table(
      {
        style: {
          width: '100%',
          borderCollapse: 'collapse' as const,
          marginTop: '20px',
        },
      },
      D.thead(
        {},
        D.tr(
          {},
          D.th({ style: this.tableHeaderStyle() }, 'Dataset Size'),
          D.th({ style: this.tableHeaderStyle() }, 'Monolithic (ms)'),
          D.th({ style: this.tableHeaderStyle() }, 'Lazy (ms)'),
          D.th({ style: this.tableHeaderStyle() }, 'Speedup'),
          D.th({ style: this.tableHeaderStyle() }, 'Winner')
        )
      ),
      D.tbody(
        {},
        this.state.results.map((result, i) =>
          D.tr(
            {
              key: i,
              style: {
                background: i % 2 === 0 ? '#f7fafc' : 'white',
              },
            },
            D.td({ style: this.tableCellStyle() }, result.size.toLocaleString()),
            D.td(
              { style: this.tableCellStyle({ color: result.monolithic.loadTime > 1000 ? '#e53e3e' : '#2d3748' }) },
              result.monolithic.success ? `${result.monolithic.loadTime.toFixed(2)} ms` : 'Error'
            ),
            D.td(
              { style: this.tableCellStyle({ color: '#48bb78', fontWeight: 'bold' as const }) },
              result.lazy.success ? `${result.lazy.loadTime.toFixed(2)} ms` : 'Error'
            ),
            D.td(
              { style: this.tableCellStyle({ fontWeight: 'bold' as const }) },
              result.speedup !== 'N/A' ? `${result.speedup}x` : 'N/A'
            ),
            D.td(
              { style: this.tableCellStyle() },
              D.span(
                {
                  style: {
                    padding: '4px 8px',
                    borderRadius: '4px',
                    fontSize: '11px',
                    fontWeight: 'bold' as const,
                    background: result.winner === 'lazy' ? '#c6f6d5' : '#fed7d7',
                    color: result.winner === 'lazy' ? '#22543d' : '#742a2a',
                  },
                },
                result.winner === 'lazy' ? '⚡ Lazy' : '⚙️ Mono'
              )
            )
          )
        )
      )
    );
  }

  private renderComplexityAnalysis() {
    if (this.state.results.length < 3) {
      return null;
    }

    const monoPoints = this.state.results
      .filter(r => r.monolithic.success)
      .map(r => ({ x: r.size, y: r.monolithic.loadTime }));
    
    const lazyPoints = this.state.results
      .filter(r => r.lazy.success)
      .map(r => ({ x: r.size, y: r.lazy.loadTime }));

    const monoGrowth = this.calculateGrowthRate(monoPoints);
    const lazyGrowth = this.calculateGrowthRate(lazyPoints);

    const avgSpeedup = this.state.results
      .filter(r => r.speedup !== 'N/A')
      .reduce((sum, r) => sum + parseFloat(r.speedup), 0) / this.state.results.filter(r => r.speedup !== 'N/A').length;

    return D.div({},
      D.div(
        {
          style: {
            background: '#f7fafc',
            padding: '20px',
            borderRadius: '6px',
            marginTop: '20px',
            borderLeft: '4px solid #667eea',
          },
        },
        D.h4({ style: { margin: '0 0 15px 0', color: '#2d3748' } }, '🔬 Complexity Analysis'),
        D.p({ style: { margin: '5px 0', color: '#4a5568' } },
          D.strong({}, 'Monolithic Loading: '),
          `${this.classifyComplexity(monoGrowth)} - Growth rate: ${monoGrowth.toFixed(4)} (${this.describeGrowth(monoGrowth)})`
        ),
        D.p({ style: { margin: '5px 0', color: '#4a5568' } },
          D.strong({}, 'Lazy Loading: '),
          `${this.classifyComplexity(lazyGrowth)} - Growth rate: ${lazyGrowth.toFixed(4)} (${this.describeGrowth(lazyGrowth)})`
        ),
        D.p({ style: { margin: '10px 0 5px 0', color: '#4a5568' } },
          D.strong({}, 'Average Speedup: '),
          `${avgSpeedup.toFixed(2)}x faster with lazy loading`
        ),
        D.p({ style: { margin: '5px 0', color: '#2d3748', fontStyle: 'italic' } },
          `Lazy loading maintains ${lazyGrowth < 0.5 ? 'nearly constant' : 'sub-linear'} performance ` +
          `regardless of dataset size, while monolithic loading shows ${monoGrowth > 1.5 ? 'super-linear' : 'linear'} degradation.`
        )
      ),
      this.renderPerformanceChart()
    );
  }

  private renderPerformanceChart() {
    if (this.state.results.length < 3) {
      return null;
    }

    const width = 800;
    const height = 400;
    const padding = { top: 40, right: 40, bottom: 60, left: 80 };
    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;

    const monoPoints = this.state.results
      .filter(r => r.monolithic.success)
      .map(r => ({ x: r.size, y: r.monolithic.loadTime }));
    
    const lazyPoints = this.state.results
      .filter(r => r.lazy.success)
      .map(r => ({ x: r.size, y: r.lazy.loadTime }));

    const allPoints = [...monoPoints, ...lazyPoints];
    const maxX = Math.max(...allPoints.map(p => p.x));
    const maxY = Math.max(...allPoints.map(p => p.y));
    const minY = 0;

    const scaleX = (x: number) => padding.left + (x / maxX) * chartWidth;
    const scaleY = (y: number) => padding.top + chartHeight - ((y - minY) / (maxY - minY)) * chartHeight;

    const createPath = (points: Array<{x: number, y: number}>) => {
      if (points.length === 0) return '';
      return points.map((p, i) => 
        `${i === 0 ? 'M' : 'L'} ${scaleX(p.x)} ${scaleY(p.y)}`
      ).join(' ');
    };

    return D.div(
      {
        style: {
          background: 'white',
          padding: '20px',
          borderRadius: '6px',
          marginTop: '20px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
        },
      },
      D.h4({ style: { margin: '0 0 15px 0', color: '#2d3748' } }, '📊 Performance Visualization'),
      D.svg(
        {
          width,
          height,
          style: { display: 'block', margin: '0 auto' },
        },
        // Title
        D.text(
          {
            x: width / 2,
            y: 20,
            textAnchor: 'middle',
            style: { fontSize: '16px', fontWeight: 'bold', fill: '#2d3748' },
          },
          'Load Time vs Dataset Size'
        ),
        
        // Y-axis
        D.line({ x1: padding.left, y1: padding.top, x2: padding.left, y2: height - padding.bottom, stroke: '#cbd5e0', strokeWidth: 2 }),
        D.text(
          {
            x: 20,
            y: height / 2,
            textAnchor: 'middle',
            transform: `rotate(-90, 20, ${height / 2})`,
            style: { fontSize: '12px', fill: '#4a5568' },
          },
          'Load Time (ms)'
        ),
        
        // X-axis
        D.line({ x1: padding.left, y1: height - padding.bottom, x2: width - padding.right, y2: height - padding.bottom, stroke: '#cbd5e0', strokeWidth: 2 }),
        D.text(
          {
            x: width / 2,
            y: height - 10,
            textAnchor: 'middle',
            style: { fontSize: '12px', fill: '#4a5568' },
          },
          'Dataset Size (nodes)'
        ),
        
        // Grid lines
        ...Array.from({ length: 5 }, (_, i) => {
          const y = padding.top + (chartHeight / 4) * i;
          const value = maxY - (maxY / 4) * i;
          return D.g({ key: `grid-y-${i}` },
            D.line({ x1: padding.left, y1: y, x2: width - padding.right, y2: y, stroke: '#e2e8f0', strokeWidth: 1, strokeDasharray: '4,4' }),
            D.text({ x: padding.left - 10, y: y + 4, textAnchor: 'end', style: { fontSize: '10px', fill: '#718096' } }, value.toFixed(0))
          );
        }),
        
        // Monolithic line
        D.path({
          d: createPath(monoPoints),
          fill: 'none',
          stroke: '#e53e3e',
          strokeWidth: 3,
        }),
        
        // Lazy line
        D.path({
          d: createPath(lazyPoints),
          fill: 'none',
          stroke: '#48bb78',
          strokeWidth: 3,
        }),
        
        // Monolithic points
        ...monoPoints.map((p, i) =>
          D.circle({
            key: `mono-${i}`,
            cx: scaleX(p.x),
            cy: scaleY(p.y),
            r: 4,
            fill: '#e53e3e',
          })
        ),
        
        // Lazy points
        ...lazyPoints.map((p, i) =>
          D.circle({
            key: `lazy-${i}`,
            cx: scaleX(p.x),
            cy: scaleY(p.y),
            r: 4,
            fill: '#48bb78',
          })
        ),
        
        // Legend
        D.g({ transform: `translate(${width - padding.right - 150}, ${padding.top})` },
          D.rect({ x: 0, y: 0, width: 140, height: 60, fill: 'white', stroke: '#cbd5e0', strokeWidth: 1, rx: 4 }),
          D.line({ x1: 10, y1: 20, x2: 40, y2: 20, stroke: '#e53e3e', strokeWidth: 3 }),
          D.text({ x: 50, y: 24, style: { fontSize: '12px', fill: '#2d3748' } }, 'Monolithic'),
          D.line({ x1: 10, y1: 40, x2: 40, y2: 40, stroke: '#48bb78', strokeWidth: 3 }),
          D.text({ x: 50, y: 44, style: { fontSize: '12px', fill: '#2d3748' } }, 'Lazy')
        )
      )
    );
  }

  private tableHeaderStyle() {
    return {
      padding: '12px',
      textAlign: 'left' as const,
      borderBottom: '1px solid #e2e8f0',
      background: '#f7fafc',
      fontWeight: 'bold' as const,
      color: '#4a5568',
    };
  }

  private tableCellStyle(extraStyle = {}) {
    return {
      padding: '12px',
      textAlign: 'left' as const,
      borderBottom: '1px solid #e2e8f0',
      ...extraStyle,
    };
  }

  private handleMonolithicMetric = (metric: PerformanceMetric) => {
    console.log('Monolithic metric received:', metric);
    this.monolithicMetrics.set(metric.operation, metric);
    
    if (metric.operation === 'totalLoad') {
      const metrics: PerformanceMetrics = {
        success: true,
        loadTime: metric.duration,
        queryTime: this.monolithicMetrics.get('initialQuery')?.duration || 0,
        renderTime: this.monolithicMetrics.get('processAndRender')?.duration || 0,
        nodeCount: metric.nodeCount || 0,
        memoryEstimate: (metric.nodeCount || 0) * 2,
      };
      this.setState({ currentMonolithicMetrics: metrics });
    }
  };

  private handleLazyMetric = (metric: PerformanceMetric) => {
    console.log('Lazy metric received:', metric);
    this.lazyMetrics.set(metric.operation, metric);
    
    if (metric.operation === 'totalLoad') {
      const metrics: PerformanceMetrics = {
        success: true,
        loadTime: metric.duration,
        queryTime: this.lazyMetrics.get('initialQuery')?.duration || 0,
        renderTime: this.lazyMetrics.get('processAndRender')?.duration || 0,
        nodeCount: metric.nodeCount || 0,
        memoryEstimate: (metric.nodeCount || 0) * 2,
      };
      this.setState({ currentLazyMetrics: metrics });
    }
  };

  private async runSingleTest() {
    this.setState({ 
      isRunning: true,
      currentMonolithicMetrics: undefined,
      currentLazyMetrics: undefined,
      testKey: this.state.testKey + 1
    });
    
    // Clear previous metrics
    this.monolithicMetrics.clear();
    this.lazyMetrics.clear();
    
    try {
      // Wait for components to load and metrics to be collected
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // Collect results
      if (this.state.currentMonolithicMetrics && this.state.currentLazyMetrics) {
        const speedup = (this.state.currentMonolithicMetrics.loadTime / this.state.currentLazyMetrics.loadTime).toFixed(2);
        
        const newResult: TestResult = {
          size: this.state.selectedSize,
          monolithic: this.state.currentMonolithicMetrics,
          lazy: this.state.currentLazyMetrics,
          speedup,
          winner: parseFloat(speedup) > 1 ? 'lazy' : 'monolithic',
        };
        
        this.setState((state) => ({
          results: [...state.results, newResult],
        }));
      }
    } finally {
      this.setState({ isRunning: false });
    }
  }

  private async runAllTests() {
    const { testSizes } = this.props;
    this.setState({ isRunning: true, currentTest: 0, totalTests: testSizes.length });

    for (let i = 0; i < testSizes.length; i++) {
      this.setState({ 
        currentTest: i + 1,
        selectedSize: testSizes[i],
        currentMonolithicMetrics: undefined,
        currentLazyMetrics: undefined,
        testKey: this.state.testKey + 1
      });
      
      this.monolithicMetrics.clear();
      this.lazyMetrics.clear();
      
      // Wait for components to load
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // Collect results
      if (this.state.currentMonolithicMetrics && this.state.currentLazyMetrics) {
        const speedup = (this.state.currentMonolithicMetrics.loadTime / this.state.currentLazyMetrics.loadTime).toFixed(2);
        
        const newResult: TestResult = {
          size: testSizes[i],
          monolithic: this.state.currentMonolithicMetrics,
          lazy: this.state.currentLazyMetrics,
          speedup,
          winner: parseFloat(speedup) > 1 ? 'lazy' : 'monolithic',
        };
        
        this.setState((state) => ({
          results: [...state.results, newResult],
        }));
      }
      
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    this.setState({ isRunning: false, currentTest: undefined, totalTests: undefined });
  }

  private calculateGrowthRate(points: Array<{x: number, y: number}>): number {
    if (points.length < 2) return 0;
    
    let totalGrowth = 0;
    for (let i = 1; i < points.length; i++) {
      const sizeRatio = points[i].x / points[i-1].x;
      const timeRatio = points[i].y / points[i-1].y;
      
      if (sizeRatio > 1 && timeRatio > 0) {
        totalGrowth += Math.log(timeRatio) / Math.log(sizeRatio);
      }
    }
    
    return totalGrowth / (points.length - 1);
  }

  private classifyComplexity(growthRate: number): string {
    if (growthRate < 0.3) return 'O(1) - Constant time';
    if (growthRate < 0.8) return 'O(log n) - Logarithmic';
    if (growthRate < 1.3) return 'O(n) - Linear';
    if (growthRate < 2.2) return 'O(n log n) - Linearithmic';
    return 'O(n²) or higher - Polynomial/Exponential';
  }

  private describeGrowth(growthRate: number): string {
    if (growthRate < 0.3) return 'Excellent scalability';
    if (growthRate < 0.8) return 'Very good scalability';
    if (growthRate < 1.3) return 'Good scalability';
    if (growthRate < 2.2) return 'Moderate scalability';
    return 'Poor scalability';
  }

  private exportCSV() {
    let csv =
      'Dataset Size,Monolithic Load Time (ms),Monolithic Query Time (ms),Monolithic Render Time (ms),Monolithic Memory (KB),';
    csv += 'Lazy Load Time (ms),Lazy Query Time (ms),Lazy Render Time (ms),Lazy Memory (KB),Speedup,Winner\n';

    this.state.results.forEach((result) => {
      csv += `${result.size},`;
      csv += `${result.monolithic.success ? result.monolithic.loadTime.toFixed(2) : 'Error'},`;
      csv += `${result.monolithic.success ? result.monolithic.queryTime.toFixed(2) : 'Error'},`;
      csv += `${result.monolithic.success ? result.monolithic.renderTime.toFixed(2) : 'Error'},`;
      csv += `${result.monolithic.success ? result.monolithic.memoryEstimate : 'Error'},`;
      csv += `${result.lazy.success ? result.lazy.loadTime.toFixed(2) : 'Error'},`;
      csv += `${result.lazy.success ? result.lazy.queryTime.toFixed(2) : 'Error'},`;
      csv += `${result.lazy.success ? result.lazy.renderTime.toFixed(2) : 'Error'},`;
      csv += `${result.lazy.success ? result.lazy.memoryEstimate : 'Error'},`;
      csv += `${result.speedup},`;
      csv += `${result.winner}\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `performance-results-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  private clearResults() {
    this.setState({ results: [], currentMonolithicMetrics: undefined, currentLazyMetrics: undefined });
  }
}

export default PerformanceTestRunner;
