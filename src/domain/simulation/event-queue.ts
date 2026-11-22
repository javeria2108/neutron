interface ScheduledEvent<Payload> {
  readonly timeMs: number
  readonly priority: number
  readonly sequenceNumber: number
  readonly payload: Payload
}

export class EventQueue<Payload> {
  private readonly events: ScheduledEvent<Payload>[] = []
  private nextSequenceNumber = 0

  enqueue(timeMs: number, priority: number, payload: Payload): void {
    if (!Number.isSafeInteger(timeMs) || timeMs < 0) {
      throw new RangeError('Event time must be a nonnegative safe integer')
    }
    if (!Number.isSafeInteger(priority)) {
      throw new RangeError('Event priority must be a safe integer')
    }
    if (!Number.isSafeInteger(this.nextSequenceNumber)) {
      throw new RangeError('Event sequence number limit exceeded')
    }

    this.events.push({ timeMs, priority, sequenceNumber: this.nextSequenceNumber, payload })
    this.nextSequenceNumber += 1
    this.events.sort((left, right) =>
      left.timeMs - right.timeMs ||
      left.priority - right.priority ||
      left.sequenceNumber - right.sequenceNumber,
    )
  }

  dequeue(): ScheduledEvent<Payload> | undefined {
    return this.events.shift()
  }
}
