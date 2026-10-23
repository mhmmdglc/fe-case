import { Alert, Card, Empty, Spin, Table, Typography } from "antd";
import type { PreviewItem } from "../../api/types";
import { PriceCell, QueryErrorAlert } from "../../components/common";
import { buildPreviewRequest, type PromotionFormValues } from "../../domain/promotionForm";
import { useDebouncedValue } from "../../hooks/useDebouncedValue";
import { usePromotionPreview } from "./queries";

const sameRequest = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

export function PromotionPreview({ values }: { values: PromotionFormValues }) {
  const request = buildPreviewRequest(values);
  const debouncedRequest = useDebouncedValue(request, 400);
  const preview = usePromotionPreview(debouncedRequest);

  // A result belongs to the debounced request. While the form has moved on (debounce
  // pending) or the request is in flight, it is shown dimmed and labelled as updating.
  const outdated = !sameRequest(request, debouncedRequest) || preview.isFetching;

  let body;
  if (!request) {
    // Never keep showing an old preview for a form that is now incomplete or invalid.
    body = (
      <Empty
        image={Empty.PRESENTED_IMAGE_SIMPLE}
        description="Enter a valid discount, both dates and a target to see the affected products."
      />
    );
  } else if (preview.isError && !outdated) {
    body = <QueryErrorAlert error={preview.error} onRetry={() => preview.refetch()} />;
  } else if (!preview.data) {
    body = (
      <div style={{ textAlign: "center", padding: 32 }}>
        <Spin />
      </div>
    );
  } else {
    const { preview: items, conflicts } = preview.data;
    body = (
      <Spin spinning={outdated} description="Updating preview…">
        <div style={{ opacity: outdated ? 0.45 : 1, transition: "opacity 120ms" }}>
          {conflicts.length > 0 ? (
            <Alert
              type="warning"
              showIcon
              style={{ marginBottom: 12 }}
              title={`${conflicts.length} conflict${conflicts.length > 1 ? "s" : ""} with existing promotions`}
              description={
                <>
                  <ul style={{ margin: 0, paddingLeft: 18, maxHeight: 120, overflowY: "auto" }}>
                    {conflicts.map((c, i) => (
                      <li key={i}>{c}</li>
                    ))}
                  </ul>
                  <div className="conflict-hint">Conflicts include active and scheduled promotions whose dates overlap with yours.</div>
                </>
              }
            />
          ) : (
            <Alert type="success" showIcon style={{ marginBottom: 12 }} title="No conflicts with existing promotions" />
          )}
          <Typography.Text type="secondary">
            {items.length} product{items.length === 1 ? "" : "s"} affected
          </Typography.Text>
          <Table<PreviewItem>
            rowKey="id"
            size="small"
            style={{ marginTop: 8 }}
            dataSource={items}
            pagination={{ pageSize: 6, size: "small", hideOnSinglePage: true }}
            columns={[
              {
                title: "Product",
                dataIndex: "name",
                render: (name: string, item) => (
                  <div>
                    <div>{name}</div>
                    <span className="mono" style={{ color: "#6b7280" }}>
                      {item.sku}
                    </span>
                  </div>
                ),
              },
              {
                title: "New price",
                align: "right",
                width: 190,
                render: (_, item) => <PriceCell basePrice={item.basePrice} effectivePrice={item.effectivePrice} />,
              },
            ]}
          />
        </div>
      </Spin>
    );
  }

  return (
    <Card size="small" title="Impact preview" aria-label="Impact preview">
      {body}
    </Card>
  );
}
