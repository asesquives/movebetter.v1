interface Props {
  size?: number;
  className?: string;
}

export function MictioLogo({ size = 28, className }: Props) {
  return (
    <svg
      viewBox="0 0 80 80"
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      className={className}
      aria-label="Mictio"
    >
      <rect x="0" y="0" width="80" height="80" rx="12" fill="#111111" />
      <rect x="8" y="9" width="64" height="4" rx="1" fill="#ffffff" />
      <rect x="18" y="14" width="10" height="44" rx="1.5" fill="#ffffff" />
      <rect x="35" y="14" width="10" height="44" rx="1.5" fill="#ffffff" />
      <rect x="52" y="14" width="10" height="44" rx="1.5" fill="#ffffff" />
      <rect x="8" y="59" width="64" height="4" rx="1" fill="#ffffff" />
    </svg>
  );
}
