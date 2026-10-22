import { Tooltip } from 'antd';
import dayjs from 'dayjs';
import { Link } from 'react-router-dom';
import type { PipelineTemplateSummary } from '../../api/types';
import { stageShape } from '../../dashboard/pipelineTemplate';
import { formatRelativeTime } from '../../utils/format';
import { StageStrip } from './StageStrip';
import { TemplateActions } from './TemplateActions';
import { ArchivedTag } from './TemplateStatusTag';
import type { TemplateAction } from './useTemplateLifecycle';

const TERM = 'text-caption font-medium text-slate-500';
const FIGURE = 'block text-body tabular-nums text-slate-900';

/**
 * One template in the list (PT-6): its name and shape, how many stages and
 * rounds, when it last changed — and, for an admin, what can be done to it.
 * Zones on a grid, like a vacancy row, so on a phone they stack in reading
 * order instead of a table hiding columns.
 */
export function TemplateRow({
  template,
  canManage,
  busy,
  flash,
  listSearch,
  onAction,
}: Readonly<{
  template: PipelineTemplateSummary;
  canManage: boolean;
  busy: boolean;
  /** Just changed — draw the eye to it once. */
  flash: boolean;
  /** The list's query string, so the detail page's Back returns to this view. */
  listSearch: string;
  onAction: (action: TemplateAction) => void;
}>) {
  const titleId = `template-${template.id}-title`;
  const shape = stageShape(template);
  const archived = template.status === 'ARCHIVED';

  return (
    <li className="tp-vacancy-row" data-flash={flash || undefined}>
      <article
        aria-labelledby={titleId}
        className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-x-4 gap-y-3 px-4 py-4 sm:px-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,300px)_150px] lg:items-center lg:gap-6"
      >
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h2 id={titleId} className="tp-vacancy-row-title">
              <Link to={`/dashboard/pipeline-templates/${template.id}`} state={{ listSearch }}>
                {template.name}
              </Link>
            </h2>
            {archived && <ArchivedTag />}
          </div>
          {template.description && (
            <p className="m-0 mt-0.5 truncate text-small text-slate-500">{template.description}</p>
          )}
          <StageStrip shape={shape} className="mt-2" />
        </div>

        <dl className="col-span-2 m-0 grid grid-cols-3 gap-4 lg:col-span-1 lg:col-start-2 lg:row-start-1">
          <div>
            <dt className={TERM}>Stages</dt>
            <dd className="m-0">
              <span className={FIGURE}>{shape.stageCount}</span>
            </dd>
          </div>
          <div>
            <dt className={TERM}>Interview rounds</dt>
            <dd className="m-0">
              <span className={FIGURE}>{shape.interviewRounds}</span>
            </dd>
          </div>
          <div>
            <dt className={TERM}>Last updated</dt>
            <dd className="m-0">
              <Tooltip title={dayjs(template.updatedAt).format('D MMM YYYY, HH:mm')}>
                <time dateTime={template.updatedAt} className="block text-body text-slate-900">
                  {formatRelativeTime(template.updatedAt)}
                </time>
              </Tooltip>
            </dd>
          </div>
        </dl>

        <div className="col-start-2 row-start-1 justify-self-end lg:col-start-3">
          {canManage && <TemplateActions template={template} context="list" busy={busy} onAction={onAction} />}
        </div>
      </article>
    </li>
  );
}
