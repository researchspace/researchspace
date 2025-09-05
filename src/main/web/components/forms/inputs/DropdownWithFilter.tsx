import * as React from 'react';

interface Props<T> {
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


export function DropdownWithFilter<T>(props: Props<T>) {
  const { title, items, getLabel, placeholder, noResultsText, onFilterChange, onSelect } = props;
  const [open, setOpen] = React.useState(false);
  const [filter, setFilter] = React.useState('');
  const wrapperRef = React.useRef<HTMLDivElement>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleToggle = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    setOpen(prev => {
      const next = !prev;
      if (next && inputRef.current) {
        setTimeout(() => inputRef.current && inputRef.current.focus(), 0);
      }
      return next;
    });
  };

  const handleFilterChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFilter(e.target.value);
    onFilterChange(e.target.value);
  };

  const handleSelect = (item: T) => {
    setOpen(false);
    setFilter('');
    onSelect(item);
    onFilterChange('');
  };

  const filtered = items.filter(item => !filter || getLabel(item).toLowerCase().includes(filter.toLowerCase()));

  return (
    <div ref={wrapperRef} style={{ display: 'inline-block', position: 'relative', marginLeft: 8 }}>
      <button
        type="button"
        className="btn btn-default dropdown-toggle"
        onClick={handleToggle}
        aria-haspopup="true"
        aria-expanded={open}
        style={{ userSelect: 'none' }}
      >
        {title} <span className="caret" />
      </button>
      {open && (
        <div className="dropdown-menu" style={{ display: 'block', minWidth: 200, padding: 8, position: 'absolute', zIndex: 1051 }}>
          <input
            ref={inputRef}
            type="text"
            placeholder={placeholder || 'Filter...'}
            style={{ width: '100%', marginBottom: 8 }}
            value={filter}
            onChange={handleFilterChange}
            autoComplete="off"
          />
          <ul className="list-unstyled" style={{ maxHeight: 200, overflowY: 'auto', margin: 0, padding: 0 }}>
            {filtered.length > 0 ? (
              filtered.map(item => (
                <li key={getLabel(item)}>
                  <a
                    href="#"
                    style={{ display: 'block', padding: '6px 12px', cursor: 'pointer', whiteSpace: 'normal' }}
                    onClick={e => { e.preventDefault(); handleSelect(item); }}
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
