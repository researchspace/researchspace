(window.webpackJsonp=window.webpackJsonp||[]).push([[153],{1821:function(e,r,t){Object.defineProperty(r,"__esModule",{value:!0});var n=t(33);function getNumberValueForProperty(e){return function(r){var t=r.data(e);return t?getLiteralNumberValue(t[0]):n.Nothing()}}function getLiteralNumberValue(e){return e.isLiteral()?isNaN(+e.value)?n.Nothing():n.Just(+e.value):n.Nothing()}r.sort=function sort(e){var r=getNumberValueForProperty(e);return function(t,n){var u=r(t).chain((function(e){return r(n).map((function(r){return e-r}))}));return u.isNothing&&console.warn("Graph Layout: trying to sort by non numerical property "+e),u.getOrElse(0)}},r.getNumberValueForProperty=getNumberValueForProperty,r.getLiteralNumberValue=getLiteralNumberValue}}]);
//# sourceMappingURL=default~semantic-graph-layout-circle~semantic-graph-layout-concentric~semantic-graph-layout-grid~sem~571d43b4-abeefca114ecb762aa7e.js.map