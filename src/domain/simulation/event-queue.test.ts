import { describe, expect, it } from 'vitest'
import { EventQueue } from './event-queue'

describe('EventQueue', () => {
  it('matches the golden dequeue order for time, priority, and FIFO ties', () => {
    const queue = new EventQueue<string>()
    queue.enqueue(20, 0, 'later')
    queue.enqueue(10, 2, 'lower priority')
    queue.enqueue(10, 1, 'first tie')
    queue.enqueue(10, 1, 'second tie')
    queue.enqueue(0, 9, 'earliest')

    expect(Array.from({ length: 5 }, () => queue.dequeue())).toEqual([
      { timeMs: 0, priority: 9, sequenceNumber: 4, payload: 'earliest' },
      { timeMs: 10, priority: 1, sequenceNumber: 2, payload: 'first tie' },
      { timeMs: 10, priority: 1, sequenceNumber: 3, payload: 'second tie' },
      { timeMs: 10, priority: 2, sequenceNumber: 1, payload: 'lower priority' },
      { timeMs: 20, priority: 0, sequenceNumber: 0, payload: 'later' },
    ])
    expect(queue.dequeue()).toBeUndefined()
  })

  it('rejects invalid ordering keys without consuming sequence numbers', () => {
    const queue = new EventQueue<string>()
    expect(() => queue.enqueue(-1, 0, 'negative time')).toThrow(RangeError)
    expect(() => queue.enqueue(0.5, 0, 'fractional time')).toThrow(RangeError)
    expect(() => queue.enqueue(0, Infinity, 'invalid priority')).toThrow(RangeError)

    queue.enqueue(0, 0, 'valid')
    expect(queue.dequeue()?.sequenceNumber).toBe(0)
    expect(queue.dequeue()).toBeUndefined()
  })
})
