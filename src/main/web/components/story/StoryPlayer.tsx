/**
 * Copyright (c) 2026 ResearchSpace contributors.
 *
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import * as React from 'react';
import * as classnames from 'classnames';
import * as Kefir from 'kefir';

import { Component, ComponentContext, ContextTypes } from 'platform/api/components';
import { listen, trigger } from 'platform/api/events';
import { navigateToUrl } from 'platform/api/navigation';
import Icon from 'platform/components/ui/icon/Icon';
import { Spinner } from 'platform/components/ui/spinner';

import { ApplyState, ComponentStates } from 'platform/components/semantic/app-state/AppStateEvents';
import { fetchBackendState } from 'platform/components/semantic/app-state/AppStateUrlCodec';
import { AppStateContext, AppStateContextTypes } from 'platform/components/semantic/app-state/SharedStateComponent';

import { Story } from './StoryModel';
import { DEFAULT_STORY_REPOSITORY, loadStory } from './StoryService';
import { GoTo, Loaded, Next, Previous, Reset, SlideChanged } from './StoryEvents';
import { StoryHtml } from './StoryHtml';
import {
  SlideTarget,
  buildSlidePageUrl,
  collectComponentIds,
  readSlideParams,
  resolveSlideTarget,
  writeSlideParams,
} from './StoryNavigation';
import * as styles from './Story.scss';

export interface StoryConfig {
  /**
   * Id of the component, target of the `Story.Next`, `Story.Previous`, `Story.GoTo` and
   * `Story.Reset` events.
   */
  id?: string;

  /**
   * IRI of the story to play.
   */
  story: string;

  /**
   * Repository where the story is stored.
   *
   * @default "default"
   */
  repository?: string;

  /**
   * Id of the `<app-state>` the slides are applied to. Not needed when the story is inside it.
   */
  appStateId?: string;

  /**
   * `floating` shows the story as a card over the page; `inline` in the page flow.
   *
   * @default "floating"
   */
  layout?: 'floating' | 'inline';

  /**
   * Position of the floating card.
   *
   * @default "middle-right"
   */
  position?: 'top-left' | 'top-right' | 'middle-left' | 'middle-right' | 'bottom-left' | 'bottom-right';

  /**
   * Width of the card, as a CSS length.
   *
   * @default "360px"
   */
  width?: string;

  /**
   * Whether the card can be collapsed.
   *
   * @default true
   */
  collapsible?: boolean;

  /**
   * Whether the card starts collapsed.
   *
   * @default false
   */
  collapsed?: boolean;

  /**
   * Whether the story title is shown.
   *
   * @default true
   */
  showTitle?: boolean;

  /**
   * Whether the slide position (e.g. 2 / 5) is shown.
   *
   * @default true
   */
  showProgress?: boolean;

  /**
   * Whether components animate to the state of a slide (e.g. the map flies to the new view).
   *
   * @default true
   */
  animate?: boolean;

  /**
   * Duration of the animation in milliseconds.
   *
   * @default 1500
   */
  transitionDuration?: number;

  /**
   * Keyboard navigation (arrows, Page Up/Down, Home, End):
   * `global` anywhere on the page, `focus` when the card has the focus, `none`.
   *
   * @default "global"
   */
  keyboard?: 'global' | 'focus' | 'none';

  /**
   * Whether the state of the first slide is applied when the story loads:
   * `auto` applies it unless the URL already carries a state (a shared link);
   * `always`; `never`.
   *
   * @default "auto"
   */
  applyOnLoad?: 'auto' | 'always' | 'never';

  /**
   * Slide shown first, from 1. A slide given in the URL (`storySlide`) takes precedence.
   *
   * @default 1
   */
  startSlide?: number;
}

export type StoryProps = StoryConfig;

interface State {
  story?: Story;
  isLoading: boolean;
  error?: string;
  index: number;
  collapsed: boolean;
}

const DEFAULT_TRANSITION_DURATION = 1500;

