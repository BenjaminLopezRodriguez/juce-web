import { relations } from "drizzle-orm";
import {
  boolean,
  index,
  integer,
  pgEnum,
  pgTableCreator,
  text,
  timestamp,
  varchar,
} from "drizzle-orm/pg-core";

export const createTable = pgTableCreator((name) => `juce_${name}`);

// ─── Enums ────────────────────────────────────────────────────────────────────

export const roomStateEnum = pgEnum("room_state", [
  "live",
  "ended",
  "scheduled",
]);

export const clipSourceEnum = pgEnum("clip_source", [
  "room_conversation",
  "host_moment",
  "audience_reaction",
]);

// ─── Users ────────────────────────────────────────────────────────────────────
// kindeId is the stable identifier from Kinde Auth

export const users = createTable(
  "user",
  (d) => ({
    id: d.integer().primaryKey().generatedByDefaultAsIdentity(),
    kindeId: varchar("kinde_id", { length: 128 }).notNull().unique(),
    handle: varchar({ length: 32 }).notNull().unique(),
    displayName: varchar("display_name", { length: 64 }).notNull(),
    bio: text().default(""),
    avatarUrl: text("avatar_url"),           // UploadThing URL
    paletteFrom: varchar("palette_from", { length: 7 }).notNull().default("#f97316"),
    paletteTo: varchar("palette_to",   { length: 7 }).notNull().default("#1a1a1a"),
    createdAt: d
      .timestamp({ withTimezone: true })
      .$defaultFn(() => new Date())
      .notNull(),
  }),
  (t) => [
    index("user_kinde_idx").on(t.kindeId),
    index("user_handle_idx").on(t.handle),
  ]
);

// ─── Rooms ────────────────────────────────────────────────────────────────────
// ivsChannelArn + ivsPlaybackUrl come from AWS IVS on room creation

