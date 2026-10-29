import { useRef, useState } from "react";
import type { View } from "react-native";
import type { Anchor } from "@/components/ui/Menu";
import { NO_FILTERS, ShiftFilters, SortKey } from "@/src/lib/shiftFilters";

// Filter sheet + sort menu state shared by Home, My shifts and Saved.
export function useListControls<S extends string = SortKey>(initialSort: NoInfer<S>) {
  const [filters, setFilters] = useState<ShiftFilters>(NO_FILTERS);
  const [sort, setSort] = useState<S>(initialSort);
  const [filterOpen, setFilterOpen] = useState(false);
  const [sortAnchor, setSortAnchor] = useState<Anchor | null>(null);
  const sortRef = useRef<View>(null);
  const openSort = () => sortRef.current?.measureInWindow((x, y, width, height) => setSortAnchor({ x, y, width, height }));
  return { filters, setFilters, sort, setSort, filterOpen, setFilterOpen, sortAnchor, closeSort: () => setSortAnchor(null), sortRef, openSort };
}
