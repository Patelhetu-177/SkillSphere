declare module 'pptx2json' {
  class PptxToHtml {
    /**
     * Convert a PowerPoint file buffer to HTML
     * @param buffer Buffer containing the PowerPoint file data
     * @returns Promise that resolves to the HTML string
     */
    convert(buffer: Buffer): Promise<string>;
  }

  export = PptxToHtml;
}
