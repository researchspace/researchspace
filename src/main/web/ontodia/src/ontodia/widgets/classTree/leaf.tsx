import * as React from 'react';

import { ElementTypeIri } from '../../data/model';
import { DiagramView } from '../../diagram/view';
import { highlightSubstring } from '../listElementView';

import { TreeNode } from './treeModel';
import Icon from 'platform/components/ui/icon/Icon';

const EXPAND_ICON = 'arrow_right';
const COLLAPSE_ICON = 'arrow_drop_down';

interface CommonProps {
  view: DiagramView;
  searchText?: string;
  selectedNode?: TreeNode;
  onSelect: (node: TreeNode) => void;
  creatableClasses: ReadonlyMap<ElementTypeIri, boolean>;
  onClickCreate: (node: TreeNode) => void;
  onDragCreate: (node: TreeNode) => void;
}

export interface LeafProps extends CommonProps {
  node: TreeNode;
}

interface State {
  expanded?: boolean;
}

const LEAF_CLASS = 'ontodia-class-leaf';

export class Leaf extends React.Component<LeafProps, State> {
  constructor(props: LeafProps) {
    super(props);
    this.state = {
      expanded: Boolean(this.props.searchText),
    };
  }

  componentWillReceiveProps(nextProps: LeafProps) {
    if (this.props.searchText !== nextProps.searchText) {
      this.setState({
        expanded: Boolean(nextProps.searchText),
      });
    }
  }

  render() {
    const { node, ...otherProps } = this.props;
    const {  selectedNode, searchText, creatableClasses } = otherProps;
    const { expanded } = this.state;

    let toggleIcon: string | undefined;
    if (node.derived.length > 0) {
      toggleIcon = expanded ? COLLAPSE_ICON : EXPAND_ICON;
    }

    let bodyClass = `${LEAF_CLASS}__body`;
    if (selectedNode && selectedNode.model === node.model) {
      bodyClass += ` ${LEAF_CLASS}__body--selected`;
    }

    const label = highlightSubstring(node.label, searchText, { className: `${LEAF_CLASS}__highlighted-term` });

    return (
      <div className={LEAF_CLASS} role="tree-item">
        <div className={`${LEAF_CLASS}__row`}>
          <div className={`${LEAF_CLASS}__toggle`} onClick={this.toggle} role="button">
            {toggleIcon ? <span className={`${LEAF_CLASS}__toggle-icon`}><Icon iconType='round' iconName={toggleIcon}/></span> : null}
          </div>
          <a className={bodyClass} href={node.model.id} onClick={this.onClick} draggable={false}>
            <span className={`${LEAF_CLASS}__label`}>{label}</span>
            {node.model.count ? <span className={`${LEAF_CLASS}__count ontodia-badge`}>{node.model.count}</span> : null}
          </a>
          {creatableClasses.get(node.model.id) ? (
            <div className={`${LEAF_CLASS}__create ontodia-btn-group`}>
              <button
                className="btn btn-icon"
                title={'Click or drag to create new entity of this type'}
                draggable={true}
                onClick={this.onClickCreate}
                onDragStart={this.onDragCreate}
              >
                <Icon iconType='round' iconName='add_box' />
              </button>
            </div>
          ) : null}
        </div>
        {expanded && node.derived.length > 0 ? (
          <Forest className={`${LEAF_CLASS}__children`} nodes={node.derived} {...otherProps} />
        ) : null}
      </div>
    );
  }

  private onClick = (e: React.MouseEvent<{}>) => {
    e.preventDefault();
    const { node, onSelect } = this.props;
    onSelect(node);
  };

  private toggle = () => {
    this.setState((state): State => ({ expanded: !state.expanded }));
  };

  private onClickCreate = () => {
    this.props.onClickCreate(this.props.node);
  };

  private onDragCreate = (e: React.DragEvent<any>) => {
    // sets the drag data to support drag-n-drop in Firefox
    // see https://developer.mozilla.org/en-US/docs/Web/API/HTML_Drag_and_Drop_API/Drag_operations for more details
    // IE supports only 'text' and 'URL' formats, see https://msdn.microsoft.com/en-us/ie/ms536744(v=vs.94)
    e.dataTransfer.setData('text', '');

    this.props.onDragCreate(this.props.node);
  };
}

export interface ForestProps extends CommonProps {
  className?: string;
  nodes: ReadonlyArray<TreeNode>;
}

export class Forest extends React.Component<ForestProps, {}> {
  render() {
    const { nodes, className, ...otherProps } = this.props;
    return (
      <div className={className} role="tree">
        {nodes.map((node) => (
          <Leaf key={`node-${node.model.id}`} node={node} {...otherProps} />
        ))}
      </div>
    );
  }
}
