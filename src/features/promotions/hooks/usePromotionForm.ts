import { useEffect, useRef, useState } from "react";
import { useCategories } from "@/features/products";
import { ApiError } from "@/services/http/httpClient";
import type { PromotionWithStatus } from "@/services/types";
import { errorMessage } from "@/shared/utils/errorMessage";
import {
  buildCreatePayload,
  emptyPromotionForm,
  hasErrors,
  mapServerErrors,
  validatePromotionForm,
  type FieldErrors,
  type FormField,
  type PromotionFormValues,
} from "@/domain/promotionForm";
import { useCreatePromotion } from "./usePromotionMutations";

const conflictFields: (keyof PromotionFormValues)[] = ["targetType", "targetCategory", "targetProducts", "startDate", "endDate"];

interface Options {
  initialValues: PromotionFormValues;
  onCreated?: (promotion: PromotionWithStatus) => void;
}

/** State, validation and submit of the create form, including the 422 and 409 answers. */
export function usePromotionForm({ initialValues, onCreated }: Options) {
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

  async function submit() {
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

  function reset() {
    setValues(emptyPromotionForm);
    setSubmitted(false);
    setServerErrors({});
    setFormMessages([]);
    setConflicts([]);
  }

  return {
    values,
    update,
    errorFor,
    itemProps,
    submit,
    reset,
    submitting: create.isPending,
    conflicts,
    formMessages,
    feedbackRef,
    categories: categories.data ?? [],
    categoriesLoading: categories.isLoading,
  };
}
