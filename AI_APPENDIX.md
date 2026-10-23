# AI Appendix

This file covers what the case asks for: the AI tools and models used, the two prompts that shaped
the architecture, and the AI errors I identified and corrected. Every prompt is given in English
translation, with the original Turkish text kept verbatim. Every error and check described here
happened during the project.

---

## 1. AI tools and models

| Tool | Model | Role in the project |
|---|---|---|
| Claude Code (desktop app) | Claude Opus 5.5 (`claude-opus-5-5`) | Main engineering partner: reviewing the starter and the case PDF, architecture planning, implementation, tests, and checks in the browser |
| Codex (OpenAI) | GPT Astra 6.0 | Independent second opinion: cross-checked Claude's architecture plan against the PDF and the mock API before any code was written |
| Claude Code subagents | Same model as the session | Separate roles (Requirements Analyst, QA Engineer, Code Reviewer, Frontend Engineer) for independent verification, the follow-up features and the architecture refactor |
| DeepSeek | — | Independent final check of the whole project after the refactor (see step 6 below) |

### How I worked

1. **Analysis and architecture before any code.**
   - With Claude (Opus 5.5) I reviewed the starter repository (including a security pass over the
     code, dependencies and the case PDF) and turned the PDF into a plan.
   - I then had the plan cross-checked by Codex (GPT Astra 6.0), compared the two views and fixed the open points.
     Examples: how Redux and TanStack Query share the promotion list, the real error shapes
     (422 `string[]`, 204 with no body), and the preview's empty-target behaviour.
   - Only after these decisions were written down (prompt 2) did implementation start.
2. **Task breakdown.** The decisions became small tasks that could each be checked on their own:
   setup, domain rules with tests, API/state layer, product screens, promotion management, preview,
   documentation. Each task ended in its own commit.
3. **Implementation with Claude, task by task.** Every task was checked before moving on: unit and
   integration tests, `tsc`, a production build, and the real flows in a browser (filters, 409/422,
   preview, delete). I reviewed each step and sent back corrections (sections 3.3 and 3.4).
4. **Independent verification with separate roles.** A second round used dedicated agents:
   - a read-only Analyst mapped every PDF requirement to file:line evidence;
   - QA wrote tests from the acceptance criteria, without reading the implementation;
   - a read-only Code Reviewer checked correctness and security;
   - an Engineer fixed only the findings that were approved.

   Claude acted as Engineering Manager: it verified each report before acting on it and ran the
   final checks itself.
5. **Architecture refactor for growth.** The code was reorganised so it can grow:
   - a feature-sliced layout with a React-free `services/` layer, configurable `VITE_API_BASE_URL`;
   - per feature: `hooks/`, `store/`, presentational `components/`, container `pages/`;
   - central route builders, lazy-loaded pages, and an "Adding a feature" checklist in the README.

   Behaviour did not change: the same 153 tests pass, with only import paths changed.
6. **Final check with DeepSeek.** After the refactor, I asked DeepSeek to check the whole
   project independently, as a last safety net before delivery.
   - **Scope.** DeepSeek re-ran the full test suite, typecheck, production build and demo build
     itself (`VITE_ENABLE_MOCKS=true`), all green with 153/153 tests. It also checked the repository
     state, the README and this appendix.
   - **Findings:**
     - two unfilled DeepSeek placeholders in this file;
     - a stale README limitation that still claimed a single 1.3 MB bundle without code
       splitting, although pages had been lazy-loaded since the refactor;
     - `.claude/` (local tool config) was not ignored by git;
     - the covered-products list for a category target loads at most 100 products;
     - the large Ant Design vendor chunk still triggers Vite's 500 kB warning;
     - a commit-sync note: the work had not yet been pushed to the assigned repository.
   - **Result:**
     - The README limitations were rewritten. While doing this, Claude also corrected a second
       stale wording ("Scheduled from" is now the "Next: <promotion>" hint).
     - `.claude/` was added to `.gitignore`.
     - The 100-product category page and the vendor chunk are documented as known limitations,
       not changed, since neither affects this case's data or an internal desktop tool.
     - This step was written up.
     - Behaviour did not change, and the suite still passes 153/153.

