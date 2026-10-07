/**
 * Copyright (c) 2026 ResearchSpace contributors.
 *
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import * as React from 'react';
import * as classnames from 'classnames';
import * as _ from 'lodash';

import Icon from 'platform/components/ui/icon/Icon';

import { sanitizeStoryHtml } from './StoryHtml';
import * as styles from './Story.scss';

export interface RichTextEditorProps {
  /** HTML content. */
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
}

interface ToolbarAction {
  icon: string;
  title: string;
  run: () => void;
}

/**
 * Small WYSIWYG editor for the text of a slide: paragraphs, two heading levels, bold, italic,
 * underline, lists and links. The HTML it produces is sanitized on every change.
 */
export class RichTextEditor extends React.Component<RichTextEditorProps> {
  private editable = React.createRef<HTMLDivElement>();
  /** Last HTML sent with onChange, to tell external changes of `value` from our own. */
  private lastHtml: string | undefined;

  componentDidMount() {
    this.setContent(this.props.value);
  }

  componentDidUpdate() {
    if (this.props.value !== this.lastHtml) {
      this.setContent(this.props.value);
    }
  }

  shouldComponentUpdate(nextProps: RichTextEditorProps) {
    // the content is managed by the browser; re-render only for external changes
    return nextProps.value !== this.lastHtml || nextProps.placeholder !== this.props.placeholder;
  }

  private setContent(html: string) {
    const clean = sanitizeStoryHtml(html);
    this.lastHtml = html;
    if (this.editable.current && this.editable.current.innerHTML !== clean) {
      this.editable.current.innerHTML = clean;
    }
  }

  private emitChange = () => {
    const html = sanitizeStoryHtml(this.editable.current.innerHTML);
    if (html !== this.lastHtml) {
      this.lastHtml = html;
      this.props.onChange(html);
    }
  };

  private exec(command: string, argument?: string) {
    this.editable.current.focus();
    document.execCommand(command, false, argument);
    this.emitChange();
  }

  private onPaste = (event: React.ClipboardEvent<HTMLDivElement>) => {
    // paste plain text: formatting copied from other pages is rarely wanted
    event.preventDefault();
    const text = event.clipboardData.getData('text/plain');
    document.execCommand('insertText', false, text);
  };

  private addLink = () => {
    const url = window.prompt('Link URL (https://..., /resource/..., or a slide number like #2)');
    if (!url) {
      return;
    }
    const slide = /^#(\d+)$/.exec(url.trim());
    if (slide) {
      // links to slides are marked with data-story-goto, which the player handles
      const text = _.escape(String(window.getSelection()) || `slide ${slide[1]}`);
      this.exec('insertHTML', `<a href="#" data-story-goto="${slide[1]}">${text}</a>`);
    } else {
      this.exec('createLink', url.trim());
    }
  };

  render() {
    const actions: ToolbarAction[] = [
      { icon: 'format_bold', title: 'Bold', run: () => this.exec('bold') },
      { icon: 'format_italic', title: 'Italic', run: () => this.exec('italic') },
      { icon: 'format_underlined', title: 'Underline', run: () => this.exec('underline') },
      { icon: 'title', title: 'Heading', run: () => this.exec('formatBlock', '<h3>') },
      { icon: 'notes', title: 'Paragraph', run: () => this.exec('formatBlock', '<p>') },
      { icon: 'format_list_bulleted', title: 'Bulleted list', run: () => this.exec('insertUnorderedList') },
      { icon: 'format_list_numbered', title: 'Numbered list', run: () => this.exec('insertOrderedList') },
      { icon: 'link', title: 'Link', run: this.addLink },
      { icon: 'link_off', title: 'Remove link', run: () => this.exec('unlink') },
      { icon: 'format_clear', title: 'Clear formatting', run: () => this.exec('removeFormat') },
    ];
    return (
      <div className={styles.richText}>
        <div className={styles.richTextToolbar} role="toolbar">
          {actions.map((action) => (
            <button
              key={action.icon}
              type="button"
              className="btn btn-default btn-xs"
              title={action.title}
              aria-label={action.title}
              // keep the selection in the editable area
              onMouseDown={(e) => e.preventDefault()}
              onClick={action.run}
            >
              <Icon iconType="rounded" iconName={action.icon} symbol />
            </button>
          ))}
        </div>
        <div
          ref={this.editable}
          className={classnames(styles.richTextArea, 'form-control')}
          contentEditable
          suppressContentEditableWarning
          data-placeholder={this.props.placeholder || ''}
          onInput={this.emitChange}
          onBlur={this.emitChange}
          onPaste={this.onPaste}
        />
      </div>
    );
  }
}
