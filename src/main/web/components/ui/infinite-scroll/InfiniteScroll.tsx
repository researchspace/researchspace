import * as React from 'react';
import { Component, ComponentProps, ComponentContext } from 'platform/api/components';
import { createElement } from 'react';
import { TemplateItem } from 'platform/components/ui/template';

interface InfiniteScrollProps extends ComponentProps {
  itemHeight: string;
  values: Array<Object>;
  batchSize?: number;
  preloadThreshold?: number; // Percentage of the last batch of items that should be visible before preloading the next batch
  template?: string;
  itemPerRow?: number | 'auto';
  itemWidth?: number;
}

interface InfiniteScrollState {
  visibleValues: Object[];
  hasMore: boolean;
  calculatedItemsPerRow: number;
  rowHeights: number[];
}

class InfiniteScroll extends Component<InfiniteScrollProps, InfiniteScrollState> {
  private containerRef: React.RefObject<HTMLDivElement>;
  private contentRef: React.RefObject<HTMLDivElement>;
  private resizeObserver: ResizeObserver | null = null;
  private heightUpdateTimeout: number | null = null;
  private pendingHeightUpdates: { [index: number]: number } = {};
  
  static defaultProps = {
    batchSize: 20,
    preloadThreshold: 30, // Start preloading when 30% of the last batch is visible
    itemPerRow: 1,
  };

  constructor(props: InfiniteScrollProps, context: ComponentContext) {
    super(props, context);
    this.containerRef = React.createRef();
    this.contentRef = React.createRef();
    this.state = {
      visibleValues: [],
      hasMore: true,
      calculatedItemsPerRow: this.props.itemPerRow === 'auto' ? 1 : this.props.itemPerRow!,
      rowHeights: [],
    };
  }

  componentDidMount() {
    this.initializeValues();
    this.attachScrollListener();
    this.setupResizeObserver();
  }

  componentDidUpdate(prevProps: InfiniteScrollProps) {
    if (prevProps.values !== this.props.values) {
      this.initializeValues();
    }
    if (this.props.itemPerRow === 'auto' && prevProps.itemWidth !== this.props.itemWidth) {
      this.updateItemsPerRow();
    }
  }

  componentWillUnmount() {
    this.detachScrollListener();
    this.disconnectResizeObserver();
    if (this.heightUpdateTimeout) {
      window.clearTimeout(this.heightUpdateTimeout);
    }
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

  setupResizeObserver() {
    if (this.props.itemPerRow === 'auto' && this.containerRef.current) {
      this.resizeObserver = new ResizeObserver(entries => {
        this.updateItemsPerRow();
      });
      this.resizeObserver.observe(this.containerRef.current);
      this.updateItemsPerRow(); // Initial calculation
    }
  }

  disconnectResizeObserver() {
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
    }
  }

  updateItemsPerRow = () => {
    if (this.props.itemPerRow === 'auto' && this.containerRef.current && this.props.itemWidth) {
      const containerWidth = this.containerRef.current.offsetWidth;
      const newItemsPerRow = Math.max(1, Math.floor(containerWidth / this.props.itemWidth));
      if (newItemsPerRow !== this.state.calculatedItemsPerRow) {
        this.setState({ calculatedItemsPerRow: newItemsPerRow });
      }
    }
  };

  getItemsPerRow = () => {
    return this.props.itemPerRow === 'auto' ? this.state.calculatedItemsPerRow : this.props.itemPerRow!;
  };

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
    const itemsPerRow = this.getItemsPerRow();
    const initialBatchSize = Math.ceil(this.props.batchSize! / itemsPerRow) * itemsPerRow;
    const totalRows = Math.ceil(allValues.length / itemsPerRow);
    const initialRowHeights = Array(totalRows).fill(parseFloat(this.props.itemHeight));

    const scrollParent = this.getScrollParent();
    if (scrollParent && scrollParent.scrollTop > 0) {
      scrollParent.scrollTop = 0;
    }

