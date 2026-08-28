/**
 * ResearchSpace
 * Copyright (C) 2026, Kartography Community Interest Company
 *
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import * as React from 'react';
import * as Reactodia from '@reactodia/workspace';
import { resourceConfigs } from 'platform/api/services/resource-config';

const CLASS_NAME = 'reactodia-standard-element';
const DEFAULT_PAGE_SIZE = 10;
const PAGE_SIZES: ReadonlyArray<number> = [5, 10, 15, 20, 30];
const P2_HAS_TYPE = 'http://www.cidoc-crm.org/cidoc-crm/P2_has_type';

export const entityGroupTemplate: Reactodia.ElementTemplate = {
  supports: Reactodia.StandardTemplate.supports,
  renderElement: (props) => <EntityGroupTemplate {...props} />,
};

function EntityGroupTemplate(props: Reactodia.TemplateProps) {
  const { element, elementState } = props;
  if (!(element instanceof Reactodia.EntityGroup)) return null;

  let pageSize = elementState.get(Reactodia.TemplateProperties.GroupPageSize) ?? DEFAULT_PAGE_SIZE;
  pageSize = Number.isFinite(pageSize) ? pageSize : DEFAULT_PAGE_SIZE;

  const pageCount = Math.max(Math.ceil(element.items.length / pageSize), 1);
  let pageIndex = elementState.get(Reactodia.TemplateProperties.GroupPageIndex) ?? 0;
  pageIndex = Number.isFinite(pageIndex) ? pageIndex : 0;
  pageIndex = Math.min(Math.max(pageIndex, 0), pageCount - 1);

  const pageOffset = pageIndex * pageSize;
  const pageItems = element.items.slice(pageOffset, pageOffset + pageSize);
  const fillerCount = pageCount === 1 ? 0 : pageOffset + pageSize - element.items.length;

  return (
    <div className={`${CLASS_NAME} ${CLASS_NAME}--group`} role='list'>
      {pageItems.map(item => (
        <EntityGroupItem key={item.data.id} data={item.data} group={element} />
      ))}
      {Array.from({ length: fillerCount }, (_, index) => (
        <div key={index} className={`${CLASS_NAME}__item-filler`} aria-hidden={true}>&nbsp;</div>
      ))}
      <Reactodia.GroupPaginator
        pageIndex={pageIndex}
        pageCount={pageCount}
        onChangePage={page => element.setElementState(
          element.elementState.set(Reactodia.TemplateProperties.GroupPageIndex, page)
        )}
        pageSize={pageSize}
        pageSizes={PAGE_SIZES}
        onChangePageSize={size => element.setElementState(
          element.elementState.set(Reactodia.TemplateProperties.GroupPageSize, size)
        )}
      />
    </div>
  );
}

function EntityGroupItem(props: {
  data: Reactodia.ElementModel;
  group: Reactodia.EntityGroup;
}) {
  const { data, group } = props;
  const { canvas } = Reactodia.useCanvas();
  const workspace = Reactodia.useWorkspace();
  const { model } = workspace;
  const t = Reactodia.useTranslation();

  Reactodia.useKeyedSyncStore(Reactodia.subscribeElementTypes, data.types, model);

  const label = model.locale.formatEntityLabel(data, model.language);
  const typesLabel = findResourceTypeLabel(data) ?? (data.types.length === 0
    ? t.text('standard_element.default_type')
    : model.locale.formatEntityTypeList(data, model.language));
  const anchorProps = model.locale.prepareAnchor(data.id);

  return (
    <div className={`${CLASS_NAME}__item`} role='listitem'>
      <div className={`${CLASS_NAME}__item-body`}>
        <Reactodia.WithFetchStatus type='element' target={data.id}>
          <div className={`${CLASS_NAME}__item-labels`}>
            <div className={`${CLASS_NAME}__type-label resource-card__footer-type color-secondary-light text-font-size__xsmall`}
              title={typesLabel}>
              {typesLabel}
            </div>
            <div className={`${CLASS_NAME}__label resource-card__footer-title`} title={label}>
              <a {...anchorProps} className='text-link' draggable={false}>{label}</a>
            </div>
          </div>
        </Reactodia.WithFetchStatus>
        <button type='button'
          className={`${CLASS_NAME}__ungroup-one-button reactodia-btn reactodia-btn-default`}
          data-reactodia-no-export='true'
          title={t.text('standard_element.ungroup.title')}
          onClick={() => void Reactodia.ungroupSomeEntities(workspace, {
            group,
            entities: new Set([data.id]),
            canvas,
          })}
        />
      </div>
    </div>
  );
}

function findResourceTypeLabel(data: Reactodia.ElementModel): string | undefined {
  const configs = Object.values(resourceConfigs ?? {}).filter(
    config => config.resourceOntologyClass && data.types.includes(config.resourceOntologyClass)
  );
  const resourceTypes = new Set(
    (data.properties[P2_HAS_TYPE] ?? [])
      .filter(value => value.termType === 'NamedNode')
      .map(value => value.value)
  );
  return configs.find(config => config.p2HasType && resourceTypes.has(config.p2HasType))?.resourceLabel
    ?? configs.find(config => !config.p2HasType)?.resourceLabel;
}
