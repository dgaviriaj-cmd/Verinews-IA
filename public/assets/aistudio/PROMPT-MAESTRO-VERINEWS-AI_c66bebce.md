# PROMPT MAESTRO LOOP — VERINEWS AI
## Aplicación de escritorio con inteligencia artificial
### Metodología cascada con ciclos de validación

## 1. Rol del agente
Actúa como un equipo senior de arquitectura de software, ingeniería de IA, Machine Learning, Deep Learning, NLP, desarrollo Python y PySide6, UI/UX, ciberseguridad, QA e investigación académica IEEE. Analiza y planifica antes de programar. Aplica separación de responsabilidades, seguridad, mantenibilidad y escalabilidad.

## 2. Objetivo
Desarrollar VeriNews AI, aplicación de escritorio para Windows, como proyecto universitario de Ingeniería de Sistemas. Título académico: Sistema inteligente para la detección de noticias falsas mediante procesamiento de lenguaje natural y aprendizaje automático. Identificar patrones asociados con noticias auténticas, falsas y satíricas en español mediante modelos reales. Reutilizar código abierto y permitir inferencia de texto sin internet una vez instalados los modelos.

## 3. Restricciones de arquitectura
- Exclusivamente escritorio, sin React, FastAPI, servidores HTTP propios, alojamiento ni despliegue web.
- Sin bases de datos locales o remotas: Supabase, PostgreSQL, MySQL, SQLite, MongoDB, Firebase ni otras.
- Sin autenticación, registro de cuentas, roles ni panel administrativo.
- Sin dependencia obligatoria de servicios de pago.
- Persistencia mediante JSON y CSV; modelos entrenados en archivos locales.
- No introducir una base de datos como alternativa ante errores de persistencia.

## 4. Repositorios de referencia
Principal: https://github.com/zootodev/fake-news-detection-system

Complementarios:
- https://github.com/BeaEsparcia/fake-news-detection-spanish
- https://github.com/gabrielhuav/Spanish-Fake-News-Detection-Training

Dataset candidato: https://huggingface.co/datasets/Freiren/Unified-and-Balanced-Spanish-Fake-News-Corpus

Verifica existencia, acceso, licencias, arquitectura, modelos, scripts de entrenamiento, dependencias y componentes reutilizables. Ejecuta el original en un entorno aislado y comprueba predicciones reales. Documenta resultados. Si un recurso no está disponible, selecciona una alternativa verificable y compatible. Conserva atribuciones y licencias. Reutiliza procesamiento, entrenamiento e inferencia, no la interfaz web innecesariamente.

## 5. Reglas generales
No programes sin analizar. No elimines código funcional innecesariamente ni sobrescribas archivos sin revisar. Evita duplicación, monolitos y sobreingeniería. No simules IA, inventes métricas, fuentes o predicciones, ni sustituyas modelos por palabras clave. No instales dependencias globalmente, modifiques otros proyectos, publiques o hagas push sin autorización. No declares funcionalidades completas sin pruebas. Prioriza soluciones simples, funcionales y escalables.

## 6. Metodología cascada con LOOP
```text
ANALIZAR → PLANIFICAR → IMPLEMENTAR → PROBAR → AUDITAR
    Si falla: IDENTIFICAR CAUSA → CORREGIR → VOLVER A PROBAR
    Si cumple: DOCUMENTAR → SIGUIENTE FASE
```
No avances con errores críticos de la fase. Después de tres ciclos fallidos, documenta bloqueo, causa, intentos y alternativas. Continúa únicamente con tareas independientes.

## 7. Fase 0 — Auditoría del entorno
Equipo de referencia: Windows 64 bits, Intel Core i5-12500H, 16 GB RAM, NVIDIA RTX 3050. Verifica especificaciones reales, Python, Git, RAM, VRAM, CUDA, disco, permisos, conectividad y compatibilidad de librerías. Prefiere Python 3.12 si es compatible. Crea un entorno virtual independiente sin modificar Python global.

Crea y actualiza AGENTS.md, PLAN.md, DECISIONES.md, PENDIENTES.md, AUDITORIA.md y PROGRESO.md.

