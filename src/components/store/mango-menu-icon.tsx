import { Menu } from "lucide-react";
import { useId } from "react";

export function MangoMenuIcon({ size = 25 }: { size?: number }) {
  const gradientId = useId().replace(/:/g, "");

  return (
    <Menu size={size} stroke={`url(#${gradientId})`} strokeWidth={2.5}>
      <defs>
        <linearGradient
          id={gradientId}
          x1="3"
          y1="4"
          x2="21"
          y2="20"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0" stopColor="#FBCB3D" />
          <stop offset="0.58" stopColor="#F8B937" />
          <stop offset="1" stopColor="#F18532" />
        </linearGradient>
      </defs>
    </Menu>
  );
}
