import {
  BankOutlined,
  CalendarOutlined,
  FunnelPlotOutlined,
  SafetyCertificateOutlined,
  SolutionOutlined,
  TeamOutlined,
} from '@ant-design/icons';
import type { IconComponent } from '../ui/icon';

const GROUP_ICONS: Record<string, IconComponent> = {
  TEAM: TeamOutlined,
  COMPANY: BankOutlined,
  VACANCIES: SolutionOutlined,
  HIRING: FunnelPlotOutlined,
  INTERVIEWS: CalendarOutlined,
};

/** The icon for a permission group; a group the UI does not know yet gets a neutral shield. */
export function groupIcon(key: string): IconComponent {
  return GROUP_ICONS[key] ?? SafetyCertificateOutlined;
}
