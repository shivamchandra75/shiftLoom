import React, { useCallback, useEffect, useState } from "react";
import { View, ScrollView, Platform, Linking, Share, ActivityIndicator } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useJobStore } from "@/src/store/useJobStore";
import { useAuthStore } from "@/src/store/useAuthStore";
import { OsmMap } from "@/components/OsmMap";
import { canCancelShift, formatInr, formatLongDate, formatTimeRange, isPastDate, jobShareUrl, shiftHours } from "@/src/lib/utils";
import { colors } from "@/src/theme/tokens";
import { fetchJobById, Job } from "@/src/services/jobService";
import { roleWage } from "@/src/lib/shiftFilters";
import { Screen, BottomActionBar } from "@/components/ui/Screen";
import { TopAppBarSmall } from "@/components/ui/TopAppBar";
import { IconButton, BookmarkButton } from "@/components/ui/IconButton";
import { Text, ColorToken } from "@/components/ui/Text";
import { Button } from "@/components/ui/button";
import { StatusChip } from "@/components/ui/Chip";
import { ListItem, Panel, Subheader } from "@/components/ui/ListItem";
import { EmptyState } from "@/components/ui/EmptyState";
import { Snackbar, SnackbarMessage } from "@/components/ui/snackbar";
import { ReasonSheet } from "@/components/ReasonSheet";

