import { useState } from "react";
import { Select, Spin } from "antd";
import type { ProductOption } from "../../domain/promotionForm";
import { useDebouncedValue } from "../../hooks/useDebouncedValue";
import { useProductOptions } from "../products/queries";

interface Props {
  id?: string;
  value: ProductOption[];
  onChange: (value: ProductOption[]) => void;
  status?: "error";
}

/**
 * Multi-select backed by server-side search and paging (loads more on scroll).
 * labelInValue keeps the tags of selected products even when the current
 * search results no longer contain them.
 */
export function ProductPicker({ id, value, onChange, status }: Props) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search.trim(), 300);
  const query = useProductOptions(debouncedSearch, open);

  const loaded = query.data?.pages.flatMap((page) => page.products) ?? [];
  const total = query.data?.pages[0]?.total ?? 0;

  // Select only reports value/label; keep each product's category alongside its id.
  const handleChange = (selected: { value: string; label: unknown }[]) => {
    const known = new Map<string, ProductOption>(value.map((p) => [p.id, p]));
    for (const p of loaded) known.set(p.id, { id: p.id, label: `${p.name} · ${p.sku}`, category: p.category });
    onChange(
      selected.flatMap((s) => {
        const option = known.get(String(s.value));
        return option ? [option] : [];
      })
    );
  };

  const loadMore = () => {
    if (query.hasNextPage && !query.isFetchingNextPage) void query.fetchNextPage();
  };

  return (
    <Select
      id={id}
      mode="multiple"
      labelInValue
      status={status}
      placeholder="Search and select products"
      value={value.map((p) => ({ value: p.id, label: p.label }))}
      onChange={handleChange}
      open={open}
      onOpenChange={setOpen}
      showSearch={{
        filterOption: false,
        searchValue: search,
        onSearch: setSearch,
        autoClearSearchValue: false,
      }}
      options={loaded.map((p) => ({ value: p.id, label: `${p.name} · ${p.sku}` }))}
      onPopupScroll={(event) => {
        const el = event.currentTarget;
        if (el.scrollTop + el.clientHeight >= el.scrollHeight - 24) loadMore();
      }}
      notFoundContent={query.isFetching ? <Spin size="small" /> : "No products found"}
      popupRender={(menu) => (
        <>
          {menu}
          {loaded.length > 0 && (
            <div style={{ padding: "6px 12px", fontSize: 12, color: "#6b7280" }}>
              {query.isFetchingNextPage
                ? "Loading more…"
                : `Showing ${loaded.length} of ${total}${query.hasNextPage ? " · scroll for more" : ""}`}
            </div>
          )}
        </>
      )}
      maxTagCount="responsive"
      style={{ width: "100%" }}
    />
  );
}
