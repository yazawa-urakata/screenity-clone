export const base64ToUint8Array = (base64: string): Blob => {
  const dataUrlRegex = /^data:(.*?);base64,/;
  const matches = base64.match(dataUrlRegex);

  const decodeBase64 = (base64String: string): Uint8Array => {
    const binaryString = atob(base64String);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
  };

  if (matches !== null) {
    // Base64 is a Data URL
    const mimeType = matches[1];
    // TypeScript workaround: Uint8Array.buffer is typed as ArrayBufferLike,
    // but Blob constructor expects ArrayBuffer. Since new Uint8Array(length)
    // always creates an ArrayBuffer (not SharedArrayBuffer), this cast is safe.
    const bytes = decodeBase64(base64.slice(matches[0].length)) as BlobPart;
    return new Blob([bytes], {
      type: mimeType,
    });
  } else {
    // Base64 is a regular string
    // Same TypeScript workaround as above
    const bytes = decodeBase64(base64) as BlobPart;
    return new Blob([bytes], { type: "video/webm" });
  }
};
