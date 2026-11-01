import 'fake-indexeddb/auto'
import '@testing-library/jest-dom'

/**
 * jsdom 不实现 ResizeObserver / matchMedia，而 SlideSegmented、图表等布局组件
 * 在 render 期就会直接构造/调用它们。不补的话，任何渲染到这些组件的测试都会以
 * ReferenceError / TypeError 失败，看起来像真 bug。
 *
 * 补成 stub 而不是让被测代码 try/catch 兜住：真实浏览器一定有这两个 API，
 * 测试环境缺了属于环境缺陷，应该在环境层补齐，而不是在业务代码里迁就它。
 */

if (!('ResizeObserver' in globalThis)) {
  class ResizeObserverStub {
    observe(): void {}
    unobserve(): void {}
    disconnect(): void {}
  }
  Object.defineProperty(globalThis, 'ResizeObserver', {
    value: ResizeObserverStub,
    writable: true,
    configurable: true,
  })
}

if (typeof window !== 'undefined' && typeof window.matchMedia !== 'function') {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    configurable: true,
    value: (query: string): MediaQueryList => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }) as unknown as MediaQueryList,
  })
}
