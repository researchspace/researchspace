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
  const dropdownRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!open) return;
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [open]);

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
    <div
      ref={dropdownRef}
      className={`dropdown${open ? ' open' : ''}`}
      style={{ display: 'inline-block', position: 'relative', marginLeft: 8 }}
      id={id}
    >
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
        <ul className="dropdown-menu pull-right" style={{ minWidth: 180, maxHeight: 240, overflowY: 'auto', padding: 0 }}>
          <li style={{ padding: '8px 12px', position: 'sticky', top: 0, background: '#fff', zIndex: 1 }}>
            <input
              ref={inputRef}
              type="text"
              placeholder={placeholder || 'Filter...'}
              className="form-control"
              style={{ width: '100%', marginBottom: 4 }}
              value={filterValue}
              onChange={e => onFilterChange(e.target.value)}
              autoComplete="off"
            />
          </li>
          {filtered.length > 0 ? (
            filtered.map(item => (
              <li role="menuitem" key={getLabel(item)}>
                <a
                  href="#"
                  tabIndex={-1}
                  style={{ display: 'block', padding: '6px 20px', cursor: 'pointer', whiteSpace: 'normal' }}
                  onClick={e => { e.preventDefault(); handleSelect(item); }}
                >
                  {getLabel(item)}
                </a>
              </li>
            ))
          ) : (
            <li><span style={{ color: '#888', padding: '6px 20px', display: 'block' }}>{noResultsText || 'No results'}</span></li>
          )}
        </ul>
      )}
    </div>
  );
}
