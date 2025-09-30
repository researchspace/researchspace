import * as React from 'react';
import { Component, ComponentProps, ComponentContext } from 'platform/api/components';
import { createElement } from 'react';
import { TemplateItem } from 'platform/components/ui/template';

interface InfiniteScrollProps extends ComponentProps {
  itemHeight: string;
  values: Array<Object>;
  batchSize?: number;
  preloadThreshold?: number; // Percentage of the container height to trigger preloading
  template?: string;
}

interface InfiniteScrollState {
  visibleValues: Object[];
  hasMore: boolean;
}

class InfiniteScroll extends Component<InfiniteScrollProps, InfiniteScrollState> {
  private containerRef: React.RefObject<HTMLDivElement>;
  private contentRef: React.RefObject<HTMLDivElement>;
  
  static defaultProps = {
    batchSize: 20,
    preloadThreshold: 50 // Start preloading when 50% of the current batch is visible
  };

  constructor(props: InfiniteScrollProps, context: ComponentContext) {
    super(props, context);
    this.containerRef = React.createRef();
    this.contentRef = React.createRef();
    this.state = {
      visibleValues: [],
      hasMore: true,
    };
  }

  componentDidMount() {
    this.initializeValues();
    this.attachScrollListener();
  }

  componentDidUpdate(prevProps: InfiniteScrollProps) {
    if (prevProps.values !== this.props.values) {
      this.initializeValues();
    }
  }  

  componentWillUnmount() {
    this.detachScrollListener();
  }

  attachScrollListener() {
    const scrollParent = this.getScrollParent();
    if (scrollParent) {
      scrollParent.addEventListener('scroll', this.handleScroll);
    }
  }

  detachScrollListener() {
    const scrollParent = this.getScrollParent();
    if (scrollParent) {
      scrollParent.removeEventListener('scroll', this.handleScroll);
    }
  }

  getScrollParent(): HTMLElement | null {
    if (!this.containerRef.current) return null;
    let parent = this.containerRef.current.parentElement;
    while (parent) {
      const overflowY = window.getComputedStyle(parent).overflowY;
      if (overflowY === 'auto' || overflowY === 'scroll') {
        return parent;
      }
      parent = parent.parentElement;
    }
    return document.documentElement;
  }

  initializeValues() {
    const allValues = this.props.values;
    this.setState({
      visibleValues: allValues.slice(0, this.props.batchSize),
      hasMore: allValues.length > this.props.batchSize!,
    });
  }


  handleScroll = () => {
    const scrollParent = this.getScrollParent();
    if (scrollParent && this.contentRef.current) {
      const { top, height } = this.contentRef.current.getBoundingClientRect();
      const parentHeight = scrollParent.clientHeight;
      const scrolledPercentage = (parentHeight - top) / height * 100;

      if (scrolledPercentage >= this.props.preloadThreshold! && this.state.hasMore) {
        this.loadMoreItems();
      }
    }
  }

  loadMoreItems = () => {
    const { visibleValues } = this.state;
    const allValues = this.props.values;
    const nextBatch = allValues.slice(
      visibleValues.length,
      visibleValues.length + this.props.batchSize!
    );
  
    this.setState(prevState => {
      const newVisibleValues = [...prevState.visibleValues, ...nextBatch];
      return {
        visibleValues: newVisibleValues,
        hasMore: newVisibleValues.length < allValues.length,
      };
    });
  };  

  render() {
    const { itemHeight } = this.props;
    const { visibleValues, hasMore } = this.state;
    const totalHeight = parseFloat(itemHeight) * this.props.values.length;

    return (
      <div ref={this.containerRef} style={{ height: `${totalHeight}px`, position: 'relative' }}>
        <div ref={this.contentRef} style={{ position: 'absolute', top: 0, left: 0, right: 0 }}>
          {visibleValues.map((item, index) => (
            React.createElement(TemplateItem, {
              key: index,
              template: {
                source: this.getTemplateString(),
                options: item,
              },
            })
          ))}
          {hasMore && (
            <div style={{ textAlign: 'center', padding: '20px' }}>
              Loading more items...
            </div>
          )}
        </div>
      </div>
    );
  }

  private getTemplateString = (): string => {
    const template = this.props.template;
    if (template) {
      return template;
    }

    // Try to get default "<template>" element with id 'template' from the local scope
    const localScope = this.props.markupTemplateScope;
    const partial = localScope ? localScope.getPartial('template') : undefined;
    if (partial) {
      return partial.source;
    }
    return '';
  };
}

export default InfiniteScroll;
