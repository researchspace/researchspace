/**
 * Copyright (c) 2026 ResearchSpace contributors.
 *
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import * as React from 'react';
import * as classnames from 'classnames';

import { Component, ComponentContext } from 'platform/api/components';
import { trigger } from 'platform/api/events';
import Icon from 'platform/components/ui/icon/Icon';
import { Spinner } from 'platform/components/ui/spinner';
import { addNotification } from 'platform/components/ui/notification';

import { Story, StorySlide, emptySlide, emptyStory, newSlideIri } from './StoryModel';
import { DEFAULT_STORY_REPOSITORY, deleteStory, loadStory, saveStory } from './StoryService';
import { Deleted, Saved } from './StoryEvents';
import { resolveSlideTarget } from './StoryNavigation';
import { RichTextEditor } from './RichTextEditor';
import { StoryHtml } from './StoryHtml';
import * as styles from './Story.scss';

export interface StoryEditorConfig {
  /**
   * Id of the component, used as source of the `Story.Saved` and `Story.Deleted` events.
   */
  id?: string;

  /**
   * IRI of the story to edit. Without it a new story is created.
   */
  story?: string;

  /**
   * Repository where stories are stored.
   *
   * @default "default"
   */
  repository?: string;

  /**
   * Page opened by the "preview" link of the story, with `?story=<iri>` added. Usually the page
   * with the components the story drives, e.g. `/resource/:test`. When empty, the state URL of
   * the first slide is used.
   */
  previewPage?: string;
}

export type StoryEditorProps = StoryEditorConfig;

interface State {
  story?: Story;
  isNew: boolean;
  isLoading: boolean;
  isSaving: boolean;
  error?: string;
}

/**
 * Editor for stories: title, short description and an ordered list of slides, each with a
 * title, a text and the URL of the state it shows. The URL of a state is copied from the
 * address bar of a page with an `<app-state>` (with `auto-sync`) or from its save button.
 *
 * @example
 * <rs-story-editor story='[[urlParam "story"]]' preview-page="/resource/:test"></rs-story-editor>
 */
export class StoryEditor extends Component<StoryEditorProps, State> {
  static defaultProps: Partial<StoryEditorProps> = {
    repository: DEFAULT_STORY_REPOSITORY,
  };

  private loading = this.cancel.derive();
  private saving = this.cancel.derive();

  constructor(props: StoryEditorProps, context: ComponentContext) {
    super(props, context);
    this.state = { isNew: !props.story, isLoading: Boolean(props.story), isSaving: false };
  }

  componentDidMount() {
    if (this.props.story) {
      this.loading.map(loadStory(this.props.story, this.props.repository)).observe({
        value: (story) =>
          story
            ? this.setState({ story, isLoading: false })
            : this.setState({ isLoading: false, error: 'The story does not exist.' }),
        error: () => this.setState({ isLoading: false, error: 'The story could not be loaded.' }),
      });
    } else {
      this.setState({ story: emptyStory() });
    }
  }

  private updateStory(changes: Partial<Story>) {
    this.setState((state) => ({ story: { ...state.story, ...changes } }));
  }

  private updateSlide(index: number, changes: Partial<StorySlide>) {
    this.setState((state) => {
      const slides = [...state.story.slides];
      slides[index] = { ...slides[index], ...changes };
      return { story: { ...state.story, slides } };
    });
  }

  private addSlide = () => {
    this.updateStory({ slides: [...this.state.story.slides, emptySlide(this.state.story.iri)] });
  };

  private duplicateSlide(index: number) {
    const slides = [...this.state.story.slides];
    slides.splice(index + 1, 0, { ...slides[index], iri: newSlideIri(this.state.story.iri) });
    this.updateStory({ slides });
  }

  private removeSlide(index: number) {
    const slides = this.state.story.slides.filter((s, i) => i !== index);
    this.updateStory({ slides });
  }

  private moveSlide(index: number, offset: number) {
    const slides = [...this.state.story.slides];
    const target = index + offset;
    if (target < 0 || target >= slides.length) {
      return;
    }
    [slides[index], slides[target]] = [slides[target], slides[index]];
    this.updateStory({ slides });
  }

