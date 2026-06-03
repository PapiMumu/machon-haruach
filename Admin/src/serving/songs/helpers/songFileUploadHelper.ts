import axios from "axios";
import { ApiHelper } from "@machonharuach/apphelper";
import { resolveContentUrl, resolveUploadedContentPath } from "../../../helpers/ContentUrlHelper";
import type { FileInterface } from "../../../helpers/Interfaces";

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/** Upload a file to church content storage (S3 when configured). */
export async function uploadContentFile(
  file: File,
  contentType: string,
  contentId: string,
  onProgress?: (percent: number) => void
): Promise<FileInterface> {
  const presigned = await ApiHelper.post(
    "/files/postUrl",
    { fileName: file.name, contentType, contentId },
    "ContentApi"
  );

  if (presigned?.key) {
    const formData = new FormData();
    if (file.type) formData.append("Content-Type", file.type);
    if (presigned.fields) {
      for (const property in presigned.fields) {
        formData.append(property, presigned.fields[property]);
      }
    }
    formData.append("file", file);
    await axios.post(presigned.url, formData, {
      headers: { "Content-Type": "multipart/form-data" },
      onUploadProgress: (evt) => {
        if (onProgress && evt.total) {
          onProgress(Math.round((100 * evt.loaded) / evt.total));
        }
      }
    });
  }

  const payload: FileInterface = {
    fileName: file.name,
    fileType: file.type,
    size: file.size,
    contentType,
    contentId
  };

  if (!presigned?.key) {
    payload.fileContents = await readFileAsDataUrl(file);
  }

  const saved = (await ApiHelper.post("/files", [payload], "ContentApi")) as FileInterface[];
  return saved[0];
}

export function mediaUrlFromUploadedFile(file: FileInterface): string {
  const key = (file as FileInterface & { key?: string }).key;
  return resolveContentUrl(resolveUploadedContentPath(file.contentPath || "", key));
}

export function titleFromAudioFileName(fileName: string): string {
  return fileName
    .replace(/\.[^.]+$/i, "")
    .replace(/^\d+[\s._-]*/, "")
    .replace(/[-_]+/g, " ")
    .trim();
}
