import { act, render, screen, waitFor, within } from "@testing-library/react";
import { Profiler } from "react";
import { delay, http } from "msw";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { emptyPromotionForm, type PromotionFormValues } from "@/domain/promotionForm";
import { server } from "@/test/server";
import { createWrapper } from "@/test/utils";
import { PromotionPreview } from "./PromotionPreview";

// "today" is frozen at 2026-06-15 (see test/freezeDate.ts). Expectations come from the
// seed (src/mocks/db.ts) and the POST /api/promotions/preview contract.

const EMPTY_STATE = /enter a valid discount, both dates and a target/i;
const tl = (n: number) => new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY" }).format(n);

const accessories10: PromotionFormValues = {
  ...emptyPromotionForm,
  name: "Accessories Week",
  discountType: "percentage_off",
  value: 10,
  startDate: "2026-06-16",
  endDate: "2026-06-20",
  targetType: "category",
  targetCategory: "accessories",
};

let previewBodies: Promise<Record<string, unknown>>[] = [];
const onRequest = ({ request }: { request: Request }) => {
  if (new URL(request.url).pathname === "/api/promotions/preview") {
    previewBodies.push(request.clone().json());
  }
};

beforeEach(() => {
  previewBodies = [];
  server.events.on("request:start", onRequest);
});
afterEach(() => {
  server.events.removeListener("request:start", onRequest);
});

function Previews({ subject, sentinel }: { subject: PromotionFormValues; sentinel?: PromotionFormValues }) {
  return (
    <>
      <section aria-label="subject">
        <PromotionPreview values={subject} />
      </section>
      {sentinel && (
        <section aria-label="sentinel">
          <PromotionPreview values={sentinel} />
        </section>
      )}
    </>
  );
}

const region = (name: string) => screen.getByRole("region", { name });

/** Waits until a rendered result has settled (no longer dimmed/updating). */
async function waitForSettled(container: HTMLElement, text: string | RegExp) {
  await waitFor(
    () => {
      expect(within(container).getByText(text)).toBeTruthy();
      expect(within(container).queryByText("Updating preview…")).toBeNull();
    },
    { timeout: 3000 }
  );
}

describe("PromotionPreview: incomplete or invalid form", () => {
  const invalidCases: [string, PromotionFormValues][] = [
    ["no category selected", { ...accessories10, targetCategory: null }],
    ["product target with no products", { ...accessories10, targetType: "products", targetProducts: [] }],
    ["missing start date", { ...accessories10, startDate: null }],
    ["missing end date", { ...accessories10, endDate: null }],
    ["missing discount value", { ...accessories10, value: null }],
    ["percentage above 100", { ...accessories10, value: 120 }],
    ["end date equal to start date", { ...accessories10, endDate: "2026-06-16" }],
    ["end date before start date", { ...accessories10, startDate: "2026-06-20", endDate: "2026-06-16" }],
  ];

  it.each(invalidCases)("%s: sends no preview request and shows the explanatory empty state", async (_, values) => {
    // A valid sentinel preview mounted at the same time shares the debounce window: once its
    // result is on screen, the invalid one has had every chance to send a request.
    const { Wrapper } = createWrapper();
    render(<Previews subject={values} sentinel={accessories10} />, { wrapper: Wrapper });

    expect(within(region("subject")).getByText(EMPTY_STATE)).toBeTruthy();
    await waitForSettled(region("sentinel"), "11 products affected");

    const bodies = await Promise.all(previewBodies);
    expect(bodies.length).toBeGreaterThan(0);
    for (const body of bodies) expect(body).toMatchObject({ targetCategory: "accessories", value: 10 });
    expect(within(region("subject")).getByText(EMPTY_STATE)).toBeTruthy();
    expect(within(region("subject")).queryByText(/products? affected/)).toBeNull();
  });

  it("an empty form sends nothing and shows the empty state", async () => {
    const { Wrapper } = createWrapper();
    render(<Previews subject={emptyPromotionForm} sentinel={accessories10} />, { wrapper: Wrapper });
    await waitForSettled(region("sentinel"), "11 products affected");
    expect((await Promise.all(previewBodies)).every((b) => b.targetCategory === "accessories")).toBe(true);
    expect(within(region("subject")).getByText(EMPTY_STATE)).toBeTruthy();
  });

  it("a form that becomes invalid drops the old result and shows the empty state", async () => {
    const { Wrapper } = createWrapper();
    const { rerender } = render(<Previews subject={accessories10} />, { wrapper: Wrapper });
    await waitForSettled(region("subject"), "11 products affected");

    rerender(<Previews subject={{ ...accessories10, value: 120 }} />);
    expect(within(region("subject")).getByText(EMPTY_STATE)).toBeTruthy();
    expect(within(region("subject")).queryByText("11 products affected")).toBeNull();
  });
});

