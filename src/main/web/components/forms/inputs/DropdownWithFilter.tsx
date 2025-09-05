import * as React from 'react';

interface DropdownWithFilterProps<T> {
  id: string;
  title: React.ReactNode;
  items: T[];
  filterValue: string;
  onFilterChange: (value: string) => void;
  onSelect: (item: T) => void;
  getLabel: (item: T) => string;
  placeholder?: string;
  noResultsText?: string;
}

export function DropdownWithFilter<T>({
  id,
  title,
  items,
  filterValue,
  onFilterChange,
  onSelect,
  getLabel,
  placeholder,
  noResultsText
}: DropdownWithFilterProps<T>) {
  const [open, setOpen] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null);

  const filtered = !filterValue
    ? items
    : items.filter(item => getLabel(item).toLowerCase().includes(filterValue.toLowerCase()));

  const handleToggle = () => {
    setOpen(prev => {
      const next = !prev;
      if (next && inputRef.current) {
        setTimeout(() => inputRef.current && inputRef.current.focus(), 0);
      }
      return next;
    });
  };

  const handleSelect = (item: T) => {
    setOpen(false);
    onSelect(item);
    onFilterChange('');
  };

  return (
    <div style={{ display: 'inline-block', position: 'relative', marginLeft: 8 }} id={id}>
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
        <div className="dropdown-menu" style={{ display: 'block', padding: 8, position: 'absolute', zIndex: 1051 }}>
          <input
            ref={inputRef}
            type="text"
            placeholder={placeholder || 'Filter...'}
            style={{ width: '100%', marginBottom: 8 }}
            value={filterValue}
            onChange={e => onFilterChange(e.target.value)}
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
