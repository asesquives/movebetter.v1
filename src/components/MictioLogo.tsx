import logoSrc from "@/assets/mictio-logo.jpg";

interface Props {
  size?: number;
  className?: string;
}

export function MictioLogo({ size = 28, className }: Props) {
  return (
    <img
      src={logoSrc}
      width={size}
      height={size}
      alt="Mictio"
      className={className}
      style={{ borderRadius: 6, objectFit: "contain" }}
    />
  );
}
