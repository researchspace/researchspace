/**
 * Copyright (c) 2026 ResearchSpace contributors.
 *
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import * as React from 'react';
import * as classnames from 'classnames';
import * as _ from 'lodash';

import { Component, ComponentContext } from 'platform/api/components';
import { trigger, listen, Event } from 'platform/api/events';
import { navigationConfirmation } from 'platform/api/navigation';
import { makeShortURL } from 'platform/api/services/url-minifier';
import { addNotification } from 'platform/components/ui/notification';
import Icon from 'platform/components/ui/icon/Icon';

import {
  ApplyMode,
  ApplyStateData,
  ComponentState,
  ComponentStateRegistration,
  ComponentStates,
  StateTransition,
  SyncOrigin,
  RegisterComponent,
  UnregisterComponent,
  UpdateSharedState,
  RequestCurrentState,
  SyncStateToComponent,
  StateResolved,
  ApplyState,
  LoadState,
  StateChanged,
} from './AppStateEvents';
import {
  STATES_PARAM,
  STATE_ID_PARAM,
  parseStatesParam,
  serializeStates,
  fetchBackendState,
  saveBackendState,
} from './AppStateUrlCodec';
import { AppStateContext, AppStateContextTypes } from './SharedStateComponent';

import * as styles from './AppState.scss';

export interface AppStateConfig {
  /**
   * Id of the app-state component. Components inside it find it automatically;
   * components rendered elsewhere (e.g. in an overlay) refer to it with `app-state-id`.
   * The id is also the target of the `AppState.ApplyState` and `AppState.LoadState` events.
   */
  id?: string;

  /**
   * Where the shared state is kept:
   * - `url`: in the `states` URL parameter. With `auto-sync` the URL is updated on every
   *   change; otherwise the save button creates a short link.
   * - `backend`: saved on the server by the save button; the URL only carries `stateId`.
   *   Users are warned before leaving the page with unsaved changes.
   *
   * @default "url"
   */
  storageMode?: 'url' | 'backend';

  /**
   * In `url` mode, update the URL whenever the shared state changes.
   * When enabled the save button is hidden.
   *
   * @default false
   */
  autoSync?: boolean;

  /**
   * Delay in milliseconds before the URL is updated after a change.
   *
   * @default 500
   */
  urlUpdateDelay?: number;

  /**
   * Position of the save button.
   *
   * @default "top-right"
   */
  saveButtonPosition?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
}

export type AppStateProps = AppStateConfig & { children?: React.ReactNode };

interface State {
  isSaving: boolean;
  hasSharedState: boolean;
  hasUnsavedChanges: boolean;
}

interface PendingSync {
  state: ComponentState;
  mode: ApplyMode;
  origin: SyncOrigin;
  transition?: StateTransition;
}

const UNSAVED_CHANGES_MESSAGE = 'You have unsaved changes. Are you sure you want to leave?';

/**
 * Keeps the shared state of the components inside it in the URL or in the backend, so
 * that a page can be shared and restored as the user left it.
 *
 * Components take part by declaring `shared-state-vars`; see the AppState help page for
 * the supported components and variables.
 *
 * @example
 * <app-state id="my-state" auto-sync="true">
 *   <semantic-table id="results" shared-state-vars="currentPage,filterValue" query="..."></semantic-table>
 * </app-state>
 */
export class AppState extends Component<AppStateProps, State> {
  static childContextTypes: any = { ...Component.childContextTypes, ...AppStateContextTypes };

  static defaultProps: Partial<AppStateProps> = {
    storageMode: 'url',
    autoSync: false,
    urlUpdateDelay: 500,
    saveButtonPosition: 'top-right',
  };

  /**
   * Current shared state of the registered components.
   */
  private states: ComponentStates = {};
  /**
   * States to send to components when they register (from the URL, the backend or
   * `AppState.ApplyState` events received before the component mounted).
   */
  private pending: { [componentId: string]: PendingSync } = {};
  private registrations: { [componentId: string]: ComponentStateRegistration } = {};
  /**
   * Last saved (or loaded) states, to detect unsaved changes in backend mode.
   */
  private savedStates: ComponentStates = {};
  /**
   * Whether the initial state from the URL or the backend has been read.
   */
  private resolved = false;
  private urlUpdateTimeout: number | undefined;
  private removeNavigationConfirmation: (() => void) | undefined;

