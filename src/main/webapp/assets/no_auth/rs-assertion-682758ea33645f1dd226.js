(window.webpackJsonp=window.webpackJsonp||[]).push([[452],{1483:function(e,t,n){Object.defineProperty(t,"__esModule",{value:!0});var a,r,i=n(11),l=n(1),s=n(1559),o=n(72),u=n(33),c=n(43),m=n(16),p=n(19),d=n(7),f=n(56),v=n(630),g=n(23),C=n(144),h=n(120),b=n(61),E=n(634),A=n(162),y=n(1562),S=n(327),N=n(1632),V=n(633),w=n(63),_=n(116),T=n(1624),x=n(1588),F=n(1988),L=n(2342),D=n(1300),B=n(3335),M=n(1484),I="ASK {\n  OPTIONAL {\n    ?assertion "+T.rso.targetsRecord+" ?subject ;\n               "+T.rso.PX_asserts+" ?belief .\n    ?belief "+T.rso.PX_asserts_value+" ?value .\n    ?belief "+T.rso.PX_is_canonical_value+" ?isCanonicalValue .\n  }\n  FILTER(!bound(?belief) || ?isCanonicalValue)\n}",P="ASK {\n  ?assertion "+T.rso.targetsRecord+" ?subject ;\n             "+T.rso.PX_asserts+" ?belief .\n  ?belief "+T.rso.PX_asserts_value+" ?value .\n  FILTER EXISTS { ?argument "+T.crminf.J2_concluded_that+" ?belief }\n}",R="ASK {\n  ?value a "+T.rso.UserDefinedPage+".\n}";!function(e){e.None="none",e.Redirect="redirect"}(a=t.PostAction||(t.PostAction={})),function(e){e[e.Loading=0]="Loading",e[e.Saving=1]="Saving"}(r=t.Status||(t.Status={}));var k=function(e){function AssertionComponent(t,n){var s=e.call(this,t,n)||this;s.cancellation=new E.Cancellation,s.onChangeBelief=function(e){s.setState((function(t){var n=t.beliefs;return e.isCanonical&&"No Opinion"===e.belief.value?{beliefs:n.remove(e.targetValue)}:{beliefs:n.set(e.targetValue,e)}}))},s.onRemoveBelief=function(e){s.setState((function(t){return{beliefs:t.beliefs.remove(e.targetValue)}}))},s.getBeliefValue=function(e,t){var n=s.state,a=n.target,r=n.field,i=n.beliefs,l=L.AssertionsComponent.deserializeBeliefValue(s.state.field,e);return i.get(l)||L.AssertionsComponent.getDefaultBelief(a,r,l,t,"default")},s.onSaveAssertion=function(){var e=s.props,t=e.id,n=e.postAction,i=s.state,l=i.target,o=i.field,c=i.title,m=i.description,d=i.beliefs,f=i.narrative,v=i.assertionIri;s.setState({status:r.Saving});var g={iri:u.fromNullable(v),title:c,note:m,narrative:f,field:o,target:l,beliefs:d.valueSeq().toArray()};s.cancellation.map(F.saveAssertion(g)).flatMap((function(e){return n===a.None?(s.setState({assertionIri:e.assertion,status:void 0}),A.trigger({source:t,eventType:B.AssertionSaved,data:{resourceIri:e.assertion.value}}),p.constant(void 0)):w.navigateToResource(e.assertion,{},"assets")})).observe({value:function(){_.addNotification({level:"success",message:"Assertion has been "+(v?"updated":"saved")+" successfully!"})},error:function(e){console.error(e),_.addNotification({level:"error",message:"Something went wrong during "+(v?"updating":"saving")+" the assertion."}),s.setState({status:void 0})}})},s.renderValue=function(e,t){var n,a=s.props.valueTemplate,r=s.state.field,i=d(((n={})[M.dot]=!0,n[M.item]=!0,n[M.canonical]=e.isCanonical,n[M.notCanonical]=!e.isCanonical,n[M.hasArgument]=e.hasArgument,n));return l.createElement("div",{key:t,className:M.row},l.createElement("div",{className:M.dotCell},l.createElement("span",{className:i})),l.createElement("div",{className:M.valueCell},l.createElement(v.TemplateItem,{template:{source:a,options:{value:e,field:y.normalizeFieldDefinition(r)}}})),l.createElement("div",{className:M.beliefCell},l.createElement(D.Belief,{forValue:e.value.value,isCanonical:e.isCanonical})))};var o=t,m=o.target,f=o.fields,C=t.assertion,h=f.map((function(e){return i.__assign(i.__assign({},e),{iri:e.iri||e.id,id:"field"})})).sort(compareFieldDefinitionsByLabel);return s.state={target:m?g.Rdf.iri(m):void 0,fields:h,field:1===h.length?h[0]:void 0,title:"",description:"",beliefs:c.Map(),newValues:[],assertionIri:C?g.Rdf.iri(C):void 0,status:C?r.Loading:void 0},s}return i.__extends(AssertionComponent,e),AssertionComponent.prototype.getChildContext=function(){var t=e.prototype.getChildContext.call(this);return i.__assign(i.__assign({},t),{changeBelief:this.onChangeBelief,removeBelief:this.onRemoveBelief,getBeliefValue:this.getBeliefValue})},AssertionComponent.prototype.componentDidMount=function(){var e=this.state,t=e.field,n=e.assertionIri;t&&(this.queryValues(t),this.updateFormTemplate()),n&&this.loadAssertion()},AssertionComponent.prototype.componentDidUpdate=function(e,t){var n=this.state,a=n.field,r=n.assertionIri;a===t.field||r||(this.resetState(),a&&(this.queryValues(a),this.updateFormTemplate()))},AssertionComponent.prototype.componentWillUnmount=function(){this.cancellation.cancelAll()},AssertionComponent.prototype.loadAssertion=function(){var e=this;this.cancellation.map(F.loadAssertion(this.state.assertionIri)).onValue((function(t){var n=c.Map(t.beliefs.map((function(e){return[e.targetValue,e]})));e.setState({target:t.target,field:t.field,title:t.title,description:t.note,narrative:t.narrative,beliefs:n}),e.queryValues(t.field),e.updateFormTemplate()}))},AssertionComponent.prototype.resetState=function(){this.setState({title:"",description:"",beliefs:c.Map(),values:void 0,newValues:[],addingNewValue:!1,narrative:void 0,addingNarrative:!1})},AssertionComponent.prototype.queryValues=function(e){var t=this,n=this.context.semanticContext,a=this.state.target;this.setState({status:r.Loading}),y.queryValues(e.selectPattern,a,{context:n}).flatMap((function(e){if(!e.length)return p.constant([]);var a=e.map((function(e){var a=t.parametrizeQuery(I,e),r=b.SparqlClient.ask(a,{context:n}),l=t.parametrizeQuery(P,e),s=b.SparqlClient.ask(l,{context:n});return p.combine({isCanonical:r,hasArgument:s}).map((function(t){var n=t.isCanonical,a=t.hasArgument;return i.__assign(i.__assign({},e),{isCanonical:n,hasArgument:a})}))}));return p.zip(a)})).onValue((function(e){return t.setState({values:e,status:void 0})}))},AssertionComponent.prototype.parametrizeQuery=function(e,t){var n=this.state.target,a=b.SparqlUtil.parseQuerySync(e);return b.SparqlClient.setBindings(a,{subject:n,value:t.value})},AssertionComponent.prototype.updateFormTemplate=function(){var e=this,t=this.context.templateDataContext,n=this.props.formTemplate;if(n){var a=C.CapturedContext.inheritAndCapture(t);this.appliedTemplateScope.compile(n).then((function(n){return h.ModuleRegistry.parseHtmlToReact(n({field:e.state.field},{capturer:a,parentContext:t}))})).then((function(t){e.setState({formTemplate:t,capturedDataContext:a.getResult()})}))}},AssertionComponent.prototype.renderNewValueForm=function(){var e=this,t=this.state,n=t.target,a=t.field,r=t.addingNewValue,s=t.formTemplate;if(!s)return null;var u=i.__assign({},a);u.values=this.state.newValues.map((function(e){return{value:e}})),u.minOccurs=1,u.maxOccurs=1;var c=l.createElement("div",null,l.createElement("a",{href:"",onClick:function(t){t.preventDefault(),e.setState({addingNewValue:!0})}},"Add an alternative value..."));return r&&s&&(c=l.createElement(y.ResourceEditorForm,{newSubjectTemplate:n.value,fields:[u],persistence:this,browserPersistence:!1,postAction:function(){return e.setState({addingNewValue:!1})}},l.createElement(o.FormGroup,null,s),l.createElement("div",{"data-flex-layout":"row top-right"},l.createElement(o.Button,{bsStyle:"danger",onClick:function(){return e.setState({addingNewValue:!1})}},"Cancel"),l.createElement("button",{name:"submit",className:"btn btn-success",style:{marginLeft:12}},"Submit")))),l.createElement(o.FormGroup,null,l.createElement(o.ControlLabel,null,"New Value"),c)},AssertionComponent.prototype.renderNarrative=function(){var e=this,t=this.state,n=t.addingNarrative,a=t.narrative,r=l.createElement("div",null,l.createElement("a",{href:"",onClick:function(t){t.preventDefault(),e.setState((function(e){return{addingNarrative:!e.addingNarrative}}))}},"Add semantic narrative..."),n?l.createElement(o.Panel,{collapsible:!0,expanded:n},l.createElement(N.DropArea,{alwaysVisible:!0,query:R,repository:"assets",onDrop:function(t){return e.setState({narrative:t})},dropMessage:"You can drag and drop Semantic Narrative from Clipboard here, to use it as a description"})):null);return a&&(r=l.createElement("div",null,l.createElement(V.ResourceLinkComponent,{iri:a.value}))),l.createElement(o.FormGroup,null,l.createElement(o.ControlLabel,null,"Narrative"),r)},AssertionComponent.prototype.renderAssertionForm=function(){var e=this,t=this.state,n=t.field,a=t.title,i=t.description,s=t.beliefs,u=t.assertionIri,c=t.status;if(!n)return null;var m=c===r.Saving,p=m||c===r.Loading||0===a.length||s.isEmpty()||s.some((function(e){return e.belief.value===x.SimpleBeliefValue.NoOpinion}));return l.createElement("div",null,l.createElement("hr",null),l.createElement("h4",null,"New Assertion"),l.createElement(o.FormGroup,null,l.createElement(o.ControlLabel,null,"Title*"),l.createElement(o.FormControl,{type:"text",value:a,placeholder:"Enter assertion title...",onChange:function(t){return e.setState({title:t.target.value})}})),l.createElement(o.FormGroup,null,l.createElement(o.ControlLabel,null,"Description"),l.createElement(o.FormControl,{componentClass:"textarea",value:i,placeholder:"Enter assertion description...",onChange:function(t){return e.setState({description:t.target.value})}})),this.renderNarrative(),this.renderNewValueForm(),l.createElement(o.Button,{bsStyle:"primary",onClick:this.onSaveAssertion,disabled:p},m?l.createElement("span",null,u?"Updating":"Saving",l.createElement("i",{className:"fa fa-cog fa-spin",style:{marginLeft:5}})):u?"Update Assertion":"Save Assertion"))},AssertionComponent.prototype.renderNote=function(){return l.createElement("div",null,l.createElement("span",{className:"label "+M.label+" "+M.canonical},"BRITISH MUSEUM"),l.createElement("br",null),l.createElement("span",{className:"label "+M.label+" "+M.notCanonical},"COMMUNITY"),l.createElement("br",null),l.createElement("div",{className:M.note},l.createElement("span",{className:M.dot+" "+M.canonical+" "+M.hasArgument+" "+M.noteDot}),l.createElement("span",{className:M.dot+" "+M.notCanonical+" "+M.hasArgument+" "+M.noteDot}),l.createElement("i",{className:M.note},"Has an argument given in support of a belief")),l.createElement("div",{className:M.note},l.createElement("span",{className:M.dot+" "+M.canonical+" "+M.noteDot}),l.createElement("span",{className:M.dot+" "+M.notCanonical+" "+M.noteDot}),l.createElement("i",{className:M.note},"No argument given")))},AssertionComponent.prototype.renderValues=function(){var e=this,t=this.state,n=t.field,a=t.values,r=t.newValues;return n?a?l.createElement("div",null,l.createElement("div",{className:M.row},l.createElement("div",{className:M.dotCell}),l.createElement("div",{className:M.valueCell},l.createElement("strong",null,"Value")),l.createElement("div",{className:M.beliefCell},l.createElement("i",{className:M.beliefTitle},"Do you agree?"))),l.createElement("div",{className:M.body},a.length||r.length?l.createElement("div",null,a.map(this.renderValue),r.map((function(t,n){return e.renderValue({value:t,isCanonical:!1,hasArgument:!1},n)}))):l.createElement("i",null,"No Values")),this.renderNote()):l.createElement(S.Spinner,null):null},AssertionComponent.prototype.render=function(){var e=this,t=this.state,n=t.fields,a=t.field,i=t.assertionIri;return t.status===r.Loading?l.createElement(S.Spinner,null):l.createElement("div",null,l.createElement(o.FormGroup,null,l.createElement(o.ControlLabel,null,"Field to assert on"),i?l.createElement(o.FormControl,{type:"text",value:y.getPreferredLabel(a.label),disabled:!0}):l.createElement(s.default,{value:a?a.iri:void 0,options:n.map((function(e){return{value:e.iri,label:y.getPreferredLabel(e.label)}})),onChange:function(t){var a=t?n.find((function(e){return e.iri===t.value})):void 0;e.setState({field:a})}})),this.renderValues(),this.renderAssertionForm())},AssertionComponent.prototype.remove=function(e){},AssertionComponent.prototype.persist=function(e,t){var n=this,a=this.state,r=a.target,i=a.field;return this.persistCompositeValue(e,t).map((function(e){return n.setState((function(t){var n=L.AssertionsComponent.getDefaultBelief(r,i,e[0],!1,"default");return n.belief.value=x.SimpleBeliefValue.Agree,{beliefs:t.beliefs.set(e[0],n),newValues:t.newValues.concat(e)}}))}))},AssertionComponent.prototype.persistCompositeValue=function(e,t){var n=this.state.target,a=y.computeModelDiff(y.FieldValue.empty,t);if(a.length>1){var r=m.find(a,(function(e){return e.subject.equals(n)})),i=m.filter(a,(function(e){return!e.subject.equals(n)}));return(new y.LdpPersistence).persistModelUpdates(i[0].subject,i).map((function(){return r.inserted}))}return p.constant(m.flatten(a.map((function(e){return e.inserted}))))},AssertionComponent.defaultProps={fields:[],valueTemplate:'<div>\n  {{#ifCond field.xsdDatatype.value "=="  "http://www.w3.org/2001/XMLSchema#string"}}\n    {{value.value.value}}\n  {{/ifCond}}\n  {{#ifCond field.xsdDatatype.value "=="  "http://www.w3.org/2001/XMLSchema#dateTime"}}\n    {{value.value.value}}\n  {{/ifCond}}\n  {{#ifCond field.xsdDatatype.value "=="  "http://www.w3.org/2001/XMLSchema#anyURI"}}\n    <semantic-link uri="{{value.value.value}}" guess-repository=true></semantic-link>\n  {{/ifCond}}\n</div>',postAction:a.Redirect},AssertionComponent.childContextTypes=i.__assign(i.__assign(i.__assign({},f.Component.childContextTypes),x.ArgumentsContextTypes),f.TemplateContextTypes),AssertionComponent}(f.Component);function compareFieldDefinitionsByLabel(e,t){return e.label<t.label?-1:e.label>t.label?1:0}t.AssertionComponent=k,t.default=k},3335:function(e,t,n){Object.defineProperty(t,"__esModule",{value:!0});var a=n(162).EventMaker;t.AssertionSaved=a("Assertion.Saved")}}]);
//# sourceMappingURL=rs-assertion-682758ea33645f1dd226.js.map