export const rooms = createTable(
  "room",
  (d) => ({
    id: d.integer().primaryKey().generatedByDefaultAsIdentity(),
    hostId: integer("host_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    title: varchar({ length: 128 }).notNull(),
    state: roomStateEnum("state").notNull().default("live"),
    ivsChannelArn:  text("ivs_channel_arn").unique(),
    ivsPlaybackUrl: text("ivs_playback_url"),
    ivsIngestEndpoint: text("ivs_ingest_endpoint"),
    ivsStreamKey: text("ivs_stream_key"),       // server-only, never sent to client
    paletteFrom: varchar("palette_from", { length: 7 }).notNull().default("#6c63ff"),
    paletteTo:   varchar("palette_to",   { length: 7 }).notNull().default("#0c0c14"),
    listenerCount: integer("listener_count").notNull().default(0),
    scheduledAt: d.timestamp({ withTimezone: true }),
    endedAt:     d.timestamp({ withTimezone: true }),
    createdAt: d
      .timestamp({ withTimezone: true })
      .$defaultFn(() => new Date())
      .notNull(),
  }),
  (t) => [
    index("room_host_idx").on(t.hostId),
    index("room_state_idx").on(t.state),
  ]
);

// ─── Room Participants ─────────────────────────────────────────────────────────

export const roomParticipants = createTable(
  "room_participant",
  (d) => ({
    id: d.integer().primaryKey().generatedByDefaultAsIdentity(),
    roomId: integer("room_id")
      .notNull()
      .references(() => rooms.id, { onDelete: "cascade" }),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    isSpeaker: boolean("is_speaker").notNull().default(false),
    joinedAt: d
      .timestamp({ withTimezone: true })
      .$defaultFn(() => new Date())
      .notNull(),
    lastSeenAt: d.timestamp({ withTimezone: true }),
    leftAt: d.timestamp({ withTimezone: true }),
  }),
  (t) => [
    index("participant_room_idx").on(t.roomId),
    index("participant_user_idx").on(t.userId),
  ]
);

// ─── Moments (Squeezed Clips) ─────────────────────────────────────────────────

export const moments = createTable(
  "moment",
  (d) => ({
    id: d.integer().primaryKey().generatedByDefaultAsIdentity(),
    roomId: integer("room_id")
      .notNull()
      .references(() => rooms.id, { onDelete: "cascade" }),
    authorId: integer("author_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    caption: text().default(""),
    transcript: text().notNull(),
    clipDurationSecs: integer("clip_duration_secs").notNull().default(0),
    source: clipSourceEnum("source").notNull().default("room_conversation"),
    audioUrl: text("audio_url"),              // UploadThing URL for the clip audio
    likeCount:   integer("like_count").notNull().default(0),
    repostCount: integer("repost_count").notNull().default(0),
    saveCount:   integer("save_count").notNull().default(0),
    replyCount:  integer("reply_count").notNull().default(0),
    createdAt: d
      .timestamp({ withTimezone: true })
      .$defaultFn(() => new Date())
      .notNull(),
  }),
  (t) => [
    index("moment_room_idx").on(t.roomId),
    index("moment_author_idx").on(t.authorId),
    index("moment_created_idx").on(t.createdAt),
  ]
);

// ─── Moment Speakers (collab clips) ──────────────────────────────────────────

export const momentSpeakers = createTable(
  "moment_speaker",
  (d) => ({
    id: d.integer().primaryKey().generatedByDefaultAsIdentity(),
    momentId: integer("moment_id")
      .notNull()
      .references(() => moments.id, { onDelete: "cascade" }),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    speakingFraction: integer("speaking_fraction_pct").notNull().default(50), // 0–100
    quote: text().default(""),
  }),
  (t) => [index("speaker_moment_idx").on(t.momentId)]
);

// ─── Follows ──────────────────────────────────────────────────────────────────

export const follows = createTable(
  "follow",
  (d) => ({
    id: d.integer().primaryKey().generatedByDefaultAsIdentity(),
    followerId: integer("follower_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    followingId: integer("following_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    createdAt: d
      .timestamp({ withTimezone: true })
      .$defaultFn(() => new Date())
      .notNull(),
  }),
  (t) => [
    index("follow_follower_idx").on(t.followerId),
    index("follow_following_idx").on(t.followingId),
  ]
);

// ─── Moment Likes ─────────────────────────────────────────────────────────────

export const momentLikes = createTable(
  "moment_like",
  (d) => ({
    id: d.integer().primaryKey().generatedByDefaultAsIdentity(),
    momentId: integer("moment_id")
      .notNull()
      .references(() => moments.id, { onDelete: "cascade" }),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    createdAt: d
      .timestamp({ withTimezone: true })
      .$defaultFn(() => new Date())
      .notNull(),
  }),
  (t) => [
    index("like_moment_idx").on(t.momentId),
    index("like_user_idx").on(t.userId),
  ]
);

// ─── Relations ────────────────────────────────────────────────────────────────

export const usersRelations = relations(users, ({ many }) => ({
  hostedRooms: many(rooms),
  participations: many(roomParticipants),
  moments: many(moments),
  momentSpeakers: many(momentSpeakers),
  likes: many(momentLikes),
  following: many(follows, { relationName: "follower" }),
  followers: many(follows, { relationName: "following" }),
}));

export const roomsRelations = relations(rooms, ({ one, many }) => ({
  host: one(users, { fields: [rooms.hostId], references: [users.id] }),
  participants: many(roomParticipants),
  moments: many(moments),
}));

export const roomParticipantsRelations = relations(roomParticipants, ({ one }) => ({
  room: one(rooms, { fields: [roomParticipants.roomId], references: [rooms.id] }),
  user: one(users, { fields: [roomParticipants.userId], references: [users.id] }),
}));

export const momentsRelations = relations(moments, ({ one, many }) => ({
  room: one(rooms,  { fields: [moments.roomId],   references: [rooms.id]  }),
  author: one(users, { fields: [moments.authorId], references: [users.id] }),
  speakers: many(momentSpeakers),
  likes: many(momentLikes),
}));

export const momentSpeakersRelations = relations(momentSpeakers, ({ one }) => ({
  moment: one(moments, { fields: [momentSpeakers.momentId], references: [moments.id] }),
  user: one(users,    { fields: [momentSpeakers.userId],   references: [users.id]    }),
}));

export const followsRelations = relations(follows, ({ one }) => ({
  follower:  one(users, { fields: [follows.followerId],  references: [users.id], relationName: "follower"  }),
  following: one(users, { fields: [follows.followingId], references: [users.id], relationName: "following" }),
}));

export const momentLikesRelations = relations(momentLikes, ({ one }) => ({
  moment: one(moments, { fields: [momentLikes.momentId], references: [moments.id] }),
  user:   one(users,   { fields: [momentLikes.userId],   references: [users.id]   }),
}));