    this.setState({
      visibleValues: allValues.slice(0, initialBatchSize),
      hasMore: allValues.length > initialBatchSize,
      rowHeights: initialRowHeights,
    });
  }


  handleScroll = () => {
    const scrollParent = this.getScrollParent();
    if (!scrollParent || !this.state.hasMore) {
      return;
    }

    const itemsPerRow = this.getItemsPerRow();
    const numVisibleRows = Math.ceil(this.state.visibleValues.length / itemsPerRow);
    const batchSizeInRows = Math.ceil(this.props.batchSize! / itemsPerRow);

    if (numVisibleRows === 0) {
      return;
    }

    const lastBatchStartRow = Math.max(0, numVisibleRows - batchSizeInRows);

    const offsetTopLastBatch = this.state.rowHeights
      .slice(0, lastBatchStartRow)
      .reduce((sum, height) => sum + height, 0);

    const heightLastBatch = this.state.rowHeights
      .slice(lastBatchStartRow, numVisibleRows)
      .reduce((sum, height) => sum + height, 0);

    if (heightLastBatch === 0) {
      return; // Avoid division by zero if batch has no height
    }

    const scrollBottom = scrollParent.scrollTop + scrollParent.clientHeight;

    // Trigger when scrolled past a certain percentage of the last batch
    const triggerPoint = offsetTopLastBatch + (heightLastBatch * (this.props.preloadThreshold! / 100));

    if (scrollBottom >= triggerPoint) {
      this.loadMoreItems();
    }
  }

  loadMoreItems = () => {
    const { visibleValues } = this.state;
    const allValues = this.props.values;
    const itemsPerRow = this.getItemsPerRow();
    const batchSize = Math.ceil(this.props.batchSize! / itemsPerRow) * itemsPerRow;
    const nextBatch = allValues.slice(
      visibleValues.length,
      visibleValues.length + batchSize
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
    const { visibleValues, hasMore, rowHeights } = this.state;
    const itemsPerRow = this.getItemsPerRow();
    const totalHeight = rowHeights.reduce((sum, height) => sum + height, 0);

    const rows = [];
    for (let i = 0; i < visibleValues.length; i += itemsPerRow) {
      rows.push(visibleValues.slice(i, i + itemsPerRow));
    }

    return (
      <div ref={this.containerRef} style={{ height: `${totalHeight}px`, position: 'relative' }}>
        <div ref={this.contentRef} style={{ position: 'absolute', top: 0, left: 0, right: 0 }}>
          {rows.map((rowItems, index) => (
            <div key={index} ref={el => this.measureRow(el, index)}>
              {React.createElement(TemplateItem, {
                template: {
                  source: this.getTemplateString(),
                  options: rowItems,
                },
              })}
            </div>
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

  private measureRow = (element: HTMLDivElement | null, index: number) => {
    if (!element) {
      return;
    }

    const initialHeight = parseFloat(this.props.itemHeight);
    // Check if the height is the initial, unmeasured one.
    if (this.state.rowHeights[index] === initialHeight) {
      // Use setTimeout to defer measurement until after the current render cycle.
      setTimeout(() => {
        const newHeight = element.clientHeight;
        if (newHeight > 0 && newHeight !== initialHeight) {
          this.pendingHeightUpdates[index] = newHeight;

          if (this.heightUpdateTimeout) {
            window.clearTimeout(this.heightUpdateTimeout);
          }
          this.heightUpdateTimeout = window.setTimeout(this.applyHeightUpdates, 500);
        }
      }, 0);
    }
  };

  private applyHeightUpdates = () => {
    if (Object.keys(this.pendingHeightUpdates).length === 0) {
      return;
    }

    this.setState(prevState => {
      const newRowHeights = [...prevState.rowHeights];
      for (const index in this.pendingHeightUpdates) {
        if (Object.prototype.hasOwnProperty.call(this.pendingHeightUpdates, index)) {
          newRowHeights[parseInt(index, 10)] = this.pendingHeightUpdates[index];
        }
      }
      return { rowHeights: newRowHeights };
    });

    this.pendingHeightUpdates = {};
    this.heightUpdateTimeout = null;
  };

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
