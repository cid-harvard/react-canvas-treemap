// Adapted from http://code.iamkate.com/javascript/queues/.

class Queue<T> {
  private queue: T[] = [];
  private offset = 0;

  getLength() {
    return this.queue.length - this.offset;
  }

  isEmpty() {
    return this.queue.length === 0;
  }

  enqueue(item: T) {
    this.queue.push(item);
  }

  dequeue(): T {
    let queue = this.queue;
    let offset = this.offset;

    // if the queue is empty, return immediately
    if (queue.length === 0) {
      throw new Error('Cannot dequeue from empty queue');
    }

    // store the item at the front of the queue
    const item = queue[offset];

    // increment the offset and remove the free space if necessary
    if (++ offset * 2 >= queue.length) {
      queue  = queue.slice(offset);
      offset = 0;
    }

    this.queue = queue;
    this.offset = offset;

    // return the dequeued item
    return item;
  }

  /* Returns the item at the front of the queue (without dequeuing it). If the
   * queue is empty then undefined is returned.
   */
  peek(): T {
    const queue = this.queue;
    const offset = this.offset;

    if (queue.length <= 0) {
      throw new Error('Empty queue');
    }

    return queue[offset];
  }
}

export default Queue;