  private getProblems(): string[] {
    const { story } = this.state;
    const problems: string[] = [];
    if (!story.title.trim()) {
      problems.push('The story needs a title.');
    }
    if (story.slides.length === 0) {
      problems.push('The story needs at least one slide.');
    }
    story.slides.forEach((slide, i) => {
      if (slide.stateUrl && !resolveSlideTarget(slide.stateUrl)) {
        problems.push(`The state URL of slide ${i + 1} is not valid.`);
      }
    });
    return problems;
  }

  private save = () => {
    const { story, isNew } = this.state;
    this.setState({ isSaving: true });
    this.saving = this.cancel.deriveAndCancel(this.saving);
    const cleaned: Story = {
      ...story,
      title: story.title.trim(),
      description: story.description.trim(),
      slides: story.slides.map((slide) => ({ ...slide, title: slide.title.trim(), stateUrl: slide.stateUrl.trim() })),
    };
    this.saving.map(saveStory(cleaned, isNew, this.props.repository)).observe({
      value: (saved) => {
        if (isNew) {
          this.showStoryInUrl(saved.iri);
        }
        this.setState({ story: saved, isNew: false, isSaving: false });
        addNotification({ level: 'success', message: 'Story saved.', autoDismiss: 4 });
        trigger({ eventType: Saved, source: this.props.id || 'rs-story-editor', data: { story: saved.iri } });
      },
      error: (error) => {
        this.setState({ isSaving: false });
        addNotification({ level: 'error', message: 'The story could not be saved.', autoDismiss: 8 }, error);
      },
    });
  };

  /**
   * After a story is created on a page opened with `?new=...`, the URL points to the story,
   * so that reloading the page edits it instead of creating another one.
   */
  private showStoryInUrl(iri: string) {
    const url = new URL(window.location.href);
    if (url.searchParams.has('new')) {
      url.searchParams.delete('new');
      url.searchParams.set('story', iri);
      window.history.replaceState(window.history.state, '', url.href);
    }
  }

  private delete = () => {
    const { story } = this.state;
    if (!window.confirm(`Delete the story "${story.title}"? This cannot be undone.`)) {
      return;
    }
    this.setState({ isSaving: true });
    this.saving = this.cancel.deriveAndCancel(this.saving);
    this.saving.map(deleteStory(story.iri, this.props.repository)).observe({
      value: () => {
        this.setState({ story: emptyStory(), isNew: true, isSaving: false });
        addNotification({ level: 'success', message: 'Story deleted.', autoDismiss: 4 });
        trigger({ eventType: Deleted, source: this.props.id || 'rs-story-editor', data: { story: story.iri } });
      },
      error: (error) => {
        this.setState({ isSaving: false });
        addNotification({ level: 'error', message: 'The story could not be deleted.', autoDismiss: 8 }, error);
      },
    });
  };

  private getPreviewUrl(): string | undefined {
    const { story, isNew } = this.state;
    if (isNew) {
      return undefined;
    }
    const firstUrl = story.slides.map((slide) => slide.stateUrl).find((url) => Boolean(url));
    const page = this.props.previewPage || firstUrl;
    if (!page) {
      return undefined;
    }
    const url = new URL(page, window.location.href);
    url.searchParams.set('story', story.iri);
    url.searchParams.delete('storySlide');
    return url.href;
  }

  render() {
    const { story, isLoading, isSaving, error, isNew } = this.state;
    if (isLoading) {
      return <Spinner />;
    }
    if (error) {
      return <div className="alert alert-danger">{error}</div>;
    }
    if (!story) {
      return null;
    }
    const problems = this.getProblems();
    const previewUrl = this.getPreviewUrl();
    return (
      <div className={classnames('rs-story-editor', styles.editor)}>
        <div className="form-group">
          <label htmlFor="story-title">Title</label>
          <input
            id="story-title"
            className="form-control"
            value={story.title}
            onChange={(e) => this.updateStory({ title: e.target.value })}
          />
        </div>
        <div className="form-group">
          <label htmlFor="story-description">Short description</label>
          <textarea
            id="story-description"
            className="form-control"
            rows={2}
            value={story.description}
            onChange={(e) => this.updateStory({ description: e.target.value })}
          />
        </div>

        <h4 className={styles.slidesHeading}>Slides</h4>
        {story.slides.map((slide, index) => this.renderSlide(slide, index, story.slides.length))}
        <button type="button" className="btn btn-default" onClick={this.addSlide}>
          <Icon iconType="rounded" iconName="add" symbol /> Add slide
        </button>

        {problems.length > 0 ? (
          <ul className={styles.problems}>
            {problems.map((problem) => (
              <li key={problem}>{problem}</li>
            ))}
          </ul>
        ) : null}

        <div className={styles.editorActions}>
          <button
            type="button"
            className="btn btn-primary"
            onClick={this.save}
            disabled={isSaving || problems.length > 0}
          >
            {isSaving ? 'Saving…' : isNew ? 'Create story' : 'Save story'}
          </button>
          {previewUrl ? (
            <a className="btn btn-default" href={previewUrl} target="_blank" rel="noopener noreferrer">
              <Icon iconType="rounded" iconName="play_arrow" symbol /> Preview
            </a>
          ) : null}
          {!isNew ? (
            <button type="button" className="btn btn-link text-danger" onClick={this.delete} disabled={isSaving}>
              Delete story
            </button>
          ) : null}
          {!isNew ? <small className={styles.storyIri}>{story.iri}</small> : null}
        </div>
      </div>
    );
  }

