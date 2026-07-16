/**
 * DelimiterStreamParser parses a raw token stream containing custom delimiter headers
 * and yields structured key-value segments.
 */
export class DelimiterStreamParser {
  private buffer = "";
  private currentField: string | null = null;
  private headers: Array<{ tag: string; field: string }>;

  constructor(headers: Array<{ tag: string; field: string }>) {
    this.headers = headers;
  }

  public push(chunk: string): Array<{ field: string; text: string }> {
    this.buffer += chunk;
    const outputs: Array<{ field: string; text: string }> = [];

    while (true) {
      let foundHeader = false;

      // Find the earliest header in the buffer
      let earliestIndex = Infinity;
      let selectedHeader = null;

      for (const h of this.headers) {
        const idx = this.buffer.indexOf(h.tag);
        if (idx !== -1 && idx < earliestIndex) {
          earliestIndex = idx;
          selectedHeader = h;
        }
      }

      if (selectedHeader) {
        // Output everything before this header as part of the previous field
        const textBefore = this.buffer.substring(0, earliestIndex);
        if (textBefore && this.currentField) {
          outputs.push({ field: this.currentField, text: textBefore });
        }

        // Switch to the new field and strip the header
        this.currentField = selectedHeader.field;
        this.buffer = this.buffer.substring(earliestIndex + selectedHeader.tag.length);
        foundHeader = true;
      }

      if (!foundHeader) {
        break;
      }
    }

    // Process remaining buffer content
    if (this.buffer && this.currentField) {
      // Find the maximum potential header tag length to avoid slicing a half-formed tag
      const maxTagLen = Math.max(...this.headers.map((h) => h.tag.length));
      
      // Look for a possible tag prefix (starting with '-') near the end of the buffer
      let safeLength = this.buffer.length;
      const lastDash = this.buffer.lastIndexOf('-');
      
      if (lastDash !== -1 && lastDash >= this.buffer.length - maxTagLen) {
        // We have a partial tag forming, buffer it
        safeLength = lastDash;
      }

      if (safeLength > 0) {
        const textToSend = this.buffer.substring(0, safeLength);
        outputs.push({ field: this.currentField, text: textToSend });
        this.buffer = this.buffer.substring(safeLength);
      }
    }

    return outputs;
  }

  /**
   * Flush any remaining text in the buffer at the end of the stream.
   */
  public flush(): Array<{ field: string; text: string }> {
    const outputs: Array<{ field: string; text: string }> = [];
    if (this.buffer && this.currentField) {
      outputs.push({ field: this.currentField, text: this.buffer });
      this.buffer = "";
    }
    return outputs;
  }
}
