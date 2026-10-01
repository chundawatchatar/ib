/** ACME monogram. Keep the geometry in sync with public/favicon.svg. */
export function Logo({ className }: { className?: string }) {
	return (
		<svg
			viewBox="0 0 32 32"
			aria-hidden="true"
			focusable="false"
			className={className}
			fill="currentColor"
		>
			<rect width="32" height="32" rx="8" />
			<path
				className="fill-primary-foreground"
				fillRule="evenodd"
				d="M7 24 13.5 8h5L25 24h-5l-1.2-3.5h-5.6L12 24H7Zm7.6-7.5h2.8L16 12.2l-1.4 4.3Z"
			/>
		</svg>
	);
}
