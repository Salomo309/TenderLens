import React from 'react';

interface Column<T> {
  key: string;
  header: string;
  render: (item: T) => React.ReactNode;
  className?: string;
}

interface TableProps<T> {
  columns: Column<T>[];
  data: T[];
  emptyMessage?: string;
}

export function Table<T extends { id: string }>({ columns, data, emptyMessage = 'Tidak ada data.' }: TableProps<T>) {
  if (data.length === 0) {
    return <div className="p-8 text-center text-xs text-muted-foreground">{emptyMessage}</div>;
  }

  return (
    <table className="w-full text-left">
      <thead>
        <tr className="border-b border-border text-xs text-muted-foreground uppercase font-semibold">
          {columns.map((col) => (
            <th key={col.key} className={`p-4 ${col.className || ''}`}>{col.header}</th>
          ))}
        </tr>
      </thead>
      <tbody className="divide-y divide-neutral-800/60 text-xs text-foreground">
        {data.map((item) => (
          <tr key={item.id} className="hover:bg-maroon-darker/30">
            {columns.map((col) => (
              <td key={col.key} className={`p-4 ${col.className || ''}`}>{col.render(item)}</td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
