/*
 * Copyright (C) 2015-2019, © Trustees of the British Museum
 *
 * This library is free software; you can redistribute it and/or
 * modify it under the terms of the GNU Lesser General Public
 * License as published by the Free Software Foundation; either
 * version 2.1 of the License, or (at your option) any later version.
 *
 * This library is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the GNU
 * Lesser General Public License for more details.
 *
 * You should have received a copy of the GNU Lesser General Public
 * License along with this library; if not, you can receive a copy
 * of the GNU Lesser General Public License from http://www.gnu.org/
 */

import * as React from 'react';
import { CSSProperties } from 'react';
import * as classnames from 'classnames';
import { Button } from 'react-bootstrap';
import * as SparqlJs from 'sparqljs';

import { Cancellation } from 'platform/api/async';
import { Component } from 'platform/api/components';
import { getOverlaySystem } from 'platform/components/ui/overlay';
import { Spinner } from 'platform/components/ui/spinner';
import { Rdf } from 'platform/api/rdf';

import { SplitPaneComponent } from 'platform/components/ui/splitpane/SplitPaneComponent';
import { Panel } from 'platform/components/ui/panel/Panel';
import { PanelHeader } from 'platform/components/ui/panel/PanelHeader';
import { PanelFooter } from 'platform/components/ui/panel/PanelFooter';
import { PanelBody } from 'platform/components/ui/panel/PanelBody';
import { addNotification } from 'platform/components/ui/notification';

import {
  KeyPath, TreeSelection, Node,
} from 'platform/components/semantic/lazy-tree';

import {
  AlignmentNode, AlignKind,
} from './AlignmentNodeModel';
import { AlignmentService } from './AlignmentService';
import { ConfirmAlignDialog } from './ConfirmAlignDialog';
import {
  MatchEntry, exportAlignment, serializeAlignment, deserializeAlignment
} from './Serialization';
import { MatchList } from './MatchList';
import { MatchPanel } from './MatchPanel';
import { ToolController, ToolState, AlignmentQueries, AlignementRole } from './ToolController';

import * as styles from './AlignmentTool.scss';

export interface AlignmentToolProps {
  className?: string;
  style?: CSSProperties;
  queries: AlignmentQueries;
  alignmentContainer: string;
  /**
   * Template for tree node information box.
   *
   * Parameters:
   *  - `iri`: node's IRI;
   *  - `label`: node's label.
   */
  infoTemplate?: string;
}

enum LoadingStatus { Loading = 1, Success, Error }

type State = { type: LoadingStatus.Loading } | SuccessState | ErrorState;

interface SuccessState extends ToolState {
  readonly type: LoadingStatus.Success;
}

interface ErrorState {
  readonly type: LoadingStatus.Error;
}

export class AlignmentTool extends Component<AlignmentToolProps, State> {
  private readonly cancellation = new Cancellation();
  private readonly controller: ToolController;

  private readonly service: AlignmentService;

  private sourcePanel: MatchPanel;
  private targetPanel: MatchPanel;

  constructor(props: AlignmentToolProps, context: any) {
    super(props, context);

    this.service = new AlignmentService(this.context.semanticContext);

    this.controller = new ToolController({
      cancellation: this.cancellation,
      updateState: (change, callback) => {
        this.setState(
          state => change(assertLoaded(state)) as SuccessState,
          () => callback(assertLoaded(this.state))
        );
      },
      getSparqlOptions: () => ({context: this.context.semanticContext}),
      scrollToPath: (role: AlignementRole, path: KeyPath) => {
        const panel = role === AlignementRole.Source ? this.sourcePanel : this.targetPanel;
        panel.scrollToPath(path);
      },
      showValidationError: (message: string) => {
        addNotification({level: 'warning', message});
      },
    });

    this.state = {type: LoadingStatus.Loading};
  }

  componentDidMount() {
    this.loadAlignment();
  }

  componentWillUnmount() {
    this.cancellation.cancelAll();
  }

