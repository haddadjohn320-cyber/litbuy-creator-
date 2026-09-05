export function Logo({ className = "h-9 w-9" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 100 100"
      className={`${className} rounded-lg border border-line`}
      role="img"
      aria-label="Litbuy flame logo"
    >
      <rect width="100" height="100" rx="20" fill="#F7F6F2" />
      <path
        d="M52 6 C56 21 47 29 39 39 C30 50 24 59 24 70 C24 87 36 97 51 97 C66 97 78 87 78 70 C78 61 75 52 69 44 C67 50 63 54 58 56 C62 41 60 20 52 6 Z"
        fill="#151613"
      />
      <path
        d="M30 16 C32 22 28 26 26 30 C24 34 25 37 28 38 C31 39 34 37 35 33 C36 28 33 22 30 16 Z"
        fill="#151613"
      />
      <path
        d="M51 36 C54 46 48 52 43 58 C38 64 35 68 35 74 C35 84 42 91 51 91 C60 91 67 84 67 74 C67 67 64 61 59 55 C58 59 55 61 52 62 C55 53 54 44 51 36 Z"
        fill="#FF7A00"
      />
      <path
        d="M51 62 C53 68 49 71 47 75 C45 78 44 80 44 83 C44 87 47 90 51 90 C55 90 58 87 58 83 C58 79 56 75 54 72 C53 74 52 75 51 75 C52 70 52 66 51 62 Z"
        fill="#FFA733"
      />
      <path d="M39 69 L48 73 L40 77 Z" fill="#151613" />
      <path d="M63 69 L54 73 L62 77 Z" fill="#151613" />
    </svg>
  );
}
