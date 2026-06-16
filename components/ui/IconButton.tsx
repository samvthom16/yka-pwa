"use client";

import { AnchorHTMLAttributes, ButtonHTMLAttributes } from "react";

const CLS =
  "flex items-center justify-center w-9 h-9 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-100 hover:text-gray-700 active:bg-gray-100 active:text-gray-700 transition-colors flex-shrink-0";

export function IconButton({
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { children: React.ReactNode }) {
  return (
    <button className={CLS} {...props}>
      {children}
    </button>
  );
}

export function IconButtonLink({
  children,
  ...props
}: AnchorHTMLAttributes<HTMLAnchorElement> & { children: React.ReactNode }) {
  return (
    <a className={CLS} {...props}>
      {children}
    </a>
  );
}
