import { useEffect, useState } from "react";

type Props = {
  /** Если нет — показываем нейтральную заглушку (серый силуэт на белом). */
  src?: string | null;
  alt: string;
  size?: "xs" | "sm" | "md" | "lg";
};

const sizeClass: Record<NonNullable<Props["size"]>, string> = {
  xs: "h-5 w-5 min-h-5 min-w-5 self-center border border-brand-line dark:border-brand-panel-border",
  sm: "h-9 w-9 min-h-9 min-w-9",
  md: "h-12 w-12 min-h-12 min-w-12",
  lg: "h-24 w-24 min-h-24 min-w-24",
};

function PlaceholderPerson({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        fill="currentColor"
        fillOpacity={0.35}
        d="M12 12a3.75 3.75 0 1 0 0-7.5 3.75 3.75 0 0 0 0 7.5Zm-5.25 9.75a5.25 5.25 0 0 1 10.5 0v.75H6.75v-.75Z"
      />
    </svg>
  );
}

/** Круглая аватарка (object-cover), единый стиль для профиля и меню. */
export function UserAvatar({ src, alt, size = "md" }: Props) {
  const hasSrc = Boolean(src && src.trim() !== "");
  const [imgBroken, setImgBroken] = useState(false);

  useEffect(() => {
    setImgBroken(false);
  }, [src]);

  const showPhoto = hasSrc && !imgBroken;

  return (
    <div
      className={[
        "shrink-0 overflow-hidden rounded-full shadow-inner",
        size === "xs" ? "" : "border-2 border-brand-line dark:border-brand-panel-border",
        sizeClass[size],
      ].join(" ")}
    >
      {showPhoto ? (
        <img
          key={src}
          src={src!}
          alt={alt}
          className="h-full w-full object-cover bg-brand-surface dark:bg-brand-ink"
          width={256}
          height={256}
          decoding="async"
          referrerPolicy="no-referrer"
          onError={() => setImgBroken(true)}
        />
      ) : (
        <div
          className="flex h-full w-full items-center justify-center bg-white"
          role="img"
          aria-label={alt || "Аватар не задан"}
        >
          <PlaceholderPerson
            className={
              size === "lg"
                ? "h-[4.5rem] w-[4.5rem] text-neutral-400"
                : size === "xs"
                  ? "h-[70%] w-[70%] text-neutral-400"
                  : "h-[78%] w-[78%] text-neutral-400"
            }
          />
        </div>
      )}
    </div>
  );
}
