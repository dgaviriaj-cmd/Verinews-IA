# VeriNews AI migration plan — HTML5/CSS3/JavaScript + Python

## Protection and strategy
- Do not push changes directly to `main`.
- Work exclusively in `migration/html-css-js-python`, created from `main`.
- Keep each phase reviewable. Use pull requests to merge only after manual validation.
- This is an academic project, not a commercial service. Avoid billing-dependent hosting, paid runners, paid cloud services, and payment setup.
- GitHub Actions workflows have been removed from this migration branch because hosted-runner access is blocked by account billing. Validate locally with documented commands instead.
- Hosting/deployment is optional and must use a no-cost solution only if available and suitable; focus first on a locally runnable academic web app.

## Target stack
- Frontend target: semantic HTML5, CSS3, vanilla JavaScript.
- Backend target: Python 3.12 with Flask.
- Local development: Python virtual environment and browser.
- No required external hosting or paid CI.

## Interface requirement (must not regress)
Preserve the current interface as closely as possible: layout, palette, typography, sidebar, header, modules, responsive behavior, icons, states, dialogs, and navigation. No visual redesign. Before replacing React components, inventory screenshots and functionality and implement one module at a time.

## Migration phases
1. **Safe baseline and local Python scaffold (this branch):** add Python dependency manifest and Flask app skeleton. Existing frontend source remains unchanged.
2. **Frontend inventory and visual baseline:** document views, components, CSS, assets, behaviors, local storage keys, and browser integrations. Capture comparison screenshots if available.
3. **Static frontend conversion:** convert shell and navigation to HTML/CSS/JS, preserve styling and assets; test mobile and desktop.
4. **Module migration:** move Overview, Detector, Comparator, Metrics, History, Settings one by one; maintain existing storage format where feasible.
5. **Python AI/data layer:** port or reimplement classification, feature extraction, model evaluation, metrics, and experiment handling with test coverage. Verify outputs against current TypeScript baseline; do not silently alter academic methodology.
6. **Integrations:** evaluate OAuth/Google Drive/GitHub backup flows; preserve or clearly document browser-based behavior and security boundaries.
7. **QA:** unit tests, API tests, local build/smoke checks, visual comparisons, and PR review. Deployment is optional and must not require paid services.

## Current phase limitations
- Frontend is still the current React/TypeScript implementation; this is a scaffold, not completed migration.
- Classifiers are not yet migrated to Python.
- No UI files have been modified in this first commit.
- Do not deploy or configure paid services. Test locally first.

## Acceptance criteria
- Main branch untouched until approved PR merge.
- Existing UI behavior and design preserved.
- Frontend source uses HTML5/CSS3/vanilla JavaScript after conversion.
- Backend and AI processing run in Python.
- No SQL/NoSQL service introduced unless the academic requirements change.
- Application can be run and tested locally with documented instructions.
