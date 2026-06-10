import React from 'react';

// Centralized Icon name definition based on icons.md list
export type IconName =
  | 'nav-dashboard'
  | 'nav-quiz'
  | 'nav-instructor'
  | 'nav-results'
  | 'nav-file'
  | 'nav-analytics'
  | 'status-draft'
  | 'status-scheduled'
  | 'status-live'
  | 'status-completed'
  | 'status-cancelled'
  | 'alert-cancel'
  | 'alert-triangle'
  | 'analytics'
  | 'answer-correct'
  | 'answer-wrong'
  | 'arrow-left'
  | 'arrow-right'
  | 'bell-notification'
  | 'calendar'
  | 'check-circle'
  | 'check-verified-2'
  | 'check-verified'
  | 'check'
  | 'chevron-down'
  | 'chevron-right'
  | 'chip-mobile'
  | 'chip-questions'
  | 'copy'
  | 'csv-upload'
  | 'download'
  | 'edit-pencil'
  | 'edit'
  | 'empty-state'
  | 'eye'
  | 'feature-participants'
  | 'feature-questions'
  | 'file-csv'
  | 'filter'
  | 'help-circle'
  | 'lock'
  | 'logout'
  | 'mail'
  | 'message-square'
  | 'minus'
  | 'monitor'
  | 'pagination-next'
  | 'pagination-prev'
  | 'phone'
  | 'plus'
  | 'publish'
  | 'question-unanswered'
  | 'quiz-upcoming'
  | 'radio-selected'
  | 'radio-unselected'
  | 'republish'
  | 'search'
  | 'signal-wifi'
  | 'sort'
  | 'stat-warning'
  | 'stopwatch'
  | 'theme-moon'
  | 'theme-sun'
  | 'theme-toggle'
  | 'timer'
  | 'trash'
  | 'upload'
  | 'user-group'
  | 'user-profile'
  | 'x-cancel'
  | 'x-close'
  | 'chart-donut-students'
  | 'chart-line-score'
  | 'chart-donut-quizzes'
  | 'logo-layers'
  | 'logo-qa'
  // Also keep the existing placeholders
  | 'dashboard'
  | 'create-quiz'
  | 'participant'
  | 'instructor'
  | 'time'
  | 'user'
  | 'warning'
  | 'settings'
  | 'close';

interface IconProps extends React.SVGProps<SVGSVGElement> {
  name: IconName;
  size?: number;
  title?: string;
  'aria-label'?: string;
}

