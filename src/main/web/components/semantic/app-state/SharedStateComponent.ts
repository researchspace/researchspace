/**
 * Copyright (c) 2026 ResearchSpace contributors.
 *
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import * as PropTypes from 'prop-types';

import { Component, ComponentContext, ContextTypes } from 'platform/api/components';

import { ApplyMode, ComponentState, StateTransition, SyncOrigin, SyncStateData } from './AppStateEvents';
import { SharedStateManager, parseSharedStateVars } from './SharedStateUtils';

export interface SharedStateProps {
  /**
   * Component id. Required to share state.
   */
  id?: string;

  /**
   * Names of the state variables that are shared with the enclosing `<app-state>`,
   * as a comma separated string or an array.
   *
   * @example shared-state-vars="currentPage,filterValue"
   */
  sharedStateVars?: string | string[];

  /**
   * Id of the `<app-state>` component to sync with. Needed only when the component is
   * not rendered inside it (e.g. in an overlay); otherwise the enclosing one is used.
   */
  appStateId?: string;
}

/**
 * Context provided by the `<app-state>` component to its descendants.
 */
export interface AppStateContext {
  appState?: { id?: string };
}

export const AppStateContextTypes = {
  appState: PropTypes.object,
};

export interface SharedStateSyncOptions {
  mode: ApplyMode;
  origin: SyncOrigin;
  transition?: StateTransition;
}

/**
 * Base class for components whose state can be shared through `<app-state>`.
 *
 * A subclass gets, for the variables listed in `shared-state-vars`:
 * - registration with the enclosing `<app-state>` on mount and unregistration on unmount;
 * - automatic sync of changed variables after every `setState`
 *   (see {@link isAutoSyncEnabled});
 * - application of states received from `<app-state>` (see {@link handleSharedStateSync}).
 *
 * Subclasses that override `componentDidMount` or `componentWillUnmount` must call
 * the `super` implementation.
 */
export abstract class SharedStateComponent<P extends SharedStateProps, S> extends Component<P, S> {
  static readonly contextTypes: any = { ...ContextTypes, ...AppStateContextTypes };
  readonly context: ComponentContext & AppStateContext;

  protected sharedStateManager: SharedStateManager | null = null;

  /**
   * Whether `<app-state>` has resolved the initial state of this component.
   * Always true when the component does not share state.
   */
  protected sharedStateResolved = false;

  constructor(props: P, context: ComponentContext & AppStateContext) {
    super(props, context);
  }

  public componentDidMount() {
    this.sharedStateManager = this.createSharedStateManager();
    if (this.sharedStateManager) {
      this.sharedStateManager.register(this.getInitialSharedState());
    } else {
      this.resolveSharedState(false);
    }
  }

  public componentWillUnmount() {
    if (this.sharedStateManager) {
      this.sharedStateManager.unregister();
      this.sharedStateManager = null;
    }
    super.componentWillUnmount();
  }

  /**
   * Calls `React.Component.setState` and then syncs the changed shared variables,
   * if auto sync is enabled.
   */
  public setState<K extends keyof S>(
    state: ((prevState: Readonly<S>, props: Readonly<P>) => Pick<S, K> | S | null) | (Pick<S, K> | S | null),
    callback?: () => void
  ): void {
    super.setState(state, () => {
      if (this.sharedStateManager && this.isAutoSyncEnabled()) {
        this.sharedStateManager.updateSharedState(this.state as any);
      }
      if (callback) {
        callback();
      }
    });
  }

  /**
   * Applies a state received from `<app-state>`.
   *
   * The default implementation copies the shared variables into the component state,
   * without syncing them back. Override it when applying the state needs side effects.
   *
   * @param state shared variables to apply
   * @param options with mode `replace`, variables missing from `state` should go back
   *   to their defaults; the default implementation ignores them.
   */
  protected handleSharedStateSync(state: ComponentState, options: SharedStateSyncOptions): void {
    const updates = this.sharedStateManager ? this.sharedStateManager.extractSharedState(state) : {};
    if (Object.keys(updates).length > 0) {
      super.setState(updates as any);
    }
  }