  constructor(props: AppStateProps, context: ComponentContext) {
    super(props, context);
    this.state = { isSaving: false, hasSharedState: false, hasUnsavedChanges: false };

    const target = props.id;
    this.cancel.map(listen({ eventType: RegisterComponent, target })).onValue(this.onRegister);
    this.cancel.map(listen({ eventType: UnregisterComponent, target })).onValue(this.onUnregister);
    this.cancel.map(listen({ eventType: UpdateSharedState, target })).onValue(this.onUpdate);
    this.cancel.map(listen({ eventType: RequestCurrentState, target })).onValue(this.onRequest);
    this.cancel.map(listen({ eventType: ApplyState, target })).onValue(this.onApply);
    this.cancel.map(listen({ eventType: LoadState, target })).onValue(this.onLoad);
  }

  getChildContext() {
    const context: AppStateContext = { appState: { id: this.props.id } };
    return { ...super.getChildContext(), ...context };
  }

  componentDidMount() {
    this.resolveInitialState();
    window.addEventListener('beforeunload', this.onBeforeUnload);
  }

  componentWillUnmount() {
    window.clearTimeout(this.urlUpdateTimeout);
    window.removeEventListener('beforeunload', this.onBeforeUnload);
    this.setNavigationConfirmation(false);
    super.componentWillUnmount();
  }

  private isBackendMode() {
    return this.props.storageMode === 'backend';
  }

  /**
   * Reads the initial state from the URL (or from the backend in backend mode) and sends
   * it to the components that have already registered.
   */
  private resolveInitialState() {
    const params = new URLSearchParams(window.location.search);
    const stateId = params.get(STATE_ID_PARAM);
    if (stateId && this.isBackendMode()) {
      this.cancel.map(fetchBackendState(stateId)).observe({
        value: (stored) => this.finishResolution(stored.states, 'backend'),
        error: (error) => {
          addNotification(
            {
              level: 'error',
              title: 'Failed to load the saved state',
              message: 'The link may be invalid or the state may have been deleted.',
              autoDismiss: 8,
            },
            error
          );
          this.finishResolution({}, 'backend');
        },
      });
    } else {
      const statesParam = params.get(STATES_PARAM);
      this.finishResolution(statesParam ? parseStatesParam(statesParam) : {}, 'url');
    }
  }

  private finishResolution(stored: ComponentStates, origin: SyncOrigin) {
    _.forEach(stored, (state, componentId) => {
      // a state applied while the backend state was loading takes precedence
      if (!this.pending[componentId]) {
        this.pending[componentId] = { state, mode: 'merge', origin };
      }
    });
    this.resolved = true;
    Object.keys(this.registrations).forEach(this.deliver);
    this.savedStates = _.cloneDeep(this.states);
    this.updateFlags();
  }

  /**
   * Sends the pending state (if any) to a registered component, then tells it that its
   * initial state is resolved.
   */
  private deliver = (componentId: string) => {
    const registration = this.registrations[componentId];
    const pending = this.pending[componentId];
    delete this.pending[componentId];
    if (pending) {
      this.states[componentId] =
        pending.mode === 'replace' ? { ...pending.state } : { ...registration.currentState, ...pending.state };
      this.sendToComponent(componentId, pending);
    } else {
      this.states[componentId] = { ...registration.currentState };
    }
    trigger({
      eventType: StateResolved,
      source: this.props.id,
      targets: [componentId],
      data: { hasStoredState: Boolean(pending) },
    });
  };

  private sendToComponent(componentId: string, sync: PendingSync) {
    trigger({
      eventType: SyncStateToComponent,
      source: this.props.id,
      targets: [componentId],
      data: { state: sync.state, mode: sync.mode, origin: sync.origin, transition: sync.transition },
    });
  }

  private onRegister = (event: Event<ComponentStateRegistration>) => {
    const registration = event.data;
    this.registrations[registration.componentId] = registration;
    if (this.resolved) {
      this.deliver(registration.componentId);
      this.updateFlags();
    }
  };

