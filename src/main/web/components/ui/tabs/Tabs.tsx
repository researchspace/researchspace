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
}

export class RsTabs extends React.Component<Props, { key: any }> {
  constructor(props, context) {
    super(props, context);

    let firstChildrenPropEventKey = null;

    if (Array.isArray(props.children)) {
      firstChildrenPropEventKey = props.children[0]?.props?.eventKey;
    } else {
      firstChildrenPropEventKey = props.children?.props?.eventKey;
    }

    this.state = {
      key: props.defaultActiveKey || firstChildrenPropEventKey,
    };
  }

  componentDidMount() {
    const defaultTabKey = localeStorageTabs.getTabKeyBySource(this.props.id);

    if (defaultTabKey) {
      this.setState({ key: defaultTabKey });
    }
  }

  private onTabSelected = (key: any) => {
    trigger({
      source: this.props.id,
      eventType: TabsEvents.TabSelected,
      data: { key, source: this.props.id },
    });

    this.setState({ key });
  };

  private renderTabTitle = (childProps: RsTabProps): React.ReactNode => {
    const {
      title,
      icon,
      iconType = 'outlined',
      symbol = false,
      iconClassName,
      titleClassName,
    } = childProps;

    if (!icon) {
      return title;
    }

    return (
      <span className={classnames('rs-tab-title', titleClassName)}>
        <Icon
          iconName={icon}
          iconType={iconType}
          symbol={symbol}
          className={classnames('rs-tab-title__icon', iconClassName)}
        />
        <span className="rs-tab-title__label">{title}</span>
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

      if (!childProps.icon) {
        return tabChild;
      }

      return React.cloneElement<RsTabProps>(tabChild, {
        title: this.renderTabTitle(childProps),
      } as Partial<RsTabProps>);
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
