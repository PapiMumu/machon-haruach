import React from "react";
import { Alert, Box, Container, Grid, Stack, Typography } from "@mui/material";
import { AccountCircle, Diversity3, Payments, EventAvailable, PhoneIphone, ManageSearch, Navigation } from "@mui/icons-material";
import { UserHelper, Permissions } from "@machonharuach/apphelper";
import { PageHeader } from "@machonharuach/apphelper";
import { FeatureCard } from "./FeatureCard";
import { EnvironmentHelper } from "../../helpers/EnvironmentHelper";

export const MemberWelcome: React.FC = () => {
  const churchName = UserHelper.currentUserChurch?.church?.name || "your church";
  const firstName = (UserHelper.user?.firstName || "").trim();
  const lastName = (UserHelper.user?.lastName || "").trim();
  const fullName = `${firstName} ${lastName}`.trim();
  const subDomain = UserHelper.currentUserChurch?.church?.subDomain || "";
  const b1Url = EnvironmentHelper.B1Url.replace("{subdomain}", subDomain);

  return (
    <>
      <PageHeader
        title={fullName ? `Welcome ${fullName}` : `Welcome to ${churchName}!`}
        subtitle="Here are some things you can do to get connected."
      />
      <Container maxWidth="xl">
        <Box sx={{ py: 4 }}>
          <Box
            sx={{
              mb: 3,
              p: 2.2,
              borderRadius: 3,
              border: "1px solid rgba(255,255,255,0.14)",
              backgroundImage: "linear-gradient(180deg, rgba(255,255,255,0.06), rgba(255,255,255,0.01))"
            }}
          >
            <Typography variant="h6" sx={{ fontWeight: 700, mb: 0.5 }}>
              Quick actions to get connected
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Each card opens the right page to complete that action. Start with your profile, then explore people, groups, giving, and events.
            </Typography>
          </Box>
          <Alert
            icon={<Navigation fontSize="small" />}
            severity="info"
            sx={{ mb: 3, alignItems: "center" }}
          >
            These cards are shortcuts. Click any card to open the page for that action.
          </Alert>
          <Stack spacing={0.4} sx={{ mb: 2 }}>
            <Typography variant="h6" sx={{ fontWeight: 700 }}>Suggested next steps</Typography>
            <Typography variant="body2" color="text.secondary">Choose any card below to open the destination page immediately.</Typography>
          </Stack>
          <Grid container spacing={3}>
            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
              <FeatureCard icon={<AccountCircle fontSize="small" />} title="Add Your Photo" description="Upload a profile photo so people at church can recognize you and put a face to your name." linkUrl={b1Url + "/my/community?id=" + UserHelper.person?.id + "#edit"} external />
            </Grid>
            {UserHelper.checkAccess(Permissions.membershipApi.people.view) && (
              <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                <FeatureCard icon={<ManageSearch fontSize="small" />} title="Find People You Know" description="Search the church directory to find and connect with others in the congregation." linkUrl="/people" />
              </Grid>
            )}
            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
              <FeatureCard icon={<Diversity3 fontSize="small" />} title="Join a Group" description="Browse small groups, classes, and serving teams to find your community." linkUrl={b1Url + "/groups"} external />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
              <FeatureCard icon={<Payments fontSize="small" />} title="Set Up Online Giving" description="Give online quickly and easily, and optionally set up recurring donations." linkUrl={b1Url + "/donate"} external />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
              <FeatureCard icon={<EventAvailable fontSize="small" />} title="See What's Happening" description="Check out upcoming events, service times, and ways to get involved." linkUrl={b1Url} external />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
              <FeatureCard icon={<PhoneIphone fontSize="small" />} title="Download the Mobile App" description="Get the GNW Mobile app on your phone to stay connected wherever you go." linkUrl="https://machonharuach.org/app" external />
            </Grid>
          </Grid>
        </Box>
      </Container>
    </>
  );
};
