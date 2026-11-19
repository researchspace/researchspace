import { trigger } from 'platform/api/events/EventsStore';
import * as React from 'react';
import { Tabs } from 'react-bootstrap';
import * as classnames from 'classnames';

import Icon from '../icon/Icon'; // adjust this path if Icon lives elsewhere
import { RsTabProps } from './Tab';
import * as TabsEvents from './TabEvents';
import { localeStorageTabs } from './LocalStorageTab';

interface Props {
  id: string;
  defaultActiveKey?: string | number;
  className?: string;
  /**
   * Mount a tab's content the first time it is activated instead of mounting
   * every pane up front; once mounted a pane stays mounted, so switching back
   * does not reload it. Use for panes that load data (searches, tables, maps).
   */
  mountOnEnter?: boolean;
}

interface State {
  key: any;
  /** keys whose panes have been activated at least once (mountOnEnter) */
  mounted: { [key: string]: true };
}

export class RsTabs extends React.Component<Props, State> {
  constructor(props, context) {
    super(props, context);

    let firstChildrenPropEventKey = null;

    if (Array.isArray(props.children)) {
      firstChildrenPropEventKey = props.children[0]?.props?.eventKey;
    } else {
      firstChildrenPropEventKey = props.children?.props?.eventKey;
    }

    const key = props.defaultActiveKey || firstChildrenPropEventKey;
    this.state = { key, mounted: key === undefined || key === null ? {} : { [String(key)]: true } };
  }

  componentDidMount() {
    const defaultTabKey = localeStorageTabs.getTabKeyBySource(this.props.id);

    if (defaultTabKey) {
      this.setState(state => ({ key: defaultTabKey, mounted: { ...state.mounted, [String(defaultTabKey)]: true } }));
    }
  }

  private onTabSelected = (key: any) => {
    trigger({
      source: this.props.id,
      eventType: TabsEvents.TabSelected,
      data: { key, source: this.props.id },
    });

    this.setState(state => ({ key, mounted: { ...state.mounted, [String(key)]: true } }));
  };

  private renderTabTitle = (childProps: RsTabProps): React.ReactNode => {
    const {
      title,
      icon,
      iconType = 'outlined',
      symbol = false,
      iconClassName,
      titleClassName,
      badge,
      muted,
    } = childProps;

    const hasBadge = badge !== undefined && badge !== null && badge !== '';
    if (!icon && !hasBadge && !muted) {
      return title;
    }

    return (
      <span className={classnames('rs-tab-title', titleClassName, { 'rs-tab-title--muted': muted })}>
        {icon ? (
          <Icon
            iconName={icon}
            iconType={iconType}
            symbol={symbol}
            className={classnames('rs-tab-title__icon', iconClassName)}
          />
        ) : null}
        <span className="rs-tab-title__label">{title}</span>
        {hasBadge ? <span className="rs-tab-title__badge">{badge}</span> : null}
      </span>
    );
  };

  private renderChildrenWithTitles = () => {
    return React.Children.map(this.props.children, child => {
      if (!React.isValidElement(child)) {
        return child;
      }

      const tabChild = child as React.ReactElement<RsTabProps>;
      const childProps = tabChild.props;

      // With mountOnEnter a pane's content is rendered only once its tab has
      // been activated; afterwards it stays rendered (no reload on switching
      // back). Implemented here rather than through react-bootstrap's own
      // mountOnEnter, which depends on the fade transition's exit handoff.
      const lazyUnmounted = this.props.mountOnEnter && !this.state.mounted[String(childProps.eventKey)];

      const hasBadge = childProps.badge !== undefined && childProps.badge !== null && childProps.badge !== '';
      if (!childProps.icon && !hasBadge && !childProps.muted && !lazyUnmounted) {
        return tabChild;
      }

      const overrides: Partial<RsTabProps> = {};
      if (childProps.icon || hasBadge || childProps.muted) {
        overrides.title = this.renderTabTitle(childProps);
      }
      return lazyUnmounted
        ? React.cloneElement<RsTabProps>(tabChild, overrides as Partial<RsTabProps>, null)
        : React.cloneElement<RsTabProps>(tabChild, overrides as Partial<RsTabProps>);
    });
  };

  render() {
    const { id, defaultActiveKey, className } = this.props;

    return (
      <Tabs
        className={className}
        activeKey={this.state.key}
        defaultActiveKey={defaultActiveKey}
        id={id}
        onSelect={this.onTabSelected}
      >
        {this.renderChildrenWithTitles()}
      </Tabs>
    );
  }
}

export default RsTabs;
