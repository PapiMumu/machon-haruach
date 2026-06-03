import { useState, useEffect } from "react";
import axios from "axios";
import { LinearProgress, Typography, Box } from "@mui/material";
import { ApiHelper } from "@machonharuach/apphelper";
import type { FileInterface } from "../helpers/Interfaces";

type Props = {
  pendingSave: boolean;
  saveCallback: (file: FileInterface) => void;
  contentType: string;
  contentId: string;
  /** Optional HTML `accept` for the file input (e.g. `audio/*`). */
  accept?: string;
  /** Unique id for the file input (required when multiple FileUpload instances exist on one page). */
  inputId?: string;
  /** `hidden` — no label or visible file input (parent supplies UI). */
  variant?: "default" | "hidden";
  onFileSelected?: (file: File | null) => void;
};

export function FileUpload(props: Props) {
  const inputId = props.inputId || "fileUpload";
  const [file, setFile] = useState<FileInterface>({} as FileInterface);
  const [uploadedFile, setUploadedFile] = useState<File>({} as File);
  const [uploadProgress, setUploadProgress] = useState(-1);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    const picked = e.target.files?.[0];
    setUploadedFile(picked || ({} as File));
    props.onFileSelected?.(picked || null);
  };

  const convertBase64 = () => new Promise((resolve, reject) => {
    const fileReader = new FileReader();
    fileReader.readAsDataURL(uploadedFile);
    fileReader.onload = () => { resolve(fileReader.result); };
    fileReader.onerror = (error) => { reject(error); };
  });

  const handleSave = async () => {
    const f = { ...file };
    f.size = uploadedFile.size;
    f.fileType = uploadedFile.type;
    f.fileName = uploadedFile.name;
    f.contentType = props.contentType;
    f.contentId = props.contentId;
    const preUploaded: boolean = await preUpload();
    if (!preUploaded) {
      const base64 = await convertBase64();
      f.fileContents = base64 as string;
    }
    const data: FileInterface[] = await ApiHelper.post("/files", [f], "ContentApi");
    setFile({});
    setUploadedFile({} as File);
    const el = document.getElementById(inputId) as HTMLInputElement | null;
    if (el) el.value = "";
    props.saveCallback(data[0]);
  };

  const preUpload = async () => {
    const params = { fileName: uploadedFile.name, contentType: props.contentType, contentId: props.contentId };
    const presigned = await ApiHelper.post("/files/postUrl", params, "ContentApi");
    const doUpload = presigned.key !== undefined;
    if (doUpload) await postPresignedFile(presigned);
    return doUpload;
  };

  const postPresignedFile = (presigned: any) => {
    const formData = new FormData();
    formData.append("acl", "public-read");
    formData.append("Content-Type", uploadedFile.type);
    for (const property in presigned.fields) {
      formData.append(property, presigned.fields[property]);
    }
    const f = document.getElementById(inputId) as HTMLInputElement | null;
    if (f?.files?.[0]) formData.append("file", f.files[0]);

    const axiosConfig = {
      headers: { "Content-Type": "multipart/form-data" },
      onUploadProgress: (data: any) => {
        setUploadProgress(Math.round((100 * data.loaded) / data.total));
      }
    };

    return axios.post(presigned.url, formData, axiosConfig);
  };

  useEffect(() => {
    if (props.pendingSave) {
      if (uploadedFile.size > 0) handleSave();
      else props.saveCallback(file);
    }

  }, [props.pendingSave]);

  const getFileLink = () => {
    if (uploadProgress > -1 && props.pendingSave) return <LinearProgress value={uploadProgress} />;
    else if (file) return (<Box><a href={file.contentPath}>{file.fileName}</a></Box>);
  };

  if (props.variant === "hidden") {
    return (
      <>
        {getFileLink()}
        <input
          id={inputId}
          type="file"
          accept={props.accept}
          onChange={handleChange}
          style={{ display: "none" }}
        />
      </>
    );
  }

  return (
    <>
      <Typography variant="body2" sx={{ mb: 1, fontWeight: 500 }}>File</Typography>
      {getFileLink()}
      <input id={inputId} type="file" accept={props.accept} onChange={handleChange} style={{ width: "100%" }} />
    </>
  );
}
