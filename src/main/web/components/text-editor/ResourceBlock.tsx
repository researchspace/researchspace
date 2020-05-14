/**
 * ResearchSpace
 * Copyright (C) 2020, © Trustees of the British Museum
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */

import * as React from 'react';
import * as _ from 'lodash';
import { RenderNodeProps } from 'slate-react';
import { Well } from 'react-bootstrap';
import * as classNames from 'classnames';

import { Rdf } from 'platform/api/rdf';
import { TemplateItem } from 'platform/components/ui/template';
import { Spinner } from 'platform/components/ui/spinner';

import { ResourceTemplateConfig } from './Config';

import * as styles from './TextEditor.scss';


export interface ResourceBlockProps extends RenderNodeProps {
  resourceTemplates: Array<ResourceTemplateConfig>
}

export class ResourceBlock extends React.Component<ResourceBlockProps> {

  private resizeObserver: MutationObserver;

  private getProps = () => {
    return this.props;
  }

  private getTemplateConfig = (templateId: string) => {
    return _.find(
      this.props.resourceTemplates, t => t.id === templateId
    );
  }

  private onTemplateRendered = (ref: HTMLElement) => {
    const template = this.props.node.data.get('attributes')?.template;
    const config = this.getTemplateConfig(template);

    if (ref && config?.resizable) {
      if (this.resizeObserver) {
        this.resizeObserver.disconnect();
      }

      this.resizeObserver = new MutationObserver(
        (_mutationsList, _observer) => {
          const { node, editor } = this.getProps();
          const attributes = node.data.get('attributes', {});
          const style = attributes.style || {};
          if (style.height !== ref.offsetHeight || style.width !== ref.offsetWidth) {
            attributes.style = attributes.style || {};
            attributes.style.height = ref.offsetHeight;
            attributes.style.width = ref.offsetWidth;
            editor
              .moveToRangeOfNode(node)
              .setBlocks(node);
          }
        }
      );

      this.resizeObserver.observe(
        ref,
        {
          attributes: true,
          attributeFilter: ['style']
        }
      );
    }
  }

  componentWillUnmount() {
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
    }
  }

  render() {
    const { node, editor } = this.props;
    const attributes = node.data.get('attributes', {});
    const config = this.getTemplateConfig(attributes.template);

    // if there is no config then available templates are still loading
    if (config) {
      const style = attributes.style || {};

      // if there is no height/width associated with the node try to get default values
      if (config.defaults) {
        if (!style.height && config.defaults.height) {
          style.height = config.defaults.height;
        }
        if (!style.width && config.defaults.width) {
          style.width = config.defaults.width;
        }
      }

      if (config.resizable) {
        style.resize = 'both',
        style.overflow = 'auto';
      } else {
        style.flex = 1;
      }

      const isSelected = editor.value.selection.isCollapsed && editor.value.endBlock === node;

      return (
        <div {...this.props.attributes}
        className={
          classNames(styles.resourceBlock, {[styles.resourceBlockActive]: isSelected})
        }
        >
          <div
            style={{
              ...style,
              padding: 10,
            }}
            ref={this.onTemplateRendered}
          >
            <TemplateItem
              componentProps={{
                style: {
                  height: '100%',
                  width: '100%',
                }
              }}
              template={{
                source: config.template,
                options: { iri: Rdf.iri(attributes.src) }
              }}
            />
          </div>
        </div>
      );
    } else {
      return <Well><Spinner /></Well>;
    }

  }
}
