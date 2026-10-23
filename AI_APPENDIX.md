# AI Appendix

## Tools and models

| Tool | Model | Used for |
|---|---|---|
| Claude Code (desktop app, Code tab) | Claude Opus 5.5 (`claude-opus-5-5`) | Reviewing the starter repository, planning, writing the code and tests, running tests/build, checking the app in the built-in browser |
| Claude Code subagents (Analyst, QA, Code Reviewer, Frontend Engineer) | Same model as the session (subagents inherit it) | The multi-agent verification round described below |
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

## Multi-agent verification round (after the first implementation)

This prompt came **after** the app was already implemented, so it did not shape the architecture.
It turned the next step into an independent verification round with separate roles. Claude Code ran
real subagents for each role. The main session acted as Engineering Manager: it wrote each
agent's brief, file ownership and acceptance criteria, and checked every report before acting on
it.

<details>
<summary>Process prompt (verbatim)</summary>

```text
Bu projeyi gerçek subagent’larla geliştireceğiz. Ana agent olarak sen Engineering Manager / Tech Lead rolünü üstlen. Aşağıdaki uzman agent’ları gerektiğinde oluştur ve görevlerini koordine et.

Amaç çok sayıda agent çalıştırmak değil; gereksinim analizi, uygulama ve doğrulamayı birbirinden ayırarak sade ve doğru bir çözüm üretmek.

Önce docs altındaki case dokümanını, README’yi ve mevcut kaynak kodu incele. Kullanıcının mevcut kararlarını ve proje talimatlarını bütün agent’lara aktar.

AGENT ROLLERİ

1. ENGINEERING MANAGER / TECH LEAD — Ana agent

Sorumlulukları:
- Kullanıcının beklentileri ve case gereksinimleri için nihai sorumluluğu taşır.
- Uzmanların bulgularını birleştirir ve mimari kararları verir.
- İşi küçük, doğrulanabilir task’lara böler.
- Bağımlılıkları, dosya sahipliğini ve paralel çalışma sınırlarını belirler.
- Agent’lar arasındaki anlaşmazlıkları doküman, kod ve test kanıtıyla çözer.
- Değişikliklerin entegrasyonunu ve teslim kontrollerini yönetir.
- Kullanıcıya önemli kararları, gerçek bulguları ve kalan işleri bildirir.

Yetki sınırları:
- Zorunlu gereksinimleri kendi kararıyla kaldırmaz.
- Kapsamı sebepsiz büyütmez.
- Reviewer’ın her önerisini otomatik olarak geliştirme görevine dönüştürmez.
- Bir agent’ın “bitti” demesini tek başına yeterli kabul etmez.

Çıktıları:
- Kısa mimari karar kaydı.
- Task listesi ve görev dağılımı.
- Doğrulama sonuçlarına dayalı teslim özeti.


2. REQUIREMENTS & API ANALYST — Gereksinim ve sözleşme analisti

Sorumlulukları:
- PDF’deki zorunlu gereksinimleri ve bonusları çıkarır.
- README ile gerçek MSW handler davranışlarını karşılaştırır.
- Endpoint’lerin request/response biçimlerini, hata kodlarını ve sınır durumlarını belgeler.
- Belirsizlikleri ve kaynaklar arasındaki farklılıkları Manager’a bildirir.
- Her gereksinimi gözlemlenebilir kabul kriterine dönüştürür.

Özellikle inceleyeceği konular:
- Redux Toolkit ve TanStack Query’nin zorunlu kullanım alanları.
- Ürün listesi ve detay cevaplarının farkları.
- 409/422 hata yapıları ve 204 boş cevap.
- Tarih sınırları, scheduled conflict ve fiyat hesaplama kuralları.
- Preview’da eksik hedef ile boş hedef arasındaki davranış farkı.
- Zorunlu özellikler ile isteğe bağlı özelliklerin ayrımı.

Yetki sınırları:
- Üretim kodunu değiştirmez.
- Kendi ürün tercihlerini doküman gereksinimi gibi sunmaz.
- Mock API’nin davranışını otomatik olarak ideal veya güvenli kabul etmez.

Çıktısı:
Gereksinim → kaynak → kabul kriteri → ilgili API davranışı eşleştirmesi.
Yalnızca geliştirmeyi yönlendirecek kadar kısa ve somut tutar.


3. FRONTEND ENGINEER — Uygulama geliştiricisi

Sorumlulukları:
- Manager’ın onayladığı task’ları uygular.
- React/TypeScript ekranlarını, ortak bileşenleri ve SCSS stillerini geliştirir.
- API katmanını, Query hook’larını, Redux slice’larını ve routing’i kurar.
- Loading, empty, error, validation ve success durumlarını tamamlar.
- API sözleşmesine uygun ve tip güvenli kod yazar.
- Değiştirdiği davranış için uygun temel kontrolleri çalıştırır.
- Tester ve Reviewer tarafından doğrulanan sorunları düzeltir.

Özellikle dikkat edeceği konular:
- Redux–Query senkronizasyonunun tek yerde yönetilmesi.
- Mutation sonrasında ürün listesi ve detaylarının güncelliği.
- Sunucu taraflı filtreleme ve sayfalama.
- Form değerlerinin hata durumlarında korunması.
- Geçersiz hedeflerde preview gönderilmemesi.
- Ant Design üzerinde tutarlı, okunabilir masaüstü arayüzü.

Yetki sınırları:
- Kendisine atanmış dosya kapsamı dışına çıkmadan önce Manager’a bildirir.
- Testi geçirmek için beklenen davranışı veya API sözleşmesini değiştirmez.
- Mock handler ve seed verilerini uygulamayı kolaylaştırmak için değiştirmez.
- Gereksiz genel amaçlı altyapı veya soyutlama eklemez.

Devir çıktısı:
- Değişen davranış ve dosyalar.
- Çalıştırdığı kontroller.
- Bilinen sınırlamalar.
- Tester’ın doğrulaması gereken senaryolar.


4. QA / TEST ENGINEER — Bağımsız davranış doğrulayıcısı

Sorumlulukları:
- Test senaryolarını geliştiricinin kodundan önce kabul kriterlerine göre tasarlar.
- İş mantığı için anlamlı unit testler yazar.
- Kritik API/UI akışlarını uygun entegrasyon testleriyle doğrular.
- Mümkün olan kullanıcı akışlarını tarayıcıda kontrol eder.
- Hataları yeniden üretilebilir adımlarla raporlar.
- Düzeltmeden sonra ilgili senaryoyu ve gerekli regresyon kontrollerini tekrar çalıştırır.

Özellikle doğrulayacağı konular:
- UTC tarih sınırları ve indirim hesaplamaları.
- 409/422 sonrasında formun ve hata mesajlarının davranışı.
- Başarılı mutation sonrasında Redux ve ekran verilerinin tutarlılığı.
- İlk aramanın “shirt” olması ve aramanın temizlenebilmesi.
- Filtre ve sayfalama parametrelerinin API’ye doğru gönderilmesi.
- Preview’ın hedef değişimi ve temizlenmesi sırasında doğru davranması.

Test disiplini:
- Tarihi deterministik hale getirir.
- Değişen mock verisini testler arasında sıfırlar.
- Asenkron işlemler için keyfî bekleme süreleri kullanmaz.
- Test beklentisini yalnızca mevcut implementation’a bakarak belirlemez.

Yetki sınırları:
- Üretim kodunu kendiliğinden düzeltmez; bulguyu geliştiriciye devreder.
- Test başarısızlığını gizlemek için assertion kaldırmaz.
- Çalıştırılmayan testi veya tarayıcı kontrolünü başarılı saymaz.

Bulgu çıktısı:
- Senaryo ve yeniden üretme adımları.
- Beklenen / gerçekleşen davranış.
- Kanıt ve kullanıcıya etkisi.
- Düzeltme sonrası doğrulama sonucu.


5. CODE REVIEWER — Bağımsız kod ve güvenlik inceleyicisi

Sorumlulukları:
- Geliştiricinin açıklamasına güvenmekle yetinmeden ilgili kodu okur.
- Gereksinim uyumunu, veri akışını, bakım kolaylığını ve hata yönetimini inceler.
- Güvenlik açısından kullanıcı girdileri, API metinlerinin render edilmesi,
  secret kullanımı ve bağımlılık bulgularını değerlendirir.
- Testlerin kritik davranışı gerçekten kontrol edip etmediğini inceler.
- Gereksiz karmaşıklığı ve mükerrer state yönetimini tespit eder.

Yetki sınırları:
- İncelediği değişikliği kendisi yeniden yazmaz.
- Kişisel kod stilini zorunlu düzeltme gibi sunmaz.
- Varsayımsal riski doğrulanmış açık olarak raporlamaz.
- “Güvenlik açığı yok” şeklinde kapsamı aşan güvence vermez.

Bulgu sınıfları:
- Engelleyici: Gereksinim ihlali, yanlış fiyat, veri tutarsızlığı veya
  kanıtlanmış önemli güvenlik sorunu.
- Düzeltilmeli: Somut etkisi olan doğruluk veya bakım problemi.
- İsteğe bağlı: Teslimi engellemeyen iyileştirme.

Her bulguda ilgili dosyayı, gerekçeyi, oluşma koşulunu ve mümkün olan
en küçük düzeltmeyi belirtir.


ÇALIŞMA VE DEVİR KURALLARI

- Uzman agent’lar Manager’a rapor verir; kendiliğinden yeni agent oluşturmaz.
- Her task’ın tek bir uygulama sahibi olur.
- Aynı dosyaya eşzamanlı yazılmaz.
- QA test dosyalarını, Frontend Engineer üretim dosyalarını sahiplenir.
- Ortak config veya bağımlılık değişiklikleri Manager tarafından koordine edilir.
- Analyst ve Reviewer varsayılan olarak salt okunur çalışır.
- Her agent’a yalnızca rol adı değil, somut görev ve ilgili bağlam gönderilir.

Task şablonu:
- Task ID ve amaç
- Sorumlu agent
- Girdi ve bağımlılıklar
- Değiştirebileceği dosyalar
- Kabul kriterleri
- Doğrulama yöntemi
- Beklenen devir çıktısı

Task durumları:
Hazır → Geliştiriliyor → Doğrulanıyor → İnceleniyor → Tamamlandı

Hata bulunursa task ilgili kanıtla geliştiriciye geri döner.
Doğrulama yapılamıyorsa durum açıkça raporlanır; tamamlanmış sayılmaz.


BU PROJEDE İLERLEME SIRASI

1. Analyst gereksinimleri ve API sözleşmesini çıkarır.
2. Manager mimari kararları ve task sınırlarını belirler.
3. Frontend Engineer ilk task’ı uygular; QA aynı kabul kriterlerinden
   bağımsız test senaryolarını hazırlayabilir.
4. QA davranışı doğrular, Reviewer kodu inceler.
5. Manager gerekli düzeltmeleri atar ve sonuçları birleştirir.
6. Zorunlu akışlar tamamlandıktan sonra bonus preview’a geçilir.

Bu küçük projede her dosya için ayrı inceleme turu açma.
Birbiriyle ilişkili değişiklikleri anlamlı task’lar halinde değerlendir.

AI_APPENDIX.md için gerçek promptları, önemli insan kararlarını,
tespit edilen AI hatalarını ve doğrulama kanıtlarını süreç boyunca kaydet.
Gerçekte çalıştırılmayan agent veya kontrol rapora eklenmesin.

Şimdi önce Analyst görevini başlat. Bulgular geldikten sonra kısa görev
dağılımını paylaş ve mevcut kapsam içinde uygulamaya devam et.
```

