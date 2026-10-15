import { and, desc, eq, inArray, isNull, or } from 'drizzle-orm';

import { db } from '@/core/db';
import { aiTask } from '@/config/db/schema';
import { consume, revoke } from '@/modules/credits/service';
import { getUuid } from '@/lib/hash';

export enum AITaskStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  SUCCESS = 'success',
  FAILED = 'failed',
  CANCELED = 'canceled',
}

/**
 * Create an AI task with optional credit consumption.
 */
export async function createTask(params: {
  userId: string;
  mediaType: string;
  provider: string;
  model: string;
  prompt: string;
  costCredits?: number;
  options?: any;
}): Promise<any> {
  const { userId, mediaType, provider, model, prompt, costCredits, options } =
    params;

  return db().transaction(async (tx: any) => {
    // 1. Insert task
    const taskData: any = {
      id: getUuid(),
      userId,
      mediaType,
      provider,
      model,
      prompt,
      status: AITaskStatus.PENDING,
      costCredits: costCredits || 0,
      options: options ? JSON.stringify(options) : null,
    };

    const [task] = await tx.insert(aiTask).values(taskData).returning();

    // 2. Consume credits if cost > 0
    if (costCredits && costCredits > 0) {
      const result = await consume({
        userId,
        credits: costCredits,
        scene: 'ai_task',
        // The model belongs on the ledger line itself: a statement of
        // identical "-40"s is unreadable, and the taskId in metadata only
        // answers the question after a second lookup.
        description: `AI ${mediaType} generation · ${model}`,
        metadata: JSON.stringify({ taskId: task.id, provider, model }),
        tx,
      });

      if (!result.success) {
        throw new Error('Insufficient credits');
      }

      // Store consumed credit ID for potential revocation
      if (result.consumedCredit) {
        await tx
          .update(aiTask)
          .set({
            taskInfo: JSON.stringify({ creditId: result.consumedCredit.id }),
          })
          .where(eq(aiTask.id, task.id));
      }
    }

    return task;
  });
}

/** Update task status. Failed or user-canceled work returns its credits. */
export async function updateTask(params: {
  taskId: string;
  status: AITaskStatus;
  taskResult?: any;
}) {
  const { taskId, status, taskResult } = params;

  const [task] = await db()
    .select()
    .from(aiTask)
    .where(eq(aiTask.id, taskId))
    .limit(1);

  if (!task) throw new Error('Task not found');

  // Terminal states are immutable. Every success/failure/cancel competes for
  // the same PENDING/PROCESSING row, and whichever transition commits first
  // wins without a later poll overwriting it.
  const updateData: any = { status };
  if (taskResult) {
    updateData.taskResult = JSON.stringify(taskResult);
  }

  await db()
    .update(aiTask)
    .set(updateData)
    .where(
      and(
        eq(aiTask.id, taskId),
        inArray(aiTask.status, [AITaskStatus.PENDING, AITaskStatus.PROCESSING])
      )
    );

  const updatedTask = await findTask(taskId);
  if (!updatedTask) throw new Error('Task not found after update');

  // Revoke credits on failure or cancellation. `revoke` is idempotent: only
  // an active consumption record can be restored, so repeated terminal
  // updates cannot return the same credits twice.
  if (
    updatedTask.status === status &&
    (status === AITaskStatus.FAILED || status === AITaskStatus.CANCELED) &&
    task.taskInfo
  ) {
    try {
      const info = JSON.parse(task.taskInfo as string);
      if (info.creditId) {
        await revoke(info.creditId);
      }
    } catch {
      // Ignore parse errors
    }
  }

  return updatedTask;
}

/** Record the provider id once an asynchronous render has been accepted. */
export async function markTaskProcessing(params: {
  taskId: string;
  providerTaskId: string;
}): Promise<boolean> {
  await db()
    .update(aiTask)
    .set({
      taskId: params.providerTaskId,
      status: AITaskStatus.PROCESSING,
    })
    .where(
      and(eq(aiTask.id, params.taskId), eq(aiTask.status, AITaskStatus.PENDING))
    );

  const task = await findTask(params.taskId);
  return task?.status === AITaskStatus.PROCESSING;
}

function taskSessionId(task: { options?: string | null }): string {
  if (!task.options) return '';
  try {
    const options = JSON.parse(task.options) as { sessionId?: unknown };
    return typeof options.sessionId === 'string' ? options.sessionId : '';
  } catch {
    return '';
  }
}

/** Active provider jobs owned by one chat session. */
export async function getActiveTasksForSession(params: {
  userId: string;
  sessionId: string;
}) {
  const rows = await db()
    .select()
    .from(aiTask)
    .where(
      and(
        eq(aiTask.userId, params.userId),
        or(
          eq(aiTask.status, AITaskStatus.PENDING),
          eq(aiTask.status, AITaskStatus.PROCESSING)
        ),
        isNull(aiTask.deletedAt)
      )
    )
    .orderBy(desc(aiTask.createdAt));

  return rows.filter((task) => taskSessionId(task) === params.sessionId);
}

/**
 * Get tasks for a user.
 */
export async function getTasks(params: {
  userId: string;
  mediaType?: string;
  status?: string;
  page?: number;
  limit?: number;
}) {
  const { userId, mediaType, status, page = 1, limit = 20 } = params;

  return db()
    .select()
    .from(aiTask)
    .where(
      and(
        eq(aiTask.userId, userId),
        mediaType ? eq(aiTask.mediaType, mediaType) : undefined,
        status ? eq(aiTask.status, status) : undefined,
        isNull(aiTask.deletedAt)
      )
    )
    .orderBy(desc(aiTask.createdAt))
    .limit(limit)
    .offset((page - 1) * limit);
}

/**
 * Find task by ID.
 */
export async function findTask(taskId: string) {
  const [result] = await db()
    .select()
    .from(aiTask)
    .where(eq(aiTask.id, taskId))
    .limit(1);
  return result;
}
