import test from 'node:test';
import assert from 'node:assert/strict';
import {
  MODEL_CATALOG,
  detectLanguage,
  extractArticleFromHtml,
  getEngineRuntimeSummary,
  isValidPublicHttpUrl,
  normalizeText,
  runInference,
} from './nlpEngine';
import { evaluateModelOnTestSplit } from './metricsEvaluator';
import { DEFAULT_SETTINGS, exportHistoryToCsv, exportHistoryToJson } from './storageModel';
import { buildProjectZipFromMap, normalizeArchiveEntries } from './projectArchiveModel';
import {
  collectWorkspaceFilesSync,
  sanitizeGithubRepoName,
  shouldIncludeWorkspaceFile,
  validateGithubBranchName,
} from './githubRepoUtils';
import {
  buildTimestampedZipName,
  validateDriveFolderName,
} from '../controllers/DriveExportController';
import { DetectorController } from '../controllers/DetectorController';
import { HistoryController } from '../controllers/HistoryController';
import JSZip from 'jszip';

test('normalizeText strips HTML tags and diacritics consistently', () => {
  const cleaned = normalizeText('<p>¡Comunicado <strong>Oficial</strong> en España!</p>');
  assert.equal(cleaned, 'comunicado oficial en espana');
});

test('detectLanguage differentiates Spanish from English and short strings', () => {
  assert.equal(
    detectLanguage('Según el informe oficial publicado por el ministerio durante la semana.'),
    'es'
  );
  assert.equal(
    detectLanguage('According to the official report published by the committee this week.'),
    'other'
  );
  assert.equal(detectLanguage('hola'), 'unknown');
});

test('isValidPublicHttpUrl rejects private IPs, localhost, and non-HTTP schemes', () => {
  assert.equal(isValidPublicHttpUrl('https://ejemplo.org/noticia').valid, true);
  assert.equal(isValidPublicHttpUrl('http://localhost:3000/api').valid, false);
  assert.equal(isValidPublicHttpUrl('http://192.168.1.10/admin').valid, false);
  assert.equal(isValidPublicHttpUrl('http://127.0.0.1/secret').valid, false);
  assert.equal(isValidPublicHttpUrl('ftp://archivo.org/news').valid, false);
});

test('extractArticleFromHtml extracts title and article paragraphs while removing scripts', () => {
  const sampleHtml = `
    <html>
      <head>
        <meta property="og:title" content="Informe sanitario anual en espa&ntilde;ol" />
        <script>alert("noise")</script>
      </head>
      <body>
        <article>
          <p>Este es el primer párrafo informativo del comunicado oficial sobre salud pública.</p>
          <p>El segundo párrafo describe los resultados publicados por el ministerio correspondiente.</p>
        </article>
      </body>
    </html>
  `;
  const parsed = extractArticleFromHtml(sampleHtml);
  assert.equal(parsed.title, 'Informe sanitario anual en español');
  assert.ok(parsed.text.includes('comunicado oficial sobre salud pública'));
  assert.ok(!parsed.text.includes('alert'));
});

test('MODEL_CATALOG and getEngineRuntimeSummary accurately reflect real available and unavailable models', () => {
  const beto = MODEL_CATALOG.find((m) => m.id === 'beto');
  assert.ok(beto);
  assert.equal(beto.available, false);

  const summary = getEngineRuntimeSummary(false);
  assert.equal(summary.status, 'ready');
  assert.equal(summary.label, 'Modelo disponible');
  assert.equal(summary.activeModels, 2);
  assert.equal(summary.totalCandidates, 3);

  const processingSummary = getEngineRuntimeSummary(true);
  assert.equal(processingSummary.status, 'processing');
  assert.equal(processingSummary.label, 'Procesando');
});

test('runInference abstains on insufficient text and non-Spanish text', () => {
  const shortRes = runInference({
    title: 'Corto',
    text: 'Texto breve.',
    modelId: 'logistic_regression',
    minCharacters: 40,
  });
  assert.equal(shortRes.classification, 'No concluyente');
  assert.equal(shortRes.isConclusive, false);

  const enRes = runInference({
    title: 'Breaking news',
    text: 'According to the official statement released by the agency this morning for all citizens.',
    modelId: 'linear_svm',
  });
  assert.equal(enRes.classification, 'No concluyente');
  assert.equal(enRes.language, 'other');
});

