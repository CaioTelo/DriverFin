export type AppIconName =
  | 'dashboard'
  | 'earnings'
  | 'expenses'
  | 'profile'
  | 'vehicle'
  | 'logout'
  | 'more'
  | 'plus'
  | 'chevron-left'
  | 'chevron-right';

export function AppIcon({ name }: { name: AppIconName }) {
  const paths: Record<AppIconName, React.ReactNode> = {
    dashboard: <path d="m3 11 9-8 9 8v9H6v-9m4 9v-6h4v6" />,
    earnings: (
      <>
        <circle cx="12" cy="12" r="8" />
        <path d="M8 12h8m-4-4v8" />
      </>
    ),
    expenses: (
      <>
        <rect x="4" y="4" width="16" height="16" rx="1" />
        <path d="M8 12h8" />
      </>
    ),
    profile: (
      <>
        <circle cx="12" cy="8" r="3" />
        <path d="M6.5 20c.6-4 2.4-6 5.5-6s4.9 2 5.5 6" />
      </>
    ),
    vehicle: (
      <>
        <path d="m5 15 2-6h10l2 6" />
        <path d="M4 15h16v5h-2m-12 0H4v-5m4 5h8" />
        <circle cx="7.5" cy="16.5" r="1" />
        <circle cx="16.5" cy="16.5" r="1" />
      </>
    ),
    logout: (
      <>
        <path d="M10 5H5v14h5m4-4 4-3-4-3m4 3H9" />
      </>
    ),
    more: (
      <>
        <circle cx="5" cy="12" r="1" fill="currentColor" stroke="none" />
        <circle cx="12" cy="12" r="1" fill="currentColor" stroke="none" />
        <circle cx="19" cy="12" r="1" fill="currentColor" stroke="none" />
      </>
    ),
    plus: <path d="M12 5v14M5 12h14" />,
    'chevron-left': <path d="m15 18-6-6 6-6" />,
    'chevron-right': <path d="m9 18 6-6-6-6" />,
  };
  return (
    <svg
      className="app-icon"
      aria-hidden="true"
      viewBox="0 0 24 24"
      width="20"
      height="20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {paths[name]}
    </svg>
  );
}
