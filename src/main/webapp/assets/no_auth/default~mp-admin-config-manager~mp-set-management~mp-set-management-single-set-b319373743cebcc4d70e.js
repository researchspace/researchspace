(window.webpackJsonp=window.webpackJsonp||[]).push([[160],{1830:function(e,t,r){Object.defineProperty(t,"__esModule",{value:!0});var n=r(2245);t.Ordering=n.Ordering;var i=r(2983);t.ReorderableList=i.ReorderableList},2245:function(e,t){Object.defineProperty(t,"__esModule",{value:!0});var r=function(){function Ordering(e){this.positions=e}return Object.defineProperty(Ordering.prototype,"size",{get:function(){return this.positions.length},enumerable:!0,configurable:!0}),Ordering.prototype.setSize=function(e){if(this.positions.length===e)return this;if(e<this.positions.length)return new Ordering(invert(invert(this.positions).filter((function(t){return t<e}))));for(var t=this.positions.slice(),r=t.length;r<e;r++)t.push(r);return new Ordering(t)},Ordering.prototype.getPosition=function(e){return this.positions[e]},Ordering.prototype.getPositionToIndex=function(){return invert(this.positions)},Ordering.prototype.apply=function(e){return this.setSize(e.length).getPositionToIndex().map((function(t){return e[t]}))},Ordering.prototype.moveItemFromTo=function(e,t){if(e===t)return this;var r=this.getPositionToIndex(),n=r.splice(e,1)[0];return r.splice(t,0,n),new Ordering(invert(r))},Ordering.empty=new Ordering([]),Ordering}();function invert(e){for(var t=new Array(e.length),r=0;r<e.length;r++)t[e[r]]=r;return t}t.Ordering=r},2983:function(e,t,r){Object.defineProperty(t,"__esModule",{value:!0});var n=r(11),i=r(1),o=r(1),s=r(7),a=r(214),g=r(2245),d=r(1397),p=function(e){function ReorderableList(t){var r=e.call(this,t)||this;return r.isDragging=!1,r.state={ordering:(r.props.ordering||g.Ordering.empty).setSize(i.Children.count(r.props.children))},r}return n.__extends(ReorderableList,e),ReorderableList.prototype.render=function(){var e,t=this,r=this.props,n=r.className,o=r.style,a=r.children,g=r.dragByHandle,p=this.state.ordering.getPositionToIndex(),l=i.Children.toArray(a),u=((e={})[d.component]=!0,e[d.dragging]="number"==typeof this.state.draggingIndex,e[d.dragByHandle]=g,e[d.dragWhole]=!g,e);return i.createElement("div",{className:s(n,u),style:o,onDragOver:function(e){return e.preventDefault()}},p.map((function(e,r){return t.renderItem(l[e],e)})))},ReorderableList.prototype.renderItem=function(e,t){var r=this,n=this.props,o=n.dragByHandle,a=n.itemClass,g=n.itemBodyClass,p=this.state.draggingIndex;return i.createElement("div",{key:getChildKey(e),className:s(d.item,a),"data-dragged":t===p||void 0,draggable:!o,onDragStart:function(e){e.dataTransfer.setData("mp-reorderable-list-item","")},onDrag:function(e){return r.onDrag(t,e)},onDragEnd:function(e){return r.onDragEnd()},onDragOver:function(e){return e.preventDefault()},onDragEnter:function(e){return r.onDragEnterTarget(t,e)},onDragLeave:function(e){return r.onDragLeaveTarget(t)},onDrop:function(e){return r.onDropAtTarget(t,e)}},i.createElement("div",{className:d.itemHandle,draggable:o}),i.createElement("div",{className:s(d.itemBody,g)},e))},ReorderableList.prototype.componentWillReceiveProps=function(e){var t=(e.ordering||this.state.ordering).setSize(i.Children.count(e.children));this.setState({ordering:t})},ReorderableList.prototype.onDrag=function(e,t){this.isDragging||(t.stopPropagation(),this.isDragging=!0,this.setState({draggingIndex:e}))},ReorderableList.prototype.onDragEnd=function(){this.isDragging&&(this.isDragging=!1,this.props.onOrderChanged&&this.state.ordering!==this.props.ordering&&this.props.onOrderChanged(this.state.ordering),this.setState({draggingIndex:void 0}))},ReorderableList.prototype.onDropAtTarget=function(e,t){this.isDragging&&(t.preventDefault(),this.lastHoverIndex=void 0,this.setState({draggingIndex:void 0}))},ReorderableList.prototype.onDragEnterTarget=function(e,t){if(this.isDragging){t.preventDefault(),t.stopPropagation(),t.dataTransfer.dropEffect="move";var r=this.state.draggingIndex;if(e!==this.lastHoverIndex&&e!==r){this.lastHoverIndex=e;var n=this.state.ordering,i=n.moveItemFromTo(n.getPosition(r),n.getPosition(e));this.setState({ordering:i})}}},ReorderableList.prototype.onDragLeaveTarget=function(e){this.isDragging&&(this.lastHoverIndex=void 0)},ReorderableList}(o.Component);function getChildKey(e){if("string"==typeof e||"number"==typeof e)return e;if(a.isValidChild(e))return e.key;throw new Error("Unexpected child type for ReorderableList")}t.ReorderableList=p,t.default=p}}]);
//# sourceMappingURL=default~mp-admin-config-manager~mp-set-management~mp-set-management-single-set-b319373743cebcc4d70e.js.map