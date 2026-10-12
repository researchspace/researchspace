/**
 * Copyright (c) 2026 ResearchSpace contributors.
 *
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import * as React from 'react';
import Quill from 'quill';
import 'quill/dist/quill.snow.css';

import { addNotification } from 'platform/components/ui/notification';

import { sanitizeStoryHtml } from './StoryHtml';
import * as styles from './Story.scss';

export interface RichTextEditorProps {
  /** HTML content. */
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
}

/** Longest side of an uploaded image; larger images are scaled down before they are embedded. */
const MAX_IMAGE_SIZE = 1600;
/** Images larger than this (as data URI) are refused: they would be stored in the graph. */
const MAX_IMAGE_BYTES = 1.5 * 1024 * 1024;

const IMAGE_URL_ICON =
  '<svg viewBox="0 0 18 18"><rect class="ql-stroke" height="10" width="12" x="3" y="4"></rect>' +
  '<circle class="ql-fill" cx="6" cy="7" r="1"></circle>' +
  '<polyline class="ql-even ql-fill" points="5 12 5 11 7 9 8 10 11 7 13 9 13 12 5 12"></polyline>' +
  '<line class="ql-stroke" x1="9" x2="16" y1="16" y2="16"></line></svg>';

let iconsInstalled = false;

function installIcons() {
  if (!iconsInstalled) {
    iconsInstalled = true;
    const icons = Quill.import('ui/icons') as { [name: string]: string };
    icons['imageUrl'] = IMAGE_URL_ICON;
  }
}

/**
 * WYSIWYG editor for the text of a slide (Quill): headings, bold, italic, underline, lists,
 * quotes, alignment, links and images. Images are uploaded from a file (scaled down and
 * embedded in the text) or inserted by URL. The HTML it produces is sanitized.
 */
export class RichTextEditor extends React.Component<RichTextEditorProps> {
  private container = React.createRef<HTMLDivElement>();
  private quill: Quill | undefined;
  /** Last HTML sent with onChange, to tell external changes of `value` from our own. */
  private lastHtml: string | undefined;

  componentDidMount() {
    installIcons();
    this.quill = new Quill(this.container.current, {
      theme: 'snow',
      placeholder: this.props.placeholder || 'Text of the slide…',
      modules: {
        toolbar: {
          container: [
            [{ header: [2, 3, false] }],
            ['bold', 'italic', 'underline', 'strike'],
            [{ list: 'ordered' }, { list: 'bullet' }, 'blockquote'],
            [{ align: [] }],
            ['link', 'image', 'imageUrl'],
            ['clean'],
          ],
          handlers: {
            image: () => this.uploadImage(),
            imageUrl: () => this.insertImageByUrl(),
          },
        },
      },
    });
    const imageUrlButton = this.container.current.parentElement.querySelector('.ql-imageUrl');
    if (imageUrlButton) {
      imageUrlButton.setAttribute('title', 'Image from a URL');
    }
    const imageButton = this.container.current.parentElement.querySelector('.ql-image');
    if (imageButton) {
      imageButton.setAttribute('title', 'Upload an image');
    }
    this.setContent(this.props.value);
    this.quill.on('text-change', this.emitChange);
  }

  componentDidUpdate() {
    if (this.props.value !== this.lastHtml) {
      this.setContent(this.props.value);
    }
  }

  componentWillUnmount() {
    if (this.quill) {
      this.quill.off('text-change', this.emitChange);
    }
  }

  shouldComponentUpdate(nextProps: RichTextEditorProps) {
    // Quill owns the content; re-render only for external changes
    return nextProps.value !== this.lastHtml;
  }

  private setContent(html: string) {
    this.lastHtml = html;
    const delta = this.quill.clipboard.convert({ html: sanitizeStoryHtml(html || '') });
    this.quill.setContents(delta, 'silent');
  }

  private emitChange = () => {
    const html = this.quill.getLength() <= 1 ? '' : sanitizeStoryHtml(getHtml(this.quill));
    if (html !== this.lastHtml) {
      this.lastHtml = html;
      this.props.onChange(html);
    }
  };

  private insertImage(src: string) {
    const range = this.quill.getSelection(true);
    this.quill.insertEmbed(range.index, 'image', src, 'user');
    this.quill.setSelection(range.index + 1, 0, 'silent');
  }

  private insertImageByUrl() {
    const url = window.prompt('Image URL (https://… or /…)');
    if (url && url.trim()) {
      this.insertImage(url.trim());
    }
  }

  private uploadImage() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/png, image/jpeg, image/gif, image/webp';
    input.onchange = () => {
      const file = input.files && input.files[0];
      if (!file) {
        return;
      }
      readImage(file).then(
        (dataUri) => {
          if (dataUri.length > MAX_IMAGE_BYTES) {
            addNotification({
              level: 'warning',
              message: 'The image is too large to be embedded, use a smaller one or insert it by URL.',
              autoDismiss: 8,
            });
          } else {
            this.insertImage(dataUri);
          }
        },
        () => addNotification({ level: 'error', message: 'The image could not be read.', autoDismiss: 6 })
      );
    };
    input.click();
  }

  render() {
    return (
      <div className={styles.richText}>
        <div ref={this.container} />
      </div>
    );
  }
}

/**
 * HTML of the editor content. Quill 2.0 writes every space as `&nbsp;`, which prevents line
 * wrapping; they are turned back into spaces.
 */
function getHtml(quill: Quill): string {
  return quill.getSemanticHTML().replace(/&nbsp;/g, ' ');
}

/**
 * Reads an image file as a data URI, scaled down so that its longest side is at most
 * MAX_IMAGE_SIZE. Animated GIFs and small images are kept as they are.
 */
function readImage(file: File): Promise<string> {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error);
    reader.onload = () => {
      const original = reader.result as string;
      if (file.type === 'image/gif') {
        resolve(original);
        return;
      }
      const image = new Image();
      image.onerror = () => reject(new Error('Invalid image'));
      image.onload = () => {
        const scale = Math.min(1, MAX_IMAGE_SIZE / Math.max(image.width, image.height));
        if (scale === 1 && original.length < 300 * 1024) {
          resolve(original);
          return;
        }
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(image.width * scale);
        canvas.height = Math.round(image.height * scale);
        const context = canvas.getContext('2d');
        // white background for transparent images converted to JPEG
        context.fillStyle = '#fff';
        context.fillRect(0, 0, canvas.width, canvas.height);
        context.drawImage(image, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', 0.85));
      };
      image.src = original;
    };
    reader.readAsDataURL(file);
  });
}