---

## 2. The two prompts that shaped the architecture

I wrote my prompts in Turkish. Each one is shown in English translation first; the original text
is kept verbatim in the collapsible block below it.

### Prompt 1: Codex's cross-check of the architecture plan

This message carried Codex's review (GPT Astra 6.0) of Claude's first plan. It was followed by a
longer draft implementation prompt, which is not repeated here. Both the translation and the
original stop before that draft; two links to local file paths were removed.

> I'm sending you my review now. Before we start, can you evaluate it: is it correct, is anything missing?
>
> The main direction of the plan is right; there is no need to rewrite it. But before implementation I would clarify a few important points. I compared the PDF with the existing code; I made no changes to the project.
> These in particular should be fixed:
>
> * Redux–TanStack Query split: "update Redux after create/delete" is not enough. Promotions must also stay in sync on the first load and whenever data is refetched. The PDF asks for promotion management with Redux and for TanStack Query.
> * Keeping prices current: when a promotion changes, product details and promotion queries must be refreshed too, not only the product list.
> * API error format: the `422` response is a `string[]`, not a field–message object. Messages should be mapped to fields, and unmapped messages must still be shown. A delete returns `204`, so `response.json()` cannot be called on every successful response.
> * A small mistake in the preview analysis: `targetProductIds: []` does not return all products; it returns an empty result. Leaving the field out entirely is what returns all products. A missing category field causes a similar problem.
> * Delivery and security: seeing no suspicious behaviour in the sources does not prove the dependencies are safe. Also, MSW currently only starts in development mode; even if `build` succeeds, the API will not work under `preview`.

<details>
<summary>Original prompt (Turkish, verbatim)</summary>

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

</details>

**Why it mattered:**
- It fixed the API layer: one typed `ApiError` model that reads 422 `errors` and 409 `conflicts`
  as `string[]`, and handles the bodiless 204 from DELETE.
- It required promotions in Redux to stay in sync with the API on every fetch, not only after
  create or delete.
- It required product details to be refreshed after a promotion changes, not only the list.
- It led to a demo mode, because the mock API only runs in development.

### Prompt 2: final architecture decisions before implementation

> I accept your evaluation. Let's move on to implementation based on the previous plan and the corrections.
>
> Final decisions:
> - Leave URL synchronisation out of the first version; keep the filters in Redux.
> - Manage Redux–Query synchronisation in one place. Make sure an old list response cannot undo the result of a successful mutation.
> - Use correct query keys and standard TanStack Query mechanisms for the product list; do not build a custom request-ordering mechanism. If you use keepPreviousData, show a loading state while the old data is displayed.
> - Separately check that old preview results never look like the result for the current form.
> - Do not reject a fixed discount that exceeds the product price; clamp the computed price at 0.
> - Make date tests deterministic; reset the mutable mock database in integration tests.
> - Add the worker file to the repo and document the run steps in the README.
> - Use one shared, tested function based on UTC for the status.
> - Complete the mandatory unit tests; focus integration tests on a successful create and the 409/422 flows.
> - Finish the mandatory screens first; then add the live preview bonus.
> - Record the real prompts and the real errors caught for AI_APPENDIX.md throughout development.
>
> Instead of another long evaluation round, state a short implementation order and start coding. Aim for a working, simple solution that I can explain in an interview.

<details>
<summary>Original prompt (Turkish, verbatim)</summary>

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

</details>

**Why it mattered:** these points became the core design.
- **Single sync point.** The promotion list reaches Redux only from the query function, and a
  revision guard drops list responses that started before a successful create or delete
  (`src/features/promotions/hooks/usePromotionQueries.ts`,
  `src/features/promotions/store/promotionsSlice.ts`).
- **Standard caching.** TanStack Query mechanisms only, with `keepPreviousData` and a visible
  "updating" state.
