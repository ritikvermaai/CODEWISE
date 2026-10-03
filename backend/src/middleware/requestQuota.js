import User from "../models/User.js";

const LIMIT = 50;
const WINDOW_MS = 24 * 60 * 60 * 1000;

export async function reserveAiRequest(userId) {
  const owner = await User.findById(userId).select("role").lean();
  if (owner?.role === "owner") {
    return { allowed: true, unlimited: true, limit: null, count: 0, remaining: null, resetAt: null, resetAfterSeconds: null };
  }
  const now = new Date();
  const cutoff = new Date(now.getTime() - WINDOW_MS);

  // Atomic MongoDB update: the filter prevents a 51st request inside
  // the same rolling 24-hour window, even if requests arrive concurrently.
  const updated = await User.findOneAndUpdate(
    {
      _id: userId,
      $or: [
        { requestWindowStartedAt: null },
        { requestWindowStartedAt: { $exists: false } },
        { requestWindowStartedAt: { $lte: cutoff } },
        { requestCount: { $lt: LIMIT } }
      ]
    },
    [
      {
        $set: {
          requestWindowStartedAt: {
            $cond: [
              {
                $or: [
                  { $eq: [{ $ifNull: ["$requestWindowStartedAt", null] }, null] },
                  { $lte: ["$requestWindowStartedAt", cutoff] }
                ]
              },
              "$$NOW",
              "$requestWindowStartedAt"
            ]
          },
          requestCount: {
            $cond: [
              {
                $or: [
                  { $eq: [{ $ifNull: ["$requestWindowStartedAt", null] }, null] },
                  { $lte: ["$requestWindowStartedAt", cutoff] }
                ]
              },
              1,
              { $add: [{ $ifNull: ["$requestCount", 0] }, 1] }
            ]
          }
        }
      }
    ],
    { new: true, projection: { requestCount: 1, requestWindowStartedAt: 1, role: 1 } }
  );

  if (!updated) {
    const current = await User.findById(userId)
      .select("requestCount requestWindowStartedAt role")
      .lean();

    const started = current?.requestWindowStartedAt
      ? new Date(current.requestWindowStartedAt).getTime()
      : now.getTime();

    const resetAt = started + WINDOW_MS;
    const resetAfterSeconds = Math.max(1, Math.ceil((resetAt - now.getTime()) / 1000));

    return {
      allowed: false,
      limit: LIMIT,
      count: Number(current?.requestCount || LIMIT),
      remaining: 0,
      resetAt: new Date(resetAt),
      resetAfterSeconds
    };
  }

  const started = new Date(updated.requestWindowStartedAt).getTime();
  const resetAt = started + WINDOW_MS;

  return {
    allowed: true,
    limit: LIMIT,
    count: Number(updated.requestCount || 0),
    remaining: Math.max(0, LIMIT - Number(updated.requestCount || 0)),
    resetAt: new Date(resetAt),
    resetAfterSeconds: Math.max(1, Math.ceil((resetAt - now.getTime()) / 1000))
  };
}

export const AI_REQUEST_LIMIT = LIMIT;