/**
 * Plays a story: shows the text of each slide and applies its state to the components of the
 * page through `<app-state>`, without reloading the page. A slide that shows another page
 * opens that page, where an `rs-story` on the same story continues.
 *
 * @example
 * <app-state id="map-state" auto-sync="true">
 *   <semantic-map-advanced id="map" shared-state-vars="view,basemap" ...></semantic-map-advanced>
 *   <rs-story story="[[urlParam 'story']]" position="middle-right"></rs-story>
 * </app-state>
 */
export class StoryPlayer extends Component<StoryProps, State> {
  static readonly contextTypes: any = { ...ContextTypes, ...AppStateContextTypes };
  readonly context: ComponentContext & AppStateContext;

  static defaultProps: Partial<StoryProps> = {
    repository: DEFAULT_STORY_REPOSITORY,
    layout: 'floating',
    position: 'middle-right',
    width: '360px',
    collapsible: true,
    collapsed: false,
    showTitle: true,
    showProgress: true,
    animate: true,
    transitionDuration: DEFAULT_TRANSITION_DURATION,
    keyboard: 'global',
    applyOnLoad: 'auto',
    startSlide: 1,
  };

  private card = React.createRef<HTMLDivElement>();
  private loading = this.cancel.derive();
  private applying = this.cancel.derive();
  private targets: Array<SlideTarget | undefined> = [];
  /** Components that appear in the slides, see collectComponentIds. */
  private componentIds: string[] = [];
  private backendStates: { [stateId: string]: ComponentStates } = {};

  constructor(props: StoryProps, context: ComponentContext & AppStateContext) {
    super(props, context);
    this.state = { isLoading: true, index: 0, collapsed: Boolean(props.collapsed) };
  }

  componentDidMount() {
    if (this.props.id) {
      this.cancel.map(listen({ eventType: Next, target: this.props.id })).onValue(() => this.next());
      this.cancel.map(listen({ eventType: Previous, target: this.props.id })).onValue(() => this.previous());
      this.cancel.map(listen({ eventType: Reset, target: this.props.id })).onValue(() => this.goTo(this.state.index));
      this.cancel.map(listen({ eventType: GoTo, target: this.props.id })).onValue((event) => {
        const { index, slide } = event.data || {};
        const position = slide && this.state.story ? this.state.story.slides.findIndex((s) => s.iri === slide) : index;
        if (typeof position === 'number' && position >= 0) {
          this.goTo(position);
        }
      });
    }
    if (this.props.keyboard === 'global') {
      window.addEventListener('keydown', this.onKeyDown);
    }
    this.load(this.props.story);
  }

  componentWillReceiveProps(nextProps: StoryProps) {
    if (nextProps.story !== this.props.story || nextProps.repository !== this.props.repository) {
      this.load(nextProps.story, nextProps.repository);
    }
  }

  componentWillUnmount() {
    window.removeEventListener('keydown', this.onKeyDown);
    super.componentWillUnmount();
  }

  private load(storyIri: string, repository = this.props.repository) {
    if (!storyIri) {
      this.setState({ isLoading: false, story: undefined, error: undefined });
      return;
    }
    this.setState({ isLoading: true, error: undefined });
    this.loading = this.cancel.deriveAndCancel(this.loading);
    this.loading.map(loadStory(storyIri, repository)).observe({
      value: (story) => {
        if (!story) {
          this.setState({ isLoading: false, story: undefined, error: 'The story does not exist.' });
          return;
        }
        this.targets = story.slides.map((slide) => resolveSlideTarget(slide.stateUrl));
        this.componentIds = collectComponentIds(this.targets);
        const fromUrl = readSlideParams();
        const resumed = fromUrl.story === story.iri && typeof fromUrl.index === 'number';
        const initialIndex = clampIndex(resumed ? fromUrl.index : this.props.startSlide - 1, story.slides.length);
        this.setState({ story, isLoading: false, index: initialIndex }, () => {
          trigger({
            eventType: Loaded,
            source: this.props.id,
            data: { story: story.iri, total: story.slides.length },
          });
          if (this.shouldApplyOnLoad(resumed)) {
            this.applySlide(initialIndex, false);
          }
          this.notifySlideChanged();
        });
      },
      error: () => this.setState({ isLoading: false, error: 'The story could not be loaded.' }),
    });
  }

