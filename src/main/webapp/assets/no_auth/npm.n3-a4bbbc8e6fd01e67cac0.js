(window.webpackJsonp=window.webpackJsonp||[]).push([[264],{264:function(e,t,i){(function(t){var i=String.fromCharCode,r="function"==typeof t?t:function setImmediate(e){setTimeout(e,0)},s=/\\u([a-fA-F0-9]{4})|\\U([a-fA-F0-9]{8})|\\[uU]|\\(.)/g,n={"\\":"\\","'":"'",'"':'"',n:"\n",r:"\r",t:"\t",f:"\f",b:"\b",_:"_","~":"~",".":".","-":"-","!":"!",$:"$","&":"&","(":"(",")":")","*":"*","+":"+",",":",",";":";","=":"=","/":"/","?":"?","#":"#","@":"@","%":"%"},a=/[\x00-\x20<>\\"\{\}\|\^\`]/;function N3Lexer(e){if(!(this instanceof N3Lexer))return new N3Lexer(e);if((e=e||{}).lineMode){this._tripleQuotedString=this._number=this._boolean=/$0^/;var t=this;this._tokenize=this.tokenize,this.tokenize=function(e,i){this._tokenize(e,(function(e,r){!e&&/^(?:IRI|prefixed|literal|langcode|type|\.|eof)$/.test(r.type)?i&&i(e,r):i&&i(e||t._syntaxError(r.type,i=null))}))}}this._n3Mode=!1!==e.n3,this._comments=!!e.comments}N3Lexer.prototype={_iri:/^<((?:[^ <>{}\\]|\\[uU])+)>[ \t]*/,_unescapedIri:/^<([^\x00-\x20<>\\"\{\}\|\^\`]*)>[ \t]*/,_unescapedString:/^"[^"\\]+"(?=[^"\\])/,_singleQuotedString:/^"[^"\\]*(?:\\.[^"\\]*)*"(?=[^"\\])|^'[^'\\]*(?:\\.[^'\\]*)*'(?=[^'\\])/,_tripleQuotedString:/^""("[^"\\]*(?:(?:\\.|"(?!""))[^"\\]*)*")""|^''('[^'\\]*(?:(?:\\.|'(?!''))[^'\\]*)*')''/,_langcode:/^@([a-z]+(?:-[a-z0-9]+)*)(?=[^a-z0-9\-])/i,_prefix:/^((?:[A-Za-z\xc0-\xd6\xd8-\xf6\xf8-\u02ff\u0370-\u037d\u037f-\u1fff\u200c\u200d\u2070-\u218f\u2c00-\u2fef\u3001-\ud7ff\uf900-\ufdcf\ufdf0-\ufffd]|[\ud800-\udb7f][\udc00-\udfff])(?:\.?[\-0-9A-Z_a-z\xb7\xc0-\xd6\xd8-\xf6\xf8-\u037d\u037f-\u1fff\u200c\u200d\u203f\u2040\u2070-\u218f\u2c00-\u2fef\u3001-\ud7ff\uf900-\ufdcf\ufdf0-\ufffd]|[\ud800-\udb7f][\udc00-\udfff])*)?:(?=[#\s<])/,_prefixed:/^((?:[A-Za-z\xc0-\xd6\xd8-\xf6\xf8-\u02ff\u0370-\u037d\u037f-\u1fff\u200c\u200d\u2070-\u218f\u2c00-\u2fef\u3001-\ud7ff\uf900-\ufdcf\ufdf0-\ufffd]|[\ud800-\udb7f][\udc00-\udfff])(?:\.?[\-0-9A-Z_a-z\xb7\xc0-\xd6\xd8-\xf6\xf8-\u037d\u037f-\u1fff\u200c\u200d\u203f\u2040\u2070-\u218f\u2c00-\u2fef\u3001-\ud7ff\uf900-\ufdcf\ufdf0-\ufffd]|[\ud800-\udb7f][\udc00-\udfff])*)?:((?:(?:[0-:A-Z_a-z\xc0-\xd6\xd8-\xf6\xf8-\u02ff\u0370-\u037d\u037f-\u1fff\u200c\u200d\u2070-\u218f\u2c00-\u2fef\u3001-\ud7ff\uf900-\ufdcf\ufdf0-\ufffd]|[\ud800-\udb7f][\udc00-\udfff]|%[0-9a-fA-F]{2}|\\[!#-\/;=?\-@_~])(?:(?:[\.\-0-:A-Z_a-z\xb7\xc0-\xd6\xd8-\xf6\xf8-\u037d\u037f-\u1fff\u200c\u200d\u203f\u2040\u2070-\u218f\u2c00-\u2fef\u3001-\ud7ff\uf900-\ufdcf\ufdf0-\ufffd]|[\ud800-\udb7f][\udc00-\udfff]|%[0-9a-fA-F]{2}|\\[!#-\/;=?\-@_~])*(?:[\-0-:A-Z_a-z\xb7\xc0-\xd6\xd8-\xf6\xf8-\u037d\u037f-\u1fff\u200c\u200d\u203f\u2040\u2070-\u218f\u2c00-\u2fef\u3001-\ud7ff\uf900-\ufdcf\ufdf0-\ufffd]|[\ud800-\udb7f][\udc00-\udfff]|%[0-9a-fA-F]{2}|\\[!#-\/;=?\-@_~]))?)?)(?:[ \t]+|(?=\.?[,;!\^\s#()\[\]\{\}"'<]))/,_variable:/^\?(?:(?:[A-Z_a-z\xc0-\xd6\xd8-\xf6\xf8-\u02ff\u0370-\u037d\u037f-\u1fff\u200c\u200d\u2070-\u218f\u2c00-\u2fef\u3001-\ud7ff\uf900-\ufdcf\ufdf0-\ufffd]|[\ud800-\udb7f][\udc00-\udfff])(?:[\-0-:A-Z_a-z\xb7\xc0-\xd6\xd8-\xf6\xf8-\u037d\u037f-\u1fff\u200c\u200d\u203f\u2040\u2070-\u218f\u2c00-\u2fef\u3001-\ud7ff\uf900-\ufdcf\ufdf0-\ufffd]|[\ud800-\udb7f][\udc00-\udfff])*)(?=[.,;!\^\s#()\[\]\{\}"'<])/,_blank:/^_:((?:[0-9A-Z_a-z\xc0-\xd6\xd8-\xf6\xf8-\u02ff\u0370-\u037d\u037f-\u1fff\u200c\u200d\u2070-\u218f\u2c00-\u2fef\u3001-\ud7ff\uf900-\ufdcf\ufdf0-\ufffd]|[\ud800-\udb7f][\udc00-\udfff])(?:\.?[\-0-9A-Z_a-z\xb7\xc0-\xd6\xd8-\xf6\xf8-\u037d\u037f-\u1fff\u200c\u200d\u203f\u2040\u2070-\u218f\u2c00-\u2fef\u3001-\ud7ff\uf900-\ufdcf\ufdf0-\ufffd]|[\ud800-\udb7f][\udc00-\udfff])*)(?:[ \t]+|(?=\.?[,;:\s#()\[\]\{\}"'<]))/,_number:/^[\-+]?(?:\d+\.?\d*([eE](?:[\-\+])?\d+)|\d*\.?\d+)(?=[.,;:\s#()\[\]\{\}"'<])/,_boolean:/^(?:true|false)(?=[.,;\s#()\[\]\{\}"'<])/,_keyword:/^@[a-z]+(?=[\s#<])/i,_sparqlKeyword:/^(?:PREFIX|BASE|GRAPH)(?=[\s#<])/i,_shortPredicates:/^a(?=\s+|<)/,_newline:/^[ \t]*(?:#[^\n\r]*)?(?:\r\n|\n|\r)[ \t]*/,_comment:/#([^\n\r]*)/,_whitespace:/^[ \t]+/,_endOfFile:/^(?:#[^\n\r]*)?$/,_tokenizeToEnd:function(e,t){for(var i=this._input,r=this._comments;;){for(var s,n;s=this._newline.exec(i);)r&&(n=this._comment.exec(s[0]))&&e(null,{line:this._line,type:"comment",value:n[1],prefix:""}),i=i.substr(s[0].length,i.length),this._line++;if((s=this._whitespace.exec(i))&&(i=i.substr(s[0].length,i.length)),this._endOfFile.test(i))return t&&(r&&(n=this._comment.exec(i))&&e(null,{line:this._line,type:"comment",value:n[1],prefix:""}),e(i=null,{line:this._line,type:"eof",value:"",prefix:""})),this._input=i;var u,c=this._line,h="",f="",d="",o=i[0],_=null,l=0,p=!1;switch(o){case"^":if(i.length<3)break;if("^"!==i[1]){this._n3Mode&&(l=1,h="^");break}if(this._prevTokenType="^^","<"!==(i=i.substr(2))[0]){p=!0;break}case"<":if(_=this._unescapedIri.exec(i))h="IRI",f=_[1];else if(_=this._iri.exec(i)){if(null===(u=this._unescape(_[1]))||a.test(u))return reportSyntaxError(this);h="IRI",f=u}else this._n3Mode&&i.length>1&&"="===i[1]&&(h="inverse",l=2,f="http://www.w3.org/2000/10/swap/log#implies");break;case"_":((_=this._blank.exec(i))||t&&(_=this._blank.exec(i+" ")))&&(h="blank",d="_",f=_[1]);break;case'"':case"'":if(_=this._unescapedString.exec(i))h="literal",f=_[0];else if(_=this._singleQuotedString.exec(i)){if(null===(u=this._unescape(_[0])))return reportSyntaxError(this);h="literal",f=u.replace(/^'|'$/g,'"')}else if(_=this._tripleQuotedString.exec(i)){if(u=_[1]||_[2],this._line+=u.split(/\r\n|\r|\n/).length-1,null===(u=this._unescape(u)))return reportSyntaxError(this);h="literal",f=u.replace(/^'|'$/g,'"')}break;case"?":this._n3Mode&&(_=this._variable.exec(i))&&(h="var",f=_[0]);break;case"@":"literal"===this._prevTokenType&&(_=this._langcode.exec(i))?(h="langcode",f=_[1]):(_=this._keyword.exec(i))&&(h=_[0]);break;case".":if(1===i.length?t:i[1]<"0"||i[1]>"9"){h=".",l=1;break}case"0":case"1":case"2":case"3":case"4":case"5":case"6":case"7":case"8":case"9":case"+":case"-":(_=this._number.exec(i))&&(h="literal",f='"'+_[0]+'"^^http://www.w3.org/2001/XMLSchema#'+(_[1]?"double":/^[+\-]?\d+$/.test(_[0])?"integer":"decimal"));break;case"B":case"b":case"p":case"P":case"G":case"g":(_=this._sparqlKeyword.exec(i))?h=_[0].toUpperCase():p=!0;break;case"f":case"t":(_=this._boolean.exec(i))?(h="literal",f='"'+_[0]+'"^^http://www.w3.org/2001/XMLSchema#boolean'):p=!0;break;case"a":(_=this._shortPredicates.exec(i))?(h="abbreviation",f="http://www.w3.org/1999/02/22-rdf-syntax-ns#type"):p=!0;break;case"=":this._n3Mode&&i.length>1&&(h="abbreviation",">"!==i[1]?(l=1,f="http://www.w3.org/2002/07/owl#sameAs"):(l=2,f="http://www.w3.org/2000/10/swap/log#implies"));break;case"!":if(!this._n3Mode)break;case",":case";":case"[":case"]":case"(":case")":case"{":case"}":l=1,h=o;break;default:p=!0}if(p&&("@prefix"!==this._prevTokenType&&"PREFIX"!==this._prevTokenType||!(_=this._prefix.exec(i))?((_=this._prefixed.exec(i))||t&&(_=this._prefixed.exec(i+" ")))&&(h="prefixed",d=_[1]||"",f=this._unescape(_[2])):(h="prefix",f=_[1]||"")),"^^"===this._prevTokenType)switch(h){case"prefixed":h="type";break;case"IRI":h="typeIRI";break;default:h=""}if(!h)return t||!/^'''|^"""/.test(i)&&/\n|\r/.test(i)?reportSyntaxError(this):this._input=i;e(null,{line:c,type:h,value:f,prefix:d}),this._prevTokenType=h,i=i.substr(l||_[0].length,i.length)}function reportSyntaxError(t){e(t._syntaxError(/^\S*/.exec(i)[0]))}},_unescape:function(e){try{return e.replace(s,(function(e,t,r,s){var a;if(t){if(a=parseInt(t,16),isNaN(a))throw new Error;return i(a)}if(r){if(a=parseInt(r,16),isNaN(a))throw new Error;return a<=65535?i(a):i(55296+(a-=65536)/1024,56320+(1023&a))}var u=n[s];if(!u)throw new Error;return u}))}catch(e){return null}},_syntaxError:function(e){return this._input=null,new Error('Unexpected "'+e+'" on line '+this._line+".")},tokenize:function(e,t){var i=this;if(this._line=1,"string"==typeof e){if(this._input=e,"function"!=typeof t){var s,n=[];if(this._tokenizeToEnd((function(e,t){e?s=e:n.push(t)}),!0),s)throw s;return n}r((function(){i._tokenizeToEnd(t,!0)}))}else this._input="","function"==typeof e.setEncoding&&e.setEncoding("utf8"),e.on("data",(function(e){null!==i._input&&(i._input+=e,i._tokenizeToEnd(t,!1))})),e.on("end",(function(){null!==i._input&&i._tokenizeToEnd(t,!0)}))}},e.exports=N3Lexer}).call(this,i(333).setImmediate)},265:function(e,t,i){var r=i(264),s="http://www.w3.org/1999/02/22-rdf-syntax-ns#",n=s+"nil",a=s+"first",u=s+"rest",c=/^[a-z][a-z0-9+.-]*:/i,h=/^(?:([a-z][a-z0-9+.-]*:))?(?:\/\/[^\/]*)?/i,f=/(?:^|\/)\.\.?(?:$|[\/#?])/,d=0,o=0;function N3Parser(e){if(!(this instanceof N3Parser))return new N3Parser(e);this._contextStack=[],this._graph=null,e=e||{},this._setBase(e.documentIRI);var t="string"==typeof e.format?e.format.match(/\w*$/)[0].toLowerCase():"",i="turtle"===t,s="trig"===t,n=/triple/.test(t),a=/quad/.test(t),u=this._n3Mode=/n3/.test(t),c=n||a;(this._supportsNamedGraphs=!(i||u))||(this._readPredicateOrNamedGraph=this._readPredicate),this._supportsQuads=!(i||s||n||u),c&&(this._base="",this._resolveIRI=function(e){return this._error("Disallowed relative IRI",e),this._callback=noop,this._subject=null}),this._blankNodePrefix="string"!=typeof e.blankNodePrefix?"":"_:"+e.blankNodePrefix.replace(/^_:/,""),this._lexer=e.lexer||new r({lineMode:c,n3:u}),this._explicitQuantifiers=!!e.explicitQuantifiers}function noop(){}N3Parser._resetBlankNodeIds=function(){d=o=0},N3Parser.prototype={_setBase:function(e){if(e){var t=e.indexOf("#");t>=0&&(e=e.substr(0,t)),this._base=e,this._basePath=e.indexOf("/")<0?e:e.replace(/[^\/?]*(?:\?.*)?$/,""),e=e.match(h),this._baseRoot=e[0],this._baseScheme=e[1]}else this._base=null},_saveContext:function(e,t,i,r,s){var n=this._n3Mode;this._contextStack.push({subject:i,predicate:r,object:s,graph:t,type:e,inverse:!!n&&this._inversePredicate,blankPrefix:n?this._prefixes._:"",quantified:n?this._quantified:null}),n&&(this._inversePredicate=!1,this._prefixes._=this._graph+".",this._quantified=Object.create(this._quantified))},_restoreContext:function(){var e=this._contextStack.pop(),t=this._n3Mode;this._subject=e.subject,this._predicate=e.predicate,this._object=e.object,this._graph=e.graph,t&&(this._inversePredicate=e.inverse,this._prefixes._=e.blankPrefix,this._quantified=e.quantified)},_readInTopContext:function(e){switch(e.type){case"eof":return null!==this._graph?this._error("Unclosed graph",e):(delete this._prefixes._,this._callback(null,null,this._prefixes));case"PREFIX":this._sparqlStyle=!0;case"@prefix":return this._readPrefix;case"BASE":this._sparqlStyle=!0;case"@base":return this._readBaseIRI;case"{":if(this._supportsNamedGraphs)return this._graph="",this._subject=null,this._readSubject;case"GRAPH":if(this._supportsNamedGraphs)return this._readNamedGraphLabel;default:return this._readSubject(e)}},_readEntity:function(e,t){var i;switch(e.type){case"IRI":case"typeIRI":i=null===this._base||c.test(e.value)?e.value:this._resolveIRI(e);break;case"type":case"blank":case"prefixed":var r=this._prefixes[e.prefix];if(void 0===r)return this._error('Undefined prefix "'+e.prefix+':"',e);i=r+e.value;break;case"var":return e.value;default:return this._error("Expected entity but got "+e.type,e)}return!t&&this._n3Mode&&i in this._quantified&&(i=this._quantified[i]),i},_readSubject:function(e){switch(this._predicate=null,e.type){case"[":return this._saveContext("blank",this._graph,this._subject="_:b"+o++,null,null),this._readBlankNodeHead;case"(":return this._saveContext("list",this._graph,n,null,null),this._subject=null,this._readListItem;case"{":return this._n3Mode?(this._saveContext("formula",this._graph,this._graph="_:b"+o++,null,null),this._readSubject):this._error("Unexpected graph",e);case"}":return this._readPunctuation(e);case"@forSome":return this._subject=null,this._predicate="http://www.w3.org/2000/10/swap/reify#forSome",this._quantifiedPrefix="_:b",this._readQuantifierList;case"@forAll":return this._subject=null,this._predicate="http://www.w3.org/2000/10/swap/reify#forAll",this._quantifiedPrefix="?b-",this._readQuantifierList;default:if(void 0===(this._subject=this._readEntity(e)))return;if(this._n3Mode)return this._getPathReader(this._readPredicateOrNamedGraph)}return this._readPredicateOrNamedGraph},_readPredicate:function(e){var t=e.type;switch(t){case"inverse":this._inversePredicate=!0;case"abbreviation":this._predicate=e.value;break;case".":case"]":case"}":return null===this._predicate?this._error("Unexpected "+t,e):(this._subject=null,"]"===t?this._readBlankNodeTail(e):this._readPunctuation(e));case";":return this._readPredicate;case"blank":if(!this._n3Mode)return this._error("Disallowed blank node as predicate",e);default:if(void 0===(this._predicate=this._readEntity(e)))return}return this._readObject},_readObject:function(e){switch(e.type){case"literal":return this._object=e.value,this._readDataTypeOrLang;case"[":return this._saveContext("blank",this._graph,this._subject,this._predicate,this._subject="_:b"+o++),this._readBlankNodeHead;case"(":return this._saveContext("list",this._graph,this._subject,this._predicate,n),this._subject=null,this._readListItem;case"{":return this._n3Mode?(this._saveContext("formula",this._graph,this._subject,this._predicate,this._graph="_:b"+o++),this._readSubject):this._error("Unexpected graph",e);default:if(void 0===(this._object=this._readEntity(e)))return;if(this._n3Mode)return this._getPathReader(this._getContextEndReader())}return this._getContextEndReader()},_readPredicateOrNamedGraph:function(e){return"{"===e.type?this._readGraph(e):this._readPredicate(e)},_readGraph:function(e){return"{"!==e.type?this._error("Expected graph but got "+e.type,e):(this._graph=this._subject,this._subject=null,this._readSubject)},_readBlankNodeHead:function(e){return"]"===e.type?(this._subject=null,this._readBlankNodeTail(e)):(this._predicate=null,this._readPredicate(e))},_readBlankNodeTail:function(e){if("]"!==e.type)return this._readBlankNodePunctuation(e);null!==this._subject&&this._triple(this._subject,this._predicate,this._object,this._graph);var t=null===this._predicate;return this._restoreContext(),null===this._object?t?this._readPredicateOrNamedGraph:this._readPredicateAfterBlank:this._getContextEndReader()},_readPredicateAfterBlank:function(e){return"."!==e.type||this._contextStack.length?this._readPredicate(e):(this._subject=null,this._readPunctuation(e))},_readListItem:function(e){var t=null,i=null,r=this._subject,s=this._contextStack,c=s[s.length-1],h=this._readListItem,f=!0;switch(e.type){case"[":this._saveContext("blank",this._graph,i="_:b"+o++,a,this._subject=t="_:b"+o++),h=this._readBlankNodeHead;break;case"(":this._saveContext("list",this._graph,i="_:b"+o++,a,n),this._subject=null;break;case")":if(this._restoreContext(),0!==s.length&&"list"===s[s.length-1].type&&this._triple(this._subject,this._predicate,this._object,this._graph),null===this._predicate){if(h=this._readPredicate,this._subject===n)return h}else if(h=this._getContextEndReader(),this._object===n)return h;i=n;break;case"literal":t=e.value,f=!1,h=this._readListItemDataTypeOrLang;break;default:if(void 0===(t=this._readEntity(e)))return}if(null===i&&(this._subject=i="_:b"+o++),null===r?null===c.predicate?c.subject=i:c.object=i:this._triple(r,u,i,this._graph),null!==t){if(this._n3Mode&&("IRI"===e.type||"prefixed"===e.type))return this._saveContext("item",this._graph,i,a,t),this._subject=t,this._predicate=null,this._getPathReader(this._readListItem);f?this._triple(i,a,t,this._graph):this._object=t}return h},_readDataTypeOrLang:function(e){return this._completeLiteral(e,!1)},_readListItemDataTypeOrLang:function(e){return this._completeLiteral(e,!0)},_completeLiteral:function(e,t){var i=!1;switch(e.type){case"type":case"typeIRI":i=!0,this._object+="^^"+this._readEntity(e);break;case"langcode":i=!0,this._object+="@"+e.value.toLowerCase()}return t&&this._triple(this._subject,a,this._object,this._graph),i?this._getContextEndReader():(this._readCallback=this._getContextEndReader(),this._readCallback(e))},_readFormulaTail:function(e){return"}"!==e.type?this._readPunctuation(e):(null!==this._subject&&this._triple(this._subject,this._predicate,this._object,this._graph),this._restoreContext(),null===this._object?this._readPredicate:this._getContextEndReader())},_readPunctuation:function(e){var t,i=this._subject,r=this._graph,s=this._inversePredicate;switch(e.type){case"}":if(null===this._graph)return this._error("Unexpected graph closing",e);if(this._n3Mode)return this._readFormulaTail(e);this._graph=null;case".":this._subject=null,t=this._contextStack.length?this._readSubject:this._readInTopContext,s&&(this._inversePredicate=!1);break;case";":t=this._readPredicate;break;case",":t=this._readObject;break;default:if(this._supportsQuads&&null===this._graph&&void 0!==(r=this._readEntity(e))){t=this._readQuadPunctuation;break}return this._error('Expected punctuation to follow "'+this._object+'"',e)}if(null!==i){var n=this._predicate,a=this._object;s?this._triple(a,n,i,r):this._triple(i,n,a,r)}return t},_readBlankNodePunctuation:function(e){var t;switch(e.type){case";":t=this._readPredicate;break;case",":t=this._readObject;break;default:return this._error('Expected punctuation to follow "'+this._object+'"',e)}return this._triple(this._subject,this._predicate,this._object,this._graph),t},_readQuadPunctuation:function(e){return"."!==e.type?this._error("Expected dot to follow quad",e):this._readInTopContext},_readPrefix:function(e){return"prefix"!==e.type?this._error("Expected prefix to follow @prefix",e):(this._prefix=e.value,this._readPrefixIRI)},_readPrefixIRI:function(e){if("IRI"!==e.type)return this._error('Expected IRI to follow prefix "'+this._prefix+':"',e);var t=this._readEntity(e);return this._prefixes[this._prefix]=t,this._prefixCallback(this._prefix,t),this._readDeclarationPunctuation},_readBaseIRI:function(e){return"IRI"!==e.type?this._error("Expected IRI to follow base declaration",e):(this._setBase(null===this._base||c.test(e.value)?e.value:this._resolveIRI(e)),this._readDeclarationPunctuation)},_readNamedGraphLabel:function(e){switch(e.type){case"IRI":case"blank":case"prefixed":return this._readSubject(e),this._readGraph;case"[":return this._readNamedGraphBlankLabel;default:return this._error("Invalid graph label",e)}},_readNamedGraphBlankLabel:function(e){return"]"!==e.type?this._error("Invalid graph label",e):(this._subject="_:b"+o++,this._readGraph)},_readDeclarationPunctuation:function(e){return this._sparqlStyle?(this._sparqlStyle=!1,this._readInTopContext(e)):"."!==e.type?this._error("Expected declaration to end with a dot",e):this._readInTopContext},_readQuantifierList:function(e){var t;switch(e.type){case"IRI":case"prefixed":if(void 0!==(t=this._readEntity(e,!0)))break;default:return this._error("Unexpected "+e.type,e)}return this._explicitQuantifiers?(null===this._subject?this._triple(this._graph||"",this._predicate,this._subject="_:b"+o++,"urn:n3:quantifiers"):this._triple(this._subject,u,this._subject="_:b"+o++,"urn:n3:quantifiers"),this._triple(this._subject,a,t,"urn:n3:quantifiers")):this._quantified[t]=this._quantifiedPrefix+o++,this._readQuantifierPunctuation},_readQuantifierPunctuation:function(e){return","===e.type?this._readQuantifierList:(this._explicitQuantifiers&&(this._triple(this._subject,u,n,"urn:n3:quantifiers"),this._subject=null),this._readCallback=this._getContextEndReader(),this._readCallback(e))},_getPathReader:function(e){return this._afterPath=e,this._readPath},_readPath:function(e){switch(e.type){case"!":return this._readForwardPath;case"^":return this._readBackwardPath;default:var t=this._contextStack,i=t.length&&t[t.length-1];if(i&&"item"===i.type){var r=this._subject;this._restoreContext(),this._triple(this._subject,a,r,this._graph)}return this._afterPath(e)}},_readForwardPath:function(e){var t,i,r="_:b"+o++;if(void 0!==(i=this._readEntity(e)))return null===this._predicate?(t=this._subject,this._subject=r):(t=this._object,this._object=r),this._triple(t,i,r,this._graph),this._readPath},_readBackwardPath:function(e){var t,i,r="_:b"+o++;if(void 0!==(t=this._readEntity(e)))return null===this._predicate?(i=this._subject,this._subject=r):(i=this._object,this._object=r),this._triple(r,t,i,this._graph),this._readPath},_getContextEndReader:function(){var e=this._contextStack;if(!e.length)return this._readPunctuation;switch(e[e.length-1].type){case"blank":return this._readBlankNodeTail;case"list":return this._readListItem;case"formula":return this._readFormulaTail}},_triple:function(e,t,i,r){this._callback(null,{subject:e,predicate:t,object:i,graph:r||""})},_error:function(e,t){this._callback(new Error(e+" on line "+t.line+"."))},_resolveIRI:function(e){var t=e.value;switch(t[0]){case void 0:return this._base;case"#":return this._base+t;case"?":return this._base.replace(/(?:\?.*)?$/,t);case"/":return("/"===t[1]?this._baseScheme:this._baseRoot)+this._removeDotSegments(t);default:return this._removeDotSegments(this._basePath+t)}},_removeDotSegments:function(e){if(!f.test(e))return e;for(var t="",i=e.length,r=-1,s=-1,n=0,a="/";r<i;){switch(a){case":":if(s<0&&"/"===e[++r]&&"/"===e[++r])for(;(s=r+1)<i&&"/"!==e[s];)r=s;break;case"?":case"#":r=i;break;case"/":if("."===e[r+1])switch(a=e[1+ ++r]){case"/":t+=e.substring(n,r-1),n=r+1;break;case void 0:case"?":case"#":return t+e.substring(n,r)+e.substr(r+1);case".":if(void 0===(a=e[1+ ++r])||"/"===a||"?"===a||"#"===a){if((n=(t+=e.substring(n,r-2)).lastIndexOf("/"))>=s&&(t=t.substr(0,n)),"/"!==a)return t+"/"+e.substr(r+1);n=r+1}}}a=e[++r]}return t+e.substring(n)},parse:function(e,t,i){var r=this;if(this._readCallback=this._readInTopContext,this._sparqlStyle=!1,this._prefixes=Object.create(null),this._prefixes._=this._blankNodePrefix||"_:b"+d+++"_",this._prefixCallback=i||noop,this._inversePredicate=!1,this._quantified=Object.create(null),!t){var s,n=[];if(this._callback=function(e,t){e?s=e:t&&n.push(t)},this._lexer.tokenize(e).every((function(e){return r._readCallback=r._readCallback(e)})),s)throw s;return n}this._callback=t,this._lexer.tokenize(e,(function(e,t){null!==e?(r._callback(e),r._callback=noop):r._readCallback&&(r._readCallback=r._readCallback(t))}))}},e.exports=N3Parser},266:function(e,t){var i={isIRI:function(e){if(!e)return e;var t=e[0];return'"'!==t&&"_"!==t},isLiteral:function(e){return e&&'"'===e[0]},isBlank:function(e){return e&&"_:"===e.substr(0,2)},isDefaultGraph:function(e){return!e},inDefaultGraph:function(e){return!e.graph},getLiteralValue:function(e){var t=/^"([^]*)"/.exec(e);if(!t)throw new Error(e+" is not a literal");return t[1]},getLiteralType:function(e){var t=/^"[^]*"(?:\^\^([^"]+)|(@)[^@"]+)?$/.exec(e);if(!t)throw new Error(e+" is not a literal");return t[1]||(t[2]?"http://www.w3.org/1999/02/22-rdf-syntax-ns#langString":"http://www.w3.org/2001/XMLSchema#string")},getLiteralLanguage:function(e){var t=/^"[^]*"(?:@([^@"]+)|\^\^[^"]+)?$/.exec(e);if(!t)throw new Error(e+" is not a literal");return t[1]?t[1].toLowerCase():""},isPrefixedName:function(e){return e&&/^[^:\/"']*:[^:\/"']+$/.test(e)},expandPrefixedName:function(e,t){var i,r,s,n=/(?:^|"\^\^)([^:\/#"'\^_]*):[^\/]*$/.exec(e);return n&&(r=t[i=n[1]],s=n.index),void 0===r?e:0===s?r+e.substr(i.length+1):e.substr(0,s+3)+r+e.substr(s+i.length+4)},createIRI:function(e){return e&&'"'===e[0]?i.getLiteralValue(e):e},createLiteral:function(e,t){if(!t)switch(typeof e){case"boolean":t="http://www.w3.org/2001/XMLSchema#boolean";break;case"number":if(isFinite(e)){t=e%1==0?"http://www.w3.org/2001/XMLSchema#integer":"http://www.w3.org/2001/XMLSchema#decimal";break}default:return'"'+e+'"'}return'"'+e+(/^[a-z]+(-[a-z0-9]+)*$/i.test(t)?'"@'+t.toLowerCase():'"^^'+t)},prefix:function(e){return i.prefixes({"":e})("")},prefixes:function(e){var t=Object.create(null);for(var i in e)processPrefix(i,e[i]);function processPrefix(e,i){if(i||!(e in t)){var r=Object.create(null);i=i||"",t[e]=function(e){return r[e]||(r[e]=i+e)}}return t[e]}return processPrefix}};function addN3Util(e,t){for(var r in i)t?e.prototype[r]=applyToThis(i[r]):e[r]=i[r];return e}function applyToThis(e){return function(t){return e(this,t)}}e.exports=addN3Util(addN3Util)},270:function(e,t){var i=/^"([^]*)"(?:\^\^(.+)|@([\-a-z]+))?$/i,r=/["\\\t\n\r\b\f\u0000-\u0019\ud800-\udbff]/,s=/["\\\t\n\r\b\f\u0000-\u0019]|[\ud800-\udbff][\udc00-\udfff]/g,n={"\\":"\\\\",'"':'\\"',"\t":"\\t","\n":"\\n","\r":"\\r","\b":"\\b","\f":"\\f"};function N3Writer(e,t){if(!(this instanceof N3Writer))return new N3Writer(e,t);if(e&&"function"!=typeof e.write&&(t=e,e=null),t=t||{},e)this._outputStream=e,this._endStream=void 0===t.end||!!t.end;else{var i="";this._outputStream={write:function(e,t,r){i+=e,r&&r()},end:function(e){e&&e(null,i)}},this._endStream=!0}this._subject=null,/triple|quad/i.test(t.format)?this._writeTriple=this._writeTripleLine:(this._graph="",this._prefixIRIs=Object.create(null),t.prefixes&&this.addPrefixes(t.prefixes))}function characterReplacer(e){var t=n[e];return void 0===t&&(1===e.length?(t=e.charCodeAt(0).toString(16),t="\\u0000".substr(0,6-t.length)+t):(t=(1024*(e.charCodeAt(0)-55296)+e.charCodeAt(1)+9216).toString(16),t="\\U00000000".substr(0,10-t.length)+t)),t}N3Writer.prototype={_write:function(e,t){this._outputStream.write(e,"utf8",t)},_writeTriple:function(e,t,i,r,s){try{this._graph!==r&&(this._write((null===this._subject?"":this._graph?"\n}\n":".\n")+(r?this._encodeIriOrBlankNode(r)+" {\n":"")),this._subject=null,this._graph="["!==r[0]?r:"]"),this._subject===e?this._predicate===t?this._write(", "+this._encodeObject(i),s):this._write(";\n    "+this._encodePredicate(this._predicate=t)+" "+this._encodeObject(i),s):this._write((null===this._subject?"":".\n")+this._encodeSubject(this._subject=e)+" "+this._encodePredicate(this._predicate=t)+" "+this._encodeObject(i),s)}catch(e){s&&s(e)}},_writeTripleLine:function(e,t,i,r,s){delete this._prefixMatch;try{this._write(this._encodeIriOrBlankNode(e)+" "+this._encodeIriOrBlankNode(t)+" "+this._encodeObject(i)+(r?" "+this._encodeIriOrBlankNode(r)+".\n":".\n"),s)}catch(e){s&&s(e)}},_encodeIriOrBlankNode:function(e){var t=e[0];if("["===t||"("===t||"_"===t&&":"===e[1])return e;r.test(e)&&(e=e.replace(s,characterReplacer));var i=this._prefixRegex.exec(e);return i?i[1]?this._prefixIRIs[i[1]]+i[2]:e:"<"+e+">"},_encodeLiteral:function(e,t,i){return r.test(e)&&(e=e.replace(s,characterReplacer)),i?'"'+e+'"@'+i:t?'"'+e+'"^^'+this._encodeIriOrBlankNode(t):'"'+e+'"'},_encodeSubject:function(e){if('"'===e[0])throw new Error("A literal as subject is not allowed: "+e);return"["===e[0]&&(this._subject="]"),this._encodeIriOrBlankNode(e)},_encodePredicate:function(e){if('"'===e[0])throw new Error("A literal as predicate is not allowed: "+e);return"http://www.w3.org/1999/02/22-rdf-syntax-ns#type"===e?"a":this._encodeIriOrBlankNode(e)},_encodeObject:function(e){if('"'!==e[0])return this._encodeIriOrBlankNode(e);var t=i.exec(e);if(!t)throw new Error("Invalid literal: "+e);return this._encodeLiteral(t[1],t[2],t[3])},_blockedWrite:function(){throw new Error("Cannot write because the writer has been closed.")},addTriple:function(e,t,i,r,s){void 0===i?this._writeTriple(e.subject,e.predicate,e.object,e.graph||"",t):"string"!=typeof r?this._writeTriple(e,t,i,"",r):this._writeTriple(e,t,i,r,s)},addTriples:function(e){for(var t=0;t<e.length;t++)this.addTriple(e[t])},addPrefix:function(e,t,i){var r={};r[e]=t,this.addPrefixes(r,i)},addPrefixes:function(e,t){var i=this._prefixIRIs,r=!1;for(var s in e){var n=e[s];/[#\/]$/.test(n)&&i[n]!==(s+=":")&&(r=!0,i[n]=s,null!==this._subject&&(this._write(this._graph?"\n}\n":".\n"),this._subject=null,this._graph=""),this._write("@prefix "+s+" <"+n+">.\n"))}if(r){var a="",u="";for(var c in i)a+=a?"|"+c:c,u+=(u?"|":"")+i[c];a=a.replace(/[\]\/\(\)\*\+\?\.\\\$]/g,"\\$&"),this._prefixRegex=new RegExp("^(?:"+u+")[^/]*$|^("+a+")([a-zA-Z][\\-_a-zA-Z0-9]*)$")}this._write(r?"\n":"",t)},blank:function(e,t){var i,r,s=e;switch(void 0===e?s=[]:"string"==typeof e?s=[{predicate:e,object:t}]:"length"in e||(s=[e]),r=s.length){case 0:return"[]";case 1:if("["!==(i=s[0]).object[0])return"[ "+this._encodePredicate(i.predicate)+" "+this._encodeObject(i.object)+" ]";default:for(var n="[",a=0;a<r;a++)(i=s[a]).predicate===e?n+=", "+this._encodeObject(i.object):(n+=(a?";\n  ":"\n  ")+this._encodePredicate(i.predicate)+" "+this._encodeObject(i.object),e=i.predicate);return n+"\n]"}},list:function(e){for(var t=e&&e.length||0,i=new Array(t),r=0;r<t;r++)i[r]=this._encodeObject(e[r]);return"("+i.join(" ")+")"},_prefixRegex:/$0^/,end:function(e){null!==this._subject&&(this._write(this._graph?"\n}\n":".\n"),this._subject=null),this._write=this._blockedWrite;var t=e&&function(i,r){t=null,e(i,r)};if(this._endStream)try{return this._outputStream.end(t)}catch(e){}t&&t()}},e.exports=N3Writer},332:function(e,t,i){var r;r=function(){};t=e.exports={Lexer:r("./lib/N3Lexer"),Parser:r("./lib/N3Parser"),Writer:r("./lib/N3Writer"),Store:r("./lib/N3Store"),StreamParser:r("./lib/N3StreamParser"),StreamWriter:r("./lib/N3StreamWriter"),Util:r("./lib/N3Util")};Object.keys(t).forEach((function(e){Object.defineProperty(t,e,{configurable:!0,enumerable:!0,get:function(){return delete t[e],t[e]=i(954)("./N3"+e)}})}))},512:function(e,t,i){var r=i(266).expandPrefixedName;function N3Store(e,t){if(!(this instanceof N3Store))return new N3Store(e,t);this._size=0,this._graphs=Object.create(null),this._id=0,this._ids=Object.create(null),this._ids["><"]=0,this._entities=Object.create(null),this._blankNodeIndex=0,t||!e||e[0]||(t=e,e=null),t=t||{},this._prefixes=Object.create(null),t.prefixes&&this.addPrefixes(t.prefixes),e&&this.addTriples(e)}function isString(e){return"string"==typeof e||e instanceof String}N3Store.prototype={get size(){var e=this._size;if(null!==e)return e;var t,i,r=this._graphs;for(var s in r)for(var n in t=r[s].subjects)for(var a in i=t[n])e+=Object.keys(i[a]).length;return this._size=e},_addToIndex:function(e,t,i,r){var s=e[t]||(e[t]={}),n=s[i]||(s[i]={}),a=r in n;return a||(n[r]=null),!a},_removeFromIndex:function(e,t,i,r){var s,n=e[t],a=n[i];for(s in delete a[r],a)return;for(s in delete n[i],n)return;delete e[t]},_findInIndex:function(e,t,i,r,s,n,a,u){var c,h,f,d=[],o=!t+!i+!r>1?Object.keys(this._ids):this._entities;for(var _ in t&&((c=e,e={})[t]=c[t]),e){var l=o[_];if(h=e[_])for(var p in i&&((c=h,h={})[i]=c[i]),h){var b=o[p];if(f=h[p])for(var x=(r?r in f?[r]:[]:Object.keys(f)),g=x.length-1;g>=0;g--){var v={subject:"",predicate:"",object:"",graph:u};v[s]=l,v[n]=b,v[a]=o[x[g]],d.push(v)}}}return d},_countInIndex:function(e,t,i,r){var s,n,a,u=0;for(var c in t&&((s=e,e={})[t]=s[t]),e)if(n=e[c])for(var h in i&&((s=n,n={})[i]=s[i]),n)(a=n[h])&&(r?r in a&&u++:u+=Object.keys(a).length);return u},addTriple:function(e,t,i,r){t||(r=e.graph,i=e.object,t=e.predicate,e=e.subject),r=r||"";var s=this._graphs[r];s||(s=this._graphs[r]={subjects:{},predicates:{},objects:{}},Object.freeze(s));var n=this._ids,a=this._entities;e=n[e]||(n[a[++this._id]=e]=this._id),t=n[t]||(n[a[++this._id]=t]=this._id),i=n[i]||(n[a[++this._id]=i]=this._id);var u=this._addToIndex(s.subjects,e,t,i);return this._addToIndex(s.predicates,t,i,e),this._addToIndex(s.objects,i,e,t),this._size=null,u},addTriples:function(e){for(var t=e.length-1;t>=0;t--)this.addTriple(e[t])},addPrefix:function(e,t){this._prefixes[e]=t},addPrefixes:function(e){for(var t in e)this.addPrefix(t,e[t])},removeTriple:function(e,t,i,r){t||(r=e.graph,i=e.object,t=e.predicate,e=e.subject),r=r||"";var s,n,a,u=this._ids,c=this._graphs;if(!(e=u[e]))return!1;if(!(t=u[t]))return!1;if(!(i=u[i]))return!1;if(!(s=c[r]))return!1;if(!(n=s.subjects[e]))return!1;if(!(a=n[t]))return!1;if(!(i in a))return!1;for(e in this._removeFromIndex(s.subjects,e,t,i),this._removeFromIndex(s.predicates,t,i,e),this._removeFromIndex(s.objects,i,e,t),null!==this._size&&this._size--,s.subjects)return!0;return delete c[r],!0},removeTriples:function(e){for(var t=e.length-1;t>=0;t--)this.removeTriple(e[t])},find:function(e,t,i,s){var n=this._prefixes;return this.findByIRI(r(e,n),r(t,n),r(i,n),r(s,n))},findByIRI:function(e,t,i,r){var s,n,a,u,c=[],h={},f=this._ids;if(isString(r)?h[r]=this._graphs[r]:h=this._graphs,isString(e)&&!(n=f[e]))return c;if(isString(t)&&!(a=f[t]))return c;if(isString(i)&&!(u=f[i]))return c;for(var d in h)(s=h[d])&&(n?u?c.push(this._findInIndex(s.objects,u,n,a,"object","subject","predicate",d)):c.push(this._findInIndex(s.subjects,n,a,null,"subject","predicate","object",d)):a?c.push(this._findInIndex(s.predicates,a,u,null,"predicate","object","subject",d)):u?c.push(this._findInIndex(s.objects,u,null,null,"object","subject","predicate",d)):c.push(this._findInIndex(s.subjects,null,null,null,"subject","predicate","object",d)));return 1===c.length?c[0]:c.concat.apply([],c)},count:function(e,t,i,s){var n=this._prefixes;return this.countByIRI(r(e,n),r(t,n),r(i,n),r(s,n))},countByIRI:function(e,t,i,r){var s,n,a,u,c=0,h={},f=this._ids;if(isString(r)?h[r]=this._graphs[r]:h=this._graphs,isString(e)&&!(n=f[e]))return 0;if(isString(t)&&!(a=f[t]))return 0;if(isString(i)&&!(u=f[i]))return 0;for(var d in h)(s=h[d])&&(c+=e?i?this._countInIndex(s.objects,u,n,a):this._countInIndex(s.subjects,n,a,u):t?this._countInIndex(s.predicates,a,u,n):this._countInIndex(s.objects,u,n,a));return c},createBlankNode:function(e){var t,i;if(e)for(t=e="_:"+e,i=1;this._ids[t];)t=e+i++;else do{t="_:b"+this._blankNodeIndex++}while(this._ids[t]);return this._ids[t]=++this._id,this._entities[this._id]=t,t}},e.exports=N3Store},513:function(e,t,i){var r=i(330).Transform,s=i(334),n=i(265);function N3StreamParser(e){if(!(this instanceof N3StreamParser))return new N3StreamParser(e);r.call(this,{decodeStrings:!0}),this._readableState.objectMode=!0;var t,i,s=this;new n(e).parse({on:function(e,r){"data"===e?t=r:i=r}},(function(e,t){e&&s.emit("error",e)||t&&s.push(t)}),(function(e,t){s.emit("prefix",e,t)})),this._transform=function(e,i,r){t(e),r()},this._flush=function(e){i(),e()}}s.inherits(N3StreamParser,r),e.exports=N3StreamParser},518:function(e,t,i){var r=i(330).Transform,s=i(334),n=i(270);function N3StreamWriter(e){if(!(this instanceof N3StreamWriter))return new N3StreamWriter(e);r.call(this,{encoding:"utf8"}),this._writableState.objectMode=!0;var t=this,i=new n({write:function(e,i,r){t.push(e),r&&r()},end:function(e){t.push(null),e&&e()}},e);this._transform=function(e,t,r){i.addTriple(e,r)},this._flush=function(e){i.end(e)}}s.inherits(N3StreamWriter,r),e.exports=N3StreamWriter}}]);
//# sourceMappingURL=npm.n3-a4bbbc8e6fd01e67cac0.js.map