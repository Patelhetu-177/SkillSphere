declare module 'pdfjs-dist/build/pdf.mjs' {
  import * as pdfjsLib from 'pdfjs-dist';
  export = pdfjsLib;
}

declare module 'pdfjs-dist/build/pdf.worker.mjs' {
  const worker: Worker;
  export default worker;
}

declare module 'pdfjs-dist/build/pdf.worker.mjs?url' {
  const workerUrl: string;
  export default workerUrl;
}