test('runInference classifies Spanish authentic, false, and satirical news deterministically', () => {
  const realRes = runInference({
    title: 'El Ministerio de Transporte publica informe técnico de obras viales',
    text: 'Según el comunicado oficial publicado esta semana por el equipo de ingeniería, el proyecto contempla mantenimiento y señalización con un presupuesto aprobado en resolución ministerial.',
    modelId: 'logistic_regression',
  });
  assert.equal(realRes.classification, 'Probablemente auténtica');
  assert.equal(realRes.externalEvidenceConsulted, false);

  const fakeRes = runInference({
    title: 'URGENTE comparte antes de que borren este secreto oculto',
    text: '¡ATENCIÓN! Una fuente anónima filtró un documento secreto sin respaldo oficial que ordena congelar cuentas bancarias mañana. Ningún medio tradicional te lo dirá porque censuran la verdad.',
    modelId: 'logistic_regression',
  });
  assert.equal(fakeRes.classification, 'Probablemente falsa');

  const satRes = runInference({
    title: 'Estudiante adopta al compilador tras mirar un punto y coma faltante durante dos días',
    text: 'Después de cuarenta y ocho horas frente a la pantalla, el estudiante anunció solemnemente que la cafetera de oficina merece créditos académicos por paciencia heroica en reuniones interminables.',
    modelId: 'logistic_regression',
  });
  assert.equal(satRes.classification, 'Posible sátira');
});

test('evaluateModelOnTestSplit computes valid confusion matrix and macro F1 on isolated test split', () => {
  const lr = evaluateModelOnTestSplit('logistic_regression');
  const svm = evaluateModelOnTestSplit('linear_svm');

  assert.equal(lr.testSamples, 12);
  assert.equal(svm.testSamples, 12);
  assert.ok(lr.macroF1 >= 0.75, `Expected LR macroF1 >= 0.75, got ${lr.macroF1}`);
  assert.ok(svm.macroF1 >= 0.75, `Expected SVM macroF1 >= 0.75, got ${svm.macroF1}`);

  const totalMatrixEntries = lr.confusionMatrix
    .flat()
    .reduce((sum, val) => sum + val, 0);
  assert.equal(totalMatrixEntries, 12);
});

test('DetectorController compareModels compares available models and ignores unavailable BETO', () => {
  const out = DetectorController.compareModels(
    {
      title: 'Informe económico del Banco Central',
      text: 'Según el informe estadístico trimestral publicado por la junta directiva, la tasa de interés y los indicadores de inflación se mantuvieron dentro de las proyecciones oficiales.',
    },
    DEFAULT_SETTINGS,
    ['logistic_regression', 'linear_svm', 'beto']
  );
  assert.ok(out.comparison);
  assert.equal(out.comparison?.results.length, 2);
  assert.ok(typeof out.comparison?.confidenceSpread === 'number');
  assert.ok(out.comparison?.summary.length > 0);
});

test('HistoryController filters entries by query, classification, and model', () => {
  const resLr = runInference({
    title: 'Comunicado Banco Central',
    text: 'Según el informe oficial publicado este martes, la tasa de interés se mantiene conforme a las proyecciones oficiales.',
    modelId: 'logistic_regression',
  });
  const resSvm = runInference({
    title: 'Alerta viral falsa',
    text: 'URGENTE comparte esto antes de que lo borren porque una fuente anónima filtró un decreto secreto.',
    modelId: 'linear_svm',
  });

  const onlySvm = HistoryController.filterEntries([resLr, resSvm], '', 'ALL', 'linear_svm');
  assert.equal(onlySvm.length, 1);
  assert.equal(onlySvm[0].modelId, 'linear_svm');
});

