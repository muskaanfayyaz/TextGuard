import { router, json, requireAuth } from '@appdeploy/sdk';
import { db } from '@appdeploy/sdk';

type ProfileRecord = {
  userId: string;
  name: string;
  email: string;
  createdAt: string;
  updatedAt: string;
};

async function getOrCreateProfile(user: { userId: string; email?: string; name?: string }) {
  const table = 'textguard_profiles';
  const [existing] = await db.get<ProfileRecord>(table, [user.userId], { consistent: true });
  if (existing) return existing;

  const now = new Date().toISOString();
  const initial: ProfileRecord = {
    userId: user.userId,
    name: user.name || '',
    email: user.email || '',
    createdAt: now,
    updatedAt: now
  };
  const [created] = await db.tx.add(table, [{ id: user.userId, ...initial }]);
  if (created) return initial;

  const [raced] = await db.get<ProfileRecord>(table, [user.userId], { consistent: true });
  if (!raced) throw new Error('Profile initialization could not be completed');
  return raced;
}

export const handler = router({
  'GET /api/project/status': [
    async () => json({
      status: 'ready',
      application: 'TextGuard',
      version: '2.0.0',
      detectionEngine: 'implemented_client_side',
      authentication: 'appdeploy_managed',
      message: 'Authentication is managed by AppDeploy. The classical DSA comparison engine runs locally in the browser.'
    })
  ],
  'GET /api/dashboard': [
    requireAuth(),
    async () => json({
      documents: [],
      comparisons: [],
      statistics: {
        totalDocuments: 0,
        totalComparisons: 0,
        averageSimilarity: null,
        highSimilarityMatches: 0,
        distribution: { low: 0, moderate: 0, high: 0, veryHigh: 0 }
      }
    })
  ],
  'GET /api/profile': [
    requireAuth(),
    async ({ user }) => {
      const profile = await getOrCreateProfile(user!);
      return json(profile);
    }
  ],
  'PUT /api/profile': [
    requireAuth(),
    async ({ user, body }) => {
      const payload = body as { name?: unknown };
      if (typeof payload?.name !== 'string' || payload.name.trim().length < 2 || payload.name.trim().length > 80) {
        return json({ error: 'Name must contain between 2 and 80 characters.' }, 400);
      }
      const current = await getOrCreateProfile(user!);
      const next = {
        name: payload.name.trim(),
        updatedAt: new Date().toISOString()
      };
      const [updated] = await db.tx.update('textguard_profiles', [{
        id: user!.userId,
        record: next,
        if: { userId: user!.userId }
      }], { patch: true });
      if (!updated) return json({ error: 'Profile changed concurrently. Reload and try again.' }, 409);
      return json({ ...current, ...next });
    }
  ]
});