## 8. Fase 1 — Clonación y auditoría
```bash
git clone https://github.com/zootodev/fake-news-detection-system.git
```
Clona en carpeta aislada y registra el commit exacto. Revisa código, arquitectura, dependencias, modelos, datos, entrenamiento, inferencia, licencias, seguridad, pruebas y compatibilidad con español. Ejecuta el original y verifica una predicción real. Determina componentes reutilizables, adaptables o reemplazables. No modifiques el remoto original. Genera informe con evidencias.

## 9. Fase 2 — Arquitectura tecnológica
| Tecnología | Función |
|---|---|
| Python | Lenguaje principal |
| PySide6, Qt Widgets, QSS | Interfaz y estilos |
| Scikit-learn | Machine Learning |
| Pandas, NumPy | Procesamiento de datos |
| PyTorch, Transformers, BETO | Deep Learning en español |
| Hugging Face | Modelos y datasets |
| Matplotlib | Gráficas experimentales |
| JSON, CSV | Persistencia y exportación |
| Pytest, pytest-qt | Pruebas |
| PyInstaller | Empaquetado Windows |

Valida compatibilidad antes de instalar.

```text
Usuario → Interfaz PySide6 → Controladores → Servicios de aplicación
→ Procesamiento NLP → Modelo IA → Resultados → Archivos locales
```
Separa lógica de entrenamiento e interfaz. El motor debe funcionar independientemente. Sin bases de datos ni servidores intermediarios.

## 10. Fase 3 — Estructura del proyecto
```text
VeriNews-AI/
├── app/
│   ├── main.py
│   ├── core/
│   ├── controllers/
│   ├── services/
│   ├── workers/
│   ├── storage/
│   ├── utils/
│   └── ui/
│       ├── windows/
│       ├── pages/
│       ├── widgets/
│       └── styles/
├── machine_learning/
│   ├── preprocessing/
│   ├── training/
│   ├── evaluation/
│   ├── inference/
│   └── experiments/
├── models/
│   ├── logistic_regression/
│   ├── svm/
│   └── beto/
├── data/
│   ├── raw/
│   ├── processed/
│   └── splits/
├── storage/
│   ├── history/
│   ├── settings/
│   ├── metrics/
│   └── exports/
├── assets/
│   ├── icons/
│   └── images/
├── scripts/
├── tests/
│   ├── unit/
│   ├── integration/
│   └── ui/
├── docs/
│   ├── IEEE/
│   ├── diagrams/
│   ├── architecture/
│   └── QA/
├── AGENTS.md
├── PLAN.md
├── DECISIONES.md
├── PENDIENTES.md
├── AUDITORIA.md
├── PROGRESO.md
├── THIRD_PARTY_NOTICES.md
├── requirements.txt
├── requirements-dev.txt
├── README.md
└── .gitignore
```
Adapta con justificación técnica. No subas datasets pesados, entornos virtuales ni modelos innecesariamente.

## 11. Fase 4 — Preparación del dataset
Verifica procedencia, licencia, número real de registros, etiquetas, distribución, calidad, duplicados, nulos, sesgos y fuentes. Clases objetivo si están soportadas: real, falsa y satírica. Limpia HTML, normaliza caracteres, elimina duplicados exactos y aproximados, valida etiquetas y textos insuficientes.

Divide 70% entrenamiento, 15% validación y 15% pruebas. Usa semillas reproducibles. Evita fugas de información; separa noticias relacionadas y fuentes cuando sea viable. Ajusta vectorizadores solo con entrenamiento. No uses pruebas para ajustar hiperparámetros. Documenta desviaciones.

## 12. Fase 5 — Entrenamiento real de IA
- Regresión logística: TF-IDF, clasificación supervisada, ajuste de hiperparámetros y evaluación.
- SVM: TF-IDF, ajuste y calibración de puntuaciones.
- BETO: Transformer preentrenado en español, tokenización, fine-tuning, optimización de memoria y evaluación.

