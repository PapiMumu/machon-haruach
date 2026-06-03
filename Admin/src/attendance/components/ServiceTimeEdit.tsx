import React from "react";
import { Alert, Box, Button, FormControl, InputLabel, Select, Stack, TextField, Typography, MenuItem, type SelectChangeEvent } from "@mui/material";
import { type ServiceTimeInterface, type ServiceInterface } from "@machonharuach/helpers";
import { useMountedState, InputBox, ApiHelper, ErrorMessages, Locale, UniqueIdHelper } from "@machonharuach/apphelper";
import { DashboardImageUploadModal } from "../../settings/components/DashboardImageUploadModal";

interface Props {
  serviceTime: ServiceTimeInterface;
  updatedFunction: () => void;
  fixedBranchName?: string;
  defaultServiceId?: string;
  allowedServiceIds?: string[];
  planningFields?: {
    fromDate?: string;
    toDate?: string;
    startTime?: string;
    endTime?: string;
    streamType?: string;
    streamData?: string;
    streamLink?: string;
    advertisementImage?: string;
    mc?: string;
    announcementsLead?: string;
    eventLeader?: string;
  };
  onPlanningFieldChange?: (field: string, value: string) => void;
}

export const ServiceTimeEdit: React.FC<Props> = (props) => {
  const [serviceTime, setServiceTime] = React.useState({} as ServiceTimeInterface);
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

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement> | SelectChangeEvent) => {
    setErrors([]);
    const st = { ...serviceTime } as ServiceTimeInterface;
    const value = e.target.value;
    switch (e.target.name) {
      case "name": st.name = value; break;
    }
    setServiceTime(st);
  };

  const validate = () => {
    const result = [];
    if (!serviceTime.name) result.push(Locale.label("attendance.serviceTimeEdit.validate.name"));
    if (!serviceTime.serviceId) result.push("Please add at least one service in this branch before adding events.");
    setErrors(result);
    return result.length === 0;
  };

  const handleSave = () => {
    if (validate()) {
      setIsSubmitting(true);
      ApiHelper.post("/servicetimes", [serviceTime], "AttendanceApi")
        .then(props.updatedFunction)
        .finally(() => {
          setIsSubmitting(false);
        });
    }
  };
  const handleDelete = () => {
    if (window.confirm(Locale.label("attendance.serviceTimeEdit.confirmDelete"))) ApiHelper.delete("/servicetimes/" + serviceTime.id, "AttendanceApi").then(props.updatedFunction);
  };

  const loadData = React.useCallback(() => {
    ApiHelper.get("/services", "AttendanceApi").then((data) => {
      const allowedIds = new Set(props.allowedServiceIds || []);
      const scopedServices = (props.allowedServiceIds?.length
        ? data.filter((s: ServiceInterface) => allowedIds.has(s.id || ""))
        : data) as ServiceInterface[];
      if (scopedServices.length > 0) {
        const st = { ...props.serviceTime };
        if (!st.serviceId || (props.allowedServiceIds?.length && !allowedIds.has(st.serviceId))) {
          st.serviceId = props.defaultServiceId || scopedServices[0].id;
        }
        if (isMounted()) {
          setServiceTime(st);
        }
      }
    });
  }, [props.serviceTime, isMounted, props.allowedServiceIds, props.defaultServiceId]);

  React.useEffect(() => {
    setServiceTime(props.serviceTime);
    loadData();
  }, [props.serviceTime, loadData, isMounted]);

  React.useEffect(() => {
    setImageUrlInput(props.planningFields?.advertisementImage || "");
    setImageStatus("");
  }, [props.planningFields?.advertisementImage, props.serviceTime?.id]);

  const handlePhotoSelected = (image: string) => {
    updatePlanning("advertisementImage", image || "");
    setImageUrlInput(image || "");
    setImageStatus("Image selected and attached to this event.");
    setShowPhotoGallery(false);
  };

  const handleApplyImageUrl = () => {
    const imageUrl = (imageUrlInput || "").trim();
    if (!imageUrl) {
      setImageStatus("Please enter an image URL first.");
      return;
    }
    updatePlanning("advertisementImage", imageUrl);
    setImageStatus("Image URL attached to this event.");
  };

  if (serviceTime === null || serviceTime.id === undefined) return null;
  return (
    <>
      <InputBox
        id="serviceTimeBox"
        data-cy="service-time-box"
        cancelFunction={props.updatedFunction}
        saveFunction={handleSave}
        deleteFunction={props.serviceTime?.id ? handleDelete : null}
        headerText={serviceTime.name}
        isSubmitting={isSubmitting}
        headerIcon="schedule"
        help="docs/b1-admin/attendance/">
        <ErrorMessages errors={errors} />
        <TextField
        size="small"
          fullWidth
          label="Branch Name"
          value={props.fixedBranchName || ""}
          disabled
          InputProps={{ readOnly: true }}
        />
        <TextField
        size="small"
          fullWidth
          label="Event Name"
          id="name"
          name="name"
          type="text"
          value={serviceTime.name}
          onChange={handleChange}
          placeholder="Enter event name"
          data-testid="service-time-name-input"
          aria-label="Event name"
        />
        {props.onPlanningFieldChange && (
          <Box sx={{ mt: 1 }}>
            <Typography variant="subtitle2" sx={{ mb: 1 }} color="text.secondary">
              Event Planning
            </Typography>
            {UniqueIdHelper.isMissing(serviceTime.id) ? (
              <Alert severity="info">Save the event first, then add planning details.</Alert>
            ) : (
              <Stack spacing={1}>
                <Stack direction={{ xs: "column", md: "row" }} spacing={1}>
                  <TextField
                    size="small"
                    type="date"
                    label="From Date"
                    value={props.planningFields?.fromDate || ""}
                    onChange={(e) => updatePlanning("fromDate", e.target.value)}
                    InputLabelProps={{ shrink: true }}
                    sx={{ flex: 1 }}
                  />
                  <TextField
                    size="small"
                    type="date"
                    label="To Date"
                    value={props.planningFields?.toDate || ""}
                    onChange={(e) => updatePlanning("toDate", e.target.value)}
                    InputLabelProps={{ shrink: true }}
                    sx={{ flex: 1 }}
                  />
                </Stack>
                <Stack direction={{ xs: "column", md: "row" }} spacing={1}>
                  <TextField
                    size="small"
                    type="time"
                    label="Start Time"
                    value={props.planningFields?.startTime || ""}
                    onChange={(e) => updatePlanning("startTime", e.target.value)}
                    InputLabelProps={{ shrink: true }}
                    sx={{ flex: 1 }}
                  />
                  <TextField
                    size="small"
                    type="time"
                    label="End Time"
                    value={props.planningFields?.endTime || ""}
                    onChange={(e) => updatePlanning("endTime", e.target.value)}
                    InputLabelProps={{ shrink: true }}
                    sx={{ flex: 1 }}
                  />
                </Stack>
                <Stack direction={{ xs: "column", md: "row" }} spacing={1}>
                  <FormControl size="small" sx={{ minWidth: 180 }}>
                    <InputLabel id="event-stream-type">Stream Provider</InputLabel>
                    <Select
                      labelId="event-stream-type"
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
                        alt="Event advertisement"
                      />
                    </Box>
                  )}
                  <Button variant="outlined" onClick={() => setShowPhotoGallery(true)} sx={{ textTransform: "none" }}>
                    {props.planningFields?.advertisementImage ? "Change Event Ad Picture" : "Select Event Ad Picture"}
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
                <TextField
                  size="small"
                  label="MC"
                  value={props.planningFields?.mc || ""}
                  onChange={(e) => updatePlanning("mc", e.target.value)}
                />
                <TextField
                  size="small"
                  label="Announcements Lead"
                  value={props.planningFields?.announcementsLead || ""}
                  onChange={(e) => updatePlanning("announcementsLead", e.target.value)}
                />
                <TextField
                  size="small"
                  label="Event Leader"
                  value={props.planningFields?.eventLeader || ""}
                  onChange={(e) => updatePlanning("eventLeader", e.target.value)}
                />
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