  private renderSlide(slide: StorySlide, index: number, total: number) {
    const target = slide.stateUrl ? resolveSlideTarget(slide.stateUrl) : undefined;
    const stateSummary = target
      ? target.states
        ? `State of ${Object.keys(target.states).length} component(s)`
        : target.stateId
        ? 'Saved state'
        : 'Page without state'
      : '';
    return (
      <div key={slide.iri} className={classnames('panel panel-default', styles.slideCard)}>
        <div className={classnames('panel-heading', styles.slideCardHeading)}>
          <strong>Slide {index + 1}</strong>
          <span>
            <button type="button" className={styles.iconButton} title="Move up" aria-label="Move up"
              disabled={index === 0} onClick={() => this.moveSlide(index, -1)}>
              <Icon iconType="rounded" iconName="arrow_upward" symbol />
            </button>
            <button type="button" className={styles.iconButton} title="Move down" aria-label="Move down"
              disabled={index === total - 1} onClick={() => this.moveSlide(index, 1)}>
              <Icon iconType="rounded" iconName="arrow_downward" symbol />
            </button>
            <button type="button" className={styles.iconButton} title="Duplicate" aria-label="Duplicate"
              onClick={() => this.duplicateSlide(index)}>
              <Icon iconType="rounded" iconName="content_copy" symbol />
            </button>
            <button type="button" className={styles.iconButton} title="Remove" aria-label="Remove"
              onClick={() => this.removeSlide(index)}>
              <Icon iconType="rounded" iconName="delete" symbol />
            </button>
          </span>
        </div>
        <div className={classnames('panel-body', styles.slideCardBody)}>
          <div className={styles.slideFields}>
            <div className="form-group">
              <label>Title</label>
              <input
                className="form-control"
                value={slide.title}
                onChange={(e) => this.updateSlide(index, { title: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label>Text</label>
              <RichTextEditor value={slide.text} onChange={(text) => this.updateSlide(index, { text })} />
              <small className="help-block">
                Images can be uploaded (they are scaled down and stored with the story) or inserted by URL.
                A link to <code>#2</code> opens slide 2.
              </small>
            </div>
            <div className="form-group">
              <label>State URL</label>
              <div className="input-group">
                <input
                  className="form-control"
                  value={slide.stateUrl}
                  placeholder="Paste the URL of the page, e.g. /resource/:test?states=..."
                  onChange={(e) => this.updateSlide(index, { stateUrl: e.target.value })}
                />
                <span className="input-group-btn">
                  <a
                    className={classnames('btn btn-default', { disabled: !target })}
                    href={target ? target.url.href : undefined}
                    target="_blank"
                    rel="noopener noreferrer"
                    title="Open the state in a new tab"
                  >
                    <Icon iconType="rounded" iconName="open_in_new" symbol />
                  </a>
                </span>
              </div>
              <small className="help-block">{stateSummary}</small>
            </div>
          </div>
          <div className={styles.slidePreviewColumn}>
            <label>Preview</label>
            <div className={classnames(styles.story, styles.slidePreview)}>
              <div className={styles.header}>
                <div className={styles.storyTitle}>{this.state.story.title}</div>
              </div>
              <div className={styles.body}>
                {slide.title ? <h3 className={styles.slideTitle}>{slide.title}</h3> : null}
                <StoryHtml className={styles.slideText} html={slide.text} />
              </div>
              <div className={styles.footer}>
                <span className={styles.progressLabel}>
                  {index + 1} / {total}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }
}

export default StoryEditor;