  private shouldApplyOnLoad(resumed: boolean): boolean {
    switch (this.props.applyOnLoad) {
      case 'always':
        return true;
      case 'never':
        return false;
      default: {
        // a link with a state (e.g. shared by a user) is not overridden
        const params = new URLSearchParams(window.location.search);
        return resumed || !(params.has('states') || params.has('stateId'));
      }
    }
  }

  private next = () => this.goTo(this.state.index + 1);
  private previous = () => this.goTo(this.state.index - 1);

  private goTo = (index: number) => {
    const { story } = this.state;
    if (!story || index < 0 || index >= story.slides.length) {
      return;
    }
    this.setState({ index }, () => {
      this.applySlide(index, this.props.animate);
      this.notifySlideChanged();
    });
  };

  private notifySlideChanged() {
    const { story, index } = this.state;
    if (!story || story.slides.length === 0) {
      return;
    }
    writeSlideParams(story.iri, index);
    trigger({
      eventType: SlideChanged,
      source: this.props.id,
      data: { story: story.iri, index, slide: story.slides[index].iri, total: story.slides.length },
    });
  }

  /**
   * Shows the state of a slide: applied in place when the slide shows this page, otherwise
   * by opening its page.
   */
  private applySlide(index: number, animate: boolean) {
    const target = this.targets[index];
    if (!target) {
      // a slide with text only
      return;
    }
    if (!target.samePage) {
      navigateToUrl(buildSlidePageUrl(target, this.state.story.iri, index)).observe({});
      return;
    }
    this.applying = this.cancel.deriveAndCancel(this.applying);
    let states: Kefir.Property<ComponentStates>;
    if (target.states) {
      states = Kefir.constant(target.states);
    } else if (target.stateId) {
      states = this.backendStates[target.stateId]
        ? Kefir.constant(this.backendStates[target.stateId])
        : fetchBackendState(target.stateId).map((stored) => (this.backendStates[target.stateId] = stored.states));
    } else {
      return;
    }
    this.applying.map(states).observe({
      value: (slideStates) => this.applyStates(slideStates, animate),
      error: (error) => console.warn('rs-story: cannot load the state of the slide', error),
    });
  }

  private applyStates(slideStates: ComponentStates, animate: boolean) {
    // every component used by the story gets a state, so that the previous slide does not leak
    const states: ComponentStates = {};
    const ids = this.componentIds.concat(Object.keys(slideStates));
    ids.forEach((id) => {
      if (id !== this.props.id) {
        states[id] = slideStates[id] || {};
      }
    });
    const appStateId = this.props.appStateId || (this.context.appState && this.context.appState.id);
    trigger({
      eventType: ApplyState,
      source: this.props.id || 'rs-story',
      targets: appStateId ? [appStateId] : undefined,
      data: {
        states,
        mode: 'replace',
        transition: { animate, duration: this.props.transitionDuration },
        markDirty: false,
      },
    });
  }

  private onKeyDown = (event: KeyboardEvent | React.KeyboardEvent) => {
    if (event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) {
      return;
    }
    const target = event.target as HTMLElement;
    if (target && target.closest && isEditingTarget(target)) {
      return;
    }
    const total = this.state.story ? this.state.story.slides.length : 0;
    const keys: { [key: string]: () => void } = {
      ArrowRight: this.next,
      PageDown: this.next,
      ArrowLeft: this.previous,
      PageUp: this.previous,
      Home: () => this.goTo(0),
      End: () => this.goTo(total - 1),
    };
    const action = keys[event.key];
    if (action && total > 0 && !this.state.collapsed) {
      event.preventDefault();
      action();
    }
  };

