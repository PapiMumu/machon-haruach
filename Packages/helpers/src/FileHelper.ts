export class FileHelper {

  static postPresignedFile = (presigned: any, uploadedFile: File, progressCallback: (percent: number) => void) => {
    const formData = new FormData();
    const fields = presigned?.fields || {};
    for (const property in fields) {
      formData.append(property, fields[property]);
    }
    // Presigned POST policy allows Content-Type via starts-with condition; do not send acl (breaks buckets with ACLs disabled).
    if (!Object.prototype.hasOwnProperty.call(fields, "Content-Type")) {
      formData.append("Content-Type", uploadedFile.type || "application/octet-stream");
    }
    formData.append("file", uploadedFile);

    // Use XMLHttpRequest for upload progress tracking since fetch doesn't support it natively
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();

      xhr.upload.addEventListener("progress", (event) => {
        if (event.lengthComputable) {
          const percent = Math.round((event.loaded / event.total) * 100);
          progressCallback(percent);
        }
      });

      xhr.addEventListener("load", () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve({
            status: xhr.status,
            statusText: xhr.statusText,
            data: xhr.responseText
          });
        } else {
          reject(new Error(`S3 upload failed (${xhr.status}): ${xhr.responseText || xhr.statusText}`));
        }
      });

      xhr.addEventListener("error", () => {
        reject(new Error("Network error uploading to storage (check S3 CORS for this admin origin)."));
      });

      xhr.open("POST", presigned.url);
      xhr.send(formData);
    });
  };

  static dataURLtoBlob(dataurl: string) {
    const arr = dataurl.split(",");
    if (arr.length < 2) throw new Error("Invalid data URL format");
    const mimeMatch = arr[0].match(/:(.*?);/);
    if (!mimeMatch) throw new Error("Invalid MIME type in data URL");
    const mime = mimeMatch[1];
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }
    return new Blob([u8arr], { type: mime });
  }
}