  render() {
    const {className, style} = this.props;
    if (this.state.type === LoadingStatus.Loading) {
      return (
        <div className={classnames(styles.component, className)}>
          <Spinner />
        </div>
      );
    } else if (this.state.type === LoadingStatus.Error) {
      return null;
    } else {
      const {source, target, draggedNodes, matches, savedMatches} = this.state;
      return (
        <div className={classnames(styles.component, className)} style={style}>
          <SplitPaneComponent id='alignment-tool-pane' dock={false} minSize={300}>
            <Panel className={styles.leftPanel}>
              <PanelHeader><div>Source</div></PanelHeader>
              <PanelBody>
                <MatchPanel ref={this.onSourcePanelMount}
                  className={styles.sourcePanel}
                  role={AlignementRole.Source}
                  state={source}
                  requestMoreItems={this.onSourceRequestMore}
                  onExpandOrCollapse={this.onSourceExpandOrCollapse}
                  onSelectionChanged={this.onSourceSelectionChanged}
                  onExpandAndScrollToPath={this.onSourceExpandAndScroll}
                  onCancelExpandingToScroll={this.onSourceCancelExpanding}
                  draggedNodes={draggedNodes}
                  onDragStart={this.onDragStart}
                  onDragEnd={this.onDragEnd}
                  onFindAligned={this.onSourceFindAligned}
                />
              </PanelBody>
            </Panel>
            <div className={styles.rightPanel}>
              <Panel className={styles.targetHolder}>
                <PanelHeader><div>Target</div></PanelHeader>
                <PanelBody>
                  <MatchPanel ref={this.onTargetPanelMount}
                    className={styles.targetPanel}
                    role={AlignementRole.Target}
                    state={target}
                    requestMoreItems={this.onTargetRequestMore}
                    onExpandOrCollapse={this.onTargetExpandOrCollapse}
                    onExpandAndScrollToPath={this.onTargetExpandAndScroll}
                    onCancelExpandingToScroll={this.onTargetCancelExpanding}
                    draggedNodes={draggedNodes}
                    onAlign={this.onAlign}
                    onUnalign={this.onUnalign}
                  />
                </PanelBody>
              </Panel>
              <Panel className={styles.controlHolder}>
                <PanelHeader><div>Alignments</div></PanelHeader>
                <PanelBody>
                  <div className={styles.controlPanel}>
                    <MatchList className={styles.controlList}
                      matches={matches} savedMatches={savedMatches}
                      onScrollToEntry={this.onScrollToEntry}
                    />
                  </div>
                </PanelBody>
                <PanelFooter>
                  <div className={styles.controlToolbar}>
                    <Button disabled={matches === savedMatches} bsStyle='danger'
                      onClick={this.onCancelUnsaved}>
                      Cancel Pending
                    </Button>
                    <Button disabled={matches === savedMatches}
                      bsStyle='success' onClick={this.onSaveAlignments}>
                      Save alignment
                    </Button>
                  </div>
                </PanelFooter>
              </Panel>
            </div>
          </SplitPaneComponent>
        </div>
      );
    }
  }

  private onSourcePanelMount = (panel: MatchPanel) => {
    this.sourcePanel = panel;
  }

  private onSourceRequestMore = (path: KeyPath) => {
    this.controller.requestMore(AlignementRole.Source, path);
  }

  private onSourceExpandOrCollapse = (path: KeyPath, expanded: boolean) => {
    this.controller.expandOrCollapse(AlignementRole.Source, path, expanded);
  }

  private onSourceSelectionChanged = (selection: TreeSelection<AlignmentNode>) => {
    this.controller.setSelection(AlignementRole.Source, selection);
  }

  private onSourceExpandAndScroll = (path: KeyPath, node: Node) => {
    this.controller.expandAndScrollToPath(AlignementRole.Source, path, node);
  }

  private onSourceCancelExpanding = () => {
    this.controller.cancelExpandingToScroll(AlignementRole.Source);
  }

  private onSourceFindAligned = (targetKey: string) => {
    const state = assertLoaded(this.state);
    const targetNode = state.target.forest.getFirst(targetKey);
    if (targetNode) {
      const path = state.target.forest.getKeyPath(targetNode);
      this.controller.expandAndScrollToPath(AlignementRole.Target, path, targetNode.base);
    }
  }

  private onTargetPanelMount = (panel: MatchPanel) => {
    this.targetPanel = panel;
  }

  private onTargetRequestMore = (path: KeyPath) => {
    this.controller.requestMore(AlignementRole.Target, path);
  }

  private onTargetExpandOrCollapse = (path: KeyPath, expanded: boolean) => {
    this.controller.expandOrCollapse(AlignementRole.Target, path, expanded);
  }

  private onTargetExpandAndScroll = (path: KeyPath, node: Node) => {
    this.controller.expandAndScrollToPath(AlignementRole.Target, path, node);
  }

