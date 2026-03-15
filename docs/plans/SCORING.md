# Project Intelligence — Scoring Reference (Fair Model)

Scoring rewards **implementation effort**, **conceptual knowledge**, and **system complexity**. All category scores are summed (capped at 100) to produce **totalScore**. The **tier** is derived from totalScore.

---

## Overall

| What | How |
|------|-----|
| **Total score** | Sum of: Architecture + Backend APIs + Data Modeling + DevOps + Advanced Features + AI Integrations + Project Structure & Breadth. Capped at **100**. |
| **Tier** | **Basic Project**: total &lt; 41 · **Intermediate Project**: 41–60 · **Advanced Project**: 61–80 · **Production Ready**: 81+ |
| **Effort Indicators** | Optional list of high engineering-effort features (e.g. Redis caching, Message queue, Modular architecture). Shown in the UI when present. |

---

## 1. Architecture & System Design (max 20 pts)

**Source:** `architecture.ts` — file paths only.

| Condition | Points |
|-----------|--------|
| Controller–service pattern (paths: controller/controllers/ and service/services/) | 4 |
| Layered architecture (services + model/entity paths; repo counted separately) | 4 |
| Repository / data access abstraction (paths: repository, repositories/) | 3 |
| Modular folder structure (≥ 5 top-level dirs) | 3 |
| Dependency injection / clean structure (paths: inject, dependency, container, module.ts, providers) | 3 |
| Configuration management (.env.example, .env.sample, config/, env.*) | 3 |

**Missing** (if score &lt; 20): e.g. "Dependency injection", "Layered structure", "Repository/Data access abstraction".

---

## 2. Backend APIs (max 10 pts)

**Source:** `api-maturity.ts` — extracted API routes + report text (REST, validation). Count max 8; quality +2.

| Condition | Points |
|-----------|--------|
| API count 1 | 1 |
| API count 5+ | 2 |
| API count 10+ | 3 |
| API count 20+ | 4 |
| API count 40+ | 5 |
| API count 50+ | 6 |
| API count 60+ | 7 |
| API count 70+ | 8 |
| RESTful variety (≥ 2 HTTP methods, incl. GET or POST) | +1 |
| Validation mention in report (zod, joi, yup, express-validator, etc.) | +1 |

Total capped at 10. **Missing:** "More API endpoints (5+)", "RESTful conventions", "Input validation" when not met.

---

## 3. Data Modeling (max 10 pts)

**Source:** `data-modeling.ts` — model/schema file count + report text for relationships and indexes.

Model count from: `schema.prisma`, `schema.*`, `models/`, `migrations/*.sql`, `entities/`, `drizzle/`.

| Condition | Points |
|-----------|--------|
| Model/schema files 1 | 1 |
| Model/schema files 3+ | 2 |
| Model/schema files 5+ | 3 |
| Model/schema files 10+ | 4 |
| Model/schema files 15+ | 5 |
| Model/schema files 20+ | 6 |
| Model/schema files 25+ | 7 |
| Relationships (report text: relation, foreign key, belongs-to, has-many, @relation, etc.) | +2 |
| Indexes (report text: @index, CREATE INDEX, unique index, etc.) | +1 |

Total capped at 10. **Missing:** "More data models (3+)", "Defined relationships" when applicable.

---

## 4. DevOps & Infrastructure (max 15 pts)

**Source:** `devops.ts` — filesystem (root) + filtered file list for env/logging.

| Condition | Points |
|-----------|--------|
| **Dockerfile** at repo root (exists on disk) | 5 |
| **docker-compose** (docker-compose.yml/yaml or compose.yml/yaml at root) | 3 |
| **CI/CD** (`.github/workflows/*.yml` or `.gitlab-ci.yml`, `azure-pipelines.yml`, `Jenkinsfile`) | 3 |
| Environment configuration (`.env.example`, `.env.sample`, or `config/*.env.example`) in file list | 2 |
| Logging/monitoring (path or content: sentry, winston, pino, prometheus, datadog, log4j, monitoring) | 2 |

**Missing:** "Dockerfile", "docker-compose", "CI/CD pipeline" when not detected.

---

## 5. Advanced Features (max 25 pts)

**Source:** `intelligence/features/` — `feature-rules.ts`, `feature-detector.ts`, `feature-scoring.ts`.  
**Logic:** (dependency OR import) required; (usage OR path) for partial/full. Path keywords are secondary evidence only.  
**Confidence:** Signal = 0 pts; Partial = 60% of max pts; Full = 100%. Category score capped at **25**. Evidence shown only for partial/full.