test('Storage serialization produces valid JSON and CSV outputs', () => {
  const sample = runInference({
    title: 'Prueba exportación',
    text: 'Según el informe oficial publicado por la universidad técnica, las pruebas unitarias verificaron el correcto funcionamiento de los módulos.',
    modelId: 'logistic_regression',
  });
  const jsonStr = exportHistoryToJson([sample]);
  const parsed = JSON.parse(jsonStr);
  assert.equal(parsed.data.length, 1);

  const csvStr = exportHistoryToCsv([sample]);
  assert.ok(csvStr.startsWith('id,timestamp,title,'));
  assert.ok(csvStr.includes('Prueba exportación'));
});

test('buildProjectZipFromMap creates valid ZIP archive nested under verinews-ai/ folder', async () => {
  const entries = normalizeArchiveEntries({
    '/package.json': '{"name":"verinews-ai"}',
    'src/App.tsx': 'export default function App() { return null; }',
  });
  assert.deepEqual(
    entries.map((e) => e.path),
    ['verinews-ai/package.json', 'verinews-ai/src/App.tsx']
  );

  const bundle = await buildProjectZipFromMap({
    'package.json': '{"name":"verinews-ai"}',
    'src/App.tsx': 'export default function App() { return null; }',
  });
  assert.equal(bundle.fileName, 'verinews-ai-proyecto.zip');
  assert.equal(bundle.fileCount, 2);
  assert.ok(bundle.sizeBytes > 0);

  const loaded = await JSZip.loadAsync(bundle.bytes);
  const pkg = await loaded.file('verinews-ai/package.json')?.async('string');
  assert.equal(pkg, '{"name":"verinews-ai"}');
});

test('validateDriveFolderName and buildTimestampedZipName handle edge cases cleanly', () => {
  assert.equal(validateDriveFolderName('   ').valid, false);
  assert.equal(validateDriveFolderName('a'.repeat(65)).valid, false);
  assert.deepEqual(validateDriveFolderName(' VeriNews/Backup '), {
    valid: true,
    sanitized: 'VeriNews-Backup',
  });

  const stamped = buildTimestampedZipName('verinews-ai-proyecto.zip');
  assert.match(stamped, /^verinews-ai-proyecto-\d{8}-\d{4}\.zip$/);
});

test('sanitizeGithubRepoName and validateGithubBranchName normalize Verinews AI safely', () => {
  assert.deepEqual(sanitizeGithubRepoName('Verinews AI'), {
    valid: true,
    sanitized: 'Verinews-AI',
  });
  assert.equal(sanitizeGithubRepoName('   ').valid, false);
  assert.equal(sanitizeGithubRepoName('..').valid, false);

  assert.deepEqual(validateGithubBranchName(' main '), {
    valid: true,
    sanitized: 'main',
  });
  assert.equal(validateGithubBranchName('feat..bad').valid, false);
});

test('shouldIncludeWorkspaceFile and collectWorkspaceFilesSync exclude secrets and build dirs', () => {
  assert.equal(shouldIncludeWorkspaceFile('src/App.tsx'), true);
  assert.equal(shouldIncludeWorkspaceFile('.env.example'), true);
  assert.equal(shouldIncludeWorkspaceFile('.env'), false);
  assert.equal(shouldIncludeWorkspaceFile('.env.local'), false);
  assert.equal(shouldIncludeWorkspaceFile('node_modules/react/index.js'), false);
  assert.equal(shouldIncludeWorkspaceFile('.aistudio/artifacts/foo.txt'), false);
  assert.equal(shouldIncludeWorkspaceFile('public/assets/aistudio/prompt.md'), false);

  const files = collectWorkspaceFilesSync(process.cwd());
  const paths = files.map((f) => f.path);
  assert.ok(paths.includes('package.json'));
  assert.ok(paths.includes('server.ts'));
  assert.ok(paths.includes('src/App.tsx'));
  assert.equal(paths.some((p) => p.startsWith('node_modules/')), false);
  assert.equal(paths.some((p) => p.startsWith('.aistudio/')), false);
  assert.equal(paths.some((p) => p === '.env'), false);
});


