/** Shared empty-photo plate/utensils icon (Lista thumbs, day entries, Adicionar preview). */
export function FoodPhotoPlaceholder({ className }: { className?: string }) {
  return (
    <span className={className} aria-hidden>
      <svg
        className="food-photo-placeholder-icon"
        viewBox="0 0 24 24"
        width="1em"
        height="1em"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.65"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {/* Fork */}
        <path d="M7 2.5v6.2a2.1 2.1 0 0 0 2.1 2.1h0a2.1 2.1 0 0 0 2.1-2.1V2.5" />
        <path d="M9.1 2.5v5" />
        <path d="M9.1 10.8V21.5" />
        {/* Knife */}
        <path d="M16.2 2.6c1.9 2.6 2.3 5.4.3 7.8-.45.55-1.15.9-1.9.9V21.5" />
      </svg>
    </span>
  )
}
