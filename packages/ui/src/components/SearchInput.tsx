import { Input, type InputProps } from "./Input";

export type SearchInputProps = Omit<
	InputProps,
	"type" | "icon" | "onDebouncedChange"
> & {
	onDebouncedChange: (value: string) => void;
};

/** Debounced search field with a leading search icon. */
export function SearchInput(props: SearchInputProps) {
	return <Input {...props} type="search" icon="search" />;
}
