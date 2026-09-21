/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import React from "react";
const googleCalendarIcon = null;

export function GoogleDriveBrandIcon({ size = 18, className, style }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 256 229"
      aria-hidden
      className={className}
      style={{ display: "block", flexShrink: 0, ...style }}
    >
      <path
        fill="#0066DA"
        d="m19.354 196.034l11.29 19.5c2.346 4.106 5.718 7.332 9.677 9.678q17.009-21.591 23.68-33.137q6.77-11.717 16.641-36.655q-26.604-3.502-40.32-3.502q-13.165 0-40.322 3.502c0 4.545 1.173 9.09 3.519 13.196z"
      />
      <path
        fill="#EA4335"
        d="M215.681 225.212c3.96-2.346 7.332-5.572 9.677-9.677l4.692-8.064l22.434-38.855a26.57 26.57 0 0 0 3.518-13.196q-27.315-3.502-40.247-3.502q-13.899 0-40.248 3.502q9.754 25.075 16.422 36.655q6.724 11.683 23.752 33.137"
      />
      <path
        fill="#00832D"
        d="M128.001 73.311q19.68-23.768 27.125-36.655q5.996-10.377 13.196-33.137C164.363 1.173 159.818 0 155.126 0h-54.25C96.184 0 91.64 1.32 87.68 3.519q9.16 26.103 15.544 37.154q7.056 12.213 24.777 32.638"
      />
      <path
        fill="#2684FC"
        d="M175.36 155.42H80.642l-40.32 69.792c3.958 2.346 8.503 3.519 13.195 3.519h148.968c4.692 0 9.238-1.32 13.196-3.52z"
      />
      <path
        fill="#00AC47"
        d="M128.001 73.311L87.681 3.52c-3.96 2.346-7.332 5.571-9.678 9.677L3.519 142.224A26.57 26.57 0 0 0 0 155.42h80.642z"
      />
      <path
        fill="#FFBA00"
        d="m215.242 77.71l-37.243-64.514c-2.345-4.106-5.718-7.331-9.677-9.677l-40.32 69.792l47.358 82.109h80.496c0-4.546-1.173-9.09-3.519-13.196z"
      />
    </svg>
  );
}

export function FigmaBrandIcon({ size = 18, className, style }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      aria-hidden
      className={className}
      style={{ display: "block", flexShrink: 0, ...style }}
    >
      <rect width="48" height="48" rx="10.5" fill="#1E1E1E" />
      <g transform="translate(13.75, 9.25) scale(0.526)">
        <path
          fill="#1ABCFE"
          d="M19 28.5C19 23.2975 23.2975 19 28.5 19C33.7025 19 38 23.2975 38 28.5C38 33.7025 33.7025 38 28.5 38C23.2975 38 19 33.7025 19 28.5Z"
        />
        <path
          fill="#0ACF83"
          d="M0 47.5C0 42.2975 4.29746 38 9.5 38H19V47.5C19 52.7025 14.7025 57 9.5 57C4.29746 57 0 52.7025 0 47.5Z"
        />
        <path
          fill="#FF7262"
          d="M0 28.5C0 23.2975 4.29746 19 9.5 19H19V28.5H9.5C4.29746 28.5 0 32.7975 0 28.5Z"
        />
        <path
          fill="#F24E1E"
          d="M0 9.5C0 4.29746 4.29746 0 9.5 0H19V9.5H9.5C4.29746 9.5 0 13.7975 0 9.5Z"
        />
        <path
          fill="#A259FF"
          d="M19 0H28.5C33.7025 0 38 4.29746 38 9.5C38 14.7025 33.7025 19 28.5 19H19V0Z"
        />
      </g>
    </svg>
  );
}

export function GoogleSheetsBrandIcon({ size = 18, className, style }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      aria-hidden
      className={className}
      style={{ display: "block", flexShrink: 0, ...style }}
    >
      <path fill="#188038" d="M38 6H18L8 16v26a2 2 0 002 2h28a2 2 0 002-2V8a2 2 0 00-2-2z" />
      <path fill="#34A853" d="M18 6v10H8l10-10z" />
      <path fill="#fff" d="M14 22h20v2H14zm0 6h20v2H14zm0 6h14v2H14z" opacity="0.95" />
      <path fill="#fff" d="M14 22h6v14h-6z" opacity="0.35" />
    </svg>
  );
}

export function GoogleCalendarBrandIcon({
  size = 18,
  className,
  style,
}) {
  return (
    <img
      src={googleCalendarIcon}
      width={size}
      height={size}
      alt=""
      aria-hidden
      className={className}
      style={{ display: "block", flexShrink: 0, objectFit: "contain", ...style }}
      draggable={false}
    />
  );
}

export function LinkedInBrandIcon({
  size = 18,
  color = "#0A66C2",
  className,
  style,
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      aria-hidden
      className={className}
      style={{ display: "block", flexShrink: 0, ...style }}
    >
      <path
        fill={color}
        d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"
      />
    </svg>
  );
}