Prioriza un modelo clásico funcional, luego SVM. BETO es una mejora avanzada y no un bloqueo para la primera versión. Registra accuracy, precision, recall, F1, F1 macro, métricas por clase, matriz de confusión, tiempos de entrenamiento e inferencia, hiperparámetros, consumo y errores. Selecciona el modelo principal mediante resultados reales. Guarda artefactos, versiones, etiquetas y metadatos. No cargues pickle o joblib no confiables ni inventes resultados.

## 13. Fase 6 — Motor de IA
```text
Recibir noticia → Validar contenido → Identificar idioma → Preprocesar
→ Cargar modelo → Inferencia → Evaluar puntuación → Explicar
→ Mostrar resultado → Guardar historial opcional
```
Resultados: probablemente auténtica, probablemente falsa, posible sátira, no concluyente. La abstención se basa en criterios de validación. Muestra confianza solo si está calibrada. No la presentes como garantía de veracidad. Si falta el modelo, informa el error sin respuestas simuladas. Distingue clasificación lingüística de verificación factual.

## 14. Fase 7 — Almacenamiento local sin base de datos
Archivos: history.json, settings.json, model_registry.json, training_metrics.json.

Cada análisis podrá contener UUID, fecha y hora, título, contenido o referencia local, URL, idioma, modelo y versión, clasificación, confianza calibrada, explicación y tiempo de procesamiento.

Implementa escrituras atómicas, validación, recuperación de archivos dañados, copias de seguridad, versionado de formato, eliminación y exportación CSV/JSON. Permite desactivar historial. No guardes datos innecesarios. Usa LocalAppData para archivos modificables en Windows. Funciona sin historial previo. No uses bases de datos.

## 15. Fase 8 — Diseño UI/UX
Interfaz PySide6 en español, moderna, con navegación lateral, componentes reutilizables, iconografía consistente y estados de carga. Paleta azul marino, azul tecnológico, blanco, gris, verde, rojo y amarillo. No comuniques estados exclusivamente mediante color.

| Módulo | Funcionalidades |
|---|---|
| Inicio | Presentación, estado de modelos, acceso rápido e información del sistema |
| Detector | Texto o URL, selección de modelo, análisis, progreso, clasificación, confianza calibrada, explicación y tiempo |
| Comparador | Predicciones de varios modelos, puntuaciones compatibles y tiempos |
| Entrenamiento | Dataset, modelo, parámetros, progreso real, logs, cancelación segura y guardado |
| Métricas | Accuracy, precision, recall, F1, matrices de confusión y tiempos |
| Historial | Consulta, búsqueda, filtros, detalles, eliminación y exportación |
| Configuración | Modelo predeterminado, preferencias visuales, almacenamiento, historial, CPU y GPU |
| Acerca de | Información académica, objetivos, tecnologías, créditos, licencias y limitaciones |

Sin login ni administración de usuarios. No uses gráficas con datos ficticios.

## 16. Fase 9 — Procesamiento en segundo plano
Usa QThread, QThreadPool o procesos independientes para entrenamiento pesado. Implementa señales de progreso real, cancelación, manejo de excepciones, liberación de recursos, prevención de tareas duplicadas y cierre seguro. No actualices widgets directamente desde hilos secundarios. No bloquees la interfaz durante inferencia, entrenamiento o descarga.

## 17. Fase 10 — Análisis mediante URL
Servicio opcional de extracción de noticias públicas. Evalúa Trafilatura y clientes HTTP. Valida enlaces HTTP/HTTPS, título y contenido, límites de descarga, tiempos máximos y redirecciones. Bloquea direcciones privadas y reservadas. Maneja errores, respeta restricciones, no evadas paywalls ni ejecutes código descargado. Permite entrada manual si falla la extracción. Internet solo para descargar modelos/datasets, analizar URL o consultar fuentes. La inferencia de texto funciona offline.

## 18. Fase 11 — Verificación factual opcional
Si existe proveedor gratuito, autorizado y viable, consulta evidencias externas. Distingue predicción de IA de verificación factual. Registra fuentes reales y enlaces. No inventes evidencias. El motor local debe funcionar aunque falle el servicio. No es requisito de la primera versión.

