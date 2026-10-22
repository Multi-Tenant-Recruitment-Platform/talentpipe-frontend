import { CopyOutlined, DeleteOutlined, EditOutlined, InboxOutlined, MoreOutlined } from '@ant-design/icons';
import { Dropdown, type MenuProps } from 'antd';
import type { PipelineTemplateStatus } from '../../api/types';
import { Button } from '../ui/Button';
import { templateMoreButtonId } from './templateFieldIds';
import type { TemplateAction } from './useTemplateLifecycle';

/**
 * A template's actions for an admin.
 *
 * <p>Edit is the one in plain sight, and only while the template is active —
 * the backend refuses edits to an archived one. Everything rarer sits behind
 * ⋮: Duplicate (from any status), Archive (active only), and, below a divider
 * and in red, Delete — the one move that can't be taken back.</p>
 */
export function TemplateActions({
  template,
  context,
  busy,
  onAction,
}: Readonly<{
  template: { id: string; name: string; status: PipelineTemplateStatus };
  context: 'list' | 'detail';
  busy: boolean;
  onAction: (action: TemplateAction) => void;
}>) {
  const onList = context === 'list';
  const active = template.status === 'ACTIVE';
  const icon = (Glyph: typeof EditOutlined) => <Glyph aria-hidden className="text-[16px]" />;

  const items: MenuProps['items'] = [
    { key: 'duplicate', label: 'Duplicate', icon: icon(CopyOutlined) },
    ...(active ? [{ key: 'archive', label: 'Archive', icon: icon(InboxOutlined) }] : []),
    { type: 'divider' as const },
    { key: 'delete', label: 'Delete permanently', icon: icon(DeleteOutlined), danger: true },
  ];

  return (
    <div className="flex items-center justify-end gap-2">
      {active && (
        <Button
          size={onList ? 'sm' : 'md'}
          variant={onList ? 'secondary' : 'primary'}
          disabled={busy}
          aria-label={onList ? `Edit ${template.name}` : undefined}
          icon={<EditOutlined aria-hidden className="text-[14px]" />}
          onClick={() => onAction('edit')}
        >
          {onList ? 'Edit' : 'Edit template'}
        </Button>
      )}
      <Dropdown
        trigger={['click']}
        disabled={busy}
        placement="bottomRight"
        menu={{ items, onClick: ({ key }) => onAction(key as TemplateAction) }}
      >
        <Button
          id={templateMoreButtonId(template.id)}
          size={onList ? 'sm' : 'md'}
          variant={onList ? 'ghost' : 'secondary'}
          aria-label={`More actions for ${template.name}`}
          className="px-1.5"
          loading={busy}
        >
          <MoreOutlined aria-hidden className="text-[18px]" />
        </Button>
      </Dropdown>
    </div>
  );
}
