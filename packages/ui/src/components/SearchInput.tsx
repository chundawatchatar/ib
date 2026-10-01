import { Input, type InputProps } from "./Input";

export type SearchInputProps = Omit<
	InputProps,
	"type" | "onDebouncedChange"
> & {
	onDebouncedChange: (value: string) => void;
};

/** Convenience wrapper; Input also supports type="search" directly. */
export function SearchInput(props: SearchInputProps) {
	return <Input {...props} type="search" />;
}
