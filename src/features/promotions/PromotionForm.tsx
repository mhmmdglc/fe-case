import { useEffect, useRef, useState, type ReactNode } from "react";
import { Alert, Button, Col, DatePicker, Form, Input, InputNumber, Radio, Row, Select, Space } from "antd";
import dayjs from "dayjs";
import { ApiError } from "../../api/client";
import type { PromotionWithStatus } from "../../api/types";
import { errorMessage } from "../../components/common";
import {
  buildCreatePayload,
  emptyPromotionForm,
  hasErrors,
  mapServerErrors,
  validatePromotionForm,
  type FieldErrors,
  type FormField,
  type PromotionFormValues,
} from "../../domain/promotionForm";
import { useCategories } from "../products/queries";
import { ProductPicker } from "./ProductPicker";
import { useCreatePromotion } from "./queries";
import { TargetPromotions } from "./TargetPromotions";

const DATE_FORMAT = "YYYY-MM-DD";

interface Props {
  initialValues?: PromotionFormValues;
  onCreated?: (promotion: PromotionWithStatus) => void;
  /** Rendered next to the fields with the current values (live preview). */
  renderAside?: (values: PromotionFormValues) => ReactNode;
}

const toDayjs = (date: string | null) => (date ? dayjs(date, DATE_FORMAT) : null);
// Format the picked calendar day directly; toISOString() could shift it to the previous day.
const fromDayjs = (date: dayjs.Dayjs | null) => (date ? date.format(DATE_FORMAT) : null);

const conflictFields: (keyof PromotionFormValues)[] = ["targetType", "targetCategory", "targetProducts", "startDate", "endDate"];