</details>

Claude kept the roles but adapted the prompt to the existing code. The Analyst audited the code
against the PDF instead of starting from scratch, and every brief listed the decisions already
made so they would not be reopened.

### What actually ran

| Agent | Mode | Result |
|---|---|---|
| Requirements & API Analyst | read-only | Every mandatory requirement was met, each mapped to file:line evidence. It found: the AI_APPENDIX TODO, commits not yet pushed, a 409 alert that stayed after the target or dates changed (G3), "submit not disabled while the preview shows conflicts" (G4), and stale wording in this appendix (G5). |
| QA, round 1 | new test files only | 21 tests written from the acceptance criteria (product list filters and paging, preview). No app bug found. It corrected one wrong expectation of its own (p-012 is on page 2). |
| Code Reviewer | read-only | No blocking issues; `npm audit` 0 vulnerabilities; no XSS sinks or secrets. It found: (1) a preview render loop every 400 ms, (2) the mock-reconnect fix skipping POST/DELETE, (3–4) missing tests for the stale-list guard and for delete, and smaller items: a possible duplicate row, the preview not dimming as documented, ids not encoded in links. |
| Frontend Engineer | assigned production files only | Fixed G3 and Reviewer items 1, 2, 5, 6 and 7. It did not check the browser and said so. |
| QA, round 2 | test files only | 12 more tests. All 7 tests for the fixes failed on the pre-fix code and pass now. It showed that a single-tree stale-list test could not detect the bug the guard prevents, and replaced it with a two-tree test that does. |

