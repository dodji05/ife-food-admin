// Déclaration minimale pour DOMPurify — remplacée par @types/dompurify en CI/CD
declare module 'dompurify' {
  namespace DOMPurify {
    interface Config {
      ALLOWED_TAGS?: string[]
      ALLOWED_ATTR?: string[]
      ALLOWED_URI_REGEXP?: RegExp
      ADD_ATTR?: string[]
      FORCE_BODY?: boolean
      RETURN_DOM_FRAGMENT?: boolean
      RETURN_DOM?: boolean
    }
  }
  const DOMPurify: {
    sanitize(dirty: string, config?: DOMPurify.Config): string
    addHook(entryPoint: string, hookFunction: (node: Element) => void): void
  }
  export = DOMPurify
  export as namespace DOMPurify
}
