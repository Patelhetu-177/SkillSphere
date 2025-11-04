// types/langchain-compat.d.ts
declare module '@langchain/community/document_loaders/fs/text' {
  interface Document<T = Record<string, any>> {
    pageContent: string;
    metadata: T;
  }

  export class TextLoader {
    constructor(path: string);
    load(): Promise<Array<Document>>;
  }
  
  export default TextLoader;
}