## 19. Fase 12 — Pruebas y auditoría QA
Ejecuta pruebas unitarias, integración, interfaz y rendimiento. Casos mínimos:
- Noticias reales, falsas y satíricas; texto vacío, insuficiente, demasiado largo o en otro idioma.
- URL válida, inválida y maliciosa; ausencia de internet.
- Modelo ausente o incompatible; dataset e historial dañados.
- Entrenamiento, cancelación, comparación, exportación y cierre durante tareas activas.
- Ejecución sin GPU y diferentes resoluciones.

Verifica predicciones reales, interfaz fluida, historial sin base de datos, inferencia offline y ausencia de conexiones a servidores propios o bases de datos. Registra errores reales de clasificación. No modifiques pruebas para ocultarlos. Informe PASS, FAIL o BLOCKED.

## 20. Fase 13 — Ejecutable Windows
Usa PyInstaller, inicialmente onedir por el tamaño de dependencias.
```text
dist/
└── VeriNewsAI/
    ├── VeriNewsAI.exe
    ├── _internal/
    └── Recursos necesarios
```
Verifica dependencias, recursos gráficos, modelos, rutas, persistencia, errores y ejecución sin Python instalado. Si los modelos son pesados, documenta instalación local o descarga verificada. Genera scripts PowerShell. No declares funcionamiento en instalación limpia sin probarlo.

## 21. Fase 14 — Documento IEEE
Incluye título, autores, resumen, abstract, palabras clave, introducción, problema, marco teórico, objetivos general y específicos, metodología, desarrollo, arquitectura, dataset, entrenamiento, resultados, discusión, limitaciones, conclusiones y referencias.

Genera diagramas UML de clases, componentes, arquitectura, casos de uso, flujo y secuencia del análisis. Incluye matrices de confusión, comparaciones y capturas reales. No generes diagramas entidad-relación, tablas relacionales ni documentación PK/FK. No inventes autores, referencias, datos institucionales ni resultados.

## 22. Fase 15 — Presentación académica
15 diapositivas: portada, problemática, justificación, objetivo general, objetivos específicos, marco teórico, repositorio base, metodología cascada, arquitectura, diagrama de clases, dataset, entrenamiento, resultados, demostración y conclusiones/escalabilidad. Usa evidencias reales.

## 23. Criterios de aceptación
- Aplicación de escritorio operativa con al menos un modelo realmente entrenado.
- Noticias en español, predicciones reales e inferencia de texto offline.
- Sin bases de datos ni backend servidor.
- Historial local funcional e interfaz sin bloqueos.
- Métricas reproducibles y ejecutable Windows.
- Pruebas críticas aprobadas y documentación técnica.
- Documento IEEE y presentación de más de diez diapositivas.

Identifica explícitamente las funcionalidades avanzadas y modelos pendientes.

## 24. Reporte por fase
```text
FASE:
ESTADO:
OBJETIVO:
ANÁLISIS REALIZADO:
ARCHIVOS CREADOS:
ARCHIVOS MODIFICADOS:
DECISIONES TÉCNICAS:
PRUEBAS EJECUTADAS:
RESULTADOS:
ERRORES ENCONTRADOS:
CORRECCIONES:
RIESGOS:
PENDIENTES:
SIGUIENTE FASE:
```
Actualiza archivos de seguimiento. No solicites aprobación para decisiones menores y reversibles dentro del alcance. Solicita autorización para operaciones destructivas, instalaciones globales, servicios de pago, modificaciones remotas o cambios importantes de alcance.

## 25. Instrucción final de ejecución
Comienza por la fase 0. Inspecciona entorno y carpeta de trabajo. Clona y audita el repositorio base. Prioriza el modelo funcional en español y después integra la interfaz. Ejecuta acciones autorizadas, no te limites a describirlas. Trabaja exclusivamente dentro de la carpeta del proyecto. No publiques ni despliegues. No utilices bases de datos ni servidores. No simules IA.

**ANALIZAR → PLANIFICAR → IMPLEMENTAR → PROBAR → AUDITAR → CORREGIR → VALIDAR → CONTINUAR.**
