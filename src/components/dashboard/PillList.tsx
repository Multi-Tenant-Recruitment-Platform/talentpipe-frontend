import { Tag } from 'antd';
import type { HTMLAttributes } from 'react';

/** A wrapping row of read-only pill tags, as a real list. */
export function PillList({
  items,
  className = '',
  ...rest
}: Readonly<{ items: string[]; className?: string } & HTMLAttributes<HTMLUListElement>>) {
  return (
    <ul className={`m-0 flex list-none flex-wrap gap-2 p-0 ${className}`} {...rest}>
      {items.map((item) => (
        <li key={item}>
          <Tag className="me-0 rounded-pill">{item}</Tag>
        </li>
      ))}
    </ul>
  );
}
