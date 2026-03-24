import { SVGProps } from 'react';

type IconProps = SVGProps<SVGSVGElement>;

export function FolderIcon(props: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      <path d="M3 7.8A1.8 1.8 0 0 1 4.8 6h5.2l1.6 2h7.4A1.8 1.8 0 0 1 21 9.8v7.4A1.8 1.8 0 0 1 19.2 19H4.8A1.8 1.8 0 0 1 3 17.2z" />
    </svg>
  );
}

export function FileIcon(props: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      <path d="M7.8 3h7.4L20 7.8v11.4A1.8 1.8 0 0 1 18.2 21H7.8A1.8 1.8 0 0 1 6 19.2V4.8A1.8 1.8 0 0 1 7.8 3z" />
      <path d="M15.2 3v4.8H20" />
      <path d="M9 12h6" />
      <path d="M9 15h6" />
    </svg>
  );
}
