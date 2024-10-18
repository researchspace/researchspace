# Release Notes - ResearchSpace 4.0.0

> The ResearchSpace codebase has been developed for more than a decade. During this period practices and approaches to semantic modelling have changed, ontologies have evolved, and UI/UX have become more sophisticated. This release brings with it an exhaustive review of how to build on ResearchSpace as a platform and offers a more accessible starting point for users and developers with default templates and complex customisations that encourage good practices when creating a ResearchSpace-based projects.

> The building blocks of the ResearchSpace platform are ontologies, knowledge patterns, and its templates that enable constructing interactive user interfaces with mechanisms for authoring, viewing and searching [ResearchSpace documentation](https://documentation.researchspace.org/resource/rsp:Start).

## {Release Notes Version - 4.0.0}
## {Release Date - 2024-09-01}

{Optional: High-level summary}

### New features

- **Resource Configuration**

  ***System Resources***
  KP Category, Char, Timeline, Image Annotation, Knowledge Map, Semantic Narrative, Set, Set Item, User

  ***CIDOC CRM Related Resource Configurations***
  Type, Group, Organisation, Material, Model 3D, Acquisition, Activity, Actor, Appellation, Attribute assignment, Audio, Authority document, Beginning of existence, Biological object, Birth, Conceptual object, Condition assessment, Condition state, Creation, Curated collection, Curation activity, Death, Design or procedure, Destruction, Dimension, Dissolution, Document, End of existence, Entity, Event, Exhibition, Formation, Identifier, Identifier assignment, Image, Information object, Inscription, Joining, Language, Leaving, Linguistic object, Human-made feature, Human-made object, Mark, Measurement, Modification, Move, Part addition, Part removal, Period, Persistent item, Person, Physical feature, Physical Human-made thing, Physical object, Physical thing, Place, Production, Project, Propositional object, Publication, Research question, Right, Series, Site, Symbolic object, Term, Timespan, Title, Transfer of custody, Transformation, Type assignment, Type creation, Video, Visual item


- **New Resource**

  {Feature description}
  
- **Importing Resources using REST APIs (OSM, MET, V&A, TNA examples)**
  ==Human-made Object==
  ==Place==

- **Finder**

  {Feature description}

- **Default Resources Search**

  {Feature description}

  * Individual Resource Search Pages
  * All Resources Search Page

- **Ontologies**
* Default loading of CIDOC CRM 6.2.1, ... Influece
* Support for automatic generation and tagging of knowledge patterns when an ontology is uploaded
* Delete all the associated knowledge patterns when an ontology is removed from the system
* Ontology properties search with inference across ontologies uploaded in a running system
* Support for upload of both owl and rdfs descriptions of ontologies

- **Knowledge Patterns**
* System knowledge patterns

- **System Vocabularies**

### Improvements

- **Semantic Modelling**

Change mapping for SN and KM to F2_Expression
Modified mapping for Audio/Video/3D from F21 to F26_Recording
Modified crm:P1_is_identified_by/rs:PX_has_file_name for images/docs with new mapping crmdig:L60i_is_documented_by/crmdig:L11_had_output/rs:PX_has_file_name
- Modified mapping for EX_File in Image, Doc, Video, Audio, 3D

  [Media previous mapping](./images/release4/media_previous_mapping.png)

  [Media new mapping](./images/release4/media_new_mapping.png)


- **Semantic Components**

  {Improvement description}

<table>
  <tr>
    <th>Semantic Component</th>
    <th>Improvement</th>
  </tr>
  <tr>
    <td>Dashboard</td>
    <td><strong>Frames Tab Labelling </strong><br><br>
    * customLabel prop
    * add trigger events to rename tabs when new resources are created (new Knowledge Map, new Resource of any type)
    </td>
  </tr>
   <tr>
    <td>Sets</td>
    <td><strong></strong><br><br>
      Add support for sets to be added and removed from clipboard, but not deleted from the system
    </td>
  </tr>
  <tr>
    <td>Select Input</td>
    <td><strong> </strong><br><br>
Added urlqueryparam-open-as-drag-and-drop="true" to autocomplete, select-input, treePickerInput resource link

remove nested-form-template and replace with nested-form-templates
    </td>
  </tr>
  <tr>
    <td>Autocomplete Input</td>
    <td><strong>guide-content-type.md</strong><br><br>This guide provides a deeper explanation of how to fill in the template. It provides a lightweight introduction to the purpose of this documentation and explains how to fill in each section of the document.</td>
  </tr>
  <tr>
    <td>RDFUploader</td>
    <td><strong>resources-content-type.md</strong><br><br>This document includes the resources (books, blog entries, guides) that the template author(s) used during the research phase of creating the template. It also includes any high-quality examples of that content type that served as inspiration for the template.</td>
  </tr>
  <tr>
    <td>SemanticTreeInput</td>
    <td><strong></strong><br><br>
    </td>
  </tr>
  <tr>
    <td>SelectionActionChoiceComponent UI</td>
    <td><strong></strong><br><br>
    </td>
  </tr>
<tr>
    <td>semantic-lazy-tree</td>
    <td><strong></strong><br><br>
      Fixed ORDER BY in QueryDefaults.ts
    </td>
  </tr>

</table>


### Bug fixes

- **{Bug fix title}**

  {Bug fix description}

### Updates ###

- **{Node 20, Webpack 5}**

In the docker compose you should have something like:
        - ./.ssh:/home/jetty/.ssh

change it to:
        - ./.ssh:/var/lib/jetty/.ssh

added "material-symbols": "^0.16.0"
### Known issues

- **{Known issue title}**

  {Known issue description}

### Optional: Deprecated features

- **{Deprecated feature title}**

  {Deprecated feature description}

---

> Explore other templates from [The Good Docs Project](https://thegooddocsproject.dev/). Use our [feedback form](https://thegooddocsproject.dev/feedback/?template=Release%20notes) to give feedback on this template.