- **Preview.** Keyed by its request, never sent for an invalid target, and old results are
  dimmed rather than shown as current.
- **Dates.** One UTC `getPromotionStatus`, and deterministic tests with a frozen clock and a reset
  mock database.
- **Scope.** Mandatory screens first, the bonus after; filters stay in Redux, not in the URL.

### Supporting prompt: role-based verification process

I used this prompt after the first implementation to run the independent verification round
(step 4). It shaped how the work was checked, not the architecture.

<details>
<summary>Process prompt (English translation)</summary>

```text
We will develop this project with real subagents. As the main agent, you take the Engineering Manager / Tech Lead role. Create the specialist agents below when needed and coordinate their work.

The goal is not to run many agents; it is to produce a simple and correct solution by keeping requirements analysis, implementation and verification separate.

First review the case document under docs, the README and the existing source code. Pass the user's existing decisions and the project instructions on to every agent.

AGENT ROLES

1. ENGINEERING MANAGER / TECH LEAD — Main agent

Responsibilities:
- Owns the user's expectations and the case requirements in the end.
- Combines the specialists' findings and makes the architectural decisions.
- Splits the work into small, verifiable tasks.
- Sets dependencies, file ownership and the limits of parallel work.
- Resolves disagreements between agents with evidence from the document, the code and the tests.
- Manages integration of changes and the delivery checks.
- Reports important decisions, real findings and remaining work to the user.

Limits of authority:
- Does not drop mandatory requirements on its own.
- Does not grow the scope without a reason.
- Does not turn every reviewer suggestion into a development task automatically.
- Does not accept an agent saying "done" as enough on its own.

Outputs:
- A short architecture decision record.
- A task list and assignments.
- A delivery summary based on verification results.


2. REQUIREMENTS & API ANALYST

Responsibilities:
- Extracts the mandatory requirements and bonuses from the PDF.
- Compares the README with the real MSW handler behaviour.
- Documents the endpoints' request/response shapes, error codes and edge cases.
- Reports ambiguities and differences between sources to the Manager.
- Turns every requirement into an observable acceptance criterion.

Topics to examine in particular:
- Where Redux Toolkit and TanStack Query must be used.
- Differences between the product list and product detail responses.
- 409/422 error structures and the empty 204 response.
- Date boundaries, scheduled conflicts and price calculation rules.
- The difference in preview behaviour between a missing target and an empty target.
- Separating mandatory features from optional ones.

Limits of authority:
- Does not change production code.
- Does not present its own product preferences as document requirements.
- Does not automatically treat the mock API's behaviour as ideal or secure.

Output:
Requirement → source → acceptance criterion → related API behaviour mapping.
Kept short and concrete, only as much as development needs.


3. FRONTEND ENGINEER

Responsibilities:
- Implements the tasks approved by the Manager.
- Builds the React/TypeScript screens, shared components and SCSS styles.
- Sets up the API layer, Query hooks, Redux slices and routing.
- Completes loading, empty, error, validation and success states.
- Writes type-safe code that follows the API contract.
- Runs the basic checks appropriate for the behaviour it changed.
- Fixes problems verified by the Tester and the Reviewer.

Topics to pay particular attention to:
- Managing Redux–Query synchronisation in one place.
- Keeping the product list and details current after mutations.
- Server-side filtering and pagination.
- Keeping form values when errors occur.
- Not sending a preview for invalid targets.
- A consistent, readable desktop UI on Ant Design.

Limits of authority:
- Tells the Manager before going outside its assigned file scope.
- Does not change expected behaviour or the API contract to make a test pass.
- Does not change the mock handlers or seed data to make implementation easier.
- Does not add unnecessary general-purpose infrastructure or abstractions.

Handoff output:
- Changed behaviour and files.
- Checks it ran.
- Known limitations.
- Scenarios the Tester should verify.


4. QA / TEST ENGINEER — Independent behaviour verifier

Responsibilities:
- Designs test scenarios from the acceptance criteria before looking at the developer's code.
- Writes meaningful unit tests for the business logic.
- Verifies critical API/UI flows with suitable integration tests.
- Checks user flows in the browser where possible.
- Reports bugs with reproducible steps.
- After a fix, re-runs the related scenario and the needed regression checks.

Topics to verify in particular:
- UTC date boundaries and discount calculations.
- Form and error message behaviour after 409/422.
- Consistency of Redux and on-screen data after a successful mutation.
- The first search being "shirt" and the search being clearable.
- Filter and pagination parameters being sent to the API correctly.
- Preview behaving correctly when the target changes or is cleared.

Test discipline:
- Makes dates deterministic.
- Resets the mutable mock data between tests.
- Does not use arbitrary waits for async work.
- Does not derive test expectations only from the current implementation.

Limits of authority:
- Does not fix production code itself; hands the finding to the developer.
- Does not remove assertions to hide a failing test.
- Does not count a test or browser check that was not run as passed.

Finding output:
- Scenario and reproduction steps.
- Expected / actual behaviour.
- Evidence and user impact.
- Verification result after the fix.


5. CODE REVIEWER — Independent code and security reviewer

Responsibilities:
- Reads the relevant code instead of relying on the developer's description.
- Reviews requirement compliance, data flow, maintainability and error handling.
- For security, evaluates user input, rendering of API text,
  use of secrets and dependency findings.
- Checks whether the tests really cover the critical behaviour.
- Spots unnecessary complexity and duplicated state management.

Limits of authority:
- Does not rewrite the change it reviews.
- Does not present personal code style as a required fix.
- Does not report a hypothetical risk as a confirmed vulnerability.
- Does not give out-of-scope assurances such as "there are no security vulnerabilities".

Finding classes:
- Blocking: a requirement violation, a wrong price, inconsistent data or
  a proven, significant security issue.
- Should fix: a correctness or maintainability problem with a concrete impact.
- Optional: an improvement that does not block delivery.

Each finding states the file, the reason, the condition under which it happens
and the smallest possible fix.


WORKING AND HANDOFF RULES

- Specialist agents report to the Manager; they do not create new agents on their own.
- Every task has a single implementation owner.
- No two agents write to the same file at the same time.
- QA owns the test files; the Frontend Engineer owns the production files.
- Shared config or dependency changes are coordinated by the Manager.
- The Analyst and the Reviewer are read-only by default.
- Every agent receives a concrete task and the relevant context, not just a role name.

Task template:
- Task ID and goal
- Responsible agent
- Inputs and dependencies
- Files it may change
- Acceptance criteria
- Verification method
- Expected handoff output

Task states:
Ready → In development → Verifying → In review → Done

If a bug is found, the task goes back to the developer with the evidence.
If verification cannot be done, that is reported clearly and the task does not count as done.


ORDER OF WORK IN THIS PROJECT

1. The Analyst extracts the requirements and the API contract.
2. The Manager sets the architecture decisions and task boundaries.
3. The Frontend Engineer implements the first task; QA can prepare
   independent test scenarios from the same acceptance criteria.
4. QA verifies the behaviour and the Reviewer reviews the code.
5. The Manager assigns the necessary fixes and combines the results.
6. After the mandatory flows are complete, move on to the bonus preview.

In this small project, do not open a separate review round for every file.
Evaluate related changes together as meaningful tasks.

Throughout the process, record the real prompts, important human decisions,
the AI errors found and the verification evidence for AI_APPENDIX.md.
Do not add agents or checks that were not actually run to the report.

Now start the Analyst task first. Once the findings arrive, share a short
task assignment and continue implementation within the current scope.
```

