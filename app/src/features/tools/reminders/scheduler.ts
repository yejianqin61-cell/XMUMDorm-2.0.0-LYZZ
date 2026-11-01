export type ReminderDomain = 'class' | 'moodle';
import type { ClassReminderTarget } from './plan';

export type ReminderTime = { id: string; fireAt: number; target?: ClassReminderTarget };
export type ReminderLabels = { title: string; body: string };
export type ReminderDomainPlan = { plan: readonly ReminderTime[]; labels: ReminderLabels };
export type OwnerReminderPlans = Record<ReminderDomain, ReminderDomainPlan>;

export type NativeReminderRequest = {
  identifier: string;
  content: { data?: Record<string, unknown> | null };
};

/** Structural Expo SDK 57 port. A bare Date is a supported single-fire trigger. */
export type NativeReminderPort = {
  getPermissionsAsync(): Promise<{ granted: boolean }>;
  getAllScheduledNotificationsAsync(): Promise<readonly NativeReminderRequest[]>;
  scheduleNotificationAsync(input: {
    content: { title: string; body: string; data: Record<string, unknown> };
    trigger: Date;
  }): Promise<string>;
  cancelScheduledNotificationAsync(identifier: string): Promise<void>;
};

export type ScheduledReminder = { domain: ReminderDomain; id: string; notificationId: string };
export type ReminderScheduleResult = {
  status: 'scheduled' | 'permission-denied' | 'stale';
  scheduled: readonly ScheduledReminder[];
  /** Future plan items not arranged on the OS, rather than an incomplete semester plan. */
  deferred: number;
};

const DOMAINS: readonly ReminderDomain[] = ['class', 'moodle'];
const NAMESPACE = 'phase3-v1';
const stale = (): ReminderScheduleResult => ({ status: 'stale', scheduled: [], deferred: 0 });

/** Accept only a numeric project account id, never a credential or guest/unresolved scope. */
export function reminderOwnerFromScope(scope: string): string | null {
  const match = /^user:([1-9]\d*)(?::semester:[\w-]+)?$/.exec(scope);
  return match && Number.isSafeInteger(Number(match[1])) ? `user:${match[1]}` : null;
}

function requireOwner(owner: string): void {
  if (reminderOwnerFromScope(owner) !== owner) throw new TypeError('reminder owner must be user:<numeric project id>');
}

function isTagged(request: NativeReminderRequest, owner: string, domains: readonly ReminderDomain[]): boolean {
  const data = request.content.data;
  return data?.dormReminder === NAMESPACE && data.owner === owner
    && domains.some((domain) => data.domain === domain);
}

type Candidate = { domain: ReminderDomain; id: string; time: number; labels: ReminderLabels; target?: ClassReminderTarget };
function candidatesFor(domain: ReminderDomain, input: ReminderDomainPlan): Candidate[] {
  const unique = new Map<string, Candidate>();
  for (const item of input.plan) {
    const time = item.fireAt;
    if (!item.id.trim() || !Number.isFinite(time)) continue;
    const prior = unique.get(item.id);
    if (!prior || time < prior.time) unique.set(item.id, { domain, id: item.id, time, labels: { ...input.labels },
      target: domain === 'class' && item.target ? { ...item.target } : undefined });
  }
  return [...unique.values()];
}

/**
 * Share one instance between class and Moodle. Single-domain operations preserve the other domain;
 * only explicit reconcileOwner replaces both complete plans and globally picks the nearest future items.
 * getSessionEpoch must advance on every login/logout, including re-login to the same numeric owner.
 */
