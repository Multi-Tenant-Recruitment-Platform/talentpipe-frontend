import { Flex } from 'antd';
import { forwardRef } from 'react';
import { Alert, type AlertTone } from '../ui/Alert';
import { Button } from '../ui/Button';

export interface VacancyNoticeValue {
  tone: AlertTone;
  text: string;
  /** Offered when repeating the request could succeed. */
  retry?: () => void;
  /** After an archive: the vacancy left this view, so say where it went. */
  showArchived?: boolean;
}

/**
 * The page-level outcome of a vacancy action.
 *
 * <p>Focusable (`tabIndex=-1`) because it is where focus goes when the row that
 * started the action has left the list — archiving from the Published view
 * removes the very button that was pressed, and focus dropping to the document
 * body would strand a keyboard user at the top of the page.</p>
 */
export const VacancyNotice = forwardRef<
  HTMLDivElement,
  Readonly<{
    id: string;
    notice: VacancyNoticeValue;
    onDismiss: () => void;
    onShowArchived?: () => void;
  }>
>(function VacancyNotice({ id, notice, onDismiss, onShowArchived }, ref) {
  return (
    // Focus target after an action whose row has left the view. The Alert inside
    // already carries the visible frame, so the wrapper adds a ring, not a box.
    <div ref={ref} id={id} tabIndex={-1} className="mb-6 rounded-lg outline-none focus-visible:shadow-focus">
      <Alert tone={notice.tone} onDismiss={onDismiss}>
        <Flex wrap align="center" justify="space-between" gap={12}>
          <span>{notice.text}</span>
          {notice.retry && (
            <Button size="sm" variant="secondary" onClick={notice.retry}>
              Try again
            </Button>
          )}
          {notice.showArchived && onShowArchived && (
            <button type="button" className="tp-link-button" onClick={onShowArchived}>
              View archived
            </button>
          )}
        </Flex>
      </Alert>
    </div>
  );
});
