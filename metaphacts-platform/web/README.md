# Metaphacts Platform Web

Contains client-side components of the metaphacts platform - components, page viewer/editor, sparql editor, etc.

## Project Structure

* **src/main/app** - main client-side entry point. Provides basic functionality like viewing/editing of wiki pages, sparql editor.
* **src/main/styling** - generic LESS-styles
* **src/main/api** - platform APIs, like sparql client, rdf utilities, etc.
* **src/main/components** - generic platform components like table, graph, tree, etc.

### APIs

####`platform/api/sparql`####
Provides Typescript API for interactions with SPARQL endpoint.

**SparqlClient** is based on [SPARQL.js](https://github.com/RubenVerborgh/SPARQL.js), which is used for parsing/manipulations/serialization of SPARQL queries. *SPARQL.js* is based on SPARQL 1.1 standart, so **SparqlClinet** can execute only standard-compliant SPARQL queries.

####`platform/api/rdf`####
Provides basic Typescript API for RDF concepts like URI, Literal, etc.

### Components
see [ComponentTutorial](https://help.metaphacts.com/resource/Help:ComponentTutorial)

## Core 3-rd party dependencies used in a project

* **[Typescript](http://www.typescriptlang.org/)** - Statically typed superset of JavaScript. Almost all client-side components in the platform are implemented with Typescript. It is strongly recommended to use Typescript for all new developments in the platform.
* **[React](https://facebook.github.io/react/)** - JavaScript library for component-based UI.
* **[Bootstrap](https://getbootstrap.com/css/)** - CSS framework
* **[SuperAgent](https://visionmedia.github.io/superagent/)** - JavaScript library for AJAX APIs
* **[lodash](https://lodash.com/)** - "Swiss Knife" of JavaScript, provides many useful helper functions for work with collections, strings, objects, etc.
* **[immutable.js](https://facebook.github.io/immutable-js/)** - Immutable collections for JavaScript, like Set, Map, OrderedMap, etc.
* **[kefir](https://rpominov.github.io/kefir/)** - Reactive Programming library for JavaScript
