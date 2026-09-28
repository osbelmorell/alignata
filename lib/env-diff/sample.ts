/** Staging-ish baseline — demos missing / extra / changed / secrets. */
export const SAMPLE_BEFORE = `# staging snapshot
NODE_ENV=staging
LOG_LEVEL=info
DATABASE_URL=postgres://app:staging-pass@db.staging.internal:5432/app
REDIS_URL=redis://redis.staging.internal:6379/0
API_BASE_URL=https://api.staging.example.com
FEATURE_CHECKOUT_V2=false
RATE_LIMIT_RPM=600
STRIPE_SECRET_KEY=STRIPE_TEST_SAMPLE_HxStagingSecretDemo1234
SESSION_SECRET=abc123staging
OLD_LEGACY_FLAG=on
`;

/** Prod-ish after — missing OLD_LEGACY_FLAG, extra SENTRY_DSN, changed values. */
export const SAMPLE_AFTER = `# production snapshot
NODE_ENV=production
LOG_LEVEL=warn
DATABASE_URL=postgres://app:prod-super-secret-db@db.prod.internal:5432/app
REDIS_URL=redis://redis.prod.internal:6379/0
API_BASE_URL=https://api.example.com
FEATURE_CHECKOUT_V2=true
RATE_LIMIT_RPM=1200
STRIPE_SECRET_KEY=STRIPE_LIVE_SAMPLE_HxProdSecretLiveKey9999
SESSION_SECRET=prod-session-xyz-9876
SENTRY_DSN=https://abcd1234@o0.ingest.sentry.io/1
`;

export const SAMPLE_BEFORE_LABEL = "staging";
export const SAMPLE_AFTER_LABEL = "prod";