  /**
   * Called once, when `<app-state>` has resolved the initial state of this component
   * (after {@link handleSharedStateSync} if there is a stored state), or right after
   * mount when the component does not share state.
   */
  protected onSharedStateResolved(hasStoredState: boolean): void {}

  /**
   * Initial shared state sent with the registration. Defaults to the shared variables
   * found in the component state.
   */
  protected getInitialSharedState(): ComponentState {
    return this.state as any;
  }

  /**
   * Whether shared variables are synced after every `setState`. Components that push
   * their shared state explicitly with {@link updateSharedState} return false.
   */
  protected isAutoSyncEnabled(): boolean {
    return true;
  }

  /**
   * Names of the shared variables this component supports, or `undefined` if any
   * state variable can be shared. Unsupported names in `shared-state-vars` are ignored.
   */
  protected getSupportedSharedStateVars(): string[] | undefined {
    return undefined;
  }

  /**
   * Sends the changed shared variables of `state` to `<app-state>`. The values do not
   * need to be in the component state.
   *
   * @param sendAllIfChanged when any variable has changed, send all of them.
   */
  protected updateSharedState(state: ComponentState, sendAllIfChanged = false): void {
    if (this.sharedStateManager) {
      this.sharedStateManager.updateSharedState(state, sendAllIfChanged);
    }
  }

  /**
   * Records `state` as the current shared state without sending it, e.g. a default
   * computed after loading data, so that it does not count as a user change.
   */
  protected setSharedStateBaseline(state: ComponentState): void {
    if (this.sharedStateManager) {
      this.sharedStateManager.setBaseline(state);
    }
  }

  protected isSharedVariable(varName: string): boolean {
    return this.getSharedStateVars().indexOf(varName) >= 0;
  }

  /**
   * Shared variables declared in `shared-state-vars` and supported by the component.
   * Available before mount, unlike {@link sharedStateManager}.
   */
  protected getSharedStateVars(): string[] {
    const declared = parseSharedStateVars(this.props.sharedStateVars);
    const supported = this.getSupportedSharedStateVars();
    return supported ? declared.filter((name) => supported.indexOf(name) >= 0) : declared;
  }

  /**
   * Asks `<app-state>` to send the current state of this component again.
   */
  protected requestCurrentState(): void {
    if (this.sharedStateManager) {
      this.sharedStateManager.requestCurrentState();
    }
  }

  private createSharedStateManager(): SharedStateManager | null {
    const declared = parseSharedStateVars(this.props.sharedStateVars);
    if (declared.length === 0) {
      return null;
    }
    const sharedStateVars = this.getSharedStateVars();
    const unsupported = declared.filter((name) => sharedStateVars.indexOf(name) < 0);
    if (unsupported.length > 0) {
      console.warn(`app-state: component "${this.props.id}" does not support shared variables: ${unsupported}`);
    }
    if (!this.props.id) {
      console.warn('app-state: a component with shared-state-vars needs an id, its state will not be shared');
      return null;
    }
    const contextAppState = this.context.appState;
    if (!this.props.appStateId && !contextAppState) {
      // not inside an <app-state> component
      return null;
    }
    if (sharedStateVars.length === 0) {
      return null;
    }
    return new SharedStateManager({
      componentId: this.props.id,
      sharedStateVars,
      appStateId: this.props.appStateId || contextAppState.id,
      onStateSync: (data) =>
        this.handleSharedStateSync(data.state, {
          mode: data.mode,
          origin: data.origin,
          transition: data.transition,
        }),
      onStateResolved: (hasStoredState) => this.resolveSharedState(hasStoredState),
    });
  }

  private resolveSharedState(hasStoredState: boolean) {
    if (this.sharedStateResolved) {
      return;
    }
    this.sharedStateResolved = true;
    this.onSharedStateResolved(hasStoredState);
  }
}

export default SharedStateComponent;