| Feature | Max pts | Detection |
|---------|---------|-----------|
| Authentication | 2 | deps: jsonwebtoken, passport, next-auth, bcrypt, etc.; usage: jwt.sign/verify, verifyToken, getServerSession |
| File uploads | 1 | deps: multer, formidable, express-fileupload, busboy; usage: multer(), req.file, upload.single |
| Payment integration | 2 | deps: stripe, razorpay, paypal, braintree; usage: stripe.paymentIntents, razorpay.orders; path secondary |
| Notifications | 1 | deps: nodemailer, sendgrid, pusher; usage: sendMail, createTransport, sgMail.send; path secondary |
| Role-based access control | 3 | deps: casl, accesscontrol; usage: AbilityBuilder, .can(), checkPermission |
| Realtime (WebSockets) | 3 | deps: socket.io, ws, pusher; usage: .on('connection'), .broadcast.emit, io.on |
| Search system | 3 | deps: elasticsearch, typesense, meilisearch, algoliasearch, lunr; usage: client.search, .index(); path secondary |
| Recommendation system | 4 | deps: tensorflow, ml, recommender, implicit, surprise; usage: getRecommendations, recommender.recommend |
| Analytics dashboards | 2 | deps: chart.js, recharts, d3, mixpanel; usage: Chart(), analytics.track, mixpanel.track (no generic "dashboard") |
| Caching layer (Redis) | 4 | deps: redis, ioredis; usage: redis.get/set/del/createClient, new Redis() only |
| Message queues | 5 | deps: bull, bullmq, kafkajs, amqplib; usage: queue.add/process, producer.send, channel.consume |
| Background job processing | 5 | deps: bull, bullmq, agenda, node-cron; usage: .process(), cron.schedule, agenda.define |
| Rate limiting | 2 | deps: express-rate-limit, rate-limiter-flexible, slow-down; usage: rateLimit(), limiter.consume |
| Observability / monitoring | 2 | deps: sentry, @opentelemetry, prom-client, datadog, newrelic; usage: Sentry.init, captureException, prometheus, metrics |
| Event-driven architecture | 5 | deps: eventemitter3, amqplib, kafkajs, bull; usage: eventBus, pubsub, producer.send, channel.consume (not bare .emit/.on) |

**Missing:** e.g. "Authentication", "Caching layer", "Message queues / background jobs" when none detected.  
**Note:** Frontend caching (Service Worker) moved to frontend intelligence later. File scan: ~120 files, prioritized (service, worker, routes, api).

---

## 6. AI & Integrations (max 10 pts)

**Source:** `ai-integrations.ts` — package.json dependency names only. Payment gateway and Basic external APIs removed (payment is in Advanced Features).

| Condition | Points |
|-----------|--------|
| Cloud storage (AWS): aws, aws-sdk, @aws-sdk/client-s3, multer-s3 | 4 |
| Cloud storage (other): cloudinary, gcs, google-cloud/storage | 2 |
| AI APIs (openai, anthropic, cohere, replicate, together, ollama) | 4 |
| AI pipelines / automation (langchain, llamaindex, @langchain, vectorstore, embedding) | 8 |

Total capped at 10. **Missing:** "AI APIs or pipelines" if no AI-related dep detected.

---

## 7. Project Structure & Breadth (max 10 pts)

**Source:** `scale.ts` — module count + multi-layer path detection. Replaces old "Codebase Scale"; measures system coverage, not raw API/model count (those are in Backend APIs and Data Modeling).

**Module count** = `max(API feature groups, top-level dirs)` so we don't undercount:
- **API feature groups:** When LLM categorization ran (`report.apiRoutesByFeature`), number of feature categories (e.g. Auth, Payment, Users).
- **Top-level dirs:** Count of top-level directories in the repo (e.g. src, app, lib). Fallback when no categorization.

| Condition | Points |
|-----------|--------|
| Modules 1 | 1 |
| Modules 3+ | 2 |
| Modules 5+ | 4 |
| Modules 8+ | 6 |
| Modules 12+ | 8 |
| Multi-layer architecture (≥ 2 of: controllers/, services/, repositories/, workers/, jobs/, events/ in paths) | +2 |

Total capped at 10. **Detected:** e.g. "8 modules", "Multi-layer architecture". Scale object still exposes apiCount, moduleCount, modelCount for display/consumers.

---

## Max possible per category

| Category | Max |
|----------|-----|
| Architecture & System Design | 20 |
| Backend APIs | 10 |
| Data Modeling | 10 |
| DevOps & Infrastructure | 15 |
| Advanced Features | 25 |
| AI & Integrations | 10 |
| Project Structure & Breadth | 10 |
| **Sum** | **100** (total score capped at 100) |

---

## Effort Indicators

The report may include **effortIndicators**: a list of high engineering-effort items detected, e.g.:

- Modular folder structure
- Layered architecture
- Dependency injection / clean structure
- Repository/Data access abstraction
- Dockerfile
- docker-compose
- CI/CD pipeline
- Caching layer (Redis)
- Message queues
- Background job processing
- Event-driven architecture

These are shown in the **High Engineering Effort** card in the Intelligence view when present (up to 8 items).
