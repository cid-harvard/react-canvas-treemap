import Queue from './Queue';

export default class DOMPool {
  private queue: Queue<HTMLElement> = new Queue<HTMLElement>();
  constructor(readonly size: number, tagName: string) {
    const queue = this.queue;

    for (let i = 0; i < size; i += 1) {
      const elem = document.createElement(tagName);
      queue.enqueue(elem);
    }
  }

  enqueue(elem: HTMLElement) {
    this.queue.enqueue(elem);
  }

  dequeue(): HTMLElement {
    const queue = this.queue;
    return queue.dequeue();
  }
}