  private toggleCollapsed = () => this.setState((state) => ({ collapsed: !state.collapsed }));

  render() {
    const { layout, position, width, collapsible, showTitle, showProgress, keyboard } = this.props;
    const { story, isLoading, error, index, collapsed } = this.state;
    const className = classnames(
      'rs-story',
      styles.story,
      layout === 'floating' ? `${styles.floating} ${styles[camel(position)]}` : styles.inline,
      collapsed ? styles.collapsed : ''
    );
    const style = layout === 'floating' && !collapsed ? { width } : undefined;
    const keyboardProps =
      keyboard === 'focus' ? { tabIndex: 0, onKeyDown: (e: React.KeyboardEvent) => this.onKeyDown(e) } : {};

    if (isLoading) {
      return (
        <div className={className} style={style}>
          <Spinner />
        </div>
      );
    }
    if (error || !story) {
      return error ? (
        <div className={className} style={style}>
          <div className={styles.error}>{error}</div>
        </div>
      ) : null;
    }
    const total = story.slides.length;
    const slide = story.slides[index];

    if (collapsed) {
      return (
        <div className={className}>
          <button type="button" className={classnames('btn btn-default', styles.expandButton)} onClick={this.toggleCollapsed}>
            <Icon iconType="rounded" iconName="auto_stories" symbol /> {story.title}
            {total > 0 ? ` · ${index + 1} / ${total}` : ''}
          </button>
        </div>
      );
    }

    return (
      <div className={className} style={style} ref={this.card} role="region" aria-label={story.title} {...keyboardProps}>
        <div className={styles.header}>
          {showTitle ? <div className={styles.storyTitle}>{story.title}</div> : <div />}
          {collapsible ? (
            <button type="button" className={styles.iconButton} title="Collapse" aria-label="Collapse" onClick={this.toggleCollapsed}>
              <Icon iconType="rounded" iconName="close_fullscreen" symbol />
            </button>
          ) : null}
        </div>
        {slide ? (
          <div className={styles.body} aria-live="polite">
            {slide.title ? <h3 className={styles.slideTitle}>{slide.title}</h3> : null}
            <StoryHtml className={styles.slideText} html={slide.text} onGoTo={this.goTo} />
          </div>
        ) : (
          <div className={styles.body}>This story has no slides.</div>
        )}
        {total > 0 ? (
          <div className={styles.footer}>
            <button type="button" className="btn btn-default" onClick={this.previous} disabled={index === 0}>
              <Icon iconType="rounded" iconName="arrow_back" symbol /> Previous
            </button>
            {showProgress ? (
              <div className={styles.progress}>
                <span className={styles.progressLabel}>
                  {index + 1} / {total}
                </span>
                <div className={styles.dots}>
                  {story.slides.map((s, i) => (
                    <button
                      key={s.iri}
                      type="button"
                      className={classnames(styles.dot, i === index ? styles.activeDot : '')}
                      title={s.title || `Slide ${i + 1}`}
                      aria-label={`Slide ${i + 1}`}
                      onClick={() => this.goTo(i)}
                    />
                  ))}
                </div>
              </div>
            ) : null}
            <button type="button" className="btn btn-primary" onClick={this.next} disabled={index === total - 1}>
              Next <Icon iconType="rounded" iconName="arrow_forward" symbol />
            </button>
          </div>
        ) : null}
      </div>
    );
  }
}

function clampIndex(index: number, total: number): number {
  if (total === 0 || isNaN(index)) {
    return 0;
  }
  return Math.max(0, Math.min(total - 1, index));
}

function camel(position: string): string {
  return position.replace(/-([a-z])/g, (m, c) => c.toUpperCase());
}

/** Keys typed in form fields, sliders, editable text or the map are not story navigation. */
function isEditingTarget(target: HTMLElement): boolean {
  return Boolean(
    target.closest('input, textarea, select, [contenteditable="true"], [contenteditable=""], .ol-viewport, .cesium-widget, .modal')
  );
}

export default StoryPlayer;
