export function BrandMark({ inverse = false }: { inverse?: boolean }) {
  return (
    <span className="brand-mark" data-inverse={inverse || undefined}>
      <svg aria-hidden="true" viewBox="0 0 28 32" width="28" height="32">
        <path
          d="M14 1.5 26 8.5v15L14 30.5l-12-7v-15l12-7Z"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        />
      </svg>
      <span>DriverFin</span>
    </span>
  );
}
