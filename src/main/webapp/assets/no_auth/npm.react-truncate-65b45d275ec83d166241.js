(window.webpackJsonp=window.webpackJsonp||[]).push([[437],{3070:function(e,t,n){"use strict";n.r(t);var i=n(1),r=n.n(i),o=n(0),a=n.n(o),s=Object.assign||function(e){for(var t=1;t<arguments.length;t++){var n=arguments[t];for(var i in n)Object.prototype.hasOwnProperty.call(n,i)&&(e[i]=n[i])}return e},l=function(){function defineProperties(e,t){for(var n=0;n<t.length;n++){var i=t[n];i.enumerable=i.enumerable||!1,i.configurable=!0,"value"in i&&(i.writable=!0),Object.defineProperty(e,i.key,i)}}return function(e,t,n){return t&&defineProperties(e.prototype,t),n&&defineProperties(e,n),e}}();function _classCallCheck(e,t){if(!(e instanceof t))throw new TypeError("Cannot call a class as a function")}function _possibleConstructorReturn(e,t){if(!e)throw new ReferenceError("this hasn't been initialised - super() hasn't been called");return!t||"object"!=typeof t&&"function"!=typeof t?e:t}var c=function(e){function Truncate(){var e;_classCallCheck(this,Truncate);for(var t=arguments.length,n=Array(t),i=0;i<t;i++)n[i]=arguments[i];var r=_possibleConstructorReturn(this,(e=Truncate.__proto__||Object.getPrototypeOf(Truncate)).call.apply(e,[this].concat(n)));return r.state={},r.styles={ellipsis:{position:"fixed",visibility:"hidden",top:0,left:0}},r.elements={},r.onResize=r.onResize.bind(r),r.onTruncate=r.onTruncate.bind(r),r.calcTargetWidth=r.calcTargetWidth.bind(r),r.measureWidth=r.measureWidth.bind(r),r.getLines=r.getLines.bind(r),r.renderLine=r.renderLine.bind(r),r}return function _inherits(e,t){if("function"!=typeof t&&null!==t)throw new TypeError("Super expression must either be null or a function, not "+typeof t);e.prototype=Object.create(t&&t.prototype,{constructor:{value:e,enumerable:!1,writable:!0,configurable:!0}}),t&&(Object.setPrototypeOf?Object.setPrototypeOf(e,t):e.__proto__=t)}(Truncate,e),l(Truncate,[{key:"componentDidMount",value:function componentDidMount(){var e=this.elements,t=e.text,n=e.ellipsis,i=this.calcTargetWidth,r=this.onResize,o=document.createElement("canvas");this.canvasContext=o.getContext("2d"),document.body.appendChild(n),i((function(){t&&t.parentNode.removeChild(t)})),window.addEventListener("resize",r)}},{key:"componentDidUpdate",value:function componentDidUpdate(e){this.props.children!==e.children&&this.forceUpdate()}},{key:"componentWillUnmount",value:function componentWillUnmount(){var e=this.elements.ellipsis,t=this.onResize,n=this.timeout;e.parentNode.removeChild(e),window.removeEventListener("resize",t),window.cancelAnimationFrame(n)}},{key:"innerText",value:function innerText(e){var t=document.createElement("div"),n="innerText"in window.HTMLElement.prototype?"innerText":"textContent";t.innerHTML=e.innerHTML.replace(/\r\n|\r|\n/g," ");var i=t[n],r=document.createElement("div");return r.innerHTML="foo<br/>bar","foo\nbar"!==r[n].replace(/\r\n|\r/g,"\n")&&(t.innerHTML=t.innerHTML.replace(/<br.*?[\/]?>/gi,"\n"),i=t[n]),i}},{key:"onResize",value:function onResize(){this.calcTargetWidth()}},{key:"onTruncate",value:function onTruncate(e){var onTruncate=this.props.onTruncate;"function"==typeof onTruncate&&(this.timeout=window.requestAnimationFrame((function(){onTruncate(e)})))}},{key:"calcTargetWidth",value:function calcTargetWidth(e){var t=this.elements.target,calcTargetWidth=this.calcTargetWidth,n=this.canvasContext;if(t){var i=Math.floor(t.parentNode.getBoundingClientRect().width);if(!i)return window.requestAnimationFrame((function(){return calcTargetWidth(e)}));var r=window.getComputedStyle(t),o=[r["font-weight"],r["font-style"],r["font-size"],r["font-family"]].join(" ");n.font=o,this.setState({targetWidth:i},e)}}},{key:"measureWidth",value:function measureWidth(e){return this.canvasContext.measureText(e).width}},{key:"ellipsisWidth",value:function ellipsisWidth(e){return e.offsetWidth}},{key:"getLines",value:function getLines(){for(var e=this.elements,t=this.props,n=t.lines,i=t.ellipsis,o=this.state.targetWidth,a=this.innerText,s=this.measureWidth,l=this.onTruncate,c=[],u=a(e.text).split("\n").map((function(e){return e.split(" ")})),p=!0,f=this.ellipsisWidth(this.elements.ellipsis),h=1;h<=n;h++){var d=u[0];if(0!==d.length){var m=d.join(" ");if(s(m)<=o&&1===u.length){p=!1,c.push(m);break}if(h===n){for(var v=d.join(" "),y=0,T=v.length-1;y<=T;){var b=Math.floor((y+T)/2);s(v.slice(0,b+1))+f<=o?y=b+1:T=b-1}m=r.a.createElement("span",null,v.slice(0,y),i)}else{for(var g=0,w=d.length-1;g<=w;){var W=Math.floor((g+w)/2);s(d.slice(0,W+1).join(" "))<=o?g=W+1:w=W-1}if(0===g){h=n-1;continue}m=d.slice(0,g).join(" "),u[0].splice(0,g)}c.push(m)}else c.push(),u.shift(),h--}return l(p),c}},{key:"renderLine",value:function renderLine(e,t,n){if(t===n.length-1)return r.a.createElement("span",{key:t},e);var i=r.a.createElement("br",{key:t+"br"});return e?[r.a.createElement("span",{key:t},e),i]:i}},{key:"render",value:function render(){var e=this,t=this.elements.target,n=this.props,i=n.children,o=n.ellipsis,a=n.lines,l=function _objectWithoutProperties(e,t){var n={};for(var i in e)t.indexOf(i)>=0||Object.prototype.hasOwnProperty.call(e,i)&&(n[i]=e[i]);return n}(n,["children","ellipsis","lines"]),c=this.state.targetWidth,u=this.getLines,p=this.renderLine,f=this.onTruncate,h=void 0;return"undefined"!=typeof window&&!(!t||!c)&&(a>0?h=u().map(p):(h=i,f(!1))),delete l.onTruncate,r.a.createElement("span",s({},l,{ref:function ref(t){e.elements.target=t}}),r.a.createElement("span",null,h),r.a.createElement("span",{ref:function ref(t){e.elements.text=t}},i),r.a.createElement("span",{ref:function ref(t){e.elements.ellipsis=t},style:this.styles.ellipsis},o))}}]),Truncate}(i.Component);c.propTypes={children:a.a.node,ellipsis:a.a.node,lines:a.a.oneOfType([a.a.oneOf([!1]),a.a.number]),onTruncate:a.a.func},c.defaultProps={children:"",ellipsis:"…",lines:1},t.default=c}}]);
//# sourceMappingURL=npm.react-truncate-65b45d275ec83d166241.js.map