// Vite Glob Import for dynamically loading SVGs from assets/icons
// The ?raw query returns the file content as a string.
// eager: true imports all matching modules statically at build time.
const rawSvgModules = import.meta.glob('/src/assets/icons/**/*.svg', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>;

// Clean up registry keys to match the file basenames (e.g. 'nav-dashboard')
// eslint-disable-next-line react-refresh/only-export-components
export const svgRegistry: Record<string, string> = {};
for (const path in rawSvgModules) {
  const fileName = path.split('/').pop()?.replace('.svg', '');
  if (fileName) {
    svgRegistry[fileName] = rawSvgModules[path];
  }
}

// Fallback alias mappings to match old placeholder names with new asset filenames
const ALIAS_MAP: Record<string, string> = {
  'dashboard': 'nav-dashboard',
  'create-quiz': 'nav-quiz',
  'instructor': 'nav-instructor',
  'analytics': 'nav-analytics',
  'time': 'timer',
  'user': 'user-profile',
  'warning': 'alert-triangle',
  'close': 'x-close',
};

// Extracts viewBox and other attributes from raw SVG string
const parseRawSvg = (raw: string) => {
  // Find the opening <svg ...> tag attributes string
  const svgTagMatch = raw.match(/<svg([^>]*)/i);
  const svgAttrsStr = svgTagMatch ? svgTagMatch[1] : '';

  // Helper to extract attribute values
  const getAttr = (name: string): string | undefined => {
    const regex = new RegExp(`${name}="([^"]*)"`, 'i');
    const match = svgAttrsStr.match(regex);
    return match ? match[1] : undefined;
  };

  const viewBox = getAttr('viewBox') || '0 0 24 24';
  const fill = getAttr('fill');
  const stroke = getAttr('stroke');
  const strokeWidth = getAttr('stroke-width');
  const strokeLinecap = getAttr('stroke-linecap');
  const strokeLinejoin = getAttr('stroke-linejoin');

  const start = raw.indexOf('>');
  const end = raw.lastIndexOf('</svg>');
  const content = start !== -1 && end !== -1 ? raw.substring(start + 1, end) : raw;

  return {
    viewBox,
    fill,
    stroke,
    strokeWidth,
    strokeLinecap,
    strokeLinejoin,
    content,
  };
};

export const Icon: React.FC<IconProps> = ({
  name,
  size = 20,
  title,
  'aria-label': ariaLabel,
  color = 'currentColor',
  ...props
}) => {
  // 1. Resolve registered SVG file content
  let resolvedContent: string | undefined = svgRegistry[name];
  if (!resolvedContent && ALIAS_MAP[name]) {
    resolvedContent = svgRegistry[ALIAS_MAP[name]];
  }

  // 2. If dynamic SVG file content is found, render it inline
  if (resolvedContent) {
    const {
      viewBox,
      fill,
      stroke,
      strokeWidth,
      strokeLinecap,
      strokeLinejoin,
      content,
    } = parseRawSvg(resolvedContent);

    // Resolve fill and stroke values dynamically
    const resolvedFill = fill === 'currentColor' ? color : (fill || 'none');
    const resolvedStroke = stroke === 'currentColor' ? color : stroke;

    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width={size}
        height={size}
        viewBox={viewBox}
        fill={resolvedFill}
        stroke={resolvedStroke}
        strokeWidth={strokeWidth}
        strokeLinecap={strokeLinecap as unknown as undefined}
        strokeLinejoin={strokeLinejoin as unknown as undefined}
        role="img"
        aria-label={ariaLabel || title || name}
        style={{ color, ...props.style }}
        dangerouslySetInnerHTML={{ __html: (title ? `<title>${title}</title>` : '') + content }}
        {...props}
      />
    );
  }

  // 3. Fall back to embedded placeholder paths if the svg files are not available
  const getPaths = () => {
    switch (name) {
      case 'dashboard':
        return (
          <>
            <rect x="3" y="3" width="7" height="9" rx="1" />
            <rect x="14" y="3" width="7" height="5" rx="1" />
            <rect x="3" y="16" width="7" height="5" rx="1" />
            <rect x="14" y="12" width="7" height="9" rx="1" />
          </>
        );
      case 'analytics':
        return (
          <>
            <line x1="18" y1="20" x2="18" y2="10" />
            <line x1="12" y1="20" x2="12" y2="4" />
            <line x1="6" y1="20" x2="6" y2="14" />
          </>
        );
      case 'logout':
        return (
          <>
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
            <polyline points="16 17 21 12 16 7" />
            <line x1="21" y1="12" x2="9" y2="12" />
          </>
        );
      case 'create-quiz':
        return (
          <>
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
            <line x1="12" y1="18" x2="12" y2="12" />
            <line x1="9" y1="15" x2="15" y2="15" />
          </>
        );
      case 'participant':
        return (
          <>
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
            <path d="M16 3.13a4 4 0 0 1 0 7.75" />
          </>
        );
      case 'instructor':
        return (
          <>
            <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <path d="M22 9v2m0 4h.01" />
            <rect x="19" y="5" width="4" height="14" rx="1" />
          </>
        );
      case 'arrow-left':
        return (
          <>
            <line x1="19" y1="12" x2="5" y2="12" />
            <polyline points="12 19 5 12 12 5" />
          </>
        );
      case 'trash':
        return (
          <>
            <polyline points="3 6 5 6 21 6" />
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
            <line x1="10" y1="11" x2="10" y2="17" />
            <line x1="14" y1="11" x2="14" y2="17" />
          </>
        );
      case 'edit':
        return (
          <>
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
            <path d="M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
          </>
        );
      case 'check':
        return (
          <>
            <polyline points="20 6 9 17 4 12" />
          </>
        );
      case 'x-close':
      case 'close':
        return (
          <>
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </>
        );
      case 'upload':
        return (
          <>
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="17 8 12 3 7 8" />
            <line x1="12" y1="3" x2="12" y2="15" />
          </>
        );
      case 'plus':
        return (
          <>
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </>
        );
      case 'timer':
      case 'time':
        return (
          <>
            <circle cx="12" cy="12" r="10" />
            <polyline points="12 6 12 12 16 14" />
          </>
        );
      case 'mail':
        return (
          <>
            <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
            <polyline points="22,6 12,13 2,6" />
          </>
        );
      case 'check-circle':
        return (
          <>
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
            <polyline points="22 4 12 14.01 9 11.01" />
          </>
        );
      case 'user':
        return (
          <>
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
            <circle cx="12" cy="7" r="4" />
          </>
        );
      case 'warning':
        return (
          <>
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
            <line x1="12" y1="9" x2="12" y2="13" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
          </>
        );
      case 'settings':
        return (
          <>
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
          </>
        );
      default:
        return null;
    }
  };

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      role="img"
      aria-label={ariaLabel || title || name}
      style={{ color, ...props.style }}
      {...props}
    >
      {title && <title>{title}</title>}
      {getPaths()}
    </svg>
  );
};

export default Icon;
