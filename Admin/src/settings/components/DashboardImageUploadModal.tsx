import React, { useEffect } from "react";
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Typography
} from "@mui/material";
import { ImageEditor, ApiHelper, CommonEnvironmentHelper } from "@machonharuach/apphelper";
import { FileHelper } from "@machonharuach/helpers";

type Props = {
  onClose: () => void;
  onSelect: (publicUrl: string) => void;
  /** Default 16:9 — must match `GalleryModal` folder naming (e.g. 1.78). */
  aspectRatio?: number;
};

/** Avoids react-cropper warning: empty string as img src. */
const TRANSPARENT_PIXEL =
  "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7";

/**
 * Upload-only image picker: does not call `GET /content/gallery/:folder`, so it still works when
 * S3 list (or org policy) makes gallery listing return 500.
 */
export function DashboardImageUploadModal({ onClose, onSelect, aspectRatio = 16 / 9 }: Props) {
  const folder = React.useMemo(
    () => (Math.round(aspectRatio * 100) / 100).toString(),
    [aspectRatio]
  );

  useEffect(() => {
    const timer = window.setInterval(() => {
      const dialogs = Array.from(document.querySelectorAll('[role="dialog"]'));
      const uploadDialog = dialogs.find(d => (d.textContent || "").includes("Upload card image"));
      if (!uploadDialog) return;
      const buttons = Array.from(uploadDialog.querySelectorAll("button"));
      const updateButton = buttons.find(b => (b.textContent || "").trim() === "Update");
      if (updateButton) updateButton.textContent = "Save";
    }, 200);
    return () => window.clearInterval(timer);
  }, []);

  const handleImageUpdated = async (dataUrl: string) => {
    if (!dataUrl) return;
    const fileName = `${Math.floor(Date.now() / 1000)}.jpg`;
    const root = (CommonEnvironmentHelper.ContentRoot || "").replace(/\/$/, "");

    const finish = (key: string) => {
      onSelect(key && root ? `${root}/${key.replace(/^\/+/, "")}` : key);
      onClose();
    };

    try {
      const blob = FileHelper.dataURLtoBlob(dataUrl);
      const fileType = blob.type || "image/jpeg";

      // Prefer API upload — works without S3 bucket CORS for localhost admin.
      try {
        const uploaded = await ApiHelper.post(
          "/gallery/uploadImage",
          { folder, fileName, fileContents: dataUrl, fileType },
          "ContentApi"
        );
        if (uploaded?.key) {
          finish(uploaded.key);
          return;
        }
        throw new Error(uploaded?.error || "Upload did not return a storage key.");
      } catch (directErr) {
        const msg = directErr instanceof Error ? directErr.message : String(directErr);
        const endpointMissing = /not found|404/i.test(msg);
        if (!endpointMissing) throw directErr;
        console.warn("Direct gallery upload unavailable, trying presigned POST", directErr);
      }

      const file = new File([blob], fileName, { type: fileType });
      const presigned = await ApiHelper.post(
        "/gallery/requestUpload",
        { folder, fileName },
        "ContentApi"
      );
      if (!presigned?.key) {
        throw new Error(presigned?.error || "Upload could not be started (no storage key from API).");
      }
      await FileHelper.postPresignedFile(presigned, file, () => {});
      finish(presigned.key);
    } catch (e) {
      console.error(e);
      const detail = e instanceof Error && e.message ? e.message : "Unknown error";
      window.alert(`Image upload failed: ${detail}\n\nYou can still paste an Image URL on the card form.`);
    }
  };

  return (
    <Dialog
      open
      onClose={onClose}
      maxWidth="md"
      fullWidth
      sx={{
        // Upload button in ImageEditor header (SmallButton outlined primary)
        "& #input-box-actions .MuiButton-root": {
          color: "rgba(255,255,255,0.78)",
          borderColor: "rgba(255,255,255,0.34)"
        },
        // Save button in ImageEditor footer
        "& #input-box-buttons .MuiButton-contained": {
          backgroundColor: "rgba(255,255,255,0.24)",
          color: "rgba(255,255,255,0.92)"
        },
        "& #input-box-buttons .MuiButton-contained:hover": { backgroundColor: "rgba(255,255,255,0.32)" },
        // Cancel button in ImageEditor footer
        "& #input-box-buttons .MuiButton-text": { color: "rgba(255,255,255,0.72)" }
      }}
    >
      <DialogTitle>Upload card image</DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Crop your image, then click Save. This flow does not load the media gallery list, so it works even when
          gallery browsing returns an error.
        </Typography>
        <ImageEditor
          aspectRatio={aspectRatio}
          photoUrl={TRANSPARENT_PIXEL}
          outputWidth={1280}
          outputHeight={720}
          hideDelete
          onCancel={onClose}
          onUpdate={handleImageUpdated}
        />
      </DialogContent>
      <DialogActions>
        <Button
          onClick={onClose}
          sx={{
            textTransform: "none",
            color: "rgba(255,255,255,0.72)",
            borderColor: "rgba(255,255,255,0.34)"
          }}
        >
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
}