</details>

<details>
<summary>Original process prompt (Turkish, verbatim)</summary>

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

---

## 3. AI errors I identified and corrected

### 3.1 Wrong claim about the preview endpoint

- **What the AI got wrong:** Claude's first plan said that `POST /api/promotions/preview` with
  `targetType: "products"` and no selected products returns all 50 products.
- **How it was caught:** Codex's cross-check (prompt 1) compared this with
  `src/mocks/handlers.ts`. An empty array returns **no** products; all products come back only
  when the field is **missing**, or when the category is empty.
- **Correction:** `buildPreviewRequest` returns `null` until the target is valid, so neither case
  is ever sent. This is covered by unit tests in `src/domain/promotionForm.test.ts`.

### 3.2 Incomplete Redux sync and cache invalidation in the plan

- **What the AI got wrong:** the plan updated Redux only after create and delete, and refreshed
  only the product list after a promotion change. As a result:
  - Redux would not have been filled on first load or on refetch;
  - a cached product detail page could show an old price.
- **How it was caught:** Codex's cross-check against the PDF requirement "keep the Redux store in
  sync with the API response".
- **Correction:**
  - One sync point in the query function, with a revision guard.
  - After a change, cached product and promotion queries that are off screen are removed, and the
    ones on screen are refetched.
  - A two-tree integration test fails if the guard is broken.

