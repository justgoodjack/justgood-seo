/** The mark: three lines of text, one highlighted. Shapes only, so it renders crisply at any size. */
export function LogoMark({ size = 28 }: { size?: number }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width={size} height={size} role="img" aria-label="SEO + GEO Engine" style={{ display: "block", flex: "none" }}>
      <rect width="64" height="64" rx="14" fill="#0d1b2e" />
      <rect x="13" y="14" width="30" height="7" rx="3.5" fill="#fff" fillOpacity=".92" />
      <g transform="rotate(-3.5 32 33)"><rect x="10" y="26" width="44" height="14" rx="4" fill="#ffd53d" /></g>
      <rect x="13" y="45" width="22" height="7" rx="3.5" fill="#fff" fillOpacity=".92" />
    </svg>
  );
}