describe("PromotionPreview: valid form", () => {
  it("accessories 10% off: sends a preview request and lists affected products with new prices, no conflicts", async () => {
    const { Wrapper } = createWrapper();
    render(<PromotionPreview values={accessories10} />, { wrapper: Wrapper });

    await waitForSettled(document.body, "11 products affected");
    const [body] = await Promise.all(previewBodies);
    expect(body).toMatchObject({
      discountType: "percentage_off",
      value: 10,
      startDate: "2026-06-16",
      endDate: "2026-06-20",
      targetType: "category",
      targetCategory: "accessories",
    });

    expect(screen.getByText(/no conflicts/i)).toBeTruthy();
    // p-040 Wool Scarf 249.90 → 224.91; p-041 Leather Belt 199.90 → 179.91
    const scarf = screen.getByText("Wool Scarf").closest("tr")!;
    expect(within(scarf).getByText(tl(224.91))).toBeTruthy();
    expect(within(scarf).getByText(tl(249.9))).toBeTruthy();
    const belt = screen.getByText("Leather Belt").closest("tr")!;
    expect(within(belt).getByText(tl(179.91))).toBeTruthy();
  });

  it("tops overlapping the active sale shows 10 conflicts naming 'Summer Tops Sale'", async () => {
    const { Wrapper } = createWrapper();
    render(<PromotionPreview values={{ ...accessories10, targetCategory: "tops" }} />, { wrapper: Wrapper });

    await waitForSettled(document.body, "10 products affected");
    expect(screen.getByText(/10 conflicts/i)).toBeTruthy();
    const items = screen.getAllByRole("listitem").filter((li) => li.textContent?.includes("overlapping"));
    expect(items).toHaveLength(10);
    for (const li of items) expect(li.textContent).toContain("Summer Tops Sale");
    expect(screen.queryByText(/no conflicts/i)).toBeNull();
  });
});

describe("PromotionPreview: values change", () => {
  it("rerendering 10% → 50% ends on the result for the new value", async () => {
    const { Wrapper } = createWrapper();
    const { rerender } = render(<PromotionPreview values={accessories10} />, { wrapper: Wrapper });
    await waitForSettled(document.body, tl(224.91));

    rerender(<PromotionPreview values={{ ...accessories10, value: 50 }} />);
    // Wool Scarf 249.90 * 0.5 = 124.95
    await waitForSettled(document.body, tl(124.95));
    expect(screen.queryByText(tl(224.91))).toBeNull();
  });

  it("a slow response for the old value never replaces the result for the new value", async () => {
    let slowResolved!: () => void;
    const slowDone = new Promise<void>((r) => (slowResolved = r));
    // Delay only the 10% request, then fall through to the real handler.
    server.use(
      http.post("/api/promotions/preview", async ({ request }) => {
        const body = (await request.clone().json()) as { value: number };
        if (body.value === 10) {
          await delay(1200);
          setTimeout(slowResolved, 0);
        }
        return undefined;
      })
    );

    const { Wrapper } = createWrapper();
    const { rerender } = render(<PromotionPreview values={accessories10} />, { wrapper: Wrapper });
    // Wait until the 10% request is actually in flight, then change the value.
    await waitFor(() => expect(previewBodies.length).toBe(1), { timeout: 3000 });
    rerender(<PromotionPreview values={{ ...accessories10, value: 50 }} />);

    await waitForSettled(document.body, tl(124.95));
    await slowDone;
    // Give React a chance to apply anything the slow response could have triggered.
    await waitFor(() => expect(screen.queryByText("Updating preview…")).toBeNull());
    expect(screen.getByText(tl(124.95))).toBeTruthy();
    expect(screen.queryByText(tl(224.91))).toBeNull();
  });
});

describe("PromotionPreview: rendering stability", () => {
  it("does not re-render periodically while the form is valid and unchanged", async () => {
    let commits = 0;
    const onRender = () => {
      commits += 1;
    };
    const { Wrapper } = createWrapper();
    render(
      <Profiler id="preview" onRender={onRender}>
        <PromotionPreview values={accessories10} />
      </Profiler>,
      { wrapper: Wrapper }
    );
    await waitForSettled(document.body, tl(224.91));

    const settledCommits = commits;
    // Deliberate, short observation window: nothing changes, so nothing should commit.
    await act(() => new Promise((resolve) => setTimeout(resolve, 1500)));
    expect(commits).toBe(settledCommits);
    expect(previewBodies).toHaveLength(1);
  });

  it("keeps the previous result visible (dimmed) until the result for the new value arrives", async () => {
    let releaseNew!: () => void;
    const newGate = new Promise<void>((r) => (releaseNew = r));
    let newStarted!: () => void;
    const newRequested = new Promise<void>((r) => (newStarted = r));
    // Hold only the 50% request, then fall through to the real handler.
    server.use(
      http.post("/api/promotions/preview", async ({ request }) => {
        const body = (await request.clone().json()) as { value: number };
        if (body.value === 50) {
          newStarted();
          await newGate;
        }
        return undefined;
      })
    );

    const OLD = tl(224.91);
    const NEW = tl(124.95);
    const { Wrapper } = createWrapper();
    const { rerender } = render(<PromotionPreview values={accessories10} />, { wrapper: Wrapper });
    await waitForSettled(document.body, OLD);

    // From here on, every DOM change must leave the old or the new price on screen.
    const blankMoments: string[] = [];
    const observer = new MutationObserver(() => {
      const text = document.body.textContent ?? "";
      if (!text.includes(OLD) && !text.includes(NEW)) blankMoments.push(text.slice(0, 120));
    });
    observer.observe(document.body, { childList: true, subtree: true, characterData: true });

    try {
      rerender(<PromotionPreview values={{ ...accessories10, value: 50 }} />);
      expect(screen.getByText(OLD)).toBeTruthy();

      await newRequested;
      await waitFor(() => expect(screen.getByText("Updating preview…")).toBeTruthy());
      expect(screen.getByText(OLD)).toBeTruthy();
      expect(screen.queryByText(NEW)).toBeNull();

      releaseNew();
      await waitForSettled(document.body, NEW);
      expect(screen.queryByText(OLD)).toBeNull();
    } finally {
      observer.disconnect();
      releaseNew();
    }
    expect(blankMoments).toEqual([]);
  });
});
