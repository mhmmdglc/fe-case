# AI Appendix

## Tools and models

| Tool | Model | Used for |
|---|---|---|
| Claude Code (desktop app, Code tab) | Claude Opus 5.5 (`claude-opus-5-5`) | Reviewing the starter repository, planning, writing the code and tests, running tests/build, checking the app in the built-in browser |
| _TODO: fill in the tool and model that produced the second-opinion review (prompt 1 below)_ | _TODO_ | Independent review of Claude's first plan against the PDF and the mock API code |

Workflow:
1. Claude reviewed the starter repository and the case PDF and wrote a plan.
2. I had that plan reviewed independently.
3. I asked Claude to evaluate the review.
4. I fixed the final decisions (prompt 2) and only then let Claude implement.

Every step was verified with tests, `tsc`, a production build and a manual run in the browser.

## The two prompts that shaped the architecture

### Prompt 1: second-opinion review of the plan

Sent after Claude's first plan. The message contained the review below and, after it, a longer
draft implementation prompt (not repeated here). It is quoted verbatim up to that draft, except
for two links to local file paths, which were removed.

> şimdi sana yorumumu atıyorum. ona göre başlamadan attıgım yorumu değerlendirimisin. dogru mudur eksi kyeri var mıdır
>
> Planın ana yönü doğru; baştan yazmaya gerek yok. Ama uygulamaya geçmeden birkaç önemli noktayı netleştirirdim. PDF’yi ve mevcut kodu karşılaştırdım; projede değişiklik yapmadım.
> Özellikle şunlar düzeltilmeli:
>
> * Redux–TanStack Query ayrımı: “Create/delete sonrası Redux’u güncelle” yeterli değil. İlk yüklemede ve yeniden veri çekildiğinde de promosyonlar senkron kalmalı. PDF hem Redux ile promosyon yönetimini hem TanStack Query kullanımını istiyor.
> * Fiyatların güncel kalması: Promosyon değişince ürün listesinin yanında ürün detayları ve promosyon sorguları da güncellenmeli.
> * API hata formatı: `422` cevabı alan–mesaj nesnesi değil, `string[]`. Alanlara eşleme yapılmalı; eşlenemeyen mesajlar da görünmeli. Silme cevabı `204`, dolayısıyla her başarılı cevapta `response.json()` çalıştırılamaz.
> * Preview tespitinde küçük hata: `targetProductIds: []` bütün ürünleri döndürmüyor; boş sonuç döndürüyor. Alanın hiç gönderilmemesi bütün ürünlerin dönmesine yol açıyor. Kategori alanı eksik olduğunda da benzer sorun var.
> * Teslim ve güvenlik: Kaynaklarda şüpheli davranış görülmemesi, bağımlılıkların güvenli olduğunun kanıtı değil. Ayrıca mevcut MSW yalnızca geliştirme modunda açılıyor; `build` başarılı olsa bile `preview` altında API çalışmayacak.

**Why it mattered:** this review shaped how the API layer works. It led to:
- a single `ApiError` model that reads `string[]` errors and conflicts and handles empty 204
  bodies;
- invalidating product detail queries, not only the product list, after a promotion change;
- the `npm run demo` mode.

### Prompt 2: final decisions before implementation

