import React, { useState } from "react";
import { View, ScrollView, Platform, Linking, Share } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useJobStore } from "@/src/store/useJobStore";
import { useAuthStore } from "@/src/store/useAuthStore";
import { OsmMap } from "@/components/OsmMap";
import { canCancelShift, formatInr, formatLongDate, formatTimeRange, shiftHours } from "@/src/lib/utils";
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
  const { jobList, savedJobList, userJobList, applyJob, isApplying, cancelJob, isCancelling, savedJobIds, toggleSaveJob } = useJobStore();
  const { user } = useAuthStore();
  const [cancelOpen, setCancelOpen] = useState(false);
  const [snack, setSnack] = useState<SnackbarMessage | null>(null);

  const application = userJobList.find((uj) => uj?.job?.id === id);
  const job = jobList.find((j) => j.id === id) ?? savedJobList.find((j) => j.id === id) ?? application?.job;

  if (!job) {
    return (
      <Screen>
        <TopAppBarSmall />
        <EmptyState icon="event_busy" title="Shift not found" body="It may have been removed or cancelled." actionLabel="Go back" onAction={() => router.back()} />
      </Screen>
    );
  }

  const isAccepted = application?.status === "accepted";
  const isCancelled = application?.status === "cancelled_by_user";
  const isSaved = savedJobIds.includes(job.id);
  const canCancel = canCancelShift(job.date);
  const roleDetail = job.jobRoles.find((r) => r.role === user?.role) ?? job.jobRoles[0];
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

  const share = () => Share.share({ message: `Shift at ${job.companyName} on ShiftLoom: ${formatInr(wage)} per shift.` }).catch(() => {});

  // Bottom action bar state (Figma 230:2667)
  let hint = "per shift";
  let hintColor: ColorToken = "on-surface-variant";
  let action: React.ReactNode;
  if (isCancelled) {
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
