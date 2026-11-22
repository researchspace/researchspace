import * as React from 'react';
import Icon from 'platform/components/ui/icon/Icon';
import { AssetCardLayout, AssetCardLayoutContext } from './AssetCardLayoutContext';

interface Props {
  /** Initial selected-value presentation. "tile" is a legacy alias for grid. */
  defaultLayout?: AssetCardLayout | 'tile';
  label?: string;
}

/** Changes presentation without replacing field inputs or their pending edits. */
export default class FormAssetView extends React.Component<Props, { layout: AssetCardLayout }> {
  static defaultProps: Props = { defaultLayout: 'row', label: 'Media' };
  state: { layout: AssetCardLayout } = {
    layout: this.props.defaultLayout === 'grid' || this.props.defaultLayout === 'tile' ? 'grid' : 'row',
  };

  render() {
    const { layout } = this.state;
    return (
      // The clipboard grid uses ResourceCard's standard presentation. Omit the
      // layout override here to reuse it, including image crop and hover actions.
      // The section class still selects the multi-column grid around the cards.
      <AssetCardLayoutContext.Provider value={layout === 'row' ? 'row' : undefined}>
        <section className={`form-asset-view form-asset-cards--${layout}`} aria-label={this.props.label}>
          <div className='form-asset-view__layout' role='group' aria-label={`${this.props.label} card layout`}>
            {(['row', 'grid'] as AssetCardLayout[]).map(value => (
              <button key={value} type='button' className='btn btn-icon'
                aria-label={value === 'row' ? 'Row view' : 'Grid view'}
                title={value === 'row' ? 'Row view' : 'Grid view'}
                aria-pressed={layout === value} onClick={() => this.setState({ layout: value })}>
                <Icon iconType='rounded' symbol iconName={value === 'row' ? 'view_list' : 'grid_view'} />
              </button>
            ))}
          </div>
          {this.props.children}
        </section>
      </AssetCardLayoutContext.Provider>
    );
  }
}