  private onUnregister = (event: Event<string>) => {
    const componentId = event.data;
    delete this.registrations[componentId];
    delete this.states[componentId];
    if (this.resolved) {
      this.onStatesChanged(this.props.autoSync);
    }
  };

  private onUpdate = (event: Event<{ componentId: string; stateUpdates: ComponentState }>) => {
    const { componentId, stateUpdates } = event.data;
    const registration = this.registrations[componentId];
    if (!registration) {
      return;
    }
    if (!this.resolved) {
      // still reading the initial state: this is part of the component defaults
      registration.currentState = { ...registration.currentState, ...stateUpdates };
      return;
    }
    this.states[componentId] = { ...this.states[componentId], ...stateUpdates };
    this.onStatesChanged(this.props.autoSync);
  };

  private onRequest = (event: Event<{ componentId: string }>) => {
    const { componentId } = event.data;
    this.sendToComponent(componentId, { state: this.states[componentId] || {}, mode: 'merge', origin: 'request' });
  };

  private onApply = (event: Event<ApplyStateData>) => {
    const { states, mode = 'merge', transition, updateUrl = this.props.autoSync, markDirty = false } = event.data;
    this.applyStates(states || {}, { mode, origin: 'apply', transition }, updateUrl, markDirty);
  };

  private onLoad = (event: Event<{ stateId: string; transition?: StateTransition }>) => {
    const { stateId, transition } = event.data;
    this.cancel.map(fetchBackendState(stateId)).observe({
      value: (stored) => {
        this.applyStates(stored.states, { mode: 'replace', origin: 'backend', transition }, false, false);
        if (this.isBackendMode()) {
          const url = new URL(window.location.href);
          url.searchParams.delete(STATES_PARAM);
          url.searchParams.set(STATE_ID_PARAM, stateId);
          this.replaceUrl(url.toString());
        }
      },
      error: (error) =>
        addNotification({ level: 'error', message: 'Failed to load the saved state.', autoDismiss: 8 }, error),
    });
  };

  /**
   * Applies states to components. Components that have not registered yet receive the
   * state when they do.
   */
  private applyStates(
    states: ComponentStates,
    sync: Omit<PendingSync, 'state'>,
    updateUrl: boolean,
    markDirty: boolean
  ) {
    _.forEach(states, (componentState, componentId) => {
      const state = componentState || {};
      if (this.resolved && this.registrations[componentId]) {
        this.states[componentId] = sync.mode === 'replace' ? { ...state } : { ...this.states[componentId], ...state };
        this.sendToComponent(componentId, { ...sync, state });
        if (!markDirty) {
          this.savedStates[componentId] = _.cloneDeep(this.states[componentId]);
        }
      } else {
        const previous = this.pending[componentId];
        const replace = sync.mode === 'replace' || (previous && previous.mode === 'replace');
        this.pending[componentId] = {
          ...sync,
          mode: replace ? 'replace' : 'merge',
          state: sync.mode === 'replace' || !previous ? { ...state } : { ...previous.state, ...state },
        };
      }
    });
    this.onStatesChanged(updateUrl);
  }

  private onStatesChanged(updateUrl: boolean) {
    if (updateUrl && !this.isBackendMode()) {
      this.scheduleUrlUpdate();
    }
    this.updateFlags();
    trigger({ eventType: StateChanged, source: this.props.id, data: { states: _.cloneDeep(this.states) } });
  }

  private updateFlags() {
    const hasSharedState = _.some(this.states, (state) => !_.isEmpty(state));
    const hasUnsavedChanges = this.isBackendMode() && !_.isEqual(nonEmpty(this.states), nonEmpty(this.savedStates));
    if (hasSharedState !== this.state.hasSharedState || hasUnsavedChanges !== this.state.hasUnsavedChanges) {
      this.setState({ hasSharedState, hasUnsavedChanges });
    }
    this.setNavigationConfirmation(hasUnsavedChanges);
  }

  private setNavigationConfirmation(enabled: boolean) {
    if (enabled && !this.removeNavigationConfirmation) {
      this.removeNavigationConfirmation = navigationConfirmation(UNSAVED_CHANGES_MESSAGE);
    } else if (!enabled && this.removeNavigationConfirmation) {
      this.removeNavigationConfirmation();
      this.removeNavigationConfirmation = undefined;
    }
  }

