import React from "react";
import { Alert, Box, Button, FormControl, InputLabel, Select, Stack, TextField, Typography, MenuItem, type SelectChangeEvent } from "@mui/material";
import { type ServiceInterface, type CampusInterface } from "@machonharuach/helpers";
import { useMountedState, InputBox, ApiHelper, UniqueIdHelper, ErrorMessages } from "@machonharuach/apphelper";
import { Locale } from "@machonharuach/apphelper";
import { DashboardImageUploadModal } from "../../settings/components/DashboardImageUploadModal";

interface Props {
  service: ServiceInterface;
  updatedFunction: () => void;
  fixedCampusId?: string;
  fixedCampusName?: string;
  planningFields?: {
    date?: string;
    time?: string;
    streamType?: string;
    streamData?: string;
    streamLink?: string;
    advertisementImage?: string;
    morningPrayerLead?: string;
    mc?: string;
    praiseWorshipTeam?: string;
    apostlesCreedLead?: string;
    announcementsLead?: string;
    preacher?: string;
  };
  onPlanningFieldChange?: (field: string, value: string) => void;
}

export const ServiceEdit: React.FC<Props> = (props) => {
  const [service, setService] = React.useState({} as ServiceInterface);
  const [campuses, setCampuses] = React.useState([] as CampusInterface[]);
  const [errors, setErrors] = React.useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [showPhotoGallery, setShowPhotoGallery] = React.useState(false);
  const [imageStatus, setImageStatus] = React.useState("");
  const [imageUrlInput, setImageUrlInput] = React.useState("");
  const isMounted = useMountedState();
  const streamType = props.planningFields?.streamType || "youtube";
  const streamData = props.planningFields?.streamData || "";

  const normalizeVideoData = (videoType: string, input: string) => {
    let result = String(input || "").split("&")[0];
    if (videoType === "youtube") {
      return result
        .replace("https://www.youtube.com/watch?v=", "")
        .replace("https://youtube.com/watch?v=", "")
        .replace("https://youtu.be/", "")
        .replace("https://www.youtube.com/embed/", "")
        .replace("https://studio.youtube.com/video/", "")
        .replace("/edit", "");
    }
    if (videoType === "vimeo") {
      return result.replace("https://vimeo.com/", "").replace("https://player.vimeo.com/video/", "");
    }
    if (videoType === "facebook") {
      return result.replace("https://facebook.com/video.php?v=", "");
    }
    return String(input || "").trim();
  };

  const getVideoUrl = (videoType: string, videoData: string) => {
    const key = normalizeVideoData(videoType, videoData);
    switch (videoType) {
      case "youtube": return `https://www.youtube.com/watch?v=${key}`;
      case "vimeo": return `https://vimeo.com/${key}`;
      case "facebook": return `https://facebook.com/video.php?v=${key}`;
      case "custom":
      default: return key;
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement> | SelectChangeEvent) => {
    setErrors([]);
    const s = { ...service } as ServiceInterface;
    const value = e.target.value;
    switch (e.target.name) {
      case "name": s.name = value; break;
      case "campus": s.campusId = value; break;
    }
    setService(s);
  };

  const validate = () => {
    const result = [];
    if (!service.name) result.push(Locale.label("attendance.serviceEdit.validate.name"));
    if (!service.campusId) result.push(Locale.label("attendance.serviceEdit.validate.campus"));
    setErrors(result);
    return result.length === 0;
  };

  const handleSave = () => {
    if (validate()) {
      setIsSubmitting(true);
      ApiHelper.post("/services", [service], "AttendanceApi")
        .then(props.updatedFunction)
        .finally(() => {
          setIsSubmitting(false);
        });
    }
  };
  const handleDelete = () => {
    if (window.confirm(Locale.label("attendance.serviceEdit.confirmDelete"))) ApiHelper.delete("/services/" + service.id, "AttendanceApi").then(props.updatedFunction);
  };

  const loadData = React.useCallback(() => {
    ApiHelper.get("/campuses", "AttendanceApi").then((data: any) => {
      if (isMounted()) {
        setCampuses(data);
      }
      const fixedCampusId = props.fixedCampusId || "";
      if (fixedCampusId) {
        const s = { ...props.service };
        s.campusId = fixedCampusId;
        if (isMounted()) setService(s);
      } else if (data.length > 0 && UniqueIdHelper.isMissing(service?.campusId)) {
        const s = { ...props.service };
        s.campusId = data[0].id;
        if (isMounted()) {
          setService(s);
        }
      }
    });
  }, [props.service, isMounted, props.fixedCampusId]);

  const getCampusOptions = () => {
    const options = [];
    for (let i = 0; i < campuses.length; i++) {
      options.push(<MenuItem key={i} value={campuses[i].id}>{campuses[i].name}</MenuItem>);
    }
    return options;
  };

  React.useEffect(() => {
    setService(props.service);
    loadData();
  }, [props.service, loadData, isMounted]);

  React.useEffect(() => {
    setImageUrlInput(props.planningFields?.advertisementImage || "");
    setImageStatus("");
  }, [props.planningFields?.advertisementImage, props.service?.id]);

  const updatePlanning = (field: string, value: string) => {
    props.onPlanningFieldChange?.(field, value);
  };

  const handleStreamTypeChange = (value: string) => {
    updatePlanning("streamType", value);
    const link = getVideoUrl(value, streamData);
    updatePlanning("streamLink", link);
  };

  const handleStreamDataChange = (value: string) => {
    updatePlanning("streamData", value);
    const link = getVideoUrl(streamType, value);
    updatePlanning("streamLink", link);
  };

  const handlePhotoSelected = (image: string) => {
    updatePlanning("advertisementImage", image || "");
    setImageUrlInput(image || "");
    setImageStatus("Image selected and attached to this service.");
    setShowPhotoGallery(false);
  };

  const handleApplyImageUrl = () => {
    const imageUrl = (imageUrlInput || "").trim();
    if (!imageUrl) {
      setImageStatus("Please enter an image URL first.");
      return;
    }
    updatePlanning("advertisementImage", imageUrl);
    setImageStatus("Image URL attached to this service.");
  };

  if (service === null || service.id === undefined) return null;

  return (
    <>
      <InputBox
      id="serviceBox"
      data-cy="service-box"
      cancelFunction={props.updatedFunction}
      saveFunction={handleSave}
      deleteFunction={props.service?.id ? handleDelete : null}
      headerText={service.name}
      headerIcon="calendar_month"
      isSubmitting={isSubmitting}
      help="docs/b1-admin/attendance/">
      <ErrorMessages errors={errors} />
      <FormControl fullWidth>
        <InputLabel id="campus">{Locale.label("attendance.serviceEdit.campus")}</InputLabel>
        <Select
          name="campus"
          labelId="campus"
          label={Locale.label("attendance.serviceEdit.campus")}
          value={service.campusId}
          onChange={handleChange}
          disabled={!!props.fixedCampusId}
          IconComponent={props.fixedCampusId ? (() => null) as any : undefined}
          data-testid="campus-select"
          aria-label="Select campus">
          {props.fixedCampusId
            ? <MenuItem value={props.fixedCampusId}>{props.fixedCampusName || "Selected Campus"}</MenuItem>
            : getCampusOptions()}
        </Select>
      </FormControl>
      <TextField
        fullWidth
        label={Locale.label("attendance.serviceEdit.name")}
        id="name"
        name="name"
        type="text"
        value={service.name}
        onChange={handleChange}
        placeholder={Locale.label("placeholders.service.name")}
        data-testid="service-name-input"
        aria-label="Service name"
      />

      {props.onPlanningFieldChange && (
        <Box sx={{ mt: 1 }}>
          <Typography variant="subtitle2" sx={{ mb: 1 }} color="text.secondary">
            Sunday Service Planning
          </Typography>
          {UniqueIdHelper.isMissing(service.id) ? (
            <Alert severity="info">Save the service first, then add planning details.</Alert>
          ) : (
            <Stack spacing={1}>
              <Stack direction={{ xs: "column", md: "row" }} spacing={1}>
                <TextField
                  size="small"
                  type="date"
                  label="Date"
                  value={props.planningFields?.date || ""}
                  onChange={(e) => updatePlanning("date", e.target.value)}
                  InputLabelProps={{ shrink: true }}
                  sx={{ flex: 1 }}
                />
                <TextField
                  size="small"
                  type="time"
                  label="Time"
                  value={props.planningFields?.time || ""}
                  onChange={(e) => updatePlanning("time", e.target.value)}
                  InputLabelProps={{ shrink: true }}
                  sx={{ flex: 1 }}
                />
              </Stack>
              <Stack direction={{ xs: "column", md: "row" }} spacing={1}>
                <FormControl size="small" sx={{ minWidth: 180 }}>
                  <InputLabel id="service-stream-type">Stream Provider</InputLabel>
                  <Select
                    labelId="service-stream-type"
                    label="Stream Provider"
                    value={streamType}
                    onChange={(e) => handleStreamTypeChange(e.target.value)}
                  >
                    <MenuItem value="youtube">YouTube</MenuItem>
                    <MenuItem value="vimeo">Vimeo</MenuItem>
                    <MenuItem value="facebook">Facebook</MenuItem>
                    <MenuItem value="custom">Custom URL</MenuItem>
                  </Select>
                </FormControl>
                <TextField
                  size="small"
                  fullWidth
                  label="Video ID or URL"
                  value={streamData}
                  onChange={(e) => handleStreamDataChange(e.target.value)}
                  placeholder={streamType === "youtube" ? "YouTube URL or ID" : streamType === "vimeo" ? "Vimeo URL or ID" : "Video URL"}
                />
              </Stack>
              <Box>
                {imageStatus && <Alert severity="info" sx={{ mb: 1 }}>{imageStatus}</Alert>}
                {String(props.planningFields?.advertisementImage || "").trim() && (
                  <Box sx={{ mb: 1.5, maxWidth: 320 }}>
                    <img
                      src={String(props.planningFields?.advertisementImage).trim()}
                      style={{ width: "100%", height: "auto", aspectRatio: "16/9", objectFit: "cover", borderRadius: 4 }}
                      alt="Service advertisement"
                    />
                  </Box>
                )}
                <Button variant="outlined" onClick={() => setShowPhotoGallery(true)} sx={{ textTransform: "none" }}>
                  {props.planningFields?.advertisementImage ? "Change Sunday Service Ad Picture" : "Select Sunday Service Ad Picture"}
                </Button>
                <Stack direction={{ xs: "column", sm: "row" }} spacing={1} sx={{ mt: 1.5 }}>
                  <TextField
                    fullWidth
                    size="small"
                    label="Advertisement Image URL"
                    value={imageUrlInput}
                    onChange={(e) => setImageUrlInput(e.target.value)}
                    placeholder="https://..."
                    helperText="Use this when gallery listing is unavailable."
                  />
                  <Button variant="outlined" onClick={handleApplyImageUrl} sx={{ textTransform: "none", minWidth: 130 }}>
                    Apply URL
                  </Button>
                </Stack>
              </Box>
              <TextField size="small" label="Morning Prayer Lead" value={props.planningFields?.morningPrayerLead || ""} onChange={(e) => updatePlanning("morningPrayerLead", e.target.value)} />
              <TextField size="small" label="MC" value={props.planningFields?.mc || ""} onChange={(e) => updatePlanning("mc", e.target.value)} />
              <TextField size="small" label="Praise & Worship Team" value={props.planningFields?.praiseWorshipTeam || ""} onChange={(e) => updatePlanning("praiseWorshipTeam", e.target.value)} />
              <TextField size="small" label="Apostles Creed Lead" value={props.planningFields?.apostlesCreedLead || ""} onChange={(e) => updatePlanning("apostlesCreedLead", e.target.value)} />
              <TextField size="small" label="Announcements Lead" value={props.planningFields?.announcementsLead || ""} onChange={(e) => updatePlanning("announcementsLead", e.target.value)} />
              <TextField size="small" label="Preacher" value={props.planningFields?.preacher || ""} onChange={(e) => updatePlanning("preacher", e.target.value)} />
            </Stack>
          )}
        </Box>
      )}
      </InputBox>
      {showPhotoGallery && (
        <DashboardImageUploadModal
          onClose={() => setShowPhotoGallery(false)}
          onSelect={handlePhotoSelected}
          aspectRatio={16 / 9}
        />
      )}
    </>
  );
};
