(window.webpackJsonp=window.webpackJsonp||[]).push([[228],{3381:function(n,t,e){"use strict";e.r(t),e.d(t,"isCssAnimationSupported",(function(){return d}));var i=e(184),r=e.n(i),o=e(3382),a=e(3383),s=e.n(a),d=0!==o.default.endEvents.length,m=["Webkit","Moz","O","ms"],u=["-webkit-","-moz-","-o-","ms-",""];function getStyleProperty(n,t){for(var e=window.getComputedStyle(n,null),i="",r=0;r<u.length&&!(i=e.getPropertyValue(u[r]+t));r++);return i}function fixBrowserByTimeout(n){if(d){var t=parseFloat(getStyleProperty(n,"transition-delay"))||0,e=parseFloat(getStyleProperty(n,"transition-duration"))||0,i=parseFloat(getStyleProperty(n,"animation-delay"))||0,r=parseFloat(getStyleProperty(n,"animation-duration"))||0,o=Math.max(e+t,r+i);n.rcEndAnimTimeout=setTimeout((function(){n.rcEndAnimTimeout=null,n.rcEndListener&&n.rcEndListener()}),1e3*o+200)}}function clearBrowserBugTimeout(n){n.rcEndAnimTimeout&&(clearTimeout(n.rcEndAnimTimeout),n.rcEndAnimTimeout=null)}var c=function cssAnimation(n,t,e){var i="object"===(void 0===t?"undefined":r()(t)),a=i?t.name:t,d=i?t.active:t+"-active",m=e,u=void 0,c=void 0,E=s()(n);return e&&"[object Object]"===Object.prototype.toString.call(e)&&(m=e.end,u=e.start,c=e.active),n.rcEndListener&&n.rcEndListener(),n.rcEndListener=function(t){t&&t.target!==n||(n.rcAnimTimeout&&(clearTimeout(n.rcAnimTimeout),n.rcAnimTimeout=null),clearBrowserBugTimeout(n),E.remove(a),E.remove(d),o.default.removeEndEventListener(n,n.rcEndListener),n.rcEndListener=null,m&&m())},o.default.addEndEventListener(n,n.rcEndListener),u&&u(),E.add(a),n.rcAnimTimeout=setTimeout((function(){n.rcAnimTimeout=null,E.add(d),c&&setTimeout(c,0),fixBrowserByTimeout(n)}),30),{stop:function stop(){n.rcEndListener&&n.rcEndListener()}}};c.style=function(n,t,e){n.rcEndListener&&n.rcEndListener(),n.rcEndListener=function(t){t&&t.target!==n||(n.rcAnimTimeout&&(clearTimeout(n.rcAnimTimeout),n.rcAnimTimeout=null),clearBrowserBugTimeout(n),o.default.removeEndEventListener(n,n.rcEndListener),n.rcEndListener=null,e&&e())},o.default.addEndEventListener(n,n.rcEndListener),n.rcAnimTimeout=setTimeout((function(){for(var e in t)t.hasOwnProperty(e)&&(n.style[e]=t[e]);n.rcAnimTimeout=null,fixBrowserByTimeout(n)}),0)},c.setTransition=function(n,t,e){var i=t,r=e;void 0===e&&(r=i,i=""),i=i||"",m.forEach((function(t){n.style[t+"Transition"+i]=r}))},c.isCssAnimationSupported=d,t.default=c},3382:function(n,t,e){"use strict";e.r(t);var i={transitionstart:{transition:"transitionstart",WebkitTransition:"webkitTransitionStart",MozTransition:"mozTransitionStart",OTransition:"oTransitionStart",msTransition:"MSTransitionStart"},animationstart:{animation:"animationstart",WebkitAnimation:"webkitAnimationStart",MozAnimation:"mozAnimationStart",OAnimation:"oAnimationStart",msAnimation:"MSAnimationStart"}},r={transitionend:{transition:"transitionend",WebkitTransition:"webkitTransitionEnd",MozTransition:"mozTransitionEnd",OTransition:"oTransitionEnd",msTransition:"MSTransitionEnd"},animationend:{animation:"animationend",WebkitAnimation:"webkitAnimationEnd",MozAnimation:"mozAnimationEnd",OAnimation:"oAnimationEnd",msAnimation:"MSAnimationEnd"}},o=[],a=[];function addEventListener(n,t,e){n.addEventListener(t,e,!1)}function removeEventListener(n,t,e){n.removeEventListener(t,e,!1)}"undefined"!=typeof window&&"undefined"!=typeof document&&function detectEvents(){var n=document.createElement("div").style;function process(t,e){for(var i in t)if(t.hasOwnProperty(i)){var r=t[i];for(var o in r)if(o in n){e.push(r[o]);break}}}"AnimationEvent"in window||(delete i.animationstart.animation,delete r.animationend.animation),"TransitionEvent"in window||(delete i.transitionstart.transition,delete r.transitionend.transition),process(i,o),process(r,a)}();var s={startEvents:o,addStartEventListener:function addStartEventListener(n,t){0!==o.length?o.forEach((function(e){addEventListener(n,e,t)})):window.setTimeout(t,0)},removeStartEventListener:function removeStartEventListener(n,t){0!==o.length&&o.forEach((function(e){removeEventListener(n,e,t)}))},endEvents:a,addEndEventListener:function addEndEventListener(n,t){0!==a.length?a.forEach((function(e){addEventListener(n,e,t)})):window.setTimeout(t,0)},removeEndEventListener:function removeEndEventListener(n,t){0!==a.length&&a.forEach((function(e){removeEventListener(n,e,t)}))}};t.default=s}}]);
//# sourceMappingURL=npm.css-animation-96319aaaa338c29b81ac.js.map