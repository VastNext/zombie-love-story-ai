export const INIT_SQL = `
CREATE TABLE IF NOT EXISTS \`user\` (
	\`id\` text PRIMARY KEY NOT NULL,
	\`name\` text NOT NULL,
	\`email\` text NOT NULL,
	\`email_verified\` integer DEFAULT false NOT NULL,
	\`image\` text,
	\`created_at\` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
	\`updated_at\` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
	\`utm_source\` text DEFAULT '' NOT NULL,
	\`ip\` text DEFAULT '' NOT NULL,
	\`locale\` text DEFAULT '' NOT NULL
);
CREATE TABLE IF NOT EXISTS \`session\` (
	\`id\` text PRIMARY KEY NOT NULL,
	\`expires_at\` integer NOT NULL,
	\`token\` text NOT NULL,
	\`created_at\` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
	\`updated_at\` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
	\`ip_address\` text,
	\`user_agent\` text,
	\`user_id\` text NOT NULL REFERENCES \`user\`(\`id\`) ON DELETE cascade
);
CREATE TABLE IF NOT EXISTS \`account\` (
	\`id\` text PRIMARY KEY NOT NULL,
	\`account_id\` text NOT NULL,
	\`provider_id\` text NOT NULL,
	\`user_id\` text NOT NULL REFERENCES \`user\`(\`id\`) ON DELETE cascade,
	\`access_token\` text,
	\`refresh_token\` text,
	\`id_token\` text,
	\`access_token_expires_at\` integer,
	\`refresh_token_expires_at\` integer,
	\`scope\` text,
	\`password\` text,
	\`created_at\` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
	\`updated_at\` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL
);
CREATE TABLE IF NOT EXISTS \`verification\` (
	\`id\` text PRIMARY KEY NOT NULL,
	\`identifier\` text NOT NULL,
	\`value\` text NOT NULL,
	\`expires_at\` integer NOT NULL,
	\`created_at\` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
	\`updated_at\` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL
);
CREATE TABLE IF NOT EXISTS \`config\` (
	\`name\` text PRIMARY KEY NOT NULL,
	\`value\` text
);
CREATE TABLE IF NOT EXISTS \`role\` (
	\`id\` text PRIMARY KEY NOT NULL,
	\`name\` text NOT NULL,
	\`title\` text NOT NULL,
	\`description\` text,
	\`status\` text NOT NULL,
	\`sort\` integer DEFAULT 0 NOT NULL,
	\`created_at\` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
	\`updated_at\` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL
);
CREATE TABLE IF NOT EXISTS \`user_role\` (
	\`id\` text PRIMARY KEY NOT NULL,
	\`user_id\` text NOT NULL REFERENCES \`user\`(\`id\`) ON DELETE cascade,
	\`role_id\` text NOT NULL REFERENCES \`role\`(\`id\`) ON DELETE cascade,
	\`created_at\` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
	\`updated_at\` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
	\`expires_at\` integer
);
CREATE TABLE IF NOT EXISTS \`order\` (
	\`id\` text PRIMARY KEY NOT NULL,
	\`order_no\` text NOT NULL,
	\`user_id\` text NOT NULL REFERENCES \`user\`(\`id\`) ON DELETE no action,
	\`status\` text NOT NULL,
	\`amount\` integer NOT NULL,
	\`currency\` text NOT NULL,
	\`payment_type\` text,
	\`payment_provider\` text NOT NULL,
	\`product_id\` text,
	\`product_name\` text,
	\`description\` text,
	\`created_at\` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
	\`updated_at\` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL
);
CREATE TABLE IF NOT EXISTS \`credit\` (
	\`id\` text PRIMARY KEY NOT NULL,
	\`user_id\` text NOT NULL REFERENCES \`user\`(\`id\`) ON DELETE cascade,
	\`amount\` integer NOT NULL,
	\`balance\` integer NOT NULL,
	\`cost\` integer DEFAULT 0 NOT NULL,
	\`source_type\` text NOT NULL,
	\`status\` text NOT NULL,
	\`created_at\` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
	\`updated_at\` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL
);
CREATE TABLE IF NOT EXISTS \`subscription\` (
	\`id\` text PRIMARY KEY NOT NULL,
	\`subscription_no\` text NOT NULL,
	\`user_id\` text NOT NULL REFERENCES \`user\`(\`id\`) ON DELETE no action,
	\`status\` text NOT NULL,
	\`plan_id\` text NOT NULL,
	\`plan_name\` text NOT NULL,
	\`interval\` text NOT NULL,
	\`payment_provider\` text NOT NULL,
	\`created_at\` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
	\`updated_at\` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL
);
`;
