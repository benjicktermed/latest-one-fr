import { useApp } from "@/context/AppContext";

interface Props {
  size?: "sm" | "md" | "lg";
}

export default function Avatar({ size = "md" }: Props) {
  const { profile } = useApp();

  const dim = size === "sm" ? "w-8 h-8" : size === "lg" ? "w-16 h-16" : "w-10 h-10";
  const text = size === "sm" ? "text-xs" : size === "lg" ? "text-2xl" : "text-sm";

  if (profile?.avatarUrl) {
    return (
      <img
        src={profile.avatarUrl}
        alt={profile.name}
        className={`${dim} rounded-full object-cover shrink-0 bg-card`}
      />
    );
  }

  const letter = (profile?.name ?? "?")[0]?.toUpperCase() ?? "?";

  return (
    <div
      className={`${dim} rounded-full bg-card border border-border flex items-center justify-center shrink-0 ${text} font-bold text-foreground`}
    >
      {letter}
    </div>
  );
}