### 3.3 Conflicts with scheduled promotions were invisible

- **What the AI got wrong:** the UI only showed promotions that are active today. In the product
  list, "Linen Shirt Dress" showed "No promotion", yet creating a promotion for it was rejected as
  a conflict. The API also counts the scheduled "New Arrivals Preview".
- **How I caught it:** I tried it in the running app and compared the product list with the
  conflict message.
- **Correction:**
  - The product list shows the upcoming promotion.
  - Conflict messages explain that scheduled promotions count.
  - The form lists the active and scheduled promotions already covering the chosen products or
    category, including single-product promotions inside a category, and marks the ones that
    overlap the chosen dates.

### 3.4 "Could not reach the server", and a fix that missed POST/DELETE

- **What went wrong:** I saw this error in a tab that had been idle for a while. The browser had
  restarted MSW's service worker, the restarted worker forgot the page, and /api requests went to
  the real network.
- **First AI error:** Claude added reconnect-and-retry-once, but only for network errors and HTML
  responses.
- **How it was caught:** the Code Reviewer agent found that Vite answers a bypassed POST or DELETE
  with a 404 that has no content type. Deleting would have shown a misleading "404". Claude
  confirmed it with `curl`.
- **Correction:**
  - Any response that is not JSON and not a 204 now counts as "not reached".
  - Tests cover POST, DELETE, and a real JSON 404, which must not trigger a reconnect.
  - Claude also checked it in the browser.

### 3.5 Pressing Enter in a field submitted the form

- **What the AI got wrong:** while checking the form in the browser, Claude first dismissed
  unexpected validation errors as leftover text from an animation. They were real: confirming a
  date or a select option with Enter triggered the browser's implicit form submit. With a complete
  form, this would have saved a promotion nobody had finished reviewing.
- **How it was caught:** the same symptom appeared again during a later browser check. This time
  Claude reproduced it with a real key press.
- **Correction:** Enter inside an input no longer submits the form; only the button does. A test
  fails without the fix and passes with it.

### Other issues found during verification

- **Preview render loop** (Code Reviewer): a new request object on every render restarted the
  debounce, so the preview re-rendered every 400 ms, even with the drawer closed. Fixed with
  `useMemo`; a Profiler-based test fails without the fix.
- **Wrong text and price in the delete dialog** (Engineer agent, from Claude's own task
  contract): it said "1 product go back", and showed base price for a product another promotion
  discounts today. Both fixed.
- **Tooling and test setup** (found by Claude itself):
  - the newest Vitest and jsdom need Node 22; the project uses compatible versions for Node 20;
  - the clock was frozen after the mock seed had already been imported (ES module hoisting);
  - one test assumed the wrong seed date for a scheduled promotion.

---

## Verification summary

- 153 tests: unit tests for the business rules, plus integration tests against the real MSW
  handlers with a frozen clock and a reset mock database.
- `tsc` (no unused locals), the production build, and `npm audit` (0 vulnerabilities at the time
  of writing).
- Main flows checked in a browser after every round: filters and paging, product and promotion
  detail, 409/422 handling, live preview, delete impact, Duplicate, and mock reconnect.