const CANCELLATION_REASONS = ["Medical or personal emergency", "Transport issue", "Schedule conflict", "Other"];
const SUPPORT_PHONE = "tel:+919876543210";

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export default function JobDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { jobList, savedJobList, userJobList, applyJob, isApplying, cancelJob, isCancelling, savedJobIds, toggleSaveJob, getUserJobs, getSavedJobs } = useJobStore();
  const { user } = useAuthStore();
  const [cancelOpen, setCancelOpen] = useState(false);
  const [snack, setSnack] = useState<SnackbarMessage | null>(null);

  const [fetchedJob, setFetchedJob] = useState<Job | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  const load = useCallback(() => {
    setIsLoading(true);
    setLoadError("");
    fetchJobById(id)
      .then(setFetchedJob)
      .catch((e) => setLoadError(e?.message === "Network request failed" ? "No internet connection. Try again." : e?.message || "Couldn't load this shift."))
      .finally(() => setIsLoading(false));
  }, [id]);

  useEffect(load, [load]);

  // A cold-start link skips Home and My shifts, so booked and saved state must load here.
  useEffect(() => {
    if (!user?.id) return;
    getUserJobs(user.id);
    getSavedJobs(user.id);
  }, [user?.id, getUserJobs, getSavedJobs]);

  // The link may be the only screen, so back falls through to Home.
  const leave = () => (router.canGoBack() ? router.back() : router.replace("/(tabs)"));

  const application = userJobList.find((uj) => uj?.job?.id === id);
  const storeJob = jobList.find((j) => j.id === id) ?? savedJobList.find((j) => j.id === id) ?? application?.job;
  const job = (fetchedJob?.id === id ? fetchedJob : null) ?? storeJob;

  if (!job && isLoading) {
    return (
      <Screen>
        <TopAppBarSmall onLeadingPress={leave} />
        <ActivityIndicator className="py-12" color={colors.primary} />
      </Screen>
    );
  }
  if (!job && loadError) {
    return (
      <Screen>
        <TopAppBarSmall onLeadingPress={leave} />
        <EmptyState icon="cloud_off" title="Couldn't load this shift" body={loadError} actionLabel="Try again" onAction={load} />
      </Screen>
    );
  }
  if (!job) {
    return (
      <Screen>
        <TopAppBarSmall onLeadingPress={leave} />
        <EmptyState icon="event_busy" title="Shift not found" body="It may have been removed or cancelled." actionLabel="Go back" onAction={leave} />
      </Screen>
    );
  }

  // Shared links can reach any shift. Show nothing about it unless it has this worker's role.
  if (user?.role && !job.jobRoles.some((r) => r.role === user.role)) {
    return (
      <Screen>
        <TopAppBarSmall onLeadingPress={leave} />
        <EmptyState
          icon="block"
          title="This job doesn't include your role"
          body={`This shift has no ${user.role} slots. Your Home tab shows the shifts open to you.`}
          actionLabel="Go to Home"
          onAction={() => router.replace("/(tabs)")}
        />
      </Screen>
    );
  }

  const isAccepted = application?.status === "accepted";
  const isCancelled = application?.status === "cancelled_by_user";
  const isSaved = savedJobIds.includes(job.id);
  const canCancel = canCancelShift(job.date);
  const roleDetail = job.jobRoles.find((r) => r.role === user?.role);
  const wage = roleWage(job, user?.role);
  const roleName = roleDetail?.role ?? "worker";
  const hours = shiftHours(job.startTime, job.endTime);

  const handleApply = async () => {
    if (!user?.id || !roleDetail?.role) return;
    try {
      await applyJob(job.id, user.id, roleDetail.role);
      setSnack({ text: "Shift accepted. It's in My shifts.", tone: "success" });
    } catch (err: any) {
      setSnack({ text: err?.message || "Couldn't accept the shift. Try again.", tone: "error" });
    }
  };

  const handleCancel = async (reason: string) => {
    if (!user?.id) return;
    try {
      await cancelJob(job.id, user.id, reason);
      setCancelOpen(false);
      setSnack({ text: `Shift cancelled. We've told ${job.companyName}.`, tone: "success" });
    } catch (err: any) {
      setCancelOpen(false);
      setSnack({ text: err?.message || "Couldn't cancel the shift. Try again.", tone: "error" });
    }
  };

  const openMaps = () => {
    if (!job.latitude || !job.longitude) return;
    const url = Platform.select({
      ios: `maps:0,0?q=${job.latitude},${job.longitude}(${job.locationAddress})`,
      android: `geo:0,0?q=${job.latitude},${job.longitude}(${job.locationAddress})`,
    });
    if (url) Linking.openURL(url);
  };

  const share = () =>
    Share.share({ message: `Shift at ${job.companyName} on ${formatLongDate(job.date)}. Open it in ShiftLoom:\n${jobShareUrl(job.id)}` }).catch(() => {});

  // Bottom action bar state (Figma 230:2667)
  let hint = "per shift";
  let hintColor: ColorToken = "on-surface-variant";
  let action: React.ReactNode;
  const isUnavailable = job.status !== "open" || isPastDate(job.date);
  if (job.status === "cancelled") {
    hint = job.cancelReason ? `Cancelled: ${job.cancelReason}` : "This shift was cancelled";
    hintColor = "error";
    action = <Button label="Shift cancelled" disabled />;
  } else if (isCancelled) {
    hint = "You cancelled this shift";
    hintColor = "error";
    action = <Button label="Shift cancelled" disabled />;
  } else if (isAccepted && canCancel) {
    hint = "You're booked for this shift";
    hintColor = "success";
    action = <Button variant="outlined" tone="error" label="Cancel shift" onPress={() => setCancelOpen(true)} />;
  } else if (isAccepted) {
    hint = "Cancelling closes 2 days before the shift";
    action = <Button variant="outlined" label="Cancel shift" disabled />;
  } else if (isUnavailable) {
    hint = "This shift is no longer available";
    action = <Button label="Unavailable" disabled />;
  } else if (!user?.isVerified) {
    hint = "Verify your account first";
    hintColor = "warning";
    action = <Button variant="tonal" label="Verify account" onPress={() => router.navigate("/(tabs)/profile")} />;
  } else {
    action = <Button label={isApplying ? "Accepting…" : "Accept offer"} onPress={handleApply} loading={isApplying} />;
  }

  return (
    <Screen>
      <TopAppBarSmall
        onLeadingPress={leave}
        trailing={
          <>
            <IconButton icon="share" accessibilityLabel="Share shift" onPress={share} />
            <BookmarkButton saved={isSaved} onToggle={() => user?.id && toggleSaveJob(job, user.id)} />
          </>
        }
      />
      <ScrollView contentContainerClassName="gap-4 px-4 pt-2 pb-32">
        <View className="gap-2">
          <Text variant="headline-medium" accessibilityRole="header">{job.companyName}</Text>
          <Text variant="body-large" color="on-surface-variant">{job.locationAddress}</Text>
          <View className="flex-row gap-2 pt-1">
            <StatusChip label={capitalize(roleName)} tone="neutral" showIcon={false} />
            {isAccepted && <StatusChip label="Accepted" tone="success" />}
            {isCancelled && <StatusChip label="Cancelled" tone="error" />}
          </View>
        </View>

        <Panel>
          <ListItem
            leadingIcon="event"
            headline={formatLongDate(job.date)}
            supportingText={`${formatTimeRange(job.startTime, job.endTime, false)}, ${hours} ${hours === 1 ? "hour" : "hours"}`}
          />
          {roleDetail && (
            <ListItem
              leadingIcon="groups"
              headline={`${roleDetail.totalSlots} ${roleDetail.totalSlots === 1 ? "slot" : "slots"}`}
              supportingText={`${capitalize(roleName)}s needed for this shift`}
            />
          )}
        </Panel>

        <Subheader label="Location" />
        <Panel>
          {job.latitude && job.longitude ? (
            <View pointerEvents="none">
              <OsmMap
                height={140}
                interactive={false}
                initial={{ latitude: job.latitude, longitude: job.longitude, zoom: 15 }}
                pin={{ latitude: job.latitude, longitude: job.longitude }}
              />
            </View>
          ) : null}
          <ListItem
            leadingIcon="location_on"
            headline={job.locationAddress}
            trailingIcon={job.latitude && job.longitude ? "open_in_new" : undefined}
            onPress={job.latitude && job.longitude ? openMaps : undefined}
            accessibilityLabel={`Open ${job.locationAddress} in maps`}
          />
        </Panel>

        <Panel>
          <ListItem
            leadingIcon="support_agent"
            headline="Questions about this shift?"
            supportingText="Call ShiftLoom support"
            trailingIcon="chevron_right"
            onPress={() => Linking.openURL(SUPPORT_PHONE)}
          />
        </Panel>
      </ScrollView>

      <BottomActionBar>
        <View className="flex-1">
          <Text variant="title-large">{formatInr(wage)}</Text>
          <Text variant="body-small" color={hintColor}>{hint}</Text>
        </View>
        {action}
      </BottomActionBar>

      <Snackbar message={snack} onHide={() => setSnack(null)} bottomOffset={88} />

      <ReasonSheet
        visible={cancelOpen}
        onDismiss={() => setCancelOpen(false)}
        title="Cancel this shift?"
        supportingText={`${job.companyName}, ${formatLongDate(job.date)}, ${formatTimeRange(job.startTime, job.endTime)}. Pick a reason so we can offer the slot to someone else.`}
        reasons={CANCELLATION_REASONS}
        dismissLabel="Keep shift"
        confirmLabel="Cancel shift"
        onConfirm={handleCancel}
        loading={isCancelling}
      />
    </Screen>
  );
}
