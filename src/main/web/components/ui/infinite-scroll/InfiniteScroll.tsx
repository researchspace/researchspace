import * as React from 'react';

interface InfiniteScrollProps {
  itemHeight: string;
  children: React.ReactNode;
  batchSize?: number;
  preloadThreshold?: number; // Percentage of the container height to trigger preloading
}

interface InfiniteScrollState {
  visibleChildren: React.ReactNode[];
  allChildren: React.ReactNode[];
  hasMore: boolean;
}

class InfiniteScroll extends React.Component<InfiniteScrollProps, InfiniteScrollState> {
  private containerRef: React.RefObject<HTMLDivElement>;
  private contentRef: React.RefObject<HTMLDivElement>;
  
  static defaultProps = {
    batchSize: 20,
    preloadThreshold: 50 // Start preloading when 50% of the current batch is visible
  };

  constructor(props: InfiniteScrollProps) {
    super(props);
    this.containerRef = React.createRef();
    this.contentRef = React.createRef();
    this.state = {
      visibleChildren: [],
      allChildren: [],
      hasMore: true,
    };
  }

  componentDidMount() {
    this.initializeChildren();
    this.attachScrollListener();
  }

  componentDidUpdate(prevProps: InfiniteScrollProps) {
    if (prevProps.children !== this.props.children) {
      this.initializeChildren();
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

  initializeChildren() {
    const allChildren = React.Children.toArray(this.props.children);
    this.setState({
      allChildren,
      visibleChildren: allChildren.slice(0, this.props.batchSize),
      hasMore: allChildren.length > this.props.batchSize!,
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
    const { visibleChildren, allChildren } = this.state;
    const nextBatch = allChildren.slice(
      visibleChildren.length, 
      visibleChildren.length + this.props.batchSize!
    );
    
    this.setState(prevState => ({
      visibleChildren: [...prevState.visibleChildren, ...nextBatch],
      hasMore: visibleChildren.length + nextBatch.length < allChildren.length,
    }));
  }

  render() {
    const { itemHeight } = this.props;
    const { visibleChildren, allChildren, hasMore } = this.state;
    const totalHeight = parseFloat(itemHeight) * allChildren.length;

    return (
      <div ref={this.containerRef} style={{ height: `${totalHeight}px`, position: 'relative' }}>
        <div ref={this.contentRef} style={{ position: 'absolute', top: 0, left: 0, right: 0 }}>
          {visibleChildren}
          {hasMore && (
            <div style={{ textAlign: 'center', padding: '20px' }}>
              Loading more items...
            </div>
          )}
        </div>
      </div>
    );
  }
}

export default InfiniteScroll;
