import React from "react";
import { Box, Chip, Container, Grid, Stack, Typography } from "@mui/material";
import { Business, Payments, Backup, School, VideoLibrary, GroupAdd, AutoAwesome } from "@mui/icons-material";
import { ApiHelper, UserHelper } from "@machonharuach/apphelper";
import { PageHeader } from "@machonharuach/apphelper";
import { FeatureCard } from "./FeatureCard";
import { QuickSetupModal, type WizardType } from "./QuickSetupModal";
import { useNavigate } from "react-router-dom";

export const AdminWelcome: React.FC = () => {
  const navigate = useNavigate();
  const firstName = (UserHelper.user?.firstName || "").trim();
  const lastName = (UserHelper.user?.lastName || "").trim();
  const fullName = `${firstName} ${lastName}`.trim();
  const [wizardType, setWizardType] = React.useState<WizardType | null>(null);
  const [hasTeams, setHasTeams] = React.useState<boolean | null>(null);
  const [hasPages, setHasPages] = React.useState<boolean | null>(null);
  const [hasGroups, setHasGroups] = React.useState<boolean | null>(null);
  const [hasPlanTypes, setHasPlanTypes] = React.useState<boolean | null>(null);

  React.useEffect(() => {
    ApiHelper.get("/groups/tag/team", "MembershipApi").then((data) => setHasTeams(data?.length > 0)).catch(() => setHasTeams(false));
    ApiHelper.get("/pages", "ContentApi").then((data) => setHasPages(data?.length > 0)).catch(() => setHasPages(false));
    ApiHelper.get("/groups/tag/standard", "MembershipApi").then((data) => setHasGroups(data?.length > 0)).catch(() => setHasGroups(false));
    ApiHelper.get("/planTypes", "DoingApi").then((data) => setHasPlanTypes(data?.length > 0)).catch(() => setHasPlanTypes(false));
  }, []);

  const handleCardClick = (wizardKey: WizardType, existsAlready: boolean | null, fallbackUrl: string) => {
    if (existsAlready) {
      navigate(fallbackUrl);
    } else {
      setWizardType(wizardKey);
    }
  };

  const handleWizardComplete = (redirectUrl: string) => {
    setWizardType(null);
    navigate(redirectUrl);
  };

  const SectionHeading: React.FC<{ title: string; subtitle: string; chip: string; }> = ({ title, subtitle, chip }) => (
    <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1.4 }}>
      <Box>
        <Typography variant="h6" sx={{ fontWeight: 700, lineHeight: 1.2 }}>{title}</Typography>
        <Typography variant="body2" color="text.secondary">{subtitle}</Typography>
      </Box>
      <Chip
        icon={<AutoAwesome sx={{ fontSize: 15 }} />}
        label={chip}
        size="small"
        sx={{ backgroundColor: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.14)" }}
      />
    </Stack>
  );

  return (
    <>
      <PageHeader
        title={fullName ? `Welcome ${fullName}` : "Welcome"}
      />
      <Container maxWidth="xl">
        <Box sx={{ py: 4 }}>
          <SectionHeading title="Your Church" subtitle="Church-wide setup, branding, and core administration." chip="Foundation" />
          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
              <FeatureCard icon={<Business fontSize="small" />} title="Manage Branches" description="Add or remove branches for your church." linkUrl="/attendance" />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
              <FeatureCard icon={<Payments fontSize="small" />} title="Set Up Online Giving" description="Configure Stripe, EcoCash, and more so your congregation can give online." linkUrl="/settings#giving" />
            </Grid>
          </Grid>

          <SectionHeading title="Serving & Content" subtitle="Set up ministry tools, media workflows, and content channels." chip="Operations" />
          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
              <FeatureCard icon={<Backup fontSize="small" />} title="Set Up FreeShow Backups" description="Connect FreeShow to back up your songs and service plans." onClick={() => handleCardClick("freeshow", hasTeams, "/serving")} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
              <FeatureCard icon={<School fontSize="small" />} title="Set Up Your FreePlay Classroom" description="Create a ministry and classroom for FreePlay lessons on your TV." onClick={() => handleCardClick("freeplay", hasPlanTypes, "/serving")} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
              <FeatureCard icon={<VideoLibrary fontSize="small" />} title="Upload a Sermon" description="Share your sermons online so people can watch anytime." linkUrl="/sermons" />
            </Grid>
          </Grid>

          <SectionHeading title="People & Groups" subtitle="Grow your directory, launch groups, and invite your leaders." chip="Community" />
          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
              <FeatureCard icon={<GroupAdd fontSize="small" />} title="Create Your First Group" description="Set up small groups, classes, or serving teams." onClick={() => handleCardClick("group", hasGroups, "/groups")} />
            </Grid>
          </Grid>
        </Box>
      </Container>

      {wizardType && (
        <QuickSetupModal wizardType={wizardType} open={true} onClose={() => setWizardType(null)} onComplete={handleWizardComplete} />
      )}
    </>
  );
};