  private onTargetCancelExpanding = () => {
    this.controller.cancelExpandingToScroll(AlignementRole.Target);
  }

  private onDragStart = (nodes: AlignmentNode[]) => {
    this.controller.enqueueStateUpdate(() => ({draggedNodes: nodes}));
  }

  private onDragEnd = () => {
    this.controller.enqueueStateUpdate(() => ({draggedNodes: undefined}));
  }

  private onAlign = (sourceNodes: ReadonlyArray<AlignmentNode>, targetPath: KeyPath) => {
    if (sourceNodes.length === 0) { return; }
    const state = assertLoaded(this.state);
    if (sourceNodes.length === 1) {
      const sourceNode = sourceNodes[0];
      showAlignmentRelationDialog({
        sourceNode: sourceNode.base,
        targetNode: state.target.forest.fromKeyPath(targetPath).base,
        onSubmit: kind => {
          this.controller.alignNodes(targetPath, [{kind, sourceNode}]);
        },
      });
    } else {
      const alingments = sourceNodes.map(sourceNode => ({
        sourceNode,
        kind: AlignKind.NarrowerMatch
      }));
      this.controller.alignNodes(targetPath, alingments);
    }
  }

  private onUnalign = (path: KeyPath) => {
    this.controller.unalignNode(path);
  }

  private onScrollToEntry = (entry: MatchEntry) => {
    const state = assertLoaded(this.state);

    const sourceNode = state.source.forest.getFirst(Node.keyOf(entry.targetAligned.aligned));
    const sourcePath = state.source.forest.getKeyPath(sourceNode);
    this.controller.expandAndScrollToPath(
      AlignementRole.Source, sourcePath, entry.targetAligned.aligned
    );

    const targetInternalNode = entry.targetBase.base || entry.targetBase.aligned;
    const targetNode = state.target.forest.getFirst(Node.keyOf(targetInternalNode));
    const targetPath = state.target.forest.getKeyPath(targetNode);
    this.controller.expandAndScrollToPath(AlignementRole.Target, targetPath, targetInternalNode);
  }

  private loadAlignment = () => {
    const {alignmentContainer, queries} = this.props;

    const task = this.service.get(Rdf.iri(alignmentContainer))
      .map(graph => deserializeAlignment(graph))
      .flatMap(alignState => this.controller.loadState(queries, alignState))
      .toProperty();

    this.cancellation.map(task).observe({
      value: state => this.setState({type: LoadingStatus.Success, ...state} as SuccessState),
      error: error => {
        addNotification({
          level: 'error',
          message: `Failed to load alignment state.`,
        }, error);
        this.setState({type: LoadingStatus.Error});
      },
    });
  }

  private onCancelUnsaved = () => {
    this.loadAlignment();
  }

  private onSaveAlignments = () => {
    const {alignmentContainer} = this.props;
    const {metadata, target} = assertLoaded(this.state);
    const alignmentState = exportAlignment(target.forest, metadata);
    const alignmentGraph = serializeAlignment(alignmentState);
    this.cancellation.map(
      this.service.update(Rdf.iri(alignmentContainer), alignmentGraph)
    ).observe({
      value: () => {
        addNotification({
          level: 'success',
          message: 'Successfully updated the alignment.',
        });
        this.controller.setSavedState();
      },
      error: error => addNotification({
        level: 'error',
        message: 'Error while updating the alignment.',
      }, error),
    });
  }
}

function assertLoaded(state: State): SuccessState {
  if (state.type !== LoadingStatus.Success) {
    throw new Error('Cannot update state while AlignmentTool still loading');
  }
  return state;
}

function showAlignmentRelationDialog(params: {
  sourceNode: Node,
  targetNode: Node,
  onSubmit: (kind: AlignKind) => void;
}) {
  const {sourceNode, targetNode, onSubmit} = params;
  const onDialogClose = () => {
    getOverlaySystem().hide(ConfirmAlignDialog.KEY);
  };
  const onDialogSubmit = (kind: AlignKind) => {
    onDialogClose();
    onSubmit(kind);
  };
  getOverlaySystem().show(
    ConfirmAlignDialog.KEY,
    <ConfirmAlignDialog
      sourceNode={sourceNode}
      targetNode={targetNode}
      onSubmit={onDialogSubmit}
      onClose={onDialogClose}
    />
  );
}

export default AlignmentTool;
