/**
 * Advanced feature rule definitions only.
 * Detection and scoring live in feature-detector.ts and feature-scoring.ts.
 */

export type FeatureImpact = "low" | "medium" | "high";

export interface FeatureRule {
  id: string;
  name: string;
  impact: FeatureImpact;
  maxPoints: number;
  dependencies: string[];
  importPatterns: RegExp[];
  /** Actual usage (e.g. redis.get, queue.add). Dependency or import required; path is secondary only. */
  usagePatterns: RegExp[];
  /** Secondary evidence only: never primary. Used only when (dep OR import) already present. */
  pathKeywords?: string[];
}

/** Category capped at 25. Raw total ~40+. */
export const ADVANCED_FEATURES_MAX = 25;

/** Core + Application + Scalability. Service Worker caching moved to frontend intelligence later. */
export const FEATURE_RULES: FeatureRule[] = [
  {
    id: "auth",
    name: "Authentication",
    impact: "low",
    maxPoints: 2,
    dependencies: ["jsonwebtoken", "jwt-decode", "passport", "next-auth", "bcrypt", "argon2", "express-session"],
    importPatterns: [
      /require\s*\(\s*["'](?:jsonwebtoken|jwt-decode|passport|next-auth|bcrypt|argon2|express-session)["']\s*\)/i,
      /from\s+["'](?:jsonwebtoken|jwt-decode|passport|next-auth|bcrypt|argon2|express-session)["']/i,
      /import\s+.+\s+from\s+["']next-auth["']/i,
    ],
    usagePatterns: [/jwt\.sign\s*\(|jwt\.verify\s*\(|passport\.(use|authenticate)|bcrypt\.(compare|hash)|verifyToken|getServerSession/i],
  },
  {
    id: "file-uploads",
    name: "File uploads",
    impact: "low",
    maxPoints: 1,
    dependencies: ["multer", "formidable", "express-fileupload", "busboy"],
    importPatterns: [/require\s*\(\s*["'](?:multer|formidable|express-fileupload|busboy)["']\s*\)/i, /from\s+["'](?:multer|formidable|express-fileupload|busboy)["']/i],
    usagePatterns: [/multer\s*\(|req\.file\s*\)|upload\.single|formidable\.IncomingForm/i],
  },
  {
    id: "payment",
    name: "Payment integration",
    impact: "low",
    maxPoints: 2,
    dependencies: ["stripe", "razorpay", "paypal-rest-sdk", "braintree"],
    importPatterns: [/require\s*\(\s*["'](?:stripe|razorpay|paypal|braintree)["']\s*\)/i, /from\s+["']stripe["']/i, /import\s+Stripe\s+from/i],
    usagePatterns: [/stripe\.(paymentIntents|customers|checkout)|razorpay\.(orders|payments)|paymentIntent\.create/i],
    pathKeywords: ["razorpay", "stripe", "paypal", "braintree"],
  },
  {
    id: "notifications",
    name: "Notifications",
    impact: "low",
    maxPoints: 1,
    dependencies: ["nodemailer", "sendgrid", "firebase-admin", "pusher"],
    importPatterns: [/require\s*\(\s*["'](?:nodemailer|sendgrid|@sendgrid|firebase-admin|pusher)["']\s*\)/i, /from\s+["'](?:nodemailer|sendgrid|pusher)["']/i],
    usagePatterns: [/sendMail|createTransport|sgMail\.send|pusher\.trigger|notification\.send/i],
    pathKeywords: ["mailSender", "nodemailer", "sendgrid", "mail", "pusher"],
  },
  {
    id: "rbac",
    name: "Role-based access control",
    impact: "medium",
    maxPoints: 3,
    dependencies: ["casl", "@casl/ability", "accesscontrol"],
    importPatterns: [/from\s+["'](?:casl|@casl|accesscontrol)["']/i, /require\s*\(\s*["'](?:casl|accesscontrol)["']\s*\)/i],
    usagePatterns: [/AbilityBuilder|\.can\s*\(|\.cannot\s*\(|checkPermission|defineAbility/i],
  },
  {
    id: "websockets",
    name: "Realtime updates (WebSockets)",
    impact: "medium",
    maxPoints: 3,
    dependencies: ["socket.io", "ws", "pusher", "socket.io-client"],
    importPatterns: [/require\s*\(\s*["'](?:socket\.io|ws|pusher)["']\s*\)/i, /from\s+["'](?:socket\.io|ws|pusher)["']/i],
    usagePatterns: [/\.on\s*\(\s*["']connection["']|\.broadcast\.emit|new\s+WebSocket\s*\(|io\.on\s*\(/i],
  },
  {
    id: "search",
    name: "Search system",
    impact: "medium",
    maxPoints: 3,
    dependencies: ["elasticsearch", "@elastic/elasticsearch", "typesense", "meilisearch", "algoliasearch", "lunr"],
    importPatterns: [
      /require\s*\(\s*["'](?:elasticsearch|@elastic\/elasticsearch|typesense|meilisearch|algoliasearch|lunr)["']\s*\)/i,
      /from\s+["'](?:elasticsearch|@elastic\/elasticsearch|typesense|meilisearch|algoliasearch|lunr)["']/i,
    ],
    usagePatterns: [/client\.search\s*\(|\.index\s*\(|typesense|meilisearch\.|algolia\.|elasticsearch\./i],
    pathKeywords: ["elasticsearch", "typesense", "meilisearch", "algolia"],
  },
  {
    id: "recommendation",
    name: "Recommendation system",
    impact: "medium",
    maxPoints: 4,
    dependencies: [
      "tensorflow",
      "@tensorflow/tfjs",
      "brain.js",
      "ml",
      "recommender",
      "natural",
      "implicit",
      "surprise",
      "lightfm",
    ],
    importPatterns: [
      /require\s*\(\s*["'](?:tensorflow|@tensorflow\/tfjs|brain\.js|ml|recommender|natural)["']\s*\)/i,
      /from\s+["'](?:tensorflow|@tensorflow\/tfjs|ml|recommender)["']/i,
      /import\s+(?:implicit|surprise|lightfm)/i,
    ],
    usagePatterns: [
      /getRecommendations|recommender\.(recommend|fit)|collaborativeFilter|matrixFactorization|similarItems\s*\(|cosine_similarity/i,
    ],
  },
  {
    id: "analytics",
    name: "Analytics dashboards",
    impact: "medium",
    maxPoints: 2,
    dependencies: ["chart.js", "recharts", "d3", "mixpanel"],
    importPatterns: [/from\s+["'](?:chart\.js|recharts|d3|mixpanel)["']/i],
    usagePatterns: [/Chart\s*\(|useChart|analytics\.(track|page)|mixpanel\.(track|identify)/i],
  },
  {
    id: "redis",
    name: "Caching layer (Redis)",
    impact: "high",
    maxPoints: 4,
    dependencies: ["redis", "ioredis", "@redis/client", "cache-manager-redis"],
    importPatterns: [/require\s*\(\s*["'](?:redis|ioredis|@redis|cache-manager-redis)["']\s*\)/i, /from\s+["'](?:redis|ioredis|@redis\/client)["']/i],
    usagePatterns: [/redis\.(get|set|del|createClient)\s*\(/i, /new\s+Redis\s*\(/i],
  },
  {
    id: "message-queue",
    name: "Message queues",
    impact: "high",
    maxPoints: 5,
    dependencies: ["bull", "bullmq", "kafkajs", "amqplib", "sqs-consumer", "bee-queue"],
    importPatterns: [/require\s*\(\s*["'](?:bull|bullmq|kafkajs|amqplib|sqs)["']\s*\)/i, /from\s+["'](?:bull|bullmq|kafkajs|amqplib)["']/i],
    usagePatterns: [/queue\.(add|process|create)|producer\.send|channel\.(sendToQueue|consume)|consumer\.(subscribe|run)/i],
  },
  {
    id: "background-jobs",
    name: "Background job processing",
    impact: "high",
    maxPoints: 5,
    dependencies: ["bull", "bullmq", "agenda", "node-cron", "node-schedule"],
    importPatterns: [/require\s*\(\s*["'](?:bull|bullmq|agenda|node-cron|node-schedule)["']\s*\)/i, /from\s+["'](?:bull|bullmq|agenda)["']/i],
    usagePatterns: [/\.process\s*\(|job\.(process|run)|cron\.schedule|agenda\.define/i],
  },
  {
    id: "rate-limiting",
    name: "Rate limiting",
    impact: "medium",
    maxPoints: 2,
    dependencies: ["express-rate-limit", "rate-limiter-flexible", "slow-down"],
    importPatterns: [
      /require\s*\(\s*["'](?:express-rate-limit|rate-limiter-flexible|slow-down)["']\s*\)/i,
      /from\s+["'](?:express-rate-limit|rate-limiter-flexible|slow-down)["']/i,
    ],
    usagePatterns: [/rateLimit\s*\(|limiter\.consume/i],
  },
  {
    id: "observability",
    name: "Observability / monitoring",
    impact: "medium",
    maxPoints: 2,
    dependencies: ["sentry", "@sentry/node", "@opentelemetry/api", "prom-client", "datadog", "newrelic"],
    importPatterns: [
      /require\s*\(\s*["'](?:sentry|@sentry|@opentelemetry|prom-client|datadog|newrelic)["']\s*\)/i,
      /from\s+["'](?:sentry|@sentry|@opentelemetry|prom-client|datadog|newrelic)["']/i,
    ],
    usagePatterns: [/Sentry\.init|captureException|prometheus|\.metrics\s*\(|metrics\./i],
  },
  {
    id: "event-driven",
    name: "Event-driven architecture",
    impact: "high",
    maxPoints: 5,
    dependencies: ["eventemitter3", "eventemitter2", "amqplib", "kafkajs", "bull", "bullmq"],
    importPatterns: [/EventEmitter|eventemitter|from\s+["']events["']/i, /from\s+["'](?:amqplib|kafkajs)["']/i],
    usagePatterns: [/eventBus|eventEmitter|pubsub|publish\s*\(|subscribe\s*\(|producer\.send|channel\.(consume|sendToQueue)/i],
  },
];

/** Path substrings to prioritize when reading files (service, worker, routes first). */
export const FILE_PRIORITY_SUBSTRINGS = [
  "service",
  "services",
  "worker",
  "queue",
  "queues",
  "jobs",
  "routes",
  "api",
  "controller",
  "controllers",
];
