import axios from "axios";

export class FileHelper {

  static postPresignedFile = (presigned: any, uploadedFile: File, progressCallback: (percent: number) => void) => {
    const formData = new FormData();
    const fields = presigned?.fields || {};
    for (const property in fields) {
      formData.append(property, fields[property]);
    }
    if (!Object.prototype.hasOwnProperty.call(fields, "Content-Type")) {
      formData.append("Content-Type", uploadedFile.type || "application/octet-stream");
    }
    formData.append("file", uploadedFile);

    const axiosConfig = {
      headers: { "Content-Type": "multipart/form-data" },
      onUploadProgress: (data: any) => {
        progressCallback(Math.round((100 * data.loaded) / data.total));
      }
    };

    return axios.post(presigned.url, formData, axiosConfig);
  };

  static dataURLtoBlob(dataurl: string) {
    const arr = dataurl.split(","), mime = arr[0].match(/:(.*?);/)[1],
      bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }
    return new Blob([u8arr], { type: mime });
  }
}
