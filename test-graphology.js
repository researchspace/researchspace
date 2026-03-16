const Graph = require('graphology');

const graph = new Graph();
graph.addNode('A');
graph.addNode('B');
graph.addEdge('A', 'B');

if (graph.order === 2 && graph.size === 1) {
  console.log('Graphology is working perfectly!');
} else {
  console.error('Something went wrong with graphology.');
  process.exit(1);
}
