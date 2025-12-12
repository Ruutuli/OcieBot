import { useState, ReactNode } from 'react';
import './DataTable.css';

interface Column<T> {
  key: string;
  label: string;
  render?: (item: T) => ReactNode;
  sortable?: boolean;
}

interface DataTableProps<T> {
  data: T[];
  columns: Column<T>[];
  keyExtractor: (item: T) => string;
  onRowClick?: (item: T) => void;
  emptyMessage?: string;
  searchable?: boolean;
  searchPlaceholder?: string;
}

export default function DataTable<T extends Record<string, any>>({
  data,
  columns,
  keyExtractor,
  onRowClick,
  emptyMessage = 'No data available',
  searchable = false,
  searchPlaceholder = 'Search...'
}: DataTableProps<T>) {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  const handleSort = (columnKey: string) => {
    if (sortColumn === columnKey) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(columnKey);
      setSortDirection('asc');
    }
  };

  const filteredData = searchable && searchTerm
    ? data.filter(item =>
        columns.some(col => {
          const value = item[col.key];
          return value?.toString().toLowerCase().includes(searchTerm.toLowerCase());
        })
      )
    : data;

  const sortedData = sortColumn
    ? [...filteredData].sort((a, b) => {
        const aVal = a[sortColumn];
        const bVal = b[sortColumn];
        const comparison = aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
        return sortDirection === 'asc' ? comparison : -comparison;
      })
    : filteredData;

  return (
    <div className="data-table-container">
      {searchable && (
        <div className="data-table-search">
          <input
            type="text"
            placeholder={searchPlaceholder}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="data-table-search-input"
          />
          <i className="fas fa-search data-table-search-icon"></i>
        </div>
      )}
      {sortedData.length === 0 ? (
        <div className="data-table-empty">
          <p>{emptyMessage}</p>
        </div>
      ) : (
        <>
          {/* Desktop table view */}
          <div className="data-table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  {columns.map((column) => (
                    <th
                      key={column.key}
                      className={column.sortable ? 'data-table-sortable' : ''}
                      onClick={() => column.sortable && handleSort(column.key)}
                    >
                      {column.label}
                      {column.sortable && sortColumn === column.key && (
                        <i className={`fas fa-sort-${sortDirection === 'asc' ? 'up' : 'down'} data-table-sort-icon`}></i>
                      )}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sortedData.map((item) => (
                  <tr
                    key={keyExtractor(item)}
                    onClick={() => onRowClick?.(item)}
                    className={onRowClick ? 'data-table-row-clickable' : ''}
                  >
                    {columns.map((column) => (
                      <td key={column.key}>
                        {column.render ? column.render(item) : item[column.key]}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {/* Mobile card view */}
          <div className="data-table-mobile-cards">
            {sortedData.map((item) => (
              <div
                key={keyExtractor(item)}
                className="data-table-card"
                onClick={() => onRowClick?.(item)}
                style={onRowClick ? { cursor: 'pointer' } : undefined}
              >
                {columns.map((column) => (
                  <div key={column.key} className="data-table-card-row">
                    <div className="data-table-card-label">{column.label}</div>
                    <div className="data-table-card-value">
                      {column.render ? column.render(item) : (item[column.key] ?? '—')}
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