> Değerlendirmeni kabul ediyorum. Önceki plan ve düzeltmeler üzerinden uygulamaya geçelim.
>
> Son kararlar:
> - URL senkronizasyonunu ilk sürümden çıkar; filtreleri Redux’ta koru.
> - Redux–Query senkronizasyonunu tek yerde yönet. Eski bir liste cevabının başarılı mutation sonucunu geri almamasını sağla.
> - Ürün listesinde doğru query key ve standart TanStack Query mekanizmaları kullan; özel bir istek sıralama altyapısı yazma. keepPreviousData kullanırsan eski verinin gösterildiği sırada yüklenme durumunu belirt.
> - Preview’da eski sonuçların güncel form sonucu gibi görünmemesini ayrıca kontrol et.
> - Sabit indirimin ürün fiyatını aşmasını reddetme; hesaplanan fiyatı 0’da sınırla.
> - Tarih testlerini deterministik yap; entegrasyon testlerinde değişen mock veritabanını ayrıca sıfırla.
> - Worker dosyasını repoya ekle ve çalıştırma adımlarını README’de belirt.
> - Status için ortak, UTC kullanan ve test edilmiş bir fonksiyon kullan.
> - Zorunlu unit testleri tamamla; entegrasyon testlerini başarılı create ve 409/422 akışlarına odakla.
> - Önce zorunlu ekranları bitir; ardından canlı preview bonusunu ekle.
> - AI_APPENDIX.md için gerçek promptları ve yakalanan gerçek hataları geliştirme boyunca kaydet.
>
> Yeni bir uzun değerlendirme turu yerine kısa uygulama sırasını belirtip kodlamaya başla. Çalışan, sade ve mülakatta açıklanabilir bir çözüm hedefle.

**Why it mattered:** these decisions became the core design:
- promotions reach Redux from a single query function, with a revision guard against stale list
  responses (`features/promotions/promotionsSlice.ts`, `queries.ts`);
- standard `keepPreviousData` with an explicit "Updating results…" state;
- a preview keyed by its request that dims outdated results;
- a UTC `getPromotionStatus`;
- filters kept in Redux rather than in the URL.

## AI errors I caught and corrected

### 1. Wrong claim about the preview endpoint

**What the AI got wrong:** Claude's first plan said that `POST /api/promotions/preview` with
`targetType: "products"` and no selected products returns all 50 products.

**How I caught it:** the review (prompt 1) compared this with `src/mocks/handlers.ts`:
- `if (targetType === "products" && targetProductIds)` is true for an empty array, so `[]`
  returns **no** products;
- all products are returned only when the field is **missing**, or when `targetCategory` is
  empty.

**Fix:** `buildPreviewRequest` returns `null` until the target is valid (at least one product, or a
category), so neither case is ever sent. Unit tests in `domain/promotionForm.test.ts` cover this.

### 2. Incomplete Redux sync and cache invalidation in the plan

**What the AI got wrong:** the first plan updated the Redux promotion list only after create and
delete, and after a promotion change it refetched only the product list. With that plan:
- Redux would not have been filled on first load or refetch;
- a cached product detail page would have shown an old effective price.

**How I caught it:** the review (prompt 1) checked the plan against the PDF requirement "keep the
Redux store in sync with the API response".

**Fix:**
- The list is synced from the query function on every fetch.
- A `revision` guard drops responses that are older than the last mutation.
- After a change, inactive product and promotion queries are removed and active ones are
  refetched.
- `promotionFlows.test.tsx` checks that the cached detail entry is gone and that the refetched list
  replaces Redux.

### Issues the AI caught in its own work during implementation

These were found by Claude while running the tooling. They are listed for completeness, not as my
own catches.

- **Node compatibility.** The newest Vitest (5.x) and jsdom (30.x) require Node 22, but this
  machine runs Node 20.19. This was caught by checking `npm view … engines` before installing.
  Vitest 4 and jsdom 27 were used instead.
- **Freezing the date in tests.** The first test setup froze `Date` inside the same file that
  imports the MSW server. ES module imports are hoisted, so the seed data (dates computed at import
  time) would have used the real date. The freeze was moved to a separate setup file that runs
  first (`src/test/freezeDate.ts`).
- **Wrong date in a test.** A test assumed "Black Friday Knitwear" is scheduled at today+15. The
  test failed, and reading `src/mocks/db.ts` showed today+7…+9. The test dates were corrected.
- **Hidden error alert.** While checking the form in the browser, the 409 conflict alert rendered
  above the visible part of the scrolled drawer. The form now scrolls server feedback into view.