### Manager decisions

- **G4 not changed.** The preview is advisory and debounced, so the API's 409 remains what blocks
  submission. The PDF requirement ("block submission and display the conflict details returned by
  the API") is met by that.
- **Reviewer item 2 verified before assigning.** Claude checked it with `curl`: a POST or DELETE
  that bypasses the mock gets a 404 with no content type.
- **Final integration checks run by the Manager:**
  - typecheck;
  - two full test runs (118/118);
  - production build and `npm audit`;
  - in the browser: a DELETE after the service worker forgot the page reconnects and succeeds.

### Evidence

- Tests: 82 before the round, 106 after QA round 1, 118 after round 2.
- The agents' reports are summarised here; the full transcripts stay in the Claude Code session.

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

### 3. Conflicts with scheduled promotions were invisible in the UI

**What the AI got wrong:** Claude's UI showed only promotions that are active today. In the
product list, Linen Shirt Dress showed "No promotion". Yet creating a promotion for it was
rejected as a conflict. The reason was the scheduled "New Arrivals Preview" (26–29 Oct), which the
API's conflict check counts but the UI never showed.

**How I caught it:** I tried to create a promotion for that product in the running app and
compared the result with the product list (screenshots of both).

**Fix:**
- The product list shows "Next: <promotion> · from <date>" for an upcoming promotion.
- Conflict messages say that scheduled promotions count.
- The form lists the active and scheduled promotions already covering the chosen products or
  category, including single-product promotions inside a category, and marks the ones that overlap
  the chosen dates.
- Rules are in `domain/targeting.ts` with tests; there is a form test for the dresses case.

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
- **Enter submitted the form.** While verifying fix 3 in the browser, Claude saw validation errors
  appear without pressing the submit button. Pressing Enter to confirm a date (or a select option)
  triggered the browser's implicit form submission; with a complete form this would have saved the
  promotion. Earlier in the session Claude had wrongly dismissed the same symptom as leftover error
  text from an animation. Fix: Enter inside an input no longer submits the form. A test fails
  without the fix and passes with it.

### Errors found by the review agents

- **"Could not reach the server" (user-reported).** I saw this error in the running demo tab. Claude
  found the cause: an idle MSW service worker is restarted by the browser and forgets the page, so
  /api requests bypass the mock. Claude added reconnect-and-retry-once, outside the agent flow
  because it was a direct runtime bug report.
- **Claude's reconnect fix missed POST and DELETE.** The Code Reviewer agent found that Vite answers
  a bypassed POST or DELETE with a 404 that has no content type, so the reconnect never ran. Deleting
  would have shown a misleading "404" error. Claude confirmed it with `curl`, the Engineer agent
  fixed it, QA added tests, and Claude checked it in the browser.
- **Preview render loop.** Found by the Reviewer: a new request object was built on every render and
  fed to the debounce, so the preview re-rendered every 400 ms, even with the drawer closed. Fixed
  with `useMemo`; a Profiler-based test fails without the fix.
