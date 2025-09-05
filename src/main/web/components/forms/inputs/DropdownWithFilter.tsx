import * as React from 'react';

interface CustomDropdownProps<T> {
  id: string;
  title: React.ReactNode;
  items: T[];
  filterValue: string;
  onFilterChange: (value: string) => void;
  getLabel: (item: T) => string;
  onSelect: (item: T) => void;
  placeholder?: string;
  noResultsText?: string;
}

export class DropdownWithFilter<T> extends React.PureComponent<CustomDropdownProps<T>, { open: boolean; filter: string }> {
  wrapperRef: React.RefObject<HTMLDivElement>;
  inputRef: React.RefObject<HTMLInputElement>;
  constructor(props: CustomDropdownProps<T>) {
    super(props);
    this.state = { open: false, filter: '' };
    this.wrapperRef = React.createRef();
    this.inputRef = React.createRef();
  }

  componentDidMount() {
    document.addEventListener('mousedown', this.handleClickOutside);
  }
  componentWillUnmount() {
    document.removeEventListener('mousedown', this.handleClickOutside);
  }

  handleClickOutside = (event: MouseEvent) => {
    if (this.wrapperRef.current && !this.wrapperRef.current.contains(event.target as Node)) {
      this.setState({ open: false });
    }
  };

  handleToggle = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    this.setState(
      prev => ({ open: !prev.open }),
      () => {
        if (this.state.open && this.inputRef.current) {
          this.inputRef.current.focus();
        }
      }
    );
  };

  handleFilterChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    this.setState({ filter: e.target.value });
    this.props.onFilterChange(e.target.value);
  };

  handleSelect = (item: T) => {
    this.setState({ open: false, filter: '' });
    this.props.onSelect(item);
    this.props.onFilterChange('');
  };

  render() {
    const { title, items, getLabel, placeholder, noResultsText } = this.props;
    const { open, filter } = this.state;
    const filtered = items.filter(item => !filter || getLabel(item).toLowerCase().includes(filter.toLowerCase()));
    return (
      <div ref={this.wrapperRef} style={{ display: 'inline-block', position: 'relative', marginLeft: 8 }}>
        <button
          type="button"
          className="btn btn-default dropdown-toggle"
          onClick={this.handleToggle}
          aria-haspopup="true"
          aria-expanded={open}
          style={{ userSelect: 'none' }}
        >
          {title} <span className="caret" />
        </button>
        {open && (
          <div className="dropdown-menu" style={{ display: 'block', minWidth: 200, padding: 8, position: 'absolute', zIndex: 1051 }}>
            <input
              ref={this.inputRef}
              type="text"
              placeholder={placeholder || 'Filter...'}
              style={{ width: '100%', marginBottom: 8 }}
              value={filter}
              onChange={this.handleFilterChange}
              autoComplete="off"
            />
            <ul className="list-unstyled" style={{ maxHeight: 200, overflowY: 'auto', margin: 0, padding: 0 }}>
              {filtered.length > 0 ? (
                filtered.map(item => (
                  <li key={getLabel(item)}>
                    <a
                      href="#"
                      style={{ display: 'block', padding: '6px 12px', cursor: 'pointer', whiteSpace: 'normal' }}
                      onClick={e => { e.preventDefault(); this.handleSelect(item); }}
                    >
                      {getLabel(item)}
                    </a>
                  </li>
                ))
              ) : (
                <li><span style={{ color: '#888', padding: '6px 12px', display: 'block' }}>{noResultsText || 'No results'}</span></li>
              )}
            </ul>
          </div>
        )}
      </div>
    );
  }
}
