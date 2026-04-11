import type { ReactNode } from "react";

interface AdminIconProps {
  name: string;
}

export function AdminIcon({ name }: AdminIconProps) {
  const commonProps = {
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const
  };

  const icons: Record<string, ReactNode> = {
    overview: <path {...commonProps} d="M4 13h7V4H4v9zm9 7h7V4h-7v16zM4 20h7v-5H4v5z" />,
    requests: <path {...commonProps} d="M7 5h10v14H7zM9 9h6M9 13h6M9 17h4" />,
    calendar: <path {...commonProps} d="M7 3v4M17 3v4M4 8h16M5 5h14v16H5z" />,
    analytics: <path {...commonProps} d="M5 18V9m7 9V5m7 13v-7M3 20h18" />,
    pricing: <path {...commonProps} d="M12 4v16M7.5 8.5c0-1.7 1.8-3 4.5-3s4.5 1.3 4.5 3-1.2 2.7-4.5 3-4.5 1.3-4.5 3 1.8 3 4.5 3 4.5-1.3 4.5-3" />,
    history: <path {...commonProps} d="M4 12a8 8 0 1 0 2.3-5.7M4 4v5h5M12 8v5l3 2" />,
    team: <path {...commonProps} d="M8 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6zm8 1a2.5 2.5 0 1 0 0-5m-13 9c0-2.3 2.5-4 5-4s5 1.7 5 4m1 0c.2-1.3 1.7-2.4 3.5-2.4" />,
    chart: <path {...commonProps} d="M4 18h16M7 14l3-4 3 2 5-6" />,
    profit: <path {...commonProps} d="M5 16c2-5 5-8 14-9-1 9-4 12-9 14M7 7h3M7 10h5" />,
    invoice: <path {...commonProps} d="M7 3h10l3 3v15l-3-2-3 2-3-2-3 2-3-2V3zM9 9h6M9 13h6" />,
    users: <path {...commonProps} d="M9 12a3 3 0 1 0 0-6 3 3 0 0 0 0 6zm7 1a2.5 2.5 0 1 0 0-5m-12 9c0-2.2 2.4-4 5-4s5 1.8 5 4m1 0c.3-1.4 1.9-2.5 3.8-2.5" />,
    labor: <path {...commonProps} d="M14 5l5 5-8.5 8.5H5V13L14 5zm-7 8l4 4" />,
    items: <path {...commonProps} d="M12 3l8 4-8 4-8-4 8-4zm8 4v10l-8 4-8-4V7m8 4v10" />,
    fee: <path {...commonProps} d="M12 4v16M7.5 8.5c0-1.7 1.8-3 4.5-3s4.5 1.3 4.5 3-1.2 2.7-4.5 3-4.5 1.3-4.5 3 1.8 3 4.5 3 4.5-1.3 4.5-3" />,
    discount: <path {...commonProps} d="M7 7l10 10M8.5 15.5a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3zm7-10a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3z" />,
    writer: <path {...commonProps} d="M6 18h12M8 6h8M8 10h8M8 14h5M6 3h12v18H6z" />,
    orders: <path {...commonProps} d="M6 5h12l1 4H5l1-4zm0 4h12v10H6V9zm3 4h6" />,
    outstanding: <path {...commonProps} d="M6 4h12v16H6zM9 8h6M9 12h6M9 16h4" />,
    aging: <path {...commonProps} d="M12 7v5l3 2M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0z" />,
    deferred: <path {...commonProps} d="M7 4h10l3 3v13H4V4h3zm5 4v4l3 2" />,
    activity: <path {...commonProps} d="M4 12h4l2-5 4 10 2-5h4" />,
    stock: <path {...commonProps} d="M4 7h16M4 12h16M4 17h10M6 4h12v16H6z" />,
    unused: <path {...commonProps} d="M7 4h10v5H7zM9 9v7m6-7v7M6 20h12" />
  };

  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      {icons[name] || icons.chart}
    </svg>
  );
}
