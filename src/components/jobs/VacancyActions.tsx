import { Dropdown, type MenuProps } from 'antd';
import type { JobVacancyResponse } from '../../api/types';
import {
  DESTRUCTIVE_ACTIONS,
  vacancyActions,
  type VacancyAction,
} from '../../dashboard/jobVacancy';
import { Icon, type IconName } from '../dashboard/Icon';
import { Button, type ButtonVariant } from '../ui/Button';
import { moreButtonId } from './vacancyFieldIds';

const LABEL: Record<VacancyAction, string> = {
  view: 'View',
  edit: 'Edit',
  publish: 'Publish',
  duplicate: 'Duplicate',
  close: 'Close vacancy',
  archive: 'Archive',
};

const ICON: Record<VacancyAction, IconName> = {
  view: 'eye',
  edit: 'pencil',
  publish: 'globe',
  duplicate: 'document-duplicate',
  close: 'no-symbol',
  archive: 'archive-box',
};

/**
 * A vacancy's actions: the frequent ones as buttons, the rest behind ⋮.
 *
 * <p>Which actions exist comes from {@link vacancyActions} and nowhere else,
 * so a status can never show a button its state machine does not allow. The
 * destructive moves (close, archive) are only ever in the menu, below a
 * divider and in red: they are rare, they end something, and keeping them a
 * click further away is the point.</p>
 *
 * <p>On a list row the inline buttons give way as the screen narrows — the
 * second one below the large breakpoint, both below the medium — and the menu
 * gains them at the same widths, so every action is always reachable exactly
 * once. CSS does the switch rather than `matchMedia`, which the test
 * environment stubs to "never matches".</p>
 */
export function VacancyActions({
  vacancy,
  context,
  busy,
  onAction,
}: Readonly<{
  vacancy: JobVacancyResponse;
  context: 'list' | 'detail';
  /** An action on this vacancy is in flight. */
  busy: boolean;
  onAction: (action: VacancyAction) => void;
}>) {
  const set = vacancyActions(vacancy.status, context);
  const name = vacancy.title || 'Untitled vacancy';
  const onList = context === 'list';
  const hasPublish = set.primary.includes('publish');

  function variantFor(action: VacancyAction, index: number): ButtonVariant {
    if (action === 'publish') {
      return 'primary';
    }
    if (onList) {
      return action === 'view' ? 'ghost' : 'secondary';
    }
    // On the detail page the last button is the next step, unless Publish is
    // already claiming that weight.
    return !hasPublish && index === set.primary.length - 1 ? 'primary' : 'secondary';
  }

  const responsive = (index: number, kind: 'inline' | 'menu') => {
    if (!onList) {
      return undefined;
    }
    if (kind === 'inline') {
      return index === 0 ? 'tp-inline-from-md' : 'tp-inline-from-lg';
    }
    return index === 0 ? 'tp-menu-until-md' : 'tp-menu-until-lg';
  };

  const item = (action: VacancyAction, className?: string) => ({
    key: action,
    label: action === 'edit' && vacancy.status === 'PUBLISHED' && !onList ? 'Edit vacancy' : LABEL[action],
    icon: <Icon name={ICON[action]} size={16} />,
    danger: DESTRUCTIVE_ACTIONS.has(action),
    className,
  });

  const safe = set.overflow.filter((action) => !DESTRUCTIVE_ACTIONS.has(action));
  const destructive = set.overflow.filter((action) => DESTRUCTIVE_ACTIONS.has(action));

  const items: MenuProps['items'] = [
    ...(onList ? set.primary.map((action, i) => item(action, responsive(i, 'menu'))) : []),
    ...safe.map((action) => item(action)),
    ...(destructive.length > 0 && (safe.length > 0 || onList)
      ? [{ type: 'divider' as const }]
      : []),
    ...destructive.map((action) => item(action)),
  ];

  return (
    <div className="tp-vacancy-actions-group">
      {set.primary.map((action, i) => (
        <Button
          key={action}
          size={onList ? 'sm' : 'md'}
          variant={variantFor(action, i)}
          className={responsive(i, 'inline')}
          disabled={busy}
          aria-label={onList ? `${LABEL[action]} ${name}` : undefined}
          onClick={() => onAction(action)}
        >
          {!onList && <Icon name={ICON[action]} size={16} />}
          {item(action).label}
        </Button>
      ))}

      {set.overflow.length > 0 && (
        <Dropdown
          trigger={['click']}
          disabled={busy}
          placement="bottomRight"
          menu={{ items, onClick: ({ key }) => onAction(key as VacancyAction) }}
        >
          <Button
            id={moreButtonId(vacancy.id)}
            size={onList ? 'sm' : 'md'}
            variant={onList ? 'ghost' : 'secondary'}
            aria-label={`More actions for ${name}`}
            className="tp-vacancy-more"
          >
            <Icon name="ellipsis-vertical" size={18} />
          </Button>
        </Dropdown>
      )}
    </div>
  );
}