  private onBeforeUnload = (e: BeforeUnloadEvent) => {
    if (this.state.hasUnsavedChanges) {
      e.preventDefault();
      e.returnValue = UNSAVED_CHANGES_MESSAGE;
      return UNSAVED_CHANGES_MESSAGE;
    }
  };

  private scheduleUrlUpdate() {
    window.clearTimeout(this.urlUpdateTimeout);
    this.urlUpdateTimeout = window.setTimeout(() => this.replaceUrl(this.buildUrl()), this.props.urlUpdateDelay);
  }

  /**
   * Current URL with the states of this app-state in the `states` parameter. States of
   * components that belong to other app-state components on the page are kept.
   */
  private buildUrl(): string {
    const url = new URL(window.location.href);
    const inUrl = parseStatesParam(url.searchParams.get(STATES_PARAM));
    const others = _.omitBy(inUrl, (state, componentId) => this.isOwnComponent(componentId));
    const serialized = serializeStates({ ...others, ...this.states });
    if (serialized) {
      url.searchParams.set(STATES_PARAM, serialized);
    } else {
      url.searchParams.delete(STATES_PARAM);
    }
    return url.toString();
  }

  private isOwnComponent(componentId: string) {
    return componentId in this.registrations || componentId in this.states;
  }

  private replaceUrl(url: string) {
    if (url !== window.location.href) {
      // keep the history state, the platform router stores its location key there
      window.history.replaceState(window.history.state, '', url);
    }
  }

  private onSave = () => {
    this.setState({ isSaving: true });
    if (this.isBackendMode()) {
      const page = new URL(window.location.href);
      page.searchParams.delete(STATES_PARAM);
      page.searchParams.delete(STATE_ID_PARAM);
      this.cancel.map(saveBackendState(page.pathname + page.search, this.states)).observe({
        value: (stateId) => {
          page.searchParams.set(STATE_ID_PARAM, stateId);
          this.replaceUrl(page.toString());
          this.savedStates = _.cloneDeep(this.states);
          this.setState({ isSaving: false });
          this.updateFlags();
          this.shareUrl(page.toString());
        },
        error: this.onSaveError,
      });
    } else {
      this.cancel.map(makeShortURL(this.buildUrl())).observe({
        value: (shortUrl) => {
          this.setState({ isSaving: false });
          this.shareUrl(shortUrl);
        },
        error: this.onSaveError,
      });
    }
  };

  private onSaveError = (error: any) => {
    this.setState({ isSaving: false });
    addNotification(
      {
        level: 'error',
        title: 'Failed to save the state',
        message: 'The shareable link could not be created. Please try again.',
        autoDismiss: 8,
      },
      error
    );
  };

  private shareUrl(url: string) {
    const showUrl = (title: string) =>
      addNotification({
        level: 'success',
        title,
        message: `<div class="${styles.savedUrl}">${_.escape(url)}</div>`,
        autoDismiss: 10,
      });
    const clipboard = navigator.clipboard;
    if (clipboard) {
      clipboard.writeText(url).then(
        () => showUrl('State saved, link copied to the clipboard'),
        () => showUrl('State saved, copy the link to share it')
      );
    } else {
      showUrl('State saved, copy the link to share it');
    }
  }

  render() {
    const { storageMode, autoSync, saveButtonPosition, children } = this.props;
    const { isSaving, hasSharedState } = this.state;
    const showSaveButton = storageMode === 'backend' || !autoSync;
    return (
      <div className={classnames('app-state-container', styles.container)}>
        {showSaveButton ? (
          <button
            type="button"
            className={classnames('app-state-save-button', styles.saveButton, styles[positionClass(saveButtonPosition)])}
            onClick={this.onSave}
            disabled={isSaving || !hasSharedState}
            title="Save the current state and copy a shareable link"
          >
            <Icon iconType="rounded" iconName={isSaving ? 'hourglass_empty' : 'save'} symbol />
          </button>
        ) : null}
        {children}
      </div>
    );
  }
}

function positionClass(position: AppStateConfig['saveButtonPosition']): string {
  return _.camelCase(position || 'top-right');
}

function nonEmpty(states: ComponentStates): ComponentStates {
  return _.omitBy(states, (state) => _.isEmpty(state));
}

export default AppState;