export function PromotionForm({ initialValues = emptyPromotionForm, onCreated, renderAside }: Props) {
  const [values, setValues] = useState(initialValues);
  const [submitted, setSubmitted] = useState(false);
  const [serverErrors, setServerErrors] = useState<FieldErrors>({});
  const [formMessages, setFormMessages] = useState<string[]>([]);
  const [conflicts, setConflicts] = useState<string[]>([]);
  const create = useCreatePromotion();
  const categories = useCategories();
  const feedbackRef = useRef<HTMLDivElement>(null);

  // The drawer may be scrolled to the submit button; bring server feedback into view.
  useEffect(() => {
    if (conflicts.length > 0 || formMessages.length > 0) {
      feedbackRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  }, [conflicts, formMessages]);

  // Inline errors appear after the first submit attempt and then follow every change.
  const clientErrors = submitted ? validatePromotionForm(values) : {};
  const errorFor = (field: FormField) => clientErrors[field] ?? serverErrors[field];
  const itemProps = (field: FormField) => {
    const error = errorFor(field);
    return { validateStatus: error ? ("error" as const) : undefined, help: error, htmlFor: field };
  };

  function update<K extends keyof PromotionFormValues>(key: K, value: PromotionFormValues[K]) {
    setValues((prev) => ({ ...prev, [key]: value }));
    // A server message for this field no longer applies once the user edits it.
    setServerErrors((prev) => {
      if (!(key in prev)) return prev;
      const next = { ...prev };
      delete next[key as FormField];
      return next;
    });
    // A 409 describes the submitted target and dates; it is stale once either changes.
    if (conflictFields.includes(key)) setConflicts((prev) => (prev.length > 0 ? [] : prev));
  }

  async function handleSubmit() {
    if (create.isPending) return; // no double submit
    setSubmitted(true);
    if (hasErrors(validatePromotionForm(values))) return;

    setServerErrors({});
    setFormMessages([]);
    setConflicts([]);

    try {
      const created = await create.mutateAsync(buildCreatePayload(values));
      setValues(emptyPromotionForm);
      setSubmitted(false);
      onCreated?.(created);
    } catch (error) {
      // The form keeps every value so the user can fix the problem and resubmit.
      if (error instanceof ApiError && error.status === 409) {
        setConflicts(error.conflicts.length > 0 ? error.conflicts : [error.message]);
      } else if (error instanceof ApiError && error.status === 422) {
        const { fieldErrors, unmapped } = mapServerErrors(error.errors);
        setServerErrors(fieldErrors);
        setFormMessages(unmapped.length > 0 || hasErrors(fieldErrors) ? unmapped : [error.message]);
      } else {
        setFormMessages([errorMessage(error)]);
      }
    }
  }

  const isPercentage = values.discountType === "percentage_off";

  const fields = (
    <>
      <Row gutter={16}>
        <Col span={14}>
          <Form.Item label="Name" required {...itemProps("name")}>
            <Input
              id="name"
              value={values.name}
              onChange={(e) => update("name", e.target.value)}
              placeholder="e.g. Autumn Knitwear Week"
              maxLength={80}
            />
          </Form.Item>
        </Col>
        <Col span={10}>
          <Form.Item label="Coupon code" tooltip="Optional">
            <Input
              id="couponCode"
              className="mono"
              value={values.couponCode}
              onChange={(e) => update("couponCode", e.target.value.toUpperCase())}
              placeholder="e.g. KNIT25"
              maxLength={32}
            />
          </Form.Item>
        </Col>
      </Row>

      <Row gutter={16}>
        <Col span={14}>
          <Form.Item label="Discount type" required {...itemProps("discountType")}>
            <Radio.Group
              id="discountType"
              optionType="button"
              value={values.discountType}
              onChange={(e) => update("discountType", e.target.value)}
              options={[
                { value: "percentage_off", label: "Percentage off" },
                { value: "fixed_amount_off", label: "Fixed amount off" },
              ]}
            />
          </Form.Item>
        </Col>
        <Col span={10}>
          <Form.Item label="Value" required {...itemProps("value")}>
            <InputNumber
              id="value"
              style={{ width: "100%" }}
              value={values.value}
              onChange={(v) => update("value", typeof v === "number" ? v : null)}
              suffix={isPercentage ? "%" : "₺"}
              placeholder={isPercentage ? "1 – 100" : "Amount in TL"}
            />
          </Form.Item>
        </Col>
      </Row>

      <Row gutter={16}>
        <Col span={12}>
          <Form.Item label="Start date" required {...itemProps("startDate")}>
            <DatePicker
              id="startDate"
              style={{ width: "100%" }}
              format={DATE_FORMAT}
              value={toDayjs(values.startDate)}
              onChange={(d) => update("startDate", fromDayjs(d))}
            />
          </Form.Item>
        </Col>
        <Col span={12}>
          <Form.Item label="End date" required {...itemProps("endDate")}>
            <DatePicker
              id="endDate"
              style={{ width: "100%" }}
              format={DATE_FORMAT}
              value={toDayjs(values.endDate)}
              onChange={(d) => update("endDate", fromDayjs(d))}
            />
          </Form.Item>
        </Col>
      </Row>

      <Form.Item label="Applies to" required>
        <Radio.Group
          value={values.targetType}
          onChange={(e) => update("targetType", e.target.value)}
          options={[
            { value: "category", label: "A whole category" },
            { value: "products", label: "Specific products" },
          ]}
        />
      </Form.Item>

      {values.targetType === "category" ? (
        <Form.Item label="Category" required {...itemProps("targetCategory")}>
          <Select
            id="targetCategory"
            placeholder="Select a category"
            showSearch={{ optionFilterProp: "label" }}
            value={values.targetCategory ?? undefined}
            onChange={(v: string) => update("targetCategory", v)}
            loading={categories.isLoading}
            options={(categories.data ?? []).map((c) => ({
              value: c,
              label: c.charAt(0).toUpperCase() + c.slice(1),
            }))}
          />
        </Form.Item>
      ) : (
        <Form.Item label="Products" required {...itemProps("targetProducts")}>
          <ProductPicker
            id="targetProducts"
            value={values.targetProducts}
            onChange={(v) => update("targetProducts", v)}
            status={errorFor("targetProducts") ? "error" : undefined}
          />
        </Form.Item>
      )}

      <TargetPromotions values={values} />
    </>
  );

  return (
    <Form
      layout="vertical"
      onFinish={handleSubmit}
      aria-label="Create promotion"
      // Enter confirms a date or a select option; it must not also submit the form
      // (that would save a half-reviewed promotion). Only the button submits.
      onKeyDown={(e) => {
        if (e.key === "Enter" && e.target instanceof HTMLInputElement) e.preventDefault();
      }}
    >
      <div ref={feedbackRef} />
      <Space orientation="vertical" size="middle" style={{ width: "100%" }}>
        {conflicts.length > 0 && (
          <Alert
            type="error"
            showIcon
            title="This promotion overlaps existing promotions and was not saved"
            description={
              <>
                <ul style={{ margin: 0, paddingLeft: 18, maxHeight: 180, overflowY: "auto" }}>
                  {conflicts.map((conflict, i) => (
                    <li key={i}>{conflict}</li>
                  ))}
                </ul>
                <div className="conflict-hint">Conflicts include active and scheduled promotions whose dates overlap with yours.</div>
              </>
            }
          />
        )}
        {formMessages.length > 0 && (
          <Alert
            type="error"
            showIcon
            title="The promotion could not be saved"
            description={formMessages.map((m, i) => (
              <div key={i}>{m}</div>
            ))}
          />
        )}

        {renderAside ? (
          <Row gutter={24}>
            <Col span={12}>{fields}</Col>
            <Col span={12}>{renderAside(values)}</Col>
          </Row>
        ) : (
          fields
        )}

        <Space>
          <Button type="primary" htmlType="submit" loading={create.isPending}>
            Create promotion
          </Button>
          <Button
            disabled={create.isPending}
            onClick={() => {
              setValues(emptyPromotionForm);
              setSubmitted(false);
              setServerErrors({});
              setFormMessages([]);
              setConflicts([]);
            }}
          >
            Reset
          </Button>
        </Space>
      </Space>
    </Form>
  );
}
