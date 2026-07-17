// Global registry for FCM tokens to avoid DB schema constraints in dev
const globalForFcm = globalThis as unknown as {
  fcmTokens: Map<string, string> | undefined;
};

if (!globalForFcm.fcmTokens) {
  globalForFcm.fcmTokens = new Map<string, string>();
}

export const fcmRegistry = globalForFcm.fcmTokens;