export function createReminderScheduler(options: {
  port: NativeReminderPort;
  getOwner: () => string | null;
  getSessionEpoch: () => number;
  now?: () => Date;
  capacity?: number;
}) {
  const { port } = options;
  const now = options.now ?? (() => new Date());
  const capacity = options.capacity ?? 50;
  if (!Number.isSafeInteger(capacity) || capacity < 0) throw new RangeError('invalid reminder capacity');
  let tail: Promise<unknown> = Promise.resolve();
  let sessionRevision = 0;
  const revisions = new Map<string, number>();
  const key = (owner: string, domain: ReminderDomain) => `${owner}:${domain}`;

  function revise(owner: string, domains: readonly ReminderDomain[]): (domain?: ReminderDomain) => boolean {
    const versions = domains.map((domain) => {
      const id = key(owner, domain), version = (revisions.get(id) ?? 0) + 1;
      revisions.set(id, version);
      return { id, version, domain };
    });
    return (domain) => versions.filter((item) => domain === undefined || item.domain === domain)
      .every(({ id, version }) => revisions.get(id) === version);
  }

  function enqueue<T>(operation: () => Promise<T>): Promise<T> {
    const job = tail.then(operation);
    tail = job.catch(() => undefined); // A native failure does not poison the next queued operation.
    return job;
  }

  async function cancelCreated(created: readonly ScheduledReminder[]): Promise<void> {
    for (const item of created) await port.cancelScheduledNotificationAsync(item.notificationId);
  }

  function replace(owner: string, domains: readonly ReminderDomain[], candidates: Candidate[]): Promise<ReminderScheduleResult> {
    requireOwner(owner);
    const sameVersion = revise(owner, domains);
    const session = sessionRevision, epoch = options.getSessionEpoch();
    const sameSession = () => sessionRevision === session
      && options.getSessionEpoch() === epoch && options.getOwner() === owner;
    const hasCurrentDomain = () => domains.some((domain) => sameVersion(domain));

    return enqueue(async () => {
      if (!sameSession() || !hasCurrentDomain()) return stale();
      const existing = await port.getAllScheduledNotificationsAsync();
      if (!sameSession()) return stale();
      for (const request of existing) {
        const domain = domains.find((item) => isTagged(request, owner, [item]));
        if (!domain || !sameVersion(domain)) continue;
        await port.cancelScheduledNotificationAsync(request.identifier);
        if (!sameSession()) return stale();
      }
      if (!hasCurrentDomain()) return stale();
      const permission = await port.getPermissionsAsync();
      if (!sameSession() || !hasCurrentDomain()) return stale();
      const future = candidates.filter((item) => sameVersion(item.domain) && item.time > now().getTime())
        .sort((a, b) => a.time - b.time || a.domain.localeCompare(b.domain) || a.id.localeCompare(b.id));
      if (!permission.granted) return { status: 'permission-denied', scheduled: [], deferred: future.length };

      // Foreign owners, other domains in a domain replacement, and untagged requests reserve capacity.
      const remaining = await port.getAllScheduledNotificationsAsync();
      if (!sameSession()) return stale();
      const available = Math.max(0, capacity - remaining.length);
      const created: ScheduledReminder[] = [];
      const invalidCreated = () => created.filter((item) => !sameSession() || !sameVersion(item.domain));
      async function discardInvalid(): Promise<void> {
        const invalid = invalidCreated();
        await cancelCreated(invalid);
        for (const item of invalid) created.splice(created.indexOf(item), 1);
      }
      try {
        for (const item of future) {
          while (invalidCreated().length > 0) await discardInvalid();
          if (!sameSession()) return stale();
          if (!sameVersion(item.domain)) continue;
          if (created.length >= available) break;
          if (item.time <= now().getTime()) continue;
          const notificationId = await port.scheduleNotificationAsync({
            content: { ...item.labels, data: { dormReminder: NAMESPACE, owner, domain: item.domain,
              ...(item.target ? { target: item.target } : {}) } },
            trigger: new Date(item.time),
          });
          created.push({ domain: item.domain, id: item.id, notificationId });
        }
        while (invalidCreated().length > 0) await discardInvalid();
        if (!sameSession()) return stale();
        const retainedFuture = future.filter((item) => sameVersion(item.domain));
        return { status: sameVersion() ? 'scheduled' : 'stale', scheduled: created,
          deferred: Math.max(0, retainedFuture.length - created.length) };
      } catch (error) {
        await cancelCreated(created);
        throw error;
      }
    });
  }

  function clear(owner: string, domains: readonly ReminderDomain[]): Promise<ReminderScheduleResult> {
    requireOwner(owner);
    const active = revise(owner, domains);
    // Logout cleanup may name the previous owner even when getOwner is already null/a new account.
    return enqueue(async () => {
      if (!active()) return stale();
      const existing = await port.getAllScheduledNotificationsAsync();
      if (!active()) return stale();
      for (const request of existing) {
        if (!isTagged(request, owner, domains)) continue;
        await port.cancelScheduledNotificationAsync(request.identifier);
        if (!active()) return stale();
      }
      return { status: 'scheduled', scheduled: [], deferred: 0 };
    });
  }

  return {
    replaceDomain(owner: string, domain: ReminderDomain, plan: readonly ReminderTime[], labels: ReminderLabels) {
      return replace(owner, [domain], candidatesFor(domain, { plan, labels }));
    },
    clearDomain(owner: string, domain: ReminderDomain) { return clear(owner, [domain]); },
    reconcileOwner(owner: string, plans: OwnerReminderPlans) {
      return replace(owner, DOMAINS, DOMAINS.flatMap((domain) => candidatesFor(domain, plans[domain])));
    },
    clearOwner(owner: string) { return clear(owner, DOMAINS); },
    /** Synchronously invalidate in-flight work before queueing precise old-owner cleanup. */
    invalidateSession() { sessionRevision += 1; },
  };
}

export type ReminderScheduler = ReturnType<typeof createReminderScheduler>;
